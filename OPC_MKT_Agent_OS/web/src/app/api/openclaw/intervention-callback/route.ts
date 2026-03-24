import { NextRequest, NextResponse } from 'next/server';
import { getWorkflowRun, updateWorkflowRun } from '@/lib/store/workflow-runs';
import { callCreatorFlowWithAutoStart } from '@/lib/openclaw/handlers';
import type { WorkflowRun } from '@/types/workflow';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CallbackPayload {
  action?: {
    value?: { run_id?: string; decision?: string };
    tag?: string;
  };
  // Coze TTS completion data
  audio_url?: string;
  audio_file_path?: string;
  // Feishu URL verification
  challenge?: string;
  token?: string;
  type?: string;
}

// ---------------------------------------------------------------------------
// Route Handler
// ---------------------------------------------------------------------------

/**
 * POST /api/openclaw/intervention-callback
 * 通用回调端点：飞书卡片确认 / OpenClaw Coze TTS 完成回调
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const payload: CallbackPayload = await request.json();

    // 1. Handle URL verification challenge (Feishu)
    if (payload.type === 'url_verification' && payload.challenge) {
      return NextResponse.json({ challenge: payload.challenge });
    }

    // 2. Extract run_id and decision
    const { run_id, decision } = payload.action?.value ?? {};

    if (!run_id || !decision) {
      console.error('[Intervention Callback] Missing run_id or decision', payload);
      return NextResponse.json({});
    }

    // 3. Load the WorkflowRun
    const run: WorkflowRun | null = await getWorkflowRun(run_id);
    if (!run) {
      console.error('[Intervention Callback] WorkflowRun not found:', run_id);
      return NextResponse.json({});
    }

    // 4. Find the step waiting for intervention
    const waitingIndex = run.steps.findIndex(
      (s) => s.status === 'waiting_intervention'
    );

    if (waitingIndex === -1) {
      console.error('[Intervention Callback] No step waiting for intervention in run:', run_id);
      return NextResponse.json({});
    }

    const waitingStep = run.steps[waitingIndex];

    if (decision === 'approve') {
      // --- If this is Coze TTS completion, sync audio to CreatorFlow ---
      if (waitingStep.id === 'coze_tts') {
        const audioUrl = payload.audio_url || payload.audio_file_path;
        const resultData = (run.result_data ?? {}) as Record<string, unknown>;
        const episodeId = resultData.creatorflow_episode_id as string | undefined;

        if (audioUrl && episodeId) {
          // Update CreatorFlow episode with audio (PATCH method, field: audio_path)
          try {
            await callCreatorFlowWithAutoStart<Record<string, unknown>>(
              `/api/podcast/episodes/${episodeId}`,
              { audio_path: audioUrl, status: 'recorded' },
              120_000,
              'PATCH',
            );
            console.log(`[Intervention Callback] Audio synced to episode ${episodeId}`);
          } catch (err) {
            console.error('[Intervention Callback] Failed to sync audio:', err);
          }
        }

        // Store audio URL in result_data
        await updateWorkflowRun(run_id, {
          result_data: {
            ...resultData,
            audio_url: audioUrl ?? null,
            coze_tts_completed: true,
          },
        });
      }

      // Mark step as completed and advance
      const updatedSteps = [...run.steps];
      updatedSteps[waitingIndex] = {
        ...updatedSteps[waitingIndex],
        status: 'completed',
        completed_at: new Date().toISOString(),
        result_summary: waitingStep.id === 'coze_tts'
          ? `音频生成完成${payload.audio_url ? ' (已同步)' : ''}`
          : '已确认',
      };

      await updateWorkflowRun(run_id, {
        steps: updatedSteps,
        current_step_index: waitingIndex + 1,
        status: 'running',
      });

      // Fire-and-forget: trigger execution of remaining steps
      const baseUrl = new URL(request.url);
      const executeUrl = `${baseUrl.protocol}//${baseUrl.host}/api/openclaw/execute`;
      fetch(executeUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ run_id }),
      }).catch((err) => {
        console.error('[Intervention Callback] Failed to trigger execute:', err);
      });
    } else if (decision === 'reject') {
      const updatedSteps = [...run.steps];
      updatedSteps[waitingIndex] = {
        ...updatedSteps[waitingIndex],
        status: 'failed',
        completed_at: new Date().toISOString(),
        error: '用户拒绝',
      };

      await updateWorkflowRun(run_id, {
        steps: updatedSteps,
        status: 'failed',
      });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[Intervention Callback] POST error:', err);
    return NextResponse.json({});
  }
}
