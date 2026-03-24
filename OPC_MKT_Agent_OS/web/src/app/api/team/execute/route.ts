/**
 * POST /api/team/execute — Agent Team 模式执行端点（SSE 流式）
 *
 * 使用 Claude Code CLI 的 Agent Team 能力。
 * 执行完成后自动保存结果到数据 Store。
 */

import { executeTeamTask } from "@/lib/agent-sdk/team-executor";
import { createTask } from "@/lib/store/tasks";
import { createContent } from "@/lib/store/contents";
import { readCollection, writeCollection, generateId, nowISO } from "@/lib/store/index";
import { runBrandReview } from "@/lib/store/brand-review";
import type { AgentRun } from "@/types";

export const runtime = "nodejs";
export const maxDuration = 600;

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
  const textChunks: string[] = [];
  let hasError = false;

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

          // 收集文本
          if ("type" in event && event.type === "text") {
            textChunks.push((event as { content: string }).content);
          }
          if ("type" in event && event.type === "team:done") {
            const doneEvent = event as { result: string };
            if (doneEvent.result) textChunks.push(doneEvent.result);
          }
          if ("type" in event && event.type === "error") {
            hasError = true;
          }
        }
      } catch (err) {
        hasError = true;
        const errMsg = err instanceof Error ? err.message : "Unknown error";
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ type: "error", agentId: "team", message: errMsg })}\n\n`,
          ),
        );
      }

      // 保存结果到 Store
      if (!hasError && textChunks.length > 0) {
        try {
          const fullResult = textChunks.join("\n");
          await saveTeamResult(message, fullResult);
        } catch {
          // silent
        }
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

async function saveTeamResult(prompt: string, result: string) {
  const now = nowISO();
  const title = extractTitle(result) || prompt.slice(0, 80);

  const task = await createTask({
    campaign_id: "default",
    title,
    description: prompt,
    status: "review",
    assignee_type: "agent",
    assignee_id: "team-lead",
    priority: 1,
    due_date: null,
  });

  const content = await createContent({
    task_id: task.id,
    campaign_id: "default",
    title,
    body: result,
    platform: "xiaohongshu",
    status: "review",
    media_urls: [],
    metadata: { mode: "team", prompt, pipelineStage: "ai-review" },
    created_by: "agent:team-lead",
    agent_run_id: null,
    agent_type: "team",
    learning_id: null,
  });

  // Run Brand Reviewer scoring pipeline
  await runBrandReview(content.id);

  const agentRun: AgentRun = {
    id: generateId("run"),
    task_id: task.id,
    agent_type: "team",
    provider: "anthropic",
    model: "claude-code-team",
    prompt_tokens: 0,
    completion_tokens: 0,
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
}

function extractTitle(text: string): string | null {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  for (const line of lines) {
    const clean = line.replace(/^#+\s*/, "").replace(/^\*+/, "").trim();
    if (clean.length > 5 && clean.length < 100) return clean;
  }
  return null;
}
