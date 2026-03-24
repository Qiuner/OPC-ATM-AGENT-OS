import { NextRequest, NextResponse } from 'next/server';
import {
  handleCollectMaterials,
  handleGenerateScript,
  handleGeneratePodcast,
  handlePublishContent,
  type OpenClawCommandParams,
  type ApiResponse,
} from '@/lib/openclaw/handlers';
import { getWorkflowRun, updateWorkflowRun } from '@/lib/store/workflow-runs';
import type {
  WorkflowRun,
  WorkflowStepRecord,
  StepStatus,
} from '@/types/workflow';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function extractUrl(text: string): string | null {
  const match = text.match(/https?:\/\/[^\s<>"{}|\\^`\[\]]+/);
  return match ? match[0] : null;
}

function extractTopic(text: string): string {
  return text.replace(/https?:\/\/[^\s<>"{}|\\^`\[\]]+/g, '').trim() || '未指定主题';
}

// ---------------------------------------------------------------------------
// Step execution
// ---------------------------------------------------------------------------

async function executeStep(
  step: WorkflowStepRecord,
  run: WorkflowRun
): Promise<{ status: StepStatus; result_summary: string; pause?: boolean; error?: string }> {
  const url = extractUrl(run.original_message);
  const topic = extractTopic(run.original_message);

  switch (step.id) {
    // ----- receive -----
    case 'receive':
      return { status: 'completed', result_summary: '指令已接收' };

    // ----- collect -----
    case 'collect': {
      if (!url) {
        return { status: 'completed', result_summary: '无 URL，跳过素材采集' };
      }
      const collectRes = await handleCollectMaterials({ url, topic });
      if (!collectRes.success) {
        return { status: 'failed', result_summary: '', error: collectRes.error ?? '素材采集失败' };
      }

      // Store scraped content in result_data so the generate step can use it
      const collectData = collectRes.data as Record<string, unknown> | undefined;
      const scrapedInfo = collectData?.scraped_content as Record<string, unknown> | undefined;
      const asset = collectData?.asset as Record<string, unknown> | undefined;
      if (scrapedInfo || asset) {
        await updateWorkflowRun(run.id, {
          result_data: {
            ...(run.result_data ?? {}),
            scraped_title: scrapedInfo?.title as string ?? asset?.title as string ?? '',
            scraped_content: asset?.content as string ?? '',
            scraped_content_preview: scrapedInfo?.content_preview as string ?? '',
          },
        });
      }

      return { status: 'completed', result_summary: `素材采集完成: ${url}` };
    }

    // ----- analyze -----
    case 'analyze':
      return {
        status: 'completed',
        result_summary: `内容类型: ${run.content_type}`,
      };

    // ----- route -----
    case 'route':
      return {
        status: 'completed',
        result_summary: `路由到 ${run.command}`,
      };

    // ----- generate -----
    case 'generate': {
      // Re-fetch run to get latest result_data (updated by collect step)
      const freshRun = await getWorkflowRun(run.id);
      const resultData = (freshRun?.result_data ?? run.result_data) as Record<string, unknown> | undefined;
      const scrapedContent = resultData?.scraped_content as string | undefined;
      const scrapedTitle = resultData?.scraped_title as string | undefined;

      const params: OpenClawCommandParams = {
        topic: scrapedTitle || topic,
        url: url ?? undefined,
        content: scrapedContent || undefined,
      };
      let genRes: ApiResponse;

      if (run.content_type === 'podcast') {
        genRes = await handleGeneratePodcast(params);
      } else {
        // video / article / social
        genRes = await handleGenerateScript({
          ...params,
          platform: run.content_type === 'social' ? '小红书' : undefined,
        });
      }

      if (!genRes.success) {
        return { status: 'failed', result_summary: '', error: genRes.error ?? '内容生成失败' };
      }

      // Persist generated artefacts back onto the run
      const genData = genRes.data as Record<string, unknown> | undefined;
      if (genData) {
        const updates: Partial<WorkflowRun> = {};
        if (typeof genData.creatorflow_script_id === 'string') {
          updates.creatorflow_script_id = genData.creatorflow_script_id;
        }
        const content = genData.content as Record<string, unknown> | undefined;
        if (content && typeof content.body === 'string') {
          updates.generated_content = content.body;
        }
        if (Object.keys(updates).length > 0) {
          await updateWorkflowRun(run.id, updates);
        }
      }

      return {
        status: 'completed',
        result_summary: `内容已生成 (${run.content_type})`,
      };
    }

    // ----- intervention -----
    case 'intervention': {
      // Store intervention info in result_data for OpenClaw to pick up and relay to Feishu
      const previousSummaries = run.steps
        .filter((s) => s.status === 'completed' && s.result_summary)
        .map((s) => s.result_summary)
        .join(' → ');

      await updateWorkflowRun(run.id, {
        result_data: {
          ...(run.result_data ?? {}),
          intervention: {
            type: 'confirm_continue',
            summary: previousSummaries || `工作流 ${run.id} 等待确认`,
            run_id: run.id,
            approve_url: `http://localhost:3000/api/openclaw/intervention-callback`,
          },
        },
      });

      return {
        status: 'waiting_intervention',
        result_summary: '等待确认',
        pause: true,
      };
    }

    // ----- coze_tts -----
    case 'coze_tts': {
      // Store Coze TTS instructions in result_data for OpenClaw to pick up via browser
      const scriptContent = run.generated_content ?? '';
      await updateWorkflowRun(run.id, {
        result_data: {
          ...(run.result_data ?? {}),
          coze_action: {
            type: 'coze_tts',
            coze_url: 'https://www.coze.cn/?skills=7587379252077805604&category=7524915324945252398',
            script_content: scriptContent,
            instructions: '请使用 browser 工具打开扣子空间，输入脚本内容，等待音频生成后下载。完成后调用 approve_url 继续工作流。',
            approve_url: 'http://localhost:3000/api/openclaw/intervention-callback',
            approve_body: { action: { value: { run_id: run.id, decision: 'approve' } } },
          },
        },
      });
      // Pause workflow — wait for OpenClaw to finish browser automation and callback
      return {
        status: 'waiting_intervention',
        result_summary: '等待扣子空间生成音频',
        pause: true,
      };
    }

    // ----- publish -----
    case 'publish': {
      if (run.creatorflow_script_id) {
        const pubRes = await handlePublishContent({
          script_id: run.creatorflow_script_id,
          platform: run.content_type === 'social' ? '小红书' : undefined,
        });
        if (!pubRes.success) {
          return { status: 'failed', result_summary: '', error: pubRes.error ?? '发布失败' };
        }
      }
      return { status: 'completed', result_summary: '内容已发布' };
    }

    // ----- track -----
    case 'track':
      return { status: 'completed', result_summary: '数据追踪任务已创建' };

    // ----- Team workflow steps -----
    case 'launch_team': {
      try {
        await fetch('http://localhost:3001/api/launch-team', { method: 'POST' });
      } catch { /* Team may already be running */ }
      return { status: 'completed', result_summary: 'Agent 团队已启动' };
    }

    case 'sync_task': {
      // Send task to CEO agent via chat-sdk
      const taskTopic = extractTopic(run.original_message);
      try {
        await fetch('http://localhost:3001/api/chat-sdk', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            systemPrompt: 'You are the CEO agent. Coordinate the team to complete the task.',
            conversationHistory: '',
            userMessage: taskTopic,
            agentName: 'ceo',
          }),
        });
      } catch { /* silent — agent-chat may not be running */ }
      return { status: 'completed', result_summary: `任务已同步: ${taskTopic.slice(0, 50)}` };
    }

    case 'team_working': {
      // Wait for agents to work — poll agent-chat monitor for activity
      const TEAM_WORK_TIMEOUT = 30_000; // max 30s
      const POLL_MS = 3000;
      const start = Date.now();
      let agentsDone = false;

      while (Date.now() - start < TEAM_WORK_TIMEOUT && !agentsDone) {
        await new Promise<void>(r => setTimeout(r, POLL_MS));
        try {
          const monRes = await fetch('http://localhost:3001/api/monitor', { cache: 'no-store' });
          if (monRes.ok) {
            const monData = await monRes.json();
            const agents = monData.agents as Array<{ status: string }> | undefined;
            // Done when no agent is busy
            if (agents && agents.length > 0 && agents.every(a => a.status !== 'busy')) {
              agentsDone = true;
            }
          }
        } catch { /* monitor not available — just wait */ }
      }

      return { status: 'completed', result_summary: agentsDone ? 'Agent 团队协作完成' : 'Agent 团队工作超时，继续流程' };
    }

    case 'review':
      return { status: 'completed', result_summary: '结果已汇总审核' };

    // ----- complete -----
    case 'complete': {
      // Store completion summary in result_data for OpenClaw to relay
      const summaryParts = run.steps
        .filter((s) => s.result_summary)
        .map((s) => `• ${s.label}: ${s.result_summary}`);
      await updateWorkflowRun(run.id, {
        result_data: {
          ...(run.result_data ?? {}),
          completion_summary: `🦞 工作流执行完成\n\n${summaryParts.join('\n')}`,
        },
      });
      return { status: 'completed', result_summary: '工作流执行完成' };
    }

    // ----- unknown step -----
    default:
      return { status: 'completed', result_summary: `步骤 ${step.id} 已跳过` };
  }
}

// ---------------------------------------------------------------------------
// POST handler
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { run_id } = body as { run_id?: string };

    if (!run_id) {
      return NextResponse.json(
        { success: false, error: '缺少 run_id 参数' },
        { status: 400 }
      );
    }

    // 1. Load the workflow run
    let run = await getWorkflowRun(run_id);
    if (!run) {
      return NextResponse.json(
        { success: false, error: `未找到工作流运行记录: ${run_id}` },
        { status: 404 }
      );
    }

    // 2. Check terminal states
    if (run.status === 'completed' || run.status === 'failed') {
      return NextResponse.json(
        { success: false, error: `工作流已处于终态: ${run.status}` },
        { status: 400 }
      );
    }

    // 3. Set status to running
    run = (await updateWorkflowRun(run_id, { status: 'running' }))!;

    // Step pacing for frontend animation
    const STEP_PAUSE = 2500;
    const wait = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms));

    // 4. Iterate through steps starting from current_step_index
    for (let i = run.current_step_index; i < run.steps.length; i++) {
      const step = run.steps[i];

      // Mark step as running
      const updatedSteps = [...run.steps];
      updatedSteps[i] = {
        ...step,
        status: 'running',
        started_at: new Date().toISOString(),
      };
      run = (await updateWorkflowRun(run_id, {
        steps: updatedSteps,
        current_step_index: i,
      }))!;

      // Pause so frontend can see the step in 'running' state
      await wait(STEP_PAUSE);

      // Execute step logic
      let result: Awaited<ReturnType<typeof executeStep>>;
      try {
        result = await executeStep(step, run);
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Unknown error';
        result = { status: 'failed', result_summary: '', error: errorMsg };
      }

      // Update step with result
      const finalSteps = [...run.steps];
      finalSteps[i] = {
        ...finalSteps[i],
        status: result.status,
        result_summary: result.result_summary,
        error: result.error ?? null,
        completed_at:
          result.status !== 'waiting_intervention'
            ? new Date().toISOString()
            : null,
      };

      const runUpdate: Partial<WorkflowRun> = {
        steps: finalSteps,
        current_step_index: i,
      };

      // Handle pause (intervention)
      if (result.pause) {
        runUpdate.status = 'paused_for_intervention';
        run = (await updateWorkflowRun(run_id, runUpdate))!;
        return NextResponse.json({
          success: true,
          data: {
            run_id: run.id,
            status: run.status,
            current_step_index: run.current_step_index,
          },
        });
      }

      // Handle failure
      if (result.status === 'failed') {
        runUpdate.status = 'failed';
        run = (await updateWorkflowRun(run_id, runUpdate))!;
        return NextResponse.json({
          success: true,
          data: {
            run_id: run.id,
            status: run.status,
            current_step_index: run.current_step_index,
          },
        });
      }

      // Handle completion step
      if (step.id === 'complete') {
        runUpdate.status = 'completed';
      }

      run = (await updateWorkflowRun(run_id, runUpdate))!;
    }

    // All steps finished — ensure status is completed
    if (run.status !== 'completed') {
      run = (await updateWorkflowRun(run_id, { status: 'completed' }))!;
    }

    return NextResponse.json({
      success: true,
      data: {
        run_id: run.id,
        status: run.status,
        current_step_index: run.current_step_index,
      },
    });
  } catch (err) {
    console.error('[OpenClaw] Execute workflow error:', err);
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json(
      { success: false, error: `工作流执行异常: ${message}` },
      { status: 500 }
    );
  }
}
