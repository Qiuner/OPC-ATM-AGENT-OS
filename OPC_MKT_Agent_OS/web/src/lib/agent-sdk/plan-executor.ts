/**
 * Plan Executor — 按审批通过的 ExecutionPlan 逐步执行
 *
 * 读取计划步骤，按依赖关系拓扑排序执行：
 * - 无依赖的步骤可以并行
 * - 有依赖的步骤等前置完成后再启动
 * - 每步调用对应的 Agent 执行
 * - 实时通过 SSE 流式推送进度
 */

import { eventBus } from "./event-bus";
import { executeAgent } from "./executor";
import { getPlan, updatePlanStatus, updateStepStatus } from "@/lib/store/plans";
import type { PlanStreamEvent } from "marketing-agent-os-engine/types/plan";
import type { ExecutionPlan, PlanStep } from "marketing-agent-os-engine/types/plan";

/**
 * 执行已审批的计划
 *
 * @param planId - 要执行的计划 ID
 */
export async function* executePlan(
  planId: string,
): AsyncGenerator<PlanStreamEvent> {
  const maybePlan = getPlan(planId);
  if (!maybePlan) {
    yield { type: "plan_error", planId, message: `Plan "${planId}" not found` };
    return;
  }

  // Copy to a definite non-undefined variable for TypeScript narrowing
  const plan: ExecutionPlan = maybePlan;

  // 标记为执行中
  updatePlanStatus(planId, "executing");

  yield { type: "plan_approved", planId };

  eventBus.emit({
    type: "agent:start",
    agentId: "ceo",
    data: { planId, mode: "plan-execute", steps: plan.steps.length },
  });

  try {
    // 按依赖关系拓扑执行
    const completed = new Set<string>();
    const failed = new Set<string>();
    const stepMap = new Map(plan.steps.map((s) => [s.id, s]));

    // 获取下一批可执行的步骤（所有依赖已完成）
    function getReadySteps(): PlanStep[] {
      return plan.steps.filter(
        (s) =>
          s.status === "pending" &&
          !completed.has(s.id) &&
          !failed.has(s.id) &&
          s.dependencies.every((dep) => completed.has(dep)),
      );
    }

    while (completed.size + failed.size < plan.steps.length) {
      const readySteps = getReadySteps();

      if (readySteps.length === 0) {
        // 没有更多可执行步骤 — 可能有依赖链断裂
        const pendingCount = plan.steps.filter(
          (s) => !completed.has(s.id) && !failed.has(s.id),
        ).length;

        if (pendingCount > 0) {
          // 有步骤因为依赖失败而无法执行
          for (const step of plan.steps) {
            if (!completed.has(step.id) && !failed.has(step.id)) {
              const hasFailedDep = step.dependencies.some((dep) => failed.has(dep));
              if (hasFailedDep) {
                updateStepStatus(planId, step.id, "skipped", {
                  error: "Skipped due to dependency failure",
                });
                failed.add(step.id);
                yield {
                  type: "step_complete",
                  planId,
                  stepId: step.id,
                  agentId: step.agentId,
                  success: false,
                  result: "Skipped due to dependency failure",
                };
              }
            }
          }
        }
        break;
      }

      // 并行执行就绪的步骤
      const stepResults = await Promise.allSettled(
        readySteps.map(async (step) => {
          // 收集前置步骤的结果作为上下文
          const depResults: Record<string, string> = {};
          for (const depId of step.dependencies) {
            const depStep = stepMap.get(depId);
            if (depStep?.result) {
              depResults[depId] = depStep.result;
            }
          }

          return executeStepWithStreaming(planId, step, depResults);
        }),
      );

      // 处理每个步骤的结果
      for (let i = 0; i < readySteps.length; i++) {
        const step = readySteps[i];
        const settledResult = stepResults[i];

        if (settledResult.status === "fulfilled") {
          const stepOutput = settledResult.value;

          // Yield 所有该步骤产生的事件
          for (const event of stepOutput.events) {
            yield event;
          }

          if (stepOutput.success) {
            completed.add(step.id);
            // 更新内存中的步骤对象以供后续步骤引用
            const memStep = stepMap.get(step.id);
            if (memStep) {
              memStep.result = stepOutput.result;
              memStep.status = "completed";
            }
          } else {
            failed.add(step.id);
          }
        } else {
          // Promise rejected
          failed.add(step.id);
          updateStepStatus(planId, step.id, "failed", {
            error: settledResult.reason instanceof Error
              ? settledResult.reason.message
              : "Unknown error",
          });
          yield {
            type: "step_complete",
            planId,
            stepId: step.id,
            agentId: step.agentId,
            success: false,
            result: "Execution error",
          };
        }
      }
    }

    // 检查最终状态
    const allCompleted = plan.steps.every((s) => completed.has(s.id));

    if (allCompleted) {
      updatePlanStatus(planId, "completed");
      yield { type: "plan_complete", planId };
    } else {
      updatePlanStatus(planId, "failed");
      yield {
        type: "plan_error",
        planId,
        message: `Plan partially failed: ${completed.size}/${plan.steps.length} steps completed`,
      };
    }

    eventBus.emit({
      type: "agent:done",
      agentId: "ceo",
      data: { planId, mode: "plan-execute", completed: completed.size, total: plan.steps.length },
    });
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : "Plan execution failed";
    updatePlanStatus(planId, "failed");
    eventBus.emit({
      type: "agent:done",
      agentId: "ceo",
      data: { planId, error: errMsg },
    });
    yield { type: "plan_error", planId, message: errMsg };
  }
}

/** 单步骤执行结果 */
interface StepExecutionResult {
  success: boolean;
  result: string;
  events: PlanStreamEvent[];
}

/**
 * 执行单个步骤，收集所有 SSE 事件和结果文本
 */
async function executeStepWithStreaming(
  planId: string,
  step: PlanStep,
  depResults: Record<string, string>,
): Promise<StepExecutionResult> {
  const events: PlanStreamEvent[] = [];
  const textChunks: string[] = [];
  let hasError = false;

  // 标记步骤开始
  updateStepStatus(planId, step.id, "running");
  events.push({
    type: "step_start",
    planId,
    stepId: step.id,
    agentId: step.agentId,
  });

  // 构建给 Agent 的指令
  const prompt = buildStepPrompt(step, depResults);

  try {
    for await (const agentEvent of executeAgent(step.agentId, prompt)) {
      switch (agentEvent.type) {
        case "text":
          textChunks.push(agentEvent.content);
          events.push({
            type: "step_progress",
            planId,
            stepId: step.id,
            agentId: step.agentId,
            content: agentEvent.content,
          });
          break;

        case "error":
          hasError = true;
          break;

        case "done":
          // Agent 执行完成
          break;

        // 其他事件类型（tool_call, tool_result 等）不需要转发到 plan 层
      }
    }
  } catch (err) {
    hasError = true;
    const errMsg = err instanceof Error ? err.message : "Step execution failed";
    updateStepStatus(planId, step.id, "failed", { error: errMsg });
    events.push({
      type: "step_complete",
      planId,
      stepId: step.id,
      agentId: step.agentId,
      success: false,
      result: errMsg,
    });
    return { success: false, result: errMsg, events };
  }

  const result = textChunks.join("");

  if (hasError) {
    updateStepStatus(planId, step.id, "failed", { error: "Agent returned error" });
    events.push({
      type: "step_complete",
      planId,
      stepId: step.id,
      agentId: step.agentId,
      success: false,
      result: "Agent execution error",
    });
    return { success: false, result, events };
  }

  updateStepStatus(planId, step.id, "completed", { result: result.slice(0, 5000) });
  events.push({
    type: "step_complete",
    planId,
    stepId: step.id,
    agentId: step.agentId,
    success: true,
    result: result.slice(0, 500),
  });

  return { success: true, result, events };
}

/** 构建步骤执行提示词 */
function buildStepPrompt(
  step: PlanStep,
  depResults: Record<string, string>,
): string {
  const parts: string[] = [];

  parts.push(`## 任务\n${step.action}`);

  if (Object.keys(step.inputs).length > 0) {
    parts.push(`## 输入参数\n${JSON.stringify(step.inputs, null, 2)}`);
  }

  if (Object.keys(depResults).length > 0) {
    parts.push(`## 前置步骤结果`);
    for (const [stepId, result] of Object.entries(depResults)) {
      // 截断过长的结果
      const truncated = result.length > 3000
        ? result.slice(0, 3000) + "\n...(已截断)"
        : result;
      parts.push(`### ${stepId}\n${truncated}`);
    }
  }

  return parts.join("\n\n");
}
