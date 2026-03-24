'use client';

import React, { useState } from 'react';
import { Settings, Eye, EyeOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAIConfig, type AIMode, type AIFeatures } from '@/lib/ai-config';
import type { ProviderName } from '@/lib/llm/types';
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';

const MODE_OPTIONS: { value: AIMode; label: string; emoji: string }[] = [
  { value: 'off', label: '关闭', emoji: '🔴' },
  { value: 'core', label: '核心', emoji: '⚡' },
  { value: 'full', label: '全开', emoji: '🚀' },
];

const FEATURE_LABELS: { key: keyof AIFeatures; label: string; desc: string }[] = [
  { key: 'strategist', label: '策略生成', desc: 'Strategist' },
  { key: 'writer', label: '内容生成', desc: 'Writer' },
  { key: 'riskCheck', label: '风险检测', desc: 'Risk Check' },
  { key: 'teamStudio', label: 'Team Studio 对话', desc: 'Chat' },
  { key: 'analytics', label: '数据分析', desc: 'Analytics' },
  { key: 'seoOptimize', label: 'SEO 优化建议', desc: 'SEO' },
];

const PROVIDER_LABELS: { key: ProviderName; label: string; url: string }[] = [
  { key: 'claude', label: 'Claude API Key', url: 'https://console.anthropic.com/settings/keys' },
  { key: 'openai', label: 'OpenAI API Key', url: 'https://platform.openai.com/api-keys' },
  { key: 'gemini', label: 'Gemini API Key', url: 'https://aistudio.google.com/apikey' },
  { key: 'deepseek', label: 'DeepSeek API Key', url: 'https://platform.deepseek.com/api_keys' },
  { key: 'minimax', label: 'MiniMax API Key', url: 'https://platform.minimaxi.com/user-center/basic-information/interface-key' },
  { key: 'glm', label: 'GLM (智谱) API Key', url: 'https://open.bigmodel.cn/usercenter/apikeys' },
];

const PROVIDER_DISPLAY: Record<ProviderName, string> = {
  claude: 'Claude',
  openai: 'OpenAI',
  gemini: 'Gemini',
  deepseek: 'DeepSeek',
  minimax: 'MiniMax',
  glm: 'GLM (智谱)',
};

function Toggle({ enabled, onToggle, disabled }: { enabled: boolean; onToggle: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={disabled}
      className={cn(
        'relative w-11 h-6 rounded-full transition-colors duration-200 flex-shrink-0',
        disabled && 'opacity-50 cursor-not-allowed'
      )}
      style={{ background: enabled ? '#a78bfa' : 'rgba(255,255,255,0.08)' }}
    >
      <span
        className={cn(
          'absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200',
          enabled && 'translate-x-5'
        )}
      />
    </button>
  );
}

function KeyInput({ provider, value, onChange, url }: { provider: string; value: string; onChange: (v: string) => void; url: string }) {
  const [visible, setVisible] = useState(false);

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <label className="text-sm font-medium" style={{ color: 'rgba(255,255,255,0.7)' }}>
          {provider}
        </label>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs hover:underline"
          style={{ color: '#a78bfa' }}
        >
          获取 Key →
        </a>
      </div>
      <div className="relative">
        <input
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="未配置"
          className="h-9 w-full rounded-lg px-3 pr-9 text-sm font-mono text-white focus:outline-none transition-all"
          style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
          }}
          onFocus={e => (e.target as HTMLElement).style.borderColor = 'rgba(167,139,250,0.3)'}
          onBlur={e => (e.target as HTMLElement).style.borderColor = 'rgba(255,255,255,0.08)'}
        />
        <button
          type="button"
          onClick={() => setVisible(!visible)}
          className="absolute right-2 top-1/2 -translate-y-1/2 transition-colors"
          style={{ color: 'rgba(255,255,255,0.3)' }}
        >
          {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
      <p className="text-xs mt-1" style={{ color: value ? '#22c55e' : 'rgba(255,255,255,0.25)' }}>
        {value ? '✅ 已配置' : '未配置'}
      </p>
    </div>
  );
}

export function SettingsPanel() {
  const { config, setMode, toggleFeature, setKey, setDefaultProvider } = useAIConfig();

  return (
    <Sheet>
      <SheetTrigger
        className="flex items-center gap-3 px-3 py-2 w-full rounded-lg text-sm transition-all duration-200 cursor-pointer"
        style={{ color: 'rgba(255,255,255,0.4)' }}
        onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.03)'}
        onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
      >
        <Settings className="h-5 w-5" />
        <span>设置</span>
        {config.mode !== 'off' && (
          <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded-full font-medium"
            style={{ background: 'rgba(34,197,94,0.10)', color: '#22c55e' }}
          >
            {config.mode === 'full' ? 'FULL' : 'CORE'}
          </span>
        )}
      </SheetTrigger>

      <SheetContent side="left" className="w-80 sm:max-w-80 overflow-y-auto"
        style={{ background: '#0a0a0f', borderRight: '1px solid rgba(255,255,255,0.06)' }}
      >
        <SheetHeader>
          <SheetTitle className="text-white">⚙️ 设置</SheetTitle>
          <SheetDescription style={{ color: 'rgba(255,255,255,0.4)' }}>
            AI 能力配置与 API Key 管理
          </SheetDescription>
        </SheetHeader>

        <div className="px-4 pb-6 space-y-6">
          {/* AI Mode Selector */}
          <section>
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.12em] mb-3"
              style={{ color: 'rgba(255,255,255,0.3)' }}
            >
              AI 能力模式
            </h3>
            <div className="flex gap-1 rounded-lg p-1 w-full"
              style={{ background: 'rgba(255,255,255,0.04)' }}
            >
              {MODE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setMode(opt.value)}
                  className="flex-1 px-3 py-2 rounded-md text-sm text-center transition-all duration-200"
                  style={config.mode === opt.value ? {
                    background: opt.value === 'off' ? 'rgba(255,255,255,0.06)' : opt.value === 'core' ? 'rgba(167,139,250,0.15)' : 'rgba(34,197,94,0.15)',
                    color: opt.value === 'off' ? '#ffffff' : opt.value === 'core' ? '#a78bfa' : '#22c55e',
                    fontWeight: 500,
                  } : {
                    color: 'rgba(255,255,255,0.35)',
                  }}
                >
                  {opt.emoji} {opt.label}
                </button>
              ))}
            </div>
            <p className="text-xs mt-2" style={{ color: 'rgba(255,255,255,0.3)' }}>
              {config.mode === 'off' && '所有 AI 功能已关闭'}
              {config.mode === 'core' && '核心模式：策略 + 内容 + 风控'}
              {config.mode === 'full' && '全开模式：全部 AI 能力启用'}
            </p>
          </section>

          {/* Feature Toggles */}
          <section>
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.12em] mb-3"
              style={{ color: 'rgba(255,255,255,0.3)' }}
            >
              AI 功能开关
            </h3>
            <div className="space-y-3">
              {FEATURE_LABELS.map((f) => (
                <div key={f.key} className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-white">{f.label}</p>
                    <p className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>{f.desc}</p>
                  </div>
                  <Toggle
                    enabled={config.features[f.key]}
                    onToggle={() => toggleFeature(f.key)}
                    disabled={config.mode === 'off'}
                  />
                </div>
              ))}
            </div>
          </section>

          {/* Default Provider */}
          <section>
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.12em] mb-3"
              style={{ color: 'rgba(255,255,255,0.3)' }}
            >
              默认模型
            </h3>
            <select
              value={config.defaultProvider}
              onChange={(e) => setDefaultProvider(e.target.value as ProviderName)}
              className="h-9 w-full rounded-lg px-3 text-sm text-white focus:outline-none transition-all"
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
              }}
            >
              {PROVIDER_LABELS.map((p) => (
                <option key={p.key} value={p.key}>
                  {PROVIDER_DISPLAY[p.key]}{config.keys[p.key] ? ' ✓' : ' (未配置)'}
                </option>
              ))}
            </select>
            {!config.keys[config.defaultProvider] && (
              <p className="text-xs mt-1" style={{ color: '#fbbf24' }}>
                ⚠️ 当前模型未配置 API Key，将使用 Mock 数据
              </p>
            )}
          </section>

          {/* API Keys */}
          <section>
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.12em] mb-3"
              style={{ color: 'rgba(255,255,255,0.3)' }}
            >
              API Keys
            </h3>
            <div className="space-y-4">
              {PROVIDER_LABELS.map((p) => (
                <KeyInput
                  key={p.key}
                  provider={p.label}
                  value={config.keys[p.key]}
                  onChange={(v) => setKey(p.key, v)}
                  url={p.url}
                />
              ))}
            </div>
          </section>

          {/* Notice */}
          <div className="rounded-xl p-3"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
          >
            <p className="text-xs leading-relaxed" style={{ color: 'rgba(255,255,255,0.35)' }}>
              🔒 API Key 仅保存在浏览器本地，不会上传到服务器。
            </p>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
