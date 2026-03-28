// ==========================================
// OPC Marketing Agent OS — 数据模型类型定义
// 对应 PRD 中的 9 张核心数据表
// ==========================================

import type { ContextAssetType, ExpertRoleId } from '../../shared/context-ownership';

export type { ContextAssetType, ExpertRoleId } from '../../shared/context-ownership';

// --- Enums ---

export type TaskStatus =
  | 'backlog'
  | 'draft'
  | 'review'
  | 'approved'
  | 'scheduled'
  | 'published';

export type ContentStatus =
  | 'draft'
  | 'review'
  | 'approved'
  | 'rejected'
  | 'published';

export type ApprovalDecision = 'pending' | 'approved' | 'rejected' | 'revision';

export type AgentRunStatus = 'pending' | 'running' | 'success' | 'failed';

// --- Tables ---

export interface User {
  id: string;
  email: string;
  name: string;
  avatar_url: string | null;
  role: string;
  created_at: string;
  updated_at: string;
}

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  owner_id: string;
  settings: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface ContextAsset {
  id: string;
  workspace_id: string;
  type: ContextAssetType;
  scope: string;
  expert_role_id: ExpertRoleId;
  ownership_key: string;
  title: string;
  content: string;
  metadata: Record<string, unknown>;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface Campaign {
  id: string;
  workspace_id: string;
  name: string;
  description: string;
  goal: string;
  start_date: string | null;
  end_date: string | null;
  status: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface Task {
  id: string;
  campaign_id: string;
  title: string;
  description: string;
  status: TaskStatus;
  assignee_type: 'agent' | 'human';
  assignee_id: string | null;
  priority: number;
  due_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface AgentRun {
  id: string;
  task_id: string;
  agent_type: string;
  provider: string;
  model: string;
  prompt_tokens: number;
  completion_tokens: number;
  status: AgentRunStatus;
  input: Record<string, unknown>;
  output: Record<string, unknown> | null;
  error: string | null;
  started_at: string;
  finished_at: string | null;
  /** 闭环学习: 生成前的假设（为什么这组内容会有效） */
  hypothesis: string | null;
  /** 闭环学习: 实验结果（投放后的数据） */
  experiment_result: Record<string, unknown> | null;
  /** 闭环学习: AI 提炼的经验教训 */
  learnings: string | null;
}

export interface Content {
  id: string;
  task_id: string;
  campaign_id: string;
  title: string;
  body: string;
  platform: string;
  status: ContentStatus;
  media_urls: string[];
  metadata: Record<string, unknown>;
  created_by: string;
  created_at: string;
  updated_at: string;
  /** 产出追溯: 生成该内容的 AgentRun ID */
  agent_run_id: string | null;
  /** 产出追溯: 使用的场景 Agent 类型 (social/article/video/email) */
  agent_type: string | null;
  /** 闭环学习: 关联的 learning record ID */
  learning_id: string | null;
}

export interface Approval {
  id: string;
  content_id: string;
  reviewer_id: string;
  decision: ApprovalDecision;
  comment: string | null;
  created_at: string;
}

export interface Metric {
  id: string;
  content_id: string;
  platform: string;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  clicks: number;
  conversions: number;
  recorded_at: string;
}

export interface ApprovalRecord {
  id: string;
  content_id: string;
  decision: 'approved' | 'rejected' | 'revision';
  comment: string;
  reviewer: string;
  created_at: string;
}

export interface MetricRecord {
  id: string;
  content_id: string;
  content_title: string;
  platform: string;
  impressions: number;
  likes: number;
  comments: number;
  saves: number;
  shares: number;
  leads: number;
  recorded_at: string;
  created_at: string;
}
