import { useState, useEffect } from 'react'
import { getApi } from '@/lib/ipc'

type EngineStatus = 'ready' | 'error' | 'loading'

const statusConfig: Record<EngineStatus, { color: string; label: string; pulse: boolean }> = {
  ready: { color: '#22c55e', label: 'Engine Ready', pulse: false },
  error: { color: '#ef4444', label: 'Engine Error', pulse: false },
  loading: { color: '#f59e0b', label: 'Initializing...', pulse: true },
}

export function StatusBar(): React.JSX.Element {
  const [engineStatus, setEngineStatus] = useState<EngineStatus>('loading')
  const [llmModel, setLlmModel] = useState('—')

  useEffect(() => {
    async function init() {
      const api = getApi()
      if (!api) {
        setEngineStatus('ready')
        setLlmModel('No API')
        return
      }
      try {
        const res = await api.config.get()
        if (res.success && res.data) {
          const config = res.data as { mode: string; defaultProvider: string }
          setEngineStatus('ready')
          const provider = config.defaultProvider || 'claude'
          const mode = config.mode || 'off'
          setLlmModel(mode === 'off' ? `${provider} (off)` : provider)
        } else {
          setEngineStatus('ready')
          setLlmModel('claude')
        }
      } catch {
        setEngineStatus('error')
      }
    }
    void init()
  }, [])

  const status = statusConfig[engineStatus]

  return (
    <footer
      className="h-7 px-4 flex items-center justify-between shrink-0 select-none bg-background border-t border-border"
    >
      {/* Left — Engine status */}
      <div className="flex items-center gap-1.5">
        <div
          className={`h-1.5 w-1.5 rounded-full ${status.pulse ? 'animate-pulse' : ''}`}
          style={{ background: status.color }}
        />
        <span className="text-[11px] text-foreground/30">{status.label}</span>
      </div>

      {/* Center — Current LLM */}
      <span className="text-[11px] text-foreground/30">{llmModel}</span>

      {/* Right — Version */}
      <span className="text-[11px] text-foreground/20">v0.1.0</span>
    </footer>
  )
}
