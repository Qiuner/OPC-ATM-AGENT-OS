/**
 * POST /api/agent/execute — 统一 Agent 执行端点（SSE 流式）
 *
 * 支持两种模式：
 * - supervisor: CEO 编排所有子 Agent（agentId='ceo'）
 * - direct: 直接执行指定 Agent
 *
 * 执行完成后自动将结果保存到数据 Store（tasks/contents/agent-runs），
 * 使 Dashboard、Approval Center 等页面能看到最新数据。
 */

import { executeAgent } from "@/lib/agent-sdk/executor";
import { createTask } from "@/lib/store/tasks";
import { createContent } from "@/lib/store/contents";
import { readCollection, writeCollection, generateId, nowISO } from "@/lib/store/index";
import { runBrandReview } from "@/lib/store/brand-review";
import type { AgentRun } from "@/types";

export const runtime = "nodejs";
export const maxDuration = 300;

interface ExecuteRequest {
  agent: string;
  message: string;
  context?: Record<string, unknown>;
}

export async function POST(req: Request) {
  let body: ExecuteRequest;
  try {
    body = (await req.json()) as ExecuteRequest;
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { agent: agentId, message, context } = body;

  if (!agentId || !message) {
    return Response.json(
      { error: "agent and message are required" },
      { status: 400 },
    );
  }

  // 校验 agentId
  const { AgentRegistry } = await import("marketing-agent-os-engine/agents/registry");
  const registry = AgentRegistry.getInstance();
  if (!registry.get(agentId)) {
    return Response.json(
      { error: `Agent "${agentId}" not found` },
      { status: 404 },
    );
  }

  const encoder = new TextEncoder();

  // 收集完整输出用于保存
  const textChunks: string[] = [];
  let hasError = false;

  const stream = new ReadableStream({
    async start(controller) {
      try {
        for await (const event of executeAgent(agentId, message, context)) {
          const data = JSON.stringify(event);
          controller.enqueue(encoder.encode(`data: ${data}\n\n`));

          // 收集文本输出
          if (event.type === "text") {
            textChunks.push(event.content);
          }
          if (event.type === "error") {
            hasError = true;
          }
        }
      } catch (err) {
        hasError = true;
        const errMsg = err instanceof Error ? err.message : "Unknown error";
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ type: "error", agentId, message: errMsg })}\n\n`,
          ),
        );
      }

      // 执行完成后，自动保存结果到 Store
      if (!hasError && textChunks.length > 0) {
        try {
          const fullResult = textChunks.join("");
          await saveAgentResult(agentId, message, fullResult);
        } catch {
          // 保存失败不影响 SSE 流
        }
      }

      controller.enqueue(
        encoder.encode(`data: ${JSON.stringify({ type: "stream_end" })}\n\n`),
      );
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}

/** 保存 Agent 执行结果到数据 Store */
async function saveAgentResult(agentId: string, prompt: string, result: string) {
  const now = nowISO();

  // 从结果中提取标题
  const title = extractTitle(result) || prompt.slice(0, 80);

  // 创建 Task
  const task = await createTask({
    campaign_id: "default",
    title,
    description: prompt,
    status: "review",
    assignee_type: "agent",
    assignee_id: agentId,
    priority: 1,
    due_date: null,
  });

  // 创建 Content（初始状态 review → Brand Reviewer 评分后可能自动通过）
  const content = await createContent({
    task_id: task.id,
    campaign_id: "default",
    title,
    body: result,
    platform: "xiaohongshu",
    status: "review",
    media_urls: [],
    metadata: { mode: "fast", agentId, prompt, pipelineStage: "ai-review" },
    created_by: `agent:${agentId}`,
    agent_run_id: null,
    agent_type: agentId,
    learning_id: null,
  });

  // Run Brand Reviewer scoring pipeline
  await runBrandReview(content.id);

  // 创建 AgentRun
  const agentRun: AgentRun = {
    id: generateId("run"),
    task_id: task.id,
    agent_type: agentId,
    provider: "anthropic",
    model: "claude-sonnet",
    prompt_tokens: 0,
    completion_tokens: 0,
    status: "success",
    input: { prompt },
    output: { result: result.slice(0, 2000) },
    error: null,
    started_at: now,
    finished_at: now,
    hypothesis: null,
    experiment_result: null,
    learnings: null,
  };

  const runs = readCollection<AgentRun>("agent-runs");
  runs.push(agentRun);
  writeCollection("agent-runs", runs);
}

function extractTitle(text: string): string | null {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  for (const line of lines) {
    const clean = line.replace(/^#+\s*/, "").replace(/^\*+/, "").trim();
    if (clean.length > 5 && clean.length < 100) {
      return clean;
    }
  }
  return null;
}
