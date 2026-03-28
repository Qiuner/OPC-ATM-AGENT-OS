/**
 * Safe Storage — macOS Keychain / Windows Credential Manager / Linux Secret Service
 *
 * 使用 Electron 的 safeStorage API 加密存储 API Keys 等敏感信息。
 * safeStorage 在 macOS 上使用 Keychain，Windows 上使用 DPAPI，
 * Linux 上使用 libsecret (GNOME Keyring / KDE Wallet)。
 *
 * 加密后的数据以 Base64 存储在 electron-store 中，
 * 只有当前应用才能解密读取。
 */

import { safeStorage } from 'electron'
import Store from 'electron-store'

interface EncryptedStore {
  /** API Keys — 加密后的 base64 字符串 */
  apiKeys: Record<string, string>
}

const secretStore = new Store<EncryptedStore>({
  name: 'secrets',
  defaults: {
    apiKeys: {},
  },
})

/**
 * 检查 safeStorage 是否可用
 * 在某些 Linux 环境中可能不可用
 */
export function isEncryptionAvailable(): boolean {
  return safeStorage.isEncryptionAvailable()
}

/**
 * 安全存储 API Key
 * 使用 OS Keychain 加密后存入本地文件
 */
export function setApiKey(provider: string, key: string): void {
  if (!key) {
    // 空 key = 删除
    const keys = secretStore.get('apiKeys')
    delete keys[provider]
    secretStore.set('apiKeys', keys)
    return
  }

  if (safeStorage.isEncryptionAvailable()) {
    const encrypted = safeStorage.encryptString(key)
    const base64 = encrypted.toString('base64')
    const keys = secretStore.get('apiKeys')
    keys[provider] = base64
    secretStore.set('apiKeys', keys)
  } else {
    // Fallback: 明文存储（仅开发环境或不支持加密的系统）
    const keys = secretStore.get('apiKeys')
    keys[provider] = `plain:${key}`
    secretStore.set('apiKeys', keys)
  }
}

/**
 * 安全读取 API Key
 */
export function getApiKey(provider: string): string | null {
  const keys = secretStore.get('apiKeys')
  const stored = keys[provider]
  if (!stored) return null

  if (stored.startsWith('plain:')) {
    // Fallback 明文
    return stored.slice(6)
  }

  if (safeStorage.isEncryptionAvailable()) {
    try {
      const buffer = Buffer.from(stored, 'base64')
      return safeStorage.decryptString(buffer)
    } catch {
      // 解密失败 — 可能是其他机器加密的
      return null
    }
  }

  return null
}

/**
 * 获取所有 provider 的 key 配置状态（不返回 key 值）
 */
export function getApiKeyStatus(): Record<string, boolean> {
  const keys = secretStore.get('apiKeys')
  const status: Record<string, boolean> = {}
  for (const [provider, value] of Object.entries(keys)) {
    status[provider] = !!value
  }
  return status
}

/**
 * 删除指定 provider 的 API Key
 */
export function deleteApiKey(provider: string): void {
  const keys = secretStore.get('apiKeys')
  delete keys[provider]
  secretStore.set('apiKeys', keys)
}

/**
 * 删除所有 API Keys
 */
export function clearAllApiKeys(): void {
  secretStore.set('apiKeys', {})
}
