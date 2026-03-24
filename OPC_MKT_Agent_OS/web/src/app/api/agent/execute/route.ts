/**
 * POST /api/agent/execute — 统一 Agent 执行端点（SSE 流式）
 *
 * 替代旧的 /api/team-studio 端点。
 * 支持两种模式：
 * - supervisor: CEO 编排所有子 Agent（agentId='ceo'）
 * - direct: 直接执行指定 Agent
 */

import { executeAgent } from "@/lib/agent-sdk/executor";

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

  // BUG-002: 校验 agentId 是否在 Registry 中存在
  const { AgentRegistry } = await import("marketing-agent-os-engine/agents/registry");
  const registry = AgentRegistry.getInstance();
  if (!registry.get(agentId)) {
    return Response.json(
      { error: `Agent "${agentId}" not found` },
      { status: 404 },
    );
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        for await (const event of executeAgent(agentId, message, context)) {
          const data = JSON.stringify(event);
          controller.enqueue(encoder.encode(`data: ${data}\n\n`));
        }
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : "Unknown error";
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ type: "error", agentId, message: errMsg })}\n\n`,
          ),
        );
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
