/**
 * Team Executor — Agent Team 模式的 Web 端执行器
 *
 * 与 executor.ts（SDK 子进程模式）并列，提供 Team 模式的执行能力。
 * 共享 EventBus 和 AgentStreamEvent 类型，UI 层无需区分两种模式。
 */

import { eventBus } from "./event-bus";
import type { AgentStreamEvent } from "./executor";

// 环境变量隔离
delete process.env.CLAUDECODE;
delete process.env.CLAUDE_CODE_ENTRYPOINT;
delete process.env.CLAUDE_CODE_IS_AGENT;

/** Team 模式专用事件（扩展 AgentStreamEvent） */
export type TeamStreamEvent =
  | AgentStreamEvent
  | { type: "team:created"; teamName: string }
  | { type: "team:member_spawned"; agentId: string; role: string }
  | { type: "team:member_message"; from: string; to: string; summary: string }
  | { type: "team:done"; result: string; cost?: number };

/** 并发控制 */
let teamActive = false;

/**
 * 以 Agent Team 模式执行任务
 *
 * @param task - 用户任务描述
 * @param teamConfig - 可选的团队配置覆盖
 */
export async function* executeTeamTask(
  task: string,
  teamConfig?: {
    teamName?: string;
    maxBudgetUsd?: number;
    model?: "opus" | "sonnet" | "haiku";
  },
): AsyncGenerator<TeamStreamEvent> {
  if (teamActive) {
    yield { type: "error", agentId: "team", message: "已有团队任务在执行中" };
    return;
  }

  teamActive = true;

  try {
    // 动态 import Team Engine（避免构建时解析 node 依赖）
    const { TeamEngine } = await import("marketing-agent-os-engine/agents/team-engine");
    const engine = new TeamEngine();

    eventBus.emit({
      type: "agent:start",
      agentId: "team-lead",
      data: { message: task.slice(0, 200), mode: "agent-team" },
    });

    for await (const teamEvent of engine.executeTask({
      task,
      teamName: teamConfig?.teamName,
      maxBudgetUsd: teamConfig?.maxBudgetUsd,
      model: teamConfig?.model,
    })) {
      // 转换 TeamEvent → TeamStreamEvent + EventBus
      switch (teamEvent.type) {
        case "team:created":
          eventBus.emit({
            type: "agent:start",
            agentId: "team",
            data: { teamName: teamEvent.teamName },
          });
          yield { type: "team:created", teamName: teamEvent.teamName };
          break;

        case "team:member_spawned":
          eventBus.emit({
            type: "agent:sub_agent_start",
            agentId: teamEvent.name,
            data: { role: teamEvent.role, mode: "team-member" },
          });
          yield {
            type: "team:member_spawned",
            agentId: teamEvent.name,
            role: teamEvent.role,
          };
          yield {
            type: "sub_agent_start",
            agentId: teamEvent.name,
            parentId: "team-lead",
            task: `${teamEvent.role}: ${teamEvent.name}`,
          };
          break;

        case "team:member_message":
          eventBus.emit({
            type: "agent:message",
            agentId: teamEvent.from,
            data: { to: teamEvent.to, summary: teamEvent.summary },
          });
          yield {
            type: "team:member_message",
            from: teamEvent.from,
            to: teamEvent.to,
            summary: teamEvent.summary,
          };
          // 同时发一个 text 事件让旧 UI 也能显示
          yield {
            type: "text",
            agentId: teamEvent.from,
            content: `→ ${teamEvent.to}: ${teamEvent.summary}`,
          };
          break;

        case "team:task_assigned":
          yield {
            type: "text",
            agentId: "team-lead",
            content: `任务分配给 ${teamEvent.agentName}: ${teamEvent.task}`,
          };
          break;

        case "team:task_completed":
          eventBus.emit({
            type: "agent:sub_agent_stop",
            agentId: teamEvent.agentName,
            data: { success: true },
          });
          yield {
            type: "sub_agent_done",
            agentId: teamEvent.agentName,
            parentId: "team-lead",
            success: true,
          };
          break;

        case "team:text":
          yield {
            type: "text",
            agentId: teamEvent.agentId,
            content: teamEvent.content,
          };
          break;

        case "team:tool_call":
          yield {
            type: "tool_call",
            agentId: teamEvent.agentId,
            tool: teamEvent.tool,
            toolId: "",
            input: teamEvent.input,
          };
          break;

        case "team:done":
          eventBus.emit({
            type: "agent:done",
            agentId: "team-lead",
            data: { cost: teamEvent.cost },
          });
          yield {
            type: "team:done",
            result: teamEvent.result,
            cost: teamEvent.cost,
          };
          yield { type: "done", agentId: "team-lead" };
          break;

        case "team:error":
          yield { type: "error", agentId: "team", message: teamEvent.message };
          break;

        case "team:raw":
          // 透传原始事件，不转发到 EventBus
          break;
      }
    }
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : "Team 执行失败";
    eventBus.emit({
      type: "agent:done",
      agentId: "team-lead",
      data: { error: errMsg },
    });
    yield { type: "error", agentId: "team", message: errMsg };
  } finally {
    teamActive = false;
  }
}
