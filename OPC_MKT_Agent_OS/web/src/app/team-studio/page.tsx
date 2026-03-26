'use client';

import { useState, useRef, useEffect, useCallback, lazy, Suspense, type KeyboardEvent } from 'react';
import { createPortal } from 'react-dom';
import {
  Send, Trash2, Hash, Users, Monitor, MessageSquare, Power, PowerOff,
  ChevronUp, FileText, Cpu, Edit3, Save, Zap, Shield, Settings, Terminal,
  Square, Loader2, CheckCircle, AlertCircle, Clock, Wrench, RotateCcw,
  ListChecks, Play,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { PixelAgentSVG } from '@/components/features/agent-monitor/pixel-agents';
import PlanReview from '@/components/features/plan-review/plan-review';

// Lazy-load Team Mode (v3 monitor) — only loaded when user switches to Team Mode tab
const TeamModeView = lazy(() => import('./v3/page'));


// ==========================================
// Constants — Agent definitions
// ==========================================

const AGENT_CHAT_BASE = 'http://localhost:3001';

const SDK_AGENT_IDS = ['ceo', 'xhs-agent', 'growth-agent', 'brand-reviewer'];

interface AgentDef {
  id: string;
  label: string;
  labelCn: string;
  color: string;
  initial: string;
  bio: string;
  capabilities: string[];
  level: string;
  systemPrompt: string;
}

const AGENTS: AgentDef[] = [
  {
    id: 'ceo',
    label: 'CEO',
    labelCn: 'CEO 营销总监',
    color: '#e74c3c',
    initial: 'CEO',
    bio: '营销团队总指挥，负责需求拆解、子 Agent 调度与质量终审',
    capabilities: ['任务拆解', '多 Agent 编排', '质量把控', '流程调度'],
    level: 'Orchestrator',
    systemPrompt: `你是 Marketing Agent OS 的 CEO Agent，营销团队负责人。
你管理 3 个子 Agent：xhs-agent（小红书创作）、growth-agent（增长策略）、brand-reviewer（品牌审查）。
标准工作流：分析需求 → Growth 选题 → XHS 创作 → Brand Reviewer 审查 → 你终审交付。
你不直接创作内容，而是拆解任务、调度子 Agent、把控质量。用中文回复。`,
  },
  {
    id: 'xhs-agent',
    label: 'XHS',
    labelCn: '小红书创作专家',
    color: '#ff2442',
    initial: 'XHS',
    bio: '顶级小红书内容创作者，按 SOP 产出高质量种草笔记',
    capabilities: ['爆款标题', '种草文案', 'CTA 设计', '标签策略', '配图建议'],
    level: 'Specialist',
    systemPrompt: `你是一位顶级小红书营销内容创作专家。
按 SOP 撰写内容（标题→正文→CTA→标签→配图建议），直接输出笔记内容。用中文创作。`,
  },
  {
    id: 'growth-agent',
    label: 'Growth',
    labelCn: '增长营销专家',
    color: '#00cec9',
    initial: 'G',
    bio: '增长黑客，精通选题研究、热点捕捉与数据驱动的发布策略',
    capabilities: ['选题研究', '热点捕捉', '竞品分析', '发布策略', '数据复盘'],
    level: 'Specialist',
    systemPrompt: `你是一位增长营销专家，精通小红书平台运营。
负责选题研究、热点捕捉、竞品爆款分析、发布时间策略、数据复盘。
接地气，用真实案例和数据说话。给出可立即执行的选题方案。中文沟通。`,
  },
  {
    id: 'brand-reviewer',
    label: 'Reviewer',
    labelCn: '品牌风控审查',
    color: '#a855f7',
    initial: 'BR',
    bio: '品牌守护者，逐项审查内容合规性与品牌调性一致性',
    capabilities: ['文案审查', '调性检测', '敏感词过滤', '合规校验', '风险评估'],
    level: 'Reviewer',
    systemPrompt: `你是品牌风控审查专家。
审查范围：文案内容、品牌调性一致性、配图建议、敏感词/风险内容、平台合规性。
对照品牌调性和受众画像逐项检查，输出审查报告（通过/需修改/拒绝 + 修改建议）。中文沟通。`,
  },
];

const AGENT_MAP = new Map(AGENTS.map((a) => [a.id, a]));

// Extended Agent color map for all registry agents (used in execute mode)
const AGENT_COLORS: Record<string, { color: string; avatar: string; name: string }> = {
  ceo: { color: '#e74c3c', avatar: 'CEO', name: 'CEO' },
  'xhs-agent': { color: '#ff2442', avatar: 'XHS', name: 'XHS Agent' },
  'analyst-agent': { color: '#22d3ee', avatar: 'AN', name: 'Analyst' },
  'growth-agent': { color: '#00cec9', avatar: 'G', name: 'Growth' },
  'brand-reviewer': { color: '#a855f7', avatar: 'BR', name: 'Reviewer' },
  'podcast-agent': { color: '#f59e0b', avatar: 'POD', name: 'Podcast' },
  'x-twitter-agent': { color: '#1da1f2', avatar: 'X', name: 'X/Twitter' },
  'visual-gen-agent': { color: '#ec4899', avatar: 'VIS', name: 'Visual' },
  'strategist-agent': { color: '#8b5cf6', avatar: 'STR', name: 'Strategist' },
};

type ChannelId = 'all' | string;
type TabId = 'execute' | 'chat' | 'monitor';

// ==========================================
// Execute mode types
// ==========================================

type TaskStatus = 'waiting' | 'running' | 'done' | 'error';

interface ExecTask {
  id: string;
  agentId: string;
  description: string;
  status: TaskStatus;
  progress: number;
  currentTool?: string;
  toolCallCount: number;
  error?: string;
  startedAt?: number;
  finishedAt?: number;
  content: string; // streaming text content from this agent
}

interface ExecLogEntry {
  id: string;
  timestamp: number;
  agentId: string;
  type: 'info' | 'tool' | 'result' | 'error' | 'communication';
  message: string;
}

interface ExecState {
  isRunning: boolean;
  startedAt?: number;
  prompt: string;
  tasks: ExecTask[];
  logs: ExecLogEntry[];
  result: string;
}

const INITIAL_EXEC: ExecState = {
  isRunning: false,
  prompt: '',
  tasks: [],
  logs: [],
  result: '',
};

// ==========================================
// Plan-Execute mode types
// ==========================================

type PlanStatus = 'pending' | 'approved' | 'rejected' | 'modified' | 'executing' | 'completed' | 'failed';
type StepStatusType = 'pending' | 'running' | 'completed' | 'failed' | 'skipped';

interface PlanStepData {
  id: string;
  order: number;
  agentId: string;
  action: string;
  inputs: Record<string, unknown>;
  dependencies: string[];
  status: StepStatusType;
  result?: string;
  error?: string;
}

interface ExecutionPlanData {
  id: string;
  taskSummary: string;
  steps: PlanStepData[];
  estimatedAgents: string[];
  status: PlanStatus;
  createdAt: string;
  originalPrompt: string;
  feedback?: string;
}

interface PlanState {
  /** Whether plan mode is active (vs direct execute) */
  enabled: boolean;
  /** Whether we're currently generating a plan */
  isGenerating: boolean;
  /** Whether we're currently executing an approved plan */
  isExecuting: boolean;
  /** The current plan being reviewed */
  plan: ExecutionPlanData | null;
  /** Real-time progress text per step */
  stepProgress: Record<string, string>;
}

// ==========================================
// Chat mode types (preserved from original)
// ==========================================

interface StudioMessage {
  id: string;
  role: 'user' | 'agent' | 'system';
  agentId?: string;
  content: string;
  timestamp: Date;
  isStreaming?: boolean;
}

function createId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
}

function getWelcomeMessages(): StudioMessage[] {
  const now = new Date();
  return [
    { id: createId(), role: 'system', content: '欢迎来到 OPC Team Studio — 使用「执行模式」下达任务，或切换到「团队对话」自由对话', timestamp: now },
  ];
}

// ==========================================
// Stream helpers
// ==========================================

function buildConversationHistory(messages: StudioMessage[], limit = 20): string {
  return messages
    .slice(-limit)
    .map((m) => {
      if (m.role === 'system') return '';
      if (m.role === 'user') return `User: ${m.content}`;
      const agent = m.agentId ? AGENT_MAP.get(m.agentId) : null;
      return `${agent?.label ?? 'Agent'}: ${m.content}`;
    })
    .filter(Boolean)
    .join('\n');
}

async function streamAgentMessage(
  agentId: string,
  systemPrompt: string,
  conversationHistory: string,
  userMessage: string,
  onChunk: (text: string) => void,
  onDone: () => void,
  onError: (error: string) => void,
): Promise<void> {
  const isSDK = SDK_AGENT_IDS.includes(agentId);
  const endpoint = isSDK ? '/api/chat-sdk' : '/api/chat';

  try {
    const res = await fetch(`${AGENT_CHAT_BASE}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ systemPrompt, conversationHistory, userMessage, agentName: agentId }),
    });

    if (!res.ok) {
      onError(`Agent 服务错误: ${res.status} ${res.statusText}`);
      onDone();
      return;
    }

    const reader = res.body?.getReader();
    if (!reader) { onError('无法获取响应流'); onDone(); return; }

    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        try {
          const data = JSON.parse(line.slice(6)) as { text?: string; error?: string; done?: boolean };
          if (data.done) { onDone(); return; }
          if (data.error) onError(data.error);
          if (data.text) onChunk(data.text);
        } catch { /* skip */ }
      }
    }
    onDone();
  } catch (err) {
    onError(err instanceof Error ? err.message : String(err));
    onDone();
  }
}

// ==========================================
// Sub-components — Agent Info Panel
// ==========================================

const AGENT_SKILLS: Record<string, string[]> = {
  ceo: ['团队管理协议', '上下文选择', '任务调度'],
  'xhs-agent': ['xhs.SKILL.md', 'xhs-patterns.md'],
  'growth-agent': ['growth.SKILL.md'],
  'brand-reviewer': ['brand-reviewer.SKILL.md'],
};

const LEVEL_STYLE: Record<string, { bg: string; text: string; border: string }> = {
  Orchestrator: { bg: 'rgba(231,76,60,0.10)', text: '#e74c3c', border: 'rgba(231,76,60,0.25)' },
  Specialist: { bg: 'rgba(59,130,246,0.10)', text: '#3b82f6', border: 'rgba(59,130,246,0.25)' },
  Reviewer: { bg: 'rgba(168,85,247,0.10)', text: '#a855f7', border: 'rgba(168,85,247,0.25)' },
};

function AgentInfoPanel({ agent }: { agent: AgentDef }) {
  const [isEditingPrompt, setIsEditingPrompt] = useState(false);
  const [editedPrompt, setEditedPrompt] = useState(agent.systemPrompt);
  const skills = AGENT_SKILLS[agent.id] || [];
  const lvl = LEVEL_STYLE[agent.level] ?? LEVEL_STYLE.Specialist;

  return (
    <div className="px-4 pb-4 space-y-4 animate-in slide-in-from-top-2 duration-200"
      style={{ borderTop: '1px solid rgba(255,255,255,0.04)', background: 'rgba(255,255,255,0.01)' }}
    >
      <div className="pt-3 space-y-2.5">
        <div className="flex items-center gap-2">
          <Shield className="h-3.5 w-3.5" style={{ color: agent.color }} />
          <span className="text-sm font-semibold uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.35)' }}>简介</span>
        </div>
        <div className="flex items-start gap-3">
          <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 overflow-hidden"
            style={{ background: `${agent.color}12`, border: `1px solid ${agent.color}25` }}
          >
            <PixelAgentSVG agentId={agent.id as 'ceo' | 'xhs-agent' | 'growth-agent' | 'brand-reviewer'} status="online" className="w-9 h-9" />
          </div>
          <div className="flex-1 min-w-0 space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-lg font-semibold text-white">{agent.label}</span>
              <span className="text-sm px-2 py-0.5 rounded-full font-medium"
                style={{ background: lvl.bg, color: lvl.text, border: `1px solid ${lvl.border}` }}
              >{agent.level}</span>
            </div>
            <p className="text-base leading-relaxed" style={{ color: 'rgba(255,255,255,0.5)' }}>{agent.bio}</p>
            <div className="flex flex-wrap gap-1.5 pt-0.5">
              {agent.capabilities.map((c) => (
                <span key={c} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-sm font-medium"
                  style={{ background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.45)', border: '1px solid rgba(255,255,255,0.06)' }}
                >
                  <Zap className="h-2.5 w-2.5" style={{ color: agent.color }} />{c}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Settings className="h-3.5 w-3.5" style={{ color: agent.color }} />
            <span className="text-sm font-semibold uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.35)' }}>System Prompt</span>
          </div>
          <button
            onClick={() => { if (isEditingPrompt) agent.systemPrompt = editedPrompt; setIsEditingPrompt(!isEditingPrompt); }}
            className="flex items-center gap-1 px-2 py-1 rounded-md text-sm cursor-pointer transition-colors"
            style={{ color: agent.color, background: `${agent.color}10`, border: `1px solid ${agent.color}15` }}
          >
            {isEditingPrompt ? <><Save className="h-2.5 w-2.5" /> 保存</> : <><Edit3 className="h-2.5 w-2.5" /> 编辑</>}
          </button>
        </div>
        {isEditingPrompt ? (
          <textarea value={editedPrompt} onChange={(e) => setEditedPrompt(e.target.value)}
            className="w-full h-32 rounded-lg px-3 py-2.5 text-sm leading-relaxed resize-none focus:outline-none"
            style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${agent.color}30`, color: 'rgba(255,255,255,0.6)', fontFamily: 'var(--font-geist-mono), monospace' }}
          />
        ) : (
          <div className="rounded-lg px-3 py-2.5 text-sm leading-relaxed max-h-28 overflow-y-auto"
            style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.4)', fontFamily: 'var(--font-geist-mono), monospace' }}
          >{agent.systemPrompt}</div>
        )}
      </div>

      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Cpu className="h-3.5 w-3.5" style={{ color: agent.color }} />
          <span className="text-sm font-semibold uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.35)' }}>Skills</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {skills.map((s) => (
            <span key={s} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-sm font-medium"
              style={{ background: `${agent.color}10`, color: agent.color, border: `1px solid ${agent.color}18` }}
            ><FileText className="h-3 w-3" />{s}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

// ==========================================
// Sub-components — Channel List (Sidebar)
// ==========================================

function ChannelList({
  activeChannel, onSelect, teamLaunched, isMobileOpen, onClose,
}: {
  activeChannel: ChannelId; onSelect: (id: ChannelId) => void;
  teamLaunched: boolean; isMobileOpen: boolean; onClose: () => void;
}) {
  return (
    <>
      {isMobileOpen && <div className="fixed inset-0 z-30 bg-black/60 md:hidden" onClick={onClose} />}
      <div
        className={cn(
          'flex flex-col w-64 shrink-0',
          'fixed inset-y-0 left-60 z-40 transition-transform duration-200 md:relative md:left-0 md:translate-x-0',
          isMobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        )}
        style={{ background: '#050508', borderRight: '1px solid rgba(255,255,255,0.06)' }}
      >
        <div className="px-4 pt-4 pb-2 flex items-center justify-between">
          <h3 className="text-sm font-semibold uppercase tracking-[0.12em]" style={{ color: 'rgba(255,255,255,0.3)' }}>Agent Team</h3>
          <span className="h-2 w-2 rounded-full"
            style={{ background: teamLaunched ? '#22c55e' : 'rgba(255,255,255,0.2)', boxShadow: teamLaunched ? '0 0 6px rgba(34,197,94,0.4)' : 'none' }}
          />
        </div>
        <nav className="flex-1 overflow-y-auto space-y-0.5 px-3 py-1">
          <button
            onClick={() => { onSelect('all'); onClose(); }}
            className={cn('flex w-full items-center gap-2 px-3 py-2 rounded-lg text-lg transition-all duration-200 cursor-pointer',
              activeChannel === 'all' ? 'font-medium text-white' : 'hover:bg-[rgba(255,255,255,0.03)]'
            )}
            style={activeChannel === 'all' ? { background: 'rgba(167,139,250,0.08)' } : { color: 'rgba(255,255,255,0.4)' }}
          >
            <Users className="h-4 w-4 shrink-0" /><span className="flex-1 text-left">全员</span>
          </button>
          {AGENTS.map((agent) => {
            const isActive = activeChannel === agent.id;
            return (
              <button key={agent.id}
                onClick={() => { onSelect(agent.id); onClose(); }}
                className={cn('flex w-full items-center gap-2.5 px-2.5 py-2 rounded-lg text-lg transition-all duration-200 cursor-pointer',
                  isActive ? 'font-medium text-white' : 'hover:bg-[rgba(255,255,255,0.03)]'
                )}
                style={isActive ? { background: 'rgba(167,139,250,0.08)' } : { color: 'rgba(255,255,255,0.4)' }}
              >
                <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 overflow-hidden"
                  style={{ background: `${agent.color}15`, border: `1px solid ${agent.color}20` }}
                >
                  <PixelAgentSVG agentId={agent.id as 'ceo' | 'xhs-agent' | 'growth-agent' | 'brand-reviewer'} status={teamLaunched ? 'online' : 'offline'} className="w-5 h-5" />
                </div>
                <span className="flex-1 text-left truncate">{agent.labelCn}</span>
                <span className="h-2 w-2 rounded-full shrink-0" style={{ background: teamLaunched ? '#22c55e' : 'rgba(255,255,255,0.15)' }} />
              </button>
            );
          })}
        </nav>
        <div className="px-4 py-3" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="flex items-center gap-2 text-sm" style={{ color: 'rgba(255,255,255,0.3)' }}>
            <span className="h-2 w-2 rounded-full" style={{ background: teamLaunched ? '#22c55e' : 'rgba(255,255,255,0.2)', boxShadow: teamLaunched ? '0 0 6px rgba(34,197,94,0.4)' : 'none' }} />
            {teamLaunched ? `在线: ${AGENTS.length} 个 Agent` : '团队未启动'}
          </div>
        </div>
      </div>
    </>
  );
}

// ==========================================
// Sub-components — Chat Bubbles
// ==========================================

function SystemBubble({ msg }: { msg: StudioMessage }) {
  return (
    <div className="flex justify-center py-2">
      <span className="text-lg px-3 py-1 rounded-full"
        style={{ color: 'rgba(255,255,255,0.4)', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
      >{msg.content}</span>
    </div>
  );
}

function renderContentWithMentions(content: string) {
  const mentionPattern = /@(xhs-agent|growth-agent|brand-reviewer|ceo|XHS|Growth|Reviewer|CEO)/gi;
  const parts = content.split(mentionPattern);
  if (parts.length === 1) return content;

  const agentLabelMap: Record<string, AgentDef | undefined> = {
    'xhs-agent': AGENT_MAP.get('xhs-agent'), 'growth-agent': AGENT_MAP.get('growth-agent'),
    'brand-reviewer': AGENT_MAP.get('brand-reviewer'), 'ceo': AGENT_MAP.get('ceo'),
    'xhs': AGENT_MAP.get('xhs-agent'), 'growth': AGENT_MAP.get('growth-agent'),
    'reviewer': AGENT_MAP.get('brand-reviewer'),
  };

  return parts.map((part, i) => {
    const matched = agentLabelMap[part.toLowerCase()];
    if (matched) {
      return (
        <span key={i} className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-sm font-semibold mx-0.5 align-middle"
          style={{ background: `${matched.color}15`, color: matched.color, border: `1px solid ${matched.color}25` }}
        >
          <span className="w-3.5 h-3.5 inline-block">
            <PixelAgentSVG agentId={matched.id as 'ceo' | 'xhs-agent' | 'growth-agent' | 'brand-reviewer'} status="online" className="w-3.5 h-3.5" />
          </span>
          @{matched.label}
        </span>
      );
    }
    return part;
  });
}

function AgentBubble({ msg }: { msg: StudioMessage }) {
  const agent = msg.agentId ? AGENT_MAP.get(msg.agentId) : null;
  if (!agent) return null;
  return (
    <div className="flex gap-3 px-4 py-2 transition-colors rounded-lg hover:bg-[rgba(255,255,255,0.02)]">
      <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 overflow-hidden"
        style={{ background: `${agent.color}15`, border: `1px solid ${agent.color}25` }}
      >
        <PixelAgentSVG agentId={agent.id as 'ceo' | 'xhs-agent' | 'growth-agent' | 'brand-reviewer'} status="busy" className="w-7 h-7" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-white">{agent.label}</span>
          <span className="text-lg" style={{ color: 'rgba(255,255,255,0.25)' }}>{formatTime(msg.timestamp)}</span>
          {msg.isStreaming && (
            <span className="flex gap-0.5">
              <span className="h-1 w-1 rounded-full animate-bounce" style={{ background: agent.color, animationDelay: '0ms' }} />
              <span className="h-1 w-1 rounded-full animate-bounce" style={{ background: agent.color, animationDelay: '150ms' }} />
              <span className="h-1 w-1 rounded-full animate-bounce" style={{ background: agent.color, animationDelay: '300ms' }} />
            </span>
          )}
        </div>
        <div className="text-sm mt-0.5 whitespace-pre-wrap leading-relaxed" style={{ color: 'rgba(255,255,255,0.75)' }}>
          {msg.content ? renderContentWithMentions(msg.content) : (msg.isStreaming ? '思考中...' : '')}
        </div>
      </div>
    </div>
  );
}

function UserBubble({ msg }: { msg: StudioMessage }) {
  return (
    <div className="flex justify-end px-4 py-2">
      <div className="flex gap-3 max-w-[75%]">
        <div className="flex flex-col items-end">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-lg" style={{ color: 'rgba(255,255,255,0.25)' }}>{formatTime(msg.timestamp)}</span>
            <span className="text-sm font-semibold text-white">老板</span>
          </div>
          <div className="text-sm px-4 py-2.5 rounded-2xl rounded-br-md whitespace-pre-wrap leading-relaxed"
            style={{ background: 'linear-gradient(135deg, #a78bfa, #818cf8)', color: '#ffffff' }}
          >{msg.content}</div>
        </div>
        <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
          style={{ background: 'rgba(167,139,250,0.15)', color: '#a78bfa' }}
        >J</div>
      </div>
    </div>
  );
}

// ==========================================
// Execute mode — TaskCard component
// ==========================================

function ExecTaskCard({ task, expanded, onToggleExpand }: { task: ExecTask; expanded: boolean; onToggleExpand: () => void }) {
  const ac = AGENT_COLORS[task.agentId] ?? { color: '#a78bfa', avatar: '?', name: task.agentId };
  const color = ac.color;
  const { status, progress, currentTool, toolCallCount, description, error, content } = task;
  const elapsed = task.startedAt ? Math.round(((task.finishedAt ?? Date.now()) - task.startedAt) / 1000) : 0;
  const contentRef = useRef<HTMLDivElement>(null);
  const hasContent = content.length > 0;

  // Auto-scroll content area when streaming
  useEffect(() => {
    if (expanded && contentRef.current && status === 'running') {
      contentRef.current.scrollTop = contentRef.current.scrollHeight;
    }
  }, [content, expanded, status]);

  return (
    <div
      className={cn(
        'cotify-card flex flex-col relative overflow-hidden transition-all duration-300',
        status === 'error' && 'animate-shake',
        expanded && hasContent && 'col-span-full',
      )}
      style={{
        borderTop: `3px solid ${status === 'done' ? '#22c55e' : status === 'error' ? '#ef4444' : color}`,
        opacity: status === 'waiting' ? 0.6 : 1,
      }}
    >
      {status === 'running' && (
        <div className="absolute inset-0 pointer-events-none" style={{ background: `radial-gradient(ellipse at 50% 0%, ${color}12, transparent 70%)` }} />
      )}

      {/* Header */}
      <div className="p-4 pb-3 flex flex-col gap-3 relative z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-[12px] font-bold shrink-0"
            style={{ background: `${color}15`, border: `1px solid ${color}30`, color }}
          >{ac.avatar}</div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold text-white truncate">{ac.name}</div>
            <div className="text-[12px] text-[rgba(255,255,255,0.4)] truncate">{description || 'Waiting...'}</div>
          </div>
          {status === 'running' && <Loader2 className="w-4 h-4 animate-spin" style={{ color: '#a78bfa' }} />}
          {status === 'done' && <CheckCircle className="w-4 h-4" style={{ color: '#22c55e' }} />}
          {status === 'error' && <AlertCircle className="w-4 h-4" style={{ color: '#ef4444' }} />}
          {status === 'waiting' && <Clock className="w-4 h-4" style={{ color: 'rgba(255,255,255,0.2)' }} />}
        </div>

        {/* Progress bar */}
        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: `${color}15` }}>
          <div className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${progress}%`,
              background: status === 'done' ? '#22c55e' : status === 'error' ? '#ef4444' : `linear-gradient(90deg, ${color}60, ${color}, ${color}60)`,
            }}
          />
        </div>

        {/* Tool + status footer */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {currentTool && status === 'running' ? (
              <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-[11px]"
                style={{ background: `${color}10`, border: `1px solid ${color}20`, fontFamily: 'var(--font-geist-mono)', color }}
              >
                <Wrench className="w-3 h-3" />{currentTool}{toolCallCount > 0 && <span className="opacity-60">x{toolCallCount}</span>}
              </div>
            ) : error ? (
              <span className="text-[11px] text-[#ef4444] truncate max-w-[200px]">{error}</span>
            ) : status === 'done' ? (
              <span className="text-[11px] text-[#22c55e]">已完成</span>
            ) : (
              <span className="text-[11px] text-[rgba(255,255,255,0.3)]">{status === 'waiting' ? '等待中' : ''}</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {elapsed > 0 && (
              <span className="text-[11px] tabular-nums" style={{ color: 'rgba(255,255,255,0.3)', fontFamily: 'var(--font-geist-mono)' }}>{elapsed}s</span>
            )}
            {hasContent && (
              <button onClick={onToggleExpand}
                className="text-[11px] px-1.5 py-0.5 rounded transition-colors hover:bg-[rgba(255,255,255,0.05)]"
                style={{ color: 'rgba(255,255,255,0.4)' }}
              >
                {expanded ? '收起' : '展开内容'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Streaming content area */}
      {hasContent && expanded && (
        <div ref={contentRef}
          className="mx-4 mb-4 rounded-xl p-3 text-[13px] leading-relaxed overflow-y-auto"
          style={{
            background: 'rgba(255,255,255,0.02)',
            border: '1px solid rgba(255,255,255,0.06)',
            color: 'rgba(255,255,255,0.7)',
            maxHeight: '300px',
            whiteSpace: 'pre-wrap',
            fontFamily: 'var(--font-geist-sans)',
          }}
        >
          {content}
          {status === 'running' && (
            <span className="inline-block w-1.5 h-4 ml-0.5 rounded-sm animate-pulse" style={{ background: color, verticalAlign: 'text-bottom' }} />
          )}
        </div>
      )}

      {/* Collapsed content preview */}
      {hasContent && !expanded && (
        <div className="mx-4 mb-4 px-3 py-2 rounded-lg text-[12px] truncate cursor-pointer hover:bg-[rgba(255,255,255,0.03)]"
          onClick={onToggleExpand}
          style={{ background: 'rgba(255,255,255,0.02)', color: 'rgba(255,255,255,0.4)' }}
        >
          {content.slice(0, 100).replace(/\n/g, ' ')}{content.length > 100 ? '...' : ''}
        </div>
      )}
    </div>
  );
}

// ==========================================
// Execute mode — Terminal Log
// ==========================================

function ExecTerminalLog({ logs }: { logs: ExecLogEntry[] }) {
  const [collapsed, setCollapsed] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!collapsed && scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [logs, collapsed]);

  return (
    <div className="flex flex-col overflow-hidden transition-all duration-300 shrink-0"
      style={{ maxHeight: collapsed ? '40px' : '200px', borderTop: '1px solid rgba(255,255,255,0.06)' }}
    >
      <button onClick={() => setCollapsed(!collapsed)}
        className="flex items-center justify-between px-4 py-2 shrink-0 cursor-pointer hover:bg-[rgba(255,255,255,0.02)]"
      >
        <div className="flex items-center gap-2">
          <span className="text-[12px] font-semibold" style={{ color: 'rgba(255,255,255,0.5)', fontFamily: 'var(--font-geist-mono)' }}>Terminal</span>
          <span className="text-[11px]" style={{ color: 'rgba(255,255,255,0.2)' }}>{logs.length} events</span>
        </div>
      </button>
      {!collapsed && (
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 pb-2 space-y-0.5" style={{ fontFamily: 'var(--font-geist-mono)' }}>
          {logs.map(entry => {
            const t = new Date(entry.timestamp);
            const ts = `${String(t.getHours()).padStart(2, '0')}:${String(t.getMinutes()).padStart(2, '0')}:${String(t.getSeconds()).padStart(2, '0')}`;
            const ac = AGENT_COLORS[entry.agentId];
            const typeColor = entry.type === 'error' ? '#ef4444' : entry.type === 'result' ? '#22c55e' : entry.type === 'tool' ? '#fbbf24' : entry.type === 'communication' ? '#22d3ee' : 'rgba(255,255,255,0.4)';
            return (
              <div key={entry.id} className="flex items-start gap-2 text-[11px] leading-5">
                <span style={{ color: 'rgba(255,255,255,0.2)' }}>{ts}</span>
                <span className="font-semibold shrink-0" style={{ color: ac?.color ?? '#a78bfa' }}>[{ac?.name ?? entry.agentId}]</span>
                <span className="truncate" style={{ color: typeColor }}>{entry.message}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ==========================================
// Main page
// ==========================================

export default function TeamStudioPage() {
  const [activeTab, setActiveTab] = useState<TabId>('execute');
  const [messages, setMessages] = useState<StudioMessage[]>(getWelcomeMessages);
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeChannel, setActiveChannel] = useState<ChannelId>('all');
  const [isMobileChannelOpen, setIsMobileChannelOpen] = useState(false);
  const [teamLaunched, setTeamLaunched] = useState(false);
  const [launching, setLaunching] = useState(false);
  const [showAgentConfig, setShowAgentConfig] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Execute mode state
  const [execState, setExecState] = useState<ExecState>(INITIAL_EXEC);
  const [execInput, setExecInput] = useState('');
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());
  const abortRef = useRef<AbortController | null>(null);

  // Plan-Execute mode state
  const [planState, setPlanState] = useState<PlanState>({
    enabled: true,
    isGenerating: false,
    isExecuting: false,
    plan: null,
    stepProgress: {},
  });
  const planAbortRef = useRef<AbortController | null>(null);

  const scrollToBottom = useCallback(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, []);
  useEffect(() => { scrollToBottom(); }, [messages, scrollToBottom]);

  // Check team status on mount
  useEffect(() => {
    fetch(`${AGENT_CHAT_BASE}/api/monitor`, { cache: 'no-store' })
      .then((r) => r.json())
      .then((data: { launched?: boolean }) => {
        if (data.launched) {
          setTeamLaunched(true);
          setMessages((prev) => [...prev, { id: createId(), role: 'system', content: '团队已在线，可以直接发送指令', timestamp: new Date() }]);
        }
      })
      .catch(() => {});
  }, []);

  const addMessage = useCallback((msg: StudioMessage) => { setMessages((prev) => [...prev, msg]); }, []);
  const handleClear = useCallback(() => { setMessages(getWelcomeMessages()); }, []);

  // Launch / Stop team
  const handleLaunchTeam = useCallback(async () => {
    setLaunching(true);
    try {
      const res = await fetch(`${AGENT_CHAT_BASE}/api/launch-team`, { method: 'POST' });
      const data = await res.json() as { ok: boolean };
      if (data.ok) {
        setTeamLaunched(true);
        addMessage({ id: createId(), role: 'system', content: 'Agent 团队已上线！', timestamp: new Date() });
      } else {
        addMessage({ id: createId(), role: 'system', content: '团队启动失败，请确保 agent-chat 服务运行中', timestamp: new Date() });
      }
    } catch (err) {
      addMessage({ id: createId(), role: 'system', content: `无法连接 agent-chat: ${err instanceof Error ? err.message : String(err)}`, timestamp: new Date() });
    }
    setLaunching(false);
  }, [addMessage]);

  const handleStopTeam = useCallback(async () => {
    try { await fetch(`${AGENT_CHAT_BASE}/api/launch-team`, { method: 'DELETE' }); } catch {}
    setTeamLaunched(false);
    addMessage({ id: createId(), role: 'system', content: 'Agent 团队已下线', timestamp: new Date() });
  }, [addMessage]);

  // ===== Execute mode: SSE connection to /api/agent/execute =====

  const logIdRef = useRef(0);

  const execAddLog = useCallback((entry: Omit<ExecLogEntry, 'id'>) => {
    const id = `log-${++logIdRef.current}`;
    setExecState(prev => ({ ...prev, logs: [...prev.logs, { ...entry, id }].slice(-200) }));
  }, []);

  const execUpsertTask = useCallback((agentId: string, update: Partial<ExecTask>) => {
    setExecState(prev => {
      const existing = prev.tasks.find(t => t.agentId === agentId);
      if (existing) {
        return { ...prev, tasks: prev.tasks.map(t => t.agentId === agentId ? { ...t, ...update } : t) };
      }
      const ac = AGENT_COLORS[agentId] ?? { name: agentId };
      const newTask: ExecTask = {
        id: `task-${Date.now()}-${agentId}`, agentId, description: update.description ?? ac.name ?? '',
        status: update.status ?? 'waiting', progress: update.progress ?? 0, toolCallCount: update.toolCallCount ?? 0,
        content: '', ...update,
      };
      return { ...prev, tasks: [...prev.tasks, newTask] };
    });
  }, []);

  const handleExecute = useCallback(async (prompt: string) => {
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setExecState({ isRunning: true, startedAt: Date.now(), prompt, tasks: [], logs: [], result: '' });
    execUpsertTask('ceo', { description: '分析需求，拆解任务', status: 'running', progress: 10 });
    execAddLog({ timestamp: Date.now(), agentId: 'ceo', type: 'info', message: `开始执行: ${prompt.slice(0, 100)}` });

    try {
      const res = await fetch('/api/agent/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agent: 'ceo', message: prompt }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Request failed' }));
        throw new Error((err as { error?: string }).error ?? `HTTP ${res.status}`);
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error('No response stream');
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const jsonStr = line.slice(6).trim();
          if (!jsonStr) continue;

          try {
            const event = JSON.parse(jsonStr) as Record<string, unknown>;
            const type = event.type as string;
            const agentId = (event.agentId ?? 'ceo') as string;
            const now = Date.now();

            switch (type) {
              case 'text': {
                const content = event.content as string;
                // Only log short preview, not full content
                if (content.trim().length > 0) {
                  execAddLog({ timestamp: now, agentId, type: 'info', message: content.slice(0, 150).replace(/\n/g, ' ') });
                }
                // Append content to the specific agent's task card
                setExecState(prev => {
                  const taskExists = prev.tasks.some(t => t.agentId === agentId);
                  let tasks = prev.tasks;
                  if (taskExists) {
                    tasks = tasks.map(t =>
                      t.agentId === agentId
                        ? { ...t, content: t.content + content, status: 'running' as const, progress: Math.min(90, t.progress + 2) }
                        : t
                    );
                  } else {
                    // Create a new task for this agent if we haven't seen it yet
                    const ac = AGENT_COLORS[agentId] ?? { name: agentId, avatar: '?', color: '#a78bfa' };
                    tasks = [...tasks, {
                      id: `task-${now}-${agentId}`, agentId, description: ac.name ?? agentId,
                      status: 'running' as const, progress: 20, toolCallCount: 0, content,
                      startedAt: now,
                    }];
                  }
                  return { ...prev, tasks, result: prev.result + content };
                });
                break;
              }
              case 'tool_call': {
                const tool = event.tool as string;
                const inputStr = (event.input ?? '') as string;

                // Detect sub-agent dispatch: tool name is "Agent" and input contains agent name
                if (tool === 'Agent' || tool === 'agent') {
                  try {
                    const inputObj = JSON.parse(inputStr) as Record<string, unknown>;
                    const subName = (inputObj.agent_name ?? inputObj.name ?? inputObj.agentName ?? inputObj.agent ?? '') as string;
                    if (subName && AGENT_COLORS[subName]) {
                      // Create a new task card for the sub-agent
                      const taskDesc = (inputObj.task ?? inputObj.prompt ?? inputObj.message ?? subName) as string;
                      execUpsertTask(subName, {
                        description: String(taskDesc).slice(0, 120),
                        status: 'running', progress: 5, startedAt: Date.now(),
                      });
                      execAddLog({ timestamp: now, agentId: subName, type: 'communication',
                        message: `CEO 调度 ${AGENT_COLORS[subName]?.name ?? subName} 开始执行` });
                    }
                  } catch { /* input not parseable JSON, skip */ }
                }

                // Update tool call count on the correct agent
                setExecState(prev => ({
                  ...prev,
                  tasks: prev.tasks.map(t =>
                    t.agentId === agentId ? { ...t, toolCallCount: t.toolCallCount + 1, currentTool: tool, status: 'running' as const } : t
                  ),
                }));
                execUpsertTask(agentId, { status: 'running', currentTool: tool });
                execAddLog({ timestamp: now, agentId, type: 'tool', message: `调用工具: ${tool}` });
                break;
              }
              case 'tool_result': {
                const success = event.success as boolean;
                const resultStr = (event.result ?? '') as string;
                execAddLog({ timestamp: now, agentId, type: success ? 'result' : 'error',
                  message: success ? '工具调用完成' : `工具调用失败: ${resultStr.slice(0, 80)}` });
                break;
              }
              case 'sub_agent_start': {
                const task = (event.task ?? '') as string;
                execUpsertTask(agentId, { description: task.slice(0, 120), status: 'running', progress: 5, startedAt: now });
                execAddLog({ timestamp: now, agentId, type: 'communication',
                  message: `CEO 调度 ${AGENT_COLORS[agentId]?.name ?? agentId} 开始执行` });
                break;
              }
              case 'sub_agent_done': {
                const success = event.success as boolean;
                execUpsertTask(agentId, { status: success ? 'done' : 'error', progress: success ? 100 : 0, finishedAt: now });
                execAddLog({ timestamp: now, agentId, type: success ? 'result' : 'error',
                  message: `${AGENT_COLORS[agentId]?.name ?? agentId} ${success ? '完成' : '失败'}` });
                break;
              }
              case 'done': {
                execUpsertTask(agentId, { status: 'done', progress: 100, finishedAt: now });
                execAddLog({ timestamp: now, agentId, type: 'info', message: '全部完成' });
                break;
              }
              case 'error': {
                const message = event.message as string;
                execUpsertTask(agentId, { status: 'error', error: message });
                execAddLog({ timestamp: now, agentId, type: 'error', message });
                break;
              }
            }
          } catch { /* skip malformed */ }
        }
      }
    } catch (err) {
      if ((err as Error).name === 'AbortError') return;
      const msg = err instanceof Error ? err.message : 'Unknown error';
      execAddLog({ timestamp: Date.now(), agentId: 'ceo', type: 'error', message: msg });
    } finally {
      setExecState(prev => ({ ...prev, isRunning: false }));
      abortRef.current = null;
    }
  }, [execAddLog, execUpsertTask]);

  const handleExecStop = useCallback(() => {
    if (abortRef.current) { abortRef.current.abort(); abortRef.current = null; }
    setExecState(prev => ({ ...prev, isRunning: false }));
  }, []);

  const handleExecReset = useCallback(() => {
    if (abortRef.current) { abortRef.current.abort(); abortRef.current = null; }
    setExecState(INITIAL_EXEC);
    setExpandedCards(new Set());
  }, []);

  // ===== Plan-Execute mode handlers =====

  /** Generate a plan from user prompt */
  const handleGeneratePlan = useCallback(async (prompt: string) => {
    if (planAbortRef.current) planAbortRef.current.abort();
    const controller = new AbortController();
    planAbortRef.current = controller;

    setPlanState(prev => ({
      ...prev,
      isGenerating: true,
      isExecuting: false,
      plan: null,
      stepProgress: {},
    }));
    setExecState(prev => ({ ...prev, prompt }));

    try {
      const res = await fetch('/api/agent/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: prompt }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Request failed' }));
        throw new Error((err as { error?: string }).error ?? `HTTP ${res.status}`);
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error('No response stream');
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const jsonStr = line.slice(6).trim();
          if (!jsonStr) continue;

          try {
            const event = JSON.parse(jsonStr) as Record<string, unknown>;
            if (event.type === 'plan') {
              const plan = event.plan as ExecutionPlanData;
              setPlanState(prev => ({ ...prev, plan, isGenerating: false }));
            } else if (event.type === 'plan_error') {
              throw new Error(event.message as string);
            }
          } catch (e) {
            if (e instanceof Error && e.message !== 'Unexpected end of JSON input') {
              throw e;
            }
          }
        }
      }
    } catch (err) {
      if ((err as Error).name === 'AbortError') return;
      const msg = err instanceof Error ? err.message : 'Unknown error';
      setPlanState(prev => ({ ...prev, isGenerating: false }));
      execAddLog({ timestamp: Date.now(), agentId: 'ceo', type: 'error', message: `Plan failed: ${msg}` });
    } finally {
      planAbortRef.current = null;
    }
  }, [execAddLog]);

  /** Approve plan and start execution */
  const handleApprovePlan = useCallback(async (planId: string) => {
    if (planAbortRef.current) planAbortRef.current.abort();
    const controller = new AbortController();
    planAbortRef.current = controller;

    setPlanState(prev => ({
      ...prev,
      isExecuting: true,
      stepProgress: {},
      plan: prev.plan ? { ...prev.plan, status: 'executing' as PlanStatus } : null,
    }));

    try {
      const res = await fetch(`/api/agent/plan/${planId}/approve`, {
        method: 'PUT',
        signal: controller.signal,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Request failed' }));
        throw new Error((err as { error?: string }).error ?? `HTTP ${res.status}`);
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error('No response stream');
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const jsonStr = line.slice(6).trim();
          if (!jsonStr) continue;

          try {
            const event = JSON.parse(jsonStr) as Record<string, unknown>;
            const type = event.type as string;

            switch (type) {
              case 'step_start': {
                const stepId = event.stepId as string;
                const agentId = event.agentId as string;
                setPlanState(prev => {
                  if (!prev.plan) return prev;
                  return {
                    ...prev,
                    plan: {
                      ...prev.plan,
                      steps: prev.plan.steps.map(s =>
                        s.id === stepId ? { ...s, status: 'running' as StepStatusType } : s
                      ),
                    },
                  };
                });
                execAddLog({ timestamp: Date.now(), agentId, type: 'info', message: `Step ${stepId} started` });
                break;
              }
              case 'step_progress': {
                const stepId = event.stepId as string;
                const content = event.content as string;
                setPlanState(prev => ({
                  ...prev,
                  stepProgress: {
                    ...prev.stepProgress,
                    [stepId]: (prev.stepProgress[stepId] ?? '') + content,
                  },
                }));
                break;
              }
              case 'step_complete': {
                const stepId = event.stepId as string;
                const agentId = event.agentId as string;
                const success = event.success as boolean;
                setPlanState(prev => {
                  if (!prev.plan) return prev;
                  return {
                    ...prev,
                    plan: {
                      ...prev.plan,
                      steps: prev.plan.steps.map(s =>
                        s.id === stepId
                          ? { ...s, status: (success ? 'completed' : 'failed') as StepStatusType, result: event.result as string | undefined }
                          : s
                      ),
                    },
                  };
                });
                execAddLog({
                  timestamp: Date.now(),
                  agentId,
                  type: success ? 'result' : 'error',
                  message: `Step ${stepId} ${success ? 'completed' : 'failed'}`,
                });
                break;
              }
              case 'plan_complete': {
                setPlanState(prev => ({
                  ...prev,
                  isExecuting: false,
                  plan: prev.plan ? { ...prev.plan, status: 'completed' as PlanStatus } : null,
                }));
                execAddLog({ timestamp: Date.now(), agentId: 'ceo', type: 'info', message: 'Plan execution completed' });
                break;
              }
              case 'plan_error': {
                const message = event.message as string;
                setPlanState(prev => ({
                  ...prev,
                  isExecuting: false,
                  plan: prev.plan ? { ...prev.plan, status: 'failed' as PlanStatus } : null,
                }));
                execAddLog({ timestamp: Date.now(), agentId: 'ceo', type: 'error', message });
                break;
              }
            }
          } catch { /* skip malformed */ }
        }
      }
    } catch (err) {
      if ((err as Error).name === 'AbortError') return;
      const msg = err instanceof Error ? err.message : 'Unknown error';
      setPlanState(prev => ({
        ...prev,
        isExecuting: false,
        plan: prev.plan ? { ...prev.plan, status: 'failed' as PlanStatus } : null,
      }));
      execAddLog({ timestamp: Date.now(), agentId: 'ceo', type: 'error', message: msg });
    } finally {
      planAbortRef.current = null;
    }
  }, [execAddLog]);

  /** Reject plan */
  const handleRejectPlan = useCallback(async (planId: string, feedback: string) => {
    try {
      await fetch(`/api/agent/plan/${planId}/reject`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ feedback }),
      });
      setPlanState(prev => ({
        ...prev,
        plan: prev.plan ? { ...prev.plan, status: 'rejected' as PlanStatus, feedback } : null,
      }));
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to reject plan';
      execAddLog({ timestamp: Date.now(), agentId: 'ceo', type: 'error', message: msg });
    }
  }, [execAddLog]);

  /** Modify plan (not yet implemented in detail, just resets to pending) */
  const handleModifyPlan = useCallback(async (planId: string, steps: PlanStepData[], feedback: string) => {
    try {
      const res = await fetch(`/api/agent/plan/${planId}/modify`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ steps, feedback }),
      });
      if (res.ok) {
        const data = (await res.json()) as { data: ExecutionPlanData };
        setPlanState(prev => ({ ...prev, plan: data.data }));
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to modify plan';
      execAddLog({ timestamp: Date.now(), agentId: 'ceo', type: 'error', message: msg });
    }
  }, [execAddLog]);

  /** Reset plan state */
  const handlePlanReset = useCallback(() => {
    if (planAbortRef.current) { planAbortRef.current.abort(); planAbortRef.current = null; }
    setPlanState(prev => ({ ...prev, isGenerating: false, isExecuting: false, plan: null, stepProgress: {} }));
    setExecState(INITIAL_EXEC);
  }, []);

  // ===== Chat mode send (legacy) =====

  const sendMessage = useCallback(async (messageText: string) => {
    if (!messageText || isProcessing) return;
    setIsProcessing(true);
    addMessage({ id: createId(), role: 'user', content: messageText, timestamp: new Date() });

    let targetAgentId = activeChannel === 'all' ? 'ceo' : activeChannel;
    const agent = AGENT_MAP.get(targetAgentId);
    if (!agent) { addMessage({ id: createId(), role: 'system', content: `未知 Agent: ${targetAgentId}`, timestamp: new Date() }); setIsProcessing(false); return; }
    if (!teamLaunched) { addMessage({ id: createId(), role: 'system', content: '请先 Launch Team 启动 Agent 团队', timestamp: new Date() }); setIsProcessing(false); return; }

    const msgId = createId();
    setMessages((prev) => [...prev, { id: msgId, role: 'agent', agentId: targetAgentId, content: '', timestamp: new Date(), isStreaming: true }]);
    const conversationHistory = buildConversationHistory(messages);
    let fullContent = '';

    await streamAgentMessage(targetAgentId, agent.systemPrompt, conversationHistory, messageText,
      (text) => { fullContent += text; setMessages((prev) => prev.map((m) => m.id === msgId ? { ...m, content: fullContent, isStreaming: true } : m)); },
      () => { setMessages((prev) => prev.map((m) => m.id === msgId ? { ...m, content: fullContent || '(无响应)', isStreaming: false } : m)); setIsProcessing(false); },
      (error) => { if (!fullContent) setMessages((prev) => prev.map((m) => m.id === msgId ? { ...m, content: `错误: ${error}`, isStreaming: false } : m)); },
    );
  }, [isProcessing, activeChannel, teamLaunched, messages, addMessage]);

  const handleSend = useCallback(async () => {
    const trimmed = input.trim();
    if (!trimmed) return;
    setInput('');
    await sendMessage(trimmed);
  }, [input, sendMessage]);

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const filteredMessages = activeChannel === 'all' ? messages : messages.filter((m) => m.role !== 'agent' || m.agentId === activeChannel);

  const taskSummary = (() => {
    const userMsgs = messages.filter(m => m.role === 'user');
    if (userMsgs.length === 0) return undefined;
    const latest = userMsgs[userMsgs.length - 1].content;
    return latest.length > 60 ? latest.slice(0, 60) + '...' : latest;
  })();

  // Portal target for header actions
  const [headerSlot, setHeaderSlot] = useState<HTMLElement | null>(null);
  useEffect(() => {
    const el = document.getElementById('header-actions');
    setHeaderSlot(el);
    return () => { if (el) el.innerHTML = ''; };
  }, []);

  // Listen for OpenClaw team workflow actions
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as { action: string; message?: string };
      switch (detail.action) {
        case 'launch': if (!teamLaunched && !launching) handleLaunchTeam(); break;
        case 'sync_task':
          setActiveTab('execute');
          if (detail.message) setTimeout(() => { setExecInput(detail.message!); }, 500);
          break;
        case 'monitor': setActiveTab('monitor'); break;
      }
    };
    window.addEventListener('openclaw:team-action', handler);
    return () => window.removeEventListener('openclaw:team-action', handler);
  }, [teamLaunched, launching, handleLaunchTeam]);

  // Execution state computed values
  const allExecDone = execState.tasks.length > 0 && !execState.isRunning &&
    execState.tasks.every(t => t.status === 'done' || t.status === 'error');
  const execElapsed = execState.startedAt ? Math.round((Date.now() - execState.startedAt) / 1000) : 0;
  const execRunningCount = execState.tasks.filter(t => t.status === 'running').length;
  const execDoneCount = execState.tasks.filter(t => t.status === 'done').length;
  const execWaitingCount = execState.tasks.filter(t => t.status === 'waiting').length;

  return (
    <div className="flex flex-col h-[calc(100vh-theme(spacing.16)-theme(spacing.12))] -m-6 overflow-hidden">
      {/* Portal tab buttons + controls into header */}
      {headerSlot && createPortal(
        <>
          {/* Tab buttons — Fast Mode | Chat | Team Mode */}
          <button onClick={() => setActiveTab('execute')}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 cursor-pointer"
            style={activeTab === 'execute' ? { background: 'rgba(251,191,36,0.10)', color: '#fbbf24' } : { color: 'rgba(255,255,255,0.35)' }}
          >
            <Zap className="h-4 w-4" />Fast Mode
            {activeTab === 'execute' && <span className="text-[10px] font-bold tracking-wider ml-0.5 px-1 py-0.5 rounded" style={{ background: 'rgba(251,191,36,0.15)', color: '#fbbf24' }}>FAST</span>}
          </button>
          <button onClick={() => setActiveTab('chat')}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 cursor-pointer"
            style={activeTab === 'chat' ? { background: 'rgba(167,139,250,0.10)', color: '#ffffff' } : { color: 'rgba(255,255,255,0.35)' }}
          >
            <MessageSquare className="h-4 w-4" />团队对话
          </button>
          <button data-team-monitor onClick={() => setActiveTab('monitor')}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 cursor-pointer"
            style={activeTab === 'monitor' ? { background: 'rgba(34,211,238,0.10)', color: '#22d3ee' } : { color: 'rgba(255,255,255,0.35)' }}
          >
            <Monitor className="h-4 w-4" />Team Mode
            {activeTab === 'monitor' && <span className="text-[10px] font-bold tracking-wider ml-0.5 px-1 py-0.5 rounded" style={{ background: 'rgba(34,211,238,0.15)', color: '#22d3ee' }}>TEAM</span>}
          </button>

          {/* Launch / Stop */}
          {teamLaunched ? (
            <button onClick={handleStopTeam}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm font-medium transition-all cursor-pointer hover:brightness-110"
              style={{ background: 'rgba(239,68,68,0.10)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)' }}
            ><PowerOff className="h-3.5 w-3.5" />Stop</button>
          ) : (
            <button data-team-launch onClick={handleLaunchTeam} disabled={launching}
              className={cn('flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm font-medium transition-all cursor-pointer hover:brightness-110', launching && 'opacity-50 cursor-wait')}
              style={{ background: 'rgba(34,197,94,0.10)', color: '#22c55e', border: '1px solid rgba(34,197,94,0.2)' }}
            ><Power className="h-3.5 w-3.5" />{launching ? '...' : 'Launch'}</button>
          )}
        </>,
        headerSlot,
      )}

      {/* ===== Execute Mode Tab ===== */}
      {activeTab === 'execute' && (
        <div className="flex flex-1 flex-col min-h-0 overflow-hidden" style={{ background: '#030305' }}>

          {/* ===== Plan Review Mode ===== */}
          {planState.enabled && (planState.plan || planState.isGenerating) ? (
            <>
              {/* Plan header */}
              <div className="shrink-0 px-5 py-3 flex items-center justify-between"
                style={{ background: 'rgba(19,19,27,0.75)', backdropFilter: 'blur(20px) saturate(1.2)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}
              >
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold"
                    style={{ background: 'rgba(96,165,250,0.08)', color: '#60a5fa' }}
                  >
                    <ListChecks className="w-3 h-3" />PLAN
                  </span>
                  <span className="text-[15px] font-semibold text-white truncate max-w-[400px]">{execState.prompt}</span>
                </div>
                <button onClick={handlePlanReset}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all hover:brightness-125"
                  style={{ color: 'rgba(255,255,255,0.4)', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
                ><RotateCcw className="w-3 h-3" />重置</button>
              </div>

              {/* Plan content */}
              <div className="flex-1 overflow-y-auto p-4">
                {planState.isGenerating ? (
                  <div className="flex flex-col items-center justify-center h-full gap-3">
                    <Loader2 className="w-8 h-8 animate-spin" style={{ color: '#60a5fa' }} />
                    <p className="text-[14px]" style={{ color: 'rgba(255,255,255,0.5)' }}>CEO Agent 正在分析需求，生成执行计划...</p>
                  </div>
                ) : planState.plan ? (
                  <PlanReview
                    plan={planState.plan}
                    stepProgress={planState.stepProgress}
                    onApprove={handleApprovePlan}
                    onReject={handleRejectPlan}
                    onModify={handleModifyPlan}
                    isApproving={planState.isExecuting}
                  />
                ) : null}
              </div>

              {/* Plan rejected — allow retry or switch to direct */}
              {planState.plan?.status === 'rejected' && (
                <div className="shrink-0 px-4 py-3 flex items-center gap-3"
                  style={{ borderTop: '1px solid rgba(255,255,255,0.06)', background: 'rgba(10,10,15,0.9)' }}
                >
                  <button onClick={handlePlanReset}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[13px] font-medium transition-all hover:brightness-110"
                    style={{ color: '#a78bfa', background: 'rgba(167,139,250,0.10)', border: '1px solid rgba(167,139,250,0.20)' }}
                  ><RotateCcw className="w-3.5 h-3.5" />重新输入</button>
                  <button onClick={() => { handlePlanReset(); setPlanState(prev => ({ ...prev, enabled: false })); }}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[13px] font-medium transition-all hover:brightness-110"
                    style={{ color: '#fbbf24', background: 'rgba(251,191,36,0.10)', border: '1px solid rgba(251,191,36,0.20)' }}
                  ><Zap className="w-3.5 h-3.5" />直接执行模式</button>
                </div>
              )}
            </>
          ) : (execState.prompt || execState.tasks.length > 0) ? (
          /* ===== Direct Execute Mode (original) ===== */
            <>
              {/* Task header */}
              <div className="shrink-0 px-5 py-3 flex flex-col gap-2"
                style={{ background: 'rgba(19,19,27,0.75)', backdropFilter: 'blur(20px) saturate(1.2)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {execState.isRunning && (
                      <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold"
                        style={{ background: 'rgba(251,191,36,0.08)', color: '#fbbf24' }}
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-yellow-500 animate-pulse" />SDK
                      </span>
                    )}
                    <span className="text-[15px] font-semibold text-white truncate max-w-[400px]">{execState.prompt}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    {execElapsed > 0 && (
                      <span className="text-[13px] tabular-nums" style={{ color: 'rgba(255,255,255,0.6)', fontFamily: 'var(--font-geist-mono)' }}>
                        {execElapsed >= 60 ? `${String(Math.floor(execElapsed / 60)).padStart(2, '0')}:${String(execElapsed % 60).padStart(2, '0')}` : `${execElapsed}s`}
                      </span>
                    )}
                    {execState.isRunning && (
                      <button onClick={handleExecStop}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all hover:brightness-125"
                        style={{ color: '#ef4444', background: 'rgba(239,68,68,0.10)', border: '1px solid rgba(239,68,68,0.20)' }}
                      ><Square className="w-3 h-3" />Stop</button>
                    )}
                  </div>
                </div>
                {execState.tasks.length > 0 && (
                  <div className="text-[13px]" style={{ color: 'rgba(255,255,255,0.4)' }}>
                    {execState.tasks.length} 个子任务
                    {execRunningCount > 0 && <span> · {execRunningCount} 执行中</span>}
                    {execWaitingCount > 0 && <span> · {execWaitingCount} 等待中</span>}
                    {execDoneCount > 0 && <span> · {execDoneCount} 已完成</span>}
                  </div>
                )}
              </div>

              {/* Task cards grid */}
              <div className="flex-1 overflow-y-auto p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {execState.tasks.map(task => (
                    <ExecTaskCard
                      key={task.id}
                      task={task}
                      expanded={expandedCards.has(task.agentId)}
                      onToggleExpand={() => setExpandedCards(prev => {
                        const next = new Set(prev);
                        if (next.has(task.agentId)) next.delete(task.agentId);
                        else next.add(task.agentId);
                        return next;
                      })}
                    />
                  ))}
                </div>

                {/* Result summary when all done */}
                {allExecDone && (
                  <div className="cotify-card p-6 space-y-4 mt-4">
                    <div className="flex items-center gap-3 text-[14px]">
                      <CheckCircle className="w-5 h-5 shrink-0" style={{ color: '#22c55e' }} />
                      <span className="text-white font-medium">全部 {execState.tasks.length} 个任务已完成</span>
                      <span style={{ color: 'rgba(255,255,255,0.5)' }}>
                        · 总耗时 {execElapsed >= 60 ? `${Math.floor(execElapsed / 60)}m ${execElapsed % 60}s` : `${execElapsed}s`}
                      </span>
                    </div>

                    {/* Per-agent output cards */}
                    {execState.tasks.filter(t => t.content.length > 0).length > 0 && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {execState.tasks.filter(t => t.content.length > 0).map(task => {
                          const ac = AGENT_COLORS[task.agentId] ?? { color: '#a78bfa', avatar: '?', name: task.agentId };
                          return (
                            <div key={task.id} className="rounded-xl p-4 flex flex-col gap-2"
                              style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}
                            >
                              <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-bold"
                                  style={{ background: `${ac.color}15`, color: ac.color }}
                                >{ac.avatar}</div>
                                <span className="text-[13px] font-medium text-white">{ac.name}</span>
                                <span className="text-[11px]" style={{ color: 'rgba(255,255,255,0.3)' }}>{task.content.length} 字</span>
                              </div>
                              <div className="text-[13px] leading-relaxed max-h-[200px] overflow-y-auto"
                                style={{ color: 'rgba(255,255,255,0.7)', whiteSpace: 'pre-wrap' }}
                              >
                                {task.content.slice(0, 2000)}
                                {task.content.length > 2000 && <span style={{ color: 'rgba(255,255,255,0.3)' }}>... (已截断)</span>}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Fallback: show raw result if no per-agent content */}
                    {execState.tasks.filter(t => t.content.length > 0).length === 0 && execState.result && (
                      <div className="rounded-xl p-4 text-[13px] leading-relaxed max-h-[300px] overflow-y-auto"
                        style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.7)', whiteSpace: 'pre-wrap' }}
                      >
                        {execState.result.slice(0, 3000)}
                        {execState.result.length > 3000 && <span style={{ color: 'rgba(255,255,255,0.3)' }}>... (已截断)</span>}
                      </div>
                    )}

                    <div className="flex items-center gap-3 pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                      <button onClick={handleExecReset}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[13px] font-medium transition-all hover:brightness-125"
                        style={{ color: '#a78bfa', background: 'rgba(167,139,250,0.10)', border: '1px solid rgba(167,139,250,0.20)' }}
                      ><RotateCcw className="w-3.5 h-3.5" />重新执行</button>
                      <button className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[13px] font-medium transition-all hover:brightness-125"
                        style={{ color: '#22c55e', background: 'rgba(34,197,94,0.10)', border: '1px solid rgba(34,197,94,0.20)' }}
                      ><Save className="w-3.5 h-3.5" />保存到 Context Vault</button>
                    </div>
                  </div>
                )}
              </div>

              {/* Terminal log */}
              {execState.logs.length > 0 && <ExecTerminalLog logs={execState.logs} />}
            </>
          ) : (
            /* Empty state */
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center space-y-3">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto"
                  style={{ background: planState.enabled ? 'rgba(96,165,250,0.08)' : 'rgba(167,139,250,0.08)', border: `1px solid ${planState.enabled ? 'rgba(96,165,250,0.15)' : 'rgba(167,139,250,0.15)'}` }}
                >
                  {planState.enabled
                    ? <ListChecks className="w-7 h-7" style={{ color: '#60a5fa' }} />
                    : <span className="text-2xl" style={{ color: '#a78bfa', fontFamily: 'var(--font-geist-mono)' }}>$</span>
                  }
                </div>
                <p className="text-[14px] text-[rgba(255,255,255,0.4)]">
                  {planState.enabled ? '输入指令，CEO 将生成执行计划供您审批' : '输入指令，开始 Agent 执行'}
                </p>
                <p className="text-[12px] text-[rgba(255,255,255,0.2)]">
                  {planState.enabled
                    ? 'Plan-Execute 模式: 先审批计划，再按计划执行'
                    : 'CEO 将自动拆解任务并调度子 Agent 协同工作'
                  }
                </p>
              </div>
            </div>
          )}

          {/* Execute command input with Plan toggle */}
          <div className="shrink-0 flex items-center gap-3 px-4 py-3"
            style={{ background: 'rgba(10,10,15,0.9)', backdropFilter: 'blur(12px)', borderTop: '1px solid rgba(255,255,255,0.08)' }}
          >
            {/* Plan/Direct mode toggle */}
            <button
              onClick={() => setPlanState(prev => ({ ...prev, enabled: !prev.enabled }))}
              className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-[11px] font-medium transition-all shrink-0"
              style={{
                background: planState.enabled ? 'rgba(96,165,250,0.10)' : 'rgba(251,191,36,0.10)',
                color: planState.enabled ? '#60a5fa' : '#fbbf24',
                border: `1px solid ${planState.enabled ? 'rgba(96,165,250,0.20)' : 'rgba(251,191,36,0.20)'}`,
              }}
              title={planState.enabled ? '当前: Plan-Execute 模式（点击切换）' : '当前: 直接执行模式（点击切换）'}
            >
              {planState.enabled ? <ListChecks className="w-3 h-3" /> : <Zap className="w-3 h-3" />}
              {planState.enabled ? 'Plan' : 'Fast'}
            </button>

            <span className="text-[14px] font-bold shrink-0" style={{ color: planState.enabled ? '#60a5fa' : '#a78bfa', fontFamily: 'var(--font-geist-mono)' }}>$</span>
            <input type="text" value={execInput}
              onChange={e => setExecInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey && execInput.trim() && !execState.isRunning && !planState.isGenerating) {
                  e.preventDefault();
                  const prompt = execInput.trim();
                  setExecInput('');
                  if (planState.enabled) {
                    handleGeneratePlan(prompt);
                  } else {
                    handleExecute(prompt);
                  }
                }
              }}
              placeholder={planState.enabled ? '输入需求，生成执行计划...' : '输入需求，如「帮我做一期 AI 工具播客」...'}
              disabled={execState.isRunning || planState.isGenerating}
              className="flex-1 bg-transparent text-[14px] text-white placeholder:text-[rgba(255,255,255,0.25)] outline-none disabled:opacity-50"
              style={{ fontFamily: 'var(--font-geist-mono)' }}
            />
            <button
              onClick={() => {
                if (execInput.trim() && !execState.isRunning && !planState.isGenerating) {
                  const prompt = execInput.trim();
                  setExecInput('');
                  if (planState.enabled) {
                    handleGeneratePlan(prompt);
                  } else {
                    handleExecute(prompt);
                  }
                }
              }}
              disabled={!execInput.trim() || execState.isRunning || planState.isGenerating}
              className="flex items-center justify-center w-8 h-8 rounded-lg transition-all disabled:opacity-30"
              style={{ background: execInput.trim() && !execState.isRunning && !planState.isGenerating ? (planState.enabled ? 'rgba(96,165,250,0.15)' : 'rgba(167,139,250,0.15)') : 'transparent', color: planState.enabled ? '#60a5fa' : '#a78bfa' }}
            ><Send className="w-4 h-4" /></button>
          </div>
        </div>
      )}

      {/* ===== Team Mode Tab (Agent Team v3 Monitor) ===== */}
      {activeTab === 'monitor' && (
        <div className="flex-1 overflow-hidden">
          <Suspense fallback={
            <div className="flex items-center justify-center h-full" style={{ background: '#030305' }}>
              <Loader2 className="w-6 h-6 animate-spin" style={{ color: '#22d3ee' }} />
            </div>
          }>
            <TeamModeView />
          </Suspense>
        </div>
      )}

      {/* ===== Chat Tab (legacy) ===== */}
      {activeTab === 'chat' && (
        <div className="flex flex-1 min-h-0 overflow-hidden">
          <ChannelList activeChannel={activeChannel} onSelect={(id) => { setActiveChannel(id); setShowAgentConfig(false); }}
            teamLaunched={teamLaunched} isMobileOpen={isMobileChannelOpen} onClose={() => setIsMobileChannelOpen(false)}
          />
          <div className="flex flex-1 flex-col min-w-0" style={{ background: '#030305' }}>
            {/* Chat header */}
            <div className="shrink-0" style={{ background: 'rgba(5,5,8,0.8)', backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <div className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-2">
                  <button className="md:hidden p-1 rounded hover:bg-[rgba(255,255,255,0.05)]" onClick={() => setIsMobileChannelOpen(true)}>
                    <Hash className="h-5 w-5" style={{ color: 'rgba(255,255,255,0.4)' }} />
                  </button>
                  {activeChannel !== 'all' ? (() => {
                    const a = AGENT_MAP.get(activeChannel);
                    if (!a) return null;
                    const lvl = LEVEL_STYLE[a.level] ?? LEVEL_STYLE.Specialist;
                    return (
                      <button onClick={() => setShowAgentConfig((prev) => !prev)}
                        className="flex items-center gap-2.5 cursor-pointer rounded-lg px-1.5 py-1 -ml-1.5 transition-colors hover:bg-[rgba(255,255,255,0.04)]"
                      >
                        <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 overflow-hidden"
                          style={{ background: `${a.color}15`, border: `1px solid ${a.color}20` }}
                        ><PixelAgentSVG agentId={a.id as 'ceo' | 'xhs-agent' | 'growth-agent' | 'brand-reviewer'} status={teamLaunched ? (isProcessing ? 'busy' : 'online') : 'offline'} className="w-5 h-5" /></div>
                        <div className="flex flex-col items-start">
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm font-semibold text-white">{a.labelCn}</span>
                            <span className="text-sm px-1.5 py-px rounded-full font-medium" style={{ background: lvl.bg, color: lvl.text, border: `1px solid ${lvl.border}` }}>{a.level}</span>
                          </div>
                          <span className="text-base" style={{ color: 'rgba(255,255,255,0.3)' }}>
                            SDK Agent{teamLaunched && <span className="ml-1.5 inline-flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full inline-block" style={{ background: '#22c55e' }} />在线</span>}
                          </span>
                        </div>
                        <ChevronUp className={cn('h-3.5 w-3.5 ml-1 transition-transform duration-200', showAgentConfig ? 'rotate-0' : 'rotate-180')} style={{ color: 'rgba(255,255,255,0.25)' }} />
                      </button>
                    );
                  })() : (
                    <><Hash className="h-4 w-4 hidden md:block" style={{ color: 'rgba(255,255,255,0.25)' }} /><span className="text-sm font-semibold text-white">全员</span></>
                  )}
                </div>
                <button onClick={handleClear} className="p-2 rounded-lg transition-colors hover:bg-[rgba(255,255,255,0.05)]" style={{ color: 'rgba(255,255,255,0.3)' }} title="清空消息">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              {showAgentConfig && activeChannel !== 'all' && (() => {
                const a = AGENT_MAP.get(activeChannel);
                return a ? <AgentInfoPanel agent={a} /> : null;
              })()}
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto py-4">
              {filteredMessages.map((msg) => {
                if (msg.role === 'system') return <SystemBubble key={msg.id} msg={msg} />;
                if (msg.role === 'user') return <UserBubble key={msg.id} msg={msg} />;
                return <AgentBubble key={msg.id} msg={msg} />;
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Chat input */}
            <div className="p-4 shrink-0" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              {!teamLaunched && (
                <div className="mb-3 px-4 py-2.5 rounded-xl text-base"
                  style={{ background: 'rgba(251,191,36,0.06)', border: '1px solid rgba(251,191,36,0.15)', color: '#fbbf24' }}
                >
                  Agent 团队未启动。请先点击 <strong>Launch</strong> 按钮启动 Agent 进程。
                </div>
              )}
              <div className="flex items-end gap-2" data-team-input>
                <textarea value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={handleKeyDown}
                  placeholder={isProcessing ? 'Agent 工作中...' : `发送指令给 ${activeChannel === 'all' ? 'CEO（全员编排）' : AGENT_MAP.get(activeChannel)?.label ?? 'Agent'}...`}
                  disabled={isProcessing} rows={1}
                  className={cn('flex-1 min-h-10 max-h-32 resize-none rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-[rgba(255,255,255,0.25)] focus:outline-none transition-all', isProcessing && 'opacity-50 cursor-not-allowed')}
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
                  onFocus={e => (e.target as HTMLElement).style.borderColor = 'rgba(167,139,250,0.3)'}
                  onBlur={e => (e.target as HTMLElement).style.borderColor = 'rgba(255,255,255,0.08)'}
                />
                <button onClick={handleSend} disabled={isProcessing || !input.trim()}
                  className={cn('h-10 w-10 shrink-0 rounded-xl flex items-center justify-center transition-all duration-200', isProcessing || !input.trim() ? 'cursor-not-allowed' : 'hover:brightness-110 cursor-pointer')}
                  style={{ background: isProcessing || !input.trim() ? 'rgba(255,255,255,0.04)' : 'linear-gradient(135deg, #a78bfa, #818cf8)', color: isProcessing || !input.trim() ? 'rgba(255,255,255,0.2)' : '#ffffff' }}
                ><Send className="h-4 w-4" /></button>
              </div>
              {isProcessing && (
                <div className="flex items-center gap-2 mt-2 text-sm" style={{ color: 'rgba(255,255,255,0.3)' }}>
                  <span className="flex gap-1">
                    <span className="h-1.5 w-1.5 rounded-full animate-bounce" style={{ background: '#a78bfa', animationDelay: '0ms' }} />
                    <span className="h-1.5 w-1.5 rounded-full animate-bounce" style={{ background: '#a78bfa', animationDelay: '150ms' }} />
                    <span className="h-1.5 w-1.5 rounded-full animate-bounce" style={{ background: '#a78bfa', animationDelay: '300ms' }} />
                  </span>
                  Agent 正在处理中...
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
