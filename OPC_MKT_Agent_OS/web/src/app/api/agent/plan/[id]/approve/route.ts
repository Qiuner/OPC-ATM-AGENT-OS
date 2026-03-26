/**
 * PUT /api/agent/plan/[id]/approve — 审批通过执行计划
 *
 * 审批通过后，计划状态变为 executing，
 * 通过 SSE 流式返回执行进度。
 */

import { getPlan, updatePlanStatus } from "@/lib/store/plans";
import { executePlan } from "@/lib/agent-sdk/plan-executor";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function PUT(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const plan = getPlan(id);
  if (!plan) {
    return Response.json(
      { success: false, error: `Plan "${id}" not found` },
      { status: 404 },
    );
  }

  if (plan.status !== "pending" && plan.status !== "modified") {
    return Response.json(
      { success: false, error: `Plan status is "${plan.status}", cannot approve` },
      { status: 400 },
    );
  }

  // 先标记为 approved
  updatePlanStatus(id, "approved");

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        // 然后执行
        for await (const event of executePlan(id)) {
          const data = JSON.stringify(event);
          controller.enqueue(encoder.encode(`data: ${data}\n\n`));
        }
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : "Plan execution failed";
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ type: "plan_error", planId: id, message: errMsg })}\n\n`,
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
