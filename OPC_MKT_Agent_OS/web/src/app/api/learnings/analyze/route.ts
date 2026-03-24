import { NextRequest, NextResponse } from 'next/server';
import { getContent } from '@/lib/store/contents';
import { listMetrics } from '@/lib/store/metrics';
import { LearningStore } from '@/lib/agents/learning-store';
import type { ProviderName } from '@/lib/llm/types';
import { createProvider } from '@/lib/llm/provider';
import type { ChatMessage, LLMOptions } from '@/lib/llm/types';

// POST /api/learnings/analyze
// 用 AI 深度分析某篇内容为什么好/不好，更新 learning record
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { contentId, provider, apiKeys } = body as {
      contentId: string;
      provider?: ProviderName;
      apiKeys?: Record<string, string>;
    };

    if (!contentId) {
      return NextResponse.json(
        { success: false, error: 'Missing contentId' },
        { status: 400 }
      );
    }

    // 获取 content 详情
    const content = await getContent(contentId);
    if (!content) {
      return NextResponse.json(
        { success: false, error: 'Content not found' },
        { status: 404 }
      );
    }

    // 获取该 content 的 metrics
    const allMetrics = await listMetrics({ content_id: contentId });
    if (allMetrics.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No metrics found for this content. Please submit metrics first.' },
        { status: 400 }
      );
    }

    // 取最新一条 metrics
    const latestMetric = allMetrics[allMetrics.length - 1];

    // 找到关联的 learning record
    const learningStore = new LearningStore();
    let learningRecord = content.learning_id
      ? learningStore.getAllRecords().find(r => r.id === content.learning_id)
      : learningStore.findByContentId(contentId);

    // 如果没有 learning record，创建一个
    if (!learningRecord) {
      learningRecord = learningStore.addRecord({
        agentType: content.agent_type ?? 'writer',
        platform: content.platform,
        theme: content.title,
        hypothesis: '无初始假设（从 metrics 分析触发）',
        contentId,
      });
    }

    // 用 AI 分析
    const effectiveProvider = provider ?? 'claude';
    const apiKey = apiKeys?.[effectiveProvider] ?? '';

    const systemPrompt = `你是营销内容分析专家。分析一篇已发布内容的效果数据，提炼可复用的经验教训。

输出要求：
1. 简洁直接，每条经验 1-2 句话
2. 关注可复用的模式（什么类型的标题/结构/CTA 有效或无效）
3. 给出具体的下次改进建议

严格输出 JSON:
\`\`\`json
{
  "isSuccessful": true/false,
  "learnings": "核心经验教训（2-3句话）",
  "patterns": {
    "effective": ["有效的模式1", "有效的模式2"],
    "ineffective": ["无效的模式1"]
  },
  "nextTimeAdvice": "下次同类内容的具体改进建议"
}
\`\`\``;

    const userPrompt = `## 内容信息
- 平台: ${content.platform}
- 标题: ${content.title}
- Agent 类型: ${content.agent_type ?? '未知'}
- 正文摘要: ${content.body.slice(0, 500)}...

## 效果数据
- 曝光: ${latestMetric.impressions}
- 点赞: ${latestMetric.likes}
- 评论: ${latestMetric.comments}
- 收藏: ${latestMetric.saves}
- 分享: ${latestMetric.shares}
- 线索: ${latestMetric.leads}

## 内容标签/CTA
${JSON.stringify(content.metadata, null, 2)}

请分析这篇内容的表现，提炼经验教训。`;

    let analysisResult: Record<string, unknown>;

    if (apiKey) {
      try {
        const llm = createProvider(effectiveProvider, apiKey);
        const messages: ChatMessage[] = [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ];
        const options: LLMOptions = { temperature: 0.3, maxTokens: 1024 };
        const response = await llm.chat(messages, options);

        const jsonMatch = response.content.match(/```json\s*([\s\S]*?)```/);
        const raw = jsonMatch ? jsonMatch[1].trim() : response.content.trim();
        analysisResult = JSON.parse(raw) as Record<string, unknown>;
      } catch {
        // LLM 调用失败，回退到规则分析
        analysisResult = generateRuleBasedAnalysis(content, latestMetric);
      }
    } else {
      // 无 API Key，用规则分析
      analysisResult = generateRuleBasedAnalysis(content, latestMetric);
    }

    // 更新 learning record
    const isSuccessful = analysisResult.isSuccessful as boolean;
    const learningsText = [
      analysisResult.learnings as string,
      `改进建议: ${analysisResult.nextTimeAdvice as string}`,
    ].join(' ');

    learningStore.updateResult(
      learningRecord.id,
      {
        impressions: latestMetric.impressions,
        likes: latestMetric.likes,
        comments: latestMetric.comments,
        shares: latestMetric.shares,
        saves: latestMetric.saves,
        leads: latestMetric.leads,
        qualityScore: null,
        notes: 'AI 深度分析',
      },
      learningsText,
      isSuccessful
    );

    return NextResponse.json({
      success: true,
      data: {
        learningId: learningRecord.id,
        contentId,
        analysis: analysisResult,
        learningsText,
        isSuccessful,
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

// 无 LLM 时的规则分析兜底
function generateRuleBasedAnalysis(
  content: { platform: string; title: string; body: string; metadata: Record<string, unknown> },
  metric: { impressions: number; likes: number; comments: number; saves: number; shares: number; leads: number }
): Record<string, unknown> {
  const totalEngagement = metric.likes + metric.comments * 4 + metric.saves * 2 + metric.shares * 4;
  const engagementRate = metric.impressions > 0 ? totalEngagement / metric.impressions : 0;

  const thresholds: Record<string, number> = {
    '小红书': 0.03, '抖音': 0.02, '视频号': 0.02,
    'X': 0.01, '即刻': 0.05, '公众号': 0.02, '邮件': 0.03,
  };
  const threshold = thresholds[content.platform] ?? 0.02;
  const isSuccessful = engagementRate >= threshold || metric.leads >= 1;

  const effective: string[] = [];
  const ineffective: string[] = [];

  if (metric.comments > metric.likes * 0.1) effective.push('CTA 引导评论有效');
  if (metric.saves > metric.likes * 0.3) effective.push('内容具有收藏价值（干货型）');
  if (metric.shares > metric.likes * 0.05) effective.push('内容具有传播价值');
  if (metric.leads > 0) effective.push(`转化有效，获得 ${metric.leads} 条线索`);

  if (metric.comments === 0) ineffective.push('评论为0，CTA 引导无效或缺失');
  if (metric.impressions > 0 && metric.likes / metric.impressions < 0.01) ineffective.push('点赞率过低，标题/封面吸引力不足');
  if (metric.saves === 0 && content.platform === '小红书') ineffective.push('小红书零收藏，内容实用性不足');

  return {
    isSuccessful,
    learnings: isSuccessful
      ? `加权互动率 ${(engagementRate * 100).toFixed(1)}%，高于 ${content.platform} 基准 ${(threshold * 100).toFixed(1)}%。${effective.join('；')}。`
      : `加权互动率 ${(engagementRate * 100).toFixed(1)}%，低于 ${content.platform} 基准 ${(threshold * 100).toFixed(1)}%。${ineffective.join('；')}。`,
    patterns: { effective, ineffective },
    nextTimeAdvice: isSuccessful
      ? '继续使用类似的主题切入角度和 CTA 策略，尝试更多变体测试。'
      : '调整标题公式增加吸引力，强化 CTA 引导评论互动，增加实用干货比例。',
  };
}
