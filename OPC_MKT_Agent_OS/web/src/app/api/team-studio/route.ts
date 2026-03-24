import { PMAgent } from '@/lib/agents/pm-agent';
import type { AgentRole, TaskItem } from '@/lib/agents/pm-agent';
import { StrategistAgent } from '@/lib/agents/strategist';
import { WriterAgent } from '@/lib/agents/writer';
import { PublisherAgent } from '@/lib/agents/publisher';
import { AnalystAgent } from '@/lib/agents/analyst';
import { getActiveProvider } from '@/lib/ai-runtime';
import type { AgentOutput } from '@/lib/agents/base';

// ==========================================
// SSE 流式 Team Studio 端点
// ==========================================

interface RequestBody {
  message: string;
  context?: Record<string, unknown>;
  provider?: string;
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

function formatTasks(tasks: TaskItem[]): string {
  const agentLabels: Record<AgentRole, string> = {
    strategist: '策略官',
    writer: '内容官',
    publisher: '发布官',
    analyst: '分析官',
  };
  return tasks
    .map((t) => `• ${agentLabels[t.agent] ?? t.agent} → ${t.action}`)
    .join('\n');
}

function formatStrategyResult(result: AgentOutput): string {
  if (result.status === 'failed') {
    return `❌ 策略生成失败：${result.error ?? '未知错误'}`;
  }
  const plan = result.data;
  const weeklyPlan = plan.weeklyPlan as DayPlan[] | undefined;
  if (!weeklyPlan || weeklyPlan.length === 0) {
    return '✅ 策略计划已生成（详情请查看 Task Board）';
  }
  const planText = weeklyPlan
    .map((d) => `📋 Day${d.day} (${d.date}): ${d.platform} — ${d.theme}`)
    .join('\n');
  const goal = (plan.overallGoal as string) ?? '';
  return `✅ 7天营销计划已生成！\n\n${planText}${goal ? `\n\n🎯 总体目标：${goal}` : ''}`;
}

function formatWriterResult(result: AgentOutput): string {
  if (result.status === 'failed') {
    return `❌ 内容生成失败：${result.error ?? '未知错误'}`;
  }
  const data = result.data;
  const platform = (data.platform as string) ?? '未知平台';
  const title = (data.title as string) ?? '';
  return `✅ 【${platform}】内容草稿已生成\n📝 ${title}`;
}

function formatAnalystResult(result: AgentOutput): string {
  if (result.status === 'failed') {
    return `❌ 分析失败：${result.error ?? '未知错误'}`;
  }
  const analysis = result.data.analysis as Record<string, unknown> | undefined;
  const recommendations = result.data.recommendations as Array<Record<string, unknown>> | undefined;
  const overview = (analysis?.overview as string) ?? '';
  const recsText = recommendations
    ?.slice(0, 3)
    .map((r) => `• [${(r.priority as string) ?? ''}] ${(r.action as string) ?? ''}`)
    .join('\n') ?? '';
  return `✅ 数据分析报告已生成\n\n📊 ${overview}${recsText ? `\n\n💡 优化建议：\n${recsText}` : ''}`;
}

export async function POST(req: Request) {
  const body = (await req.json()) as RequestBody;
  const { message, context = {}, provider: requestedProvider, apiKeys } = body;

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();

      function sendEvent(role: string, content: string, status?: string) {
        const data = JSON.stringify({ role, content, status: status ?? 'done' });
        controller.enqueue(encoder.encode(`data: ${data}\n\n`));
      }

      try {
        const validProviders = ['claude', 'openai', 'gemini', 'deepseek', 'minimax', 'glm'];
        const provider = (requestedProvider && validProviders.includes(requestedProvider))
          ? requestedProvider as import('@/lib/llm/types').ProviderName
          : getActiveProvider();
        const apiKey = apiKeys?.[provider] ?? '';
        const agentConfig = { provider, ...(apiKey ? { apiKey } : {}) };

        // === 1. PM 分析任务 ===
        sendEvent('pm', `收到指令：「${message}」，正在分析并拆解任务...`, 'thinking');

        const pmAgent = new PMAgent();
        const breakdown = await pmAgent.analyzeTask(message, context);

        sendEvent(
          'pm',
          `任务拆解完成：\n${breakdown.summary}\n\n${formatTasks(breakdown.tasks)}`,
          'done'
        );

        // 保存中间结果供后续 Agent 使用
        let strategyResult: AgentOutput | null = null;
        let writerResults: AgentOutput[] = [];
        let contentCount = 0;

        // === 2. 按优先级执行各 Agent ===
        const sortedTasks = [...breakdown.tasks].sort((a, b) => a.priority - b.priority);

        for (const task of sortedTasks) {
          switch (task.agent) {
            case 'strategist': {
              sendEvent('strategist', `收到任务：${task.action}，正在分析上下文并制定策略...`, 'thinking');

              const agent = new StrategistAgent();
              strategyResult = await agent.run({
                context: {
                  ...context,
                  goal: message,
                  platforms: ['小红书', '抖音', 'X', '视频号', '即刻'],
                  startDate: new Date().toISOString().split('T')[0],
                },
                config: agentConfig,
              });

              sendEvent('strategist', formatStrategyResult(strategyResult), 'done');
              break;
            }

            case 'writer': {
              sendEvent('writer', `收到任务：${task.action}，正在生成内容...`, 'thinking');

              const agent = new WriterAgent();

              // 如果有策略计划，为每天的计划生成内容（最多生成前 3 天的）
              const weeklyPlan = (strategyResult?.data?.weeklyPlan as DayPlan[]) ?? [];
              const plansToWrite = weeklyPlan.length > 0 ? weeklyPlan.slice(0, 3) : [];

              if (plansToWrite.length > 0) {
                for (const dayPlan of plansToWrite) {
                  const result = await agent.run({
                    context: {
                      ...context,
                      dayPlan,
                      goal: message,
                    },
                    previousOutput: strategyResult?.data,
                    config: agentConfig,
                  });
                  writerResults.push(result);
                  contentCount++;
                  sendEvent('writer', formatWriterResult(result), 'done');
                }
              } else {
                // 没有策略计划时，生成一篇通用内容
                const result = await agent.run({
                  context: {
                    ...context,
                    goal: message,
                    dayPlan: {
                      day: 1,
                      date: new Date().toISOString().split('T')[0],
                      theme: message,
                      platform: '小红书',
                      contentType: '图文笔记',
                      keywords: [],
                      ctaStrategy: '',
                      notes: '',
                    },
                  },
                  config: agentConfig,
                });
                writerResults.push(result);
                contentCount++;
                sendEvent('writer', formatWriterResult(result), 'done');
              }
              break;
            }

            case 'publisher': {
              sendEvent('publisher', `收到任务：${task.action}，正在格式化发布包...`, 'thinking');

              const agent = new PublisherAgent();
              let publishCount = 0;

              if (writerResults.length > 0) {
                for (const writerOutput of writerResults) {
                  if (writerOutput.status === 'success') {
                    await agent.run({
                      context,
                      previousOutput: writerOutput.data,
                    });
                    publishCount++;
                  }
                }
              }

              sendEvent(
                'publisher',
                publishCount > 0
                  ? `✅ 已格式化 ${publishCount} 个发布包，可前往 Publishing Hub 导出`
                  : '✅ 发布包已就绪',
                'done'
              );
              break;
            }

            case 'analyst': {
              sendEvent('analyst', `收到任务：${task.action}，正在进行分析...`, 'thinking');

              const agent = new AnalystAgent();
              const result = await agent.run({
                context: {
                  ...context,
                  goal: message,
                },
                previousOutput: strategyResult?.data ?? undefined,
                config: agentConfig,
              });

              sendEvent('analyst', formatAnalystResult(result), 'done');
              break;
            }
          }
        }

        // === 3. PM 总结 ===
        const taskNames = sortedTasks.map((t) => {
          const labels: Record<string, string> = {
            strategist: '策略制定',
            writer: '内容生成',
            publisher: '发布准备',
            analyst: '数据分析',
          };
          return labels[t.agent] ?? t.agent;
        });

        sendEvent(
          'pm',
          `🎉 全部任务完成！\n\n已完成：${taskNames.join(' → ')}\n${contentCount > 0 ? `• ${contentCount} 篇内容草稿已生成 → Approval Center\n` : ''}• 下一步建议：前往 Approval Center 审核内容`,
          'done'
        );

        sendEvent('system', 'done', 'complete');
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        sendEvent('pm', `❌ 执行出错：${errorMsg}`, 'error');
        sendEvent('system', 'error', 'complete');
      }

      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
