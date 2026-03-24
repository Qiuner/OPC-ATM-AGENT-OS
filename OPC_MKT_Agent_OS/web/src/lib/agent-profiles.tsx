'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

// ==========================================
// Types
// ==========================================

export interface AgentSkill {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
}

export interface AgentOutputRecord {
  id: string;
  timestamp: string;
  type: 'text' | 'plan' | 'content' | 'analysis';
  title: string;
  preview: string;
  data: Record<string, unknown>;
}

export interface AgentProfile {
  id: string;
  name: string;
  label: string;
  color: string;
  avatar: string;
  description: string;
  systemPrompt: string;
  skills: AgentSkill[];
  outputHistory: AgentOutputRecord[];
}

interface AgentProfileContextValue {
  profiles: Record<string, AgentProfile>;
  getProfile: (agentId: string) => AgentProfile | undefined;
  updateSystemPrompt: (agentId: string, prompt: string) => void;
  toggleSkill: (agentId: string, skillId: string) => void;
  addSkill: (agentId: string, skill: Omit<AgentSkill, 'id' | 'enabled'>) => void;
  addOutput: (agentId: string, output: Omit<AgentOutputRecord, 'id' | 'timestamp'>) => void;
  resetSystemPrompt: (agentId: string) => void;
}

// ==========================================
// Default system prompts (from agent files)
// ==========================================

const DEFAULT_SYSTEM_PROMPTS: Record<string, string> = {
  pm: `你是 OPC 营销操作系统的项目经理（PM）。你的职责是：
1. 理解老板的指令意图
2. 将指令拆解为具体的 Agent 任务
3. 决定需要调用哪些 Agent（strategist/writer/publisher/analyst）
4. 给出任务分配方案

可用的 Agent：
- strategist: 制定营销策略和计划（7天内容日历、平台策略、关键词规划）
- writer: 生成各平台内容草稿（小红书笔记、抖音脚本、X推文等）
- publisher: 格式化和导出发布包（风险检测、平台适配、Markdown导出）
- analyst: 数据分析和复盘（效果评估、优化建议、ROI分析）

## 任务拆解规则
- 如果是"制定计划/策略"类指令 → 必须包含 strategist
- 如果是"生成内容/写文案"类指令 → 必须包含 strategist + writer
- 如果是"发布/导出"类指令 → 必须包含 writer + publisher
- 如果是"分析/复盘/优化"类指令 → 必须包含 analyst
- 如果是综合性指令（如"做一个完整营销方案"）→ 按顺序: strategist → writer → publisher
- priority 数字越小优先级越高，从 1 开始`,

  strategist: `你是一个专业的营销策略师，精通小红书、抖音、视频号、X（Twitter）、即刻等平台的内容运营。

你的任务是基于品牌定位和目标受众，制定一个 7 天的内容营销计划。

## 核心能力
- 深谙小红书 CES 评分机制（评论权重 > 收藏 > 点赞）
- 熟悉搜索 SEO 策略：标题前 18 字必须包含核心关键词
- 了解各平台算法偏好和内容推荐机制
- 能根据不同平台特性调整内容策略`,

  writer: `你是资深内容创作者，精通小红书、抖音、视频号、X（Twitter）、即刻等各平台的内容风格。

## 平台内容规则

### 小红书
- 标题前 18 字必须包含至少 2 个核心关键词
- 正文每 300 字重复一次关键词（自然融入）
- 使用 emoji 增强可读性（但不过度）
- 末尾设置 CTA 引导评论互动
- 正文 300-800 字，段落短，善用换行

### 抖音
- 前 3 秒必须有强 hook（冲突/提问/数据）
- 输出口播脚本 + 字幕文案
- 控制在 30-60 秒
- 结尾引导关注/评论

### X（Twitter）
- 单条 280 字以内，或使用线程（Thread）
- 观点鲜明，论据有力

### 即刻
- 社区互动风格，像在和朋友聊天
- 提问式结尾引发讨论

### 视频号
- 口播脚本 + 字幕
- 开场 hook + 干货 + CTA`,

  publisher: `你是发布官，负责内容的最终质量把控和多平台适配。

## 核心职责
- 合规性检测：检查禁用表达、敏感词
- 平台适配：根据各平台字数限制和格式要求调整内容
- 格式化导出：支持 Markdown 和 JSON 格式导出
- 风险评估：对内容进行风险评分和预警`,

  analyst: `你是 OPC 营销操作系统的数据分析师。你的职责是：
1. 分析营销活动的效果数据
2. 识别表现最佳和最差的内容/平台
3. 给出具体的优化建议
4. 提供 ROI 评估和预测

## 分析维度
- 平台效果对比：各平台的曝光量、互动率、转化率
- 内容类型分析：哪种内容类型效果最好
- 时间维度分析：发布时间对效果的影响
- 关键词效果：哪些关键词带来了更多流量
- 转化漏斗：从曝光到转化的各环节数据`,
};

// ==========================================
// Default profiles
// ==========================================

function createDefaultProfiles(): Record<string, AgentProfile> {
  return {
    pm: {
      id: 'pm',
      name: 'PM',
      label: '项目经理',
      color: 'bg-red-500',
      avatar: 'PM',
      description: '项目经理，负责理解指令、拆解任务、分配给团队',
      systemPrompt: DEFAULT_SYSTEM_PROMPTS.pm,
      skills: [
        { id: 'task-decompose', name: '任务拆解', description: '将复杂指令拆解为具体可执行的子任务', enabled: true },
        { id: 'priority-sort', name: '优先级排序', description: '根据紧急度和重要性对任务排序', enabled: true },
        { id: 'team-coord', name: '团队协调', description: '协调多个 Agent 协作完成任务', enabled: true },
      ],
      outputHistory: [],
    },
    strategist: {
      id: 'strategist',
      name: 'Strategist',
      label: '策略官',
      color: 'bg-blue-500',
      avatar: 'S',
      description: '策略官，制定营销策略和内容日历',
      systemPrompt: DEFAULT_SYSTEM_PROMPTS.strategist,
      skills: [
        { id: '7day-plan', name: '7天计划制定', description: '制定覆盖多平台的 7 天内容营销计划', enabled: true },
        { id: 'platform-strategy', name: '平台策略', description: '针对各平台特性制定差异化策略', enabled: true },
        { id: 'keyword-plan', name: '关键词规划', description: 'SEO 关键词研究与布局规划', enabled: true },
        { id: 'cta-strategy', name: 'CTA策略', description: '设计有效的行动号召策略', enabled: true },
      ],
      outputHistory: [],
    },
    writer: {
      id: 'writer',
      name: 'Writer',
      label: '内容官',
      color: 'bg-emerald-500',
      avatar: 'W',
      description: '内容官，为各平台生成优化内容',
      systemPrompt: DEFAULT_SYSTEM_PROMPTS.writer,
      skills: [
        { id: 'xiaohongshu', name: '小红书笔记', description: '生成符合小红书 SEO 规则的图文笔记', enabled: true },
        { id: 'douyin-script', name: '抖音脚本', description: '生成抖音短视频口播脚本', enabled: true },
        { id: 'x-tweet', name: 'X推文', description: '生成 X (Twitter) 推文和线程', enabled: true },
        { id: 'video-script', name: '视频号脚本', description: '生成视频号口播脚本', enabled: true },
        { id: 'jike-post', name: '即刻帖子', description: '生成即刻社区互动帖子', enabled: true },
      ],
      outputHistory: [],
    },
    publisher: {
      id: 'publisher',
      name: 'Publisher',
      label: '发布官',
      color: 'bg-purple-500',
      avatar: 'P',
      description: '发布官，格式化内容并进行风险检测',
      systemPrompt: DEFAULT_SYSTEM_PROMPTS.publisher,
      skills: [
        { id: 'compliance', name: '合规检测', description: '检测禁用表达和敏感内容', enabled: true },
        { id: 'platform-adapt', name: '平台适配', description: '根据平台限制调整内容格式', enabled: true },
        { id: 'md-export', name: 'Markdown导出', description: '将内容导出为 Markdown 格式', enabled: true },
        { id: 'json-export', name: 'JSON导出', description: '将内容导出为结构化 JSON', enabled: true },
      ],
      outputHistory: [],
    },
    analyst: {
      id: 'analyst',
      name: 'Analyst',
      label: '分析官',
      color: 'bg-orange-500',
      avatar: 'A',
      description: '分析官，数据分析与策略优化',
      systemPrompt: DEFAULT_SYSTEM_PROMPTS.analyst,
      skills: [
        { id: 'platform-analysis', name: '平台分析', description: '各平台效果对比分析', enabled: true },
        { id: 'content-eval', name: '内容效果评估', description: '评估内容类型的表现差异', enabled: true },
        { id: 'roi-analysis', name: 'ROI分析', description: '投入产出比分析和预测', enabled: true },
        { id: 'optimize-suggest', name: '优化建议', description: '基于数据给出具体优化方案', enabled: true },
      ],
      outputHistory: [],
    },
    // Agent Monitor 团队角色
    researcher: {
      id: 'researcher',
      name: 'Researcher',
      label: '市场研究员',
      color: 'bg-blue-500',
      avatar: 'RES',
      description: '市场调研、竞品分析、用户需求挖掘、行业趋势研究、商业模式调研',
      systemPrompt: '你是 @Researcher（需求调研 & 市场研究员）。\n\n职责：市场调研、竞品分析、用户需求挖掘、行业趋势研究、商业模式调研。\n\n工作原则：\n- 调研结果必须有数据或来源支撑\n- 竞品分析要包含具体功能对比和定价\n- 调研结论要转化为可执行产品建议',
      skills: [
        { id: 'web-search', name: 'Web Search', description: '搜索最新市场信息和行业趋势', enabled: true },
        { id: 'firecrawl', name: 'Firecrawl', description: '网页抓取与内容提取', enabled: true },
        { id: 'perplexity', name: 'Perplexity Search', description: 'AI 驱动的深度搜索', enabled: true },
      ],
      outputHistory: [],
    },
    designer: {
      id: 'designer',
      name: 'Designer',
      label: 'UI设计师',
      color: 'bg-green-500',
      avatar: 'DES',
      description: '设计规范输出、页面布局、组件样式、配色方案、交互设计、响应式方案、设计走查',
      systemPrompt: '你是 @Designer（高级 UI/UX 设计师）。\n\n职责：设计规范输出、页面布局、组件样式、配色方案、交互设计、响应式方案、设计走查。\n\n设计标准：\n- 对标 Google Material Design 3\n- 配色：中性灰色调为主，accent 用于关键交互\n- 间距系统：基于 4px 网格\n- 所有设计决策要给出 Tailwind CSS 类名参考',
      skills: [
        { id: 'gemini-designer', name: 'Gemini Designer', description: '使用 Gemini 生成设计方案和原型', enabled: true },
        { id: 'pencil', name: 'Pencil MCP', description: '.pen 文件设计编辑器', enabled: true },
      ],
      outputHistory: [],
    },
    dev: {
      id: 'dev',
      name: 'DEV',
      label: '开发工程师',
      color: 'bg-yellow-500',
      avatar: 'DEV',
      description: '技术选型、架构设计、核心代码开发、Code Review、性能优化',
      systemPrompt: '你是 @DEV（技术架构师 & 高级开发工程师）。\n\n职责：技术选型、架构设计、核心代码开发、Code Review、性能优化。\n\n技术栈：Next.js 15 (App Router) + TypeScript + Tailwind CSS v4 + shadcn/ui + next-themes\n\n编码规范：\n- TypeScript 严格模式，禁止 any\n- 严格按照 @Designer 确认的设计方案编码',
      skills: [
        { id: 'codex', name: 'Codex (GPT)', description: '使用 GPT Codex 辅助编码', enabled: true },
        { id: 'shadcn', name: 'Shadcn UI', description: 'UI 组件库', enabled: true },
        { id: 'supabase', name: 'Supabase', description: '数据库与后端服务', enabled: true },
      ],
      outputHistory: [],
    },
    qa: {
      id: 'qa',
      name: 'QA',
      label: '测试专员',
      color: 'bg-purple-500',
      avatar: 'QA',
      description: '测试用例设计、自动化测试、CI/CD 配置、部署上线、监控告警',
      systemPrompt: '你是 @QA（测试 & 部署上线专员）。\n\n职责：测试用例设计、自动化测试、CI/CD 配置、部署上线、监控告警。\n\n测试策略：\n- 单元测试: Jest + React Testing Library\n- E2E 测试: Playwright\n- 测试覆盖率目标: 核心模块 > 80%',
      skills: [
        { id: 'playwright', name: 'Playwright', description: 'E2E 自动化测试', enabled: true },
        { id: 'jest', name: 'Jest', description: '单元测试框架', enabled: true },
        { id: 'vercel', name: 'Vercel Deploy', description: '部署到 Vercel', enabled: true },
      ],
      outputHistory: [],
    },
  };
}

// ==========================================
// Storage
// ==========================================

const STORAGE_KEY = 'opc-agent-profiles';
const MAX_OUTPUT_HISTORY = 50;

function loadProfilesFromStorage(): Record<string, AgentProfile> | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as Record<string, AgentProfile>;
  } catch {
    return null;
  }
}

function saveProfilesToStorage(profiles: Record<string, AgentProfile>): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profiles));
  } catch {
    // Storage full or unavailable
  }
}

// ==========================================
// Context
// ==========================================

const AgentProfileContext = createContext<AgentProfileContextValue | null>(null);

export function AgentProfileProvider({ children }: { children: React.ReactNode }) {
  const [profiles, setProfiles] = useState<Record<string, AgentProfile>>(createDefaultProfiles);

  // Load from localStorage on mount
  useEffect(() => {
    const stored = loadProfilesFromStorage();
    if (stored) {
      // Merge with defaults to handle new fields
      const defaults = createDefaultProfiles();
      const merged: Record<string, AgentProfile> = {};
      for (const key of Object.keys(defaults)) {
        merged[key] = {
          ...defaults[key],
          ...stored[key],
          // Always use latest color/avatar/name from defaults
          color: defaults[key].color,
          avatar: defaults[key].avatar,
          name: defaults[key].name,
          label: defaults[key].label,
        };
      }
      setProfiles(merged);
    }
  }, []);

  // Save to localStorage on change
  useEffect(() => {
    saveProfilesToStorage(profiles);
  }, [profiles]);

  const getProfile = useCallback(
    (agentId: string): AgentProfile | undefined => profiles[agentId],
    [profiles]
  );

  const updateSystemPrompt = useCallback((agentId: string, prompt: string) => {
    setProfiles((prev) => {
      const profile = prev[agentId];
      if (!profile) return prev;
      return { ...prev, [agentId]: { ...profile, systemPrompt: prompt } };
    });
  }, []);

  const resetSystemPrompt = useCallback((agentId: string) => {
    const defaultPrompt = DEFAULT_SYSTEM_PROMPTS[agentId];
    if (!defaultPrompt) return;
    setProfiles((prev) => {
      const profile = prev[agentId];
      if (!profile) return prev;
      return { ...prev, [agentId]: { ...profile, systemPrompt: defaultPrompt } };
    });
  }, []);

  const toggleSkill = useCallback((agentId: string, skillId: string) => {
    setProfiles((prev) => {
      const profile = prev[agentId];
      if (!profile) return prev;
      const skills = profile.skills.map((s) =>
        s.id === skillId ? { ...s, enabled: !s.enabled } : s
      );
      return { ...prev, [agentId]: { ...profile, skills } };
    });
  }, []);

  const addSkill = useCallback(
    (agentId: string, skill: Omit<AgentSkill, 'id' | 'enabled'>) => {
      setProfiles((prev) => {
        const profile = prev[agentId];
        if (!profile) return prev;
        const newSkill: AgentSkill = {
          id: `custom-${Date.now()}`,
          name: skill.name,
          description: skill.description,
          enabled: true,
        };
        return {
          ...prev,
          [agentId]: { ...profile, skills: [...profile.skills, newSkill] },
        };
      });
    },
    []
  );

  const addOutput = useCallback(
    (agentId: string, output: Omit<AgentOutputRecord, 'id' | 'timestamp'>) => {
      setProfiles((prev) => {
        const profile = prev[agentId];
        if (!profile) return prev;
        const record: AgentOutputRecord = {
          id: `out-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          timestamp: new Date().toISOString(),
          ...output,
        };
        const history = [record, ...profile.outputHistory].slice(0, MAX_OUTPUT_HISTORY);
        return { ...prev, [agentId]: { ...profile, outputHistory: history } };
      });
    },
    []
  );

  return (
    <AgentProfileContext.Provider
      value={{ profiles, getProfile, updateSystemPrompt, resetSystemPrompt, toggleSkill, addSkill, addOutput }}
    >
      {children}
    </AgentProfileContext.Provider>
  );
}

export function useAgentProfiles(): AgentProfileContextValue {
  const ctx = useContext(AgentProfileContext);
  if (!ctx) {
    throw new Error('useAgentProfiles must be used within AgentProfileProvider');
  }
  return ctx;
}
