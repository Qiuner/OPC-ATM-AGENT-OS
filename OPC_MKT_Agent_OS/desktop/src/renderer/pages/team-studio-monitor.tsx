import { useState, useEffect, useRef, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { RPGScene } from '@/components/features/agent-monitor/rpg-scene';
import { PixelAgentSVG, type MarketingAgentId } from '@/components/features/agent-monitor/pixel-agents';
import { getApi } from '@/lib/ipc';

// ==========================================
// Design tokens — Cotify dark theme
// ==========================================

const T = {
  pageBg: 'var(--background)',
  cardBg: 'var(--card)',
  border: 'var(--border)',
  text: 'var(--foreground)',
  textMuted: 'var(--muted-foreground)',
  textDim: 'color-mix(in srgb, var(--foreground) 30%, transparent)',
  accent: 'var(--primary)',
  accentGlow: 'color-mix(in srgb, var(--primary) 8%, transparent)',
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
// All known pixel agent IDs
// ==========================================

const ALL_PIXEL_AGENT_IDS = new Set<string>([
  'ceo', 'xhs-agent', 'growth-agent', 'brand-reviewer',
  'analyst-agent', 'podcast-agent', 'visual-agent', 'strategist-agent',
  'email-agent', 'seo-expert-agent', 'geo-expert-agent', 'x-twitter-agent',
  'meta-ads-agent', 'global-content-agent',
]);


// ==========================================
// Detail Panel — slide-down between scene and command input
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
  const hasPixelArt = ALL_PIXEL_AGENT_IDS.has(agent.id);

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
            <div
              className="rounded-xl flex items-center justify-center shrink-0 relative overflow-hidden"
              style={{
                width: 40,
                height: 40,
                background: `${agent.color}10`,
                border: `1px solid ${agent.color}25`,
              }}
            >
              {hasPixelArt ? (
                <PixelAgentSVG
                  agentId={agent.id as MarketingAgentId}
                  status={agent.status}
                  className="w-8 h-8"
                />
              ) : (
                <span className="text-xs font-bold" style={{ color: agent.color }}>
                  {agent.avatar.slice(0, 2)}
                </span>
              )}
            </div>
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
        <div className="flex-1 overflow-y-auto px-4 py-3">
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
// Terminal Log Stream — with classification
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
// Main Page — RPG Agent Town Monitor
// ==========================================

export default function TeamStudioV3() {
  const [agents, setAgents] = useState<MonitorAgent[]>([]);
  const [execTasks] = useState<ExecTask[]>([]);
  const [logs] = useState<LogEntry[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
  const [terminalOpen, setTerminalOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [taskStartTime] = useState(() => new Date(Date.now() - 65000));
  const [taskPrompt] = useState('');

  // Agent visual registry — maps IPC agent IDs to display info
  const AGENT_DISPLAY: Record<string, { nameEn: string; role: string; color: string; avatar: string }> = {
    'ceo': { nameEn: 'CEO', role: 'Orchestrator', color: '#e74c3c', avatar: 'CEO' },
    'xhs-agent': { nameEn: 'XHS Agent', role: 'Specialist', color: '#ff2442', avatar: 'XHS' },
    'analyst-agent': { nameEn: 'Analyst', role: 'Specialist', color: '#22d3ee', avatar: 'AN' },
    'growth-agent': { nameEn: 'Growth', role: 'Specialist', color: '#00cec9', avatar: 'G' },
    'brand-reviewer': { nameEn: 'Brand Reviewer', role: 'Reviewer', color: '#a855f7', avatar: 'BR' },
    'x-twitter-agent': { nameEn: 'X/Twitter', role: 'Specialist', color: '#1da1f2', avatar: 'X' },
    'meta-ads-agent': { nameEn: 'Meta Ads', role: 'Specialist', color: '#1877f2', avatar: 'MA' },
    'email-agent': { nameEn: 'Email', role: 'Specialist', color: '#f59e0b', avatar: 'EM' },
    'seo-expert-agent': { nameEn: 'SEO Expert', role: 'Specialist', color: '#22c55e', avatar: 'SEO' },
    'geo-expert-agent': { nameEn: 'GEO Expert', role: 'Specialist', color: '#8b5cf6', avatar: 'GEO' },
    'strategist-agent': { nameEn: 'Strategist', role: 'Specialist', color: '#ec4899', avatar: 'STR' },
    'visual-agent': { nameEn: 'Visual', role: 'Specialist', color: '#f472b6', avatar: 'VIS' },
    'podcast-agent': { nameEn: 'Podcast', role: 'Specialist', color: '#f97316', avatar: 'POD' },
    'global-content-agent': { nameEn: 'Global Content', role: 'Specialist', color: '#06b6d4', avatar: 'GC' },
  };

  // Fetch registered agents from IPC
  useEffect(() => {
    (async () => {
      const api = getApi();
      if (!api) return;
      try {
        const res = await api.agent.status();
        if (res.success && res.data) {
          const { agents: agentList } = res.data as { agents: Array<{ id: string; name: string; description: string; status: string }> };
          if (agentList && agentList.length > 0) {
            const mapped: MonitorAgent[] = agentList.map(a => {
              const display = AGENT_DISPLAY[a.id] || { nameEn: a.id, role: 'Agent', color: '#71717a', avatar: a.id.slice(0, 2).toUpperCase() };
              return {
                id: a.id,
                name: a.name,
                nameEn: display.nameEn,
                role: display.role,
                color: display.color,
                avatar: display.avatar,
                status: a.status === 'busy' ? 'busy' as AgentStatus : 'online' as AgentStatus,
              };
            });
            setAgents(mapped);
          }
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
    setSelectedAgent(agentId);
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

  // Prepare agents for RPG scene (add statusText)
  const sceneAgents = agents.map(a => ({
    id: a.id,
    nameEn: a.nameEn,
    name: a.name,
    color: a.color,
    status: a.status,
    currentTool: a.currentTool,
    statusText: getStatusText(a),
  }));

  return (
    <div className="flex-1 flex flex-col overflow-hidden rounded-xl" style={{ background: 'var(--card)', color: 'var(--foreground)', fontFamily: font.body, border: '1px solid var(--border)' }}>
      {/* Inject keyframes */}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes monitor-progress {
          0% { transform: translateX(-100%); }
          50% { transform: translateX(150%); }
          100% { transform: translateX(-100%); }
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
          <span className="text-sm font-semibold px-1.5 py-0.5 rounded shrink-0" style={{ color: '#22d3ee', background: 'rgba(34,211,238,0.10)' }}>TEAM</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm truncate" style={{ fontFamily: font.body, color: taskPrompt ? T.text : T.textDim }}>
              {taskPrompt || `${agents.length} agents online — enter a task below`}
            </p>
          </div>
          {taskPrompt && (
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="text-xs tabular-nums" style={{ fontFamily: font.mono, color: T.textMuted }}>{execTimeStr}</span>
            </div>
          )}
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div className="relative z-10 flex-1 flex overflow-hidden">
        {/* Left: main content area */}
        <div className="flex-1 flex flex-col overflow-hidden min-w-0">
          {/* RPG Agent Town Scene — replaces card grid */}
          {agents.length === 0 ? (
            <div className="flex-1 flex items-center justify-center" style={{ borderBottom: `1px solid ${T.border}` }}>
              <div className="text-center">
                <div className="text-3xl opacity-10 mb-4">🏘️</div>
                <p className="text-sm font-medium" style={{ color: T.textMuted }}>Agent Town is empty</p>
                <p className="text-xs mt-1" style={{ color: T.textDim }}>Execute a task to see agents working here</p>
              </div>
            </div>
          ) : (
            <div className="flex-1 min-h-0" style={{ borderBottom: selectedAgent ? 'none' : `1px solid ${T.border}` }}>
              <RPGScene
                agents={sceneAgents}
                selectedAgent={selectedAgent}
                onSelectAgent={toggleSelect}
              />
            </div>
          )}

          {/* Detail Panel — between scene and command input */}
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
