'use client';

import { useState, useCallback } from 'react';
import { Send, ChevronUp, ChevronDown, Terminal, FileText } from 'lucide-react';

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
  content?: string;
}

const MOCK_AGENTS: Agent[] = [
  { id: 'ceo', label: 'CEO', labelCn: 'CEO 营销总监', color: '#e74c3c', initial: 'CEO', status: 'running', currentTask: '正在调度子 Agent...', progress: 60, content: '## 任务分析\n\n收到用户需求：「帮我写一篇小红书种草笔记」\n\n### 调度计划\n1. Growth Agent → 选题研究\n2. XHS Agent → 内容创作\n3. Brand Reviewer → 质量审查' },
  { id: 'xhs-agent', label: 'XHS', labelCn: '小红书创作专家', color: '#ff2442', initial: 'XHS', status: 'running', currentTask: '撰写种草笔记', progress: 45, content: '# 🌟 这款面膜真的绝了！干皮姐妹冲！\n\n姐妹们！！今天必须给你们安利这款宝藏面膜 ✨\n\n用了一周，皮肤状态直接起飞 🚀\n\n## 使用感受\n- 质地：奶油般丝滑\n- 吸收：3分钟就能感觉到...\n\n▌' },
  { id: 'analyst-agent', label: 'Analyst', labelCn: '数据分析专家', color: '#22d3ee', initial: 'AN', status: 'idle', progress: 0 },
  { id: 'growth-agent', label: 'Growth', labelCn: '增长营销专家', color: '#00cec9', initial: 'G', status: 'done', currentTask: '选题分析完成', progress: 100, content: '## 选题分析报告\n\n### 推荐选题方向\n1. 干皮护肤 — 搜索热度 ↑45%\n2. 平价面膜测评 — 竞品少\n3. 换季护肤 — 时令热点\n\n### 建议标签\n#面膜测评 #干皮救星 #护肤分享' },
  { id: 'brand-reviewer', label: 'Reviewer', labelCn: '品牌风控审查', color: '#a855f7', initial: 'BR', status: 'idle', currentTask: '等待内容审查', progress: 0 },
  { id: 'podcast-agent', label: 'Podcast', labelCn: '播客内容专家', color: '#f59e0b', initial: 'POD', status: 'offline', progress: 0 },
  { id: 'x-twitter-agent', label: 'X/Twitter', labelCn: 'X/Twitter 专家', color: '#1da1f2', initial: 'X', status: 'offline', progress: 0 },
  { id: 'visual-gen-agent', label: 'Visual', labelCn: '视觉设计专家', color: '#ec4899', initial: 'VIS', status: 'offline', progress: 0 },
  { id: 'strategist-agent', label: 'Strategist', labelCn: '策略规划专家', color: '#8b5cf6', initial: 'STR', status: 'offline', progress: 0 },
];

interface LogEntry {
  id: string;
  time: string;
  agentId: string;
  agentLabel: string;
  agentColor: string;
  message: string;
  type: 'info' | 'tool' | 'dispatch' | 'result' | 'error';
}

const MOCK_LOGS: LogEntry[] = [
  { id: '1', time: '14:30:02', agentId: 'ceo', agentLabel: 'CEO', agentColor: '#e74c3c', message: '收到用户需求：帮我写一篇小红书种草笔记', type: 'info' },
  { id: '2', time: '14:30:05', agentId: 'ceo', agentLabel: 'CEO', agentColor: '#e74c3c', message: '分析需求完成，开始调度子 Agent', type: 'info' },
  { id: '3', time: '14:30:08', agentId: 'ceo', agentLabel: 'CEO', agentColor: '#e74c3c', message: '→ Growth Agent: 进行选题研究', type: 'dispatch' },
  { id: '4', time: '14:30:10', agentId: 'growth-agent', agentLabel: 'Growth', agentColor: '#00cec9', message: '开始选题分析...', type: 'info' },
  { id: '5', time: '14:30:15', agentId: 'growth-agent', agentLabel: 'Growth', agentColor: '#00cec9', message: '⚙ 使用工具: WebSearch("小红书 面膜 热门话题")', type: 'tool' },
  { id: '6', time: '14:30:28', agentId: 'growth-agent', agentLabel: 'Growth', agentColor: '#00cec9', message: '✓ 选题分析完成，输出 3 个推荐方向', type: 'result' },
  { id: '7', time: '14:30:30', agentId: 'ceo', agentLabel: 'CEO', agentColor: '#e74c3c', message: '→ XHS Agent: 按选题方向 #1 创作笔记', type: 'dispatch' },
  { id: '8', time: '14:30:32', agentId: 'xhs-agent', agentLabel: 'XHS', agentColor: '#ff2442', message: '开始撰写种草笔记...', type: 'info' },
  { id: '9', time: '14:30:40', agentId: 'xhs-agent', agentLabel: 'XHS', agentColor: '#ff2442', message: '⚙ 使用工具: Read("brand-guidelines.md")', type: 'tool' },
  { id: '10', time: '14:30:55', agentId: 'xhs-agent', agentLabel: 'XHS', agentColor: '#ff2442', message: '正在撰写正文内容...', type: 'info' },
  { id: '11', time: '14:31:02', agentId: 'ceo', agentLabel: 'CEO', agentColor: '#e74c3c', message: '→ Brand Reviewer: 待命，等待 XHS 完成后审查', type: 'dispatch' },
];

// ==========================================
// Sub-components
// ==========================================

function StatusDot({ status, color }: { status: AgentStatus; color: string }) {
  const baseClass = 'w-2.5 h-2.5 rounded-full shrink-0';
  switch (status) {
    case 'running':
      return (
        <span className="relative">
          <span className={`${baseClass} animate-pulse`} style={{ backgroundColor: '#fbbf24' }} />
          <span className="absolute inset-0 rounded-full animate-ping opacity-30" style={{ backgroundColor: '#fbbf24' }} />
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

function StatusLabel({ status }: { status: AgentStatus }) {
  const labels: Record<AgentStatus, string> = {
    running: '运行中',
    idle: '空闲',
    done: '已完成',
    error: '错误',
    offline: '离线',
  };
  const colors: Record<AgentStatus, string> = {
    running: '#fbbf24',
    idle: 'rgba(255,255,255,0.4)',
    done: '#22c55e',
    error: '#ef4444',
    offline: 'rgba(255,255,255,0.2)',
  };
  return (
    <span className="text-[11px] font-medium" style={{ color: colors[status] }}>
      {labels[status]}
    </span>
  );
}

function ProgressBar({ progress, status, color }: { progress: number; status: AgentStatus; color: string }) {
  if (status === 'offline' || (status === 'idle' && progress === 0)) return null;
  const barColor = status === 'done' ? '#22c55e' : status === 'error' ? '#ef4444' : color;
  return (
    <div className="w-full h-1 rounded-full mt-2" style={{ backgroundColor: 'rgba(255,255,255,0.06)' }}>
      <div
        className="h-full rounded-full transition-all duration-500"
        style={{
          width: `${progress}%`,
          backgroundColor: barColor,
          ...(status === 'running' ? {
            backgroundImage: `linear-gradient(90deg, ${barColor}, ${barColor}88, ${barColor})`,
            backgroundSize: '200% 100%',
            animation: 'monitor-progress 2s ease infinite',
          } : {}),
        }}
      />
    </div>
  );
}

function PixelAvatar({ initial, color, size = 36 }: { initial: string; color: string; size?: number }) {
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

// ==========================================
// SVG Dispatch Lines
// ==========================================

function DispatchLines({ ceoAgent, agents, selectedId }: { ceoAgent: Agent; agents: Agent[]; selectedId: string | null }) {
  const dispatchedIds = ['xhs-agent', 'growth-agent', 'brand-reviewer'];

  return (
    <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 0 }}>
      <defs>
        {agents.filter(a => dispatchedIds.includes(a.id)).map((agent, i) => (
          <linearGradient key={agent.id} id={`grad-${agent.id}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={ceoAgent.color} stopOpacity="0.6" />
            <stop offset="100%" stopColor={agent.color} stopOpacity="0.6" />
          </linearGradient>
        ))}
      </defs>
      {agents.filter(a => dispatchedIds.includes(a.id)).map((agent, i) => {
        const isActive = agent.status === 'running' || agent.status === 'done';
        const xStart = 50;
        const yStart = 0;
        const positions = [25, 50, 75];
        const xEnd = positions[i] ?? 50;
        const yEnd = 100;
        return (
          <g key={agent.id}>
            <path
              d={`M ${xStart}% ${yStart}% Q ${xStart}% 50% ${xEnd}% ${yEnd}%`}
              fill="none"
              stroke={isActive ? agent.color : 'rgba(255,255,255,0.08)'}
              strokeWidth={isActive ? 1.5 : 1}
              strokeDasharray={isActive ? '6 4' : '4 4'}
              opacity={isActive ? 0.6 : 0.15}
              style={isActive ? {
                animation: 'dash-flow 1.5s linear infinite',
              } : {}}
            />
          </g>
        );
      })}
      <style>{`
        @keyframes dash-flow {
          to { stroke-dashoffset: -20px; }
        }
      `}</style>
    </svg>
  );
}

// ==========================================
// Main Page — Version A: Dashboard Monitor
// ==========================================

export default function TeamStudioV1() {
  const [command, setCommand] = useState('');
  const [selectedAgent, setSelectedAgent] = useState<string | null>('xhs-agent');
  const [panelOpen, setPanelOpen] = useState(true);
  const [panelTab, setPanelTab] = useState<'terminal' | 'output'>('terminal');

  const ceoAgent = MOCK_AGENTS[0];
  const subAgents = MOCK_AGENTS.slice(1);
  const selected = MOCK_AGENTS.find(a => a.id === selectedAgent);
  const dispatchedAgents = MOCK_AGENTS.filter(a => ['xhs-agent', 'growth-agent', 'brand-reviewer'].includes(a.id));

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
            Version A
          </span>
        </div>
        <div className="flex items-center gap-2 text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#22c55e]" />
            {MOCK_AGENTS.filter(a => a.status !== 'offline').length} Agents Online
          </span>
        </div>
      </header>

      {/* Main scrollable area */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
          {/* Hero Command Bar */}
          <div className="relative mx-auto max-w-3xl">
            <div
              className="flex items-center gap-3 px-6 py-4 rounded-2xl transition-all duration-300"
              style={{
                background: '#0a0a0f',
                border: '1px solid rgba(167,139,250,0.2)',
                boxShadow: '0 0 30px rgba(167,139,250,0.08)',
              }}
            >
              <span className="text-[#a78bfa] font-mono text-lg font-bold shrink-0">$</span>
              <input
                type="text"
                value={command}
                onChange={e => setCommand(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSend()}
                placeholder="输入你的营销需求，CEO 将自动拆解并调度团队执行..."
                className="flex-1 bg-transparent text-[15px] text-white placeholder:text-white/30 outline-none font-mono"
              />
              <button
                onClick={handleSend}
                className="p-2 rounded-xl transition-all duration-200 hover:bg-[rgba(167,139,250,0.15)]"
                style={{ color: '#a78bfa' }}
              >
                <Send size={18} />
              </button>
            </div>
          </div>

          {/* CEO Core Card */}
          <div
            className="relative p-6 rounded-2xl transition-all duration-300"
            style={{
              background: ceoAgent.status === 'running'
                ? 'radial-gradient(ellipse at 50% 30%, rgba(231,76,60,0.06), #0a0a0f 70%)'
                : '#0a0a0f',
              border: '1px solid rgba(255,255,255,0.08)',
              borderTop: `3px solid ${ceoAgent.color}`,
            }}
          >
            <div className="flex items-center gap-4">
              <PixelAvatar initial={ceoAgent.initial} color={ceoAgent.color} size={48} />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-[15px] font-semibold text-white">{ceoAgent.labelCn}</span>
                  <StatusDot status={ceoAgent.status} color={ceoAgent.color} />
                  <StatusLabel status={ceoAgent.status} />
                </div>
                <p className="text-[13px] mt-1" style={{ color: 'rgba(255,255,255,0.5)' }}>
                  {ceoAgent.currentTask}
                </p>
              </div>
              <div className="flex items-center gap-2 text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>
                <span>已调度:</span>
                {dispatchedAgents.map(a => (
                  <span key={a.id} className="px-1.5 py-0.5 rounded" style={{ background: `${a.color}15`, color: a.color, fontSize: 11 }}>
                    {a.label}
                  </span>
                ))}
              </div>
            </div>
            <ProgressBar progress={ceoAgent.progress} status={ceoAgent.status} color={ceoAgent.color} />
          </div>

          {/* Dispatch Lines Zone */}
          <div className="relative h-12">
            <DispatchLines ceoAgent={ceoAgent} agents={subAgents.slice(0, 3)} selectedId={selectedAgent} />
          </div>

          {/* Sub Agent Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {subAgents.map(agent => {
              const isSelected = selectedAgent === agent.id;
              const isRunning = agent.status === 'running';
              return (
                <button
                  key={agent.id}
                  onClick={() => setSelectedAgent(isSelected ? null : agent.id)}
                  className="text-left p-4 rounded-xl transition-all duration-300 min-h-[140px] flex flex-col"
                  style={{
                    background: isSelected
                      ? `radial-gradient(ellipse at 50% 0%, ${agent.color}08, #0a0a0f 70%)`
                      : '#0a0a0f',
                    border: isSelected
                      ? `1px solid ${agent.color}40`
                      : '1px solid rgba(255,255,255,0.08)',
                    borderTop: `3px solid ${agent.color}`,
                    ...(isRunning ? {
                      boxShadow: `0 0 20px ${agent.color}10`,
                    } : {}),
                  }}
                >
                  <div className="flex items-center gap-2.5">
                    <PixelAvatar initial={agent.initial} color={agent.color} size={32} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[13px] font-semibold text-white truncate">{agent.label}</span>
                        <StatusDot status={agent.status} color={agent.color} />
                      </div>
                      <StatusLabel status={agent.status} />
                    </div>
                  </div>
                  {agent.currentTask && (
                    <p className="text-[11px] mt-2 leading-relaxed truncate" style={{ color: 'rgba(255,255,255,0.4)' }}>
                      {agent.currentTask}
                    </p>
                  )}
                  <div className="mt-auto">
                    <ProgressBar progress={agent.progress} status={agent.status} color={agent.color} />
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Bottom Panel */}
      <div
        className="shrink-0 border-t transition-all duration-300"
        style={{
          borderColor: 'rgba(255,255,255,0.06)',
          background: 'rgba(10,10,15,0.95)',
          backdropFilter: 'blur(24px)',
          height: panelOpen ? 240 : 40,
        }}
      >
        {/* Panel header / toggle */}
        <button
          onClick={() => setPanelOpen(!panelOpen)}
          className="w-full flex items-center justify-between px-4 py-2 text-xs cursor-pointer"
          style={{ color: 'rgba(255,255,255,0.5)' }}
        >
          <div className="flex items-center gap-4">
            <button
              onClick={e => { e.stopPropagation(); setPanelTab('terminal'); }}
              className={`flex items-center gap-1.5 px-2 py-1 rounded transition-colors ${panelTab === 'terminal' ? 'text-white' : ''}`}
              style={panelTab === 'terminal' ? { background: 'rgba(255,255,255,0.06)' } : {}}
            >
              <Terminal size={12} />
              Terminal
              <span className="ml-1 px-1.5 py-0 rounded text-[10px]" style={{ background: 'rgba(255,255,255,0.06)' }}>
                {MOCK_LOGS.length}
              </span>
            </button>
            <button
              onClick={e => { e.stopPropagation(); setPanelTab('output'); }}
              className={`flex items-center gap-1.5 px-2 py-1 rounded transition-colors ${panelTab === 'output' ? 'text-white' : ''}`}
              style={panelTab === 'output' ? { background: 'rgba(255,255,255,0.06)' } : {}}
            >
              <FileText size={12} />
              {selected ? selected.label + ' 产出' : 'Agent 产出'}
            </button>
          </div>
          {panelOpen ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
        </button>

        {/* Panel content */}
        {panelOpen && (
          <div className="flex h-[calc(100%-36px)] overflow-hidden">
            {panelTab === 'terminal' ? (
              <div className="flex-1 overflow-y-auto px-4 py-2 font-mono text-xs leading-relaxed">
                {MOCK_LOGS.map(log => (
                  <div key={log.id} className="flex items-start gap-2 py-[3px]" style={{
                    borderLeft: log.type === 'dispatch' ? `2px solid ${log.agentColor}` : undefined,
                    paddingLeft: log.type === 'dispatch' ? 8 : undefined,
                  }}>
                    <span style={{ color: 'rgba(255,255,255,0.25)' }}>{log.time}</span>
                    <span className="font-semibold shrink-0" style={{ color: log.agentColor }}>[{log.agentLabel}]</span>
                    <span style={{
                      color: log.type === 'tool' ? '#fbbf24'
                        : log.type === 'result' ? '#22c55e'
                        : log.type === 'error' ? '#ef4444'
                        : 'rgba(255,255,255,0.6)',
                    }}>
                      {log.message}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto px-6 py-3">
                {selected?.content ? (
                  <div className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: 'rgba(255,255,255,0.8)' }}>
                    {selected.content}
                    {selected.status === 'running' && (
                      <span className="inline-block w-1.5 h-4 ml-0.5 animate-pulse" style={{ backgroundColor: selected.color }} />
                    )}
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full text-sm" style={{ color: 'rgba(255,255,255,0.2)' }}>
                    {selectedAgent ? '该 Agent 暂无产出内容' : '点击 Agent 卡片查看产出'}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
