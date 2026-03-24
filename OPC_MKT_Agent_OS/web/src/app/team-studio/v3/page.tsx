'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { PixelAgentSVG } from '@/components/features/agent-monitor/pixel-agents';

// ==========================================
// Design tokens — Cotify dark theme
// ==========================================

const T = {
  pageBg: '#030305',
  cardBg: '#0a0a0f',
  border: 'rgba(255,255,255,0.08)',
  text: '#ffffff',
  textMuted: 'rgba(255,255,255,0.6)',
  textDim: 'rgba(255,255,255,0.3)',
  accent: '#a78bfa',
  accentGlow: 'rgba(167,139,250,0.08)',
  green: '#22c55e',
  yellow: '#fbbf24',
  red: '#ef4444',
  orange: '#f97316',
  greenBg: 'rgba(34,197,94,0.10)',
  yellowBg: 'rgba(251,191,36,0.10)',
  redBg: 'rgba(239,68,68,0.10)',
  orangeBg: 'rgba(249,115,22,0.10)',
} as const;

const font = {
  heading: "var(--font-geist-sans), system-ui, -apple-system, sans-serif",
  body: "var(--font-geist-sans), system-ui, -apple-system, sans-serif",
  mono: "var(--font-geist-mono), 'JetBrains Mono', monospace",
};

// ==========================================
// Types
// ==========================================

type AgentStatus = 'busy' | 'online' | 'offline';

interface MonitorAgent {
  id: string;
  name: string;
  nameEn: string;
  role: string;
  color: string;
  avatar: string;
  status: AgentStatus;
  currentTool?: string;
  currentToolInput?: string;
  toolCallCount?: number;
}

interface LogEntry {
  id: number;
  timestamp: number;
  level: 'info' | 'success' | 'warn' | 'error';
  source: string;
  message: string;
}

interface ExecTask {
  agentId: string;
  status: 'waiting' | 'running' | 'done' | 'error';
  progress: number;
  currentTool?: string;
  toolCallCount: number;
  description: string;
  content: string;
}

// ==========================================
// Empty initial data — populated from EventBus/API at runtime
// ==========================================

// ==========================================
// Helpers
// ==========================================

function getStatusText(agent: MonitorAgent): string {
  if (agent.status === 'offline') return '离线';
  if (agent.status === 'online') return '待命中';
  const tool = agent.currentTool;
  if (!tool) return '思考中...';
  if (tool.includes('Read') || tool.includes('read')) return '阅读文件';
  if (tool.includes('Write') || tool.includes('write')) return '写方案';
  if (tool.includes('Bash') || tool.includes('bash')) return '执行命令';
  if (tool.includes('Agent') || tool.includes('SendMessage')) return '分配任务';
  if (tool.includes('Search') || tool.includes('search')) return '搜索资料';
  if (tool.includes('WebFetch') || tool.includes('WebSearch')) return '搜索网络';
  return `使用 ${tool}`;
}

function getStatusColor(status: AgentStatus): { color: string; bg: string; label: string } {
  switch (status) {
    case 'busy': return { color: T.yellow, bg: T.yellowBg, label: '工作中' };
    case 'online': return { color: T.green, bg: T.greenBg, label: '空闲' };
    case 'offline': return { color: T.textDim, bg: 'rgba(255,255,255,0.03)', label: '离线' };
  }
}

function getLogType(log: LogEntry): 'dispatch' | 'complete' | 'error' | 'tool' | 'normal' {
  if (log.level === 'error') return 'error';
  if (log.source.startsWith('send:') || log.message.includes('→')) return 'dispatch';
  if (log.level === 'success' || log.message.includes('完成') || log.message.includes('✓')) return 'complete';
  if (log.source.startsWith('tool:') || log.message.includes('⚙')) return 'tool';
  return 'normal';
}

// ==========================================
// Pixel Avatar — SVG for supported agents, letter fallback for others
// ==========================================

const PIXEL_AGENT_IDS = new Set(['ceo', 'xhs-agent', 'growth-agent', 'brand-reviewer']);

function PixelAvatar({ agentId, initial, color, status, size = 64 }: { agentId: string; initial: string; color: string; status: AgentStatus; size?: number }) {
  const isOffline = status === 'offline';
  const hasPixelArt = PIXEL_AGENT_IDS.has(agentId);
  return (
    <div
      className={cn(
        'rounded-xl flex items-center justify-center shrink-0 relative overflow-hidden transition-all duration-300',
        status === 'busy' && 'scale-105',
      )}
      style={{
        width: size,
        height: size,
        background: `${color}10`,
        border: `1px solid ${color}25`,
        opacity: isOffline ? 0.4 : 1,
      }}
    >
      {hasPixelArt ? (
        <PixelAgentSVG
          agentId={agentId as 'ceo' | 'xhs-agent' | 'growth-agent' | 'brand-reviewer'}
          status={status}
          className="w-12 h-12"
        />
      ) : (
        /* Pixel-style letter block fallback */
        <svg viewBox="0 0 20 26" className="w-12 h-12" style={{ imageRendering: 'pixelated' as const }}>
          {/* Pixel head */}
          <rect x="5" y="2" width="10" height="7" fill={isOffline ? '#666' : '#f4c49e'} />
          {/* Eyes */}
          <rect x="7" y="5" width="2" height="2" fill="#1a1a1a" />
          <rect x="11" y="5" width="2" height="2" fill="#1a1a1a" />
          <rect x="8" y="5" width="1" height="1" fill="#fff" />
          <rect x="12" y="5" width="1" height="1" fill="#fff" />
          {/* Body in agent color */}
          <rect x="5" y="11" width="10" height="9" fill={isOffline ? '#444' : color} />
          <rect x="5" y="11" width="3" height="9" fill={isOffline ? '#333' : `${color}cc`} />
          {/* Neck */}
          <rect x="8" y="9" width="4" height="2" fill={isOffline ? '#666' : '#f4c49e'} />
          {/* Arms */}
          <rect x="3" y="12" width="2" height="6" fill={isOffline ? '#444' : color} />
          <rect x="15" y="12" width="2" height="6" fill={isOffline ? '#444' : color} />
          {/* Legs */}
          <rect x="6" y="20" width="3" height="4" fill={isOffline ? '#333' : '#2c3e50'} />
          <rect x="11" y="20" width="3" height="4" fill={isOffline ? '#333' : '#2c3e50'} />
          {/* Shoes */}
          <rect x="5" y="24" width="4" height="2" fill={isOffline ? '#222' : '#1a1a2e'} />
          <rect x="11" y="24" width="4" height="2" fill={isOffline ? '#222' : '#1a1a2e'} />
          {/* Initial letter on body */}
          <text
            x="10" y="18"
            textAnchor="middle"
            fontSize="6"
            fontWeight="bold"
            fontFamily="monospace"
            fill="#fff"
          >
            {initial.slice(0, 2)}
          </text>
        </svg>
      )}
      {/* Status dot */}
      <span
        className={cn(
          'absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2',
          status === 'busy' && 'animate-pulse',
        )}
        style={{
          background: getStatusColor(status).color,
          borderColor: T.cardBg,
          boxShadow: `0 0 8px ${getStatusColor(status).color}60`,
        }}
      />
    </div>
  );
}


// ==========================================
// 2. Agent State Card — with CEO dispatch tags + selected state
// ==========================================

function AgentStateCard({
  agent,
  logs,
  execTask,
  allExecTasks,
  allAgents,
  selected,
  highlighted,
  onSelect,
  cardRef,
}: {
  agent: MonitorAgent;
  logs: LogEntry[];
  execTask?: ExecTask;
  allExecTasks: ExecTask[];
  allAgents: MonitorAgent[];
  selected: boolean;
  highlighted: boolean;
  onSelect: () => void;
  cardRef: (el: HTMLDivElement | null) => void;
}) {
  const isOffline = agent.status === 'offline';
  const isBusy = agent.status === 'busy';
  const statusText = getStatusText(agent);
  const statusStyle = getStatusColor(agent.status);
  const statusColor = statusStyle.color;
  const hasContent = !!(execTask?.content);

  // Latest activity from logs
  const latestActivity = (() => {
    if (isOffline) return '';
    const agentLogs = logs.filter(l =>
      l.source.includes(agent.id) || l.source.startsWith('send:') || l.source.startsWith('tool:')
    );
    if (agentLogs.length > 0) return agentLogs[agentLogs.length - 1].message;
    if (logs.length > 0) return logs[logs.length - 1].message;
    return '';
  })();

  // CEO dispatch tags — show dispatched sub-agents
  const dispatchedAgents = agent.id === 'ceo'
    ? allExecTasks.filter(t => t.agentId !== 'ceo' && (t.status === 'running' || t.status === 'done' || t.status === 'waiting'))
    : [];

  return (
    <div
      ref={cardRef}
      className={cn(
        'rounded-2xl transition-all duration-300 flex flex-col min-w-0 relative overflow-hidden',
        isOffline && 'opacity-40',
        hasContent && 'cursor-pointer',
        highlighted && 'animate-highlight-flash',
      )}
      style={{
        background: T.cardBg,
        border: `1px solid ${selected ? `${statusColor}60` : isBusy ? `${statusColor}40` : highlighted ? `${statusColor}60` : T.border}`,
        borderTop: `3px solid ${statusColor}`,
        borderBottom: selected ? `3px solid ${statusColor}` : undefined,
        boxShadow: selected ? `0 0 20px ${statusColor}25, inset 0 0 30px ${statusColor}08`
          : isBusy ? `0 0 20px ${statusColor}15, inset 0 0 30px ${statusColor}05`
          : highlighted ? `0 0 16px ${statusColor}40` : 'none',
        ['--flash-color' as string]: statusColor,
      }}
      onClick={hasContent ? onSelect : undefined}
    >
      {/* Busy glow overlay */}
      {isBusy && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: `radial-gradient(ellipse at 50% 0%, ${statusColor}12, transparent 70%)` }}
        />
      )}

      {/* Selected indicator overlay */}
      {selected && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: `${statusColor}06` }}
        />
      )}

      {/* Card content */}
      <div className="p-5 flex flex-col gap-3">
        {/* Avatar + Status */}
        <div className="flex items-center justify-between relative z-10">
          <div className="flex items-center gap-4">
            <PixelAvatar agentId={agent.id} initial={agent.avatar} color={agent.color} status={agent.status} />
            <div className="min-w-0">
              <div className="text-lg font-bold truncate" style={{ fontFamily: font.heading, color: '#ffffff' }}>
                {agent.nameEn}
              </div>
              <div className="text-sm truncate" style={{ fontFamily: font.body, color: T.textMuted }}>
                {agent.name}
              </div>
            </div>
          </div>
          <span
            className="px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap shrink-0"
            style={{ color: statusStyle.color, background: statusStyle.bg }}
          >
            {statusText}
          </span>
        </div>

        {/* Progress bar — status color */}
        {isBusy && (
          <div className="relative z-10 h-1 rounded-full overflow-hidden" style={{ background: `${statusColor}15` }}>
            <div
              className="h-full rounded-full"
              style={{
                background: `linear-gradient(90deg, ${statusColor}60, ${statusColor}, ${statusColor}60)`,
                animation: 'monitor-progress 2s ease-in-out infinite',
                width: '40%',
              }}
            />
          </div>
        )}

        {/* CEO Dispatch Tags — neutral colors with mini avatar */}
        {dispatchedAgents.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap relative z-10">
            <span className="text-xs font-medium" style={{ color: 'rgba(255,255,255,0.25)' }}>调度:</span>
            {dispatchedAgents.map(task => {
              const targetAgent = allAgents.find(a => a.id === task.agentId);
              if (!targetAgent) return null;
              const isDone = task.status === 'done';
              const isError = task.status === 'error';
              return (
                <span
                  key={task.agentId}
                  className="inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded font-medium transition-all duration-200"
                  style={
                    isDone ? { color: T.green, background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.15)' }
                    : isError ? { color: T.red, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)' }
                    : { color: 'rgba(255,255,255,0.5)', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }
                  }
                >
                  <span
                    className="w-3 h-3 rounded text-[6px] font-bold flex items-center justify-center shrink-0"
                    style={{ background: `${targetAgent.color}20`, color: targetAgent.color }}
                  >
                    {targetAgent.avatar.slice(0, 1)}
                  </span>
                  {isDone ? '✓' : isError ? '✗' : ''} {targetAgent.nameEn}
                </span>
              );
            })}
          </div>
        )}

        {/* Latest activity */}
        {latestActivity && (
          <div className="relative z-10 text-sm truncate leading-relaxed" style={{ fontFamily: font.body, color: T.textMuted }}>
            {latestActivity}
          </div>
        )}
      </div>
    </div>
  );
}

// ==========================================
// 3. Detail Panel — slide-down between grid and command input
// ==========================================

function DetailPanel({
  agent,
  execTask,
  onClose,
}: {
  agent: MonitorAgent;
  execTask?: ExecTask;
  onClose: () => void;
}) {
  const statusStyle = getStatusColor(agent.status);
  const statusColor = statusStyle.color;
  const isRunning = execTask?.status === 'running';

  return (
    <div
      className="shrink-0 overflow-hidden"
      style={{
        height: '250px',
        background: T.cardBg,
        borderTop: `1px solid ${T.border}`,
        borderBottom: `1px solid ${T.border}`,
        animation: 'detail-panel-slide 0.25s ease-out',
      }}
    >
      <div className="h-full flex flex-col">
        {/* Panel header */}
        <div
          className="shrink-0 flex items-center justify-between px-4 py-2.5"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
        >
          <div className="flex items-center gap-3">
            <PixelAvatar agentId={agent.id} initial={agent.avatar} color={agent.color} status={agent.status} size={40} />
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-base font-bold" style={{ fontFamily: font.heading, color: '#ffffff' }}>
                  {agent.nameEn}
                </span>
                <span className="text-sm" style={{ color: T.textMuted }}>{agent.name}</span>
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <span
                  className="w-1.5 h-1.5 rounded-full shrink-0"
                  style={{ background: statusColor, boxShadow: agent.status === 'busy' ? `0 0 6px ${statusColor}` : 'none' }}
                />
                <span className="text-xs" style={{ color: statusStyle.color }}>{getStatusText(agent)}</span>
                {execTask && (
                  <span className="text-xs" style={{ color: T.textDim }}>
                    {execTask.description}
                  </span>
                )}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-md cursor-pointer transition-colors hover:bg-[rgba(255,255,255,0.06)]"
            style={{ color: T.textDim }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Panel content — scrollable */}
        <div
          className="flex-1 overflow-y-auto px-4 py-3"
        >
          {execTask?.content ? (
            <div
              className="text-sm leading-relaxed"
              style={{
                color: 'rgba(255,255,255,0.65)',
                whiteSpace: 'pre-wrap',
                fontFamily: font.body,
              }}
            >
              {execTask.content}
              {isRunning && (
                <span
                  className="inline-block w-1.5 h-4 ml-0.5 rounded-sm animate-pulse"
                  style={{ background: statusColor, verticalAlign: 'text-bottom' }}
                />
              )}
            </div>
          ) : (
            <div className="flex items-center justify-center h-full">
              <span className="text-sm" style={{ color: T.textDim }}>暂无产出内容</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ==========================================
// 4. Terminal Log Stream — with classification
// ==========================================

function TerminalLogStream({
  logs,
  agents,
  onAgentClick,
}: {
  logs: LogEntry[];
  agents: MonitorAgent[];
  onAgentClick: (agentId: string) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const shouldAutoScroll = useRef(true);

  const handleScroll = () => {
    if (!containerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    shouldAutoScroll.current = scrollHeight - scrollTop - clientHeight < 40;
  };

  useEffect(() => {
    if (containerRef.current && shouldAutoScroll.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [logs]);

  const agentNameMap: Record<string, { name: string }> = {};
  for (const a of agents) {
    agentNameMap[a.id] = { name: a.nameEn };
  }

  const getSourceDisplay = (source: string) => {
    const parts = source.split(':');
    const agentId = parts[1] || parts[0];
    const info = agentNameMap[agentId];
    const prefix = parts[0] === 'tool' ? '⚙ '
      : parts[0] === 'send' ? '→ '
      : parts[0] === 'agent' ? '● '
      : '';
    return {
      label: `${prefix}${info?.name || source}`,
      color: 'rgba(255,255,255,0.5)',
      agentId,
    };
  };

  return (
    <div
      ref={containerRef}
      className="flex-1 overflow-y-auto px-4 py-2"
      onScroll={handleScroll}
      style={{ fontFamily: font.mono }}
    >
      {logs.length === 0 ? (
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="text-lg opacity-15 mb-3">⌨️</div>
            <div className="text-sm" style={{ color: T.textDim }}>等待 Agent 活动...</div>
          </div>
        </div>
      ) : (
        logs.slice(-80).map(log => {
          const time = new Date(log.timestamp);
          const timeStr = time.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
          const sourceDisplay = getSourceDisplay(log.source);
          const logType = getLogType(log);

          const logStyle = {
            dispatch: {
              background: 'rgba(167,139,250,0.04)',
              borderLeft: '2px solid rgba(167,139,250,0.4)',
              messageColor: 'rgba(167,139,250,0.8)',
            },
            complete: {
              background: 'rgba(34,197,94,0.04)',
              borderLeft: '2px solid rgba(34,197,94,0.4)',
              messageColor: 'rgba(34,197,94,0.8)',
            },
            error: {
              background: 'rgba(239,68,68,0.04)',
              borderLeft: '2px solid rgba(239,68,68,0.4)',
              messageColor: '#ef4444',
            },
            tool: {
              background: 'transparent',
              borderLeft: '2px solid transparent',
              messageColor: 'rgba(251,191,36,0.6)',
            },
            normal: {
              background: 'transparent',
              borderLeft: '2px solid transparent',
              messageColor: 'rgba(255,255,255,0.6)',
            },
          }[logType];

          return (
            <div
              key={log.id}
              className="flex gap-2 px-3 py-[4px] text-sm leading-[1.8] rounded transition-colors"
              style={{
                background: logStyle.background,
                borderLeft: logStyle.borderLeft,
              }}
            >
              <span className="shrink-0 tabular-nums select-none" style={{ color: T.textDim, fontSize: '14px' }}>
                {timeStr}
              </span>
              <span
                className="shrink-0 font-medium select-none cursor-pointer hover:underline"
                style={{ color: sourceDisplay.color, fontSize: '14px' }}
                onClick={() => onAgentClick(sourceDisplay.agentId)}
              >
                [{sourceDisplay.label}]
              </span>
              <span className="break-all text-sm" style={{ color: logStyle.messageColor }}>
                {log.message}
              </span>
            </div>
          );
        })
      )}
    </div>
  );
}

// ==========================================
// Command Input Bar
// ==========================================

function CommandInputBar({ onSend }: { onSend: (msg: string) => void }) {
  const [input, setInput] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = () => {
    const trimmed = input.trim();
    if (!trimmed) return;
    onSend(trimmed);
    setInput('');
    inputRef.current?.focus();
  };

  return (
    <div
      className="shrink-0 flex items-center gap-3 px-4 py-3"
      style={{
        background: 'rgba(10,10,15,0.9)',
        backdropFilter: 'blur(12px)',
        borderTop: `1px solid ${T.border}`,
      }}
    >
      <span className="text-lg shrink-0 select-none" style={{ color: T.accent, fontFamily: font.mono }}>$</span>
      <input
        ref={inputRef}
        type="text"
        value={input}
        onChange={e => setInput(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') handleSubmit(); }}
        placeholder="输入指令发送给 CEO（全员编排）..."
        className="flex-1 bg-transparent border-none outline-none text-lg placeholder:text-[rgba(255,255,255,0.2)]"
        style={{ fontFamily: font.mono, color: T.text }}
      />
      <button
        onClick={handleSubmit}
        disabled={!input.trim()}
        className="px-3.5 py-1.5 text-sm font-medium rounded-lg cursor-pointer transition-all duration-200 hover:brightness-125 disabled:opacity-30 disabled:cursor-not-allowed"
        style={{
          fontFamily: font.heading,
          color: T.accent,
          background: T.accentGlow,
          border: '1px solid rgba(167,139,250,0.20)',
        }}
      >
        发送
      </button>
    </div>
  );
}

// ==========================================
// Right Sidebar
// ==========================================


function RightSidebar({ tasks, agents, prompt }: { tasks: ExecTask[]; agents: MonitorAgent[]; prompt: string }) {
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.status === 'done').length;
  const hasError = tasks.some(t => t.status === 'error');
  const allDone = totalTasks > 0 && completedTasks === totalTasks;
  const completedPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const getTaskStatusIcon = (status: ExecTask['status']) => {
    switch (status) {
      case 'done': return { icon: '✓', color: T.green, bg: T.greenBg, label: '已完成' };
      case 'running': return { icon: '●', color: T.yellow, bg: T.yellowBg, label: '进行中' };
      case 'error': return { icon: '✗', color: T.red, bg: T.redBg, label: '失败' };
      case 'waiting': return { icon: '○', color: T.textDim, bg: 'rgba(255,255,255,0.03)', label: '待分配' };
    }
  };

  return (
    <div
      className="w-[280px] shrink-0 flex flex-col overflow-hidden"
      style={{
        background: 'rgba(10,10,15,0.8)',
        backdropFilter: 'blur(16px)',
        borderLeft: `1px solid ${T.border}`,
      }}
    >
      <div className="px-4 py-3 text-sm font-semibold tracking-wider shrink-0" style={{ fontFamily: font.heading, color: T.textDim, borderBottom: `1px solid ${T.border}` }}>
        TASKS
      </div>
      <div className="flex-1 overflow-y-auto">
        {/* Task overview */}
        <div className="px-4 py-3" style={{ borderBottom: `1px solid ${T.border}` }}>
          <div className="text-sm mb-2 leading-relaxed" style={{ color: T.textMuted }}>
            {prompt}
          </div>
          <div className="flex items-center gap-3">
            {/* Progress ring */}
            <div className="relative w-10 h-10 shrink-0">
              <svg viewBox="0 0 36 36" className="w-10 h-10 -rotate-90">
                <circle cx="18" cy="18" r="14" fill="none" stroke={T.border} strokeWidth="3" />
                <circle cx="18" cy="18" r="14" fill="none"
                  stroke={hasError ? T.red : allDone ? T.green : T.accent}
                  strokeWidth="3"
                  strokeDasharray={`${(completedPercent / 100) * 88} 88`}
                  strokeLinecap="round"
                />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-xs font-bold tabular-nums" style={{ fontFamily: font.mono, color: T.text }}>
                {completedPercent}%
              </span>
            </div>
            <div>
              <div className="text-sm font-medium" style={{ color: allDone ? T.green : T.text }}>
                {allDone ? '全部完成' : '执行中'}
              </div>
              <div className="text-xs tabular-nums" style={{ fontFamily: font.mono, color: T.textDim }}>
                {completedTasks}/{totalTasks} 子任务完成
              </div>
            </div>
          </div>
        </div>

        {/* Task list */}
        <div className="px-4 py-3">
          <div className="text-xs font-semibold tracking-wide mb-3" style={{ color: T.textDim }}>
            TASK LIST
          </div>
          <div className="space-y-1">
            {tasks.map(task => {
              const taskStatus = getTaskStatusIcon(task.status);
              const agent = agents.find(a => a.id === task.agentId);
              return (
                <div
                  key={task.agentId}
                  className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg transition-colors"
                  style={{
                    background: task.status === 'running' ? taskStatus.bg : 'transparent',
                  }}
                >
                  {/* Status icon */}
                  <span
                    className={cn('text-sm shrink-0 w-4 text-center', task.status === 'running' && 'animate-pulse')}
                    style={{ color: taskStatus.color }}
                  >
                    {taskStatus.icon}
                  </span>
                  {/* Description + agent */}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm truncate" style={{ color: task.status === 'done' ? T.textDim : T.textMuted }}>
                      {task.description}
                    </div>
                  </div>
                  {/* Agent tag */}
                  <span
                    className="text-xs px-1.5 py-0.5 rounded shrink-0 font-medium"
                    style={{
                      color: agent?.color || T.textDim,
                      background: `${agent?.color || 'rgba(255,255,255,0.1)'}15`,
                    }}
                  >
                    {agent?.nameEn || task.agentId}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// Main Page — Version C: Enhanced Monitor
// ==========================================

export default function TeamStudioV3() {
  const [agents, setAgents] = useState<MonitorAgent[]>([]);
  const [execTasks, setExecTasks] = useState<ExecTask[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
  const [highlightAgent, setHighlightAgent] = useState<string | null>(null);
  const [terminalOpen, setTerminalOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [taskStartTime] = useState(() => new Date(Date.now() - 65000));
  const [taskPrompt, setTaskPrompt] = useState('');

  const agentRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Fetch team state from API
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/team-studio');
        const json = await res.json() as { success: boolean; data?: { agents?: MonitorAgent[]; tasks?: ExecTask[]; logs?: LogEntry[]; prompt?: string } };
        if (json.success && json.data) {
          if (json.data.agents) setAgents(json.data.agents);
          if (json.data.tasks) setExecTasks(json.data.tasks);
          if (json.data.logs) setLogs(json.data.logs);
          if (json.data.prompt) setTaskPrompt(json.data.prompt);
        }
      } catch {
        // empty state on error
      }
    })();
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const toggleSelect = useCallback((agentId: string) => {
    setSelectedAgent(prev => prev === agentId ? null : agentId);
  }, []);

  const scrollToAgent = useCallback((agentId: string) => {
    agentRefs.current[agentId]?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    setHighlightAgent(agentId);
    setTimeout(() => setHighlightAgent(null), 800);
  }, []);

  const execTimeStr = (() => {
    const diffMs = currentTime.getTime() - taskStartTime.getTime();
    const totalSec = Math.max(0, Math.floor(diffMs / 1000));
    const h = String(Math.floor(totalSec / 3600)).padStart(2, '0');
    const m = String(Math.floor((totalSec % 3600) / 60)).padStart(2, '0');
    const s = String(totalSec % 60).padStart(2, '0');
    return `${h}:${m}:${s}`;
  })();

  const handleSend = useCallback((_msg: string) => {
    // Mock — no-op
  }, []);

  return (
    <div className="h-full flex flex-col -m-6 overflow-hidden" style={{ background: T.pageBg, color: T.text, fontFamily: font.body }}>
      {/* Inject keyframes */}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes monitor-progress {
          0% { transform: translateX(-100%); }
          50% { transform: translateX(150%); }
          100% { transform: translateX(-100%); }
        }
        @keyframes highlight-flash {
          0%, 100% { box-shadow: none; }
          50% { box-shadow: 0 0 0 2px var(--flash-color, #a78bfa), 0 0 16px color-mix(in srgb, var(--flash-color, #a78bfa) 25%, transparent); }
        }
        .animate-highlight-flash {
          animation: highlight-flash 0.4s ease-in-out 2;
        }
        @keyframes detail-panel-slide {
          from { height: 0; opacity: 0; }
          to { height: 250px; opacity: 1; }
        }
      `}} />

      {/* Subtle radial glow */}
      <div className="absolute inset-0 pointer-events-none" style={{ background: `radial-gradient(800px circle at 30% 20%, ${T.accentGlow}, transparent 60%)` }} />

      {/* TOP BAR */}
      <div
        className="relative z-10 shrink-0"
        style={{
          background: 'rgba(19,19,27,0.75)',
          backdropFilter: 'blur(20px) saturate(1.2)',
          borderBottom: `1px solid ${T.border}`,
        }}
      >
        <div className="flex items-center gap-3 px-5 h-11">
          <span className="w-2 h-2 rounded-full shrink-0 animate-pulse" style={{ background: T.green, boxShadow: `0 0 6px ${T.green}` }} />
          <span className="text-sm font-semibold px-1.5 py-0.5 rounded shrink-0" style={{ color: '#22d3ee', background: 'rgba(34,211,238,0.10)' }}>TEAM</span>
          <span className="text-[11px] px-2 py-0.5 rounded-full font-medium shrink-0" style={{ background: 'rgba(34,211,238,0.08)', color: '#22d3ee' }}>
            Agent Team Mode
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-lg truncate" style={{ fontFamily: font.body, color: T.text }}>
              {taskPrompt || 'Waiting for task...'}
            </p>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-sm" style={{ color: T.textDim }}>⏱</span>
            <span className="text-sm tabular-nums" style={{ fontFamily: font.mono, color: T.textMuted }}>{execTimeStr}</span>
          </div>
          <button
            className="px-2.5 py-1 text-sm font-medium rounded-md cursor-pointer transition-all duration-200 hover:brightness-125"
            style={{ fontFamily: font.heading, color: T.textMuted, background: 'rgba(255,255,255,0.04)', border: `1px solid ${T.border}` }}
          >
            ↻
          </button>
          <button
            className="flex items-center gap-1 px-2.5 py-1 text-sm font-medium rounded-md cursor-pointer transition-all duration-200 hover:brightness-125"
            style={{ fontFamily: font.heading, color: T.red, background: T.redBg, border: `1px solid ${T.red}20` }}
          >
            ■ Stop
          </button>
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div className="relative z-10 flex-1 flex overflow-hidden">
        {/* Left: main content area */}
        <div className="flex-1 flex flex-col overflow-hidden min-w-0">
          {/* Agent State Cards — hide offline, sort by status (busy > online > offline) */}
          {(() => {
            if (agents.length === 0) {
              return (
                <div className="shrink-0 p-8 flex items-center justify-center" style={{ borderBottom: `1px solid ${T.border}` }}>
                  <div className="text-center">
                    <p className="text-sm font-medium" style={{ color: T.textMuted }}>No agents active</p>
                    <p className="text-xs mt-1" style={{ color: T.textDim }}>Execute a task to see agents working here</p>
                  </div>
                </div>
              );
            }
            const dispatchedIds = new Set(execTasks.map(t => t.agentId));
            const statusOrder: Record<AgentStatus, number> = { busy: 0, online: 1, offline: 2 };
            const visibleAgents = agents
              .filter(a => a.status !== 'offline' || dispatchedIds.has(a.id))
              .sort((a, b) => statusOrder[a.status] - statusOrder[b.status]);
            return (
              <div className="shrink-0 p-4 pb-2 overflow-y-auto" style={{ borderBottom: selectedAgent ? 'none' : `1px solid ${T.border}`, maxHeight: '45%' }}>
                <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
                  {visibleAgents.map(agent => {
                    const execTask = execTasks.find(t => t.agentId === agent.id);
                    return (
                      <AgentStateCard
                        key={agent.id}
                        agent={agent}
                        logs={logs.filter(l => l.source.includes(agent.id))}
                        execTask={execTask}
                        allExecTasks={execTasks}
                        allAgents={agents}
                        selected={selectedAgent === agent.id}
                        highlighted={highlightAgent === agent.id}
                        onSelect={() => toggleSelect(agent.id)}
                        cardRef={(el) => { agentRefs.current[agent.id] = el; }}
                      />
                    );
                  })}
                </div>
              </div>
            );
          })()}

          {/* Detail Panel — between grid and command input */}
          {selectedAgent && (() => {
            const agent = agents.find(a => a.id === selectedAgent);
            if (!agent) return null;
            const execTask = execTasks.find(t => t.agentId === selectedAgent);
            return (
              <DetailPanel
                key={selectedAgent}
                agent={agent}
                execTask={execTask}
                onClose={() => setSelectedAgent(null)}
              />
            );
          })()}

          {/* Command Input — below detail panel */}
          <CommandInputBar onSend={handleSend} />

          {/* Terminal — collapsible, default folded, at bottom */}
          <div className={cn('flex flex-col overflow-hidden transition-all duration-300', terminalOpen ? 'flex-1' : 'shrink-0')}>
            {/* Terminal header — clickable to toggle */}
            <button
              onClick={() => setTerminalOpen(!terminalOpen)}
              className="flex items-center justify-between px-4 py-2 shrink-0 w-full text-left cursor-pointer hover:bg-[rgba(255,255,255,0.02)] transition-colors"
              style={{ borderTop: `1px solid ${T.border}`, borderBottom: terminalOpen ? `1px solid ${T.border}` : 'none' }}
            >
              <div className="flex items-center gap-2">
                <span className="text-sm" style={{ color: T.textDim }}>●</span>
                <span className="text-sm font-semibold tracking-wide" style={{ fontFamily: font.heading, color: T.textMuted }}>Terminal</span>
                <span className="text-sm tabular-nums" style={{ fontFamily: font.mono, color: T.textDim }}>{logs.length} events</span>
              </div>
              {!terminalOpen && logs.length > 0 && (
                <span className="flex-1 mx-3 text-sm truncate" style={{ fontFamily: font.mono, color: T.textDim }}>
                  {logs[logs.length - 1].message}
                </span>
              )}
              <svg
                className={cn('w-3.5 h-3.5 transition-transform duration-200 shrink-0', terminalOpen && 'rotate-180')}
                style={{ color: T.textDim }}
                fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {/* Log stream — only rendered when open */}
            {terminalOpen && (
              <TerminalLogStream logs={logs} agents={agents} onAgentClick={scrollToAgent} />
            )}
          </div>
        </div>

        {/* Right: Sidebar */}
        <div className="hidden lg:flex">
          <RightSidebar tasks={execTasks} agents={agents} prompt={taskPrompt || 'Waiting for task...'} />
        </div>
      </div>
    </div>
  );
}
