import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import { IPC } from '../shared/ipc-channels'
import type { IpcResponse } from '../shared/ipc-types'

/**
 * Preload API — 通过 contextBridge 安全地暴露给 renderer 进程
 *
 * 使用方式: window.api.tasks.list({ status: 'review' })
 */
const api = {
  tasks: {
    list: (filter?: Record<string, string>): Promise<IpcResponse> =>
      ipcRenderer.invoke(IPC.TASKS_LIST, filter),
    get: (id: string): Promise<IpcResponse> =>
      ipcRenderer.invoke(IPC.TASKS_GET, id),
    create: (data: Record<string, unknown>): Promise<IpcResponse> =>
      ipcRenderer.invoke(IPC.TASKS_CREATE, data),
    update: (id: string, data: Record<string, unknown>): Promise<IpcResponse> =>
      ipcRenderer.invoke(IPC.TASKS_UPDATE, id, data),
    delete: (id: string): Promise<IpcResponse> =>
      ipcRenderer.invoke(IPC.TASKS_DELETE, id),
  },

  contents: {
    list: (filter?: Record<string, string>): Promise<IpcResponse> =>
      ipcRenderer.invoke(IPC.CONTENTS_LIST, filter),
    get: (id: string): Promise<IpcResponse> =>
      ipcRenderer.invoke(IPC.CONTENTS_GET, id),
    create: (data: Record<string, unknown>): Promise<IpcResponse> =>
      ipcRenderer.invoke(IPC.CONTENTS_CREATE, data),
    update: (id: string, data: Record<string, unknown>): Promise<IpcResponse> =>
      ipcRenderer.invoke(IPC.CONTENTS_UPDATE, id, data),
    delete: (id: string): Promise<IpcResponse> =>
      ipcRenderer.invoke(IPC.CONTENTS_DELETE, id),
  },

  approvals: {
    list: (filter?: Record<string, string>): Promise<IpcResponse> =>
      ipcRenderer.invoke(IPC.APPROVALS_LIST, filter),
    create: (data: Record<string, unknown>): Promise<IpcResponse> =>
      ipcRenderer.invoke(IPC.APPROVALS_CREATE, data),
  },

  context: {
    list: (filter?: Record<string, string>): Promise<IpcResponse> =>
      ipcRenderer.invoke(IPC.CONTEXT_LIST, filter),
    get: (id: string): Promise<IpcResponse> =>
      ipcRenderer.invoke(IPC.CONTEXT_GET, id),
    create: (data: Record<string, unknown>): Promise<IpcResponse> =>
      ipcRenderer.invoke(IPC.CONTEXT_CREATE, data),
    update: (id: string, data: Record<string, unknown>): Promise<IpcResponse> =>
      ipcRenderer.invoke(IPC.CONTEXT_UPDATE, id, data),
    delete: (id: string): Promise<IpcResponse> =>
      ipcRenderer.invoke(IPC.CONTEXT_DELETE, id),
  },

  metrics: {
    list: (filter?: Record<string, string>): Promise<IpcResponse> =>
      ipcRenderer.invoke(IPC.METRICS_LIST, filter),
    create: (data: Record<string, unknown>): Promise<IpcResponse> =>
      ipcRenderer.invoke(IPC.METRICS_CREATE, data),
  },

  campaigns: {
    list: (): Promise<IpcResponse> =>
      ipcRenderer.invoke(IPC.CAMPAIGNS_LIST),
  },

  agentRuns: {
    list: (): Promise<IpcResponse> =>
      ipcRenderer.invoke(IPC.AGENT_RUNS_LIST),
  },

  settings: {
    get: (): Promise<IpcResponse> =>
      ipcRenderer.invoke(IPC.SETTINGS_GET),
    update: (data: Record<string, unknown>): Promise<IpcResponse> =>
      ipcRenderer.invoke(IPC.SETTINGS_UPDATE, data),
  },

  config: {
    get: (): Promise<IpcResponse> =>
      ipcRenderer.invoke(IPC.CONFIG_GET),
    set: (data: Record<string, unknown>): Promise<IpcResponse> =>
      ipcRenderer.invoke(IPC.CONFIG_SET, data),
  },

  agent: {
    execute: (data: Record<string, unknown>): Promise<IpcResponse> =>
      ipcRenderer.invoke(IPC.AGENT_EXECUTE, data),
    abort: (): Promise<IpcResponse> =>
      ipcRenderer.invoke(IPC.AGENT_ABORT),
    status: (): Promise<IpcResponse> =>
      ipcRenderer.invoke(IPC.AGENT_STATUS),
    saveResult: (data: Record<string, unknown>): Promise<IpcResponse> =>
      ipcRenderer.invoke(IPC.AGENT_SAVE_RESULT, data),
    getSession: (agentId: string): Promise<IpcResponse> =>
      ipcRenderer.invoke(IPC.AGENT_SESSION_GET, { agentId }),
    clearSession: (agentId: string): Promise<IpcResponse> =>
      ipcRenderer.invoke(IPC.AGENT_SESSION_CLEAR, { agentId }),
    // Agent stream events (main → renderer push)
    onStreamChunk: (callback: (event: unknown) => void): (() => void) => {
      const handler = (_: Electron.IpcRendererEvent, data: unknown): void => callback(data)
      ipcRenderer.on(IPC.AGENT_STREAM_CHUNK, handler)
      return () => { ipcRenderer.removeListener(IPC.AGENT_STREAM_CHUNK, handler) }
    },
    onStreamEnd: (callback: () => void): (() => void) => {
      const handler = (): void => callback()
      ipcRenderer.on(IPC.AGENT_STREAM_END, handler)
      return () => { ipcRenderer.removeListener(IPC.AGENT_STREAM_END, handler) }
    },
    onStreamError: (callback: (error: unknown) => void): (() => void) => {
      const handler = (_: Electron.IpcRendererEvent, data: unknown): void => callback(data)
      ipcRenderer.on(IPC.AGENT_STREAM_ERROR, handler)
      return () => { ipcRenderer.removeListener(IPC.AGENT_STREAM_ERROR, handler) }
    },
    onEvent: (callback: (event: unknown) => void): (() => void) => {
      const handler = (_: Electron.IpcRendererEvent, data: unknown): void => callback(data)
      ipcRenderer.on(IPC.AGENT_EVENT, handler)
      return () => { ipcRenderer.removeListener(IPC.AGENT_EVENT, handler) }
    },
  },

  /** Secure storage — API Keys via OS Keychain */
  keys: {
    getStatus: (): Promise<IpcResponse> =>
      ipcRenderer.invoke(IPC.KEYS_GET_STATUS),
    set: (provider: string, key: string): Promise<IpcResponse> =>
      ipcRenderer.invoke(IPC.KEYS_SET, { provider, key }),
    delete: (provider: string): Promise<IpcResponse> =>
      ipcRenderer.invoke(IPC.KEYS_DELETE, provider),
    clear: (): Promise<IpcResponse> =>
      ipcRenderer.invoke(IPC.KEYS_CLEAR),
  },

  /** Theme */
  theme: {
    get: (): Promise<IpcResponse> =>
      ipcRenderer.invoke(IPC.THEME_GET),
    set: (theme: string): Promise<IpcResponse> =>
      ipcRenderer.invoke(IPC.THEME_SET, { theme }),
    onChanged: (callback: (data: { theme: string; isDark: boolean }) => void): (() => void) => {
      const handler = (_: Electron.IpcRendererEvent, data: { theme: string; isDark: boolean }): void => callback(data)
      ipcRenderer.on(IPC.THEME_CHANGED, handler)
      return () => { ipcRenderer.removeListener(IPC.THEME_CHANGED, handler) }
    },
  },

  /** Team agents */
  team: {
    getAgents: (): Promise<IpcResponse> =>
      ipcRenderer.invoke(IPC.TEAM_GET_AGENTS),
    setAgents: (ids: string[]): Promise<IpcResponse> =>
      ipcRenderer.invoke(IPC.TEAM_SET_AGENTS, ids),
    onAgentsChanged: (callback: (ids: string[]) => void): (() => void) => {
      const handler = (_: Electron.IpcRendererEvent, ids: string[]): void => callback(ids)
      ipcRenderer.on(IPC.TEAM_AGENTS_CHANGED, handler)
      return () => { ipcRenderer.removeListener(IPC.TEAM_AGENTS_CHANGED, handler) }
    },
  },

  /** Chat sync — cross-window message relay */
  chatSync: {
    send: (msg: { agentId: string; role: string; content: string; mode?: string }): Promise<IpcResponse> =>
      ipcRenderer.invoke(IPC.CHAT_SYNC_SEND, msg),
    onMessage: (callback: (msg: { agentId: string; role: string; content: string; mode?: string }) => void): (() => void) => {
      const handler = (_: Electron.IpcRendererEvent, msg: { agentId: string; role: string; content: string; mode?: string }): void => callback(msg)
      ipcRenderer.on(IPC.CHAT_SYNC_BROADCAST, handler)
      return () => { ipcRenderer.removeListener(IPC.CHAT_SYNC_BROADCAST, handler) }
    },
  },

  /** Dock Pet control */
  dockPet: {
    toggle: (): Promise<IpcResponse> =>
      ipcRenderer.invoke(IPC.DOCK_PET_TOGGLE),
    openMain: (): Promise<IpcResponse> =>
      ipcRenderer.invoke(IPC.DOCK_PET_OPEN_MAIN),
    getGeometry: (): Promise<IpcResponse> =>
      ipcRenderer.invoke(IPC.DOCK_PET_GEOMETRY),
    showPopover: (data: { agentId: string; x: number; y: number }): Promise<IpcResponse> =>
      ipcRenderer.invoke(IPC.DOCK_PET_SHOW_POPOVER, data),
    hidePopover: (): Promise<IpcResponse> =>
      ipcRenderer.invoke(IPC.DOCK_PET_HIDE_POPOVER),
    setMouseForward: (ignore: boolean): Promise<IpcResponse> =>
      ipcRenderer.invoke(IPC.DOCK_PET_MOUSE_FORWARD, ignore),
    onPopoverAgent: (callback: (data: { agentId: string }) => void): (() => void) => {
      const handler = (_: Electron.IpcRendererEvent, data: { agentId: string }): void => callback(data)
      ipcRenderer.on(IPC.DOCK_PET_POPOVER_AGENT, handler)
      return () => { ipcRenderer.removeListener(IPC.DOCK_PET_POPOVER_AGENT, handler) }
    },
  },

  /** Onboarding */
  onboarding: {
    status: (): Promise<IpcResponse> =>
      ipcRenderer.invoke(IPC.ONBOARDING_STATUS),
    complete: (data: Record<string, unknown>): Promise<IpcResponse> =>
      ipcRenderer.invoke(IPC.ONBOARDING_COMPLETE, data),
    envCheck: (): Promise<IpcResponse> =>
      ipcRenderer.invoke(IPC.ONBOARDING_ENV_CHECK),
    validateInvite: (code: string): Promise<IpcResponse> =>
      ipcRenderer.invoke(IPC.ONBOARDING_VALIDATE_INVITE, { code }),
  },
}

export type DesktopApi = typeof api

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error('Failed to expose API via contextBridge:', error)
  }
} else {
  // @ts-expect-error fallback for non-isolated context
  window.electron = electronAPI
  // @ts-expect-error fallback for non-isolated context
  window.api = api
}
