/**
 * POST /api/agent/roundtable — 共创圆桌模式（SSE 流式）
 *
 * 多 Agent 围绕主题进行结构化讨论（explore/debate/synthesize），
 * 支持多 LLM 提供商，不限于 Claude。
 *
 * 讨论总结可通过 /api/agent/execute 的 context 参数
 * 传入 CEO Supervisor 模式，实现共创→执行衔接。
 */

import { runRoundtable } from "@/lib/agent-sdk/roundtable";
import type { DiscussionMode, RoundtableAgent } from "@/lib/agent-sdk/roundtable";
import type { ProviderName } from "@/lib/llm/types";

export const runtime = "nodejs";
export const maxDuration = 300;

interface RoundtableRequest {
  topic: string;
  agents: RoundtableAgent[];
  mode?: DiscussionMode;
  maxRounds?: number;
  llmConfig?: {
    provider?: ProviderName;
    model?: string;
    apiKey?: string;
  };
}

export async function POST(req: Request) {
  let body: RoundtableRequest;
  try {
    body = (await req.json()) as RoundtableRequest;
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { topic, agents, mode, maxRounds, llmConfig } = body;

  if (!topic || !agents || agents.length === 0) {
    return Response.json(
      { error: "topic and agents (non-empty array) are required" },
      { status: 400 },
    );
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        for await (const event of runRoundtable({
          topic,
          agents,
          mode: mode || "explore",
          maxRounds: maxRounds || 3,
          llmConfig: {
            provider: llmConfig?.provider || "claude",
            model: llmConfig?.model,
            apiKey: llmConfig?.apiKey,
          },
        })) {
          const data = JSON.stringify(event);
          controller.enqueue(encoder.encode(`data: ${data}\n\n`));
        }
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : "Unknown error";
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ type: "error", message: errMsg })}\n\n`,
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
