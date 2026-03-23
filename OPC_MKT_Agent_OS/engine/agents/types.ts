/**
 * Marketing Agent OS — 核心类型定义
 */

// ============================================================
// Agent 相关
// ============================================================

/** 支持的营销渠道 */
export type Channel = "xhs" | "douyin" | "x" | "email" | "video";

/** 内容状态 */
export type ContentStatus = "draft" | "review" | "approved" | "published" | "rejected";

/** 任务状态 */
export type TaskStatus = "pending" | "running" | "done" | "failed";

/** Hook 类型 — 开头方式 */
export type HookType = "question" | "number" | "story" | "controversy" | "pain_point";

/** 情绪触发器 */
export type EmotionTrigger = "curiosity" | "urgency" | "social_proof" | "fomo" | "aspiration";

// ============================================================
// 数据库模型（对应 schema.sql）
// ============================================================

export interface ContentPiece {
  id: string;
  channel: Channel;
  title: string | null;
  body: string;
  hook_type: HookType | null;
  emotion_trigger: EmotionTrigger | null;
  tags: string[];
  campaign_id: string | null;
  external_id: string | null;
  status: ContentStatus;
  created_by: string;
  created_at: string;
  published_at: string | null;
}

export interface PerformanceMetric {
  id: string;
  content_id: string;
  channel: Channel;
  impressions: number;
  likes: number;
  comments: number;
  shares: number;
  collects: number;         // 小红书收藏
  view_count: number;
  completion_rate: number | null;
  open_rate: number | null;
  click_rate: number | null;
  ctr: number | null;
  roas: number | null;
  cpm: number | null;
  performance_score: number | null;
  recorded_at: string;
}

export interface WinningPattern {
  id: string;
  channel: Channel;
  hook_type: HookType | null;
  emotion_trigger: EmotionTrigger | null;
  format_notes: string | null;
  example_content: string | null;
  avg_score: number;
  sample_size: number;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface TaskItem {
  id: string;
  agent_name: string;
  task_type: string;
  priority: number;
  payload: Record<string, unknown> | null;
  status: TaskStatus;
  result: Record<string, unknown> | null;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
}

// ============================================================
// Agent SDK 相关
// ============================================================

/** CEO 调度子 Agent 的任务描述 */
export interface AgentTask {
  agentName: string;
  taskType: string;
  description: string;
  priority: number;
  payload: Record<string, unknown>;
}

/** Agent 执行结果 */
export interface AgentResult {
  success: boolean;
  contentId?: string;
  summary: string;
  error?: string;
}

/** 子 Agent 定义（用于 query options.agents） */
export interface SubAgentDef {
  description: string;
  prompt: string;
  tools: string[];
}

// ============================================================
// Agent Registry 相关
// ============================================================

/** Agent 定义 — 统一注册表 */
export interface AgentDefinition {
  id: string;
  name: string;
  nameEn: string;
  description: string;
  skillFile: string;
  model: string;
  tools: string[];
  mcpServers?: Record<string, MCPServerConfig>;
  maxTurns: number;
  level: "orchestrator" | "specialist" | "reviewer";
  color: string;
  avatar: string;
}

/** MCP Server 配置 */
export interface MCPServerConfig {
  command: string;
  args: string[];
  env?: Record<string, string>;
}

/** Agent 执行流事件（用于 SSE 推送） */
export type AgentStreamEvent =
  | { type: "text"; agentId: string; content: string }
  | { type: "tool_call"; agentId: string; tool: string; toolId: string; input: string }
  | { type: "tool_result"; agentId: string; tool: string; toolId: string; success: boolean; result: string }
  | { type: "sub_agent_start"; agentId: string; parentId: string; task: string }
  | { type: "sub_agent_done"; agentId: string; parentId: string; success: boolean }
  | { type: "agent_message"; from: string; to: string; content: string }
  | { type: "done"; agentId: string }
  | { type: "error"; agentId: string; message: string };

/** EventBus 事件类型 */
export type AgentEventType =
  | "agent:start"
  | "agent:stop"
  | "agent:text"
  | "agent:done"
  | "agent:tool_call"
  | "agent:tool_result"
  | "agent:sub_agent_start"
  | "agent:sub_agent_stop"
  | "agent:message"
  | "system:log"
  | "system:heartbeat";

/** EventBus 事件 */
export interface AgentEvent {
  id: number;
  type: AgentEventType;
  timestamp: number;
  agentId?: string;
  data: Record<string, unknown>;
}
