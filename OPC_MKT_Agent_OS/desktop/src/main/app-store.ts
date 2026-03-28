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
