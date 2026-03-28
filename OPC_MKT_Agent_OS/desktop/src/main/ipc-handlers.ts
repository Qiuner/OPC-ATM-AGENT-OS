/**
 * IPC Handlers — Main 进程注册所有 ipcMain.handle() 处理器
 *
 * 将原 web/src/app/api/ 的 Next.js API Routes 逻辑迁移为 IPC handlers。
 * 每个 handler 对应一个 IPC channel，返回统一的 IpcResponse 格式。
 */

import { ipcMain, BrowserWindow } from 'electron'
import { join } from 'node:path'
import { IPC } from '../shared/ipc-channels'
import {
  DEFAULT_EXPERT_ROLE_ID,
  normalizeContextOwnership,
} from '../shared/context-ownership'
import { classifyContextContent } from './context-auto-classifier'
import {
  readCollection,
  writeCollection,
  generateId,
  nowISO,
} from './store'
import { getAppSettings, setAppSettings, getSettingValue, setSettingValue } from './app-store'
import { getApiKeyStatus, setApiKey, deleteApiKey, clearAllApiKeys } from './safe-storage'
import { VALID_INVITE_CODES, BUILTIN_API_KEY, BUILTIN_PROVIDER } from './invite-config'
import {
  executeAgent,
  abortAgent,
  isAgentRunning,
  getAgentStatuses,
  getAgentSessionId,
  clearAgentSession,
  type AgentExecuteRequest,
} from './agent-engine'
import { playSoundEffect, speak, playDirectSound, speakDirect, type SoundEvent } from './sound-notify'
import {
  executeOrchestrator,
  abortOrchestrator,
  getOrchestratorState,
  getSubAgentStatuses,
  broadcastToAll,
  type OrchestratorEvent,
} from './orchestrator-engine'
import { toggleDockPet, getMainWindow, getDockPetWindow, getChatPopoverWindow } from './index'
import { getDockGeometry } from './dock-geometry'
import type {
  IpcResponse,
  TaskFilter,
  ContentFilter,
  ApprovalFilter,
  ContextFilter,
  ContextAutoClassifyRequest,
  ContextAutoClassifyResponse,
  MetricFilter,
  SettingsData,
  ConfigData,
} from '../shared/ipc-types'
import type {
  Task,
  Content,
  ContextAsset,
  AgentRun,
  MetricRecord,
  Campaign,
} from './types'

// Re-export ApprovalRecord locally
interface ApprovalRecord {
  id: string
  content_id: string
  decision: 'approved' | 'rejected' | 'revision'
  comment: string
  reviewer: string
  created_at: string
}

function normalizeContextAsset(asset: ContextAsset): ContextAsset {
  const normalized = normalizeContextOwnership({
    ...asset,
    workspace_id: asset.workspace_id || 'ws-001',
    metadata: asset.metadata ?? {},
  })

  return {
    ...normalized,
    metadata: normalized.metadata ?? {},
  }
}

function readNormalizedContextAssets(): ContextAsset[] {
  const items = readCollection<ContextAsset>('context-assets')
  const normalizedItems = items.map(normalizeContextAsset)
  const raw = JSON.stringify(items)
  const normalized = JSON.stringify(normalizedItems)
  if (raw !== normalized) {
    writeCollection('context-assets', normalizedItems)
  }
  return normalizedItems
}

function writeNormalizedContextAssets(items: ContextAsset[]): void {
  writeCollection('context-assets', items.map(normalizeContextAsset))
}

/** 包装 handler，统一错误处理 */
function handle<TArgs extends unknown[], TResult>(
  channel: string,
  fn: (...args: TArgs) => TResult | Promise<TResult>
): void {
  ipcMain.handle(channel, async (_event, ...args: unknown[]) => {
    try {
      const result = await fn(...(args as TArgs))
      return result
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      return { success: false, error: message } satisfies IpcResponse
    }
  })
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// In-memory config (mirrors web/src/app/api/config)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
let serverConfig: {
  keys: Record<string, string>
  mode: string
  defaultProvider: string
  features: Record<string, boolean>
} | null = null

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Register all IPC handlers
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export function registerIpcHandlers(_mainWindow?: BrowserWindow): void {
  // ── Tasks ──

  handle(IPC.TASKS_LIST, (filter?: TaskFilter): IpcResponse<Task[]> => {
    let items = readCollection<Task>('tasks')
    if (filter?.status) items = items.filter((t) => t.status === filter.status)
    if (filter?.campaign_id) items = items.filter((t) => t.campaign_id === filter.campaign_id)
    return { success: true, data: items }
  })

  handle(IPC.TASKS_GET, (id: string): IpcResponse<Task | null> => {
    const items = readCollection<Task>('tasks')
    const item = items.find((t) => t.id === id) ?? null
    return { success: true, data: item }
  })

  handle(IPC.TASKS_CREATE, (data: Omit<Task, 'id' | 'created_at' | 'updated_at'>): IpcResponse<Task> => {
    if (!data.campaign_id || !data.title) {
      return { success: false, error: 'Missing required fields: campaign_id, title' }
    }
    const items = readCollection<Task>('tasks')
    const now = nowISO()
    const newItem: Task = {
      ...data,
      id: generateId('task'),
      created_at: now,
      updated_at: now,
    }
    items.push(newItem)
    writeCollection('tasks', items)
    return { success: true, data: newItem }
  })

  handle(IPC.TASKS_UPDATE, (id: string, data: Partial<Task>): IpcResponse<Task> => {
    const items = readCollection<Task>('tasks')
    const index = items.findIndex((t) => t.id === id)
    if (index === -1) return { success: false, error: `Task not found: ${id}` }
    const updated: Task = { ...items[index], ...data, id: items[index].id, updated_at: nowISO() }
    items[index] = updated
    writeCollection('tasks', items)
    return { success: true, data: updated }
  })

  handle(IPC.TASKS_DELETE, (id: string): IpcResponse => {
    const items = readCollection<Task>('tasks')
    const filtered = items.filter((t) => t.id !== id)
    if (filtered.length === items.length) return { success: false, error: `Task not found: ${id}` }
    writeCollection('tasks', filtered)
    return { success: true }
  })

  // ── Contents ──

  handle(IPC.CONTENTS_LIST, (filter?: ContentFilter): IpcResponse<Content[]> => {
    let items = readCollection<Content>('contents')
    if (filter?.status) items = items.filter((c) => c.status === filter.status)
    if (filter?.campaign_id) items = items.filter((c) => c.campaign_id === filter.campaign_id)
    return { success: true, data: items }
  })

  handle(IPC.CONTENTS_GET, (id: string): IpcResponse<Content | null> => {
    const items = readCollection<Content>('contents')
    const item = items.find((c) => c.id === id) ?? null
    return { success: true, data: item }
  })

  handle(IPC.CONTENTS_CREATE, (data: Omit<Content, 'id' | 'created_at' | 'updated_at'>): IpcResponse<Content> => {
    if (!data.task_id || !data.campaign_id || !data.title) {
      return { success: false, error: 'Missing required fields: task_id, campaign_id, title' }
    }
    const items = readCollection<Content>('contents')
    const now = nowISO()
    const newItem: Content = {
      ...data,
      id: generateId('cnt'),
      created_at: now,
      updated_at: now,
    }
    items.push(newItem)
    writeCollection('contents', items)
    return { success: true, data: newItem }
  })

  handle(IPC.CONTENTS_UPDATE, (id: string, data: Partial<Content>): IpcResponse<Content> => {
    const items = readCollection<Content>('contents')
    const index = items.findIndex((c) => c.id === id)
    if (index === -1) return { success: false, error: `Content not found: ${id}` }
    const existing = items[index]
    // Deep merge metadata to avoid overwriting existing metadata fields
    const updated: Content = {
      ...existing,
      ...data,
      metadata: data.metadata
        ? { ...(existing.metadata || {}), ...(data.metadata as Record<string, unknown>) }
        : existing.metadata,
      id: existing.id,
      updated_at: nowISO(),
    }
    items[index] = updated
    writeCollection('contents', items)
    return { success: true, data: updated }
  })

  handle(IPC.CONTENTS_DELETE, (id: string): IpcResponse => {
    const items = readCollection<Content>('contents')
    const filtered = items.filter((c) => c.id !== id)
    if (filtered.length === items.length) return { success: false, error: `Content not found: ${id}` }
    writeCollection('contents', filtered)
    return { success: true }
  })

  // ── Approvals ──

  handle(IPC.APPROVALS_LIST, (filter?: ApprovalFilter): IpcResponse<ApprovalRecord[]> => {
    let items = readCollection<ApprovalRecord>('approvals')
    if (filter?.content_id) items = items.filter((a) => a.content_id === filter.content_id)
    return { success: true, data: items }
  })

  handle(IPC.APPROVALS_CREATE, (data: { content_id: string; decision: string; comment?: string; reviewer?: string }): IpcResponse<ApprovalRecord> => {
    if (!data.content_id || !data.decision) {
      return { success: false, error: 'Missing required fields: content_id, decision' }
    }
    if (!['approved', 'rejected', 'revision'].includes(data.decision)) {
      return { success: false, error: 'Invalid decision. Must be: approved, rejected, or revision' }
    }
    const items = readCollection<ApprovalRecord>('approvals')
    const newItem: ApprovalRecord = {
      id: generateId('apr'),
      content_id: data.content_id,
      decision: data.decision as ApprovalRecord['decision'],
      comment: data.comment ?? '',
      reviewer: data.reviewer ?? 'user-001',
      created_at: nowISO(),
    }
    items.push(newItem)
    writeCollection('approvals', items)
    return { success: true, data: newItem }
  })

  // ── Context Assets ──

  handle(IPC.CONTEXT_LIST, (filter?: ContextFilter): IpcResponse<ContextAsset[]> => {
    let items = readNormalizedContextAssets()
    if (filter?.type) items = items.filter((c) => c.type === filter.type)
    if (filter?.expert_role_id) items = items.filter((c) => c.expert_role_id === filter.expert_role_id)
    if (filter?.scope) items = items.filter((c) => c.scope === filter.scope)
    if (filter?.ownership_key) items = items.filter((c) => c.ownership_key === filter.ownership_key)
    return { success: true, data: items }
  })

  handle(IPC.CONTEXT_GET, (id: string): IpcResponse<ContextAsset | null> => {
    const items = readNormalizedContextAssets()
    const item = items.find((c) => c.id === id) ?? null
    return { success: true, data: item }
  })

  handle(IPC.CONTEXT_CREATE, (data: Omit<ContextAsset, 'id' | 'created_at' | 'updated_at'>): IpcResponse<ContextAsset> => {
    if (!data.type || !data.title || !data.content) {
      return { success: false, error: 'Missing required fields: type, title, content' }
    }
    const items = readNormalizedContextAssets()
    const now = nowISO()
    const normalizedDraft = normalizeContextOwnership({
      ...data,
      workspace_id: data.workspace_id || 'ws-001',
      metadata: data.metadata ?? {},
      expert_role_id: data.expert_role_id || DEFAULT_EXPERT_ROLE_ID,
    })
    const newItem: ContextAsset = {
      ...normalizedDraft,
      id: generateId('ctx'),
      created_at: now,
      updated_at: now,
    }
    items.push(newItem)
    writeNormalizedContextAssets(items)
    return { success: true, data: newItem }
  })

  handle(IPC.CONTEXT_UPDATE, (id: string, data: Partial<ContextAsset>): IpcResponse<ContextAsset> => {
    const items = readNormalizedContextAssets()
    const index = items.findIndex((c) => c.id === id)
    if (index === -1) return { success: false, error: `Context asset not found: ${id}` }
    const existing = items[index]
    const updated: ContextAsset = normalizeContextAsset({
      ...existing,
      ...data,
      metadata: data.metadata
        ? { ...(existing.metadata || {}), ...(data.metadata as Record<string, unknown>) }
        : existing.metadata,
      id: existing.id,
      updated_at: nowISO(),
    })
    items[index] = updated
    writeNormalizedContextAssets(items)
    return { success: true, data: updated }
  })

  handle(IPC.CONTEXT_DELETE, (id: string): IpcResponse => {
    const items = readNormalizedContextAssets()
    const filtered = items.filter((c) => c.id !== id)
    if (filtered.length === items.length) return { success: false, error: `Context asset not found: ${id}` }
    writeNormalizedContextAssets(filtered)
    return { success: true }
  })

  handle(IPC.CONTEXT_CLASSIFY, async (data: ContextAutoClassifyRequest): Promise<IpcResponse<ContextAutoClassifyResponse>> => {
    const content = data.content?.trim()
    if (!content) {
      return { success: false, error: 'Missing required field: content' }
    }

    const result = await classifyContextContent(content)
    return { success: true, data: result }
  })

  // ── Metrics ──

  handle(IPC.METRICS_LIST, (filter?: MetricFilter): IpcResponse<MetricRecord[]> => {
    let items = readCollection<MetricRecord>('metrics')
    if (filter?.content_id) items = items.filter((m) => m.content_id === filter.content_id)
    return { success: true, data: items }
  })

  handle(IPC.METRICS_CREATE, (data: Omit<MetricRecord, 'id' | 'created_at'>): IpcResponse<MetricRecord> => {
    if (!data.content_id || !data.content_title) {
      return { success: false, error: 'Missing required fields: content_id, content_title' }
    }
    const items = readCollection<MetricRecord>('metrics')
    const newItem: MetricRecord = {
      ...data,
      id: generateId('met'),
      created_at: nowISO(),
    }
    items.push(newItem)
    writeCollection('metrics', items)
    return { success: true, data: newItem }
  })

  // ── Campaigns ──

  handle(IPC.CAMPAIGNS_LIST, (): IpcResponse<Campaign[]> => {
    const items = readCollection<Campaign>('campaigns')
    return { success: true, data: items }
  })

  // ── Agent Runs ──

  handle(IPC.AGENT_RUNS_LIST, (): IpcResponse<AgentRun[]> => {
    const items = readCollection<AgentRun>('agent-runs')
    return { success: true, data: items }
  })

  // ── Settings (electron-store backed) ──

  handle(IPC.SETTINGS_GET, (): IpcResponse<SettingsData> => {
    const appSettings = getAppSettings()
    const settings: SettingsData = {
      approval: appSettings.approval,
      email: appSettings.email,
    }
    return { success: true, data: settings }
  })

  handle(IPC.SETTINGS_UPDATE, (partial: Partial<SettingsData>): IpcResponse<SettingsData> => {
    // Map SettingsData fields to AppSettings fields
    if (partial.approval) {
      setAppSettings({ approval: partial.approval })
    }
    if (partial.email) {
      setAppSettings({ email: partial.email })
    }
    const appSettings = getAppSettings()
    const settings: SettingsData = {
      approval: appSettings.approval,
      email: appSettings.email,
    }
    return { success: true, data: settings }
  })

  // ── Config (in-memory) ──

  handle(IPC.CONFIG_GET, (): IpcResponse<ConfigData> => {
    if (!serverConfig) {
      return {
        success: true,
        data: { configured: {}, mode: 'off', defaultProvider: 'claude', features: {} },
      }
    }
    const configured: Record<string, boolean> = {}
    for (const [key, value] of Object.entries(serverConfig.keys)) {
      configured[key] = !!value
    }
    return {
      success: true,
      data: {
        configured,
        mode: serverConfig.mode as ConfigData['mode'],
        defaultProvider: serverConfig.defaultProvider,
        features: serverConfig.features,
      },
    }
  })

  handle(IPC.CONFIG_SET, (data: { keys: Record<string, string>; mode: string; defaultProvider: string; features: Record<string, boolean> }): IpcResponse => {
    serverConfig = {
      keys: data.keys ?? {},
      mode: data.mode ?? 'off',
      defaultProvider: data.defaultProvider ?? 'claude',
      features: data.features ?? {},
    }
    return { success: true }
  })

  // ── Agent Save Result ──
  // Simplified version — full agent execution (SSE stream) will be in a separate module

  handle(IPC.AGENT_SAVE_RESULT, (data: {
    mode: string; agentId: string; prompt: string; result: string;
    platform?: string; title?: string; campaignId?: string;
    durationMs?: number; tokenUsage?: { input: number; output: number }
  }): IpcResponse<{ taskId: string; contentId: string; agentRunId: string }> => {
    if (!data.prompt || !data.result) {
      return { success: false, error: 'prompt and result are required' }
    }
    const now = nowISO()

    // Create Task
    const tasks = readCollection<Task>('tasks')
    const title = data.title || extractTitle(data.result) || data.prompt.slice(0, 80)
    const task: Task = {
      id: generateId('task'),
      campaign_id: data.campaignId || 'default',
      title,
      description: data.prompt,
      status: 'review',
      assignee_type: 'agent',
      assignee_id: data.agentId,
      priority: 1,
      due_date: null,
      created_at: now,
      updated_at: now,
    }
    tasks.push(task)
    writeCollection('tasks', tasks)

    // Create Content
    const contents = readCollection<Content>('contents')
    const content: Content = {
      id: generateId('cnt'),
      task_id: task.id,
      campaign_id: data.campaignId || 'default',
      title,
      body: data.result,
      platform: data.platform || 'xiaohongshu',
      status: 'review',
      media_urls: [],
      metadata: { mode: data.mode, agentId: data.agentId, prompt: data.prompt },
      created_by: `agent:${data.agentId}`,
      created_at: now,
      updated_at: now,
      agent_run_id: null,
      agent_type: data.agentId,
      learning_id: null,
    }
    contents.push(content)
    writeCollection('contents', contents)

    // Create AgentRun
    const runs = readCollection<AgentRun>('agent-runs')
    const agentRun: AgentRun = {
      id: generateId('run'),
      task_id: task.id,
      agent_type: data.agentId,
      provider: 'anthropic',
      model: data.mode === 'team' ? 'claude-code-team' : 'claude-sonnet',
      prompt_tokens: data.tokenUsage?.input ?? 0,
      completion_tokens: data.tokenUsage?.output ?? 0,
      status: 'success',
      input: { prompt: data.prompt },
      output: { result: data.result.slice(0, 2000) },
      error: null,
      started_at: now,
      finished_at: now,
      hypothesis: null,
      experiment_result: null,
      learnings: null,
    }
    runs.push(agentRun)
    writeCollection('agent-runs', runs)

    return { success: true, data: { taskId: task.id, contentId: content.id, agentRunId: agentRun.id } }
  })

  // ── Submit content to Approval Center ──

  handle(IPC.AGENT_SUBMIT_TO_REVIEW, (data: {
    agentId: string; prompt: string; result: string;
    title?: string; platform?: string; campaignId?: string;
    tags?: string[]; mediaUrls?: string[];
  }): IpcResponse<{ taskId: string; contentId: string }> => {
    if (!data.result) {
      return { success: false, error: 'result is required' }
    }
    const now = nowISO()
    const title = data.title || extractTitle(data.result) || data.prompt?.slice(0, 80) || 'Untitled'

    const tasks = readCollection<Task>('tasks')
    const task: Task = {
      id: generateId('task'),
      campaign_id: data.campaignId || 'default',
      title,
      description: data.prompt || '',
      status: 'review',
      assignee_type: 'agent',
      assignee_id: data.agentId || 'unknown',
      priority: 1,
      due_date: null,
      created_at: now,
      updated_at: now,
    }
    tasks.push(task)
    writeCollection('tasks', tasks)

    const contents = readCollection<Content>('contents')
    const platform = data.platform || (data.agentId === 'xhs-agent' ? 'xiaohongshu' : 'general')
    const content: Content = {
      id: generateId('cnt'),
      task_id: task.id,
      campaign_id: data.campaignId || 'default',
      title,
      body: data.result,
      platform,
      status: 'review',
      media_urls: data.mediaUrls || [],
      metadata: {
        agentId: data.agentId,
        prompt: data.prompt,
        tags: data.tags || [],
      },
      created_by: `agent:${data.agentId}`,
      created_at: now,
      updated_at: now,
      agent_run_id: null,
      agent_type: data.agentId,
      learning_id: null,
    }
    contents.push(content)
    writeCollection('contents', contents)

    console.log('[IPC] SUBMIT_TO_REVIEW: created task=%s content=%s', task.id, content.id)
    return { success: true, data: { taskId: task.id, contentId: content.id } }
  })

  // ── Publish content via script (直接调用 Playwright，不经过 Claude CLI) ──
  // 使用 spawn 流式读取进度，推送到 renderer

  handle(IPC.AGENT_PUBLISH, async (data: {
    contentId: string; title: string; body: string;
    tags?: string[]; images?: string[]; platform: string;
  }): Promise<IpcResponse> => {
    if (data.platform !== 'xiaohongshu') {
      return { success: false, error: `Publishing not supported for platform: ${data.platform}` }
    }

    // 1. 检查小红书登录状态（先读 store，fallback 检查 cookie 文件）
    let xhsLoggedIn = getAppSettings().platformAuth?.xhs?.loggedIn ?? false
    if (!xhsLoggedIn) {
      try {
        const { statSync } = require('node:fs') as typeof import('node:fs')
        const { homedir } = require('node:os') as typeof import('node:os')
        const cookiePath = join(homedir(), '.xhs-mcp', 'storage-state.json')
        const info = statSync(cookiePath)
        if (info.size > 100) {
          console.log('[IPC] AGENT_PUBLISH: store says not logged in, but cookie file exists (%d bytes) — proceeding', info.size)
          xhsLoggedIn = true
          setAppSettings({ platformAuth: { ...getAppSettings().platformAuth, xhs: { loggedIn: true, lastLoginAt: info.mtime.toISOString() } } })
        }
      } catch { /* cookie file doesn't exist */ }
    }
    if (!xhsLoggedIn) {
      console.log('[IPC] AGENT_PUBLISH: xhs not logged in (no cookie file)')
      return { success: false, error: 'XHS_NOT_LOGGED_IN' }
    }

    // 2. 构建脚本参数
    const scriptArgs = JSON.stringify({
      title: data.title,
      content: data.body,
      tags: data.tags || [],
      images: data.images || [],
    })

    const engineDir = join(__dirname, '../../..', 'engine')
    const scriptPath = join(engineDir, 'scripts', 'xhs-publish.ts')
    console.log('[IPC] AGENT_PUBLISH: spawning script, contentId=%s, title=%s', data.contentId, data.title?.slice(0, 40))

    // 发送进度到所有 renderer 窗口
    const sendProgress = (stage: string, message: string, detail?: string) => {
      for (const win of BrowserWindow.getAllWindows()) {
        if (!win.isDestroyed()) {
          win.webContents.send(IPC.AGENT_PUBLISH_PROGRESS, { contentId: data.contentId, stage, message, detail })
        }
      }
    }

    // 3. spawn 脚本（流式读取 stdout）
    const { spawn } = await import('node:child_process')

    return new Promise<IpcResponse>((resolve) => {
      const child = spawn('npx', ['tsx', scriptPath, scriptArgs], {
        cwd: engineDir,
        env: { ...process.env },
        stdio: ['ignore', 'pipe', 'pipe'],
      })

      let stdout = ''
      let stderr = ''
      let lastResult: { success?: boolean; noteUrl?: string; error?: string; message?: string } | null = null

      // 超时 3 分钟
      const timeout = setTimeout(() => {
        child.kill()
        sendProgress('error', '发布超时 (3分钟)')
        resolve({ success: false, error: '发布超时' })
      }, 180_000)

      child.stdout.on('data', (chunk: Buffer) => {
        const text = chunk.toString()
        stdout += text
        // 逐行解析 JSON 进度
        for (const line of text.split('\n')) {
          const trimmed = line.trim()
          if (!trimmed || !trimmed.startsWith('{')) continue
          try {
            const msg = JSON.parse(trimmed) as { type: string; stage?: string; message?: string; detail?: string; success?: boolean; noteUrl?: string; error?: string }
            if (msg.type === 'progress') {
              console.log('[IPC] AGENT_PUBLISH progress: [%s] %s', msg.stage, msg.message)
              sendProgress(msg.stage || 'unknown', msg.message || '', msg.detail)
            } else if (msg.type === 'result') {
              lastResult = msg
            }
          } catch { /* ignore non-JSON lines */ }
        }
      })

      child.stderr.on('data', (chunk: Buffer) => {
        stderr += chunk.toString()
      })

      child.on('close', (code) => {
        clearTimeout(timeout)
        if (stderr) {
          console.error('[IPC] AGENT_PUBLISH stderr:', stderr.slice(0, 500))
        }

        // 从 stdout 解析最终结果
        if (!lastResult) {
          // fallback: 从 stdout 找最后一个 JSON 行
          const lines = stdout.trim().split('\n')
          const jsonLine = lines.reverse().find(l => l.trim().startsWith('{'))
          try { lastResult = JSON.parse(jsonLine || '{}') } catch { /* */ }
        }

        if (lastResult?.success) {
          // 更新内容状态为 published
          const contents = readCollection<Content>('contents')
          const idx = contents.findIndex(c => c.id === data.contentId)
          if (idx !== -1) {
            contents[idx] = {
              ...contents[idx],
              status: 'published',
              updated_at: nowISO(),
              metadata: {
                ...contents[idx].metadata,
                pipelineStage: 'published',
                publishedAt: nowISO(),
                noteUrl: lastResult.noteUrl,
              },
            }
            writeCollection('contents', contents)
          }
          sendProgress('done', '发布成功!', lastResult.noteUrl)
          resolve({ success: true, data: { noteUrl: lastResult.noteUrl } })
          return
        }

        // 失败 — 如果是登录态问题，同步更新 store
        const errMsg = lastResult?.error || lastResult?.message || (code !== 0 ? `脚本退出码: ${code}` : '发布失败')
        if (errMsg === 'XHS_NOT_LOGGED_IN') {
          setAppSettings({
            platformAuth: { ...getAppSettings().platformAuth, xhs: { loggedIn: false } },
          })
        }
        sendProgress('error', errMsg)
        resolve({ success: false, error: errMsg })
      })

      child.on('error', (err) => {
        clearTimeout(timeout)
        const msg = err.message || 'spawn error'
        console.error('[IPC] AGENT_PUBLISH: spawn error:', msg)
        sendProgress('error', msg)
        resolve({ success: false, error: msg })
      })
    })
  })

  // ── Agent Execution (connected to agent-engine.ts) ──

  // Track currently running agent ID for status reporting
  let runningAgentId: string | undefined

  handle(IPC.AGENT_EXECUTE, async (data: {
    agentId: string; message: string; mode?: string;
    context?: Record<string, unknown>; model?: string;
    maxBudgetUsd?: number; timeoutMs?: number;
    sessionId?: string;
  }): Promise<IpcResponse> => {
    console.log('[IPC] AGENT_EXECUTE received:', { agentId: data.agentId, message: data.message?.slice(0, 80), sessionId: data.sessionId?.slice(0, 12) })
    if (!data.agentId || !data.message) {
      return { success: false, error: 'agentId and message are required' }
    }
    runningAgentId = data.agentId

    const request: AgentExecuteRequest = {
      agentId: data.agentId,
      message: data.message,
      mode: (data.mode as 'direct' | 'team') || 'direct',
      context: data.context,
      model: data.model as 'opus' | 'sonnet' | 'haiku' | undefined,
      maxBudgetUsd: data.maxBudgetUsd,
      timeoutMs: data.timeoutMs,
      sessionId: data.sessionId,
    }

    const result = await executeAgent(request)
    runningAgentId = undefined

    if (result.success && result.result) {
      // No auto-save — content only saved to Approval Center when user clicks "准备推送"
      return {
        success: true,
        data: {
          result: result.result,
          sessionId: result.sessionId,
          cost: result.cost,
          imageUrls: result.imageUrls || [],
        },
      }
    }

    return result
  })

  // ── Agent Abort ──

  handle(IPC.AGENT_ABORT, (): IpcResponse => {
    abortAgent()
    runningAgentId = undefined
    return { success: true }
  })

  // ── Agent Status (connected to agent-engine.ts) ──

  handle(IPC.AGENT_STATUS, (): IpcResponse => {
    const agents = getAgentStatuses(runningAgentId)
    return { success: true, data: { agents, isRunning: isAgentRunning() } }
  })

  // ── Agent Session (conversation continuity) ──

  handle(IPC.AGENT_SESSION_GET, (data: { agentId: string }): IpcResponse => {
    const sessionId = getAgentSessionId(data.agentId)
    return { success: true, data: { sessionId: sessionId || null } }
  })

  handle(IPC.AGENT_SESSION_CLEAR, (data: { agentId: string }): IpcResponse => {
    clearAgentSession(data.agentId)
    return { success: true }
  })

  // ── Secure Storage (API Keys via Keychain) ──

  handle(IPC.KEYS_GET_STATUS, (): IpcResponse<Record<string, boolean>> => {
    const status = getApiKeyStatus()
    return { success: true, data: status }
  })

  handle(IPC.KEYS_SET, (data: { provider: string; key: string }): IpcResponse => {
    if (!data.provider) {
      return { success: false, error: 'provider is required' }
    }
    setApiKey(data.provider, data.key)
    return { success: true }
  })

  handle(IPC.KEYS_DELETE, (provider: string): IpcResponse => {
    if (!provider) {
      return { success: false, error: 'provider is required' }
    }
    deleteApiKey(provider)
    return { success: true }
  })

  handle(IPC.KEYS_CLEAR, (): IpcResponse => {
    clearAllApiKeys()
    return { success: true }
  })

  // ── Platform Auth (cookie-based logins) ──

  handle(IPC.PLATFORM_AUTH_STATUS, (): IpcResponse => {
    const settings = getAppSettings()
    let xhsAuth = settings.platformAuth?.xhs ?? { loggedIn: false }

    // 如果 app-store 没有记录，但 cookie 文件存在，则视为已登录（兼容旧数据）
    if (!xhsAuth.loggedIn) {
      try {
        const { statSync } = require('node:fs') as typeof import('node:fs')
        const { homedir } = require('node:os') as typeof import('node:os')
        const cookiePath = join(homedir(), '.xhs-mcp', 'storage-state.json')
        const info = statSync(cookiePath)
        if (info.size > 100) {
          xhsAuth = { loggedIn: true, lastLoginAt: info.mtime.toISOString() }
          setAppSettings({
            platformAuth: { ...settings.platformAuth, xhs: xhsAuth },
          })
        }
      } catch {
        // cookie 文件不存在，保持 loggedIn: false
      }
    }

    return {
      success: true,
      data: { xhs: xhsAuth },
    }
  })

  handle(IPC.PLATFORM_AUTH_LOGIN, async (data: { platform: string }): Promise<IpcResponse> => {
    if (data.platform !== 'xhs') {
      return { success: false, error: `Login not supported for platform: ${data.platform}` }
    }

    // 直接调用登录脚本（不再走 Claude CLI agent）
    const engineDir = join(__dirname, '../../..', 'engine')
    const scriptPath = join(engineDir, 'scripts', 'xhs-login.ts')
    console.log('[IPC] PLATFORM_AUTH_LOGIN: spawning login script:', scriptPath)

    const { spawn } = await import('node:child_process')

    return new Promise<IpcResponse>((resolve) => {
      const child = spawn('npx', ['tsx', scriptPath], {
        cwd: engineDir,
        env: { ...process.env },
        stdio: ['ignore', 'pipe', 'pipe'],
      })

      let stdout = ''
      let lastResult: { status?: string; message?: string } | null = null

      // 登录超时 150 秒
      const timeout = setTimeout(() => {
        child.kill()
        resolve({ success: false, error: '登录超时 (150s)' })
      }, 150_000)

      child.stdout.on('data', (chunk: Buffer) => {
        const text = chunk.toString()
        stdout += text
        for (const line of text.split('\n')) {
          const trimmed = line.trim()
          if (!trimmed || !trimmed.startsWith('{')) continue
          try {
            const msg = JSON.parse(trimmed) as { type: string; status?: string; message?: string }
            if (msg.type === 'result') {
              lastResult = msg
            }
            console.log('[IPC] LOGIN progress:', trimmed)
          } catch { /* ignore */ }
        }
      })

      child.stderr.on('data', (chunk: Buffer) => {
        console.error('[IPC] LOGIN stderr:', chunk.toString().slice(0, 300))
      })

      child.on('close', (code) => {
        clearTimeout(timeout)

        if (!lastResult) {
          const lines = stdout.trim().split('\n')
          const jsonLine = lines.reverse().find(l => l.trim().startsWith('{'))
          try { lastResult = JSON.parse(jsonLine || '{}') } catch { /* */ }
        }

        if (lastResult?.status === 'success') {
          setAppSettings({
            platformAuth: {
              ...getAppSettings().platformAuth,
              xhs: {
                loggedIn: true,
                lastLoginAt: new Date().toISOString(),
              },
            },
          })
          resolve({ success: true, data: { status: 'success' } })
        } else {
          resolve({ success: false, error: lastResult?.message || `登录失败 (code: ${code})` })
        }
      })

      child.on('error', (err) => {
        clearTimeout(timeout)
        console.error('[IPC] LOGIN spawn error:', err.message)
        resolve({ success: false, error: err.message })
      })
    })
  })

  handle(IPC.PLATFORM_AUTH_LOGOUT, (data: { platform: string }): IpcResponse => {
    if (data.platform !== 'xhs') {
      return { success: false, error: `Logout not supported for platform: ${data.platform}` }
    }

    setAppSettings({
      platformAuth: {
        ...getAppSettings().platformAuth,
        xhs: { loggedIn: false },
      },
    })

    // 清理 cookie 文件
    try {
      const fs = require('node:fs')
      const path = require('node:path')
      const os = require('node:os')
      const cookiePath = path.join(os.homedir(), '.xhs-mcp', 'storage-state.json')
      fs.unlinkSync(cookiePath)
    } catch {
      // 忽略清理失败
    }

    return { success: true }
  })

  // ── Theme ──

  handle(IPC.THEME_GET, (): IpcResponse<{ theme: string }> => {
    const settings = getAppSettings()
    return { success: true, data: { theme: settings.theme } }
  })

  handle(IPC.THEME_SET, (data: { theme: 'dark' | 'light' | 'system' }): IpcResponse => {
    setAppSettings({ theme: data.theme })

    // Resolve effective theme for nativeTheme and backgroundColor
    const { nativeTheme } = require('electron') as typeof import('electron')
    if (data.theme === 'system') {
      nativeTheme.themeSource = 'system'
    } else {
      nativeTheme.themeSource = data.theme
    }

    // Notify all renderers of resolved dark/light
    const isDark = data.theme === 'system' ? nativeTheme.shouldUseDarkColors : data.theme === 'dark'
    for (const win of BrowserWindow.getAllWindows()) {
      if (!win.isDestroyed()) {
        win.webContents.send(IPC.THEME_CHANGED, { theme: data.theme, isDark })
        // Only set background color on non-transparent windows
        if (!win.isAlwaysOnTop()) {
          win.setBackgroundColor(isDark ? '#030305' : '#fafafa')
        }
      }
    }

    return { success: true }
  })

  // ── File: Read Image ──

  handle(IPC.FILE_READ_IMAGE, async (data: { path: string }): Promise<IpcResponse<{ dataUrl: string } | null>> => {
    const { readFile } = await import('node:fs/promises')
    const { existsSync } = await import('node:fs')
    const { resolve, extname } = await import('node:path')

    // Resolve relative paths — try multiple base directories
    let filePath = data.path
    if (!filePath.startsWith('/')) {
      const { join: joinPath } = await import('node:path')
      // Try engine dir first (where agents run), then project root
      const candidates = [
        resolve(__dirname, '../../..', 'engine', filePath),
        resolve(__dirname, '../../../..', 'engine', filePath),
        resolve(process.cwd(), filePath),
        resolve(process.cwd(), 'engine', filePath),
      ]
      const found = candidates.find(c => existsSync(c))
      if (found) {
        filePath = found
      } else {
        console.warn('[FILE_READ_IMAGE] Not found, tried:', candidates)
        return { success: false, error: `File not found: ${data.path}` }
      }
    } else if (!existsSync(filePath)) {
      return { success: false, error: `File not found: ${filePath}` }
    }

    console.log('[FILE_READ_IMAGE] Loading:', filePath)

    const ext = extname(filePath).toLowerCase()
    const mimeMap: Record<string, string> = {
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
      '.svg': 'image/svg+xml',
    }
    const mime = mimeMap[ext] || 'image/png'

    const buffer = await readFile(filePath)
    const base64 = buffer.toString('base64')
    return { success: true, data: { dataUrl: `data:${mime};base64,${base64}` } }
  })

  // ── Sound Notify ──

  handle(IPC.SOUND_GET_SETTINGS, (): IpcResponse => {
    const settings = getSettingValue('soundNotify')
    return { success: true, data: settings }
  })

  handle(IPC.SOUND_UPDATE_SETTINGS, (data: Partial<{
    enabled: boolean
    mode: 'milestone' | 'full' | 'completion'
    volume: number
    voiceEnabled: boolean
    voiceName: string
  }>): IpcResponse => {
    const current = getSettingValue('soundNotify')
    const updated = { ...current, ...data }
    setSettingValue('soundNotify', updated)
    return { success: true, data: updated }
  })

  handle(IPC.SOUND_TOGGLE, (): IpcResponse<{ enabled: boolean }> => {
    const current = getSettingValue('soundNotify')
    const newEnabled = !current.enabled
    console.log('[IPC] SOUND_TOGGLE:', current.enabled, '->', newEnabled)
    setSettingValue('soundNotify', { ...current, enabled: newEnabled })
    // Play a confirmation sound when enabling
    if (newEnabled) {
      playDirectSound('notify')
    }
    return { success: true, data: { enabled: newEnabled } }
  })

  handle(IPC.SOUND_PLAY, (data: { event: string }): IpcResponse => {
    console.log('[IPC] SOUND_PLAY received:', data)
    playDirectSound(data.event as SoundEvent)
    return { success: true }
  })

  handle(IPC.SOUND_SPEAK, (data: { message: string }): IpcResponse => {
    console.log('[IPC] SOUND_SPEAK received:', data)
    speakDirect(data.message)
    return { success: true }
  })

  // ── Orchestrator (CEO Multi-Agent) ──

  handle(IPC.ORCHESTRATOR_EXECUTE, async (data: {
    prompt: string
    context?: Record<string, unknown>
  }): Promise<IpcResponse> => {
    if (!data.prompt) {
      return { success: false, error: 'prompt is required' }
    }

    // Execute orchestrator with event callbacks
    const result = await executeOrchestrator(
      {
        prompt: data.prompt,
        context: data.context,
        timeoutMs: 600_000, // 10 minutes
      },
      (event: OrchestratorEvent) => {
        // Broadcast events to all renderer windows
        // Sound notifications for orchestrator events
        switch (event.type) {
          case 'plan':
            broadcastToAll(IPC.ORCHESTRATOR_PLAN, { plan: event.plan, agentIds: event.agentIds })
            playSoundEffect('plan_ready', '编排计划已生成，开始分配任务')
            break
          case 'agents-selected': {
            // Sync selected agents to dock pet + header
            const ids = ['ceo', ...event.agentIds]
            setSettingValue('teamAgentIds', ids)
            const dockPet = getDockPetWindow()
            if (dockPet && !dockPet.isDestroyed()) {
              dockPet.webContents.send(IPC.TEAM_AGENTS_CHANGED, ids)
            }
            broadcastToAll(IPC.TEAM_AGENTS_CHANGED, ids)
            break
          }
          case 'sub-start': {
            broadcastToAll(IPC.ORCHESTRATOR_SUB_START, {
              agentId: event.agentId,
              name: event.name,
              task: event.task,
            })
            playSoundEffect('sub_agent_start', `${event.name} 开始执行任务`)
            // Sync sub-agent to dock pet + header on every sub-start
            const currentIds = (getSettingValue('teamAgentIds') as string[] | undefined) ?? ['ceo']
            if (!currentIds.includes(event.agentId)) {
              const updatedIds = [...currentIds, event.agentId]
              setSettingValue('teamAgentIds', updatedIds)
              const dockPet = getDockPetWindow()
              if (dockPet && !dockPet.isDestroyed()) {
                dockPet.webContents.send(IPC.TEAM_AGENTS_CHANGED, updatedIds)
              }
              broadcastToAll(IPC.TEAM_AGENTS_CHANGED, updatedIds)
            }
            break
          }
          case 'sub-stream':
            broadcastToAll(IPC.ORCHESTRATOR_SUB_STREAM, {
              agentId: event.agentId,
              text: event.text,
            })
            break
          case 'sub-done':
            broadcastToAll(IPC.ORCHESTRATOR_SUB_DONE, {
              agentId: event.agentId,
              result: event.result,
            })
            playSoundEffect('sub_agent_done', `${event.agentId} 任务完成`)
            break
          case 'sub-error':
            broadcastToAll(IPC.ORCHESTRATOR_SUB_ERROR, {
              agentId: event.agentId,
              error: event.error,
            })
            playSoundEffect('error', `${event.agentId} 执行出错`)
            break
          case 'progress':
            broadcastToAll(IPC.ORCHESTRATOR_PROGRESS, {
              done: event.done,
              total: event.total,
              running: event.running,
            })
            break
          case 'result':
            broadcastToAll(IPC.ORCHESTRATOR_RESULT, { result: event.result })
            playSoundEffect('agent_done', '全部任务已完成')
            break
          case 'error':
            broadcastToAll(IPC.ORCHESTRATOR_ERROR, { message: event.message })
            playSoundEffect('error', '执行出错，请检查')
            break
          case 'status':
            broadcastToAll(IPC.ORCHESTRATOR_STATUS_CHANGE, { status: event.status })
            break
        }
      }
    )

    return result
  })

  handle(IPC.ORCHESTRATOR_ABORT, (): IpcResponse => {
    abortOrchestrator()
    return { success: true }
  })

  handle(IPC.ORCHESTRATOR_STATUS, (): IpcResponse => {
    const state = getOrchestratorState()
    return {
      success: true,
      data: {
        isRunning: state.isRunning,
        ceoStatus: state.ceoStatus,
        subAgents: getSubAgentStatuses(),
        plan: state.plan,
        finalResult: state.finalResult,
        error: state.error,
      },
    }
  })

  // ── Onboarding ──

  handle(IPC.ONBOARDING_VALIDATE_INVITE, (data: { code: string }): IpcResponse => {
    if (!data.code || !VALID_INVITE_CODES.includes(data.code.trim().toUpperCase())) {
      return { success: false, error: '邀请码无效，请检查后重试' }
    }
    setApiKey(BUILTIN_PROVIDER, BUILTIN_API_KEY)
    setAppSettings({ defaultProvider: BUILTIN_PROVIDER })
    return { success: true }
  })

  handle(IPC.ONBOARDING_STATUS, (): IpcResponse<{ completed: boolean; hasApiKey: boolean }> => {
    const settings = getAppSettings()
    const keyStatus = getApiKeyStatus()
    const hasApiKey = Object.values(keyStatus).some(Boolean)
    return {
      success: true,
      data: { completed: settings.onboardingCompleted, hasApiKey },
    }
  })

  handle(IPC.ONBOARDING_COMPLETE, (data: {
    provider?: string
    apiKey?: string
    brand?: { name: string; industry: string; targetMarket: string; tone: string }
  }): IpcResponse => {
    // Save API key if provided
    if (data.provider && data.apiKey) {
      setApiKey(data.provider, data.apiKey)
      setAppSettings({ defaultProvider: data.provider })
    }
    // Save brand info
    if (data.brand) {
      setAppSettings({ brand: data.brand })
    }
    // Mark onboarding as completed
    setAppSettings({ onboardingCompleted: true })
    return { success: true }
  })

  // ── Team Agents ──

  handle(IPC.TEAM_GET_AGENTS, (): IpcResponse<string[]> => {
    const ids = getSettingValue('teamAgentIds') ?? ['ceo', 'xhs-agent', 'growth-agent', 'brand-reviewer']
    return { success: true, data: ids }
  })

  handle(IPC.TEAM_SET_AGENTS, (ids: string[]): IpcResponse<string[]> => {
    setSettingValue('teamAgentIds', ids)
    // Notify dock pet window about the change
    const dockPet = getDockPetWindow()
    if (dockPet && !dockPet.isDestroyed()) {
      dockPet.webContents.send(IPC.TEAM_AGENTS_CHANGED, ids)
    }
    return { success: true, data: ids }
  })

  // ── Chat Sync (relay messages between popover ↔ main window) ──

  handle(IPC.CHAT_SYNC_SEND, (msg: { agentId: string; role: string; content: string }): IpcResponse => {
    // Broadcast to ALL windows so both popover and Team Studio can receive
    const allWindows = BrowserWindow.getAllWindows()
    for (const win of allWindows) {
      if (!win.isDestroyed()) {
        win.webContents.send(IPC.CHAT_SYNC_BROADCAST, msg)
      }
    }
    return { success: true }
  })

  // ── Dock Pet Control ──

  handle(IPC.DOCK_PET_TOGGLE, (): IpcResponse<{ visible: boolean }> => {
    toggleDockPet()
    const win = getDockPetWindow()
    const visible = win ? win.isVisible() : false
    return { success: true, data: { visible } }
  })

  handle(IPC.DOCK_PET_OPEN_MAIN, (): IpcResponse => {
    const main = getMainWindow()
    if (main) {
      if (main.isMinimized()) main.restore()
      main.focus()
    }
    return { success: true }
  })

  handle(IPC.DOCK_PET_GEOMETRY, (): IpcResponse => {
    const geo = getDockGeometry()
    return { success: true, data: geo }
  })

  handle(IPC.DOCK_PET_SHOW_POPOVER, (data: { agentId: string; x: number; y: number }): IpcResponse => {
    const popover = getChatPopoverWindow()
    if (!popover || popover.isDestroyed()) return { success: false, error: 'No popover window' }
    const dockPet = getDockPetWindow()
    if (!dockPet || dockPet.isDestroyed()) return { success: false, error: 'No dock-pet window' }

    // Position popover above the character (convert renderer coords to screen coords)
    const petBounds = dockPet.getBounds()
    const screenX = petBounds.x + data.x - 210
    const screenY = petBounds.y - 360

    popover.setBounds({ x: Math.max(0, screenX), y: Math.max(0, screenY), width: 420, height: 350 })
    popover.webContents.send(IPC.DOCK_PET_POPOVER_AGENT, { agentId: data.agentId })
    popover.show()
    return { success: true }
  })

  handle(IPC.DOCK_PET_HIDE_POPOVER, (): IpcResponse => {
    const popover = getChatPopoverWindow()
    if (popover && !popover.isDestroyed()) popover.hide()
    return { success: true }
  })

  handle(IPC.DOCK_PET_MOUSE_FORWARD, (ignore: boolean): IpcResponse => {
    const win = getDockPetWindow()
    if (!win || win.isDestroyed()) return { success: false }
    if (ignore) {
      win.setIgnoreMouseEvents(true, { forward: true })
    } else {
      win.setIgnoreMouseEvents(false)
    }
    return { success: true }
  })

  // ── Onboarding ──

  handle(IPC.ONBOARDING_ENV_CHECK, async (): Promise<IpcResponse<{
    claude: { available: boolean; version?: string }
    node: { available: boolean; version?: string }
  }>> => {
    const { execFile } = await import('node:child_process')
    const { promisify } = await import('node:util')
    const exec = promisify(execFile)

    const checkCmd = async (cmd: string, args: string[]): Promise<{ available: boolean; version?: string }> => {
      try {
        const { stdout } = await exec(cmd, args, { timeout: 5000 })
        return { available: true, version: stdout.trim().split('\n')[0] }
      } catch {
        return { available: false }
      }
    }

    const [claude, node] = await Promise.all([
      checkCmd('claude', ['--version']),
      checkCmd('node', ['--version']),
    ])

    return { success: true, data: { claude, node } }
  })

  // ── Skills ──

  handle(IPC.SKILLS_LIST, async (): Promise<IpcResponse> => {
    const { readdir, readFile } = await import('node:fs/promises')
    const skillsDir = join(__dirname, '../../..', 'engine', 'skills')
    const files = await readdir(skillsDir)
    const skillFiles = files.filter((f) => f.endsWith('.SKILL.md'))

    const skills = await Promise.all(
      skillFiles.map(async (file) => {
        const content = await readFile(join(skillsDir, file), 'utf-8')
        const frontmatterMatch = content.replace(/\r\n/g, '\n').match(/^---\n([\s\S]*?)\n---/)
        const meta: Record<string, string> = {}
        if (frontmatterMatch) {
          for (const line of frontmatterMatch[1].split('\n')) {
            const [key, ...rest] = line.split(':')
            if (key && rest.length) meta[key.trim()] = rest.join(':').trim()
          }
        }
        return {
          id: file.replace('.SKILL.md', ''),
          name: meta['name'] || file.replace('.SKILL.md', ''),
          description: meta['description'] || '',
          version: meta['version'] || '1.0.0',
          source: 'built-in' as const,
          filePath: `engine/skills/${file}`,
          enabled: true,
          lastUpdated: meta['last_updated'] || '',
          updatedBy: meta['updated_by'] || '',
        }
      })
    )

    return { success: true, data: skills }
  })

  handle(IPC.SKILLS_OPEN_FOLDER, async (): Promise<IpcResponse> => {
    const { shell } = await import('electron')
    const skillsDir = join(__dirname, '../../..', 'engine', 'skills')
    await shell.openPath(skillsDir)
    return { success: true }
  })
}

function extractTitle(text: string): string | null {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean)
  for (const line of lines) {
    const clean = line.replace(/^#+\s*/, '').replace(/^\*+/, '').trim()
    if (clean.length > 5 && clean.length < 100) {
      return clean
    }
  }
  return null
}
