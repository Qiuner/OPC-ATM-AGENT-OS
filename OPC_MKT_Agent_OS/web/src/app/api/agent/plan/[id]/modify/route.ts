/**
 * PUT /api/agent/plan/[id]/modify — 修改计划后重新提交
 *
 * 用户可以编辑步骤后重新提交审批。
 */

import { getPlan, modifyPlanSteps } from "@/lib/store/plans";
import type { PlanStep } from "@/lib/store/plans";

export const runtime = "nodejs";

interface ModifyRequest {
  steps: PlanStep[];
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
      { success: false, error: `Plan status is "${plan.status}", cannot modify` },
      { status: 400 },
    );
  }

  let body: ModifyRequest;
  try {
    body = (await req.json()) as ModifyRequest;
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.steps || !Array.isArray(body.steps) || body.steps.length === 0) {
    return Response.json(
      { success: false, error: "steps array is required and must not be empty" },
      { status: 400 },
    );
  }

  const updated = modifyPlanSteps(id, body.steps, body.feedback);

  return Response.json({ success: true, data: updated });
}
