/**
 * App Store — electron-store 配置管理
 *
 * 用途：
 * - 应用设置（窗口状态、UI 偏好等）
 * - 非敏感配置项
 *
 * 注意：API Keys 等敏感信息使用 safe-storage.ts 通过 Keychain 存储
 */

import Store from 'electron-store'

interface AppSettings {
  /** 窗口状态 */
  windowBounds?: {
    x: number
    y: number
    width: number
    height: number
  }
  /** 是否最大化 */
  isMaximized?: boolean
  /** AI 模式: off / core / full */
  aiMode: 'off' | 'core' | 'full'
  /** 默认 LLM provider */
  defaultProvider: string
  /** 功能开关 */
  features: Record<string, boolean>
  /** 审批设置 */
  approval: {
    mode: 'auto' | 'manual'
    autoThreshold: number
  }
  /** 邮件配置（非敏感部分） */
  email?: {
    address: string
    senderName: string
    verified: boolean
    configuredAt: string
  }
  /** 主题模式 */
  theme: 'dark' | 'light' | 'system'
  /** Onboarding 是否已完成 */
  onboardingCompleted: boolean
  /** 品牌快速设置 */
  brand?: {
    name: string
    industry: string
    targetMarket: string
    tone: string
  }
  /** 桌面悬浮窗位置 */
  widgetBounds?: {
    x: number
    y: number
    width: number
    height: number
  }
  /** 桌面悬浮窗是否可见 */
  widgetVisible?: boolean
  /** Dock Pet 活跃团队 agent 列表 */
  teamAgentIds?: string[]
  /** 平台授权状态（cookie-based logins） */
  platformAuth?: {
    xhs?: {
      loggedIn: boolean
      username?: string
      lastLoginAt?: string
    }
  }
  /** 音效通知设置 */
  soundNotify: {
    enabled: boolean
    mode: 'milestone' | 'full' | 'completion'
    volume: number       // 0-100
    voiceEnabled: boolean // TTS 语音播报
    voiceName: string     // macOS say voice name
  }
  /** 调试开关 */
  debug: {
    mockCeoMode: boolean
  }
}

const defaults: AppSettings = {
  aiMode: 'off',
  defaultProvider: 'claude',
  features: {},
  approval: {
    mode: 'manual',
    autoThreshold: 7,
  },
  theme: 'dark',
  onboardingCompleted: false,
  teamAgentIds: ['ceo', 'xhs-agent', 'growth-agent', 'brand-reviewer'],
  soundNotify: {
    enabled: false,
    mode: 'milestone',
    volume: 70,
    voiceEnabled: false,
    voiceName: 'Lili',
  },
  debug: {
    mockCeoMode: false,
  },
}

const store = new Store<AppSettings>({
  name: 'settings',
  defaults,
})

export function getAppSettings(): AppSettings {
  return {
    windowBounds: store.get('windowBounds'),
    isMaximized: store.get('isMaximized'),
    aiMode: store.get('aiMode'),
    defaultProvider: store.get('defaultProvider'),
    features: store.get('features'),
    approval: store.get('approval'),
    email: store.get('email'),
    theme: store.get('theme'),
    onboardingCompleted: store.get('onboardingCompleted'),
    brand: store.get('brand'),
    teamAgentIds: store.get('teamAgentIds'),
    platformAuth: store.get('platformAuth'),
    soundNotify: store.get('soundNotify'),
    debug: store.get('debug'),
  }
}

export function setAppSettings(partial: Partial<AppSettings>): AppSettings {
  for (const [key, value] of Object.entries(partial)) {
    if (value !== undefined) {
      store.set(key as keyof AppSettings, value)
    }
  }
  return getAppSettings()
}

export function getSettingValue<K extends keyof AppSettings>(key: K): AppSettings[K] {
  return store.get(key)
}

export function setSettingValue<K extends keyof AppSettings>(key: K, value: AppSettings[K]): void {
  store.set(key, value)
}

/** 保存窗口状态 — 在窗口关闭前调用 */
export function saveWindowState(bounds: { x: number; y: number; width: number; height: number }, isMaximized: boolean): void {
  store.set('windowBounds', bounds)
  store.set('isMaximized', isMaximized)
}

/** 读取上次窗口状态 */
export function getWindowState(): { bounds?: { x: number; y: number; width: number; height: number }; isMaximized?: boolean } {
  return {
    bounds: store.get('windowBounds'),
    isMaximized: store.get('isMaximized'),
  }
}

/** 读取悬浮窗状态 */
export function getWidgetState(): { bounds?: { x: number; y: number; width: number; height: number }; visible?: boolean } {
  return {
    bounds: store.get('widgetBounds'),
    visible: store.get('widgetVisible') ?? false,
  }
}

/** 保存悬浮窗状态 */
export function saveWidgetState(partial: { x?: number; y?: number; width?: number; height?: number; visible?: boolean }): void {
  if (partial.x !== undefined || partial.y !== undefined || partial.width !== undefined || partial.height !== undefined) {
    const current = store.get('widgetBounds') ?? { x: 0, y: 0, width: 320, height: 200 }
    store.set('widgetBounds', { ...current, ...partial })
  }
  if (partial.visible !== undefined) {
    store.set('widgetVisible', partial.visible)
  }
}
