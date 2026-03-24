import { NextRequest, NextResponse } from 'next/server';
import { listMetrics } from '@/lib/store/metrics';
import { listContents } from '@/lib/store/contents';
import { AnalystAgent } from '@/lib/agents/analyst';
import type { ProviderName } from '@/lib/llm/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { startDate, endDate, provider, apiKeys } = body;

    if (!startDate || !endDate) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: startDate, endDate' },
        { status: 400 }
      );
    }

    // Fetch metrics within date range
    const allMetrics = await listMetrics();
    const filteredMetrics = allMetrics.filter((m) => {
      const date = new Date(m.recorded_at);
      return date >= new Date(startDate) && date <= new Date(endDate);
    });

    // Fetch all contents
    const allContents = await listContents();

    // Build agent input
    const selectedProvider = (provider ?? 'claude') as ProviderName;
    const apiKey = apiKeys?.[selectedProvider] as string | undefined;

    const agent = new AnalystAgent();
    const result = await agent.run({
      context: {
        goal: `分析 ${startDate} 至 ${endDate} 期间的营销数据，生成周报`,
        data: {
          metrics: filteredMetrics,
          contents: allContents,
          dateRange: { startDate, endDate },
        },
      },
      config: {
        provider: selectedProvider,
        apiKey,
      },
    });

    return NextResponse.json({ success: true, data: result });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
