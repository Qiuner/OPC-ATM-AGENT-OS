/**
 * POST /api/agent/plan — 触发 CEO Agent 生成执行计划
 *
 * Plan-Execute 两阶段模型的入口：
 * 1. CEO 分析用户需求，生成 ExecutionPlan
 * 2. 通过 SSE 流式返回计划给前端
 * 3. 前端展示计划，用户审批后再执行
 *
 * GET /api/agent/plan — 获取所有计划列表
 */

import { generatePlan } from "@/lib/agent-sdk/plan-generator";
import { getAllPlans } from "@/lib/store/plans";

export const runtime = "nodejs";
export const maxDuration = 120;

interface PlanRequest {
  message: string;
  context?: Record<string, unknown>;
}

export async function POST(req: Request) {
  let body: PlanRequest;
  try {
    body = (await req.json()) as PlanRequest;
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { message, context } = body;
  if (!message) {
    return Response.json({ error: "message is required" }, { status: 400 });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        for await (const event of generatePlan(message, context)) {
          const data = JSON.stringify(event);
          controller.enqueue(encoder.encode(`data: ${data}\n\n`));
        }
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : "Plan generation failed";
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ type: "plan_error", planId: "", message: errMsg })}\n\n`,
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

export async function GET() {
  try {
    const plans = getAllPlans();
    return Response.json({ success: true, data: plans });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to list plans";
    return Response.json({ success: false, error: message }, { status: 500 });
  }
}
