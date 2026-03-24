'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Sparkles, Loader2, CheckCircle2, AlertCircle, ArrowRight } from 'lucide-react';
import { useAIConfig } from '@/lib/ai-config';

type WorkflowStatus = 'idle' | 'loading' | 'success' | 'error';

interface WorkflowSummary {
  status: string;
  planDays: number;
  draftsCount: number;
  publishPacksCount: number;
  createdTaskCount: number;
  createdContentCount: number;
}

interface AgentResponseData {
  status: string;
  plan?: { weeklyPlan?: unknown[] };
  drafts?: unknown[];
  publishPacks?: unknown[];
  createdTaskIds?: string[];
  createdContentIds?: string[];
}

export function GeneratePlanButton() {
  const [status, setStatus] = useState<WorkflowStatus>('idle');
  const [summary, setSummary] = useState<WorkflowSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { config: aiConfig } = useAIConfig();

  async function handleGenerate() {
    setStatus('loading');
    setError(null);
    setSummary(null);

    try {
      const res = await fetch('/api/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          context: {
            brand: {
              name: '湾区虾哥',
              positioning: '帮助一人公司和老板搭建个人AI业务增长系统',
              tone: ['简洁', '专业', '实战', '不过度承诺'],
            },
            offers: [
              {
                name: 'OPC增长站',
                description: '14天上线个人AI业务网站（产品+案例+内容+转化）',
                price: '3999-15999',
              },
            ],
            audience: ['一人公司创业者', '企业老板', 'AI服务从业者'],
            proof: ['个人样板站', '案例拆解', '实操模板'],
            forbidden_claims: ['保证爆单', '保证涨粉', '稳赚'],
          },
          goal: '提升品牌曝光和获客，引导咨询转化',
          platforms: ['小红书', '抖音', '视频号', 'X', '即刻'],
          provider: aiConfig.defaultProvider,
          apiKeys: aiConfig.keys,
        }),
      });

      const json = await res.json() as { success: boolean; data: AgentResponseData; error?: string };

      if (!json.success) {
        throw new Error(json.error ?? '工作流执行失败');
      }

      const data = json.data;
      setSummary({
        status: data.status,
        planDays: Array.isArray(data.plan?.weeklyPlan) ? data.plan.weeklyPlan.length : 0,
        draftsCount: Array.isArray(data.drafts) ? data.drafts.length : 0,
        publishPacksCount: Array.isArray(data.publishPacks) ? data.publishPacks.length : 0,
        createdTaskCount: Array.isArray(data.createdTaskIds) ? data.createdTaskIds.length : 0,
        createdContentCount: Array.isArray(data.createdContentIds) ? data.createdContentIds.length : 0,
      });
      setStatus('success');
    } catch (err) {
      const message = err instanceof Error ? err.message : '未知错误';
      setError(message);
      setStatus('error');
    }
  }

  return (
    <div className="space-y-3">
      <button
        onClick={handleGenerate}
        disabled={status === 'loading'}
        className="inline-flex items-center gap-2 rounded-lg bg-gray-900 dark:bg-zinc-100 px-4 py-2.5 text-sm font-medium text-white dark:text-zinc-900 hover:bg-gray-800 dark:hover:bg-zinc-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {status === 'loading' ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Sparkles className="h-4 w-4" />
        )}
        {status === 'loading' ? '生成中…' : '一键生成本周计划'}
      </button>

      {status === 'success' && summary && (
        <div className="flex items-start gap-2 rounded-lg border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20 p-3">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0" />
          <div className="text-sm text-emerald-800 dark:text-emerald-300">
            <p className="font-medium">计划生成完成</p>
            <p className="mt-1 text-emerald-700 dark:text-emerald-400">
              已创建 {summary.createdTaskCount} 个任务，{summary.createdContentCount} 篇内容草稿
            </p>
            <p className="text-emerald-700 dark:text-emerald-400">
              {summary.planDays} 天策略 · {summary.draftsCount} 篇草稿 · {summary.publishPacksCount} 个发布包
            </p>
            <Link
              href="/task-board"
              className="mt-2 inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-400 font-medium hover:underline"
            >
              查看任务看板 <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      )}

      {status === 'error' && error && (
        <div className="flex items-start gap-2 rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-3">
          <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400 mt-0.5 shrink-0" />
          <div className="text-sm text-red-800 dark:text-red-300">
            <p className="font-medium">生成失败</p>
            <p className="mt-1 text-red-700 dark:text-red-400">{error}</p>
          </div>
        </div>
      )}
    </div>
  );
}
