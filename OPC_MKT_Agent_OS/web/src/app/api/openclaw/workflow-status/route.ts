import { NextResponse } from 'next/server';
import {
  createWorkflowRun,
  getWorkflowRun,
  getActiveWorkflowRun,
  updateWorkflowRun,
  listWorkflowRuns,
} from '@/lib/store/workflow-runs';
import type {
  WorkflowRun,
  ContentType,
  WorkflowStepRecord,
} from '@/types/workflow';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function detectContentType(message: string): ContentType {
  if (/多agent|agent团队|团队协作|multi.?agent|team.?studio|多智能体/i.test(message)) return 'team';
  if (/视频|脚本|短视频|录制|拍摄|抖音|小红书视频|vlog/i.test(message)) return 'video';
  if (/播客|podcast|双人对话|音频|电台/i.test(message)) return 'podcast';
  if (/文章|博客|公众号|长文|blog|article|写一篇/i.test(message)) return 'article';
  return 'social';
}

function getCommandForType(ct: ContentType): string {
  switch (ct) {
    case 'team': return 'team_collaborate';
    case 'video': return 'generate_script';
    case 'article': return 'generate_script';
    case 'podcast': return 'generate_podcast';
    case 'social': return 'generate_script';
  }
}

function buildSteps(contentType: ContentType, hasUrl: boolean): WorkflowStepRecord[] {
  const mk = (id: string, label: string): WorkflowStepRecord => ({
    id, label, status: 'pending', started_at: null, completed_at: null, result_summary: null, error: null,
  });

  // Team workflow has completely different steps
  if (contentType === 'team') {
    return [
      mk('receive', '接收指令'),
      mk('analyze', '分析任务'),
      mk('launch_team', '启动 Agent 团队'),
      mk('sync_task', '同步任务到团队'),
      mk('team_working', 'Agent 团队协作中'),
      mk('review', '汇总审核'),
      mk('complete', '完成'),
    ];
  }

  const steps: WorkflowStepRecord[] = [
    mk('receive', '接收指令'),
    mk('analyze', '分析需求'),
  ];

  if (hasUrl) {
    steps.push(mk('collect', '爬取素材'));
  }

  steps.push(
    mk('route', '路由判定'),
    mk('generate', contentType === 'podcast' ? '生成播客脚本' : '生成脚本'),
    mk('intervention', '等待确认'),
  );

  // Podcast needs Coze TTS after user confirms script
  if (contentType === 'podcast') {
    steps.push(mk('coze_tts', '扣子空间TTS'));
  }

  steps.push(
    mk('publish', '发布推送'),
    mk('complete', '完成'),
  );

  return steps;
}

const URL_RE = /https?:\/\/[^\s]+/i;

// ---------------------------------------------------------------------------
// GET  — fetch a specific run by run_id, or the most recent active run
// ---------------------------------------------------------------------------

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const runId = searchParams.get('run_id');
    const listAll = searchParams.get('list');

    // List mode — return all terminal runs (for history cards)
    if (listAll !== null) {
      const all = await listWorkflowRuns();
      const terminal = all
        .filter(r => r.status === 'completed' || r.status === 'failed')
        .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
        .slice(0, 10);
      return NextResponse.json({ runs: terminal });
    }

    let run: WorkflowRun | null;

    if (runId) {
      run = await getWorkflowRun(runId);
    } else {
      run = await getActiveWorkflowRun();
    }

    // Build response with explicit action hints for OpenClaw
    const response: Record<string, unknown> = { run };

    if (run?.status === 'paused_for_intervention') {
      const resultData = run.result_data as Record<string, unknown> | undefined;
      const cozeAction = resultData?.coze_action as Record<string, unknown> | undefined;
      const intervention = resultData?.intervention as Record<string, unknown> | undefined;

      if (cozeAction?.type === 'coze_tts') {
        // Coze TTS step — OpenClaw needs to use browser to generate audio
        response.action_required = 'coze_browser_tts';
        response.coze_action = cozeAction;
        response.feishu_message = [
          '🦞 播客脚本已确认，正在使用扣子空间生成音频...',
          '',
          '请稍候，OpenClaw 正在操作扣子空间 TTS。',
        ].join('\n');
        response.approve_url = cozeAction.approve_url;
        response.approve_body = cozeAction.approve_body;
      } else {
        // Script confirmation step — send script to Feishu for user review
        const scriptPreview = intervention?.script_preview as string
          ?? run.generated_content
          ?? '';
        const scriptTitle = intervention?.title as string ?? '脚本已生成';

        response.action_required = 'send_script_to_feishu';
        response.feishu_message = [
          `🦞 ${scriptTitle}`,
          '',
          '--- 脚本预览 ---',
          scriptPreview ? scriptPreview.slice(0, 2000) : '（脚本内容请查看 CreatorFlow）',
          scriptPreview && scriptPreview.length > 2000 ? '\n...(更多内容请查看 CreatorFlow)' : '',
          '',
          '📌 请回复「确认」继续执行，或「取消」终止工作流',
        ].join('\n');
        response.approve_url = `http://localhost:3000/api/openclaw/intervention-callback`;
        response.approve_body = { action: { value: { run_id: run.id, decision: 'approve' } } };
        response.reject_body = { action: { value: { run_id: run.id, decision: 'reject' } } };
      }
    } else if (run?.status === 'completed') {
      const resultData = run.result_data as Record<string, unknown> | undefined;
      if (resultData?.completion_summary) {
        response.feishu_message = resultData.completion_summary;
      }
    }

    return NextResponse.json(response);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ run: null, error: message }, { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// POST — create a new WorkflowRun
// ---------------------------------------------------------------------------

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      message: string;
      source?: 'manual' | 'feishu';
      feishu_chat_id?: string;
    };

    if (!body.message) {
      return NextResponse.json(
        { error: 'Missing message' },
        { status: 400 },
      );
    }

    const contentType = detectContentType(body.message);
    const command = getCommandForType(contentType);
    const hasUrl = URL_RE.test(body.message);
    const steps = buildSteps(contentType, hasUrl);

    const run = await createWorkflowRun({
      status: 'queued',
      content_type: contentType,
      command,
      original_message: body.message,
      source: body.source ?? 'manual',
      feishu_chat_id: body.feishu_chat_id ?? null,
      feishu_intervention_message_id: null,
      steps,
      current_step_index: 0,
      generated_content: null,
      creatorflow_script_id: null,
      result_data: null,
    });

    return NextResponse.json({ run }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// DELETE — stop/cancel a running workflow
// ---------------------------------------------------------------------------

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const runId = searchParams.get('run_id');

    if (!runId) {
      return NextResponse.json({ error: 'Missing run_id' }, { status: 400 });
    }

    const run = await getWorkflowRun(runId);
    if (!run) {
      return NextResponse.json({ error: 'Workflow not found' }, { status: 404 });
    }

    // Mark all non-completed steps as failed
    const updatedSteps = run.steps.map((s) =>
      s.status === 'completed' ? s : {
        ...s,
        status: 'failed' as const,
        completed_at: new Date().toISOString(),
        error: s.status === 'pending' ? null : '用户手动停止',
      }
    );

    await updateWorkflowRun(runId, {
      steps: updatedSteps,
      status: 'failed',
    });

    console.log(`[Workflow] Workflow ${runId} stopped by user`);
    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
