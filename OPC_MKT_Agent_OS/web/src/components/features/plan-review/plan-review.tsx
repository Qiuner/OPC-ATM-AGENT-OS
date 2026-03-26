'use client';

/**
 * PlanReview — 执行计划审批组件
 *
 * 展示 CEO Agent 生成的执行计划，支持：
 * - 查看每个步骤的 Agent、动作描述、依赖关系
 * - 批准 / 驳回 / 修改计划
 * - 执行中实时显示步骤进度
 */

import { useState, useCallback } from 'react';
import {
  CheckCircle, XCircle, Edit3, Play, ArrowRight,
  Loader2, AlertCircle, Clock, SkipForward, GitBranch,
  ChevronDown, ChevronUp, Send,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { PixelAgentSVG } from '@/components/features/agent-monitor/pixel-agents';

// ==========================================
// Types
// ==========================================

type PlanStatus = 'pending' | 'approved' | 'rejected' | 'modified' | 'executing' | 'completed' | 'failed';
type StepStatus = 'pending' | 'running' | 'completed' | 'failed' | 'skipped';

interface PlanStep {
  id: string;
  order: number;
  agentId: string;
  action: string;
  inputs: Record<string, unknown>;
  dependencies: string[];
  status: StepStatus;
  result?: string;
  error?: string;
}

interface ExecutionPlan {
  id: string;
  taskSummary: string;
  steps: PlanStep[];
  estimatedAgents: string[];
  status: PlanStatus;
  createdAt: string;
  originalPrompt: string;
  feedback?: string;
}

interface PlanReviewProps {
  plan: ExecutionPlan;
  /** 步骤实时进度文本（stepId -> 累积文本） */
  stepProgress: Record<string, string>;
  onApprove: (planId: string) => void;
  onReject: (planId: string, feedback: string) => void;
  onModify: (planId: string, steps: PlanStep[], feedback: string) => void;
  isApproving?: boolean;
}

// ==========================================
// Agent color/name mapping
// ==========================================

const AGENT_INFO: Record<string, { color: string; avatar: string; name: string }> = {
  ceo: { color: '#e74c3c', avatar: 'CEO', name: 'CEO' },
  'xhs-agent': { color: '#ff2442', avatar: 'XHS', name: '小红书创作' },
  'analyst-agent': { color: '#22d3ee', avatar: 'AN', name: '数据分析师' },
  'growth-agent': { color: '#00cec9', avatar: 'G', name: '增长专家' },
  'brand-reviewer': { color: '#a855f7', avatar: 'BR', name: '品牌审查' },
  'podcast-agent': { color: '#e17055', avatar: 'POD', name: '播客制作' },
  'x-twitter-agent': { color: '#1da1f2', avatar: 'X', name: 'X/Twitter' },
  'visual-gen-agent': { color: '#fd79a8', avatar: 'VIS', name: '视觉创作' },
  'strategist-agent': { color: '#6c5ce7', avatar: 'STR', name: '营销策略师' },
  'global-content-agent': { color: '#10b981', avatar: 'GC', name: '全球内容' },
  'meta-ads-agent': { color: '#1877f2', avatar: 'MA', name: 'Meta 广告' },
  'email-agent': { color: '#f59e0b', avatar: 'EM', name: '邮件营销' },
  'seo-agent': { color: '#059669', avatar: 'SEO', name: 'SEO 专家' },
  'geo-agent': { color: '#7c3aed', avatar: 'GEO', name: 'GEO 专家' },
};

function getAgentInfo(agentId: string) {
  return AGENT_INFO[agentId] ?? { color: '#a78bfa', avatar: '?', name: agentId };
}

// ==========================================
// Step Status Badge
// ==========================================

function StepStatusBadge({ status }: { status: StepStatus }) {
  const config: Record<StepStatus, { icon: React.ReactNode; label: string; color: string; bg: string }> = {
    pending: {
      icon: <Clock className="w-3 h-3" />,
      label: '等待',
      color: 'rgba(255,255,255,0.4)',
      bg: 'rgba(255,255,255,0.05)',
    },
    running: {
      icon: <Loader2 className="w-3 h-3 animate-spin" />,
      label: '执行中',
      color: '#fbbf24',
      bg: 'rgba(251,191,36,0.10)',
    },
    completed: {
      icon: <CheckCircle className="w-3 h-3" />,
      label: '完成',
      color: '#22c55e',
      bg: 'rgba(34,197,94,0.10)',
    },
    failed: {
      icon: <AlertCircle className="w-3 h-3" />,
      label: '失败',
      color: '#ef4444',
      bg: 'rgba(239,68,68,0.10)',
    },
    skipped: {
      icon: <SkipForward className="w-3 h-3" />,
      label: '跳过',
      color: 'rgba(255,255,255,0.3)',
      bg: 'rgba(255,255,255,0.03)',
    },
  };

  const c = config[status];

  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium"
      style={{ color: c.color, background: c.bg }}
    >
      {c.icon}
      {c.label}
    </span>
  );
}

// ==========================================
// Plan Step Card
// ==========================================

function PlanStepCard({
  step,
  allSteps,
  progressText,
  isExecuting,
}: {
  step: PlanStep;
  allSteps: PlanStep[];
  progressText?: string;
  isExecuting: boolean;
}) {
  const [expanded, setExpanded] = useState(step.status === 'running');
  const agent = getAgentInfo(step.agentId);
  const depNames = step.dependencies
    .map((depId) => {
      const depStep = allSteps.find((s) => s.id === depId);
      return depStep ? `Step ${depStep.order}` : depId;
    })
    .join(', ');

  const isActive = step.status === 'running';
  const showContent = expanded && (progressText || step.result || step.error);

  return (
    <div
      className={cn(
        'relative rounded-xl overflow-hidden transition-all duration-300',
      )}
      style={{
        background: isActive
          ? `linear-gradient(135deg, ${agent.color}08, transparent)`
          : 'rgba(255,255,255,0.02)',
        border: `1px solid ${isActive ? `${agent.color}30` : 'rgba(255,255,255,0.06)'}`,
        boxShadow: isActive ? `0 0 0 1px ${agent.color}40` : undefined,
      }}
    >
      {/* Step header */}
      <div className="p-3 flex items-center gap-3">
        {/* Order number */}
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center text-[11px] font-bold shrink-0"
          style={{
            background: `${agent.color}12`,
            color: agent.color,
            border: `1px solid ${agent.color}20`,
          }}
        >
          {step.order}
        </div>

        {/* Agent icon */}
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 overflow-hidden"
          style={{
            background: `${agent.color}12`,
            border: `1px solid ${agent.color}20`,
          }}
        >
          <PixelAgentSVG
            agentId={step.agentId as Parameters<typeof PixelAgentSVG>[0]['agentId']}
            status={isActive ? 'busy' : step.status === 'completed' ? 'online' : 'offline'}
            className="w-6 h-6"
          />
        </div>

        {/* Step info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[13px] font-semibold" style={{ color: agent.color }}>
              {agent.name}
            </span>
            <StepStatusBadge status={step.status} />
          </div>
          <p className="text-[12px] mt-0.5 truncate" style={{ color: 'rgba(255,255,255,0.6)' }}>
            {step.action}
          </p>
        </div>

        {/* Dependencies indicator */}
        {step.dependencies.length > 0 && (
          <div
            className="flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] shrink-0"
            style={{ background: 'rgba(255,255,255,0.03)', color: 'rgba(255,255,255,0.3)' }}
          >
            <GitBranch className="w-2.5 h-2.5" />
            {depNames}
          </div>
        )}

        {/* Expand toggle */}
        {(progressText || step.result || step.error) && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="p-1 rounded-md hover:bg-[rgba(255,255,255,0.05)] transition-colors"
            style={{ color: 'rgba(255,255,255,0.3)' }}
          >
            {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        )}
      </div>

      {/* Expanded content area */}
      {showContent && (
        <div
          className="mx-3 mb-3 rounded-lg p-3 text-[12px] leading-relaxed overflow-y-auto"
          style={{
            background: 'rgba(0,0,0,0.2)',
            border: '1px solid rgba(255,255,255,0.04)',
            color: 'rgba(255,255,255,0.65)',
            maxHeight: '200px',
            whiteSpace: 'pre-wrap',
          }}
        >
          {step.error && (
            <div className="text-[#ef4444] mb-2">Error: {step.error}</div>
          )}
          {progressText || step.result || ''}
          {isActive && (
            <span
              className="inline-block w-1.5 h-3.5 ml-0.5 rounded-sm animate-pulse"
              style={{ background: agent.color, verticalAlign: 'text-bottom' }}
            />
          )}
        </div>
      )}
    </div>
  );
}

// ==========================================
// Main PlanReview Component
// ==========================================

export default function PlanReview({
  plan,
  stepProgress,
  onApprove,
  onReject,
  onModify,
  isApproving = false,
}: PlanReviewProps) {
  const [rejectFeedback, setRejectFeedback] = useState('');
  const [showRejectInput, setShowRejectInput] = useState(false);
  const isExecuting = plan.status === 'executing';
  const isPending = plan.status === 'pending' || plan.status === 'modified';
  const isCompleted = plan.status === 'completed';
  const isFailed = plan.status === 'failed';

  // Progress stats
  const completedSteps = plan.steps.filter((s) => s.status === 'completed').length;
  const runningSteps = plan.steps.filter((s) => s.status === 'running').length;
  const failedSteps = plan.steps.filter((s) => s.status === 'failed').length;
  const totalSteps = plan.steps.length;
  const progressPercent = Math.round((completedSteps / totalSteps) * 100);

  const handleReject = useCallback(() => {
    if (showRejectInput) {
      onReject(plan.id, rejectFeedback);
      setShowRejectInput(false);
      setRejectFeedback('');
    } else {
      setShowRejectInput(true);
    }
  }, [showRejectInput, rejectFeedback, onReject, plan.id]);

  return (
    <div className="flex flex-col gap-4 h-full">
      {/* Plan header */}
      <div
        className="rounded-xl p-4"
        style={{
          background: 'rgba(255,255,255,0.02)',
          border: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded"
                style={{
                  background: isPending ? 'rgba(251,191,36,0.10)' : isExecuting ? 'rgba(96,165,250,0.10)' : isCompleted ? 'rgba(34,197,94,0.10)' : 'rgba(239,68,68,0.10)',
                  color: isPending ? '#fbbf24' : isExecuting ? '#60a5fa' : isCompleted ? '#22c55e' : '#ef4444',
                }}
              >
                {isPending ? 'PENDING REVIEW' : isExecuting ? 'EXECUTING' : isCompleted ? 'COMPLETED' : isFailed ? 'FAILED' : plan.status.toUpperCase()}
              </span>
            </div>
            <h3 className="text-[15px] font-semibold text-white">
              {plan.taskSummary}
            </h3>
            <p className="text-[12px] mt-1" style={{ color: 'rgba(255,255,255,0.4)' }}>
              {plan.steps.length} 个步骤 / {plan.estimatedAgents.length} 个 Agent
            </p>
          </div>

          {/* Agent avatars */}
          <div className="flex -space-x-2">
            {plan.estimatedAgents.slice(0, 5).map((agentId) => {
              const agent = getAgentInfo(agentId);
              return (
                <div
                  key={agentId}
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-[9px] font-bold overflow-hidden"
                  style={{
                    background: `${agent.color}15`,
                    border: `2px solid #0a0a0f`,
                    color: agent.color,
                  }}
                  title={agent.name}
                >
                  <PixelAgentSVG
                    agentId={agentId as Parameters<typeof PixelAgentSVG>[0]['agentId']}
                    status="online"
                    className="w-5 h-5"
                  />
                </div>
              );
            })}
            {plan.estimatedAgents.length > 5 && (
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center text-[9px] font-bold"
                style={{ background: 'rgba(255,255,255,0.05)', border: '2px solid #0a0a0f', color: 'rgba(255,255,255,0.4)' }}
              >
                +{plan.estimatedAgents.length - 5}
              </div>
            )}
          </div>
        </div>

        {/* Progress bar (visible during execution) */}
        {(isExecuting || isCompleted || isFailed) && (
          <div className="mt-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px]" style={{ color: 'rgba(255,255,255,0.4)' }}>
                {completedSteps}/{totalSteps} 步骤完成
                {runningSteps > 0 && ` / ${runningSteps} 执行中`}
                {failedSteps > 0 && ` / ${failedSteps} 失败`}
              </span>
              <span className="text-[11px] font-mono" style={{ color: 'rgba(255,255,255,0.3)' }}>
                {progressPercent}%
              </span>
            </div>
            <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${progressPercent}%`,
                  background: isFailed
                    ? 'linear-gradient(90deg, #22c55e, #ef4444)'
                    : isCompleted
                    ? '#22c55e'
                    : 'linear-gradient(90deg, #22c55e, #60a5fa)',
                }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Steps list */}
      <div className="flex-1 overflow-y-auto space-y-2 pr-1">
        {plan.steps.map((step) => (
          <PlanStepCard
            key={step.id}
            step={step}
            allSteps={plan.steps}
            progressText={stepProgress[step.id]}
            isExecuting={isExecuting}
          />
        ))}
      </div>

      {/* Action buttons (only when pending) */}
      {isPending && (
        <div
          className="shrink-0 rounded-xl p-4"
          style={{
            background: 'rgba(255,255,255,0.02)',
            border: '1px solid rgba(255,255,255,0.06)',
          }}
        >
          {/* Reject feedback input */}
          {showRejectInput && (
            <div className="mb-3 flex items-center gap-2">
              <input
                type="text"
                value={rejectFeedback}
                onChange={(e) => setRejectFeedback(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && rejectFeedback.trim()) {
                    handleReject();
                  }
                }}
                placeholder="输入驳回原因或修改建议..."
                className="flex-1 bg-transparent text-[13px] text-white placeholder:text-[rgba(255,255,255,0.25)] outline-none px-3 py-2 rounded-lg"
                style={{
                  border: '1px solid rgba(239,68,68,0.2)',
                  background: 'rgba(239,68,68,0.05)',
                }}
                autoFocus
              />
              <button
                onClick={() => { setShowRejectInput(false); setRejectFeedback(''); }}
                className="text-[12px] px-2 py-1.5 rounded-lg transition-colors"
                style={{ color: 'rgba(255,255,255,0.4)' }}
              >
                取消
              </button>
            </div>
          )}

          <div className="flex items-center gap-3">
            {/* Approve button */}
            <button
              onClick={() => onApprove(plan.id)}
              disabled={isApproving}
              className={cn(
                'flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-medium transition-all',
                isApproving ? 'opacity-50 cursor-wait' : 'hover:brightness-110 cursor-pointer',
              )}
              style={{
                background: 'rgba(34,197,94,0.10)',
                color: '#22c55e',
                border: '1px solid rgba(34,197,94,0.20)',
              }}
            >
              {isApproving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Play className="w-4 h-4" />
              )}
              {isApproving ? '执行中...' : '批准并执行'}
            </button>

            {/* Reject button */}
            <button
              onClick={handleReject}
              className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-medium transition-all hover:brightness-110 cursor-pointer"
              style={{
                background: 'rgba(239,68,68,0.10)',
                color: '#ef4444',
                border: '1px solid rgba(239,68,68,0.20)',
              }}
            >
              <XCircle className="w-4 h-4" />
              {showRejectInput ? '确认驳回' : '驳回'}
            </button>
          </div>
        </div>
      )}

      {/* Completed summary */}
      {isCompleted && (
        <div
          className="shrink-0 rounded-xl p-4 flex items-center gap-3"
          style={{
            background: 'rgba(34,197,94,0.05)',
            border: '1px solid rgba(34,197,94,0.15)',
          }}
        >
          <CheckCircle className="w-5 h-5 shrink-0" style={{ color: '#22c55e' }} />
          <span className="text-[13px] font-medium" style={{ color: '#22c55e' }}>
            所有 {totalSteps} 个步骤已完成
          </span>
        </div>
      )}

      {/* Failed summary */}
      {isFailed && (
        <div
          className="shrink-0 rounded-xl p-4 flex items-center gap-3"
          style={{
            background: 'rgba(239,68,68,0.05)',
            border: '1px solid rgba(239,68,68,0.15)',
          }}
        >
          <AlertCircle className="w-5 h-5 shrink-0" style={{ color: '#ef4444' }} />
          <span className="text-[13px] font-medium" style={{ color: '#ef4444' }}>
            执行失败: {completedSteps}/{totalSteps} 完成, {failedSteps} 失败
          </span>
        </div>
      )}
    </div>
  );
}
