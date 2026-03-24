'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  BarChart3,
  Plus,
  Loader2,
  FileBarChart,
  CheckCircle2,
  Brain,
  TrendingUp,
  TrendingDown,
  Sparkles,
  FlaskConical,
  ChevronDown,
  ChevronUp,
  Lightbulb,
  AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useAIConfig } from '@/lib/ai-config';
import type { Content, MetricRecord } from '@/types';

// --- Types ---

interface AgentOutput {
  agentType: string;
  status: 'success' | 'failed';
  data: Record<string, unknown>;
  error?: string;
}

interface ExperimentResult {
  impressions: number;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  leads: number;
  qualityScore: number | null;
  notes: string;
}

interface LearningRecord {
  id: string;
  createdAt: string;
  agentType: string;
  platform: string;
  theme: string;
  hypothesis: string;
  experimentResult: ExperimentResult | null;
  learnings: string;
  isSuccessful: boolean | null;
  contentId: string | null;
}

interface LearningSummary {
  total: number;
  withResults: number;
  successful: number;
  failed: number;
  byPlatform: Record<string, number>;
  byAgent: Record<string, number>;
}

type TabKey = 'metrics' | 'learnings';

// ==========================================
// Analytics Page — 数据指标 + 闭环学习
// ==========================================

export default function AnalyticsPage() {
  const { config } = useAIConfig();
  const [activeTab, setActiveTab] = useState<TabKey>('metrics');

  return (
    <div className="space-y-6 max-w-[1200px]">
      {/* Page header */}
      <div>
        <h2 className="text-2xl font-bold text-white">Analytics</h2>
        <p className="mt-1 text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>
          录入数据指标、查看效果分析、闭环学习复盘。
        </p>
      </div>

      {/* Tab Switcher */}
      <div className="flex gap-1 p-1 rounded-lg" style={{ background: 'rgba(255,255,255,0.04)' }}>
        <button
          onClick={() => setActiveTab('metrics')}
          className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
            activeTab === 'metrics'
              ? 'bg-gradient-to-r from-[#a78bfa]/20 to-[#7c3aed]/20 text-white'
              : 'text-white/40 hover:text-white/60'
          }`}
          style={activeTab === 'metrics' ? { border: '1px solid rgba(167,139,250,0.3)' } : {}}
        >
          <BarChart3 className="h-4 w-4" />
          数据指标
        </button>
        <button
          onClick={() => setActiveTab('learnings')}
          className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
            activeTab === 'learnings'
              ? 'bg-gradient-to-r from-[#22d3ee]/20 to-[#06b6d4]/20 text-white'
              : 'text-white/40 hover:text-white/60'
          }`}
          style={activeTab === 'learnings' ? { border: '1px solid rgba(34,211,238,0.3)' } : {}}
        >
          <Brain className="h-4 w-4" />
          闭环学习
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'metrics' ? (
        <MetricsTab config={config} />
      ) : (
        <LearningsTab config={config} />
      )}
    </div>
  );
}

// ==========================================
// Metrics Tab (原有功能)
// ==========================================

function MetricsTab({ config }: { config: { defaultProvider: string; keys: Record<string, string> } }) {
  const [contents, setContents] = useState<Content[]>([]);
  const [metrics, setMetrics] = useState<MetricRecord[]>([]);
  const [loadingContents, setLoadingContents] = useState(true);
  const [loadingMetrics, setLoadingMetrics] = useState(true);

  const [selectedContentId, setSelectedContentId] = useState('');
  const [impressions, setImpressions] = useState('');
  const [likes, setLikes] = useState('');
  const [comments, setComments] = useState('');
  const [saves, setSaves] = useState('');
  const [shares, setShares] = useState('');
  const [leads, setLeads] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const [reportLoading, setReportLoading] = useState(false);
  const [reportContent, setReportContent] = useState<string | null>(null);

  const fetchContents = useCallback(async () => {
    try {
      const res = await fetch('/api/contents');
      const data = (await res.json()) as { success: boolean; data: Content[] };
      if (data.success) setContents(data.data);
    } catch { /* silently fail */ } finally {
      setLoadingContents(false);
    }
  }, []);

  const fetchMetrics = useCallback(async () => {
    try {
      const res = await fetch('/api/metrics');
      const data = (await res.json()) as { success: boolean; data: MetricRecord[] };
      if (data.success) setMetrics(data.data);
    } catch { /* silently fail */ } finally {
      setLoadingMetrics(false);
    }
  }, []);

  useEffect(() => {
    void fetchContents();
    void fetchMetrics();
  }, [fetchContents, fetchMetrics]);

  const handleSubmitMetric = async () => {
    if (!selectedContentId) return;
    const content = contents.find((c) => c.id === selectedContentId);
    if (!content) return;

    setSubmitting(true);
    setSubmitSuccess(false);

    try {
      const res = await fetch('/api/metrics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content_id: selectedContentId,
          content_title: content.title,
          platform: content.platform,
          impressions: parseInt(impressions) || 0,
          likes: parseInt(likes) || 0,
          comments: parseInt(comments) || 0,
          saves: parseInt(saves) || 0,
          shares: parseInt(shares) || 0,
          leads: parseInt(leads) || 0,
          recorded_at: new Date().toISOString(),
        }),
      });

      const data = (await res.json()) as { success: boolean };
      if (data.success) {
        setSubmitSuccess(true);
        setSelectedContentId('');
        setImpressions('');
        setLikes('');
        setComments('');
        setSaves('');
        setShares('');
        setLeads('');
        void fetchMetrics();
        setTimeout(() => setSubmitSuccess(false), 3000);
      }
    } catch { /* silently fail */ } finally {
      setSubmitting(false);
    }
  };

  const handleGenerateReport = async () => {
    setReportLoading(true);
    setReportContent(null);
    const endDate = new Date().toISOString();
    const startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    try {
      const res = await fetch('/api/analytics/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startDate,
          endDate,
          provider: config.defaultProvider,
          apiKeys: config.keys,
        }),
      });

      const data = (await res.json()) as { success: boolean; data: AgentOutput };
      if (data.success && data.data.status === 'success') {
        setReportContent(formatReport(data.data.data));
      } else {
        setReportContent('报告生成失败，请检查 AI 配置后重试。');
      }
    } catch {
      setReportContent('报告生成失败，请稍后重试。');
    } finally {
      setReportLoading(false);
    }
  };

  return (
    <>
      {/* Metrics Input Form */}
      <div
        className="rounded-xl p-6"
        style={{ background: '#0a0a0f', border: '1px solid rgba(255,255,255,0.08)' }}
      >
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 className="h-5 w-5" style={{ color: 'rgba(255,255,255,0.4)' }} />
          <h3 className="text-sm font-semibold text-white">录入数据指标</h3>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: 'rgba(255,255,255,0.6)' }}>
              选择内容
            </label>
            {loadingContents ? (
              <div className="flex items-center gap-2 text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>
                <Loader2 className="h-4 w-4 animate-spin" /> 加载中...
              </div>
            ) : (
              <select
                value={selectedContentId}
                onChange={(e) => setSelectedContentId(e.target.value)}
                className="h-8 w-full rounded-lg px-2.5 py-1 text-sm text-white outline-none focus:ring-2 focus:ring-[#a78bfa]/50"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
              >
                <option value="">请选择内容...</option>
                {contents.map((c) => (
                  <option key={c.id} value={c.id}>
                    [{c.platform}] {c.title}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {[
              { label: '曝光', value: impressions, setter: setImpressions },
              { label: '点赞', value: likes, setter: setLikes },
              { label: '评论', value: comments, setter: setComments },
              { label: '收藏', value: saves, setter: setSaves },
              { label: '分享', value: shares, setter: setShares },
              { label: '线索', value: leads, setter: setLeads },
            ].map((field) => (
              <div key={field.label}>
                <label className="block text-xs font-medium mb-1" style={{ color: 'rgba(255,255,255,0.4)' }}>
                  {field.label}
                </label>
                <Input
                  type="number"
                  min="0"
                  placeholder="0"
                  value={field.value}
                  onChange={(e) => field.setter(e.target.value)}
                />
              </div>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <Button
              onClick={handleSubmitMetric}
              disabled={!selectedContentId || submitting}
              className="bg-gradient-to-r from-[#a78bfa] to-[#7c3aed] text-white hover:opacity-90 border-0"
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" data-icon="inline-start" />
              ) : (
                <Plus className="h-4 w-4" data-icon="inline-start" />
              )}
              提交数据
            </Button>
            {submitSuccess && (
              <span className="flex items-center gap-1 text-sm text-[#22d3ee]">
                <CheckCircle2 className="h-4 w-4" /> 提交成功
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Metrics Table */}
      <div
        className="rounded-xl p-6"
        style={{ background: '#0a0a0f', border: '1px solid rgba(255,255,255,0.08)' }}
      >
        <h3 className="text-sm font-semibold text-white mb-4">数据记录</h3>
        {loadingMetrics ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" style={{ color: 'rgba(255,255,255,0.25)' }} />
          </div>
        ) : metrics.length === 0 ? (
          <div className="text-center py-8 text-sm" style={{ color: 'rgba(255,255,255,0.25)' }}>
            暂无数据记录，请先录入指标数据。
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>内容标题</TableHead>
                <TableHead>平台</TableHead>
                <TableHead className="text-right">曝光</TableHead>
                <TableHead className="text-right">点赞</TableHead>
                <TableHead className="text-right">评论</TableHead>
                <TableHead className="text-right">收藏</TableHead>
                <TableHead className="text-right">分享</TableHead>
                <TableHead className="text-right">线索</TableHead>
                <TableHead>记录时间</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {metrics.map((m) => (
                <TableRow key={m.id}>
                  <TableCell className="max-w-[200px] truncate font-medium">{m.content_title}</TableCell>
                  <TableCell>
                    <span
                      className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium"
                      style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.6)' }}
                    >
                      {m.platform}
                    </span>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{m.impressions.toLocaleString()}</TableCell>
                  <TableCell className="text-right tabular-nums">{m.likes.toLocaleString()}</TableCell>
                  <TableCell className="text-right tabular-nums">{m.comments.toLocaleString()}</TableCell>
                  <TableCell className="text-right tabular-nums">{m.saves.toLocaleString()}</TableCell>
                  <TableCell className="text-right tabular-nums">{m.shares.toLocaleString()}</TableCell>
                  <TableCell className="text-right tabular-nums">{m.leads.toLocaleString()}</TableCell>
                  <TableCell className="text-xs whitespace-nowrap" style={{ color: 'rgba(255,255,255,0.4)' }}>
                    {new Date(m.recorded_at).toLocaleString('zh-CN')}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Weekly Report */}
      <div
        className="rounded-xl p-6"
        style={{ background: '#0a0a0f', border: '1px solid rgba(255,255,255,0.08)' }}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <FileBarChart className="h-5 w-5" style={{ color: 'rgba(255,255,255,0.4)' }} />
            <h3 className="text-sm font-semibold text-white">营销周报</h3>
          </div>
          <Button
            variant="outline"
            onClick={handleGenerateReport}
            disabled={reportLoading}
            className="border-white/[0.08] bg-transparent hover:bg-white/5"
            style={{ color: 'rgba(255,255,255,0.6)' }}
          >
            {reportLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" data-icon="inline-start" />
            ) : (
              <FileBarChart className="h-4 w-4" data-icon="inline-start" />
            )}
            生成周报
          </Button>
        </div>

        {reportLoading && (
          <div className="flex items-center justify-center py-12 text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>
            <Loader2 className="h-5 w-5 animate-spin mr-2" />
            正在分析数据并生成报告...
          </div>
        )}

        {reportContent && !reportLoading && (
          <div
            className="rounded-lg p-4"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            <div className="prose prose-sm prose-invert max-w-none whitespace-pre-wrap text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.6)' }}>
              {reportContent}
            </div>
          </div>
        )}

        {!reportContent && !reportLoading && (
          <div className="text-center py-8 text-sm" style={{ color: 'rgba(255,255,255,0.25)' }}>
            点击「生成周报」按钮，AI 将分析最近 7 天的数据并生成分析报告。
          </div>
        )}
      </div>
    </>
  );
}

// ==========================================
// Learnings Tab (新增：闭环学习看板)
// ==========================================

function LearningsTab({ config }: { config: { defaultProvider: string; keys: Record<string, string> } }) {
  const [records, setRecords] = useState<LearningRecord[]>([]);
  const [summary, setSummary] = useState<LearningSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [analyzingId, setAnalyzingId] = useState<string | null>(null);
  const [analyzeResult, setAnalyzeResult] = useState<Record<string, unknown> | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [recordsRes, summaryRes] = await Promise.all([
        fetch('/api/learnings'),
        fetch('/api/learnings?view=summary'),
      ]);
      const recordsData = (await recordsRes.json()) as { success: boolean; data: LearningRecord[] };
      const summaryData = (await summaryRes.json()) as { success: boolean; data: LearningSummary };
      if (recordsData.success) setRecords(recordsData.data);
      if (summaryData.success) setSummary(summaryData.data);
    } catch { /* silently fail */ } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const handleAnalyze = async (contentId: string) => {
    setAnalyzingId(contentId);
    setAnalyzeResult(null);
    try {
      const res = await fetch('/api/learnings/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contentId,
          provider: config.defaultProvider,
          apiKeys: config.keys,
        }),
      });
      const data = (await res.json()) as { success: boolean; data: Record<string, unknown>; error?: string };
      if (data.success) {
        setAnalyzeResult(data.data);
        void fetchData(); // refresh records
      } else {
        setAnalyzeResult({ error: data.error ?? '分析失败' });
      }
    } catch {
      setAnalyzeResult({ error: '请求失败，请重试' });
    } finally {
      setAnalyzingId(null);
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
    setAnalyzeResult(null);
  };

  // Sort: most recent first
  const sortedRecords = [...records].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  const successRate = summary && summary.withResults > 0
    ? Math.round((summary.successful / summary.withResults) * 100)
    : null;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin" style={{ color: 'rgba(255,255,255,0.25)' }} />
      </div>
    );
  }

  return (
    <>
      {/* Summary Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="学习记录"
          value={summary?.total ?? 0}
          icon={<FlaskConical className="h-4 w-4" />}
          color="#a78bfa"
        />
        <StatCard
          label="已有结果"
          value={summary?.withResults ?? 0}
          icon={<BarChart3 className="h-4 w-4" />}
          color="#22d3ee"
        />
        <StatCard
          label="成功模式"
          value={summary?.successful ?? 0}
          icon={<TrendingUp className="h-4 w-4" />}
          color="#4ade80"
        />
        <StatCard
          label="成功率"
          value={successRate !== null ? `${successRate}%` : '—'}
          icon={<Sparkles className="h-4 w-4" />}
          color={successRate !== null && successRate >= 50 ? '#4ade80' : '#f87171'}
        />
      </div>

      {/* Platform & Agent Breakdown */}
      {summary && (Object.keys(summary.byPlatform).length > 0 || Object.keys(summary.byAgent).length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {Object.keys(summary.byPlatform).length > 0 && (
            <div
              className="rounded-xl p-5"
              style={{ background: '#0a0a0f', border: '1px solid rgba(255,255,255,0.08)' }}
            >
              <h4 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'rgba(255,255,255,0.4)' }}>
                按平台分布
              </h4>
              <div className="flex flex-wrap gap-2">
                {Object.entries(summary.byPlatform).map(([platform, count]) => (
                  <span
                    key={platform}
                    className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium"
                    style={{ background: 'rgba(167,139,250,0.1)', border: '1px solid rgba(167,139,250,0.2)', color: '#a78bfa' }}
                  >
                    {platform}
                    <span className="text-white/60">{count}</span>
                  </span>
                ))}
              </div>
            </div>
          )}
          {Object.keys(summary.byAgent).length > 0 && (
            <div
              className="rounded-xl p-5"
              style={{ background: '#0a0a0f', border: '1px solid rgba(255,255,255,0.08)' }}
            >
              <h4 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'rgba(255,255,255,0.4)' }}>
                按 Agent 类型分布
              </h4>
              <div className="flex flex-wrap gap-2">
                {Object.entries(summary.byAgent).map(([agent, count]) => (
                  <span
                    key={agent}
                    className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium"
                    style={{ background: 'rgba(34,211,238,0.1)', border: '1px solid rgba(34,211,238,0.2)', color: '#22d3ee' }}
                  >
                    {agent}
                    <span className="text-white/60">{count}</span>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Learning Records List */}
      <div
        className="rounded-xl p-6"
        style={{ background: '#0a0a0f', border: '1px solid rgba(255,255,255,0.08)' }}
      >
        <div className="flex items-center gap-2 mb-4">
          <Brain className="h-5 w-5" style={{ color: 'rgba(255,255,255,0.4)' }} />
          <h3 className="text-sm font-semibold text-white">学习记录</h3>
          <span className="text-xs ml-auto" style={{ color: 'rgba(255,255,255,0.3)' }}>
            {records.length} 条记录
          </span>
        </div>

        {sortedRecords.length === 0 ? (
          <div className="text-center py-12">
            <FlaskConical className="h-10 w-10 mx-auto mb-3" style={{ color: 'rgba(255,255,255,0.15)' }} />
            <p className="text-sm" style={{ color: 'rgba(255,255,255,0.25)' }}>
              暂无学习记录。运行 Agent 生成内容并录入 Metrics 数据后，系统会自动创建学习记录。
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {sortedRecords.map((record) => (
              <LearningRecordCard
                key={record.id}
                record={record}
                isExpanded={expandedId === record.id}
                onToggle={() => toggleExpand(record.id)}
                onAnalyze={handleAnalyze}
                isAnalyzing={analyzingId === record.contentId}
                analyzeResult={expandedId === record.id ? analyzeResult : null}
              />
            ))}
          </div>
        )}
      </div>

      {/* Prompt Injection Preview */}
      <PromptPreview records={records} />
    </>
  );
}

// ==========================================
// Sub-components
// ==========================================

function StatCard({
  label,
  value,
  icon,
  color,
}: {
  label: string;
  value: number | string;
  icon: React.ReactNode;
  color: string;
}) {
  return (
    <div
      className="rounded-xl p-4"
      style={{ background: '#0a0a0f', border: '1px solid rgba(255,255,255,0.08)' }}
    >
      <div className="flex items-center gap-2 mb-2">
        <span style={{ color }}>{icon}</span>
        <span className="text-xs font-medium" style={{ color: 'rgba(255,255,255,0.4)' }}>
          {label}
        </span>
      </div>
      <div className="text-2xl font-bold tabular-nums" style={{ color }}>
        {value}
      </div>
    </div>
  );
}

function LearningRecordCard({
  record,
  isExpanded,
  onToggle,
  onAnalyze,
  isAnalyzing,
  analyzeResult,
}: {
  record: LearningRecord;
  isExpanded: boolean;
  onToggle: () => void;
  onAnalyze: (contentId: string) => void;
  isAnalyzing: boolean;
  analyzeResult: Record<string, unknown> | null;
}) {
  const hasResult = record.experimentResult !== null;
  const statusColor = record.isSuccessful === true
    ? '#4ade80'
    : record.isSuccessful === false
      ? '#f87171'
      : 'rgba(255,255,255,0.3)';

  const statusLabel = record.isSuccessful === true
    ? '成功'
    : record.isSuccessful === false
      ? '待改进'
      : '待验证';

  const StatusIcon = record.isSuccessful === true
    ? TrendingUp
    : record.isSuccessful === false
      ? TrendingDown
      : FlaskConical;

  return (
    <div
      className="rounded-lg overflow-hidden transition-all"
      style={{
        background: 'rgba(255,255,255,0.02)',
        border: `1px solid ${isExpanded ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.06)'}`,
      }}
    >
      {/* Header - clickable */}
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 p-4 text-left hover:bg-white/[0.02] transition-colors"
      >
        <StatusIcon className="h-4 w-4 shrink-0" style={{ color: statusColor }} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-white truncate">
              {record.theme}
            </span>
            <span
              className="shrink-0 inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium"
              style={{ background: `${statusColor}15`, color: statusColor, border: `1px solid ${statusColor}30` }}
            >
              {statusLabel}
            </span>
          </div>
          <div className="flex items-center gap-3 mt-1">
            <span className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>
              {record.platform}
            </span>
            <span className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>
              {record.agentType} agent
            </span>
            <span className="text-xs" style={{ color: 'rgba(255,255,255,0.25)' }}>
              {new Date(record.createdAt).toLocaleDateString('zh-CN')}
            </span>
          </div>
        </div>
        {isExpanded ? (
          <ChevronUp className="h-4 w-4 shrink-0" style={{ color: 'rgba(255,255,255,0.3)' }} />
        ) : (
          <ChevronDown className="h-4 w-4 shrink-0" style={{ color: 'rgba(255,255,255,0.3)' }} />
        )}
      </button>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="px-4 pb-4 space-y-4" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          {/* Hypothesis */}
          <div className="pt-3">
            <div className="flex items-center gap-1.5 mb-1.5">
              <Lightbulb className="h-3.5 w-3.5" style={{ color: '#fbbf24' }} />
              <span className="text-xs font-semibold" style={{ color: 'rgba(255,255,255,0.5)' }}>假设</span>
            </div>
            <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.6)' }}>
              {record.hypothesis || '无初始假设'}
            </p>
          </div>

          {/* Experiment Result */}
          {hasResult && record.experimentResult && (
            <div>
              <div className="flex items-center gap-1.5 mb-2">
                <BarChart3 className="h-3.5 w-3.5" style={{ color: '#22d3ee' }} />
                <span className="text-xs font-semibold" style={{ color: 'rgba(255,255,255,0.5)' }}>实验数据</span>
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                {[
                  { label: '曝光', value: record.experimentResult.impressions },
                  { label: '点赞', value: record.experimentResult.likes },
                  { label: '评论', value: record.experimentResult.comments },
                  { label: '收藏', value: record.experimentResult.saves },
                  { label: '分享', value: record.experimentResult.shares },
                  { label: '线索', value: record.experimentResult.leads },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="rounded-md px-2.5 py-1.5 text-center"
                    style={{ background: 'rgba(255,255,255,0.03)' }}
                  >
                    <div className="text-[10px]" style={{ color: 'rgba(255,255,255,0.35)' }}>{item.label}</div>
                    <div className="text-sm font-semibold tabular-nums text-white">{item.value.toLocaleString()}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Learnings */}
          {record.learnings && (
            <div>
              <div className="flex items-center gap-1.5 mb-1.5">
                <Brain className="h-3.5 w-3.5" style={{ color: '#a78bfa' }} />
                <span className="text-xs font-semibold" style={{ color: 'rgba(255,255,255,0.5)' }}>经验教训</span>
              </div>
              <div
                className="rounded-md p-3 text-sm leading-relaxed"
                style={{
                  background: record.isSuccessful ? 'rgba(74,222,128,0.05)' : 'rgba(248,113,113,0.05)',
                  border: `1px solid ${record.isSuccessful ? 'rgba(74,222,128,0.15)' : 'rgba(248,113,113,0.15)'}`,
                  color: 'rgba(255,255,255,0.6)',
                }}
              >
                {record.learnings}
              </div>
            </div>
          )}

          {/* Action: AI Deep Analysis */}
          {record.contentId && (
            <div className="flex items-center gap-3 pt-1">
              <Button
                size="sm"
                onClick={() => onAnalyze(record.contentId!)}
                disabled={isAnalyzing}
                className="bg-gradient-to-r from-[#22d3ee]/20 to-[#06b6d4]/20 text-[#22d3ee] hover:from-[#22d3ee]/30 hover:to-[#06b6d4]/30 border border-[#22d3ee]/20"
              >
                {isAnalyzing ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                ) : (
                  <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                )}
                AI 深度分析
              </Button>
              {!hasResult && (
                <span className="text-xs flex items-center gap-1" style={{ color: 'rgba(255,255,255,0.3)' }}>
                  <AlertCircle className="h-3 w-3" />
                  需先在「数据指标」Tab 提交该内容的 Metrics
                </span>
              )}
            </div>
          )}

          {/* Analysis Result */}
          {analyzeResult && (
            <div
              className="rounded-md p-4"
              style={{ background: 'rgba(34,211,238,0.05)', border: '1px solid rgba(34,211,238,0.15)' }}
            >
              {analyzeResult.error ? (
                <p className="text-sm text-red-400">{analyzeResult.error as string}</p>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-[#22d3ee]" />
                    <span className="text-sm font-semibold text-white">AI 分析结果</span>
                  </div>
                  {analyzeResult.analysis != null && (
                    <div className="space-y-2 text-sm" style={{ color: 'rgba(255,255,255,0.6)' }}>
                      <p>{(analyzeResult.analysis as Record<string, unknown>).learnings as string}</p>
                      {!!(analyzeResult.analysis as Record<string, unknown>).patterns && (
                        <div className="flex flex-wrap gap-2 mt-2">
                          {((analyzeResult.analysis as Record<string, unknown>).patterns as { effective?: string[]; ineffective?: string[] })?.effective?.map((p, i) => (
                            <span key={i} className="inline-flex items-center rounded-full px-2 py-0.5 text-xs" style={{ background: 'rgba(74,222,128,0.1)', color: '#4ade80' }}>
                              {p}
                            </span>
                          ))}
                          {((analyzeResult.analysis as Record<string, unknown>).patterns as { effective?: string[]; ineffective?: string[] })?.ineffective?.map((p, i) => (
                            <span key={i} className="inline-flex items-center rounded-full px-2 py-0.5 text-xs" style={{ background: 'rgba(248,113,113,0.1)', color: '#f87171' }}>
                              {p}
                            </span>
                          ))}
                        </div>
                      )}
                      <p className="mt-2">
                        <span className="text-xs font-semibold" style={{ color: 'rgba(255,255,255,0.4)' }}>改进建议: </span>
                        {(analyzeResult.analysis as Record<string, unknown>).nextTimeAdvice as string}
                      </p>
                    </div>
                  )}
                  {!!analyzeResult.learningsText && !analyzeResult.analysis && (
                    <p className="text-sm" style={{ color: 'rgba(255,255,255,0.6)' }}>
                      {analyzeResult.learningsText as string}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * 展示 Agent 下次生成时会注入的历史经验预览
 */
function PromptPreview({ records }: { records: LearningRecord[] }) {
  const recordsWithResults = records.filter(r => r.experimentResult !== null);

  if (recordsWithResults.length === 0) return null;

  const successful = recordsWithResults.filter(r => r.isSuccessful === true);
  const failed = recordsWithResults.filter(r => r.isSuccessful === false);

  return (
    <div
      className="rounded-xl p-6"
      style={{ background: '#0a0a0f', border: '1px solid rgba(255,255,255,0.08)' }}
    >
      <div className="flex items-center gap-2 mb-4">
        <Lightbulb className="h-5 w-5" style={{ color: '#fbbf24' }} />
        <h3 className="text-sm font-semibold text-white">Agent 历史经验注入预览</h3>
        <span className="text-[10px] rounded-full px-2 py-0.5 ml-2" style={{ background: 'rgba(251,191,36,0.1)', color: '#fbbf24', border: '1px solid rgba(251,191,36,0.2)' }}>
          下次生成时自动使用
        </span>
      </div>

      <div
        className="rounded-lg p-4 font-mono text-xs leading-relaxed overflow-x-auto"
        style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.5)' }}
      >
        {successful.length > 0 && (
          <>
            <div className="text-[#4ade80] font-semibold mb-1">### 有效的内容模式</div>
            {successful.slice(0, 5).map((r) => (
              <div key={r.id} className="mb-1">
                <span className="text-white/40">- </span>
                主题「{r.theme}」({r.platform}): {r.learnings.slice(0, 100)}{r.learnings.length > 100 ? '...' : ''}
                {r.experimentResult && (
                  <div className="ml-2 text-white/30">
                    数据: 曝光{r.experimentResult.impressions} 互动{r.experimentResult.comments + r.experimentResult.likes} 线索{r.experimentResult.leads}
                  </div>
                )}
              </div>
            ))}
          </>
        )}
        {failed.length > 0 && (
          <>
            <div className="text-[#f87171] font-semibold mt-2 mb-1">### 无效的内容模式（避免重复）</div>
            {failed.slice(0, 5).map((r) => (
              <div key={r.id} className="mb-1">
                <span className="text-white/40">- </span>
                主题「{r.theme}」({r.platform}): {r.learnings.slice(0, 100)}{r.learnings.length > 100 ? '...' : ''}
              </div>
            ))}
          </>
        )}
      </div>

      <p className="text-[11px] mt-3" style={{ color: 'rgba(255,255,255,0.25)' }}>
        以上内容会在下次 Agent 生成内容时自动注入到 prompt 中，帮助 Agent 基于历史数据做出更好的决策。
      </p>
    </div>
  );
}

// ==========================================
// Helpers
// ==========================================

function formatReport(data: Record<string, unknown>): string {
  const lines: string[] = [];

  const analysis = data.analysis as Record<string, unknown> | undefined;
  const recommendations = data.recommendations as Array<Record<string, unknown>> | undefined;
  const nextSteps = data.nextSteps as string[] | undefined;

  if (analysis) {
    lines.push('--- 数据分析报告 ---\n');
    if (analysis.overview) lines.push(`概述：${analysis.overview}\n`);

    const platformBreakdown = analysis.platformBreakdown as Array<Record<string, string>> | undefined;
    if (platformBreakdown && platformBreakdown.length > 0) {
      lines.push('平台分析：');
      for (const p of platformBreakdown) {
        lines.push(`  ${p.platform}：${p.performance}`);
        if (p.highlights) lines.push(`    亮点：${p.highlights}`);
        if (p.issues) lines.push(`    问题：${p.issues}`);
      }
      lines.push('');
    }

    if (analysis.topContent) lines.push(`最佳内容：${analysis.topContent}`);
    if (analysis.bottomContent) lines.push(`待改进内容：${analysis.bottomContent}`);
    lines.push('');
  }

  if (recommendations && recommendations.length > 0) {
    lines.push('--- 优化建议 ---\n');
    for (const r of recommendations) {
      lines.push(`[${r.priority}] ${r.area}`);
      lines.push(`  行动：${r.action}`);
      lines.push(`  预期效果：${r.expectedImpact}`);
      lines.push('');
    }
  }

  if (nextSteps && nextSteps.length > 0) {
    lines.push('--- 下一步行动 ---\n');
    for (const step of nextSteps) {
      lines.push(`  - ${step}`);
    }
  }

  if (data.rawContent) return data.rawContent as string;

  return lines.length > 0 ? lines.join('\n') : JSON.stringify(data, null, 2);
}
