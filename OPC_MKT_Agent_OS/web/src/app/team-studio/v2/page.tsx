'use client';

import { useState, useCallback } from 'react';
import { Send, ChevronRight, Wrench, CheckCircle, AlertCircle, MessageSquare } from 'lucide-react';

// ==========================================
// Mock Data — 9 Agents
// ==========================================

type AgentStatus = 'running' | 'idle' | 'done' | 'error' | 'offline';

interface Agent {
  id: string;
  label: string;
  labelCn: string;
  color: string;
  initial: string;
  status: AgentStatus;
  currentTask?: string;
  progress: number;
  toolCalls?: { tool: string; count: number }[];
  content?: string;
}

const MOCK_AGENTS: Agent[] = [
  {
    id: 'ceo', label: 'CEO', labelCn: 'CEO 营销总监', color: '#e74c3c', initial: 'CEO',
    status: 'running', currentTask: '正在调度子 Agent 执行任务', progress: 60,
    toolCalls: [{ tool: 'Dispatch', count: 3 }],
    content: '## 任务拆解\n\n收到需求后，我制定了以下执行计划：\n\n1. **Growth Agent** — 负责选题研究和热点分析\n2. **XHS Agent** — 按选题方向创作种草笔记\n3. **Brand Reviewer** — 对内容进行品牌调性审查\n\n当前状态：Growth 已完成，XHS 正在创作中...',
  },
  {
    id: 'xhs-agent', label: 'XHS', labelCn: '小红书创作专家', color: '#ff2442', initial: 'XHS',
    status: 'running', currentTask: '撰写种草笔记', progress: 45,
    toolCalls: [{ tool: 'Read', count: 3 }, { tool: 'Write', count: 1 }],
    content: '# 🌟 这款面膜真的绝了！干皮姐妹冲！\n\n姐妹们！！今天必须给你们安利这款宝藏面膜 ✨\n\n用了一周，皮肤状态直接起飞 🚀\n\n## 使用感受\n- 质地：奶油般丝滑，上脸不会搓泥\n- 吸收：3分钟就能感觉到满满的水润感\n- 第二天早上皮肤滑溜溜的，出门可以直接素颜！\n\n## 成分分析\n- 5重玻尿酸 — 深层补水\n- 神经酰胺 — 修护屏障\n- 积雪草提取物 — 舒缓镇定\n\n▌',
  },
  { id: 'analyst-agent', label: 'Analyst', labelCn: '数据分析专家', color: '#22d3ee', initial: 'AN', status: 'idle', progress: 0 },
  {
    id: 'growth-agent', label: 'Growth', labelCn: '增长营销专家', color: '#00cec9', initial: 'G',
    status: 'done', currentTask: '选题分析完成', progress: 100,
    toolCalls: [{ tool: 'WebSearch', count: 5 }, { tool: 'Read', count: 2 }],
    content: '## 选题研究报告\n\n### 平台热度分析\n| 话题 | 搜索热度 | 竞争度 | 推荐指数 |\n|------|----------|--------|----------|\n| 干皮护肤 | ↑45% | 中 | ⭐⭐⭐⭐⭐ |\n| 平价面膜测评 | ↑28% | 低 | ⭐⭐⭐⭐ |\n| 换季护肤 | ↑62% | 高 | ⭐⭐⭐ |\n\n### 推荐方向\n选择「干皮护肤 + 面膜测评」组合选题，热度高且竞品内容质量一般。\n\n### 建议标签\n#面膜测评 #干皮救星 #护肤分享 #好物推荐',
  },
  {
    id: 'brand-reviewer', label: 'Reviewer', labelCn: '品牌风控审查', color: '#a855f7', initial: 'BR',
    status: 'idle', currentTask: '等待 XHS 内容完成后审查', progress: 0,
  },
  { id: 'podcast-agent', label: 'Podcast', labelCn: '播客内容专家', color: '#f59e0b', initial: 'POD', status: 'offline', progress: 0 },
  { id: 'x-twitter-agent', label: 'X/Twitter', labelCn: 'X/Twitter 专家', color: '#1da1f2', initial: 'X', status: 'offline', progress: 0 },
  { id: 'visual-gen-agent', label: 'Visual', labelCn: '视觉设计专家', color: '#ec4899', initial: 'VIS', status: 'offline', progress: 0 },
  { id: 'strategist-agent', label: 'Strategist', labelCn: '策略规划专家', color: '#8b5cf6', initial: 'STR', status: 'offline', progress: 0 },
];

// ==========================================
// Timeline Events
// ==========================================

type EventType = 'user-command' | 'thinking' | 'dispatch' | 'tool-call' | 'output' | 'error' | 'complete';

interface TimelineEvent {
  id: string;
  time: string;
  agentId: string;
  agentLabel: string;
  agentColor: string;
  type: EventType;
  message: string;
  detail?: string;
  targetAgentId?: string;
  targetAgentLabel?: string;
  targetAgentColor?: string;
}

const MOCK_EVENTS: TimelineEvent[] = [
  { id: 'e1', time: '14:30:00', agentId: 'user', agentLabel: '用户', agentColor: '#a78bfa', type: 'user-command', message: '帮我写一篇小红书种草笔记，主题是面膜推荐，目标受众是干皮女生' },
  { id: 'e2', time: '14:30:02', agentId: 'ceo', agentLabel: 'CEO', agentColor: '#e74c3c', type: 'thinking', message: '分析需求，制定执行计划...' },
  { id: 'e3', time: '14:30:05', agentId: 'ceo', agentLabel: 'CEO', agentColor: '#e74c3c', type: 'dispatch', message: '选题研究', targetAgentId: 'growth-agent', targetAgentLabel: 'Growth', targetAgentColor: '#00cec9' },
  { id: 'e4', time: '14:30:08', agentId: 'growth-agent', agentLabel: 'Growth', agentColor: '#00cec9', type: 'tool-call', message: 'WebSearch("小红书 面膜 热门话题 2026")' },
  { id: 'e5', time: '14:30:15', agentId: 'growth-agent', agentLabel: 'Growth', agentColor: '#00cec9', type: 'tool-call', message: 'WebSearch("小红书 干皮 面膜 爆款笔记")' },
  { id: 'e6', time: '14:30:22', agentId: 'growth-agent', agentLabel: 'Growth', agentColor: '#00cec9', type: 'tool-call', message: 'Read("competitor-analysis.md")' },
  { id: 'e7', time: '14:30:28', agentId: 'growth-agent', agentLabel: 'Growth', agentColor: '#00cec9', type: 'output', message: '选题分析完成', detail: '输出 3 个推荐选题方向，建议选择「干皮护肤 + 面膜测评」组合' },
  { id: 'e8', time: '14:30:30', agentId: 'ceo', agentLabel: 'CEO', agentColor: '#e74c3c', type: 'dispatch', message: '按选题方向 #1 创作种草笔记', targetAgentId: 'xhs-agent', targetAgentLabel: 'XHS', targetAgentColor: '#ff2442' },
  { id: 'e9', time: '14:30:32', agentId: 'xhs-agent', agentLabel: 'XHS', agentColor: '#ff2442', type: 'thinking', message: '开始构思笔记结构...' },
  { id: 'e10', time: '14:30:35', agentId: 'xhs-agent', agentLabel: 'XHS', agentColor: '#ff2442', type: 'tool-call', message: 'Read("brand-guidelines.md")' },
  { id: 'e11', time: '14:30:40', agentId: 'ceo', agentLabel: 'CEO', agentColor: '#e74c3c', type: 'dispatch', message: '待命，等待 XHS 完成后进行品牌审查', targetAgentId: 'brand-reviewer', targetAgentLabel: 'Reviewer', targetAgentColor: '#a855f7' },
  { id: 'e12', time: '14:30:45', agentId: 'xhs-agent', agentLabel: 'XHS', agentColor: '#ff2442', type: 'tool-call', message: 'Read("product-info.json")' },
  { id: 'e13', time: '14:30:55', agentId: 'xhs-agent', agentLabel: 'XHS', agentColor: '#ff2442', type: 'thinking', message: '正在撰写正文内容...' },
];

// ==========================================
// Sub-components
// ==========================================

function StatusDot({ status }: { status: AgentStatus }) {
  const baseClass = 'w-2 h-2 rounded-full shrink-0';
  switch (status) {
    case 'running':
      return (
        <span className="relative flex items-center justify-center w-2 h-2">
          <span className={`${baseClass} animate-pulse`} style={{ backgroundColor: '#fbbf24' }} />
          <span className="absolute inset-0 rounded-full animate-ping opacity-20" style={{ backgroundColor: '#fbbf24' }} />
        </span>
      );
    case 'done':
      return <span className={baseClass} style={{ backgroundColor: '#22c55e' }} />;
    case 'error':
      return <span className={`${baseClass} animate-pulse`} style={{ backgroundColor: '#ef4444' }} />;
    case 'idle':
      return <span className={baseClass} style={{ backgroundColor: '#22c55e', opacity: 0.5 }} />;
    default:
      return <span className={baseClass} style={{ backgroundColor: 'rgba(255,255,255,0.15)' }} />;
  }
}

function PixelAvatar({ initial, color, size = 28 }: { initial: string; color: string; size?: number }) {
  return (
    <div
      className="rounded-lg flex items-center justify-center font-mono font-bold text-white shrink-0"
      style={{
        width: size,
        height: size,
        backgroundColor: `${color}20`,
        border: `1px solid ${color}40`,
        fontSize: size * 0.35,
      }}
    >
      {initial}
    </div>
  );
}

function DispatchBadge({ from, to, fromColor, toColor }: { from: string; to: string; fromColor: string; toColor: string }) {
  return (
    <span
      className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md font-medium"
      style={{
        background: `linear-gradient(135deg, ${fromColor}15, ${toColor}15)`,
        border: `1px solid ${toColor}30`,
      }}
    >
      <span style={{ color: fromColor }}>{from}</span>
      <ChevronRight size={10} style={{ color: 'rgba(255,255,255,0.3)' }} />
      <span style={{ color: toColor }}>{to}</span>
    </span>
  );
}

function TimelineDot({ type, color }: { type: EventType; color: string }) {
  const base = 'absolute left-[5px] top-3 w-3 h-3 rounded-full border-2 z-10';
  const borderColor = '#030305';
  switch (type) {
    case 'user-command':
      return <div className={base} style={{ backgroundColor: '#a78bfa', borderColor }} />;
    case 'dispatch':
      return <div className={base} style={{ backgroundColor: color, borderColor }} />;
    case 'tool-call':
      return <div className={base} style={{ backgroundColor: '#fbbf24', borderColor, width: 10, height: 10, left: 6, top: 14 }} />;
    case 'output':
      return <div className={base} style={{ backgroundColor: '#22c55e', borderColor }} />;
    case 'complete':
      return <div className={base} style={{ backgroundColor: '#22c55e', borderColor }} />;
    case 'error':
      return <div className={base} style={{ backgroundColor: '#ef4444', borderColor }} />;
    default:
      return <div className={base} style={{ backgroundColor: 'rgba(255,255,255,0.2)', borderColor }} />;
  }
}

// ==========================================
// Main Page — Version B: Collaborative Workflow
// ==========================================

export default function TeamStudioV2() {
  const [command, setCommand] = useState('');
  const [selectedAgent, setSelectedAgent] = useState<string | null>('xhs-agent');

  const selected = MOCK_AGENTS.find(a => a.id === selectedAgent);

  const handleSend = useCallback(() => {
    if (!command.trim()) return;
    setCommand('');
  }, [command]);

  return (
    <div className="h-full flex flex-col -m-6 overflow-hidden" style={{ background: '#030305' }}>
      {/* Header Bar */}
      <header className="shrink-0 flex items-center justify-between px-6 py-3 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)', background: 'rgba(5,5,8,0.8)' }}>
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-[#a78bfa]" />
          <h1 className="text-lg font-bold text-white">Team Studio</h1>
          <span className="text-[11px] px-2 py-0.5 rounded-full font-medium" style={{ background: 'rgba(167,139,250,0.12)', color: '#a78bfa' }}>
            Version B
          </span>
        </div>
        <div className="flex items-center gap-2 text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#22c55e]" />
            {MOCK_AGENTS.filter(a => a.status !== 'offline').length} Online
          </span>
        </div>
      </header>

      {/* Three-column layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Agent List */}
        <aside
          className="w-[220px] shrink-0 overflow-y-auto border-r flex flex-col"
          style={{ background: '#050508', borderColor: 'rgba(255,255,255,0.06)' }}
        >
          <div className="px-3 py-3">
            <span className="text-[11px] font-medium uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.3)' }}>
              Agent Team
            </span>
          </div>
          <div className="flex-1 px-2 space-y-0.5">
            {MOCK_AGENTS.map(agent => {
              const isSelected = selectedAgent === agent.id;
              return (
                <button
                  key={agent.id}
                  onClick={() => setSelectedAgent(isSelected ? null : agent.id)}
                  className="w-full flex items-center gap-3 px-3 py-3 rounded-xl cursor-pointer transition-all duration-200 text-left"
                  style={{
                    background: isSelected ? 'rgba(167,139,250,0.08)' : 'transparent',
                    borderLeft: isSelected ? `2px solid ${agent.color}` : '2px solid transparent',
                  }}
                >
                  <PixelAvatar initial={agent.initial} color={agent.color} size={28} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[13px] font-medium text-white truncate">{agent.label}</span>
                      <StatusDot status={agent.status} />
                    </div>
                    <p className="text-[11px] truncate" style={{
                      color: agent.status === 'running' ? '#fbbf24'
                        : agent.status === 'done' ? '#22c55e'
                        : 'rgba(255,255,255,0.3)',
                    }}>
                      {agent.currentTask || (agent.status === 'offline' ? '离线' : '空闲')}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </aside>

        {/* Middle: Task Timeline */}
        <div className="flex-1 overflow-y-auto" style={{ background: '#030305' }}>
          <div className="max-w-2xl mx-auto px-6 py-6">
            <div className="relative">
              {/* Timeline vertical line */}
              <div
                className="absolute left-[11px] top-0 bottom-0 w-px"
                style={{ background: 'rgba(255,255,255,0.06)' }}
              />

              {/* Events */}
              <div className="space-y-1">
                {MOCK_EVENTS.map(event => (
                  <div
                    key={event.id}
                    className="relative pl-8 pb-3"
                    style={{
                      opacity: selectedAgent && event.agentId !== selectedAgent && event.agentId !== 'user'
                        && event.targetAgentId !== selectedAgent ? 0.35 : 1,
                      transition: 'opacity 0.2s ease',
                    }}
                  >
                    <TimelineDot type={event.type} color={event.agentColor} />

                    {/* Time label */}
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-[11px] font-medium font-mono" style={{ color: 'rgba(255,255,255,0.25)' }}>
                        {event.time}
                      </span>
                      {event.type !== 'user-command' && (
                        <span className="text-[11px] font-medium" style={{ color: event.agentColor }}>
                          {event.agentLabel}
                        </span>
                      )}
                    </div>

                    {/* Event card */}
                    {event.type === 'user-command' ? (
                      <div
                        className="px-4 py-3 rounded-xl text-sm"
                        style={{
                          background: 'rgba(167,139,250,0.08)',
                          border: '1px solid rgba(167,139,250,0.15)',
                          color: 'rgba(255,255,255,0.9)',
                        }}
                      >
                        <div className="flex items-center gap-1.5 mb-1">
                          <MessageSquare size={12} style={{ color: '#a78bfa' }} />
                          <span className="text-[11px] font-medium" style={{ color: '#a78bfa' }}>用户指令</span>
                        </div>
                        {event.message}
                      </div>
                    ) : event.type === 'dispatch' ? (
                      <div
                        className="px-4 py-3 rounded-xl text-sm"
                        style={{
                          background: '#0a0a0f',
                          border: '1px solid rgba(255,255,255,0.08)',
                          borderLeft: `3px solid ${event.targetAgentColor || event.agentColor}`,
                        }}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <DispatchBadge
                            from={event.agentLabel}
                            to={event.targetAgentLabel || ''}
                            fromColor={event.agentColor}
                            toColor={event.targetAgentColor || '#fff'}
                          />
                        </div>
                        <span style={{ color: 'rgba(255,255,255,0.7)' }}>{event.message}</span>
                      </div>
                    ) : event.type === 'tool-call' ? (
                      <div className="flex items-center gap-2 text-xs">
                        <Wrench size={11} style={{ color: '#fbbf24' }} />
                        <span className="font-mono" style={{ color: '#fbbf24' }}>{event.message}</span>
                      </div>
                    ) : event.type === 'output' ? (
                      <div
                        className="px-4 py-3 rounded-xl text-sm"
                        style={{
                          background: '#0a0a0f',
                          border: '1px solid rgba(255,255,255,0.08)',
                          borderLeft: '3px solid #22c55e',
                        }}
                      >
                        <div className="flex items-center gap-1.5 mb-1">
                          <CheckCircle size={12} style={{ color: '#22c55e' }} />
                          <span className="text-[11px] font-medium" style={{ color: '#22c55e' }}>产出</span>
                        </div>
                        <p style={{ color: 'rgba(255,255,255,0.7)' }}>{event.message}</p>
                        {event.detail && (
                          <p className="text-[11px] mt-1" style={{ color: 'rgba(255,255,255,0.4)' }}>{event.detail}</p>
                        )}
                      </div>
                    ) : event.type === 'thinking' ? (
                      <p className="text-[13px]" style={{ color: 'rgba(255,255,255,0.4)' }}>
                        {event.message}
                      </p>
                    ) : event.type === 'error' ? (
                      <div
                        className="px-4 py-3 rounded-xl text-sm"
                        style={{
                          background: '#0a0a0f',
                          border: '1px solid rgba(255,255,255,0.08)',
                          borderLeft: '3px solid #ef4444',
                        }}
                      >
                        <div className="flex items-center gap-1.5 mb-1">
                          <AlertCircle size={12} style={{ color: '#ef4444' }} />
                          <span className="text-[11px] font-medium" style={{ color: '#ef4444' }}>错误</span>
                        </div>
                        <p style={{ color: 'rgba(255,255,255,0.7)' }}>{event.message}</p>
                      </div>
                    ) : null}
                  </div>
                ))}

                {/* Typing indicator */}
                <div className="relative pl-8 pb-4">
                  <div className="absolute left-[6px] top-3 w-2.5 h-2.5 rounded-full animate-pulse" style={{ backgroundColor: '#fbbf24', borderColor: '#030305', borderWidth: 2 }} />
                  <div className="flex items-center gap-1.5 pt-2">
                    <span className="text-[11px] font-medium" style={{ color: '#ff2442' }}>XHS</span>
                    <span className="text-[11px]" style={{ color: 'rgba(255,255,255,0.3)' }}>正在创作中</span>
                    <span className="flex gap-0.5">
                      <span className="w-1 h-1 rounded-full bg-white/30 animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-1 h-1 rounded-full bg-white/30 animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-1 h-1 rounded-full bg-white/30 animate-bounce" style={{ animationDelay: '300ms' }} />
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Detail Panel */}
        <aside
          className="w-[340px] shrink-0 border-l overflow-y-auto flex flex-col"
          style={{
            background: 'rgba(10,10,15,0.8)',
            backdropFilter: 'blur(24px)',
            borderColor: 'rgba(255,255,255,0.06)',
          }}
        >
          {selected ? (
            <>
              {/* Agent header */}
              <div className="px-5 py-5 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                <div className="flex items-center gap-3">
                  <PixelAvatar initial={selected.initial} color={selected.color} size={40} />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-base font-semibold text-white">{selected.labelCn}</span>
                      <StatusDot status={selected.status} />
                    </div>
                    <p className="text-[11px] mt-0.5" style={{
                      color: selected.status === 'running' ? '#fbbf24'
                        : selected.status === 'done' ? '#22c55e'
                        : 'rgba(255,255,255,0.3)',
                    }}>
                      {selected.status === 'running' ? '运行中' : selected.status === 'done' ? '已完成' : selected.status === 'idle' ? '空闲' : '离线'}
                    </p>
                  </div>
                </div>
                {selected.currentTask && (
                  <div className="mt-3 px-3 py-2 rounded-lg text-[13px]" style={{ background: 'rgba(255,255,255,0.03)', color: 'rgba(255,255,255,0.6)' }}>
                    当前任务: {selected.currentTask}
                  </div>
                )}
              </div>

              {/* Content stream */}
              <div className="flex-1 overflow-y-auto px-5 py-4">
                {selected.content ? (
                  <>
                    <div className="text-[11px] uppercase tracking-wider mb-3 font-medium" style={{ color: 'rgba(255,255,255,0.3)' }}>
                      实时产出
                    </div>
                    <div className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: 'rgba(255,255,255,0.8)' }}>
                      {selected.content}
                      {selected.status === 'running' && (
                        <span
                          className="inline-block w-1.5 h-4 ml-0.5 animate-pulse rounded-sm"
                          style={{ backgroundColor: selected.color }}
                        />
                      )}
                    </div>
                  </>
                ) : (
                  <div className="flex items-center justify-center h-32 text-sm" style={{ color: 'rgba(255,255,255,0.2)' }}>
                    暂无产出内容
                  </div>
                )}
              </div>

              {/* Tool calls section */}
              {selected.toolCalls && selected.toolCalls.length > 0 && (
                <div className="px-5 py-4 border-t" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                  <div className="text-[11px] uppercase tracking-wider mb-2 font-medium" style={{ color: 'rgba(255,255,255,0.3)' }}>
                    工具调用
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {selected.toolCalls.map(tc => (
                      <span
                        key={tc.tool}
                        className="inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded-md font-mono"
                        style={{ background: 'rgba(251,191,36,0.08)', color: '#fbbf24', border: '1px solid rgba(251,191,36,0.15)' }}
                      >
                        <Wrench size={10} />
                        {tc.tool} x{tc.count}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <div className="text-3xl mb-3 opacity-20">👈</div>
                <p className="text-sm" style={{ color: 'rgba(255,255,255,0.3)' }}>点击左侧 Agent 查看详情</p>
              </div>
            </div>
          )}
        </aside>
      </div>

      {/* Bottom Command Bar */}
      <div
        className="shrink-0 px-6 py-3 border-t"
        style={{
          background: 'rgba(10,10,15,0.95)',
          backdropFilter: 'blur(24px)',
          borderColor: 'rgba(255,255,255,0.06)',
        }}
      >
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          <span className="text-[#a78bfa] font-mono text-sm font-bold shrink-0">$</span>
          <input
            type="text"
            value={command}
            onChange={e => setCommand(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSend()}
            placeholder="输入你的营销需求..."
            className="flex-1 bg-transparent text-[14px] text-white placeholder:text-white/25 outline-none font-mono"
          />
          <button
            onClick={handleSend}
            className="p-2 rounded-lg transition-all duration-200 hover:bg-[rgba(167,139,250,0.15)]"
            style={{ color: '#a78bfa' }}
          >
            <Send size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
