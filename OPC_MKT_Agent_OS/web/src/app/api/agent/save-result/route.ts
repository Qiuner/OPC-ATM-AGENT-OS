/**
 * POST /api/agent/save-result — 保存 Agent 执行结果到数据 Store
 *
 * 将 Agent 生成的内容写入 contents.json 和 tasks.json，
 * 使 Dashboard、Approval Center、Task Board 等页面能看到数据。
 *
 * 这是打通「Agent 执行 → 数据展示」链路的关键端点。
 */

import { createTask } from "@/lib/store/tasks";
import { createContent } from "@/lib/store/contents";
import { generateId, nowISO } from "@/lib/store/index";
import { readCollection, writeCollection } from "@/lib/store/index";
import type { AgentRun } from "@/types";

interface SaveResultRequest {
  /** Agent 执行模式 */
  mode: "fast" | "team";
  /** 执行的 Agent ID */
  agentId: string;
  /** 用户原始指令 */
  prompt: string;
  /** Agent 输出的完整文本 */
  result: string;
  /** 可选：平台（默认小红书） */
  platform?: string;
  /** 可选：标题（从内容中提取） */
  title?: string;
  /** 可选：关联的 campaign ID */
  campaignId?: string;
  /** 可选：执行耗时（ms） */
  durationMs?: number;
  /** 可选：Token 消耗 */
  tokenUsage?: { input: number; output: number };
}

export async function POST(req: Request) {
  let body: SaveResultRequest;
  try {
    body = (await req.json()) as SaveResultRequest;
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { agentId, prompt, result, platform, title, campaignId, durationMs, tokenUsage, mode } = body;

  if (!result || !prompt) {
    return Response.json({ error: "prompt and result are required" }, { status: 400 });
  }

  const now = nowISO();

  // 1. 创建 Task
  const task = await createTask({
    campaign_id: campaignId || "default",
    title: title || prompt.slice(0, 80),
    description: prompt,
    status: "review",
    assignee_type: "agent",
    assignee_id: agentId,
    priority: 1,
    due_date: null,
  });

  // 2. 创建 Content（状态为 review，等待审批）
  const content = await createContent({
    task_id: task.id,
    campaign_id: campaignId || "default",
    title: title || extractTitle(result) || prompt.slice(0, 80),
    body: result,
    platform: platform || "xiaohongshu",
    status: "review",
    media_urls: [],
    metadata: {
      mode,
      agentId,
      prompt,
    },
    created_by: `agent:${agentId}`,
    agent_run_id: null,
    agent_type: agentId,
    learning_id: null,
  });

  // 3. 创建 AgentRun 记录
  const agentRun: AgentRun = {
    id: generateId("run"),
    task_id: task.id,
    agent_type: agentId,
    provider: "anthropic",
    model: mode === "team" ? "claude-code-team" : "claude-sonnet",
    prompt_tokens: tokenUsage?.input ?? 0,
    completion_tokens: tokenUsage?.output ?? 0,
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

  return Response.json({
    success: true,
    taskId: task.id,
    contentId: content.id,
    agentRunId: agentRun.id,
  });
}

/** 从内容中提取标题（第一行非空文本） */
function extractTitle(text: string): string | null {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  for (const line of lines) {
    // 跳过 markdown heading markers, emoji-only lines
    const clean = line.replace(/^#+\s*/, "").replace(/^\*+/, "").trim();
    if (clean.length > 5 && clean.length < 100) {
      return clean;
    }
  }
  return null;
}
