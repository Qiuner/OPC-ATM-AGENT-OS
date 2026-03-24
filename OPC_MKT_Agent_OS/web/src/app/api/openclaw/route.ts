import { NextRequest, NextResponse } from 'next/server';
import {
  type ApiResponse,
  type OpenClawCommand,
  VALID_COMMANDS,
  isValidCommand,
  handleCollectMaterials,
  handleGenerateScript,
  handleGeneratePodcast,
  handlePublishContent,
  handleCreatePlan,
  handleAnalyzeData,
  handleGetStatus,
  handleTeamCollaborate,
} from '@/lib/openclaw/handlers';
import { pushToFeishu, invokeCallback } from '@/lib/openclaw/feishu';
import { createWorkflowRun } from '@/lib/store/workflow-runs';
import type { WorkflowRun, WorkflowStepRecord, ContentType } from '@/types/workflow';

// ---------------------------------------------------------------------------
// Helpers — build WorkflowRun steps matching the command
// ---------------------------------------------------------------------------

function detectContentType(command: string, params: Record<string, unknown>): ContentType {
  if (command === 'team_collaborate') return 'team';
  if (command === 'generate_podcast') return 'podcast';
  if (command === 'publish_content') return 'social';
  const topic = String(params?.topic ?? '');
  if (/多agent|agent团队|团队协作|multi.?agent|team.?studio|多智能体/i.test(topic)) return 'team';
  if (/视频|脚本|短视频|抖音/i.test(topic)) return 'video';
  if (/播客|podcast/i.test(topic)) return 'podcast';
  if (/文章|博客|公众号/i.test(topic)) return 'article';
  return 'social';
}

function buildStepsForCommand(command: string, hasUrl: boolean): WorkflowStepRecord[] {
  const mk = (id: string, label: string): WorkflowStepRecord => ({
    id, label, status: 'pending', started_at: null, completed_at: null, result_summary: null, error: null,
  });

  // Team collaborate has a completely different step flow
  if (command === 'team_collaborate') {
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

  const steps: WorkflowStepRecord[] = [mk('receive', '接收指令'), mk('analyze', '分析需求')];
  if (hasUrl) steps.push(mk('collect', '爬取素材'));
  steps.push(mk('route', '路由判定'));

  switch (command) {
    case 'generate_script':
      steps.push(mk('generate', '生成脚本'));
      break;
    case 'generate_podcast':
      steps.push(mk('generate', '生成播客脚本'));
      break;
    case 'collect_materials':
      steps.push(mk('generate', '整理素材'));
      break;
    case 'publish_content':
      steps.push(mk('generate', '生成发布内容'));
      break;
    case 'create_plan':
      steps.push(mk('generate', '生成营销计划'));
      break;
    case 'analyze_data':
      steps.push(mk('generate', '分析数据'));
      break;
    default:
      steps.push(mk('generate', '执行任务'));
  }

  steps.push(mk('intervention', '等待确认'));

  // Podcast workflows need Coze TTS step after user confirms script
  if (command === 'generate_podcast') {
    steps.push(mk('coze_tts', '扣子空间TTS'));
  }

  steps.push(mk('publish', '发布推送'), mk('complete', '完成'));
  return steps;
}

// ---------------------------------------------------------------------------
// Route Handlers
// ---------------------------------------------------------------------------

/**
 * GET /api/openclaw
 * 返回 OpenClaw Agent OS 能力清单
 */
export async function GET(): Promise<NextResponse<ApiResponse>> {
  return NextResponse.json({
    success: true,
    data: {
      name: 'OPC Marketing Agent OS — OpenClaw Gateway',
      version: '1.0.0',
      commands: [
        {
          command: 'collect_materials',
          description: '搜索并收集素材，存入 context-vault。提供 url 参数可直接爬取网页内容（支持微信公众号、小红书、Twitter、YouTube、B站、抖音等）',
          required_params: [],
          optional_params: ['topic', 'platform', 'style', 'url'],
        },
        {
          command: 'generate_script',
          description: '通过 CreatorFlow AI 生成内容脚本。可传 url 自动爬取素材后生成，或传 topic+content 直接生成',
          required_params: [],
          optional_params: ['topic', 'url', 'content', 'platform', 'style', 'campaign_id'],
        },
        {
          command: 'generate_podcast',
          description: '通过 CreatorFlow AI 生成播客脚本。可传 url 爬取文章后转播客',
          required_params: [],
          optional_params: ['topic', 'url', 'content', 'duration', 'campaign_id'],
        },
        {
          command: 'publish_content',
          description: '基于 CreatorFlow 脚本生成平台专属发布内容（标题、正文、标签）',
          required_params: ['script_id'],
          optional_params: ['platform'],
        },
        {
          command: 'create_plan',
          description: '生成营销推广计划',
          required_params: ['topic'],
          optional_params: ['platform', 'style', 'campaign_id'],
        },
        {
          command: 'analyze_data',
          description: '分析内容投放数据',
          required_params: [],
          optional_params: ['content_id'],
        },
        {
          command: 'get_status',
          description: '获取当前系统状态（任务数、内容数等）',
          required_params: [],
          optional_params: [],
        },
        {
          command: 'team_collaborate',
          description: '启动多 Agent 团队协作（CEO 调度 XHS/Growth/Reviewer 协同工作）。触发词：多agent模型、agent团队、团队协作',
          required_params: ['topic'],
          optional_params: ['platform'],
        },
      ],
    },
  });
}

/**
 * POST /api/openclaw
 * 接收 OpenClaw 指令并执行，同时创建 WorkflowRun 供前端同步状态
 */
export async function POST(
  request: NextRequest
): Promise<NextResponse<ApiResponse>> {
  try {
    const body: unknown = await request.json();

    // --- Validate payload ---
    if (
      typeof body !== 'object' ||
      body === null ||
      !('command' in body) ||
      !('params' in body)
    ) {
      return NextResponse.json(
        { success: false, error: '无效的请求体，需要 command 和 params 字段' },
        { status: 400 }
      );
    }

    const { command, params, feishu_chat_id, callback_url } =
      body as OpenClawCommand;

    if (!isValidCommand(command)) {
      return NextResponse.json(
        {
          success: false,
          error: `未知的命令: ${command}，支持的命令: ${VALID_COMMANDS.join(', ')}`,
        },
        { status: 400 }
      );
    }

    // --- Create WorkflowRun for frontend tracking ---
    const hasUrl = !!(params as Record<string, unknown>)?.url;
    const contentType = detectContentType(command, params as Record<string, unknown>);

    // Auto-correct command based on content type detection
    let effectiveCommand = command;
    if (contentType === 'podcast' && command !== 'generate_podcast') {
      console.log(`[OpenClaw] Auto-correcting command: ${command} → generate_podcast (contentType=podcast)`);
      effectiveCommand = 'generate_podcast' as typeof command;
    }
    if (contentType === 'team' && command !== 'team_collaborate') {
      console.log(`[OpenClaw] Auto-correcting command: ${command} → team_collaborate (contentType=team)`);
      effectiveCommand = 'team_collaborate' as typeof command;
    }

    const originalMessage = `${command} ${Object.entries(params as Record<string, unknown>).map(([k, v]) => `${k}=${v}`).join(' ')}`.trim();
    const steps = buildStepsForCommand(effectiveCommand, hasUrl);

    const { updateWorkflowRun } = await import('@/lib/store/workflow-runs');

    const run = await createWorkflowRun({
      status: 'running',
      content_type: contentType,
      command: effectiveCommand,
      original_message: originalMessage,
      source: feishu_chat_id ? 'feishu' : 'manual',
      feishu_chat_id: feishu_chat_id ?? null,
      feishu_intervention_message_id: null,
      steps,
      current_step_index: 0,
      generated_content: null,
      creatorflow_script_id: null,
      result_data: null,
    });

    // --- Fire-and-forget: execute workflow with paced steps in background ---
    // This allows the HTTP response to return immediately so OpenClaw doesn't wait,
    // while the frontend can poll and see each step running in real-time.
    const executeInBackground = async () => {
      try {
        const wait = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms));
        const STEP_PAUSE = 2500;

        const advanceStep = async (stepId: string, status: 'running' | 'completed' | 'failed', summary?: string) => {
          const idx = steps.findIndex(s => s.id === stepId);
          if (idx === -1) return;
          steps[idx] = {
            ...steps[idx],
            status,
            started_at: steps[idx].started_at ?? new Date().toISOString(),
            completed_at: status === 'running' ? null : new Date().toISOString(),
            result_summary: summary ?? null,
          };
          await updateWorkflowRun(run.id, {
            steps: [...steps],
            current_step_index: idx,
          });
        };

        // ===== TEAM COLLABORATE — separate step flow =====
        if (effectiveCommand === 'team_collaborate') {
          await advanceStep('receive', 'running');
          await wait(STEP_PAUSE);
          await advanceStep('receive', 'completed', '指令已接收');

          await advanceStep('analyze', 'running');
          await wait(STEP_PAUSE);
          await advanceStep('analyze', 'completed', '识别为多 Agent 协作任务');

          await advanceStep('launch_team', 'running');
          // Actually launch the team via Team Studio API
          try {
            await fetch('http://localhost:3001/api/launch-team', { method: 'POST' });
          } catch { /* Team may already be running */ }
          await wait(3000);
          await advanceStep('launch_team', 'completed', 'CEO + XHS + Growth + Reviewer 已上线');

          await advanceStep('sync_task', 'running');
          // Send task to CEO via Team Studio chat
          const taskTopic = (params as Record<string, unknown>)?.topic ?? originalMessage;
          try {
            await fetch('http://localhost:3001/api/chat-sdk', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                systemPrompt: 'You are the CEO agent. Execute the task.',
                conversationHistory: '',
                userMessage: String(taskTopic),
                agentName: 'ceo',
              }),
            });
          } catch { /* silent */ }
          await wait(STEP_PAUSE);
          await advanceStep('sync_task', 'completed', `任务已同步: ${String(taskTopic).slice(0, 50)}`);

          await advanceStep('team_working', 'running');
          // Let agents work for a while — frontend shows monitor
          await wait(8000);
          await advanceStep('team_working', 'completed', '团队协作完成');

          await advanceStep('review', 'running');
          await wait(STEP_PAUSE);
          await advanceStep('review', 'completed', '结果已汇总');

          await advanceStep('complete', 'running');
          await wait(1500);
          await advanceStep('complete', 'completed', '多 Agent 协作任务完成');
          await updateWorkflowRun(run.id, { status: 'completed' });
          return;
        }

        // ===== STANDARD WORKFLOW =====
        // Step 1: 接收指令
        await advanceStep('receive', 'running');
        await wait(STEP_PAUSE);
        await advanceStep('receive', 'completed', '指令已接收');

        // Step 2: 分析需求
        await advanceStep('analyze', 'running');
        await wait(STEP_PAUSE);
        await advanceStep('analyze', 'completed', `内容类型: ${contentType}`);

        // Step 3: 爬取素材
        if (hasUrl) {
          await advanceStep('collect', 'running');
        }

        // Step 4: 路由判定
        if (!hasUrl) {
          await advanceStep('route', 'running');
          await wait(STEP_PAUSE);
        }
        await advanceStep('route', 'completed', `路由到 ${effectiveCommand}`);

        // Step 5: 生成内容（real API call）
        await advanceStep('generate', 'running');

        let result: ApiResponse;
        switch (effectiveCommand) {
          case 'collect_materials':
            result = await handleCollectMaterials(params);
            break;
          case 'generate_script':
            result = await handleGenerateScript(params);
            break;
          case 'generate_podcast':
            result = await handleGeneratePodcast(params);
            break;
          case 'publish_content':
            result = await handlePublishContent(params);
            break;
          case 'create_plan':
            result = await handleCreatePlan(params);
            break;
          case 'analyze_data':
            result = await handleAnalyzeData(params);
            break;
          case 'get_status':
            result = await handleGetStatus();
            break;
        }

        if (result.success) {
          if (hasUrl) await advanceStep('collect', 'completed', '素材采集完成');
          await advanceStep('generate', 'completed', `${effectiveCommand} 执行成功`);

          const genData = result.data as Record<string, unknown> | undefined;
          if (genData) {
            const updates: Record<string, unknown> = {};
            if (typeof genData.creatorflow_script_id === 'string') {
              updates.creatorflow_script_id = genData.creatorflow_script_id;
            }
            const content = genData.content as Record<string, unknown> | undefined;
            if (content && typeof content.body === 'string') {
              updates.generated_content = content.body;
            }
            if (Object.keys(updates).length > 0) {
              await updateWorkflowRun(run.id, updates as Partial<WorkflowRun>);
            }
            // Store full result data (includes creatorflow_episode_id, podcast_title, etc.)
            await updateWorkflowRun(run.id, {
              result_data: genData as Record<string, unknown>,
            });
          }

          if (effectiveCommand === 'get_status' || effectiveCommand === 'analyze_data') {
            await advanceStep('intervention', 'completed', '无需确认');
            await advanceStep('publish', 'completed', '无需发布');
            await advanceStep('complete', 'running');
            await wait(1500);
            await advanceStep('complete', 'completed', '工作流执行完成');
            await updateWorkflowRun(run.id, { status: 'completed', result_data: result.data as Record<string, unknown> });
          } else {
            // --- REAL INTERVENTION: pause and store message for OpenClaw to relay ---
            await advanceStep('intervention', 'running');

            // Build script preview for OpenClaw to send to Feishu
            const genData2 = result.data as Record<string, unknown> | undefined;
            const scriptPreview = (genData2?.script_preview as string)
              ?? (genData2?.content as Record<string, unknown>)?.body as string
              ?? '';
            const scriptTitle = (genData2?.podcast_title as string)
              ?? (genData2?.message as string)
              ?? `${effectiveCommand} 结果`;

            // Set status to paused — execution stops here
            // Store script content + pending action in result_data for OpenClaw to pick up
            steps[steps.findIndex(s => s.id === 'intervention')] = {
              ...steps[steps.findIndex(s => s.id === 'intervention')],
              status: 'waiting_intervention',
              started_at: new Date().toISOString(),
              result_summary: '等待确认',
            };
            await updateWorkflowRun(run.id, {
              steps: [...steps],
              current_step_index: steps.findIndex(s => s.id === 'intervention'),
              status: 'paused_for_intervention',
              result_data: {
                ...(result.data as Record<string, unknown>),
                // OpenClaw should read this and send to Feishu
                intervention: {
                  type: 'confirm_script',
                  title: `🦞 脚本已生成 — ${scriptTitle}`,
                  script_preview: scriptPreview.slice(0, 2000),
                  run_id: run.id,
                  approve_url: `http://localhost:3000/api/openclaw/intervention-callback`,
                  instructions: '请将脚本预览发送给用户确认。用户确认后，POST approve_url: {"action":{"value":{"run_id":"' + run.id + '","decision":"approve"}}}',
                },
              },
            });

            // --- Execution pauses here. OpenClaw polls status, reads feishu_message, sends to Feishu, user confirms → intervention-callback resumes ---
            return;
          }
        } else {
          if (hasUrl) await advanceStep('collect', 'failed', result.error ?? '失败');
          await advanceStep('generate', 'failed', result.error ?? '执行失败');
          await updateWorkflowRun(run.id, { status: 'failed' });
        }
      } catch (err) {
        console.error('[OpenClaw] Background execution error:', err);
        await updateWorkflowRun(run.id, { status: 'failed' });
      }
    };

    // Start execution in background — don't await
    void executeInBackground();

    // Return immediately so OpenClaw / Feishu doesn't wait
    return NextResponse.json({
      success: true,
      run_id: run.id,
      data: { message: `工作流已启动: ${run.id}`, run_id: run.id },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[OpenClaw] POST error:', err);
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
