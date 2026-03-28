'use client';

import { useEffect, useState, useCallback } from 'react';
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
  MessageSquare,
  PenTool,
  BarChart3,
  TrendingUp,
} from 'lucide-react';
import { GeneratePlanButton } from '@/components/features/generate-plan-button';
import type { Task, Content } from '@/types';

interface DashboardMetrics {
  totalTasks: number;
  reviewContents: number;
  publishedContents: number;
  activeCampaigns: number;
}

interface ActivityItem {
  id: string;
  type: 'task' | 'content';
  title: string;
  status: string;
  updatedAt: string;
}

const statusColors: Record<string, string> = {
  draft: 'bg-[rgba(255,255,255,0.06)] text-[rgba(255,255,255,0.4)]',
  review: 'bg-[rgba(251,191,36,0.10)] text-[#fbbf24]',
  approved: 'bg-[rgba(34,197,94,0.10)] text-[#22c55e]',
  rejected: 'bg-[rgba(239,68,68,0.10)] text-[#ef4444]',
  published: 'bg-[rgba(167,139,250,0.10)] text-[#a78bfa]',
  backlog: 'bg-[rgba(255,255,255,0.06)] text-[rgba(255,255,255,0.4)]',
  scheduled: 'bg-[rgba(34,211,238,0.10)] text-[#22d3ee]',
};

const statusLabels: Record<string, string> = {
  draft: '草稿',
  review: '审核中',
  approved: '已通过',
  rejected: '已拒绝',
  published: '已发布',
  backlog: '待处理',
  scheduled: '已排期',
};

function getActivityIcon(type: string, status: string) {
  if (type === 'content') {
    if (status === 'published') return Send;
    if (status === 'approved') return CheckCircle2;
    if (status === 'review') return Eye;
    return FileText;
  }
  if (status === 'scheduled') return Clock;
  return ListTodo;
}

function formatRelativeTime(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return '刚刚';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 30) return `${diffDays}d ago`;
  return date.toLocaleDateString('zh-CN');
}

// ---------------------------------------------------------------------------
// OpenClaw Integration Panel
// ---------------------------------------------------------------------------

interface OpenClawLog {
  time: string;
  command: string;
  status: 'success' | 'pending' | 'error';
  result?: string;
}

function OpenClawPanel() {
  const [command, setCommand] = useState('');
  const [platform, setPlatform] = useState('X');
  const [logs, setLogs] = useState<OpenClawLog[]>([]);
  const [sending, setSending] = useState(false);
  const [connected, setConnected] = useState(false);
  const [botName, setBotName] = useState('');

  useEffect(() => {
    fetch('/api/openclaw')
      .then((r) => r.json())
      .then((d: { success: boolean }) => {
        if (d.success) {
          setConnected(true);
          setBotName('湾区虾哥');
        }
      })
      .catch(() => {});
  }, []);

  const handleSend = async (cmd: string, topic: string) => {
    if (!topic.trim() && cmd !== 'get_status') return;
    setSending(true);
    const newLog: OpenClawLog = {
      time: new Date().toLocaleTimeString('zh-CN'),
      command: cmd === 'generate_content' ? `生成内容: ${topic}` : cmd === 'get_status' ? '查询状态' : `${cmd}: ${topic}`,
      status: 'pending',
    };
    setLogs((prev) => [newLog, ...prev]);

    try {
      const res = await fetch('/api/openclaw', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          command: cmd,
          params: { topic, platform },
          feishu_chat_id: 'oc_34b771771cb6dac5b305cf8ee4fe11ca',
        }),
      });
      const data = await res.json() as { success: boolean; data?: { message?: string } };
      setLogs((prev) =>
        prev.map((l, i) =>
          i === 0 ? { ...l, status: data.success ? 'success' : 'error', result: data.data?.message ?? '完成' } : l
        )
      );
      setCommand('');
    } catch {
      setLogs((prev) =>
        prev.map((l, i) => (i === 0 ? { ...l, status: 'error', result: '请求失败' } : l))
      );
    } finally {
      setSending(false);
    }
  };

  const quickCommands = [
    { label: '生成内容', icon: PenTool, cmd: 'generate_content' },
    { label: '系统状态', icon: BarChart3, cmd: 'get_status' },
    { label: '竞品分析', icon: MessageSquare, cmd: 'competitor_analysis' },
  ];

  const platforms = ['X', 'LinkedIn', 'TikTok', 'Meta', 'Email', 'Blog'];

  return (
    <div className="rounded-xl p-5 relative overflow-hidden"
      style={{
        background: '#0a0a0f',
        border: '1px solid rgba(255,255,255,0.06)',
      }}
    >
      {/* Subtle glow */}
      <div className="absolute -top-16 -right-16 w-[250px] h-[180px] pointer-events-none"
        style={{ background: 'radial-gradient(ellipse, rgba(34,211,238,0.04), transparent 70%)' }}
      />

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg"
            style={{ background: 'rgba(34,211,238,0.08)' }}
          >
            <Bot className="h-4.5 w-4.5" style={{ color: '#22d3ee' }} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-[13px] font-semibold text-white">OpenClaw Gateway</h3>
              <span className="inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-medium"
                style={{
                  background: connected ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.08)',
                  color: connected ? '#22c55e' : '#ef4444',
                }}
              >
                <span className="h-1.5 w-1.5 rounded-full"
                  style={{ background: connected ? '#22c55e' : '#ef4444' }}
                />
                {connected ? '在线' : '离线'}
              </span>
            </div>
            <p className="text-[11px]" style={{ color: 'rgba(255,255,255,0.25)' }}>
              {connected ? `Bot: ${botName}` : '正在连接...'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {platforms.map((p) => (
            <button
              key={p}
              onClick={() => setPlatform(p)}
              className="rounded-md px-2 py-1 text-[11px] font-medium transition-all duration-150"
              style={{
                background: platform === p ? 'rgba(167,139,250,0.12)' : 'transparent',
                color: platform === p ? '#a78bfa' : 'rgba(255,255,255,0.25)',
              }}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Pipeline visualization */}
      <div className="flex items-center gap-2 mb-4 py-2.5 px-3 rounded-lg"
        style={{ background: 'rgba(255,255,255,0.02)' }}
      >
        {[
          { icon: Megaphone, label: 'Campaign', color: '#22d3ee' },
          { icon: Zap, label: 'Agent OS', color: '#a78bfa' },
          { icon: PenTool, label: 'Content', color: '#fbbf24' },
          { icon: Send, label: 'Publish', color: '#22c55e' },
          { icon: BarChart3, label: 'Analytics', color: '#f472b6' },
        ].map((step, i, arr) => (
          <div key={step.label} className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 text-[11px]" style={{ color: 'rgba(255,255,255,0.4)' }}>
              <step.icon className="h-3.5 w-3.5" style={{ color: step.color }} />
              <span>{step.label}</span>
            </div>
            {i < arr.length - 1 && (
              <ArrowRight className="h-3 w-3" style={{ color: 'rgba(255,255,255,0.1)' }} />
            )}
          </div>
        ))}
      </div>

      {/* Input */}
      <div className="flex gap-2 mb-3">
        <input
          value={command}
          onChange={(e) => setCommand(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !sending) void handleSend('generate_content', command);
          }}
          placeholder="输入主题，如「AI tools for productivity」..."
          className="flex-1 rounded-lg px-3.5 py-2 text-[13px] text-white placeholder-[rgba(255,255,255,0.18)] outline-none transition-all duration-150"
          style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.07)',
          }}
          onFocus={e => (e.target as HTMLElement).style.borderColor = 'rgba(167,139,250,0.3)'}
          onBlur={e => (e.target as HTMLElement).style.borderColor = 'rgba(255,255,255,0.07)'}
        />
        <button
          onClick={() => void handleSend('generate_content', command)}
          disabled={sending || !command.trim()}
          className="rounded-lg px-4 py-2 text-[13px] font-medium transition-all duration-150 disabled:opacity-30"
          style={{ background: '#a78bfa', color: '#fff' }}
        >
          {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Send'}
        </button>
      </div>

      <div className="flex gap-1.5 mb-4">
        {quickCommands.map((qc) => (
          <button
            key={qc.cmd}
            onClick={() => void handleSend(qc.cmd, command || 'AI marketing tools')}
            disabled={sending}
            className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[11px] font-medium transition-all duration-150 hover:bg-[rgba(255,255,255,0.05)] disabled:opacity-30"
            style={{ color: 'rgba(255,255,255,0.4)' }}
          >
            <qc.icon className="h-3 w-3" />
            {qc.label}
          </button>
        ))}
      </div>

      {/* Logs */}
      {logs.length > 0 && (
        <div className="space-y-1 max-h-[160px] overflow-y-auto">
          {logs.map((log, i) => (
            <div key={i}
              className="flex items-center gap-3 px-2.5 py-1.5 rounded-md text-[11px]"
              style={{ background: 'rgba(255,255,255,0.02)' }}
            >
              <span style={{ color: 'rgba(255,255,255,0.15)' }}>{log.time}</span>
              <span style={{ color: 'rgba(255,255,255,0.5)' }}>{log.command}</span>
              <span className="flex-1" />
              <span className="inline-flex items-center gap-1 rounded-full px-1.5 py-0.5"
                style={{
                  background: log.status === 'success' ? 'rgba(34,197,94,0.08)' : log.status === 'error' ? 'rgba(239,68,68,0.08)' : 'rgba(251,191,36,0.08)',
                  color: log.status === 'success' ? '#22c55e' : log.status === 'error' ? '#ef4444' : '#fbbf24',
                }}
              >
                {log.status === 'pending' && <Loader2 className="h-3 w-3 animate-spin" />}
                {log.status === 'success' ? 'Done' : log.status === 'error' ? 'Failed' : '...'}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function DashboardPage() {
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    totalTasks: 0,
    reviewContents: 0,
    publishedContents: 0,
    activeCampaigns: 0,
  });
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const [tasksRes, contentsRes] = await Promise.all([
        fetch('/api/tasks'),
        fetch('/api/contents'),
      ]);

      const tasksData = (await tasksRes.json()) as { success: boolean; data: Task[] };
      const contentsData = (await contentsRes.json()) as { success: boolean; data: Content[] };

      const tasks = tasksData.success ? tasksData.data : [];
      const contents = contentsData.success ? contentsData.data : [];

      const reviewContents = contents.filter((c) => c.status === 'review').length;
      const publishedContents = contents.filter((c) => c.status === 'published').length;

      setMetrics({ totalTasks: tasks.length, reviewContents, publishedContents, activeCampaigns: 0 });

      const taskItems: ActivityItem[] = tasks.map((t) => ({
        id: t.id, type: 'task' as const, title: t.title, status: t.status, updatedAt: t.updated_at,
      }));
      const contentItems: ActivityItem[] = contents.map((c) => ({
        id: c.id, type: 'content' as const, title: c.title, status: c.status, updatedAt: c.updated_at,
      }));

      const allItems = [...taskItems, ...contentItems]
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
        .slice(0, 10);

      setActivities(allItems);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const metricCards = [
    { label: '总任务数', value: metrics.totalTasks, unit: '个', icon: ListTodo, color: '#a78bfa', trend: '+12%' },
    { label: '待审核', value: metrics.reviewContents, unit: '件', icon: Eye, color: '#fbbf24', alert: true },
    { label: '已发布', value: metrics.publishedContents, unit: '篇', icon: Send, color: '#22d3ee', trend: '+8%' },
    { label: '活跃活动', value: metrics.activeCampaigns, unit: '个', icon: Megaphone, color: '#22c55e' },
  ];

  return (
    <div className="space-y-5 max-w-[1100px]">
      {/* Page intro */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white tracking-tight" style={{ letterSpacing: '-0.02em' }}>
            Welcome back
          </h2>
          <p className="mt-0.5 text-[13px]" style={{ color: 'rgba(255,255,255,0.35)' }}>
            营销 Agent OS 总览 — 查看关键指标与内容产出
          </p>
        </div>
        <GeneratePlanButton />
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {metricCards.map((m) => (
          <div key={m.label}
            className="group rounded-xl p-4 transition-all duration-200 hover:-translate-y-0.5"
            style={{
              background: '#0a0a0f',
              border: '1px solid rgba(255,255,255,0.06)',
            }}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.1)'}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.06)'}
          >
            <div className="flex items-center justify-between mb-3">
              <p className="text-[12px] font-medium" style={{ color: 'rgba(255,255,255,0.35)' }}>
                {m.label}
              </p>
              <div className="flex h-7 w-7 items-center justify-center rounded-lg"
                style={{ background: `${m.color}0a` }}
              >
                <m.icon className="h-3.5 w-3.5" style={{ color: m.color }} />
              </div>
            </div>
            <div className="flex items-baseline gap-1.5">
              {loading ? (
                <Loader2 className="h-5 w-5 animate-spin" style={{ color: 'rgba(255,255,255,0.15)' }} />
              ) : (
                <>
                  <span className="text-2xl font-bold text-white" style={{ letterSpacing: '-0.03em' }}>
                    {m.value}
                  </span>
                  <span className="text-[12px]" style={{ color: 'rgba(255,255,255,0.2)' }}>{m.unit}</span>
                  {m.trend && (
                    <span className="flex items-center gap-0.5 ml-auto text-[11px] font-medium"
                      style={{ color: '#22c55e' }}
                    >
                      <TrendingUp className="h-3 w-3" />
                      {m.trend}
                    </span>
                  )}
                  {m.alert && m.value > 0 && (
                    <span className="ml-auto text-[11px] font-medium" style={{ color: '#fbbf24' }}>
                      待处理
                    </span>
                  )}
                </>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* OpenClaw Panel */}
      <OpenClawPanel />

      {/* Recent activity */}
      <div className="rounded-xl p-5"
        style={{
          background: '#0a0a0f',
          border: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[13px] font-semibold text-white">Recent Activity</h3>
          <span className="text-[11px]" style={{ color: 'rgba(255,255,255,0.2)' }}>
            {activities.length} items
          </span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin" style={{ color: 'rgba(255,255,255,0.15)' }} />
          </div>
        ) : activities.length === 0 ? (
          <div className="text-center py-8 text-[13px]" style={{ color: 'rgba(255,255,255,0.2)' }}>
            暂无活动记录
          </div>
        ) : (
          <div className="space-y-0">
            {activities.map((a, idx) => {
              const Icon = getActivityIcon(a.type, a.status);
              return (
                <div key={a.id}
                  className="flex items-center gap-3 py-2.5 transition-colors rounded-md px-2 -mx-2 hover:bg-[rgba(255,255,255,0.02)] cursor-default"
                  style={idx < activities.length - 1 ? { borderBottom: '1px solid rgba(255,255,255,0.03)' } : {}}
                >
                  <div className="flex h-7 w-7 items-center justify-center rounded-md shrink-0"
                    style={{ background: 'rgba(255,255,255,0.03)' }}
                  >
                    <Icon className="h-3.5 w-3.5" style={{ color: 'rgba(255,255,255,0.3)' }} />
                  </div>
                  <span className="flex-1 text-[13px] text-[rgba(255,255,255,0.6)] truncate">
                    {a.title}
                  </span>
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${statusColors[a.status] ?? statusColors.draft}`}>
                    {statusLabels[a.status] ?? a.status}
                  </span>
                  <span className="text-[10px] font-mono whitespace-nowrap" style={{ color: 'rgba(255,255,255,0.15)' }}>
                    {formatRelativeTime(a.updatedAt)}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
