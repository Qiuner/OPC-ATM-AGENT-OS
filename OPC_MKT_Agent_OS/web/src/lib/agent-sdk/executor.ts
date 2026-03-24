/**
 * SDK Executor — 封装 Claude Agent SDK query() 调用
 *
 * 将 engine/ 的 AgentRegistry 与 web/ 的 EventBus 连接。
 * 提供 async generator 接口，用于 SSE 流式输出。
 */

import { eventBus } from "./event-bus";

// 环境变量隔离 — 必须在 import SDK 之前执行
delete process.env.CLAUDECODE;
delete process.env.CLAUDE_CODE_ENTRYPOINT;
delete process.env.CLAUDE_CODE_IS_AGENT;

/** Agent 执行流事件 */
export type AgentStreamEvent =
  | { type: "text"; agentId: string; content: string }
  | { type: "tool_call"; agentId: string; tool: string; toolId: string; input: string }
  | { type: "tool_result"; agentId: string; toolId: string; success: boolean; result: string }
  | { type: "sub_agent_start"; agentId: string; parentId: string; task: string }
  | { type: "sub_agent_done"; agentId: string; parentId: string; success: boolean }
  | { type: "done"; agentId: string }
  | { type: "error"; agentId: string; message: string };

/** 并发控制 */
const MAX_CONCURRENT = 3;
let activeCount = 0;

/** 已知的子 Agent ID 集合（从 registry 动态获取） */
let subAgentIds: Set<string> | null = null;

async function getSubAgentIds(): Promise<Set<string>> {
  if (subAgentIds) return subAgentIds;
  // 动态 import 避免构建时解析 engine/ 的 node 依赖
  const { AgentRegistry } = await import("marketing-agent-os-engine/agents/registry");
  const registry = AgentRegistry.getInstance();
  subAgentIds = new Set(registry.getSubAgentDefs().map((a) => a.id));
  return subAgentIds;
}

/**
 * 执行 Agent 任务（Supervisor 或 Direct 模式）
 *
 * @param agentId - Agent ID（'ceo' 使用 Supervisor 模式，其他使用 Direct 模式）
 * @param message - 用户指令
 * @param context - 可选上下文
 */
export async function* executeAgent(
  agentId: string,
  message: string,
  context?: Record<string, unknown>,
): AsyncGenerator<AgentStreamEvent> {
  if (activeCount >= MAX_CONCURRENT) {
    yield { type: "error", agentId, message: "Agent 繁忙，请稍后再试" };
    return;
  }

  activeCount++;

  try {
    // 动态 import — 避免构建时解析
    const [{ query }, { AgentRegistry }] = await Promise.all([
      import("@anthropic-ai/claude-agent-sdk"),
      import("marketing-agent-os-engine/agents/registry"),
    ]);

    const registry = AgentRegistry.getInstance();
    const knownSubAgents = await getSubAgentIds();

    // 根据 agentId 选择 Supervisor 或 Direct 模式
    const config =
      agentId === "ceo"
        ? await registry.buildSupervisorConfig(message, context)
        : await registry.buildDirectConfig(agentId, message, context);

    eventBus.emit({
      type: "agent:start",
      agentId,
      data: { message: message.slice(0, 200) },
    });

    for await (const sdkMessage of query(config)) {
      const msg = sdkMessage as Record<string, unknown>;

      // ===== assistant 消息 =====
      if (msg.type === "assistant" && msg.message) {
        const assistantMsg = msg.message as Record<string, unknown>;
        const content = assistantMsg.content;

        if (Array.isArray(content)) {
          for (const block of content) {
            // 文本块
            if (block?.type === "text" && block?.text) {
              eventBus.emit({
                type: "agent:text",
                agentId,
                data: { text: (block.text as string).slice(0, 100) },
              });
              yield { type: "text", agentId, content: block.text as string };
            }

            // 工具调用块
            if (block?.type === "tool_use") {
              const toolName = (block.name || "unknown") as string;
              const toolId = (block.id || "") as string;
              const inputStr = JSON.stringify(block.input || {}).slice(0, 300);

              // 检测子 Agent 调度
              let detectedSubAgent: string | null = null;
              if (knownSubAgents.has(toolName)) {
                detectedSubAgent = toolName;
              } else if (toolName === "Agent" && block.input) {
                const inputObj = block.input as Record<string, unknown>;
                const targetName = (inputObj.agent_name || inputObj.name || inputObj.agentName || "") as string;
                if (knownSubAgents.has(targetName)) {
                  detectedSubAgent = targetName;
                }
              }

              if (detectedSubAgent) {
                eventBus.emit({
                  type: "agent:sub_agent_start",
                  agentId: detectedSubAgent,
                  data: { parentAgent: agentId, toolId, taskPreview: inputStr },
                });
                yield {
                  type: "sub_agent_start",
                  agentId: detectedSubAgent,
                  parentId: agentId,
                  task: inputStr,
                };
              }

              eventBus.emit({
                type: "agent:tool_call",
                agentId: detectedSubAgent || agentId,
                data: { toolName, toolId, inputPreview: inputStr },
              });
              yield {
                type: "tool_call",
                agentId: detectedSubAgent || agentId,
                tool: toolName,
                toolId,
                input: inputStr,
              };
            }

            // tool_result 块
            if (block?.type === "tool_result") {
              const toolId = (block.tool_use_id || "") as string;
              const isError = !!block.is_error;
              const resultPreview =
                typeof block.content === "string"
                  ? block.content.slice(0, 300)
                  : JSON.stringify(block.content || "").slice(0, 300);

              // 检查是否是子 Agent 完成
              const recentEvents = eventBus.getRecentEvents(Date.now() - 120_000);
              const matchingStart = recentEvents.find(
                (e) => e.type === "agent:sub_agent_start" && e.data.toolId === toolId,
              );

              if (matchingStart?.agentId) {
                eventBus.emit({
                  type: "agent:sub_agent_stop",
                  agentId: matchingStart.agentId,
                  data: { parentAgent: agentId, toolId, success: !isError },
                });
                yield {
                  type: "sub_agent_done",
                  agentId: matchingStart.agentId,
                  parentId: agentId,
                  success: !isError,
                };
              }

              eventBus.emit({
                type: "agent:tool_result",
                agentId: matchingStart?.agentId || agentId,
                data: { toolId, success: !isError, resultPreview },
              });
              yield {
                type: "tool_result",
                agentId: matchingStart?.agentId || agentId,
                toolId,
                success: !isError,
                result: resultPreview,
              };
            }
          }
        }
      }

      // ===== result 消息（Agent 执行完成）=====
      if (msg.type === "result") {
        eventBus.emit({
          type: "agent:done",
          agentId,
          data: { resultLength: typeof msg.result === "string" ? msg.result.length : 0 },
        });
      }
    }

    yield { type: "done", agentId };
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : "Agent 执行失败";

    eventBus.emit({
      type: "agent:done",
      agentId,
      data: { error: errMsg },
    });

    if (err instanceof Error && err.message.includes("context_length_exceeded")) {
      yield { type: "error", agentId, message: "上下文过长，请缩短指令或分步执行" };
    } else if (err instanceof Error && err.message.includes("rate_limit")) {
      yield { type: "error", agentId, message: "API 限流，请等待 30 秒后重试" };
    } else {
      yield { type: "error", agentId, message: errMsg };
    }
  } finally {
    activeCount--;
  }
}

/**
 * 获取所有已注册 Agent 的状态信息
 */
export async function getAgentStatuses(): Promise<
  Array<{
    id: string;
    name: string;
    nameEn: string;
    description: string;
    level: string;
    color: string;
    avatar: string;
    status: "idle" | "busy";
  }>
> {
  const { AgentRegistry } = await import("marketing-agent-os-engine/agents/registry");
  const registry = AgentRegistry.getInstance();

  return registry.getAll().map((agent) => ({
    id: agent.id,
    name: agent.name,
    nameEn: agent.nameEn,
    description: agent.description,
    level: agent.level,
    color: agent.color,
    avatar: agent.avatar,
    status: "idle" as const,
  }));
}
