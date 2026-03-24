/**
 * POST /api/team/execute — Agent Team 模式执行端点（SSE 流式）
 *
 * 与 /api/agent/execute（SDK 子进程模式）并列。
 * 使用 Claude Code CLI 的 Agent Team 能力：
 *   TeamCreate → Agent spawn → SendMessage 网状通信
 */

import { executeTeamTask } from "@/lib/agent-sdk/team-executor";

export const runtime = "nodejs";
export const maxDuration = 600; // Team 模式需要更长时间

interface TeamExecuteRequest {
  message: string;
  teamName?: string;
  maxBudgetUsd?: number;
  model?: "opus" | "sonnet" | "haiku";
}

export async function POST(req: Request) {
  let body: TeamExecuteRequest;
  try {
    body = (await req.json()) as TeamExecuteRequest;
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { message, teamName, maxBudgetUsd, model } = body;

  if (!message) {
    return Response.json(
      { error: "message is required" },
      { status: 400 },
    );
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        for await (const event of executeTeamTask(message, {
          teamName,
          maxBudgetUsd,
          model,
        })) {
          const data = JSON.stringify(event);
          controller.enqueue(encoder.encode(`data: ${data}\n\n`));
        }
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : "Unknown error";
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ type: "error", agentId: "team", message: errMsg })}\n\n`,
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
