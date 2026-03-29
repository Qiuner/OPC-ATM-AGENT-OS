import React from 'react'
import { Loader2, Check, Circle, AlertCircle, Sparkles } from 'lucide-react'

export interface ProcessingStep {
  label: string
  status: 'pending' | 'active' | 'done' | 'error'
}

interface AIProcessingOverlayProps {
  visible: boolean
  title: string
  steps: ProcessingStep[]
  subtitle?: string
}

function StepIcon({ status }: { status: ProcessingStep['status'] }) {
  switch (status) {
    case 'active':
      return <Loader2 className="h-4 w-4 animate-spin text-[#a78bfa]" />
    case 'done':
      return <Check className="h-4 w-4 text-emerald-400" />
    case 'error':
      return <AlertCircle className="h-4 w-4 text-red-400" />
    default:
      return <Circle className="h-4 w-4 text-white/20" />
  }
}

export function AIProcessingOverlay({ visible, title, steps, subtitle }: AIProcessingOverlayProps) {
  if (!visible) return null

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div
        className="w-80 rounded-2xl p-6 shadow-2xl"
        style={{
          background: 'var(--card)',
          border: '1px solid var(--border)',
        }}
      >
        {/* Header */}
        <div className="flex items-center gap-3 mb-5">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-xl"
            style={{ background: 'linear-gradient(135deg, #a78bfa, #7c3aed)' }}
          >
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <div>
            <h3 className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>
              {title}
            </h3>
            {subtitle && (
              <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
                {subtitle}
              </p>
            )}
          </div>
        </div>

        {/* Steps */}
        <div className="space-y-0">
          {steps.map((step, i) => (
            <div key={i} className="flex items-start gap-3">
              {/* Vertical line + icon */}
              <div className="flex flex-col items-center">
                <div className="flex h-7 items-center">
                  <StepIcon status={step.status} />
                </div>
                {i < steps.length - 1 && (
                  <div
                    className="w-px flex-1 min-h-[12px]"
                    style={{
                      background: step.status === 'done'
                        ? 'rgba(167, 139, 250, 0.4)'
                        : 'var(--border)',
                    }}
                  />
                )}
              </div>
              {/* Label */}
              <div className="flex h-7 items-center">
                <span
                  className="text-sm"
                  style={{
                    color: step.status === 'active'
                      ? 'var(--foreground)'
                      : step.status === 'done'
                        ? 'var(--muted-foreground)'
                        : 'var(--muted-foreground)',
                    fontWeight: step.status === 'active' ? 500 : 400,
                    opacity: step.status === 'pending' ? 0.5 : 1,
                  }}
                >
                  {step.label}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
