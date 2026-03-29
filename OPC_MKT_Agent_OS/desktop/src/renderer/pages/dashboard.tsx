import { useState, useEffect, useCallback } from 'react'
import {
  FileText,
  Clock,
  CheckCircle2,
  Send,
  ListTodo,
  Eye,
  Megaphone,
  Loader2,
  Bot,
  Zap,
  ArrowRight,
  PenTool,
  BarChart3,
} from 'lucide-react'
import { getApi } from '@/lib/ipc'
import type { Task, Content } from '@/types'

interface DashboardMetrics {
  totalTasks: number
  reviewContents: number
  publishedContents: number
  activeCampaigns: number
}

interface ActivityItem {
  id: string
  type: 'task' | 'content'
  title: string
  status: string
  updatedAt: string
}

const statusColors: Record<string, string> = {
  draft: 'bg-muted text-muted-foreground',
  review: 'bg-[rgba(251,191,36,0.10)] text-[#fbbf24]',
  approved: 'bg-[rgba(34,197,94,0.10)] text-[#22c55e]',
  rejected: 'bg-[rgba(239,68,68,0.10)] text-[#ef4444]',
  published: 'bg-[rgba(109,40,217,0.10)] dark:bg-[rgba(167,139,250,0.10)] text-[#6d28d9] dark:text-[#a78bfa]',
  backlog: 'bg-muted text-muted-foreground',
  scheduled: 'bg-[rgba(8,145,178,0.10)] dark:bg-[rgba(34,211,238,0.10)] text-[#0891b2] dark:text-[#22d3ee]',
}

const statusLabels: Record<string, string> = {
  draft: '草稿',
  review: '审核中',
  approved: '已通过',
  rejected: '已拒绝',
  published: '已发布',
  backlog: '待处理',
  scheduled: '已排期',
}

function getActivityIcon(type: string, status: string) {
  if (type === 'content') {
    if (status === 'published') return Send
    if (status === 'approved') return CheckCircle2
    if (status === 'review') return Eye
    return FileText
  }
  if (status === 'scheduled') return Clock
  return ListTodo
}

function formatRelativeTime(dateStr: string): string {
  const now = new Date()
  const date = new Date(dateStr)
  const diffMs = now.getTime() - date.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  if (diffMin < 1) return '刚刚'
  if (diffMin < 60) return `${diffMin} 分钟前`
  const diffHours = Math.floor(diffMin / 60)
  if (diffHours < 24) return `${diffHours} 小时前`
  const diffDays = Math.floor(diffHours / 24)
  if (diffDays < 30) return `${diffDays} 天前`
  return date.toLocaleDateString('zh-CN')
}

// Static placeholder data — will be replaced by IPC calls in Task 4
const staticMetrics: DashboardMetrics = {
  totalTasks: 12,
  reviewContents: 3,
  publishedContents: 8,
  activeCampaigns: 2,
}

const staticActivities: ActivityItem[] = [
  { id: '1', type: 'content', title: 'AI Marketing Tools — Twitter Thread', status: 'published', updatedAt: new Date(Date.now() - 3600000).toISOString() },
  { id: '2', type: 'content', title: 'Product Launch Email Campaign', status: 'review', updatedAt: new Date(Date.now() - 7200000).toISOString() },
  { id: '3', type: 'task', title: '竞品分析报告 — Q1 2026', status: 'scheduled', updatedAt: new Date(Date.now() - 86400000).toISOString() },
  { id: '4', type: 'content', title: 'LinkedIn Thought Leadership Post', status: 'approved', updatedAt: new Date(Date.now() - 172800000).toISOString() },
  { id: '5', type: 'task', title: 'TikTok 短视频脚本创作', status: 'backlog', updatedAt: new Date(Date.now() - 259200000).toISOString() },
]

function OpenClawPanel(): React.JSX.Element {
  const [platform, setPlatform] = useState('X')
  const platforms = ['X', 'LinkedIn', 'TikTok', 'Meta', 'Email', 'Blog']

  return (
    <div className="cotify-card p-6 relative overflow-hidden">
      <div
        className="absolute -top-10 -right-10 w-[300px] h-[200px] pointer-events-none"
        style={{ background: 'radial-gradient(ellipse, rgba(34,211,238,0.06), transparent 70%)' }}
      />

      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-xl"
            style={{ background: 'rgba(34,211,238,0.10)', border: '1px solid rgba(34,211,238,0.20)' }}
          >
            <Bot className="h-5 w-5" style={{ color: '#22d3ee' }} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-foreground">OpenClaw Gateway</h3>
              <span
                className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium bg-muted text-muted-foreground"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground" />
                桌面端适配中
              </span>
            </div>
            <p className="text-[12px] text-foreground/30">
              IPC 通信层迁移后启用 — 通过指令驱动 Agent OS 生成出海内容
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          {platforms.map((p) => (
            <button
              key={p}
              onClick={() => setPlatform(p)}
              className="rounded-lg px-2 py-1 text-[11px] font-medium transition-all"
              style={{
                background: platform === p ? 'rgba(167,139,250,0.15)' : 'var(--muted)',
                color: platform === p ? 'var(--primary)' : 'var(--muted-foreground)',
                border: `1px solid ${platform === p ? 'rgba(167,139,250,0.25)' : 'var(--border)'}`,
              }}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Command flow visualization */}
      <div
        className="flex items-center gap-2 py-3 px-4 rounded-xl bg-muted/50 border border-border/50"
      >
        <div className="flex items-center gap-1.5 text-[11px] text-foreground/50">
          <Megaphone className="h-3.5 w-3.5" style={{ color: '#22d3ee' }} />
          <span>Campaign</span>
        </div>
        <ArrowRight className="h-3 w-3 text-foreground/15" />
        <div className="flex items-center gap-1.5 text-[11px] text-foreground/50">
          <Zap className="h-3.5 w-3.5 text-primary" />
          <span>Agent OS</span>
        </div>
        <ArrowRight className="h-3 w-3 text-foreground/15" />
        <div className="flex items-center gap-1.5 text-[11px] text-foreground/50">
          <PenTool className="h-3.5 w-3.5" style={{ color: '#fbbf24' }} />
          <span>Content</span>
        </div>
        <ArrowRight className="h-3 w-3 text-foreground/15" />
        <div className="flex items-center gap-1.5 text-[11px] text-foreground/50">
          <Send className="h-3.5 w-3.5" style={{ color: '#22c55e' }} />
          <span>Publish</span>
        </div>
        <ArrowRight className="h-3 w-3 text-foreground/15" />
        <div className="flex items-center gap-1.5 text-[11px] text-foreground/50">
          <BarChart3 className="h-3.5 w-3.5" style={{ color: '#f472b6' }} />
          <span>Analytics</span>
        </div>
      </div>
    </div>
  )
}

export function DashboardPage(): React.JSX.Element {
  const [metrics, setMetrics] = useState<DashboardMetrics>(staticMetrics)
  const [activities, setActivities] = useState<ActivityItem[]>(staticActivities)
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    const api = getApi()
    if (!api) {
      // Not in Electron — use static data
      setLoading(false)
      return
    }
    try {
      setLoading(true)
      const [tasksRes, contentsRes, campaignsRes] = await Promise.all([
        api.tasks.list(),
        api.contents.list(),
        api.campaigns.list(),
      ])
      const tasks: Task[] = tasksRes.success && tasksRes.data ? tasksRes.data as Task[] : []
      const contents: Content[] = contentsRes.success && contentsRes.data ? contentsRes.data as Content[] : []
      interface CampaignItem { status: string }
      const campaigns: CampaignItem[] = campaignsRes.success && campaignsRes.data ? campaignsRes.data as CampaignItem[] : []

      setMetrics({
        totalTasks: tasks.length,
        reviewContents: contents.filter((c) => c.status === 'review').length,
        publishedContents: contents.filter((c) => c.status === 'published').length,
        activeCampaigns: campaigns.filter((c) => c.status === 'active').length,
      })

      const taskItems: ActivityItem[] = tasks.map((t) => ({
        id: t.id, type: 'task', title: t.title, status: t.status, updatedAt: t.updated_at,
      }))
      const contentItems: ActivityItem[] = contents.map((c) => ({
        id: c.id, type: 'content', title: c.title, status: c.status, updatedAt: c.updated_at,
      }))
      const allItems = [...taskItems, ...contentItems]
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
        .slice(0, 10)
      setActivities(allItems)
    } catch {
      // Fallback to static data
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void fetchData()
  }, [fetchData])

  const metricCards = [
    { label: '总任务数', value: metrics.totalTasks, unit: '个', icon: ListTodo, color: '#a78bfa' },
    { label: '待审核内容', value: metrics.reviewContents, unit: '件', amber: true, icon: Eye, color: '#fbbf24' },
    { label: '已发布内容', value: metrics.publishedContents, unit: '篇', icon: Send, color: '#22d3ee' },
    { label: '活跃活动', value: metrics.activeCampaigns, unit: '个', icon: Megaphone, color: '#22c55e' },
  ]

  return (
    <div className="space-y-6 max-w-[1200px] relative">
      <div
        className="absolute -top-20 -left-20 w-[600px] h-[400px] pointer-events-none"
        style={{ background: 'radial-gradient(ellipse at 30% 30%, rgba(167,139,250,0.05), transparent 70%)' }}
      />

      <div className="relative">
        <h2 className="text-3xl font-bold text-foreground tracking-tight" style={{ letterSpacing: '-0.04em' }}>
          Overview
        </h2>
        <p className="mt-1.5 text-[15px] text-muted-foreground leading-relaxed">
          营销 Agent OS 总览 — 查看关键指标、内容产出与平台表现。
        </p>
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 relative">
        {metricCards.map((m, i) => (
          <div
            key={m.label}
            className="cotify-card p-6 group"
            style={{ animationDelay: `${i * 60}ms`, animation: 'page-enter 0.4s ease-out both' }}
          >
            <div className="flex items-center justify-between">
              <p className="text-[13px] font-medium text-muted-foreground tracking-wide uppercase" style={{ letterSpacing: '0.04em', fontSize: 11 }}>
                {m.label}
              </p>
              <div
                className="flex h-10 w-10 items-center justify-center rounded-2xl transition-transform duration-300 group-hover:scale-110"
                style={{ background: `${m.color}12`, border: `1px solid ${m.color}18` }}
              >
                <m.icon className="h-[18px] w-[18px]" style={{ color: m.color }} />
              </div>
            </div>
            <div className="mt-4 flex items-baseline gap-1.5">
              {loading ? (
                <Loader2 className="h-6 w-6 animate-spin text-foreground/20" />
              ) : (
                <>
                  <span className="text-4xl font-bold text-foreground tracking-tighter" style={{ fontVariantNumeric: 'tabular-nums' }}>{m.value}</span>
                  <span className="text-sm text-muted-foreground font-medium">
                    {m.unit}
                  </span>
                </>
              )}
            </div>
            {m.amber && m.value > 0 && (
              <div className="mt-2.5">
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-md" style={{ color: '#d97706', background: 'rgba(217,119,6,0.08)' }}>
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                  需处理
                </span>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* OpenClaw Integration Panel */}
      <OpenClawPanel />

      {/* Recent activity */}
      <div className="cotify-card p-6 relative">
        <h3 className="text-[15px] font-bold text-foreground tracking-tight">最近活动</h3>
        <div className="mt-4 space-y-0">
          {activities.map((a) => {
            const Icon = getActivityIcon(a.type, a.status)
            return (
              <div
                key={a.id}
                className="flex items-center gap-3 py-3 transition-colors rounded-lg px-2 -mx-2 dark:hover:bg-white/[0.02] hover:bg-black/[0.02] border-b border-border/50"
              >
                <div
                  className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted"
                >
                  <Icon className="h-4 w-4 text-foreground/35" />
                </div>
                <span className="flex-1 text-sm text-foreground/70 truncate">{a.title}</span>
                <span
                  className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${statusColors[a.status] ?? statusColors.draft}`}
                >
                  {statusLabels[a.status] ?? a.status}
                </span>
                <span className="text-[11px] whitespace-nowrap text-foreground/20">
                  {formatRelativeTime(a.updatedAt)}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
