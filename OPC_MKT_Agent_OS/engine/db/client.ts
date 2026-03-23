/**
 * Supabase 客户端 + 常用查询封装
 */

import { createClient } from "@supabase/supabase-js";
import type { ContentPiece, PerformanceMetric, WinningPattern, TaskItem, Channel } from "../agents/types.js";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.warn("[DB] SUPABASE_URL 或 SUPABASE_KEY 未设置，数据库功能不可用");
}

export const db = createClient(supabaseUrl || "", supabaseKey || "");

// ============================================================
// Content 操作
// ============================================================

export async function insertContent(
  content: Omit<ContentPiece, "id" | "created_at" | "published_at">
): Promise<ContentPiece> {
  const { data, error } = await db
    .from("content_pieces")
    .insert(content)
    .select()
    .single();

  if (error) throw new Error(`插入内容失败: ${error.message}`);
  return data as ContentPiece;
}

export async function updateContentStatus(
  contentId: string,
  status: ContentPiece["status"],
  externalId?: string
): Promise<void> {
  const update: Record<string, unknown> = { status };
  if (externalId) update.external_id = externalId;
  if (status === "published") update.published_at = new Date().toISOString();

  const { error } = await db
    .from("content_pieces")
    .update(update)
    .eq("id", contentId);

  if (error) throw new Error(`更新内容状态失败: ${error.message}`);
}

// ============================================================
// Metrics 操作
// ============================================================

export async function upsertMetrics(
  contentId: string,
  channel: Channel,
  metrics: Partial<PerformanceMetric>
): Promise<void> {
  const { error } = await db
    .from("performance_metrics")
    .upsert(
      { content_id: contentId, channel, ...metrics, recorded_at: new Date().toISOString() },
      { onConflict: "content_id" }
    );

  if (error) throw new Error(`更新指标失败: ${error.message}`);
}

// ============================================================
// Winning Patterns 查询
// ============================================================

export async function getActivePatterns(channel: Channel): Promise<WinningPattern[]> {
  const { data, error } = await db
    .from("winning_patterns")
    .select("*")
    .eq("channel", channel)
    .eq("active", true)
    .order("avg_score", { ascending: false });

  if (error) throw new Error(`查询胜出模式失败: ${error.message}`);
  return (data || []) as WinningPattern[];
}

export async function getTopContent(channel: Channel, limit = 20): Promise<ContentPiece[]> {
  const { data, error } = await db
    .from("top_performing_content")
    .select("*")
    .eq("channel", channel)
    .lte("percentile_rank", 0.2)
    .limit(limit);

  if (error) throw new Error(`查询 Top 内容失败: ${error.message}`);
  return (data || []) as ContentPiece[];
}

// ============================================================
// Task Queue 操作
// ============================================================

export async function createTask(
  task: Omit<TaskItem, "id" | "created_at" | "started_at" | "completed_at" | "result">
): Promise<TaskItem> {
  const { data, error } = await db
    .from("task_queue")
    .insert(task)
    .select()
    .single();

  if (error) throw new Error(`创建任务失败: ${error.message}`);
  return data as TaskItem;
}

export async function getPendingTasks(agentName?: string): Promise<TaskItem[]> {
  let query = db
    .from("task_queue")
    .select("*")
    .eq("status", "pending")
    .order("priority", { ascending: true })
    .limit(10);

  if (agentName) query = query.eq("agent_name", agentName);

  const { data, error } = await query;
  if (error) throw new Error(`查询待处理任务失败: ${error.message}`);
  return (data || []) as TaskItem[];
}

export async function updateTaskStatus(
  taskId: string,
  status: TaskItem["status"],
  result?: Record<string, unknown>
): Promise<void> {
  const update: Record<string, unknown> = { status };
  if (status === "running") update.started_at = new Date().toISOString();
  if (status === "done" || status === "failed") {
    update.completed_at = new Date().toISOString();
    if (result) update.result = result;
  }

  const { error } = await db
    .from("task_queue")
    .update(update)
    .eq("id", taskId);

  if (error) throw new Error(`更新任务状态失败: ${error.message}`);
}

// ============================================================
// 统计查询
// ============================================================

export async function getChannelStats(channel: Channel, days = 7) {
  const since = new Date(Date.now() - days * 86400000).toISOString();

  const { data, error } = await db
    .from("content_pieces")
    .select("id, status, created_at")
    .eq("channel", channel)
    .gte("created_at", since);

  if (error) throw new Error(`查询渠道统计失败: ${error.message}`);

  const total = data?.length || 0;
  const published = data?.filter((d: Record<string, unknown>) => d.status === "published").length || 0;

  return { channel, days, total, published };
}
