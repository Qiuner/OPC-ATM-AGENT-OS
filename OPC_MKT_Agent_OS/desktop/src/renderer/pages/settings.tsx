import { useEffect, useState, useCallback } from 'react'
import {
  Key,
  Globe,
  Shield,
  CheckCircle2,
  XCircle,
  Loader2,
  Eye,
  EyeOff,
  LogIn,
  LogOut,
  RefreshCw,
  Volume2,
  VolumeX,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { getApi } from '@/lib/ipc'

// ── Platform Account Definitions ──

interface PlatformDef {
  id: string
  name: string
  icon: string
  description: string
  available: boolean
}

const PLATFORMS: PlatformDef[] = [
  { id: 'xhs', name: '小红书', icon: '📕', description: '搜索竞品、分析爆款、自动发布笔记', available: true },
  { id: 'douyin', name: '抖音', icon: '🎵', description: '短视频内容发布与数据分析', available: false },
  { id: 'x-twitter', name: 'X / Twitter', icon: '𝕏', description: '推文发布与互动管理', available: false },
]

// ── API Key Provider Definitions ──

interface ApiKeyDef {
  id: string
  name: string
  description: string
}

const API_KEY_PROVIDERS: ApiKeyDef[] = [
  { id: 'anthropic', name: 'Anthropic', description: 'Claude API — 核心 AI 引擎' },
  { id: 'openai', name: 'OpenAI', description: '图片生成（gpt-image）' },
  { id: 'google', name: 'Google', description: '图片生成（Gemini）' },
  { id: 'dashscope', name: 'DashScope', description: '图片生成（中文内容优化）' },
  { id: 'replicate', name: 'Replicate', description: '图片生成（社区模型）' },
]

// ── Platform Auth State ──

interface PlatformAuthState {
  loggedIn: boolean
  username?: string
  lastLoginAt?: string
}

// ── Component ──

export function SettingsPage(): React.JSX.Element {
  // Platform auth
  const [platformAuth, setPlatformAuth] = useState<Record<string, PlatformAuthState>>({})
  const [loginLoading, setLoginLoading] = useState<string | null>(null)

  // API keys
  const [keyStatus, setKeyStatus] = useState<Record<string, boolean>>({})
  const [keyInputs, setKeyInputs] = useState<Record<string, string>>({})
  const [keyVisible, setKeyVisible] = useState<Record<string, boolean>>({})
  const [keySaving, setKeySaving] = useState<string | null>(null)

  // Sound notify
  const [soundSettings, setSoundSettings] = useState<{
    enabled: boolean
    mode: 'milestone' | 'full' | 'completion'
    volume: number
    voiceEnabled: boolean
    voiceName: string
  }>({
    enabled: false,
    mode: 'milestone',
    volume: 70,
    voiceEnabled: false,
    voiceName: 'Lili',
  })

  const [loading, setLoading] = useState(true)

  // ── Load initial state ──

  const loadState = useCallback(async () => {
    const api = getApi()
    if (!api) {
      setLoading(false)
      return
    }

    try {
      const [authRes, keysRes, soundRes] = await Promise.all([
        api.platformAuth.status(),
        api.keys.getStatus(),
        api.soundNotify?.getSettings().catch(() => null),
      ])

      if (authRes.success && authRes.data) {
        setPlatformAuth(authRes.data as Record<string, PlatformAuthState>)
      }
      if (keysRes.success && keysRes.data) {
        setKeyStatus(keysRes.data)
      }
      if (soundRes && soundRes.success && soundRes.data) {
        setSoundSettings(soundRes.data as typeof soundSettings)
      }
    } catch (err) {
      console.error('[Settings] Failed to load state:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadState()
  }, [loadState])

  // ── Platform Auth Handlers ──

  const handleLogin = async (platformId: string) => {
    const api = getApi()
    if (!api) return

    setLoginLoading(platformId)
    try {
      const res = await api.platformAuth.login(platformId)
      if (res.success) {
        setPlatformAuth(prev => ({
          ...prev,
          [platformId]: {
            loggedIn: true,
            lastLoginAt: new Date().toISOString(),
          },
        }))
      }
    } catch (err) {
      console.error('[Settings] Login failed:', err)
    } finally {
      setLoginLoading(null)
    }
  }

  const handleLogout = async (platformId: string) => {
    const api = getApi()
    if (!api) return

    try {
      await api.platformAuth.logout(platformId)
    } catch (err) {
      console.error('[Settings] Logout failed:', err)
    }
    setPlatformAuth(prev => ({
      ...prev,
      [platformId]: { loggedIn: false },
    }))
  }

  // ── API Key Handlers ──

  const handleKeySave = async (providerId: string) => {
    const api = getApi()
    if (!api) return

    const value = keyInputs[providerId]
    if (!value?.trim()) return

    setKeySaving(providerId)
    const res = await api.keys.set(providerId, value.trim())
    if (res.success) {
      setKeyStatus(prev => ({ ...prev, [providerId]: true }))
      setKeyInputs(prev => ({ ...prev, [providerId]: '' }))
    }
    setKeySaving(null)
  }

  const handleKeyDelete = async (providerId: string) => {
    const api = getApi()
    if (!api) return

    await api.keys.delete(providerId)
    setKeyStatus(prev => ({ ...prev, [providerId]: false }))
  }

  // ── Sound Notify Handlers ──

  const handleSoundUpdate = async (data: Partial<typeof soundSettings>) => {
    const api = getApi()
    if (!api) return
    const updated = { ...soundSettings, ...data }
    setSoundSettings(updated)
    await api.soundNotify.updateSettings(data)
  }

  const handleTestSound = async (event: string) => {
    const api = getApi()
    if (!api) return
    await api.soundNotify.play(event)
  }

  const handleTestVoice = async () => {
    const api = getApi()
    if (!api) return
    await api.soundNotify.speak('你好，音效通知已开启')
  }

  // ── Render ──

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto p-8">
      <div className="max-w-3xl mx-auto space-y-10">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground">Settings</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage platform accounts and API keys for your agents
          </p>
        </div>

        {/* ── Section 1: Platform Accounts ── */}
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold text-foreground">Platform Accounts</h2>
          </div>
          <p className="text-sm text-muted-foreground">
            Connect your social media accounts so agents can search content and publish automatically.
          </p>

          <div className="space-y-3">
            {PLATFORMS.map(platform => {
              const auth = platformAuth[platform.id]
              const isLoggedIn = auth?.loggedIn ?? false
              const isLogging = loginLoading === platform.id

              return (
                <div
                  key={platform.id}
                  className="flex items-center justify-between rounded-xl border border-border bg-card p-4 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{platform.icon}</span>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-foreground">{platform.name}</span>
                        {!platform.available && (
                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                            Coming Soon
                          </Badge>
                        )}
                        {platform.available && isLoggedIn && (
                          <Badge className="text-[10px] px-1.5 py-0 bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                            Connected
                          </Badge>
                        )}
                        {platform.available && !isLoggedIn && (
                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                            Not Connected
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{platform.description}</p>
                      {isLoggedIn && auth?.username && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Account: {auth.username}
                        </p>
                      )}
                      {isLoggedIn && auth?.lastLoginAt && (
                        <p className="text-xs text-muted-foreground">
                          Last login: {new Date(auth.lastLoginAt).toLocaleDateString('zh-CN')}
                        </p>
                      )}
                    </div>
                  </div>

                  {platform.available && (
                    <div className="flex items-center gap-2 shrink-0">
                      {isLoggedIn ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleLogout(platform.id)}
                          className="text-xs"
                        >
                          <LogOut className="h-3.5 w-3.5 mr-1" />
                          Logout
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          onClick={() => handleLogin(platform.id)}
                          disabled={isLogging}
                          className="text-xs"
                        >
                          {isLogging ? (
                            <>
                              <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                              Scanning...
                            </>
                          ) : (
                            <>
                              <LogIn className="h-3.5 w-3.5 mr-1" />
                              Login
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {loginLoading === 'xhs' && (
            <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3">
              <p className="text-xs text-amber-600 dark:text-amber-400">
                A browser window will open for QR code scanning. Use the Xiaohongshu app to scan and complete login. This may take up to 2 minutes.
              </p>
            </div>
          )}
        </section>

        {/* ── Section 2: Sound & Voice Notifications ── */}
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <Volume2 className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold text-foreground">Sound & Voice Notifications</h2>
          </div>
          <p className="text-sm text-muted-foreground">
            Agent 工作时播放音效提醒，让你可以离开屏幕做其他事。使用 macOS 原生音效，零延迟。
          </p>

          <div className="rounded-xl border border-border bg-card p-5 space-y-5">
            {/* Master toggle */}
            <div className="flex items-center justify-between">
              <div>
                <span className="font-medium text-foreground">启用音效通知</span>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Agent 启动、完成、出错时播放系统提示音
                </p>
              </div>
              <button
                onClick={() => handleSoundUpdate({ enabled: !soundSettings.enabled })}
                className="relative h-6 w-11 rounded-full transition-colors focus:outline-none"
                style={{
                  background: soundSettings.enabled ? '#a78bfa' : 'rgba(255,255,255,0.1)',
                }}
              >
                <div
                  className="absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform"
                  style={{
                    transform: soundSettings.enabled ? 'translateX(22px)' : 'translateX(2px)',
                  }}
                />
              </button>
            </div>

            {soundSettings.enabled && (
              <>
                {/* Divider */}
                <div className="border-t border-border" />

                {/* Mode selector */}
                <div>
                  <span className="text-sm font-medium text-foreground">通知模式</span>
                  <div className="grid grid-cols-3 gap-3 mt-2">
                    {([
                      {
                        key: 'milestone' as const,
                        label: '🔔 关键节点',
                        events: [
                          { icon: '🚀', name: 'Agent 启动', sound: 'Blow' },
                          { icon: '🎉', name: '任务完成', sound: 'Hero' },
                          { icon: '❌', name: '错误', sound: 'Sosumi' },
                          { icon: '⚠️', name: '需要审批', sound: 'Basso' },
                          { icon: '📋', name: '计划就绪', sound: 'Purr' },
                          { icon: '✅', name: '子Agent完成', sound: 'Glass' },
                        ],
                      },
                      {
                        key: 'full' as const,
                        label: '📢 全部步骤',
                        events: [
                          { icon: '🚀', name: 'Agent 启动', sound: 'Blow' },
                          { icon: '🎉', name: '任务完成', sound: 'Hero' },
                          { icon: '🔧', name: '工具调用', sound: 'Tink' },
                          { icon: '❌', name: '错误', sound: 'Sosumi' },
                          { icon: '⚠️', name: '需要审批', sound: 'Basso' },
                          { icon: '👤', name: '子Agent启动', sound: 'Pop' },
                          { icon: '✅', name: '子Agent完成', sound: 'Glass' },
                          { icon: '📋', name: '计划就绪', sound: 'Purr' },
                        ],
                      },
                      {
                        key: 'completion' as const,
                        label: '✅ 仅完成',
                        events: [
                          { icon: '🎉', name: '任务完成', sound: 'Hero' },
                          { icon: '❌', name: '错误', sound: 'Sosumi' },
                        ],
                      },
                    ]).map(({ key, label, events }) => (
                      <button
                        key={key}
                        onClick={() => handleSoundUpdate({ mode: key })}
                        className="rounded-lg border p-3 text-left transition-colors"
                        style={{
                          borderColor: soundSettings.mode === key
                            ? '#a78bfa'
                            : 'rgba(255,255,255,0.08)',
                          background: soundSettings.mode === key
                            ? 'rgba(167,139,250,0.08)'
                            : 'transparent',
                        }}
                      >
                        <div className="text-sm font-medium text-foreground">{label}</div>
                        <div className="mt-2 space-y-1">
                          {events.map(({ icon, name, sound }) => (
                            <div key={name} className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                              <span>{icon}</span>
                              <span className="flex-1">{name}</span>
                              <span className="text-[10px] opacity-50">{sound}</span>
                            </div>
                          ))}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Volume slider */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-foreground">音量</span>
                    <span className="text-xs text-muted-foreground">{soundSettings.volume}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={soundSettings.volume}
                    onChange={(e) => handleSoundUpdate({ volume: Number(e.target.value) })}
                    className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
                    style={{
                      background: `linear-gradient(to right, #a78bfa ${soundSettings.volume}%, rgba(255,255,255,0.1) ${soundSettings.volume}%)`,
                    }}
                  />
                </div>

                {/* Divider */}
                <div className="border-t border-border" />

                {/* Voice toggle */}
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-medium text-foreground">语音播报</span>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      使用 macOS TTS 朗读关键通知（如 &quot;任务已完成&quot;）
                    </p>
                  </div>
                  <button
                    onClick={() => handleSoundUpdate({ voiceEnabled: !soundSettings.voiceEnabled })}
                    className="relative h-6 w-11 rounded-full transition-colors focus:outline-none"
                    style={{
                      background: soundSettings.voiceEnabled ? '#a78bfa' : 'rgba(255,255,255,0.1)',
                    }}
                  >
                    <div
                      className="absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform"
                      style={{
                        transform: soundSettings.voiceEnabled ? 'translateX(22px)' : 'translateX(2px)',
                      }}
                    />
                  </button>
                </div>

                {/* Divider */}
                <div className="border-t border-border" />

                {/* Test buttons */}
                <div>
                  <span className="text-sm font-medium text-foreground mb-2 block">试听音效</span>
                  <div className="flex flex-wrap items-center gap-2">
                    {([
                      { event: 'agent_start', label: '🚀 启动' },
                      { event: 'agent_done', label: '🎉 完成' },
                      { event: 'error', label: '❌ 错误' },
                      { event: 'sub_agent_start', label: '👤 子Agent启动' },
                      { event: 'sub_agent_done', label: '✅ 子Agent完成' },
                      { event: 'plan_ready', label: '📋 计划就绪' },
                    ]).map(({ event, label }) => (
                      <Button
                        key={event}
                        variant="outline"
                        size="sm"
                        onClick={() => handleTestSound(event)}
                        className="text-xs"
                      >
                        {label}
                      </Button>
                    ))}
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-2">
                    每种事件有不同的系统音效{soundSettings.voiceEnabled ? ' + 语音播报' : ''}
                  </p>
                </div>
              </>
            )}
          </div>
        </section>

        {/* ── Section 3: API Keys ── */}
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <Key className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold text-foreground">API Keys</h2>
          </div>
          <p className="text-sm text-muted-foreground">
            API keys are encrypted and stored securely in your system keychain. Agents will automatically use configured keys.
          </p>

          <div className="space-y-3">
            {API_KEY_PROVIDERS.map(provider => {
              const isConfigured = keyStatus[provider.id] ?? false
              const inputValue = keyInputs[provider.id] ?? ''
              const isVisible = keyVisible[provider.id] ?? false
              const isSaving = keySaving === provider.id

              return (
                <div
                  key={provider.id}
                  className="rounded-xl border border-border bg-card p-4 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-foreground">{provider.name}</span>
                        {isConfigured ? (
                          <span className="flex items-center gap-1 text-[11px] text-emerald-600">
                            <CheckCircle2 className="h-3 w-3" />
                            Configured
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                            <XCircle className="h-3 w-3" />
                            Not configured
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{provider.description}</p>
                    </div>

                    {isConfigured && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleKeyDelete(provider.id)}
                        className="text-xs text-destructive hover:text-destructive"
                      >
                        Remove
                      </Button>
                    )}
                  </div>

                  {!isConfigured && (
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Input
                          type={isVisible ? 'text' : 'password'}
                          placeholder={`Enter ${provider.name} API key...`}
                          value={inputValue}
                          onChange={e =>
                            setKeyInputs(prev => ({ ...prev, [provider.id]: e.target.value }))
                          }
                          onKeyDown={e => {
                            if (e.key === 'Enter') handleKeySave(provider.id)
                          }}
                          className="pr-9 text-sm font-mono"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setKeyVisible(prev => ({ ...prev, [provider.id]: !isVisible }))
                          }
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                        >
                          {isVisible ? (
                            <EyeOff className="h-3.5 w-3.5" />
                          ) : (
                            <Eye className="h-3.5 w-3.5" />
                          )}
                        </button>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => handleKeySave(provider.id)}
                        disabled={!inputValue.trim() || isSaving}
                        className="shrink-0"
                      >
                        {isSaving ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          'Save'
                        )}
                      </Button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          <div className="flex items-start gap-2 rounded-lg border border-border/50 bg-muted/30 p-3">
            <Shield className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
            <p className="text-xs text-muted-foreground">
              Keys are encrypted using your operating system's secure storage (macOS Keychain / Windows Credential Manager). They are never stored in plain text or transmitted to external services.
            </p>
          </div>
        </section>
      </div>
    </div>
  )
}
