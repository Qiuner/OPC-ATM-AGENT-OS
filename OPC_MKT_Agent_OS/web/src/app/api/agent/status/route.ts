/**
 * GET /api/agent/status — Agent 状态查询
 *
 * 返回所有已注册 Agent 的基本信息和当前状态。
 */

import { getAgentStatuses } from "@/lib/agent-sdk/executor";

export const runtime = "nodejs";

export async function GET() {
  try {
    const agents = await getAgentStatuses();
    return Response.json({ agents });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to get agent statuses";
    return Response.json({ error: message }, { status: 500 });
  }
}
