/**
 * Main 进程数据类型 — 从 web/src/types/index.ts 迁移
 * 与 renderer/types/index.ts 保持一致
 */

import type { ContextAssetType, ExpertRoleId } from '../shared/context-ownership'

export type TaskStatus = 'backlog' | 'draft' | 'review' | 'approved' | 'scheduled' | 'published'
export type ContentStatus = 'draft' | 'review' | 'approved' | 'rejected' | 'published'
export type AgentRunStatus = 'pending' | 'running' | 'success' | 'failed'

export interface Campaign {
  id: string
  workspace_id: string
  name: string
  description: string
  goal: string
  start_date: string | null
  end_date: string | null
  status: string
  created_by: string
  created_at: string
  updated_at: string
}

export interface Task {
  id: string
  campaign_id: string
  title: string
  description: string
  status: TaskStatus
  assignee_type: 'agent' | 'human'
  assignee_id: string | null
  priority: number
  due_date: string | null
  created_at: string
  updated_at: string
}

export interface Content {
  id: string
  task_id: string
  campaign_id: string
  title: string
  body: string
  platform: string
  status: ContentStatus
  media_urls: string[]
  metadata: Record<string, unknown>
  created_by: string
  created_at: string
  updated_at: string
  agent_run_id: string | null
  agent_type: string | null
  learning_id: string | null
}

export interface ContextAsset {
  id: string
  workspace_id: string
  type: ContextAssetType
  scope: string
  expert_role_id: ExpertRoleId
  ownership_key: string
  title: string
  content: string
  metadata: Record<string, unknown>
  created_by: string
  created_at: string
  updated_at: string
}

export interface AgentRun {
  id: string
  task_id: string
  agent_type: string
  provider: string
  model: string
  prompt_tokens: number
  completion_tokens: number
  status: AgentRunStatus
  input: Record<string, unknown>
  output: Record<string, unknown> | null
  error: string | null
  started_at: string
  finished_at: string | null
  hypothesis: string | null
  experiment_result: Record<string, unknown> | null
  learnings: string | null
}

export interface MetricRecord {
  id: string
  content_id: string
  content_title: string
  platform: string
  impressions: number
  likes: number
  comments: number
  saves: number
  shares: number
  leads: number
  recorded_at: string
  created_at: string
}
