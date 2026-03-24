/**
 * 营销团队 Agent 配置
 * 用于 Team Studio 的 Monitor 视图显示
 * 与 agent-chat 后端的心理学家团队无关，这里定义的是营销团队 UI 展示
 */

import type { MonitorAgent } from '@/components/features/agent-monitor/types';

export interface MarketingAgentDef {
  id: string;
  name: string;
  nameEn: string;
  role: string;
  color: string;
  avatar: string;
  bio: string;
  capabilities: string[];
  level: 'Orchestrator' | 'Specialist' | 'Reviewer';
  systemPrompt: string;
}

export const MARKETING_AGENTS: MarketingAgentDef[] = [
  {
    id: 'ceo',
    name: 'CEO 营销总监',
    nameEn: 'CEO',
    role: '营销团队总指挥，负责需求拆解、子 Agent 调度与质量终审',
    color: '#e74c3c',
    avatar: '👔',
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
    name: '小红书创作专家',
    nameEn: 'XHS',
    role: '顶级小红书内容创作者，按 SOP 产出高质量种草笔记',
    color: '#ff2442',
    avatar: '📝',
    bio: '顶级小红书内容创作者，按 SOP 产出高质量种草笔记',
    capabilities: ['爆款标题', '种草文案', 'CTA 设计', '标签策略', '配图建议'],
    level: 'Specialist',
    systemPrompt: `你是一位顶级小红书营销内容创作专家。
按 SOP 撰写内容（标题→正文→CTA→标签→配图建议），直接输出笔记内容。用中文创作。`,
  },
  {
    id: 'growth-agent',
    name: '增长营销专家',
    nameEn: 'Growth',
    role: '增长黑客，精通选题研究、热点捕捉与数据驱动的发布策略',
    color: '#00cec9',
    avatar: '📊',
    bio: '增长黑客，精通选题研究、热点捕捉与数据驱动的发布策略',
    capabilities: ['选题研究', '热点捕捉', '竞品分析', '发布策略', '数据复盘'],
    level: 'Specialist',
    systemPrompt: `你是一位增长营销专家，精通小红书平台运营。
负责选题研究、热点捕捉、竞品爆款分析、发布时间策略、数据复盘。
接地气，用真实案例和数据说话。给出可立即执行的选题方案。中文沟通。`,
  },
  {
    id: 'brand-reviewer',
    name: '品牌风控审查',
    nameEn: 'Reviewer',
    role: '品牌守护者，逐项审查内容合规性与品牌调性一致性',
    color: '#a855f7',
    avatar: '🛡️',
    bio: '品牌守护者，逐项审查内容合规性与品牌调性一致性',
    capabilities: ['文案审查', '调性检测', '敏感词过滤', '合规校验', '风险评估'],
    level: 'Reviewer',
    systemPrompt: `你是品牌风控审查专家。
审查范围：文案内容、品牌调性一致性、配图建议、敏感词/风险内容、平台合规性。
对照品牌调性和受众画像逐项检查，输出审查报告（通过/需修改/拒绝 + 修改建议）。中文沟通。`,
  },
];

/** 营销团队 Agent IDs */
export const MARKETING_AGENT_IDS = MARKETING_AGENTS.map(a => a.id);

/** 将营销团队 Agent 转换为 MonitorAgent 格式 */
export function toMonitorAgents(status: 'online' | 'offline' = 'offline'): MonitorAgent[] {
  return MARKETING_AGENTS.map(a => ({
    id: a.id,
    name: a.name,
    nameEn: a.nameEn,
    role: a.role,
    color: a.color,
    avatar: a.avatar,
    status,
    currentTool: undefined,
    toolCallCount: 0,
  }));
}
