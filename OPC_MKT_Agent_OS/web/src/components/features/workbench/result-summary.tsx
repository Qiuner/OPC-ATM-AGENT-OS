'use client';

import { CheckCircle, RotateCcw, Save } from 'lucide-react';
import type { ExecutionState } from './types';

interface ResultSummaryProps {
  state: ExecutionState;
  onReset: () => void;
}

export function ResultSummary({ state, onReset }: ResultSummaryProps) {
  const { tasks, startedAt, result } = state;

  const totalTime = startedAt
    ? Math.round((Date.now() - startedAt) / 1000)
    : 0;

  const doneCount = tasks.filter(t => t.status === 'done').length;
  const errorCount = tasks.filter(t => t.status === 'error').length;
  const allDone = tasks.length > 0 && tasks.every(t => t.status === 'done' || t.status === 'error');

  if (!allDone) return null;

  return (
    <div className="cotify-card p-6 space-y-4 mx-4 mb-4">
      {/* Status line */}
      <div className="flex items-center gap-3 text-[14px]">
        <CheckCircle className="w-5 h-5 shrink-0" style={{ color: '#22c55e' }} />
        <span className="text-white font-medium">
          全部 {tasks.length} 个任务已完成
        </span>
        <span style={{ color: 'rgba(255,255,255,0.5)' }}>
          · 总耗时 {formatDuration(totalTime)}
          {errorCount > 0 && <span className="text-[#ef4444]"> · {errorCount} 失败</span>}
        </span>
      </div>

      {/* Result preview */}
      {result && (
        <div
          className="rounded-xl p-4 text-[13px] leading-relaxed max-h-[300px] overflow-y-auto"
          style={{
            background: 'rgba(255,255,255,0.02)',
            border: '1px solid rgba(255,255,255,0.06)',
            color: 'rgba(255,255,255,0.7)',
            whiteSpace: 'pre-wrap',
          }}
        >
          {result.slice(0, 2000)}
          {result.length > 2000 && (
            <span style={{ color: 'rgba(255,255,255,0.3)' }}>... (已截断)</span>
          )}
        </div>
      )}

      {/* Actions */}
      <div
        className="flex items-center gap-3 pt-3"
        style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
      >
        <button
          onClick={onReset}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[13px] font-medium transition-all hover:brightness-125"
          style={{
            color: '#a78bfa',
            background: 'rgba(167,139,250,0.10)',
            border: '1px solid rgba(167,139,250,0.20)',
          }}
        >
          <RotateCcw className="w-3.5 h-3.5" />
          重新执行
        </button>
        <button
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[13px] font-medium transition-all hover:brightness-125"
          style={{
            color: '#22c55e',
            background: 'rgba(34,197,94,0.10)',
            border: '1px solid rgba(34,197,94,0.20)',
          }}
        >
          <Save className="w-3.5 h-3.5" />
          保存到 Context Vault
        </button>
      </div>
    </div>
  );
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${s}s`;
}
