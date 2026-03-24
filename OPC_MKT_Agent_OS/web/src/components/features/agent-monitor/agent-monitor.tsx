'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { useAgentChatMonitor } from './use-agent-chat-monitor';
import type { MonitorAgent, LogEntry, AgentStatus } from './types';
import { PixelAgentSVG } from './pixel-agents';

// Inject monitor-specific keyframes
const monitorStyles = `
@keyframes monitor-progress {
  0% { transform: translateX(-100%); }
  50% { transform: translateX(150%); }
  100% { transform: translateX(-100%); }
}
`;

function MonitorStyles() {
  return <style dangerouslySetInnerHTML={{ __html: monitorStyles }} />;
}

// ==========================================
// Design tokens — Polsia-inspired
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

const AGENT_CHAT_BASE = 'http://localhost:3001';

// Fallback prompts for direct API calls (when not delegated to Team Studio)
const AGENTS_FALLBACK = {
  ceo: '你是 Marketing Agent OS 的 CEO Agent，营销团队负责人。你管理 3 个子 Agent。用中文回复。',
};

// ==========================================
// Status mapping — tool → display text
// ==========================================
function getStatusText(agent: MonitorAgent): string {
  if (agent.status === 'offline') return '离线';
  if (agent.status === 'online') return '待命中';
  // busy
  const tool = agent.currentTool;
  if (!tool) return '思考中...';
  if (tool.includes('Read') || tool.includes('read')) return '阅读文件';
  if (tool.includes('Write') || tool.includes('write')) return '写方案';
  if (tool.includes('Bash') || tool.includes('bash')) return '执行命令';
  if (tool.includes('Agent') || tool.includes('SendMessage')) return '分配任务';
  if (tool.includes('Grep') || tool.includes('grep') || tool.includes('Search') || tool.includes('search')) return '搜索资料';
  if (tool.includes('Edit') || tool.includes('edit')) return '编辑文件';
  if (tool.includes('WebFetch') || tool.includes('WebSearch')) return '搜索网络';
  return `使用 ${tool}`;
}

function getStatusEmoji(agent: MonitorAgent): string {
  if (agent.status === 'offline') return '😴';
  if (agent.status === 'online') return '🧘';
  // busy
  const tool = agent.currentTool;
  if (!tool) return '🤔';
  if (tool.includes('Read') || tool.includes('read')) return '📖';
  if (tool.includes('Write') || tool.includes('write')) return '✍️';
  if (tool.includes('Bash') || tool.includes('bash')) return '⚡';
  if (tool.includes('Agent') || tool.includes('SendMessage')) return '📢';
  if (tool.includes('Grep') || tool.includes('Search') || tool.includes('search')) return '🔍';
  if (tool.includes('approval')) return '🙋';
  return '💻';
}

function getStatusColor(status: AgentStatus): { color: string; bg: string; label: string } {
  switch (status) {
    case 'busy': return { color: T.yellow, bg: T.yellowBg, label: '工作中' };
    case 'online': return { color: T.green, bg: T.greenBg, label: '空闲' };
    case 'offline': return { color: T.textDim, bg: 'rgba(255,255,255,0.03)', label: '离线' };
  }
}

// ==========================================
// Agent State Card (top row)
// ==========================================

function AgentStateCard({ agent, logs }: { agent: MonitorAgent; logs: LogEntry[] }) {
  const isOffline = agent.status === 'offline';
  const isBusy = agent.status === 'busy';
  const statusText = getStatusText(agent);
  const statusEmoji = getStatusEmoji(agent);
  const statusStyle = getStatusColor(agent.status);

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

  return (
    <div
      className={cn(
        'rounded-2xl p-5 transition-all duration-300 flex flex-col gap-4 min-w-0 relative overflow-hidden',
        isOffline && 'opacity-40',
      )}
      style={{
        background: T.cardBg,
        border: `1px solid ${isBusy ? `${agent.color}40` : T.border}`,
        borderTop: `3px solid ${agent.color}`,
        boxShadow: isBusy ? `0 0 20px ${agent.color}15, inset 0 0 30px ${agent.color}05` : 'none',
      }}
    >
      {/* Busy glow overlay */}
      {isBusy && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `radial-gradient(ellipse at 50% 0%, ${agent.color}12, transparent 70%)`,
          }}
        />
      )}

      {/* Avatar (pixel art) + Status */}
      <div className="flex items-center justify-between relative z-10">
        <div className="flex items-center gap-4">
          <div
            className={cn(
              'w-16 h-16 rounded-xl flex items-center justify-center shrink-0 relative overflow-hidden transition-all duration-300',
              isBusy && 'scale-105',
            )}
            style={{
              background: `${agent.color}10`,
              border: `1px solid ${agent.color}25`,
            }}
          >
            <PixelAgentSVG
              agentId={agent.id as 'ceo' | 'xhs-agent' | 'growth-agent' | 'brand-reviewer'}
              status={agent.status}
              className="w-12 h-12"
            />
            {/* Status dot */}
            <span
              className={cn(
                'absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2',
                isBusy && 'animate-pulse',
              )}
              style={{
                background: statusStyle.color,
                borderColor: T.cardBg,
                boxShadow: `0 0 8px ${statusStyle.color}60`,
              }}
            />
          </div>
          <div className="min-w-0">
            <div
              className="text-lg font-bold truncate"
              style={{ fontFamily: font.heading, color: '#ffffff' }}
            >
              {agent.nameEn}
            </div>
            <div
              className="text-sm truncate"
              style={{ fontFamily: font.body, color: '#ffffff' }}
            >
              {agent.name}
            </div>
          </div>
        </div>

        {/* Status icon + tag stacked */}
        <div className="flex flex-col items-center gap-1.5 shrink-0">
          <span className={cn('text-lg opacity-70 transition-transform', isBusy && 'animate-bounce')} title={statusText}>{statusEmoji}</span>
          <span
            className="px-3 py-1 rounded-full text-sm font-medium whitespace-nowrap"
            style={{ color: statusStyle.color, background: statusStyle.bg }}
          >
            {statusText}
          </span>
          {agent.currentTool && agent.toolCallCount != null && agent.toolCallCount > 0 && (
            <span
              className="text-sm tabular-nums"
              style={{ fontFamily: font.mono, color: T.textDim }}
            >
              x{agent.toolCallCount}
            </span>
          )}
        </div>
      </div>

      {/* Activity progress bar — animated when busy */}
      {isBusy && (
        <div className="relative z-10 h-1 rounded-full overflow-hidden" style={{ background: `${agent.color}15` }}>
          <div
            className="h-full rounded-full"
            style={{
              background: `linear-gradient(90deg, ${agent.color}60, ${agent.color}, ${agent.color}60)`,
              animation: 'monitor-progress 2s ease-in-out infinite',
              width: '40%',
            }}
          />
        </div>
      )}

      {/* Current tool display — when busy */}
      {isBusy && agent.currentTool && (
        <div
          className="relative z-10 flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-sm"
          style={{
            background: `${agent.color}10`,
            border: `1px solid ${agent.color}20`,
            fontFamily: font.mono,
            color: agent.color,
          }}
        >
          <span className="animate-spin inline-block" style={{ animationDuration: '2s' }}>&#9881;</span>
          <span className="truncate">{agent.currentTool}</span>
          {agent.currentToolInput && (
            <span className="truncate opacity-60 text-xs">{agent.currentToolInput.slice(0, 40)}</span>
          )}
        </div>
      )}

      {/* Latest activity — one line */}
      {latestActivity && (
        <div
          className="relative z-10 text-sm truncate leading-relaxed"
          style={{ fontFamily: font.body, color: T.textMuted }}
        >
          {latestActivity}
        </div>
      )}
    </div>
  );
}

// ==========================================
// Terminal Log Stream (middle area)
// ==========================================

function TerminalLogStream({ logs, agents }: { logs: LogEntry[]; agents: MonitorAgent[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const shouldAutoScroll = useRef(true);

  // Track user scroll position
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

  // Build agent name lookup
  const agentNameMap: Record<string, { name: string; color: string }> = {};
  for (const a of agents) {
    agentNameMap[a.id] = { name: a.nameEn, color: a.color };
  }

  const getSourceDisplay = (source: string) => {
    // Parse source like "send:ceo", "tool:xhs", "recv:growth", "agent:xhs-agent"
    const parts = source.split(':');
    const agentId = parts[1] || parts[0];
    const info = agentNameMap[agentId];
    const prefix = parts[0] === 'tool' ? '⚙ '
      : parts[0] === 'send' ? '→ '
      : parts[0] === 'agent' ? '● '
      : '';
    return {
      label: `${prefix}${info?.name || source}`,
      color: info?.color || T.textDim,
    };
  };

  // Detect agent-to-agent messages: "CEO → XHS: ..."
  const isInterAgentMsg = (log: LogEntry) => {
    return log.source.startsWith('send:') || log.message.includes('→');
  };

  // Detect approval/warning
  const isApproval = (log: LogEntry) => {
    return log.level === 'warn' || log.message.includes('approval') || log.message.includes('确认') || log.message.includes('⚠');
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
            <div className="text-sm" style={{ color: T.textDim }}>
              等待 Agent 活动...
            </div>
          </div>
        </div>
      ) : (
        logs.slice(-80).map((log) => {
          const time = new Date(log.timestamp);
          const timeStr = time.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
          const sourceDisplay = getSourceDisplay(log.source);
          const isTransfer = isInterAgentMsg(log);
          const isWarn = isApproval(log);

          return (
            <div
              key={log.id}
              className={cn(
                'flex gap-2 px-3 py-[4px] text-sm leading-[1.8] rounded transition-colors',
                isWarn && 'rounded-md my-0.5',
              )}
              style={{
                background: isWarn
                  ? T.orangeBg
                  : isTransfer
                    ? 'rgba(167,139,250,0.04)'
                    : 'transparent',
                borderLeft: isWarn ? `2px solid ${T.orange}` : isTransfer ? `2px solid ${sourceDisplay.color}40` : '2px solid transparent',
              }}
            >
              {/* Timestamp */}
              <span className="shrink-0 tabular-nums select-none" style={{ color: T.textDim, fontSize: '14px' }}>
                {timeStr}
              </span>

              {/* Source badge */}
              <span
                className="shrink-0 font-medium select-none"
                style={{ color: sourceDisplay.color, fontSize: '14px' }}
              >
                [{sourceDisplay.label}]
              </span>

              {/* Message */}
              <span
                className="break-all text-sm"
                style={{
                  color: isWarn ? T.orange : log.level === 'error' ? T.red : T.textMuted,
                }}
              >
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
// Command Input Bar (bottom)
// ==========================================

function CommandInputBar({ onSend }: { onSend: (msg: string) => void }) {
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async () => {
    const trimmed = input.trim();
    if (!trimmed || sending) return;
    setSending(true);
    try {
      onSend(trimmed);
      setInput('');
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  };

  return (
    <div
      className="shrink-0 flex items-center gap-3 px-4 py-3"
      style={{
        background: 'rgba(10,10,15,0.9)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderTop: `1px solid ${T.border}`,
      }}
    >
      <span className="text-lg shrink-0 select-none" style={{ color: T.accent, fontFamily: font.mono }}>
        $
      </span>
      <input
        ref={inputRef}
        type="text"
        value={input}
        onChange={e => setInput(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') handleSubmit(); }}
        placeholder="输入指令发送给 CEO（全员编排）..."
        className="flex-1 bg-transparent border-none outline-none text-lg placeholder:text-[rgba(255,255,255,0.2)]"
        style={{ fontFamily: font.mono, color: T.text }}
        disabled={sending}
      />
      <button
        onClick={handleSubmit}
        disabled={!input.trim() || sending}
        className="px-3.5 py-1.5 text-sm font-medium rounded-lg cursor-pointer transition-all duration-200 hover:brightness-125 disabled:opacity-30 disabled:cursor-not-allowed"
        style={{
          fontFamily: font.heading,
          color: T.accent,
          background: T.accentGlow,
          border: `1px solid rgba(167,139,250,0.20)`,
        }}
      >
        {sending ? '...' : '发送'}
      </button>
    </div>
  );
}

// ==========================================
// Right Sidebar — Progress + Context + Skills
// ==========================================

function SidebarSection({
  title,
  icon,
  defaultOpen = true,
  children,
}: {
  title: string;
  icon: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div style={{ borderBottom: `1px solid ${T.border}` }}>
      <button
        className="flex items-center justify-between w-full px-4 py-3 text-left cursor-pointer select-none transition-colors hover:bg-[rgba(255,255,255,0.02)]"
        onClick={() => setOpen(!open)}
      >
        <span className="flex items-center gap-2 text-sm font-semibold tracking-wide" style={{ color: T.textMuted }}>
          <span className="text-sm">{icon}</span>
          {title}
        </span>
        <svg
          className={cn('w-3.5 h-3.5 transition-transform duration-200', open && 'rotate-180')}
          style={{ color: T.textDim }}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <div className="px-4 pb-3">
          {children}
        </div>
      )}
    </div>
  );
}

function RightSidebar({ agents, logs }: { agents: MonitorAgent[]; logs: LogEntry[] }) {
  // Simulated task progress from agent states
  const totalAgents = agents.length;
  const busyCount = agents.filter(a => a.status === 'busy').length;
  const onlineCount = agents.filter(a => a.status === 'online').length;
  const offlineCount = agents.filter(a => a.status === 'offline').length;

  const contextFiles = [
    { name: 'brand-voice.md', status: 'loaded' as const },
    { name: 'target-audience.md', status: 'loaded' as const },
    { name: 'content-calendar.json', status: 'loaded' as const },
    { name: 'creatorflow-api.md', status: 'loaded' as const },
  ];

  const skillFiles = [
    { name: 'xhs.SKILL.md', agent: 'XHS', color: '#ff2442' },
    { name: 'growth.SKILL.md', agent: 'Growth', color: '#00cec9' },
    { name: 'brand-reviewer.SKILL.md', agent: 'Reviewer', color: '#a855f7' },
  ];

  return (
    <div
      className="w-[280px] shrink-0 flex flex-col overflow-hidden"
      style={{
        background: 'rgba(10,10,15,0.8)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderLeft: `1px solid ${T.border}`,
      }}
    >
      {/* Header */}
      <div
        className="px-4 py-3 text-sm font-semibold tracking-wider shrink-0"
        style={{ fontFamily: font.heading, color: T.textDim, borderBottom: `1px solid ${T.border}` }}
      >
        WORKSPACE
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Progress */}
        <SidebarSection title="Progress" icon="📊">
          <div className="space-y-2.5">
            {/* Agent status summary */}
            <div className="flex items-center gap-3">
              {/* Mini progress ring */}
              <div className="relative w-12 h-12 shrink-0">
                <svg viewBox="0 0 36 36" className="w-12 h-12 -rotate-90">
                  <circle cx="18" cy="18" r="14" fill="none" stroke={T.border} strokeWidth="3" />
                  <circle
                    cx="18" cy="18" r="14" fill="none"
                    stroke={T.green}
                    strokeWidth="3"
                    strokeDasharray={`${((busyCount + onlineCount) / Math.max(totalAgents, 1)) * 88} 88`}
                    strokeLinecap="round"
                  />
                </svg>
                <span
                  className="absolute inset-0 flex items-center justify-center text-sm font-bold"
                  style={{ color: T.text }}
                >
                  {busyCount + onlineCount}/{totalAgents}
                </span>
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: T.yellow }} />
                  <span className="text-sm" style={{ color: T.textMuted }}>{busyCount} 工作中</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: T.green }} />
                  <span className="text-sm" style={{ color: T.textMuted }}>{onlineCount} 空闲</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: T.textDim }} />
                  <span className="text-sm" style={{ color: T.textDim }}>{offlineCount} 离线</span>
                </div>
              </div>
            </div>

            {/* Event count */}
            <div className="flex justify-between text-sm pt-1" style={{ borderTop: `1px solid ${T.border}` }}>
              <span style={{ color: T.textDim }}>总事件</span>
              <span className="tabular-nums" style={{ fontFamily: font.mono, color: T.accent }}>
                {logs.length}
              </span>
            </div>
          </div>
        </SidebarSection>

        {/* Context */}
        <SidebarSection title="Context" icon="📁">
          <div className="space-y-1.5">
            {contextFiles.map(f => (
              <div key={f.name} className="flex items-center gap-2 text-sm">
                <span style={{ color: f.status === 'loaded' ? T.green : T.textDim }}>
                  {f.status === 'loaded' ? '✓' : '○'}
                </span>
                <span
                  className="truncate"
                  style={{ fontFamily: font.mono, color: f.status === 'loaded' ? T.textMuted : T.textDim }}
                >
                  {f.name}
                </span>
              </div>
            ))}
          </div>
        </SidebarSection>

        {/* Skills */}
        <SidebarSection title="Skills" icon="⚡">
          <div className="space-y-1.5">
            {skillFiles.map(f => (
              <div key={f.name} className="flex items-center gap-2 text-sm">
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ background: f.color }}
                />
                <span className="truncate" style={{ fontFamily: font.mono, color: T.textMuted }}>
                  {f.name}
                </span>
                <span
                  className="ml-auto text-xs px-1.5 py-0.5 rounded shrink-0"
                  style={{ color: f.color, background: `${f.color}15` }}
                >
                  {f.agent}
                </span>
              </div>
            ))}
          </div>
        </SidebarSection>

        {/* Connection info */}
        <SidebarSection title="Connection" icon="🔗" defaultOpen={false}>
          <div className="space-y-1.5 text-sm">
            <div className="flex justify-between">
              <span style={{ color: T.textDim }}>Source</span>
              <span className="tabular-nums" style={{ fontFamily: font.mono, color: T.accent }}>
                localhost:3001
              </span>
            </div>
          </div>
        </SidebarSection>
      </div>
    </div>
  );
}

// ==========================================
// Offline Screen
// ==========================================

function OfflineScreen({ error }: { error: string | null }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-5 text-center px-8">
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(600px circle at 50% 40%, ${T.accentGlow}, transparent 70%)`,
        }}
      />
      <div className="text-5xl opacity-20">📡</div>
      <div
        className="text-lg font-semibold tracking-wide"
        style={{ fontFamily: font.heading, color: T.textMuted }}
      >
        Connecting to Agent Chat...
      </div>
      <div className="text-sm max-w-[360px]" style={{ fontFamily: font.body, color: T.textDim }}>
        确保 Agent Chat 正在运行于{' '}
        <span style={{ color: T.accent }}>localhost:3001</span>
      </div>
      {error && (
        <div
          className="text-sm rounded-lg px-4 py-2.5 mt-2"
          style={{ fontFamily: font.body, color: T.red, background: T.redBg, border: `1px solid ${T.red}20` }}
        >
          {error}
        </div>
      )}
    </div>
  );
}

// ==========================================
// Main Component
// ==========================================

/** Execution state from Team Studio execute mode */
export interface ExecOverlayTask {
  agentId: string;
  status: 'waiting' | 'running' | 'done' | 'error';
  progress: number;
  currentTool?: string;
  toolCallCount: number;
  description: string;
  content: string;
}

export interface ExecOverlayState {
  isRunning: boolean;
  tasks: ExecOverlayTask[];
}

export function AgentMonitor({ taskSummary, onStopTeam, teamLaunched, onSendMessage, execOverlay }: {
  taskSummary?: string;
  onStopTeam?: () => void;
  teamLaunched?: boolean;
  onSendMessage?: (message: string) => void;
  execOverlay?: ExecOverlayState;
}) {
  const { data, connected, error, sseActive, refresh } = useAgentChatMonitor();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [taskStartTime] = useState(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const rawAgents = data?.agents ?? [];

  // Overlay execution state onto agents — if exec mode is running, update matching agents
  const agents: MonitorAgent[] = rawAgents.map(agent => {
    if (!execOverlay?.isRunning) return agent;
    const execTask = execOverlay.tasks.find(t => t.agentId === agent.id);
    if (!execTask) return agent;
    // Map exec task status to monitor agent status
    const status: AgentStatus = execTask.status === 'running' ? 'busy'
      : execTask.status === 'done' || execTask.status === 'error' ? 'online'
      : agent.status;
    return {
      ...agent,
      status,
      currentTool: execTask.currentTool ?? agent.currentTool,
      currentToolInput: execTask.description,
      toolCallCount: execTask.toolCallCount,
    };
  });

  // Add exec agents not in rawAgents (e.g. agents not registered in agent-chat monitor)
  if (execOverlay?.isRunning) {
    const existingIds = new Set(agents.map(a => a.id));
    for (const execTask of execOverlay.tasks) {
      if (!existingIds.has(execTask.agentId)) {
        const status: AgentStatus = execTask.status === 'running' ? 'busy'
          : execTask.status === 'done' || execTask.status === 'error' ? 'online'
          : 'offline';
        agents.push({
          id: execTask.agentId,
          name: execTask.description || execTask.agentId,
          nameEn: execTask.agentId.replace(/-agent$/, '').toUpperCase(),
          role: 'specialist',
          color: '#a78bfa',
          avatar: execTask.agentId.slice(0, 3).toUpperCase(),
          status,
          currentTool: execTask.currentTool,
          currentToolInput: execTask.description,
          toolCallCount: execTask.toolCallCount,
        });
      }
    }
  }

  // Merge all logs for terminal stream
  const allLogs: LogEntry[] = [];
  if (data) {
    allLogs.push(...data.globalLogs);
    for (const logs of Object.values(data.agentLogs)) {
      allLogs.push(...logs);
    }
    // Deduplicate by id
    const seen = new Set<number>();
    const unique: LogEntry[] = [];
    for (const log of allLogs) {
      if (!seen.has(log.id)) {
        seen.add(log.id);
        unique.push(log);
      }
    }
    unique.sort((a, b) => a.timestamp - b.timestamp);
    allLogs.length = 0;
    allLogs.push(...unique);
  }

  // Send command — delegate to parent (Team Studio chat logic) or direct API call
  const handleSendCommand = useCallback(async (message: string) => {
    if (onSendMessage) {
      // Delegate to Team Studio's chat handler which has proper agent routing
      onSendMessage(message);
      return;
    }
    // Fallback: direct API call to CEO agent
    try {
      const ceoPrompt = AGENTS_FALLBACK.ceo;
      await fetch(`${AGENT_CHAT_BASE}/api/chat-sdk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemPrompt: ceoPrompt,
          conversationHistory: '',
          userMessage: message,
          agentName: 'ceo',
        }),
      });
    } catch {
      // Will show in event stream
    }
  }, [onSendMessage]);

  // Execution time since task start
  const execTimeStr = (() => {
    const diffMs = currentTime.getTime() - taskStartTime.getTime();
    const totalSec = Math.max(0, Math.floor(diffMs / 1000));
    const h = String(Math.floor(totalSec / 3600)).padStart(2, '0');
    const m = String(Math.floor((totalSec % 3600) / 60)).padStart(2, '0');
    const s = String(totalSec % 60).padStart(2, '0');
    return `${h}:${m}:${s}`;
  })();

  // Connection indicator color
  const connColor = connected ? T.green : T.red;

  return (
    <div
      className="flex flex-col h-full overflow-hidden relative"
      style={{ background: T.pageBg, color: T.text, fontFamily: font.body }}
    >
      <MonitorStyles />
      {/* Subtle radial glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(800px circle at 30% 20%, ${T.accentGlow}, transparent 60%)`,
        }}
      />

      {/* ═══ TOP BAR — task overview + controls ═══ */}
      <div
        className="relative z-10 shrink-0"
        style={{
          background: 'rgba(19,19,27,0.75)',
          backdropFilter: 'blur(20px) saturate(1.2)',
          WebkitBackdropFilter: 'blur(20px) saturate(1.2)',
          borderBottom: `1px solid ${T.border}`,
        }}
      >
        {/* Task overview row */}
        <div className="flex items-center gap-3 px-5 h-11">
          {/* Connection + Task summary */}
          <span
            className={cn('w-2 h-2 rounded-full shrink-0', connected && 'animate-pulse')}
            style={{ background: connColor, boxShadow: `0 0 6px ${connColor}` }}
          />
          {connected && sseActive && (
            <span className="text-sm font-semibold px-1.5 py-0.5 rounded shrink-0" style={{ color: T.accent, background: T.accentGlow }}>
              LIVE
            </span>
          )}
          <div className="flex-1 min-w-0">
            <p
              className="text-lg truncate"
              style={{ fontFamily: font.body, color: taskSummary ? T.text : T.textDim }}
            >
              {taskSummary || '等待任务指令...'}
            </p>
          </div>

          {/* Execution time */}
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-sm" style={{ color: T.textDim }}>⏱</span>
            <span
              className="text-sm tabular-nums"
              style={{ fontFamily: font.mono, color: T.textMuted }}
            >
              {execTimeStr}
            </span>
          </div>

          {/* Refresh + Stop — same row */}
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={refresh}
              className="px-2.5 py-1 text-sm font-medium rounded-md cursor-pointer transition-all duration-200 hover:brightness-125"
              style={{
                fontFamily: font.heading,
                color: T.textMuted,
                background: 'rgba(255,255,255,0.04)',
                border: `1px solid ${T.border}`,
              }}
              title="刷新"
            >
              ↻
            </button>
            {teamLaunched && onStopTeam && (
              <button
                onClick={onStopTeam}
                className="flex items-center gap-1 px-2.5 py-1 text-sm font-medium rounded-md cursor-pointer transition-all duration-200 hover:brightness-125"
                style={{
                  fontFamily: font.heading,
                  color: T.red,
                  background: T.redBg,
                  border: `1px solid ${T.red}20`,
                }}
                title="停止团队"
              >
                ■ Stop
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ═══ MAIN CONTENT ═══ */}
      {!connected ? (
        <OfflineScreen error={error} />
      ) : (
        <div className="relative z-10 flex-1 flex overflow-hidden">
          {/* ── Left: main content area ── */}
          <div className="flex-1 flex flex-col overflow-hidden min-w-0">
            {/* Top: Agent State Cards */}
            <div
              className="shrink-0 p-4 pb-2"
              style={{ borderBottom: `1px solid ${T.border}` }}
            >
              <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
                {agents.map((agent) => (
                  <AgentStateCard
                    key={agent.id}
                    agent={agent}
                    logs={data?.agentLogs[agent.id] ?? []}
                  />
                ))}
              </div>
            </div>

            {/* Middle: Terminal log stream */}
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Terminal header */}
              <div
                className="flex items-center justify-between px-4 py-2 shrink-0"
                style={{ borderBottom: `1px solid ${T.border}` }}
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm" style={{ color: T.textDim }}>●</span>
                  <span
                    className="text-sm font-semibold tracking-wide"
                    style={{ fontFamily: font.heading, color: T.textMuted }}
                  >
                    Terminal
                  </span>
                </div>
                <span
                  className="text-sm tabular-nums"
                  style={{ fontFamily: font.mono, color: T.textDim }}
                >
                  {allLogs.length} events
                </span>
              </div>

              {/* Log stream */}
              <TerminalLogStream logs={allLogs} agents={agents} />
            </div>

            {/* Bottom: Command input */}
            <CommandInputBar onSend={handleSendCommand} />
          </div>

          {/* ── Right: Sidebar ── */}
          <div className="hidden lg:flex">
            <RightSidebar agents={agents} logs={allLogs} />
          </div>
        </div>
      )}
    </div>
  );
}
