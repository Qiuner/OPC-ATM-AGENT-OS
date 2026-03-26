/**
 * PUT /api/agent/plan/[id]/reject — 驳回执行计划
 */

import { getPlan, updatePlanStatus } from "@/lib/store/plans";

export const runtime = "nodejs";

interface RejectRequest {
  feedback?: string;
}

export async function PUT(
  req: Request,
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
      { success: false, error: `Plan status is "${plan.status}", cannot reject` },
      { status: 400 },
    );
  }

  let feedback: string | undefined;
  try {
    const body = (await req.json()) as RejectRequest;
    feedback = body.feedback;
  } catch {
    // No body is fine
  }

  const updated = updatePlanStatus(id, "rejected", { feedback });

  return Response.json({ success: true, data: updated });
}
