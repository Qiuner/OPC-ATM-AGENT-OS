import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, Sun, Moon, Monitor, Volume2, VolumeX } from 'lucide-react'
import { getApi } from '@/lib/ipc'
import { useTheme } from '@/hooks/use-theme'
import type { Task } from '@/types'

// ── Agent registry ──

interface AgentDef {
  id: string
  name: string
  abbr: string
  color: string
}

const AGENTS: AgentDef[] = [
  { id: 'ceo', name: 'CEO', abbr: 'CEO', color: '#e74c3c' },
  { id: 'xhs-agent', name: 'XHS Agent', abbr: 'XHS', color: '#ff2442' },
  { id: 'analyst-agent', name: 'Analyst', abbr: 'AN', color: '#3498db' },
  { id: 'growth-agent', name: 'Growth', abbr: 'G', color: '#00cec9' },
  { id: 'brand-reviewer', name: 'Brand Reviewer', abbr: 'BR', color: '#a855f7' },
  { id: 'podcast-agent', name: 'Podcast', abbr: 'POD', color: '#e17055' },
  { id: 'global-content-agent', name: 'Global Content', abbr: 'GC', color: '#10b981' },
  { id: 'meta-ads-agent', name: 'Meta Ads', abbr: 'MA', color: '#1877f2' },
  { id: 'email-agent', name: 'Email', abbr: 'EM', color: '#f59e0b' },
  { id: 'seo-agent', name: 'SEO', abbr: 'SEO', color: '#059669' },
  { id: 'geo-agent', name: 'GEO', abbr: 'GEO', color: '#7c3aed' },
  { id: 'x-twitter-agent', name: 'X/Twitter', abbr: 'X', color: '#1da1f2' },
  { id: 'visual-gen-agent', name: 'Visual', abbr: 'VIS', color: '#fd79a8' },
  { id: 'strategist-agent', name: 'Strategist', abbr: 'STR', color: '#6c5ce7' },
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

// deriveAgentStates removed — now using real-time agent.status() API

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
  const [orchState, setOrchState] = useState<{
    isRunning: boolean
    ceoStatus: string
    plan?: string
  }>({ isRunning: false, ceoStatus: 'idle' })
  const [reviewCount, setReviewCount] = useState(0)
  const [soundEnabled, setSoundEnabled] = useState(false)
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
      // Real-time agent status (same source as Dock Pet)
      const [statusRes, teamRes, tasksRes, contentsRes, orchRes, soundRes] = await Promise.all([
        api.agent.status(),
        api.team.getAgents(),
        api.tasks.list(),
        api.contents.list({ status: 'review' }),
        api.orchestrator?.status().catch(() => null),
        api.soundNotify?.getSettings().catch(() => null),
      ])

      if (statusRes.success && statusRes.data) {
        const data = statusRes.data as { agents: Array<{ id: string; name: string; status: string }>, isRunning?: boolean }
        // Get online team agent IDs — only these agents show as online
        const onlineIds = new Set(
          teamRes.success && teamRes.data ? (teamRes.data as string[]) : []
        )
        const hasTeam = onlineIds.size > 0

        setAgents(
          AGENTS.map((def) => {
            const live = data.agents.find((a) => a.id === def.id)
            // No team launched and no single agent running → all offline
            if (!hasTeam && live?.status !== 'busy') {
              return { def, status: 'offline' as AgentStatus }
            }
            // Team launched but this agent not in the team → offline
            if (hasTeam && !onlineIds.has(def.id)) {
              return { def, status: 'offline' as AgentStatus }
            }
            // Agent is busy (running task)
            if (live?.status === 'busy') {
              return { def, status: 'busy' as AgentStatus, currentTask: '执行中...' }
            }
            // Agent in team but not busy → idle
            if (hasTeam && onlineIds.has(def.id)) {
              return { def, status: 'idle' as AgentStatus }
            }
            return { def, status: 'offline' as AgentStatus }
          }).sort((a, b) => STATUS_PRIORITY[a.status] - STATUS_PRIORITY[b.status])
        )
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
      // Orchestrator state
      if (orchRes && orchRes.success && orchRes.data) {
        const od = orchRes.data as { isRunning: boolean; ceoStatus: string; plan?: string }
        setOrchState({ isRunning: od.isRunning, ceoStatus: od.ceoStatus, plan: od.plan })
      } else {
        setOrchState({ isRunning: false, ceoStatus: 'idle' })
      }
      // Sound state
      if (soundRes && soundRes.success && soundRes.data) {
        const sd = soundRes.data as { enabled: boolean }
        setSoundEnabled(sd.enabled)
      }
    } catch {
      // silently ignore
    }
  }, [])

  useEffect(() => {
    void fetchState()
    intervalRef.current = setInterval(() => void fetchState(), 3_000)
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
      <div className="flex items-center flex-1 min-w-0 titlebar-no-drag gap-2">
        {orchState.isRunning ? (
          /* CEO 编排模式运行中 */
          <>
            <span
              className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold shrink-0"
              style={{
                background: 'rgba(231,76,60,0.1)',
                color: '#e74c3c',
                border: '1px solid rgba(231,76,60,0.2)',
              }}
            >
              CEO 编排
            </span>
            <span className="text-[13px] text-foreground font-medium max-w-[320px] truncate">
              {orchState.ceoStatus === 'planning' && '正在分析需求...'}
              {orchState.ceoStatus === 'executing' && '子 Agent 执行中...'}
              {orchState.ceoStatus === 'reviewing' && '审核产出中...'}
              {orchState.ceoStatus === 'done' && '任务完成'}
              {orchState.ceoStatus === 'error' && '执行出错'}
              {orchState.ceoStatus === 'idle' && '待命'}
            </span>
          </>
        ) : agents.some((a) => a.status === 'busy') ? (
          /* 单 Agent 执行中 */
          <>
            <span
              className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold shrink-0"
              style={{
                background: 'rgba(34,211,238,0.1)',
                color: '#22d3ee',
                border: '1px solid rgba(34,211,238,0.2)',
              }}
            >
              单 Agent
            </span>
            <span className="text-[13px] text-foreground font-medium max-w-[320px] truncate">
              {agents.find((a) => a.status === 'busy')?.def.name ?? ''} 执行中...
            </span>
          </>
        ) : (
          <span className="text-[13px] text-foreground/20">暂无任务</span>
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

          {/* Sound toggle */}
          <button
            className="relative h-8 w-8 flex items-center justify-center rounded-lg transition-colors hover:bg-black/[0.04] dark:hover:bg-white/[0.04]"
            onClick={async () => {
              const api = getApi()
              if (!api) return
              const res = await api.soundNotify.toggle()
              if (res.success && res.data) {
                const d = res.data as { enabled: boolean }
                setSoundEnabled(d.enabled)
              }
            }}
            title={soundEnabled ? '关闭音效' : '开启音效'}
          >
            {soundEnabled ? (
              <Volume2 className="h-[18px] w-[18px] text-[#a78bfa] hover:text-[#c4b5fd] transition-colors" />
            ) : (
              <VolumeX className="h-[18px] w-[18px] text-foreground/40 hover:text-foreground/70 transition-colors" />
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
