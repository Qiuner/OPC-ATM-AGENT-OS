/**
 * Onboarding — 首次启动 5 步引导流程
 *
 * Step 1: Welcome — 品牌介绍 + 动画
 * Step 2: Environment Check — 检测 Claude CLI + Node.js
 * Step 3: API Key — 选择 Provider + 输入 Key（可跳过）
 * Step 4: Brand Setup — 品牌名/行业/目标市场/调性（可跳过）
 * Step 5: Complete — 完成动画
 */

import { useState, useCallback, useEffect } from 'react'
import { getApi } from '@/lib/ipc'
import {
  ChevronRight, ChevronLeft, Check,
  Loader2, RefreshCw, CheckCircle2, XCircle,
} from 'lucide-react'

// ── Types ──

interface BrandData {
  name: string
  industry: string
  targetMarket: string
  tone: string
}

interface EnvStatus {
  claude: { available: boolean; version?: string }
  node: { available: boolean; version?: string }
}

interface OnboardingProps {
  onComplete: () => void
}

// ── Constants ──

const TOTAL_STEPS = 5

const PROVIDERS = [
  { id: 'anthropic', name: 'Anthropic', color: '#d97706' },
  { id: 'openai', name: 'OpenAI', color: '#10b981' },
  { id: 'gemini', name: 'Gemini', color: '#3b82f6' },
  { id: 'deepseek', name: 'DeepSeek', color: '#8b5cf6' },
  { id: 'meta', name: 'Meta', color: '#1877f2' },
  { id: 'mistral', name: 'Mistral', color: '#f97316' },
  { id: 'xai', name: 'xAI', color: '#a3a3a3' },
] as const

const INDUSTRIES = [
  'SaaS / 科技',
  '电商 / DTC',
  '教育 / EdTech',
  '金融 / FinTech',
  '医疗健康',
  '消费品',
  '游戏 / 娱乐',
  'B2B 服务',
  '其他',
]

const MARKETS = [
  { id: 'us', label: '美国市场' },
  { id: 'global', label: '全球市场' },
  { id: 'eu', label: '欧洲市场' },
  { id: 'sea', label: '东南亚市场' },
  { id: 'cn', label: '中国市场' },
  { id: 'latam', label: '拉丁美洲' },
]

// ── Shared button styles ──

const primaryBtnStyle = { background: '#a78bfa' }
const primaryBtnHover = '#9371f0'
const ghostColor = 'var(--muted-foreground)'
const ghostHoverColor = 'var(--foreground)'

// ── Step Indicator ──

function StepIndicator({ current, total }: { current: number; total: number }): React.JSX.Element {
  return (
    <div className="flex items-center gap-2">
      {Array.from({ length: total }, (_, i) => (
        <div
          key={i}
          className="h-1.5 rounded-full transition-all duration-300"
          style={{
            width: i === current ? 24 : 8,
            background: i < current ? 'rgba(167,139,250,0.5)'
              : i === current ? '#a78bfa'
              : 'var(--border)',
          }}
        />
      ))}
    </div>
  )
}

// ── Navigation Footer ──

function NavFooter({ step, onBack, onSkip, onNext, nextLabel, nextDisabled, nextLoading }: {
  step: number
  onBack?: () => void
  onSkip?: () => void
  onNext: () => void
  nextLabel?: string
  nextDisabled?: boolean
  nextLoading?: boolean
}): React.JSX.Element {
  return (
    <div className="flex items-center justify-between mt-6">
      {/* Left: Back */}
      <div>
        {onBack && step > 0 && (
          <button
            onClick={onBack}
            className="text-sm transition-colors flex items-center"
            style={{ color: ghostColor }}
            onMouseEnter={(e) => { e.currentTarget.style.color = ghostHoverColor }}
            onMouseLeave={(e) => { e.currentTarget.style.color = ghostColor }}
          >
            <ChevronLeft size={14} className="mr-1" />
            Back
          </button>
        )}
      </div>

      {/* Right: Skip + Next */}
      <div className="flex items-center gap-3">
        {onSkip && (
          <button
            onClick={onSkip}
            className="text-sm transition-colors"
            style={{ color: ghostColor }}
            onMouseEnter={(e) => { e.currentTarget.style.color = ghostHoverColor }}
            onMouseLeave={(e) => { e.currentTarget.style.color = ghostColor }}
          >
            Skip
          </button>
        )}
        <button
          onClick={onNext}
          disabled={nextDisabled || nextLoading}
          className="flex items-center gap-2 rounded-xl px-6 py-2.5 text-sm font-medium text-white transition-colors disabled:opacity-50"
          style={primaryBtnStyle}
          onMouseEnter={(e) => { if (!nextDisabled && !nextLoading) e.currentTarget.style.background = primaryBtnHover }}
          onMouseLeave={(e) => { e.currentTarget.style.background = '#a78bfa' }}
        >
          {nextLoading ? <Loader2 size={14} className="animate-spin" /> : null}
          {nextLabel ?? 'Next'}
          {!nextLoading && <ChevronRight size={16} />}
        </button>
      </div>
    </div>
  )
}

// ── Step 1: Welcome ──

function StepWelcome({ onNext }: { onNext: () => void }): React.JSX.Element {
  return (
    <div className="flex flex-col items-center text-center py-8" style={{ animation: 'onb-slide-in 300ms ease-out' }}>
      {/* Logo */}
      <div
        className="w-20 h-20 rounded-2xl flex items-center justify-center mb-6"
        style={{
          background: 'linear-gradient(135deg, rgba(167,139,250,0.15), rgba(34,211,238,0.1))',
          border: '1px solid rgba(167,139,250,0.2)',
        }}
      >
        <span className="text-3xl font-bold" style={{
          background: 'linear-gradient(135deg, #a78bfa, #22d3ee)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
        }}>
          O
        </span>
      </div>

      <h1 className="text-2xl font-semibold text-foreground mb-2">
        OPC MKT Agent OS
      </h1>
      <p className="text-sm leading-relaxed mb-8" style={{ color: 'var(--muted-foreground)', maxWidth: 320 }}>
        AI-Powered Marketing Automation<br />
        Your intelligent marketing team, always on.
      </p>

      {/* Feature highlights */}
      <div className="w-full space-y-3 mb-8">
        {[
          { icon: '14', label: '14 AI Agents', desc: 'Multi-channel content creation' },
          { icon: 'F', label: 'Data Flywheel', desc: 'Continuously optimize performance' },
          { icon: 'G', label: 'Global Reach', desc: 'Meta, X, TikTok, Email, SEO, GEO' },
        ].map((item) => (
          <div
            key={item.label}
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-left"
            style={{ background: 'var(--muted)', border: '1px solid var(--border)' }}
          >
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0"
              style={{ background: 'rgba(167,139,250,0.12)', color: '#a78bfa' }}
            >
              {item.icon}
            </div>
            <div>
              <div className="text-sm font-medium text-white">{item.label}</div>
              <div className="text-xs" style={{ color: 'var(--muted-foreground)' }}>{item.desc}</div>
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={onNext}
        className="w-full flex items-center justify-center gap-2 rounded-xl px-6 py-2.5 text-sm font-medium text-white transition-colors"
        style={primaryBtnStyle}
        onMouseEnter={(e) => { e.currentTarget.style.background = primaryBtnHover }}
        onMouseLeave={(e) => { e.currentTarget.style.background = '#a78bfa' }}
      >
        Get Started <ChevronRight size={16} />
      </button>
    </div>
  )
}

// ── Step 2: Environment Check ──

function StepEnvCheck({ onNext, onBack }: {
  onNext: () => void
  onBack: () => void
}): React.JSX.Element {
  const [checking, setChecking] = useState(true)
  const [env, setEnv] = useState<EnvStatus | null>(null)

  const runCheck = useCallback(async () => {
    setChecking(true)
    setEnv(null)
    try {
      const api = getApi()
      if (api) {
        const res = await api.onboarding.envCheck()
        if (res.success && res.data) {
          setEnv(res.data)
        } else {
          setEnv({ claude: { available: false }, node: { available: false } })
        }
      } else {
        setEnv({ claude: { available: false }, node: { available: false } })
      }
    } catch {
      setEnv({ claude: { available: false }, node: { available: false } })
    } finally {
      setChecking(false)
    }
  }, [])

  useEffect(() => { runCheck() }, [runCheck])

  const items = env ? [
    {
      label: 'Claude CLI',
      available: env.claude.available,
      version: env.claude.version,
      hint: 'Required for Agent execution',
      installUrl: 'https://docs.anthropic.com/en/docs/claude-code/overview',
    },
    {
      label: 'Node.js',
      available: env.node.available,
      version: env.node.version,
      hint: 'Required for runtime',
      installUrl: 'https://nodejs.org/',
    },
  ] : []

  return (
    <div className="py-6" style={{ animation: 'onb-slide-in 300ms ease-out' }}>
      <div className="text-center mb-6">
        <p className="text-xs font-medium mb-1" style={{ color: 'var(--muted-foreground)' }}>
          Step 2 / {TOTAL_STEPS}
        </p>
        <h2 className="text-lg font-semibold text-foreground">Environment Check</h2>
        <p className="text-xs mt-1" style={{ color: 'var(--muted-foreground)' }}>
          Checking required dependencies
        </p>
      </div>

      <div className="space-y-3 mb-4">
        {checking ? (
          <div className="flex flex-col items-center py-8">
            <Loader2 size={24} className="animate-spin mb-3" style={{ color: '#a78bfa' }} />
            <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>Checking environment...</p>
          </div>
        ) : (
          items.map((item) => (
            <div
              key={item.label}
              className="flex items-center justify-between px-4 py-3 rounded-xl"
              style={{ background: 'var(--muted)', border: '1px solid var(--border)' }}
            >
              <div className="flex items-center gap-3">
                {item.available ? (
                  <CheckCircle2 size={18} style={{ color: '#22c55e' }} />
                ) : (
                  <XCircle size={18} style={{ color: '#ef4444' }} />
                )}
                <div>
                  <div className="text-sm font-medium text-white">{item.label}</div>
                  <div className="text-[10px]" style={{ color: 'var(--muted-foreground)' }}>
                    {item.available
                      ? item.version ?? 'Detected'
                      : item.hint}
                  </div>
                </div>
              </div>
              {!item.available && (
                <a
                  href={item.installUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-medium px-3 py-1 rounded-lg transition-colors"
                  style={{ color: '#a78bfa', background: 'rgba(167,139,250,0.1)' }}
                >
                  Install
                </a>
              )}
            </div>
          ))
        )}
      </div>

      {/* Recheck button */}
      {!checking && (
        <button
          onClick={runCheck}
          className="flex items-center gap-1.5 mx-auto text-xs transition-colors mb-2"
          style={{ color: 'var(--muted-foreground)' }}
          onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--foreground)' }}
          onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--muted-foreground)' }}
        >
          <RefreshCw size={12} />
          Recheck
        </button>
      )}

      {!checking && env && !env.claude.available && (
        <p className="text-[10px] text-center mb-2" style={{ color: 'var(--muted-foreground)' }}>
          Claude CLI is required for Agent execution. You can still continue setup.
        </p>
      )}

      <NavFooter step={1} onBack={onBack} onNext={onNext} nextDisabled={checking} />
    </div>
  )
}

// ── Step 3: API Key (skippable) ──

function StepApiKey({ onNext, onBack }: {
  onNext: (provider: string, key: string) => void
  onBack: () => void
}): React.JSX.Element {
  const [selected, setSelected] = useState<string>('anthropic')
  const [activeTab, setActiveTab] = useState<'invite' | 'apikey'>('invite')
  const [inviteCode, setInviteCode] = useState('')
  const [apiKey, setApiKey] = useState('')
  const [validating, setValidating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const selectedProvider = PROVIDERS.find((p) => p.id === selected)

  const handleNext = useCallback(async () => {
    if (activeTab === 'invite') {
      if (!inviteCode.trim()) { setError('请输入邀请码'); return }
      setValidating(true)
      setError(null)
      try {
        const api = getApi()
        if (api) {
          const res = await api.onboarding.validateInvite(inviteCode.trim())
          if (!res.success) { setError(res.error ?? '邀请码无效'); setValidating(false); return }
        }
        onNext('anthropic', '__invite__')
      } catch (err) {
        setError(err instanceof Error ? err.message : '验证失败')
      } finally {
        setValidating(false)
      }
      return
    }
    if (!apiKey.trim()) { setError('请输入 API Key'); return }
    setValidating(true)
    setError(null)
    try {
      const api = getApi()
      if (api) {
        const res = await api.keys.set(selected, apiKey.trim())
        if (!res.success) { setError(res.error ?? 'Failed to save API key'); setValidating(false); return }
      }
      await new Promise((r) => setTimeout(r, 500))
      onNext(selected, apiKey.trim())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Validation failed')
    } finally {
      setValidating(false)
    }
  }, [selected, activeTab, inviteCode, apiKey, onNext])

  return (
    <div className="py-6" style={{ animation: 'onb-slide-in 300ms ease-out' }}>
      {/* Header */}
      <div className="text-center mb-5">
        <p className="text-xs font-medium mb-1" style={{ color: 'var(--muted-foreground)' }}>
          Step 3 / {TOTAL_STEPS}
        </p>
        <h2 className="text-xl font-semibold text-foreground">激活 AI 员工</h2>
        <p className="text-xs mt-1" style={{ color: 'var(--muted-foreground)' }}>
          选择厂商并完成配置
        </p>
      </div>

      {/* Tabs */}
      <div className="flex w-full border-b mb-5" style={{ borderColor: 'var(--border)' }}>
        {(['invite', 'apikey'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => { setActiveTab(tab); setError(null) }}
            className="flex-1 pb-2 text-sm font-medium text-center transition-colors relative"
            style={{
              color: activeTab === tab ? '#7C3AED' : 'var(--muted-foreground)',
              background: 'none',
              border: 'none',
            }}
          >
            {tab === 'invite' ? '使用邀请码' : '使用 API Key'}
            {activeTab === tab && (
              <span
                className="absolute bottom-0 left-0 right-0 h-0.5"
                style={{ background: '#7C3AED' }}
              />
            )}
          </button>
        ))}
      </div>

      {/* Provider grid — only shown in API Key tab */}
      {activeTab === 'apikey' && (
        <div className="grid grid-cols-4 gap-1.5 mb-4">
        {PROVIDERS.map((p) => (
          <button
            key={p.id}
            onClick={() => { setSelected(p.id); setError(null) }}
            className="flex flex-col items-center justify-center gap-1 py-2 rounded-lg transition-all"
            style={{
              background: selected === p.id ? 'rgba(124,58,237,0.15)' : 'var(--muted)',
              border: `2px solid ${selected === p.id ? '#7C3AED' : 'transparent'}`,
            }}
          >
            <div
              className="w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-bold"
              style={{ background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.7)' }}
            >
              {p.name[0]}
            </div>
            <span className="text-[9px] font-medium" style={{ color: selected === p.id ? '#a78bfa' : 'var(--muted-foreground)' }}>
              {p.name}
            </span>
          </button>
        ))}
        </div>
      )}

      {/* Input area */}
      {activeTab === 'invite' ? (
        <div className="mb-4">
          <p className="text-xs text-center mb-3" style={{ color: 'var(--muted-foreground)' }}>
            请输入您的 {selectedProvider?.name} 专属邀请码以完成激活
          </p>
          <input
            type="text"
            value={inviteCode}
            onChange={(e) => { setInviteCode(e.target.value); setError(null) }}
            placeholder="XXXX-XXXX-XXXX"
            className="w-full rounded-xl px-4 py-2.5 text-sm text-center text-white outline-none transition-colors"
            style={{
              background: 'var(--muted)',
              border: `1px solid ${error ? 'rgba(239,68,68,0.5)' : 'transparent'}`,
              letterSpacing: '0.1em',
            }}
            onFocus={(e) => { e.currentTarget.style.borderColor = 'rgba(124,58,237,0.5)' }}
            onBlur={(e) => { if (!error) e.currentTarget.style.borderColor = 'transparent' }}
            onKeyDown={(e) => { if (e.key === 'Enter') handleNext() }}
          />
        </div>
      ) : (
        <div className="mb-4">
          <p className="text-xs text-center mb-3" style={{ color: 'var(--muted-foreground)' }}>
            请输入您的 {selectedProvider?.name} API Key 以完成配置
          </p>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => { setApiKey(e.target.value); setError(null) }}
            placeholder={`${selectedProvider?.name} API Key`}
            className="w-full rounded-xl px-4 py-2.5 text-sm text-white outline-none transition-colors"
            style={{
              background: 'var(--muted)',
              border: `1px solid ${error ? 'rgba(239,68,68,0.5)' : 'transparent'}`,
            }}
            onFocus={(e) => { e.currentTarget.style.borderColor = 'rgba(124,58,237,0.5)' }}
            onBlur={(e) => { if (!error) e.currentTarget.style.borderColor = 'transparent' }}
            onKeyDown={(e) => { if (e.key === 'Enter') handleNext() }}
          />
        </div>
      )}

      {error && <p className="text-xs mb-3 text-center" style={{ color: '#ef4444' }}>{error}</p>}

      {/* Nav footer */}
      <div className="flex items-center justify-between mt-4">
        <button
          onClick={onBack}
          className="flex items-center gap-1 text-sm transition-colors"
          style={{ color: 'var(--muted-foreground)', background: 'none', border: 'none' }}
          onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--foreground)' }}
          onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--muted-foreground)' }}
        >
          <ChevronLeft size={14} /> Back
        </button>
        <button
          onClick={handleNext}
          disabled={validating}
          className="flex items-center gap-1.5 rounded-xl px-5 py-2 text-sm font-medium text-white transition-colors"
          style={{ background: validating ? 'rgba(124,58,237,0.5)' : '#7C3AED', border: 'none' }}
          onMouseEnter={(e) => { if (!validating) e.currentTarget.style.background = '#6D28D9' }}
          onMouseLeave={(e) => { if (!validating) e.currentTarget.style.background = '#7C3AED' }}
        >
          {validating ? <Loader2 size={14} className="animate-spin" /> : null}
          确认激活 <ChevronRight size={14} />
        </button>
      </div>
    </div>
  )
}

// ── Step 4: Brand Setup (skippable) ──

function StepBrandSetup({ onNext, onSkip, onBack }: {
  onNext: (brand: BrandData) => void
  onSkip: () => void
  onBack: () => void
}): React.JSX.Element {
  const [brand, setBrand] = useState<BrandData>({
    name: '',
    industry: '',
    targetMarket: 'global',
    tone: '',
  })

  const update = (field: keyof BrandData, value: string): void => {
    setBrand((prev) => ({ ...prev, [field]: value }))
  }

  const inputStyle = {
    background: 'var(--muted)',
    border: '1px solid var(--border)',
  }

  const inputClass = 'w-full rounded-xl px-4 py-2.5 text-sm text-white outline-none transition-colors placeholder:text-white/20'

  return (
    <div className="py-6" style={{ animation: 'onb-slide-in 300ms ease-out' }}>
      <div className="text-center mb-6">
        <p className="text-xs font-medium mb-1" style={{ color: 'var(--muted-foreground)' }}>
          Step 4 / {TOTAL_STEPS}
        </p>
        <h2 className="text-lg font-semibold text-foreground">Brand Setup</h2>
        <p className="text-xs mt-1" style={{ color: 'var(--muted-foreground)' }}>
          Tell us about your brand to personalize content
        </p>
      </div>

      <div className="space-y-4 mb-2">
        {/* Brand Name */}
        <div>
          <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--muted-foreground)' }}>
            Brand Name
          </label>
          <input
            type="text"
            value={brand.name}
            onChange={(e) => update('name', e.target.value)}
            placeholder="e.g. Acme Corp"
            className={inputClass}
            style={inputStyle}
            onFocus={(e) => { e.currentTarget.style.borderColor = 'rgba(167,139,250,0.5)' }}
            onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--border)' }}
          />
        </div>

        {/* Industry */}
        <div>
          <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--muted-foreground)' }}>
            Industry
          </label>
          <select
            value={brand.industry}
            onChange={(e) => update('industry', e.target.value)}
            className={inputClass}
            style={{
              ...inputStyle,
              color: brand.industry ? 'var(--foreground)' : 'var(--muted-foreground)',
              appearance: 'none',
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='rgba(255,255,255,0.3)' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`,
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'right 12px center',
            }}
          >
            <option value="" disabled>Select industry</option>
            {INDUSTRIES.map((ind) => (
              <option key={ind} value={ind} style={{ background: 'var(--card)', color: '#fff' }}>
                {ind}
              </option>
            ))}
          </select>
        </div>

        {/* Target Market */}
        <div>
          <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--muted-foreground)' }}>
            Target Market
          </label>
          <div className="grid grid-cols-3 gap-2">
            {MARKETS.map((m) => (
              <button
                key={m.id}
                onClick={() => update('targetMarket', m.id)}
                className="px-3 py-2 rounded-lg text-xs font-medium transition-all"
                style={{
                  background: brand.targetMarket === m.id ? 'rgba(167,139,250,0.12)' : 'var(--muted)',
                  border: `1px solid ${brand.targetMarket === m.id ? 'rgba(167,139,250,0.3)' : 'var(--border)'}`,
                  color: brand.targetMarket === m.id ? '#a78bfa' : 'var(--muted-foreground)',
                }}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>

        {/* Brand Tone */}
        <div>
          <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--muted-foreground)' }}>
            Brand Tone
          </label>
          <input
            type="text"
            value={brand.tone}
            onChange={(e) => update('tone', e.target.value)}
            placeholder="e.g. Professional yet friendly"
            className={inputClass}
            style={inputStyle}
            onFocus={(e) => { e.currentTarget.style.borderColor = 'rgba(167,139,250,0.5)' }}
            onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--border)' }}
          />
        </div>
      </div>

      <NavFooter
        step={3}
        onBack={onBack}
        onSkip={onSkip}
        onNext={() => onNext(brand)}
      />
    </div>
  )
}

// ── Step 5: Complete ──

function StepComplete({ onFinish }: { onFinish: () => void }): React.JSX.Element {
  return (
    <div className="flex flex-col items-center text-center py-10" style={{ animation: 'onb-slide-in 300ms ease-out' }}>
      {/* Success checkmark */}
      <div
        className="w-16 h-16 rounded-full flex items-center justify-center mb-6"
        style={{
          background: 'rgba(34,197,94,0.1)',
          border: '2px solid rgba(34,197,94,0.3)',
          animation: 'onb-check-pop 500ms ease-out',
        }}
      >
        <Check size={28} style={{ color: '#22c55e' }} />
      </div>

      <h2 className="text-xl font-semibold text-foreground mb-2">
        All Set!
      </h2>
      <p className="text-sm mb-8" style={{ color: 'var(--muted-foreground)', maxWidth: 280 }}>
        Your AI marketing team is ready. Start creating content, running campaigns, and growing your brand.
      </p>

      {/* Quick summary */}
      <div
        className="w-full px-4 py-3 rounded-xl mb-8 text-left"
        style={{ background: 'var(--muted)', border: '1px solid var(--border)' }}
      >
        <div className="text-[10px] uppercase font-medium mb-2" style={{ color: 'var(--muted-foreground)', letterSpacing: '0.05em' }}>
          What's next
        </div>
        <div className="space-y-2">
          {[
            'Create your first marketing campaign',
            'Configure brand voice in Context Vault',
            'Run an Agent from Team Studio',
          ].map((item, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className="w-1 h-1 rounded-full" style={{ background: '#a78bfa' }} />
              <span className="text-xs" style={{ color: 'var(--muted-foreground)' }}>{item}</span>
            </div>
          ))}
        </div>
      </div>

      <button
        onClick={onFinish}
        className="w-full flex items-center justify-center gap-2 rounded-xl px-6 py-2.5 text-sm font-medium text-white transition-colors"
        style={primaryBtnStyle}
        onMouseEnter={(e) => { e.currentTarget.style.background = primaryBtnHover }}
        onMouseLeave={(e) => { e.currentTarget.style.background = '#a78bfa' }}
      >
        Enter Workspace <ChevronRight size={16} />
      </button>
    </div>
  )
}

// ── Main Onboarding Component ──

export function OnboardingPage({ onComplete }: OnboardingProps): React.JSX.Element {
  const [step, setStep] = useState(0)
  const [provider, setProvider] = useState('')
  const [apiKey, setApiKey] = useState('')
  const [brand, setBrand] = useState<BrandData | null>(null)

  const handleApiKeyNext = useCallback((p: string, k: string) => {
    setProvider(p)
    setApiKey(k)
    setStep(3) // → Brand Setup
  }, [])

  const handleBrandNext = useCallback((b: BrandData) => {
    setBrand(b)
    setStep(4) // → Complete
  }, [])

  const handleBrandSkip = useCallback(() => {
    setStep(4) // → Complete without brand info
  }, [])

  const handleFinish = useCallback(async () => {
    const api = getApi()
    if (api) {
      await api.onboarding.complete({
        provider: provider || undefined,
        apiKey: apiKey || undefined,
        brand: brand && brand.name ? brand : undefined,
      })
    }
    onComplete()
  }, [provider, apiKey, brand, onComplete])

  return (
    <div className="fixed inset-0 flex items-center justify-center" style={{ background: 'var(--background)', zIndex: 9999 }}>
      {/* Ambient glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(600px circle at 50% 30%, rgba(167,139,250,0.06), transparent 70%)',
        }}
      />

      {/* Container */}
      <div
        className="relative w-full rounded-2xl px-8 pb-6 pt-5"
        style={{
          maxWidth: 480,
          background: 'var(--card)',
          border: '1px solid var(--border)',
          boxShadow: '0 16px 64px rgba(0,0,0,0.6)',
        }}
      >
        {/* Step indicator */}
        <div className="flex justify-center mb-4">
          <StepIndicator current={step} total={TOTAL_STEPS} />
        </div>

        {/* Step content */}
        {step === 0 && <StepWelcome onNext={() => setStep(1)} />}
        {step === 1 && <StepEnvCheck onNext={() => setStep(2)} onBack={() => setStep(0)} />}
        {step === 2 && (
          <StepApiKey
            onNext={handleApiKeyNext}
            onBack={() => setStep(1)}
          />
        )}
        {step === 3 && (
          <StepBrandSetup
            onNext={handleBrandNext}
            onSkip={handleBrandSkip}
            onBack={() => setStep(2)}
          />
        )}
        {step === 4 && <StepComplete onFinish={handleFinish} />}
      </div>

      {/* Titlebar drag region */}
      <div className="titlebar-drag absolute top-0 left-0 right-0 h-8" />
    </div>
  )
}
