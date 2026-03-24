'use client';

import { cn } from '@/lib/utils';
import { CheckCircle, AlertCircle, Loader2, Clock, Wrench } from 'lucide-react';
import type { AgentTask } from './types';

interface TaskCardProps {
  task: AgentTask;
}

export function TaskCard({ task }: TaskCardProps) {
  const { agent, status, progress, currentTool, toolCallCount, description, error } = task;
  const color = agent.color;

  const elapsed = task.startedAt
    ? Math.round(((task.finishedAt ?? Date.now()) - task.startedAt) / 1000)
    : 0;

  return (
    <div
      className={cn(
        'cotify-card p-5 flex flex-col gap-3 relative overflow-hidden transition-all duration-300',
        status === 'error' && 'animate-shake',
      )}
      style={{
        borderTop: `3px solid ${status === 'done' ? '#22c55e' : status === 'error' ? '#ef4444' : status === 'intervention' ? '#fbbf24' : color}`,
        opacity: status === 'waiting' ? 0.6 : 1,
      }}
    >
      {/* Glow layer for running state */}
      {status === 'running' && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `radial-gradient(ellipse at 50% 0%, ${color}12, transparent 70%)`,
          }}
        />
      )}

      {/* Agent header */}
      <div className="flex items-center gap-3 relative z-10">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center text-[12px] font-bold shrink-0"
          style={{
            background: `${color}15`,
            border: `1px solid ${color}30`,
            color,
          }}
        >
          {agent.avatar}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold text-white truncate">{agent.name}</div>
          <div className="text-[12px] text-[rgba(255,255,255,0.4)] truncate">
            {description || agent.description}
          </div>
        </div>
        <StatusIcon status={status} />
      </div>

      {/* Progress bar */}
      <div
        className="h-1.5 rounded-full overflow-hidden relative z-10"
        style={{ background: `${color}15` }}
      >
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${progress}%`,
            background: status === 'done'
              ? '#22c55e'
              : status === 'error'
                ? '#ef4444'
                : `linear-gradient(90deg, ${color}60, ${color}, ${color}60)`,
            animation: status === 'running' ? 'monitor-progress 2s ease-in-out infinite' : 'none',
          }}
        />
      </div>

      {/* Footer: current tool + elapsed */}
      <div className="flex items-center justify-between relative z-10">
        {currentTool && status === 'running' ? (
          <div
            className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-[11px]"
            style={{
              background: `${color}10`,
              border: `1px solid ${color}20`,
              fontFamily: 'var(--font-geist-mono)',
              color,
            }}
          >
            <Wrench className="w-3 h-3" />
            {currentTool}
            {toolCallCount > 0 && <span className="opacity-60">x{toolCallCount}</span>}
          </div>
        ) : error ? (
          <span className="text-[11px] text-[#ef4444] truncate max-w-[200px]">{error}</span>
        ) : status === 'done' ? (
          <span className="text-[11px] text-[#22c55e]">已完成</span>
        ) : (
          <span className="text-[11px] text-[rgba(255,255,255,0.3)]">
            {status === 'waiting' ? '等待中' : ''}
          </span>
        )}

        {elapsed > 0 && (
          <span
            className="text-[11px] tabular-nums"
            style={{ color: 'rgba(255,255,255,0.3)', fontFamily: 'var(--font-geist-mono)' }}
          >
            {elapsed}s
          </span>
        )}
      </div>
    </div>
  );
}

function StatusIcon({ status }: { status: AgentTask['status'] }) {
  switch (status) {
    case 'running':
      return <Loader2 className="w-4 h-4 animate-spin" style={{ color: '#a78bfa' }} />;
    case 'done':
      return <CheckCircle className="w-4 h-4" style={{ color: '#22c55e' }} />;
    case 'error':
      return <AlertCircle className="w-4 h-4" style={{ color: '#ef4444' }} />;
    case 'intervention':
      return <AlertCircle className="w-4 h-4 animate-pulse" style={{ color: '#fbbf24' }} />;
    case 'waiting':
      return <Clock className="w-4 h-4" style={{ color: 'rgba(255,255,255,0.2)' }} />;
  }
}
