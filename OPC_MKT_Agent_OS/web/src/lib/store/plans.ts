/**
 * Plan Store — 执行计划持久化
 *
 * 使用文件系统存储（与 tasks/contents 一致），
 * 通过内存 Map 加速读写，支持 SSE 回调通知。
 */

import { readCollection, writeCollection, generateId, nowISO } from "./index";
import type {
  ExecutionPlan,
  PlanStep,
  PlanStatus,
  StepStatus,
} from "marketing-agent-os-engine/types/plan";

// Re-export types for convenience
export type { ExecutionPlan, PlanStep, PlanStatus, StepStatus };

const COLLECTION = "plans";

/** 内存缓存（进程级别） */
let cache: ExecutionPlan[] | null = null;

function loadPlans(): ExecutionPlan[] {
  if (!cache) {
    cache = readCollection<ExecutionPlan>(COLLECTION);
  }
  return cache;
}

function savePlans(plans: ExecutionPlan[]): void {
  cache = plans;
  writeCollection(COLLECTION, plans);
}

/** 创建新的执行计划 */
export function createPlan(params: {
  taskSummary: string;
  steps: Omit<PlanStep, "status" | "result" | "startedAt" | "completedAt" | "error">[];
  estimatedAgents: string[];
  originalPrompt: string;
}): ExecutionPlan {
  const now = nowISO();
  const plan: ExecutionPlan = {
    id: generateId("plan"),
    taskSummary: params.taskSummary,
    steps: params.steps.map((s) => ({
      ...s,
      status: "pending" as StepStatus,
    })),
    estimatedAgents: params.estimatedAgents,
    status: "pending",
    createdAt: now,
    originalPrompt: params.originalPrompt,
  };

  const plans = loadPlans();
  plans.push(plan);
  savePlans(plans);
  return plan;
}

/** 获取计划 */
export function getPlan(planId: string): ExecutionPlan | undefined {
  return loadPlans().find((p) => p.id === planId);
}

/** 获取所有计划 */
export function getAllPlans(): ExecutionPlan[] {
  return loadPlans();
}

/** 更新计划状态 */
export function updatePlanStatus(
  planId: string,
  status: PlanStatus,
  extra?: Partial<ExecutionPlan>,
): ExecutionPlan | undefined {
  const plans = loadPlans();
  const idx = plans.findIndex((p) => p.id === planId);
  if (idx === -1) return undefined;

  const now = nowISO();
  const updated: ExecutionPlan = {
    ...plans[idx],
    ...extra,
    status,
  };

  // 自动设置时间戳
  if (status === "approved") updated.approvedAt = now;
  if (status === "rejected") updated.rejectedAt = now;
  if (status === "modified") updated.modifiedAt = now;
  if (status === "completed" || status === "failed") updated.completedAt = now;

  plans[idx] = updated;
  savePlans(plans);
  return updated;
}

/** 更新步骤状态 */
export function updateStepStatus(
  planId: string,
  stepId: string,
  status: StepStatus,
  extra?: { result?: string; error?: string },
): ExecutionPlan | undefined {
  const plans = loadPlans();
  const idx = plans.findIndex((p) => p.id === planId);
  if (idx === -1) return undefined;

  const now = nowISO();
  const plan = { ...plans[idx] };
  plan.steps = plan.steps.map((s) => {
    if (s.id !== stepId) return s;
    return {
      ...s,
      status,
      ...(status === "running" ? { startedAt: now } : {}),
      ...(status === "completed" || status === "failed" ? { completedAt: now } : {}),
      ...(extra?.result ? { result: extra.result } : {}),
      ...(extra?.error ? { error: extra.error } : {}),
    };
  });

  // 检查是否所有步骤都完成了
  const allDone = plan.steps.every(
    (s) => s.status === "completed" || s.status === "skipped",
  );
  const anyFailed = plan.steps.some((s) => s.status === "failed");

  if (allDone && plan.status === "executing") {
    plan.status = "completed";
    plan.completedAt = now;
  } else if (anyFailed && plan.status === "executing") {
    plan.status = "failed";
    plan.completedAt = now;
  }

  plans[idx] = plan;
  savePlans(plans);
  return plan;
}

/** 修改计划步骤（用户修改后重新提交） */
export function modifyPlanSteps(
  planId: string,
  newSteps: PlanStep[],
  feedback?: string,
): ExecutionPlan | undefined {
  const plans = loadPlans();
  const idx = plans.findIndex((p) => p.id === planId);
  if (idx === -1) return undefined;

  const now = nowISO();
  plans[idx] = {
    ...plans[idx],
    steps: newSteps,
    status: "modified",
    modifiedAt: now,
    estimatedAgents: [...new Set(newSteps.map((s) => s.agentId))],
    feedback,
  };

  savePlans(plans);
  return plans[idx];
}
