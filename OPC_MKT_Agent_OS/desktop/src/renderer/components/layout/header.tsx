import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, Sun, Moon, Monitor } from 'lucide-react'
import { getApi } from '@/lib/ipc'
import { useTheme } from '@/hooks/use-theme'
import type { Task, AgentRun } from '@/types'

// ── Agent registry ──

interface AgentDef {
  id: string
  name: string
  abbr: string
  color: string
}

const AGENTS: AgentDef[] = [
  { id: 'ceo', name: 'CEO', abbr: 'CEO', color: '#e74c3c' },
  { id: 'xhs', name: 'XHS Agent', abbr: 'XHS', color: '#ff2442' },
  { id: 'analyst', name: 'Analyst', abbr: 'AN', color: '#22d3ee' },
  { id: 'growth', name: 'Growth', abbr: 'G', color: '#00cec9' },
  { id: 'brand-reviewer', name: 'Brand Reviewer', abbr: 'BR', color: '#a855f7' },
  { id: 'podcast', name: 'Podcast', abbr: 'POD', color: '#f59e0b' },
  { id: 'x-twitter', name: 'X/Twitter', abbr: 'X', color: '#1da1f2' },
  { id: 'visual', name: 'Visual', abbr: 'VIS', color: '#ec4899' },
  { id: 'strategist', name: 'Strategist', abbr: 'STR', color: '#8b5cf6' },
]

type AgentStatus = 'busy' | 'pending' | 'idle' | 'offline'

interface AgentState {
  def: AgentDef
  status: AgentStatus
  currentTask?: string
  elapsed?: string
}

const STATUS_PRIORITY: Record<AgentStatus, number> = {
  busy: 0,
  pending: 1,
  idle: 2,
  offline: 3,
}

const STATUS_DOT: Record<AgentStatus, { bg: string; pulse: boolean }> = {
  busy: { bg: '#ef4444', pulse: true },
  pending: { bg: '#f59e0b', pulse: false },
  idle: { bg: '#22c55e', pulse: false },
  offline: { bg: '#6b7280', pulse: false },
}

const STATUS_LABEL: Record<AgentStatus, string> = {
  busy: '执行中',
  pending: '等待审批',
  idle: '空闲',
  offline: '未启动',
}

const MAX_VISIBLE = 6

// ── Helper: derive agent states from runs ──

function deriveAgentStates(runs: AgentRun[]): AgentState[] {
  const runMap = new Map<string, AgentRun>()
  for (const run of runs) {
    const existing = runMap.get(run.agent_type)
    if (!existing || new Date(run.started_at) > new Date(existing.started_at)) {
      runMap.set(run.agent_type, run)
    }
  }

  return AGENTS.map((def) => {
    const latestRun = runMap.get(def.id)
    if (!latestRun) {
      return { def, status: 'offline' as AgentStatus }
    }
    if (latestRun.status === 'running') {
      const elapsed = formatElapsed(latestRun.started_at)
      return {
        def,
        status: 'busy' as AgentStatus,
        currentTask: (latestRun.input?.prompt as string)?.slice(0, 60) ?? '执行中...',
        elapsed,
      }
    }
    if (latestRun.status === 'pending') {
      return { def, status: 'pending' as AgentStatus, currentTask: '等待输入...' }
    }
    return {
      def,
      status: 'idle' as AgentStatus,
      currentTask: (latestRun.output?.result as string)?.slice(0, 50) ?? '已完成',
      elapsed: latestRun.finished_at ? formatElapsed(latestRun.finished_at) : undefined,
    }
  }).sort((a, b) => STATUS_PRIORITY[a.status] - STATUS_PRIORITY[b.status])
}

function formatElapsed(dateStr: string): string {
  const ms = Date.now() - new Date(dateStr).getTime()
  const sec = Math.floor(ms / 1000)
  if (sec < 60) return `${sec}s`
  const min = Math.floor(sec / 60)
  if (min < 60) return `${min}m ${sec % 60}s`
  const hr = Math.floor(min / 60)
  return `${hr}h ${min % 60}m`
}

// ── AgentAvatar ──

function AgentAvatar({
  agent,
  size = 36,
  onHover,
  onLeave,
  onClick,
}: {
  agent: AgentState
  size?: number
  onHover?: (e: React.MouseEvent) => void
  onLeave?: () => void
  onClick?: () => void
}): React.JSX.Element {
  const dot = STATUS_DOT[agent.status]
  const isOffline = agent.status === 'offline'

  return (
    <div
      className="relative cursor-pointer"
      style={{ width: size, height: size, opacity: isOffline ? 0.5 : 1 }}
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
      onClick={onClick}
    >
      <div
        className="flex items-center justify-center rounded-full border-2 border-background"
        style={{
          width: size,
          height: size,
          background: agent.def.color,
          fontSize: size < 36 ? 9 : 11,
          fontWeight: 700,
          color: '#fff',
        }}
      >
        {agent.def.abbr}
      </div>
      {/* Status dot */}
      <div
        className={`absolute -bottom-0.5 -right-0.5 rounded-full border-2 border-background ${dot.pulse ? 'animate-agent-pulse' : ''}`}
        style={{
          width: 10,
          height: 10,
          background: dot.bg,
          boxShadow: dot.pulse ? `0 0 6px ${dot.bg}99` : undefined,
        }}
      />
    </div>
  )
}

// ── HoverCard ──

function AgentHoverCard({
  agent,
  position,
  isDark,
}: {
  agent: AgentState
  position: { x: number; y: number }
  isDark: boolean
}): React.JSX.Element {
  const dot = STATUS_DOT[agent.status]
  const statusLabel = STATUS_LABEL[agent.status]

  return (
    <div
      className="fixed z-50 w-[280px] rounded-xl border p-4"
      style={{
        left: position.x,
        top: position.y + 8,
        background: isDark ? '#0a0a0f' : '#ffffff',
        borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
        boxShadow: isDark ? '0 8px 32px rgba(0,0,0,0.5)' : '0 8px 32px rgba(0,0,0,0.1)',
        animation: 'fadeIn 150ms ease-out',
      }}
    >
      {/* Head */}
      <div className="flex items-center gap-3">
        <div
          className="flex h-12 w-12 items-center justify-center rounded-full text-sm font-bold text-white"
          style={{ background: agent.def.color }}
        >
          {agent.def.abbr}
        </div>
        <div>
          <div className="text-sm font-semibold text-foreground">{agent.def.name}</div>
          <div className="flex items-center gap-1.5 mt-0.5">
            <div
              className="h-2 w-2 rounded-full"
              style={{ background: dot.bg }}
            />
            <span className="text-xs" style={{ color: dot.bg }}>
              {statusLabel}
            </span>
          </div>
        </div>
      </div>

      {/* Task info */}
      <div
        className="mt-3 pt-3"
        style={{ borderTop: isDark ? '1px solid rgba(255,255,255,0.06)' : '1px solid rgba(0,0,0,0.06)' }}
      >
        {agent.status === 'busy' && (
          <>
            <div className="text-xs text-foreground/40 mb-1">当前任务:</div>
            <div className="text-sm text-foreground/80 line-clamp-2">{agent.currentTask}</div>
            {agent.elapsed && (
              <div className="text-xs text-foreground/30 mt-1.5">已运行 {agent.elapsed}</div>
            )}
          </>
        )}
        {agent.status === 'pending' && (
          <>
            <div className="text-xs text-foreground/40 mb-1">等待:</div>
            <div className="text-sm text-foreground/80">{agent.currentTask ?? '等待审批确认'}</div>
          </>
        )}
        {agent.status === 'idle' && (
          <>
            <div className="text-xs text-foreground/40 mb-1">上次任务:</div>
            <div className="text-sm text-foreground/80 line-clamp-2">{agent.currentTask}</div>
            {agent.elapsed && (
              <div className="text-xs text-foreground/30 mt-1.5">完成于 {agent.elapsed} 前</div>
            )}
          </>
        )}
        {agent.status === 'offline' && (
          <div className="text-sm text-foreground/40">此 Agent 当前未启动</div>
        )}
      </div>

      {/* Footer */}
      <div
        className="mt-3 pt-3"
        style={{ borderTop: isDark ? '1px solid rgba(255,255,255,0.06)' : '1px solid rgba(0,0,0,0.06)' }}
      >
        <span className="text-xs text-[#a78bfa] hover:text-[#c4b5fd] cursor-pointer">
          {agent.status === 'offline' ? '启动 Agent' : '查看 Agent 详情'} →
        </span>
      </div>
    </div>
  )
}

// ── AgentAvatarStack ──

function AgentAvatarStack({
  agents,
  onNavigateTeamStudio,
  isDark,
}: {
  agents: AgentState[]
  onNavigateTeamStudio: () => void
  isDark: boolean
}): React.JSX.Element {
  const [hoveredAgent, setHoveredAgent] = useState<AgentState | null>(null)
  const [hoverPos, setHoverPos] = useState({ x: 0, y: 0 })

  const visible = agents.filter((a) => a.status !== 'offline').slice(0, MAX_VISIBLE)
  const overflowCount = agents.length - visible.length

  function handleHover(agent: AgentState, e: React.MouseEvent) {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    const cardWidth = 280
    const margin = 8
    // Clamp left so the card doesn't overflow the right edge of the viewport
    const idealX = rect.left + rect.width / 2 - cardWidth / 2
    const maxX = window.innerWidth - cardWidth - margin
    setHoverPos({
      x: Math.max(margin, Math.min(idealX, maxX)),
      y: rect.bottom,
    })
    setHoveredAgent(agent)
  }

  return (
    <div className="flex items-center">
      {visible.map((agent, i) => (
        <div
          key={agent.def.id}
          style={{ marginLeft: i === 0 ? 0 : -8, zIndex: MAX_VISIBLE - i }}
          className="relative"
        >
          <AgentAvatar
            agent={agent}
            onHover={(e) => handleHover(agent, e)}
            onLeave={() => setHoveredAgent(null)}
            onClick={onNavigateTeamStudio}
          />
        </div>
      ))}
      {overflowCount > 0 && (
        <div
          className="flex items-center justify-center rounded-full -ml-2 cursor-pointer"
          style={{
            height: 36,
            minWidth: 36,
            padding: '0 8px',
            background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
            color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)',
            fontSize: 12,
            fontWeight: 500,
          }}
          onClick={onNavigateTeamStudio}
        >
          +{overflowCount}
        </div>
      )}
      {hoveredAgent && <AgentHoverCard agent={hoveredAgent} position={hoverPos} isDark={isDark} />}
    </div>
  )
}

// ── Header ──

export function Header(): React.JSX.Element {
  const navigate = useNavigate()
  const { theme, isDark, setTheme } = useTheme()
  const [agents, setAgents] = useState<AgentState[]>(() =>
    AGENTS.map((def) => ({ def, status: 'offline' as AgentStatus }))
  )
  const [taskProgress, setTaskProgress] = useState<{
    done: number
    total: number
    currentName: string | null
  }>({ done: 0, total: 0, currentName: null })
  const [reviewCount, setReviewCount] = useState(0)
  const [themeMenuOpen, setThemeMenuOpen] = useState(false)
  const themeMenuRef = useRef<HTMLDivElement>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Close theme menu on outside click
  useEffect(() => {
    if (!themeMenuOpen) return
    const handler = (e: MouseEvent): void => {
      if (themeMenuRef.current && !themeMenuRef.current.contains(e.target as Node)) {
        setThemeMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [themeMenuOpen])

  const fetchState = useCallback(async () => {
    const api = getApi()
    if (!api) return
    try {
      const [runsRes, tasksRes, contentsRes] = await Promise.all([
        api.agentRuns.list(),
        api.tasks.list(),
        api.contents.list({ status: 'review' }),
      ])
      if (runsRes.success && runsRes.data) {
        setAgents(deriveAgentStates(runsRes.data))
      }
      if (tasksRes.success && tasksRes.data) {
        const tasks = tasksRes.data as Task[]
        const inProgress = tasks.filter((t) =>
          ['review', 'approved', 'scheduled'].includes(t.status)
        )
        const done = tasks.filter((t) => t.status === 'published').length
        const current = inProgress[0]
        setTaskProgress({
          done,
          total: tasks.length,
          currentName: current?.title ?? null,
        })
      }
      if (contentsRes.success && contentsRes.data) {
        setReviewCount((contentsRes.data as unknown[]).length)
      }
    } catch {
      // silently ignore
    }
  }, [])

  useEffect(() => {
    void fetchState()
    intervalRef.current = setInterval(() => void fetchState(), 10_000)
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [fetchState])

  return (
    <header
      className="px-6 flex items-center shrink-0 relative z-20 cotify-glass"
      style={{
        paddingTop: 36,
        height: 36 + 56,
        borderBottom: isDark ? '1px solid rgba(255,255,255,0.06)' : '1px solid rgba(0,0,0,0.06)',
        WebkitAppRegion: 'drag',
      }}
    >
      {/* Left — Task progress indicator */}
      <div className="flex items-center flex-1 min-w-0 titlebar-no-drag">
        {taskProgress.total > 0 ? (
          <>
            <span
              className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold shrink-0"
              style={{
                background: 'rgba(167,139,250,0.1)',
                color: '#a78bfa',
              }}
            >
              {taskProgress.done}/{taskProgress.total}
            </span>
            <span className="text-[13px] ml-2.5 shrink-0 text-foreground/35">
              当前任务:
            </span>
            {taskProgress.currentName ? (
              <span className="text-[13px] text-foreground font-medium max-w-[240px] truncate ml-1">
                {taskProgress.currentName}
              </span>
            ) : (
              <span className="text-[13px] ml-1 text-foreground/20">
                全部完成
              </span>
            )}
          </>
        ) : (
          <span className="text-[13px] text-foreground/20">
            无进行中的任务
          </span>
        )}
      </div>

      {/* Right — Agent Avatars + Bell + Settings */}
      <div className="flex items-center gap-3 shrink-0 titlebar-no-drag">
        <AgentAvatarStack
          agents={agents}
          onNavigateTeamStudio={() => navigate('/team-studio')}
          isDark={isDark}
        />

        {/* Divider */}
        <div
          className="h-5 pl-3 ml-1 flex items-center gap-2"
          style={{ borderLeft: isDark ? '1px solid rgba(255,255,255,0.06)' : '1px solid rgba(0,0,0,0.06)' }}
        >
          {/* Notification bell */}
          <button
            className="relative h-8 w-8 flex items-center justify-center rounded-lg transition-colors hover:bg-black/[0.04] dark:hover:bg-white/[0.04]"
            onClick={() => navigate('/approval')}
            title="审批通知"
          >
            <Bell className="h-[18px] w-[18px] text-foreground/40 hover:text-foreground/70 transition-colors" />
            {reviewCount > 0 && (
              <div className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-red-500" />
            )}
          </button>

          {/* Theme toggle */}
          <div className="relative" ref={themeMenuRef}>
            <button
              className="h-8 w-8 flex items-center justify-center rounded-lg transition-colors hover:bg-black/[0.04] dark:hover:bg-white/[0.04]"
              onClick={() => setThemeMenuOpen((v) => !v)}
              title="主题切换"
            >
              {isDark ? (
                <Moon className="h-[18px] w-[18px] text-foreground/40 hover:text-foreground/70 transition-colors" />
              ) : (
                <Sun className="h-[18px] w-[18px] text-foreground/40 hover:text-foreground/70 transition-colors" />
              )}
            </button>
            {themeMenuOpen && (
              <div
                className="absolute right-0 top-full mt-2 w-[160px] rounded-xl border p-1 z-50"
                style={{
                  background: isDark ? '#0a0a0f' : '#ffffff',
                  borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
                  boxShadow: isDark
                    ? '0 8px 32px rgba(0,0,0,0.5)'
                    : '0 8px 32px rgba(0,0,0,0.1)',
                }}
              >
                {([
                  { key: 'light' as const, label: '亮色模式', Icon: Sun },
                  { key: 'dark' as const, label: '暗色模式', Icon: Moon },
                  { key: 'system' as const, label: '跟随系统', Icon: Monitor },
                ]).map(({ key, label, Icon }) => (
                  <button
                    key={key}
                    className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] transition-colors"
                    style={{
                      color: theme === key
                        ? (isDark ? '#a78bfa' : '#7c3aed')
                        : (isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)'),
                      background: theme === key
                        ? (isDark ? 'rgba(167,139,250,0.08)' : 'rgba(124,58,237,0.06)')
                        : 'transparent',
                    }}
                    onMouseEnter={(e) => {
                      if (theme !== key) {
                        e.currentTarget.style.background = isDark
                          ? 'rgba(255,255,255,0.04)'
                          : 'rgba(0,0,0,0.04)'
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (theme !== key) {
                        e.currentTarget.style.background = 'transparent'
                      }
                    }}
                    onClick={() => {
                      setTheme(key)
                      setThemeMenuOpen(false)
                    }}
                  >
                    <Icon className="h-4 w-4" />
                    <span className="font-medium">{label}</span>
                    {theme === key && (
                      <span className="ml-auto text-xs">&#10003;</span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
