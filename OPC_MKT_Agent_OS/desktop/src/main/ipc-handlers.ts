/**
 * IPC Handlers — Main 进程注册所有 ipcMain.handle() 处理器
 *
 * 将原 web/src/app/api/ 的 Next.js API Routes 逻辑迁移为 IPC handlers。
 * 每个 handler 对应一个 IPC channel，返回统一的 IpcResponse 格式。
 */

import { ipcMain, BrowserWindow } from 'electron'
import { IPC } from '../shared/ipc-channels'
import {
  readCollection,
  writeCollection,
  generateId,
  nowISO,
} from './store'
import { getAppSettings, setAppSettings, getSettingValue, setSettingValue } from './app-store'
import { getApiKeyStatus, setApiKey, deleteApiKey, clearAllApiKeys } from './safe-storage'
import {
  executeAgent,
  abortAgent,
  isAgentRunning,
  getAgentStatuses,
  getAgentSessionId,
  clearAgentSession,
  type AgentExecuteRequest,
} from './agent-engine'
import { toggleDockPet, getMainWindow, getDockPetWindow, getChatPopoverWindow } from './index'
import { getDockGeometry } from './dock-geometry'
import type {
  IpcResponse,
  TaskFilter,
  ContentFilter,
  ApprovalFilter,
  ContextFilter,
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

export function registerIpcHandlers(mainWindow?: BrowserWindow): void {
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
    const updated: Content = { ...items[index], ...data, id: items[index].id, updated_at: nowISO() }
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
    let items = readCollection<ContextAsset>('context-assets')
    if (filter?.type) items = items.filter((c) => c.type === filter.type)
    return { success: true, data: items }
  })

  handle(IPC.CONTEXT_GET, (id: string): IpcResponse<ContextAsset | null> => {
    const items = readCollection<ContextAsset>('context-assets')
    const item = items.find((c) => c.id === id) ?? null
    return { success: true, data: item }
  })

  handle(IPC.CONTEXT_CREATE, (data: Omit<ContextAsset, 'id' | 'created_at' | 'updated_at'>): IpcResponse<ContextAsset> => {
    if (!data.type || !data.title || !data.content) {
      return { success: false, error: 'Missing required fields: type, title, content' }
    }
    const items = readCollection<ContextAsset>('context-assets')
    const now = nowISO()
    const newItem: ContextAsset = {
      ...data,
      workspace_id: data.workspace_id || 'ws-001',
      id: generateId('ctx'),
      created_at: now,
      updated_at: now,
    }
    items.push(newItem)
    writeCollection('context-assets', items)
    return { success: true, data: newItem }
  })

  handle(IPC.CONTEXT_UPDATE, (id: string, data: Partial<ContextAsset>): IpcResponse<ContextAsset> => {
    const items = readCollection<ContextAsset>('context-assets')
    const index = items.findIndex((c) => c.id === id)
    if (index === -1) return { success: false, error: `Context asset not found: ${id}` }
    const updated: ContextAsset = { ...items[index], ...data, id: items[index].id, updated_at: nowISO() }
    items[index] = updated
    writeCollection('context-assets', items)
    return { success: true, data: updated }
  })

  handle(IPC.CONTEXT_DELETE, (id: string): IpcResponse => {
    const items = readCollection<ContextAsset>('context-assets')
    const filtered = items.filter((c) => c.id !== id)
    if (filtered.length === items.length) return { success: false, error: `Context asset not found: ${id}` }
    writeCollection('context-assets', filtered)
    return { success: true }
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
      // Auto-save result as task + content + agentRun
      const saveData = {
        mode: data.mode || 'direct',
        agentId: data.agentId,
        prompt: data.message,
        result: result.result,
      }
      const now = nowISO()
      const title = extractTitle(result.result) || data.message.slice(0, 80)

      const tasks = readCollection<Task>('tasks')
      const task: Task = {
        id: generateId('task'),
        campaign_id: 'default',
        title,
        description: data.message,
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

      const contents = readCollection<Content>('contents')
      const platform = data.agentId === 'xhs-agent' ? 'xiaohongshu' : 'general'
      const content: Content = {
        id: generateId('cnt'),
        task_id: task.id,
        campaign_id: 'default',
        title,
        body: result.result,
        platform,
        status: 'review',
        media_urls: [],
        metadata: { mode: saveData.mode, agentId: data.agentId, prompt: data.message },
        created_by: `agent:${data.agentId}`,
        created_at: now,
        updated_at: now,
        agent_run_id: null,
        agent_type: data.agentId,
        learning_id: null,
      }
      contents.push(content)
      writeCollection('contents', contents)

      const runs = readCollection<AgentRun>('agent-runs')
      const agentRun: AgentRun = {
        id: generateId('run'),
        task_id: task.id,
        agent_type: data.agentId,
        provider: 'anthropic',
        model: data.model || 'claude-sonnet',
        prompt_tokens: 0,
        completion_tokens: 0,
        status: 'success',
        input: { prompt: data.message },
        output: { result: result.result.slice(0, 2000) },
        error: null,
        started_at: now,
        finished_at: now,
        hypothesis: null,
        experiment_result: null,
        learnings: null,
      }
      runs.push(agentRun)
      writeCollection('agent-runs', runs)

      return {
        success: true,
        data: {
          result: result.result,
          sessionId: result.sessionId,
          cost: result.cost,
          taskId: task.id,
          contentId: content.id,
          agentRunId: agentRun.id,
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

  // ── Onboarding ──

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
