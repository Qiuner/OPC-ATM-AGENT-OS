'use client';

import { useState, useRef, useEffect } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import type { LogEntry } from './types';
import { AGENT_COLORS } from './types';

interface TerminalLogProps {
  logs: LogEntry[];
}

export function TerminalLog({ logs }: TerminalLogProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isCollapsed && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs, isCollapsed]);

  const latestLog = logs[logs.length - 1];

  return (
    <div
      className="flex flex-col overflow-hidden transition-all duration-300 shrink-0"
      style={{
        maxHeight: isCollapsed ? '44px' : '220px',
        borderTop: '1px solid rgba(255,255,255,0.06)',
      }}
    >
      {/* Header */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="flex items-center justify-between px-4 py-2 shrink-0 cursor-pointer hover:bg-[rgba(255,255,255,0.02)]"
      >
        <div className="flex items-center gap-2">
          <span
            className="text-[12px] font-semibold"
            style={{ color: 'rgba(255,255,255,0.5)', fontFamily: 'var(--font-geist-mono)' }}
          >
            Terminal
          </span>
          <span className="text-[11px]" style={{ color: 'rgba(255,255,255,0.2)' }}>
            {logs.length} events
          </span>
          {isCollapsed && latestLog && (
            <span
              className="text-[11px] truncate max-w-[300px] ml-2"
              style={{ color: 'rgba(255,255,255,0.3)', fontFamily: 'var(--font-geist-mono)' }}
            >
              {latestLog.message}
            </span>
          )}
        </div>
        <span className="text-[12px] px-2 py-0.5 rounded-md" style={{ color: 'rgba(255,255,255,0.3)' }}>
          {isCollapsed ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </span>
      </button>

      {/* Log entries */}
      {!isCollapsed && (
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto px-4 pb-2 space-y-0.5"
          style={{ fontFamily: 'var(--font-geist-mono)' }}
        >
          {logs.map(entry => (
            <LogLine key={entry.id} entry={entry} />
          ))}
        </div>
      )}
    </div>
  );
}

function LogLine({ entry }: { entry: LogEntry }) {
  const time = new Date(entry.timestamp);
  const timeStr = `${String(time.getHours()).padStart(2, '0')}:${String(time.getMinutes()).padStart(2, '0')}:${String(time.getSeconds()).padStart(2, '0')}`;

  const agentColor = AGENT_COLORS[entry.agentId]?.color ?? '#a78bfa';
  const agentName = AGENT_COLORS[entry.agentId]?.name ?? entry.agentId;

  const typeColor = entry.type === 'error'
    ? '#ef4444'
    : entry.type === 'result'
      ? '#22c55e'
      : entry.type === 'tool'
        ? '#fbbf24'
        : entry.type === 'communication'
          ? '#22d3ee'
          : 'rgba(255,255,255,0.4)';

  return (
    <div className="flex items-start gap-2 text-[11px] leading-5">
      <span style={{ color: 'rgba(255,255,255,0.2)' }}>{timeStr}</span>
      <span className="font-semibold shrink-0" style={{ color: agentColor }}>
        [{agentName}]
      </span>
      <span style={{ color: typeColor }}>
        {entry.type === 'tool' && '⚙ '}
        {entry.type === 'result' && '✓ '}
        {entry.type === 'error' && '✗ '}
        {entry.type === 'communication' && '→ '}
      </span>
      <span className="truncate" style={{ color: 'rgba(255,255,255,0.6)' }}>
        {entry.message}
      </span>
    </div>
  );
}
