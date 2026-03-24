import { NextRequest, NextResponse } from 'next/server';
import { LearningStore } from '@/lib/agents/learning-store';
import type { ExperimentResult } from '@/lib/agents/learning-store';

// GET /api/learnings — 获取学习记录列表和统计
export async function GET(request: NextRequest) {
  try {
    const store = new LearningStore();
    const { searchParams } = new URL(request.url);
    const view = searchParams.get('view');

    if (view === 'summary') {
      return NextResponse.json({
        success: true,
        data: store.getSummary(),
      });
    }

    return NextResponse.json({
      success: true,
      data: store.getAllRecords(),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}

// POST /api/learnings — 创建学习记录 或 更新实验结果
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const store = new LearningStore();

    // 更新已有记录的实验结果
    if (body.action === 'update_result') {
      const { id, result, learnings, isSuccessful } = body;
      if (!id || !result) {
        return NextResponse.json(
          { success: false, error: 'Missing id or result' },
          { status: 400 }
        );
      }

      store.updateResult(
        id,
        result as ExperimentResult,
        learnings ?? '',
        isSuccessful ?? false
      );

      return NextResponse.json({
        success: true,
        data: { id, updated: true },
      });
    }

    // 创建新记录
    const { agentType, platform, theme, hypothesis, contentId } = body;
    if (!agentType || !platform || !theme) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: agentType, platform, theme' },
        { status: 400 }
      );
    }

    const record = store.addRecord({
      agentType,
      platform,
      theme,
      hypothesis: hypothesis ?? '',
      contentId,
    });

    return NextResponse.json({
      success: true,
      data: record,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
