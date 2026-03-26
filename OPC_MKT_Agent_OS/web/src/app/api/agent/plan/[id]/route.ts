/**
 * GET /api/agent/plan/[id] — 获取指定计划详情
 */

import { getPlan } from "@/lib/store/plans";

export const runtime = "nodejs";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  try {
    const plan = getPlan(id);
    if (!plan) {
      return Response.json(
        { success: false, error: `Plan "${id}" not found` },
        { status: 404 },
      );
    }
    return Response.json({ success: true, data: plan });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to get plan";
    return Response.json({ success: false, error: message }, { status: 500 });
  }
}
