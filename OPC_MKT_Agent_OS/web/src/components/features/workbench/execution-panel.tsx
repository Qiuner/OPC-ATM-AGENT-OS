'use client';

import { Square } from 'lucide-react';
import { TaskCard } from './task-card';
import type { ExecutionState } from './types';

interface ExecutionPanelProps {
  state: ExecutionState;
  onStop: () => void;
}

export function ExecutionPanel({ state, onStop }: ExecutionPanelProps) {
  const { isRunning, startedAt, prompt, tasks } = state;

  const elapsed = startedAt ? Math.round((Date.now() - startedAt) / 1000) : 0;
  const runningCount = tasks.filter(t => t.status === 'running').length;
  const doneCount = tasks.filter(t => t.status === 'done').length;
  const waitingCount = tasks.filter(t => t.status === 'waiting').length;

  if (!prompt && tasks.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center space-y-3">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto"
            style={{ background: 'rgba(167,139,250,0.08)', border: '1px solid rgba(167,139,250,0.15)' }}
          >
            <span className="text-2xl" style={{ color: '#a78bfa' }}>$</span>
          </div>
          <p className="text-[14px] text-[rgba(255,255,255,0.4)]">
            输入指令，开始 Agent 执行
          </p>
          <p className="text-[12px] text-[rgba(255,255,255,0.2)]">
            CEO 将自动拆解任务并调度子 Agent 协同工作
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Task header */}
      <div
        className="shrink-0 px-5 py-3 flex flex-col gap-2"
        style={{
          background: 'rgba(19,19,27,0.75)',
          backdropFilter: 'blur(20px) saturate(1.2)',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {isRunning && (
              <span
                className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold"
                style={{ background: 'rgba(167,139,250,0.08)', color: '#a78bfa' }}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                LIVE
              </span>
            )}
            <span className="text-[15px] font-semibold text-white truncate max-w-[400px]">
              {prompt}
            </span>
          </div>
          <div className="flex items-center gap-3">
            {elapsed > 0 && (
              <span
                className="text-[13px] tabular-nums"
                style={{ color: 'rgba(255,255,255,0.6)', fontFamily: 'var(--font-geist-mono)' }}
              >
                {formatTime(elapsed)}
              </span>
            )}
            {isRunning && (
              <button
                onClick={onStop}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all hover:brightness-125"
                style={{
                  color: '#ef4444',
                  background: 'rgba(239,68,68,0.10)',
                  border: '1px solid rgba(239,68,68,0.20)',
                }}
              >
                <Square className="w-3 h-3" />
                Stop
              </button>
            )}
          </div>
        </div>

        {tasks.length > 0 && (
          <div className="text-[13px]" style={{ color: 'rgba(255,255,255,0.4)' }}>
            {tasks.length} 个子任务
            {runningCount > 0 && <span> · {runningCount} 执行中</span>}
            {waitingCount > 0 && <span> · {waitingCount} 等待中</span>}
            {doneCount > 0 && <span> · {doneCount} 已完成</span>}
          </div>
        )}
      </div>

      {/* Task cards grid */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {tasks.map(task => (
            <TaskCard key={task.id} task={task} />
          ))}
        </div>
      </div>
    </div>
  );
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0
    ? `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
    : `${s}s`;
}
