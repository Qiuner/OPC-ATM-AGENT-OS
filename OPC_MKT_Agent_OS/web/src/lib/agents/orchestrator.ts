import type { ProviderName } from '@/lib/llm/types';
import type { AgentOutput, AgentRunLog, BaseAgent } from './base';
import { StrategistAgent } from './strategist';
import { WriterAgent } from './writer';
import { SocialAgent } from './social-agent';
import { ArticleAgent } from './article-agent';
import { VideoAgent } from './video-agent';
import { EmailAgent } from './email-agent';
import { PublisherAgent } from './publisher';
import { LearningStore } from './learning-store';

// ==========================================
// 编排引擎 — 串联 Strategist → 场景化 Agent → Publisher
// 支持按 contentType/platform 路由到对应 Agent
// 支持闭环学习系统
// ==========================================

interface DayPlan {
  day: number;
  date: string;
  theme: string;
  platform: string;
  contentType: string;
  keywords: string[];
  ctaStrategy: string;
  notes: string;
}

// 场景化 Agent 路由表
const CONTENT_TYPE_ROUTES: Record<string, string> = {
  '图文笔记': 'social',
  '社区帖': 'social',
  '推文': 'social',
  '推文线程': 'social',
  '短帖': 'social',
  '文案': 'social',
  '短视频': 'video',
  '口播': 'video',
  '视频脚本': 'video',
  '公众号文章': 'article',
  '博客': 'article',
  'SEO文章': 'article',
  '长文': 'article',
  '邮件': 'email',
  'Newsletter': 'email',
  '营销邮件': 'email',
};

const PLATFORM_ROUTES: Record<string, string> = {
  '小红书': 'social',
  'X': 'social',
  '即刻': 'social',
  '抖音': 'video',
  '视频号': 'video',
  '公众号': 'article',
  '博客': 'article',
  '邮件': 'email',
};

function resolveAgent(dayPlan: DayPlan): BaseAgent {
  // 先按 contentType 匹配
  const byType = CONTENT_TYPE_ROUTES[dayPlan.contentType];
  if (byType) {
    return createAgentByName(byType);
  }

  // 再按 platform 匹配
  const byPlatform = PLATFORM_ROUTES[dayPlan.platform];
  if (byPlatform) {
    return createAgentByName(byPlatform);
  }

  // 兜底: 用 WriterAgent（保持向后兼容）
  return new WriterAgent();
}

function createAgentByName(name: string): BaseAgent {
  switch (name) {
    case 'social': return new SocialAgent();
    case 'article': return new ArticleAgent();
    case 'video': return new VideoAgent();
    case 'email': return new EmailAgent();
    default: return new WriterAgent();
  }
}

export interface WorkflowParams {
  context: Record<string, unknown>;
  goal: string;
  platforms: string[];
  provider?: ProviderName;
  startDate?: string;
  apiKey?: string;
}

export interface WorkflowResult {
  status: 'success' | 'partial' | 'failed';
  plan: Record<string, unknown> | null;
  drafts: Record<string, unknown>[];
  publishPacks: Record<string, unknown>[];
  runs: AgentRunLog[];
  error?: string;
}

export async function runCampaignWorkflow(params: WorkflowParams): Promise<WorkflowResult> {
  const { context, goal, platforms, provider, startDate, apiKey } = params;
  const runs: AgentRunLog[] = [];
  const drafts: Record<string, unknown>[] = [];
  const publishPacks: Record<string, unknown>[] = [];

  // 合并上下文
  const fullContext: Record<string, unknown> = {
    ...context,
    goal,
    platforms,
    startDate: startDate ?? new Date().toISOString().split('T')[0],
  };

  const agentConfig = {
    provider: provider ?? 'claude' as ProviderName,
    ...(apiKey ? { apiKey } : {}),
  };

  // === Step 1: Strategist → 7天计划 ===
  const strategist = new StrategistAgent();
  const stratResult = await strategist.runWithLog({
    context: fullContext,
    config: agentConfig,
  });
  runs.push(stratResult.log);

  if (stratResult.output.status === 'failed') {
    return {
      status: 'failed',
      plan: null,
      drafts: [],
      publishPacks: [],
      runs,
      error: `Strategist 失败: ${stratResult.output.error}`,
    };
  }

  const plan = stratResult.output.data;
  const weeklyPlan = (plan.weeklyPlan as DayPlan[]) ?? [];

  // === Step 2: 场景化 Agent → 按 contentType/platform 路由生成内容 ===
  const learningStore = new LearningStore();
  let hasWriterFailure = false;

  for (const dayPlan of weeklyPlan) {
    // 路由到对应的场景 Agent
    const agent = resolveAgent(dayPlan);

    // 查询历史学习数据
    const learnings = learningStore.queryLearnings(dayPlan.platform, agent.name);

    const writerResult = await agent.runWithLog({
      context: {
        ...fullContext,
        dayPlan,
        learnings: learnings || undefined,
      },
      previousOutput: plan,
      config: agentConfig,
    });

    // 记录运行日志（含 Agent 类型信息）
    const logWithAgent = {
      ...writerResult.log,
      agentType: agent.name,
    };
    runs.push(logWithAgent);

    if (writerResult.output.status === 'success') {
      drafts.push({
        day: dayPlan.day,
        date: dayPlan.date,
        platform: dayPlan.platform,
        agentUsed: agent.name,
        ...writerResult.output.data,
      });
    } else {
      hasWriterFailure = true;
      drafts.push({
        day: dayPlan.day,
        date: dayPlan.date,
        platform: dayPlan.platform,
        agentUsed: agent.name,
        error: writerResult.output.error,
      });
    }
  }

  // === Step 3: Publisher → 格式化发布包 ===
  const publisher = new PublisherAgent();
  let hasPublisherFailure = false;

  for (const draft of drafts) {
    if (draft.error) {
      // 跳过写作失败的内容
      publishPacks.push({
        day: draft.day,
        date: draft.date,
        platform: draft.platform,
        error: '写作阶段失败，跳过发布',
      });
      continue;
    }

    const pubResult = await publisher.runWithLog({
      context: fullContext,
      previousOutput: draft,
    });
    runs.push(pubResult.log);

    if (pubResult.output.status === 'success') {
      publishPacks.push({
        day: draft.day,
        date: draft.date,
        ...pubResult.output.data,
      });
    } else {
      hasPublisherFailure = true;
      publishPacks.push({
        day: draft.day,
        date: draft.date,
        platform: draft.platform,
        error: pubResult.output.error,
      });
    }
  }

  const status = hasWriterFailure || hasPublisherFailure ? 'partial' : 'success';

  return {
    status,
    plan,
    drafts,
    publishPacks,
    runs,
  };
}
