import { NextResponse } from 'next/server';
import type { ProviderName } from '@/lib/llm/types';
import type { AgentRunStatus } from '@/types';
import { runCampaignWorkflow } from '@/lib/agents/orchestrator';
import { createTask } from '@/lib/store/tasks';
import { createContent } from '@/lib/store/contents';
import { createAgentRun } from '@/lib/store/agent-runs';
import { LearningStore } from '@/lib/agents/learning-store';

export async function GET() {
  return NextResponse.json({
    success: true,
    data: {
      message: 'Agents API — 用于触发和管理 Agent 任务运行',
      endpoints: {
        'POST /api/agents': '创建新的 Agent 工作流运行（Strategist → Writer → Publisher）',
        'GET /api/agents': '获取 Agent API 信息',
      },
    },
  });
}

interface AgentRequestBody {
  context?: Record<string, unknown>;
  goal?: string;
  platforms?: string[];
  provider?: ProviderName;
  startDate?: string;
  campaignId?: string;
  apiKeys?: Record<string, string>;
}

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

interface DraftData {
  day?: number;
  date?: string;
  platform?: string;
  title?: string;
  body?: string;
  tags?: string[];
  cta?: string;
  riskCheck?: string;
  error?: string;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as AgentRequestBody;

    const {
      context = {},
      goal = '提升品牌曝光和获客',
      platforms = ['小红书', '抖音', '视频号', 'X', '即刻'],
      provider,
      startDate,
      campaignId,
      apiKeys,
    } = body;

    const effectiveProvider = provider ?? 'claude';
    const apiKey = apiKeys?.[effectiveProvider] ?? '';

    const result = await runCampaignWorkflow({
      context,
      goal,
      platforms,
      provider,
      startDate,
      ...(apiKey ? { apiKey } : {}),
    });

    const effectiveCampaignId = campaignId ?? 'default';
    const taskIds: string[] = [];
    const contentIds: string[] = [];

    // Write tasks from the weekly plan
    const weeklyPlan = (result.plan?.weeklyPlan as DayPlan[] | undefined) ?? [];
    for (const dayPlan of weeklyPlan) {
      try {
        const task = await createTask({
          campaign_id: effectiveCampaignId,
          title: `${dayPlan.platform} — ${dayPlan.theme}`,
          description: dayPlan.notes ?? '',
          status: 'draft',
          assignee_type: 'agent',
          assignee_id: null,
          priority: 0,
          due_date: dayPlan.date ?? null,
        });
        taskIds.push(task.id);
      } catch {
        // skip failed task creation
      }
    }

    // Write content drafts
    const drafts = result.drafts as DraftData[];
    for (let i = 0; i < drafts.length; i++) {
      const draft = drafts[i];
      if (draft.error) continue;

      const correspondingTaskId = taskIds[i] ?? '';
      try {
        const content = await createContent({
          task_id: correspondingTaskId,
          campaign_id: effectiveCampaignId,
          title: draft.title ?? `${draft.platform ?? '未知平台'} 内容草稿`,
          body: draft.body ?? '',
          platform: draft.platform ?? '',
          status: 'review',
          media_urls: [],
          metadata: {
            tags: draft.tags ?? [],
            cta: draft.cta ?? '',
            riskCheck: draft.riskCheck ?? '',
          },
          created_by: 'agent',
          agent_run_id: null,
          agent_type: (draft as DraftData & { agentUsed?: string }).agentUsed ?? null,
          learning_id: null,
        });
        contentIds.push(content.id);
      } catch {
        // skip failed content creation
      }
    }

    // Write agent run logs and collect IDs for linkage
    const agentRunIds: string[] = [];
    for (const run of result.runs) {
      try {
        const agentRun = await createAgentRun({
          task_id: '',
          agent_type: run.agentType,
          provider: provider ?? 'claude',
          model: '',
          prompt_tokens: run.usage?.inputTokens ?? 0,
          completion_tokens: run.usage?.outputTokens ?? 0,
          status: run.status as AgentRunStatus,
          input: run.input,
          output: run.output,
          error: run.error ?? null,
          started_at: run.startedAt,
          finished_at: run.finishedAt,
          hypothesis: null,
          experiment_result: null,
          learnings: null,
        });
        agentRunIds.push(agentRun.id);
      } catch {
        agentRunIds.push('');
      }
    }

    // Link content → agentRun and create learning records
    const learningStore = new LearningStore();
    const learningIds: string[] = [];

    // Agent runs: index 0 = strategist, index 1..N = writer agents (one per day)
    for (let i = 0; i < contentIds.length; i++) {
      const contentId = contentIds[i];
      const draft = drafts[i] as DraftData & { agentUsed?: string };
      // Writer agent runs start at index 1 (index 0 is strategist)
      const writerRunIndex = i + 1;
      const agentRunId = agentRunIds[writerRunIndex] ?? '';
      const agentType = draft.agentUsed ?? 'writer';
      const dayPlan = weeklyPlan[i];

      // Update content with agent_run_id linkage
      if (contentId && agentRunId) {
        try {
          const { updateContent } = await import('@/lib/store/contents');
          await updateContent(contentId, {
            agent_run_id: agentRunId,
            agent_type: agentType,
          } as Partial<import('@/types').Content>);
        } catch {
          // skip
        }
      }

      // Create learning record for this content
      if (contentId && dayPlan) {
        try {
          const record = learningStore.addRecord({
            agentType,
            platform: dayPlan.platform,
            theme: dayPlan.theme,
            hypothesis: `使用 ${agentType} Agent 为 ${dayPlan.platform} 创作「${dayPlan.theme}」主题内容，关键词: ${(dayPlan.keywords ?? []).join('、')}`,
            contentId,
          });
          learningIds.push(record.id);

          // Link learning_id back to content
          try {
            const { updateContent } = await import('@/lib/store/contents');
            await updateContent(contentId, {
              learning_id: record.id,
            } as Partial<import('@/types').Content>);
          } catch {
            // skip
          }
        } catch {
          // skip
        }
      }
    }

    return NextResponse.json({
      success: result.status !== 'failed',
      data: {
        ...result,
        createdTaskIds: taskIds,
        createdContentIds: contentIds,
        createdAgentRunIds: agentRunIds,
        createdLearningIds: learningIds,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
