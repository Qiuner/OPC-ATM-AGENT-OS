import { NextRequest, NextResponse } from 'next/server';
import { listMetrics, createMetricRecord } from '@/lib/store/metrics';
import { getContent } from '@/lib/store/contents';
import { LearningStore } from '@/lib/agents/learning-store';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const content_id = searchParams.get('content_id');
    const filter: { content_id?: string } = {};
    if (content_id) filter.content_id = content_id;
    const data = await listMetrics(Object.keys(filter).length > 0 ? filter : undefined);
    return NextResponse.json({ success: true, data });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      content_id,
      content_title,
      platform,
      impressions,
      likes,
      comments,
      saves,
      shares,
      leads,
      recorded_at,
    } = body;

    if (!content_id || !content_title) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: content_id, content_title' },
        { status: 400 }
      );
    }

    const metricData = {
      content_id,
      content_title,
      platform: platform ?? '',
      impressions: impressions ?? 0,
      likes: likes ?? 0,
      comments: comments ?? 0,
      saves: saves ?? 0,
      shares: shares ?? 0,
      leads: leads ?? 0,
      recorded_at: recorded_at ?? new Date().toISOString(),
    };

    const data = await createMetricRecord(metricData);

    // 闭环学习: 自动将 metrics 数据同步到 learning record
    let learningUpdated = false;
    try {
      const content = await getContent(content_id);
      if (content?.learning_id) {
        const learningStore = new LearningStore();

        // 判断成功/失败: 基于平台基准互动率
        const totalEngagement = (metricData.likes + metricData.comments * 4 + metricData.saves * 2 + metricData.shares * 4);
        const engagementRate = metricData.impressions > 0
          ? totalEngagement / metricData.impressions
          : 0;

        // 平台基准阈值 (加权互动率)
        const thresholds: Record<string, number> = {
          '小红书': 0.03,
          '抖音': 0.02,
          '视频号': 0.02,
          'X': 0.01,
          '即刻': 0.05,
          '公众号': 0.02,
          '邮件': 0.03,
        };
        const threshold = thresholds[metricData.platform] ?? 0.02;
        const isSuccessful = engagementRate >= threshold || metricData.leads >= 1;

        // 自动生成初步 learnings 文本
        const autoLearnings = isSuccessful
          ? `内容表现优于基准（加权互动率 ${(engagementRate * 100).toFixed(1)}% >= ${(threshold * 100).toFixed(1)}%）。评论${metricData.comments}条、线索${metricData.leads}条。该主题/风格值得复用。`
          : `内容表现低于基准（加权互动率 ${(engagementRate * 100).toFixed(1)}% < ${(threshold * 100).toFixed(1)}%）。需调整主题切入角度或CTA策略。`;

        learningStore.updateResult(
          content.learning_id,
          {
            impressions: metricData.impressions,
            likes: metricData.likes,
            comments: metricData.comments,
            shares: metricData.shares,
            saves: metricData.saves,
            leads: metricData.leads,
            qualityScore: null,
            notes: `自动从 metrics 回填。加权互动率: ${(engagementRate * 100).toFixed(1)}%`,
          },
          autoLearnings,
          isSuccessful
        );

        learningUpdated = true;
      }
    } catch {
      // 学习记录更新失败不影响主流程
    }

    return NextResponse.json({
      success: true,
      data: { ...data, learningUpdated },
    }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
