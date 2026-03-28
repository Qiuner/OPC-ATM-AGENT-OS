/**
 * IPC Client — Renderer 端的类型安全 API 封装
 *
 * 替代 web/ 中的 fetch('/api/xxx') 调用。
 * 通过 window.api 访问 preload 暴露的 IPC bridge。
 */

import type { Task, Content, ContextAsset, MetricRecord, AgentRun, Campaign } from '@/types'

// ── window.api 类型声明 ──

interface IpcResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
}

interface WindowApi {
  tasks: {
    list(filter?: Record<string, string>): Promise<IpcResponse<Task[]>>
    get(id: string): Promise<IpcResponse<Task | null>>
    create(data: Record<string, unknown>): Promise<IpcResponse<Task>>
    update(id: string, data: Record<string, unknown>): Promise<IpcResponse<Task>>
    delete(id: string): Promise<IpcResponse>
  }
  contents: {
    list(filter?: Record<string, string>): Promise<IpcResponse<Content[]>>
    get(id: string): Promise<IpcResponse<Content | null>>
    create(data: Record<string, unknown>): Promise<IpcResponse<Content>>
    update(id: string, data: Record<string, unknown>): Promise<IpcResponse<Content>>
    delete(id: string): Promise<IpcResponse>
  }
  approvals: {
    list(filter?: Record<string, string>): Promise<IpcResponse>
    create(data: Record<string, unknown>): Promise<IpcResponse>
  }
  context: {
    list(filter?: Record<string, string>): Promise<IpcResponse<ContextAsset[]>>
    get(id: string): Promise<IpcResponse<ContextAsset | null>>
    create(data: Record<string, unknown>): Promise<IpcResponse<ContextAsset>>
    update(id: string, data: Record<string, unknown>): Promise<IpcResponse<ContextAsset>>
    delete(id: string): Promise<IpcResponse>
  }
  metrics: {
    list(filter?: Record<string, string>): Promise<IpcResponse<MetricRecord[]>>
    create(data: Record<string, unknown>): Promise<IpcResponse<MetricRecord>>
  }
  campaigns: {
    list(): Promise<IpcResponse<Campaign[]>>
  }
  agentRuns: {
    list(): Promise<IpcResponse<AgentRun[]>>
  }
  settings: {
    get(): Promise<IpcResponse>
    update(data: Record<string, unknown>): Promise<IpcResponse>
  }
  config: {
    get(): Promise<IpcResponse>
    set(data: Record<string, unknown>): Promise<IpcResponse>
  }
  agent: {
    execute(data: Record<string, unknown>): Promise<IpcResponse>
    abort(): Promise<IpcResponse>
    status(): Promise<IpcResponse>
    saveResult(data: Record<string, unknown>): Promise<IpcResponse>
    getSession(agentId: string): Promise<IpcResponse>
    clearSession(agentId: string): Promise<IpcResponse>
    onStreamChunk(callback: (event: unknown) => void): () => void
    onStreamEnd(callback: () => void): () => void
    onStreamError(callback: (error: unknown) => void): () => void
    onEvent(callback: (event: unknown) => void): () => void
  }
  keys: {
    getStatus(): Promise<IpcResponse<Record<string, boolean>>>
    set(provider: string, key: string): Promise<IpcResponse>
    delete(provider: string): Promise<IpcResponse>
    clear(): Promise<IpcResponse>
  }
  theme: {
    get(): Promise<IpcResponse<{ theme: string }>>
    set(theme: string): Promise<IpcResponse>
    onChanged(callback: (data: { theme: string; isDark: boolean }) => void): () => void
  }
  team: {
    getAgents(): Promise<IpcResponse<string[]>>
    setAgents(ids: string[]): Promise<IpcResponse<string[]>>
    onAgentsChanged(callback: (ids: string[]) => void): () => void
  }
  chatSync: {
    send(msg: { agentId: string; role: string; content: string; mode?: string }): Promise<IpcResponse>
    onMessage(callback: (msg: { agentId: string; role: string; content: string; mode?: string }) => void): () => void
  }
  dockPet: {
    toggle(): Promise<IpcResponse<{ visible: boolean }>>
    openMain(): Promise<IpcResponse>
    getGeometry(): Promise<IpcResponse<{ x: number; y: number; width: number; height: number; position: string; dockSize: number }>>
    showPopover(data: { agentId: string; x: number; y: number }): Promise<IpcResponse>
    hidePopover(): Promise<IpcResponse>
    setMouseForward(ignore: boolean): Promise<IpcResponse>
    onPopoverAgent(callback: (data: { agentId: string }) => void): () => void
  }
  onboarding: {
    status(): Promise<IpcResponse<{ completed: boolean; hasApiKey: boolean }>>
    complete(data: Record<string, unknown>): Promise<IpcResponse>
    envCheck(): Promise<IpcResponse<{
      claude: { available: boolean; version?: string }
      node: { available: boolean; version?: string }
    }>>
    validateInvite(code: string): Promise<IpcResponse>
  }
}

declare global {
  interface Window {
    api: WindowApi
  }
}

/**
 * 获取 IPC API — 在 Electron 环境中返回 window.api，
 * 在浏览器环境中（dev 直接访问 localhost）返回 null
 */
export function getApi(): WindowApi | null {
  if (typeof window !== 'undefined' && window.api) {
    return window.api
  }
  return null
}

/**
 * 判断是否在 Electron 环境中运行
 */
export function isElectron(): boolean {
  return typeof window !== 'undefined' && !!window.api
}
