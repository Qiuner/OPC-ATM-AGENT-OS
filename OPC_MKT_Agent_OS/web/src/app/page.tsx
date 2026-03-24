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
  if (diffMin < 60) return `${diffMin} 分钟前`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours} 小时前`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 30) return `${diffDays} 天前`;
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
    // Check connection on mount
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
    <div className="cotify-card p-6 relative overflow-hidden">
      {/* Glow accent */}
      <div
        className="absolute -top-10 -right-10 w-[300px] h-[200px] pointer-events-none"
        style={{ background: 'radial-gradient(ellipse, rgba(34,211,238,0.06), transparent 70%)' }}
      />

      {/* Header */}
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
              <h3 className="text-sm font-semibold text-white">OpenClaw Gateway</h3>
              <span
                className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium"
                style={{
                  background: connected ? 'rgba(34,197,94,0.10)' : 'rgba(239,68,68,0.10)',
                  color: connected ? '#22c55e' : '#ef4444',
                }}
              >
                <span
                  className="h-1.5 w-1.5 rounded-full"
                  style={{ background: connected ? '#22c55e' : '#ef4444' }}
                />
                {connected ? '已连接' : '离线'}
              </span>
            </div>
            <p className="text-[12px]" style={{ color: 'rgba(255,255,255,0.3)' }}>
              {connected ? `Bot: ${botName} — 通过指令驱动 Agent OS 生成出海内容` : '正在连接...'}
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
                background: platform === p ? 'rgba(167,139,250,0.15)' : 'rgba(255,255,255,0.04)',
                color: platform === p ? '#a78bfa' : 'rgba(255,255,255,0.3)',
                border: `1px solid ${platform === p ? 'rgba(167,139,250,0.25)' : 'rgba(255,255,255,0.06)'}`,
              }}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Command flow visualization */}
      <div
        className="flex items-center gap-2 mb-4 py-3 px-4 rounded-xl"
        style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)' }}
      >
        <div className="flex items-center gap-1.5 text-[11px]" style={{ color: 'rgba(255,255,255,0.5)' }}>
          <Megaphone className="h-3.5 w-3.5" style={{ color: '#22d3ee' }} />
          <span>Campaign</span>
        </div>
        <ArrowRight className="h-3 w-3" style={{ color: 'rgba(255,255,255,0.15)' }} />
        <div className="flex items-center gap-1.5 text-[11px]" style={{ color: 'rgba(255,255,255,0.5)' }}>
          <Zap className="h-3.5 w-3.5" style={{ color: '#a78bfa' }} />
          <span>Agent OS</span>
        </div>
        <ArrowRight className="h-3 w-3" style={{ color: 'rgba(255,255,255,0.15)' }} />
        <div className="flex items-center gap-1.5 text-[11px]" style={{ color: 'rgba(255,255,255,0.5)' }}>
          <PenTool className="h-3.5 w-3.5" style={{ color: '#fbbf24' }} />
          <span>Content</span>
        </div>
        <ArrowRight className="h-3 w-3" style={{ color: 'rgba(255,255,255,0.15)' }} />
        <div className="flex items-center gap-1.5 text-[11px]" style={{ color: 'rgba(255,255,255,0.5)' }}>
          <Send className="h-3.5 w-3.5" style={{ color: '#22c55e' }} />
          <span>Publish</span>
        </div>
        <ArrowRight className="h-3 w-3" style={{ color: 'rgba(255,255,255,0.15)' }} />
        <div className="flex items-center gap-1.5 text-[11px]" style={{ color: 'rgba(255,255,255,0.5)' }}>
          <BarChart3 className="h-3.5 w-3.5" style={{ color: '#f472b6' }} />
          <span>Analytics</span>
        </div>
      </div>

      {/* Input + quick commands */}
      <div className="flex gap-2 mb-3">
        <input
          value={command}
          onChange={(e) => setCommand(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !sending) void handleSend('generate_content', command);
          }}
          placeholder="输入主题，如「AI tools for productivity」..."
          className="flex-1 rounded-xl px-4 py-2.5 text-sm text-white placeholder-[rgba(255,255,255,0.2)] outline-none"
          style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
          }}
        />
        <button
          onClick={() => void handleSend('generate_content', command)}
          disabled={sending || !command.trim()}
          className="rounded-xl px-4 py-2.5 text-sm font-medium transition-all disabled:opacity-40"
          style={{
            background: 'rgba(167,139,250,0.15)',
            color: '#a78bfa',
            border: '1px solid rgba(167,139,250,0.25)',
          }}
        >
          {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : '发送指令'}
        </button>
      </div>

      <div className="flex gap-2 mb-4">
        {quickCommands.map((qc) => (
          <button
            key={qc.cmd}
            onClick={() => void handleSend(qc.cmd, command || 'AI marketing tools')}
            disabled={sending}
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-medium transition-all hover:brightness-110 disabled:opacity-40"
            style={{
              background: 'rgba(255,255,255,0.04)',
              color: 'rgba(255,255,255,0.5)',
              border: '1px solid rgba(255,255,255,0.06)',
            }}
          >
            <qc.icon className="h-3 w-3" />
            {qc.label}
          </button>
        ))}
      </div>

      {/* Command logs */}
      {logs.length > 0 && (
        <div className="space-y-1.5 max-h-[180px] overflow-y-auto">
          {logs.map((log, i) => (
            <div
              key={i}
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-[12px]"
              style={{ background: 'rgba(255,255,255,0.02)' }}
            >
              <span style={{ color: 'rgba(255,255,255,0.2)' }}>{log.time}</span>
              <span style={{ color: 'rgba(255,255,255,0.6)' }}>{log.command}</span>
              <span className="flex-1" />
              <span
                className="inline-flex items-center gap-1 rounded-full px-2 py-0.5"
                style={{
                  background:
                    log.status === 'success'
                      ? 'rgba(34,197,94,0.10)'
                      : log.status === 'error'
                        ? 'rgba(239,68,68,0.10)'
                        : 'rgba(251,191,36,0.10)',
                  color:
                    log.status === 'success' ? '#22c55e' : log.status === 'error' ? '#ef4444' : '#fbbf24',
                }}
              >
                {log.status === 'pending' && <Loader2 className="h-3 w-3 animate-spin" />}
                {log.status === 'success' ? '成功' : log.status === 'error' ? '失败' : '处理中'}
              </span>
              {log.result && (
                <span className="text-[11px] max-w-[200px] truncate" style={{ color: 'rgba(255,255,255,0.3)' }}>
                  {log.result}
                </span>
              )}
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
    { label: '总任务数', value: metrics.totalTasks, unit: '个', icon: ListTodo, color: '#a78bfa' },
    { label: '待审核内容', value: metrics.reviewContents, unit: '件', amber: true, icon: Eye, color: '#fbbf24' },
    { label: '已发布内容', value: metrics.publishedContents, unit: '篇', icon: Send, color: '#22d3ee' },
    { label: '活跃活动', value: metrics.activeCampaigns, unit: '个', icon: Megaphone, color: '#22c55e' },
  ];

  return (
    <div className="space-y-6 max-w-[1200px] relative">
      {/* Ambient glow */}
      <div className="absolute -top-20 -left-20 w-[600px] h-[400px] pointer-events-none"
        style={{ background: 'radial-gradient(ellipse at 30% 30%, rgba(167,139,250,0.05), transparent 70%)' }}
      />

      {/* Page intro */}
      <div className="relative">
        <h2 className="text-2xl font-bold text-white tracking-tight" style={{ letterSpacing: '-0.03em' }}>
          Overview
        </h2>
        <p className="mt-1 text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>
          营销 Agent OS 总览 — 查看关键指标、内容产出与平台表现。
        </p>
        <div className="mt-4">
          <GeneratePlanButton />
        </div>
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 relative">
        {metricCards.map((m) => (
          <div key={m.label} className="cotify-card p-6 group">
            <div className="flex items-center justify-between">
              <p className="text-[13px] font-medium" style={{ color: 'rgba(255,255,255,0.4)' }}>
                {m.label}
              </p>
              <div className="flex h-9 w-9 items-center justify-center rounded-xl"
                style={{ background: `${m.color}10`, border: `1px solid ${m.color}20` }}
              >
                <m.icon className="h-4 w-4" style={{ color: m.color }} />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-1.5">
              {loading ? (
                <Loader2 className="h-6 w-6 animate-spin" style={{ color: 'rgba(255,255,255,0.2)' }} />
              ) : (
                <>
                  <span className="text-3xl font-bold text-white tracking-tight">{m.value}</span>
                  <span className="text-sm" style={{ color: 'rgba(255,255,255,0.3)' }}>{m.unit}</span>
                </>
              )}
            </div>
            {m.amber && m.value > 0 && (
              <div className="mt-2">
                <span className="text-[12px] font-medium" style={{ color: '#fbbf24' }}>需处理</span>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* OpenClaw Integration Panel */}
      <OpenClawPanel />

      {/* Recent activity */}
      <div className="cotify-card p-6 relative">
        <h3 className="text-sm font-semibold text-white">最近活动</h3>
        {loading ? (
          <div className="mt-4 flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" style={{ color: 'rgba(255,255,255,0.2)' }} />
          </div>
        ) : activities.length === 0 ? (
          <div className="mt-4 text-center py-8 text-sm" style={{ color: 'rgba(255,255,255,0.25)' }}>
            暂无活动记录
          </div>
        ) : (
          <div className="mt-4 space-y-0">
            {activities.map((a) => {
              const Icon = getActivityIcon(a.type, a.status);
              return (
                <div key={a.id}
                  className="flex items-center gap-3 py-3 transition-colors rounded-lg px-2 -mx-2 hover:bg-[rgba(255,255,255,0.02)]"
                  style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg"
                    style={{ background: 'rgba(255,255,255,0.04)' }}
                  >
                    <Icon className="h-4 w-4" style={{ color: 'rgba(255,255,255,0.35)' }} />
                  </div>
                  <span className="flex-1 text-sm text-[rgba(255,255,255,0.7)] truncate">
                    {a.title}
                  </span>
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${statusColors[a.status] ?? statusColors.draft}`}>
                    {statusLabels[a.status] ?? a.status}
                  </span>
                  <span className="text-[11px] whitespace-nowrap" style={{ color: 'rgba(255,255,255,0.2)' }}>
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
