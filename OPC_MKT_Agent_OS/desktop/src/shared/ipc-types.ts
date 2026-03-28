/**
 * IPC 通信层类型定义
 *
 * 统一 API 响应格式: { success: boolean, data?: T, error?: string }
 * 与 web/ 的 API Routes 响应格式保持一致
 */

export interface IpcResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
}

// ── Store filter types ──

export interface TaskFilter {
  status?: string
  campaign_id?: string
}

export interface ContentFilter {
  status?: string
  campaign_id?: string
}

export interface ApprovalFilter {
  content_id?: string
}

export interface ContextFilter {
  type?: string
  expert_role_id?: string
  scope?: string
  ownership_key?: string
}

export interface MetricFilter {
  content_id?: string
}

// ── Agent execution types ──

export interface AgentExecuteRequest {
  agent: string
  message: string
  context?: Record<string, unknown>
}

export interface AgentStreamEvent {
  type: 'text' | 'tool_use' | 'tool_result' | 'error' | 'status' | 'stream_end'
  agentId?: string
  content?: string
  message?: string
  [key: string]: unknown
}

export interface AgentSaveResultRequest {
  mode: 'fast' | 'team'
  agentId: string
  prompt: string
  result: string
  platform?: string
  title?: string
  campaignId?: string
  durationMs?: number
  tokenUsage?: { input: number; output: number }
}

// ── Settings ──

export interface SettingsData {
  email?: {
    address: string
    senderName: string
    verified: boolean
    configuredAt: string
  }
  approval?: {
    mode: 'auto' | 'manual'
    autoThreshold: number
  }
  [key: string]: unknown
}

// ── Config ──

export interface ConfigData {
  configured: Record<string, boolean>
  mode: 'off' | 'core' | 'full'
  defaultProvider: string
  features: Record<string, boolean>
}

// ── Skills ──

export interface SkillInfo {
  id: string
  name: string
  filename: string
  description: string
  content: string
  updatedAt: string
}
