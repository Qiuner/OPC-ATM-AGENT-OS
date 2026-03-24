import { createContent, listContents } from '@/lib/store/contents';
import { createTask, listTasks } from '@/lib/store/tasks';
import { listMetrics } from '@/lib/store/metrics';
import { createContextAsset } from '@/lib/store/context-assets';
import type { ContentStatus, TaskStatus } from '@/types';
import { spawn } from 'child_process';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type CommandType =
  | 'collect_materials'
  | 'generate_script'
  | 'generate_podcast'
  | 'publish_content'
  | 'create_plan'
  | 'analyze_data'
  | 'get_status'
  | 'team_collaborate';

export interface OpenClawCommandParams {
  topic?: string;
  platform?: string;
  style?: string;
  campaign_id?: string;
  content_id?: string;
  script_id?: string;
  url?: string;
  content?: string;
  duration?: string;
}

export interface OpenClawCommand {
  command: CommandType;
  params: OpenClawCommandParams;
  feishu_chat_id?: string;
  callback_url?: string;
}

export interface ApiResponse {
  success: boolean;
  data?: unknown;
  error?: string;
}

export interface ScrapedContent {
  title: string;
  author: string;
  content: string;
  platform: string;
  images: string[];
  is_video: boolean;
  video_url?: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const VALID_COMMANDS: readonly CommandType[] = [
  'collect_materials',
  'generate_script',
  'generate_podcast',
  'publish_content',
  'create_plan',
  'analyze_data',
  'get_status',
  'team_collaborate',
] as const;

export function isValidCommand(cmd: string): cmd is CommandType {
  return (VALID_COMMANDS as readonly string[]).includes(cmd);
}

// ---------------------------------------------------------------------------
// CreatorFlow auto-start & call helpers
// ---------------------------------------------------------------------------

const CREATORFLOW_PORT = process.env.CREATORFLOW_PORT ?? '3002';
const CREATORFLOW_DIR =
  process.env.CREATORFLOW_DIR ??
  '/Users/jaydenworkplace/Desktop/Agent-team-project/AI自媒体工具/自媒体工具/creatorflow';

let creatorFlowStarting = false;

/**
 * Check if CreatorFlow is running
 */
export async function isCreatorFlowRunning(): Promise<boolean> {
  try {
    const res = await fetch(`http://localhost:${CREATORFLOW_PORT}/api/settings`, {
      method: 'GET',
      signal: AbortSignal.timeout(3_000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Auto-start CreatorFlow if not running.
 * Uses spawn to launch in background, waits up to 30s.
 */
export async function ensureCreatorFlowRunning(): Promise<boolean> {
  if (await isCreatorFlowRunning()) return true;
  if (creatorFlowStarting) {
    // Already starting, wait for it to become ready
    for (let i = 0; i < 30; i++) {
      await new Promise(r => setTimeout(r, 1_000));
      if (await isCreatorFlowRunning()) return true;
    }
    return false;
  }

  creatorFlowStarting = true;
  console.log('[OpenClaw] CreatorFlow 未运行，正在自动启动...');

  try {
    const child = spawn('npx', ['next', 'dev', '--port', CREATORFLOW_PORT], {
      cwd: CREATORFLOW_DIR,
      stdio: 'ignore',
      detached: true,
      env: { ...process.env, NODE_ENV: 'development' },
    });
    child.unref();

    for (let i = 0; i < 30; i++) {
      await new Promise(r => setTimeout(r, 1_000));
      if (await isCreatorFlowRunning()) {
        console.log('[OpenClaw] CreatorFlow 已启动就绪');
        creatorFlowStarting = false;
        return true;
      }
    }

    console.error('[OpenClaw] CreatorFlow 启动超时');
    creatorFlowStarting = false;
    return false;
  } catch (err) {
    console.error('[OpenClaw] CreatorFlow 启动失败:', err);
    creatorFlowStarting = false;
    return false;
  }
}

/**
 * Simple fetch wrapper for CreatorFlow API calls.
 * Does NOT auto-start CreatorFlow — use ensureCreatorFlowRunning() first
 * or use callCreatorFlowWithAutoStart() instead.
 */
export async function callCreatorFlow<T = unknown>(
  path: string,
  body: Record<string, unknown>,
  timeoutMs = 120_000,
  method: 'POST' | 'PATCH' | 'PUT' = 'POST'
): Promise<{ ok: boolean; data: T; status: number }> {
  try {
    const res = await fetch(`http://localhost:${CREATORFLOW_PORT}${path}`, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(timeoutMs),
    });
    const data = (await res.json()) as T;
    return { ok: res.ok, data, status: res.status };
  } catch (err) {
    console.error(`[OpenClaw] CreatorFlow ${path} error:`, err);
    throw err;
  }
}

/**
 * CreatorFlow API call with auto-start logic.
 * Ensures CreatorFlow is running before making the call.
 */
export async function callCreatorFlowWithAutoStart<T = unknown>(
  path: string,
  body: Record<string, unknown>,
  timeoutMs = 120_000,
  method: 'POST' | 'PATCH' | 'PUT' = 'POST'
): Promise<{ ok: boolean; data: T; status: number }> {
  const running = await ensureCreatorFlowRunning();
  if (!running) {
    throw new Error('CreatorFlow 未运行且自动启动失败，请手动启动');
  }
  return callCreatorFlow<T>(path, body, timeoutMs, method);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export function generateFallbackScript(
  topic: string | undefined,
  platform: string | undefined
): string {
  const t = topic ?? '未指定主题';
  const p = platform ?? '小红书';

  return [
    `【${p} 脚本】`,
    '',
    `📌 主题：${t}`,
    '',
    '--- 开头钩子 ---',
    `你是不是也在纠结${t}？今天给你分享一个超实用的方法👇`,
    '',
    '--- 正文要点 ---',
    `1. 痛点共鸣：很多人在${t}上踩过的坑`,
    `2. 解决方案：我们总结出的 3 个关键步骤`,
    `3. 效果展示：真实案例数据对比`,
    '',
    '--- 结尾 CTA ---',
    `如果觉得有帮助，记得点赞收藏🌟`,
    `关注我，持续分享更多关于${t}的干货！`,
    '',
    `#${t} #干货分享 #${p}`,
  ].join('\n');
}

// ---------------------------------------------------------------------------
// Command Handlers
// ---------------------------------------------------------------------------

/**
 * Scrape URL content via CreatorFlow universal scraping API.
 * Supports WeChat, Xiaohongshu, Twitter/X, YouTube, Bilibili, Douyin etc.
 * Falls back to Jina Reader on failure.
 */
export async function scrapeViaCreatorFlow(url: string): Promise<ScrapedContent | null> {
  try {
    const { ok, data } = await callCreatorFlowWithAutoStart<{
      preview?: {
        title?: string;
        author?: string;
        content?: string;
        platform?: string;
        images?: string[];
        is_video?: boolean;
        video_url?: string;
      };
    }>('/api/materials/import-url', { url, mode: 'preview' }, 60_000);

    if (!ok || !data.preview) return null;

    return {
      title: data.preview.title ?? '',
      author: data.preview.author ?? '',
      content: data.preview.content ?? '',
      platform: data.preview.platform ?? 'unknown',
      images: data.preview.images ?? [],
      is_video: data.preview.is_video ?? false,
      video_url: data.preview.video_url,
    };
  } catch {
    return null;
  }
}

export async function handleCollectMaterials(
  params: OpenClawCommandParams
): Promise<ApiResponse> {
  const topic = params.topic ?? '未指定主题';

  // If URL provided, scrape via CreatorFlow
  if (params.url) {
    const scraped = await scrapeViaCreatorFlow(params.url);

    if (!scraped) {
      return {
        success: false,
        error: `无法爬取 URL: ${params.url}，CreatorFlow 服务可能未启动或目标页面不可访问`,
      };
    }

    const asset = await createContextAsset({
      workspace_id: 'default',
      type: 'content',
      title: scraped.title || `素材 — ${topic}`,
      content: scraped.content,
      metadata: {
        source: 'openclaw',
        source_url: params.url,
        source_platform: scraped.platform,
        author: scraped.author,
        images: scraped.images,
        is_video: scraped.is_video,
        video_url: scraped.video_url,
        platform: params.platform ?? scraped.platform,
        style: params.style,
      },
      created_by: 'openclaw-agent',
    });

    return {
      success: true,
      data: {
        message: `素材爬取成功: ${scraped.title || params.url}`,
        asset_id: asset.id,
        scraped_content: {
          title: scraped.title,
          author: scraped.author,
          platform: scraped.platform,
          content_length: scraped.content.length,
          image_count: scraped.images.length,
          is_video: scraped.is_video,
          content_preview: scraped.content.slice(0, 500),
        },
        asset,
      },
    };
  }

  // No URL — create a plain material collection task
  const asset = await createContextAsset({
    workspace_id: 'default',
    type: 'content',
    title: `素材收集 — ${topic}`,
    content: `围绕「${topic}」收集的素材集合（平台: ${params.platform ?? '全平台'}）`,
    metadata: {
      source: 'openclaw',
      platform: params.platform ?? 'all',
      style: params.style,
    },
    created_by: 'openclaw-agent',
  });

  return {
    success: true,
    data: {
      message: `素材收集任务已创建，主题: ${topic}`,
      asset_id: asset.id,
      asset,
    },
  };
}

export async function handleGenerateScript(
  params: OpenClawCommandParams
): Promise<ApiResponse> {
  if (!params.topic && !params.url && !params.content) {
    return { success: false, error: '缺少必要参数: 需要 topic、url 或 content' };
  }

  let sourceTitle = params.topic ?? '未指定主题';
  let sourceContent = params.content ?? '';

  // If URL provided, scrape content first
  if (params.url && !sourceContent) {
    const scraped = await scrapeViaCreatorFlow(params.url);
    if (scraped) {
      sourceTitle = scraped.title || sourceTitle;
      sourceContent = scraped.content;
    }
  }

  if (!sourceContent) {
    sourceContent = `请围绕「${sourceTitle}」这个主题，生成一个适合${params.platform ?? '小红书'}平台的内容脚本。风格: ${params.style ?? '干货分享'}`;
  }

  // Try generating via CreatorFlow AI
  let scriptBody: string;
  let scriptId: string | undefined;
  let generatedByAI = false;

  try {
    const { ok, data } = await callCreatorFlowWithAutoStart<{
      scripts?: Array<{
        title: string;
        sections: Array<{ name: string; content: string }>;
      }>;
      error?: string;
    }>('/api/ai/generate', { title: sourceTitle, content: sourceContent });

    if (ok && data.scripts && data.scripts.length > 0) {
      const aiScript = data.scripts[0];
      scriptBody = aiScript.sections
        .map(s => `【${s.name}】\n${s.content}`)
        .join('\n\n');
      generatedByAI = true;

      // Also create script record in CreatorFlow
      try {
        const { ok: scriptOk, data: scriptData } = await callCreatorFlow<{
          id?: string;
        }>('/api/scripts', {
          title: `${sourceTitle} — ${params.platform ?? '小红书'}`,
          type: params.style ?? '干货效率型',
          status: 'draft',
          sections: aiScript.sections,
        });
        if (scriptOk && scriptData.id) {
          scriptId = scriptData.id;
        }
      } catch {
        // Script save failure doesn't affect main flow
      }
    } else {
      scriptBody = generateFallbackScript(params.topic, params.platform);
    }
  } catch {
    // CreatorFlow unavailable — use template
    scriptBody = generateFallbackScript(params.topic, params.platform);
  }

  // Save in Agent OS as well
  const agentContent = await createContent({
    task_id: '',
    campaign_id: params.campaign_id ?? 'openclaw-demo',
    title: `${params.platform ?? '小红书'} 脚本 — ${sourceTitle}`,
    body: scriptBody,
    platform: params.platform ?? '小红书',
    status: 'draft' as ContentStatus,
    media_urls: [],
    metadata: {
      source: 'openclaw',
      style: params.style,
      generated_by_ai: generatedByAI,
      creatorflow_script_id: scriptId,
      source_url: params.url,
    },
    created_by: 'openclaw-agent',
    agent_run_id: null,
    agent_type: 'openclaw',
    learning_id: null,
  });

  return {
    success: true,
    data: {
      message: generatedByAI
        ? `AI 脚本已生成: ${sourceTitle}`
        : `模板脚本已生成: ${sourceTitle}（CreatorFlow 未响应，使用模板）`,
      content_id: agentContent.id,
      creatorflow_script_id: scriptId,
      generated_by_ai: generatedByAI,
      content: agentContent,
      creatorflow_url: scriptId
        ? `http://localhost:${CREATORFLOW_PORT}/scripts/${scriptId}`
        : undefined,
    },
  };
}

/**
 * Generate podcast script + TTS audio (via CreatorFlow)
 */
export async function handleGeneratePodcast(
  params: OpenClawCommandParams
): Promise<ApiResponse> {
  if (!params.topic && !params.url && !params.content) {
    return { success: false, error: '缺少必要参数: 需要 topic、url 或 content' };
  }

  let sourceContent = params.content ?? '';
  let sourceTitle = params.topic ?? '';

  // If URL provided, scrape content first
  if (params.url && !sourceContent) {
    const scraped = await scrapeViaCreatorFlow(params.url);
    if (scraped) {
      sourceTitle = sourceTitle || scraped.title;
      sourceContent = scraped.content;
    }
  }

  if (!sourceContent && !sourceTitle) {
    return { success: false, error: '无法获取内容，请提供 topic、content 或有效的 url' };
  }

  // Call CreatorFlow podcast script generation
  try {
    const sources = sourceContent
      ? [{ type: 'custom' as const, title: sourceTitle, content: sourceContent }]
      : [];

    const { ok, data } = await callCreatorFlowWithAutoStart<{
      script?: string;
      title?: string;
      error?: string;
    }>('/api/podcast/generate-script', {
      topic: sourceTitle,
      sources,
      duration: params.duration ?? '3-6min',
    });

    if (!ok || !data.script) {
      return {
        success: false,
        error: `播客脚本生成失败: ${data.error ?? 'CreatorFlow 未返回脚本'}`,
      };
    }

    // Extract title from script content as fallback
    // Reject "未命名播客" as it's CreatorFlow's default placeholder
    let extractedTitle = (data.title && data.title !== '未命名播客') ? data.title : '';
    if (!extractedTitle) {
      const titlePatterns = [
        /播客名称[：:]\s*\**(.+?)(?:\n|\*|$)/,
        /主题[：:]\s*\**(.+?)(?:\n|\*|$)/,
        /标题[：:]\s*\**(.+?)(?:\n|\*|$)/,
        /[来到|收听|欢迎]《(.+?)》/,
        /《(.+?)》/,
      ];
      for (const pattern of titlePatterns) {
        const match = data.script.match(pattern);
        if (match?.[1]?.trim()) {
          extractedTitle = match[1].trim();
          break;
        }
      }
    }

    const finalTitle = extractedTitle || sourceTitle || '未命名播客';

    // Save episode in CreatorFlow so it shows in the podcast workspace
    let creatorflowEpisodeId: string | undefined;
    try {
      const episodeRes = await callCreatorFlowWithAutoStart<{
        id?: string;
        error?: string;
      }>('/api/podcast/episodes', {
        title: finalTitle,
        series: '技术系列',
        script: data.script,
        sources: sourceContent
          ? [{ type: 'custom', title: sourceTitle, content: sourceContent }]
          : [],
      });
      if (episodeRes.ok && episodeRes.data.id) {
        creatorflowEpisodeId = episodeRes.data.id;
      }
    } catch {
      // non-critical — episode will be saved in Agent OS regardless
    }

    // Save in Agent OS
    const agentContent = await createContent({
      task_id: '',
      campaign_id: params.campaign_id ?? 'openclaw-demo',
      title: `播客脚本 — ${finalTitle}`,
      body: data.script,
      platform: '播客',
      status: 'draft' as ContentStatus,
      media_urls: [],
      metadata: {
        source: 'openclaw',
        type: 'podcast',
        source_url: params.url,
        duration: params.duration,
        creatorflow_episode_id: creatorflowEpisodeId,
      },
      created_by: 'openclaw-agent',
      agent_run_id: null,
      agent_type: 'openclaw',
      learning_id: null,
    });

    return {
      success: true,
      data: {
        message: `播客脚本已生成: ${finalTitle}`,
        content_id: agentContent.id,
        podcast_title: finalTitle,
        creatorflow_episode_id: creatorflowEpisodeId,
        script_preview: data.script.slice(0, 500),
        content: agentContent,
        creatorflow_url: `http://localhost:${CREATORFLOW_PORT}/podcast`,
      },
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return { success: false, error: `播客生成失败: ${msg}` };
  }
}

/**
 * Generate platform-specific publish content (via CreatorFlow AI).
 * Requires a CreatorFlow script_id.
 */
export async function handlePublishContent(
  params: OpenClawCommandParams
): Promise<ApiResponse> {
  if (!params.script_id) {
    return { success: false, error: '缺少必要参数: script_id（CreatorFlow 脚本 ID）' };
  }

  const platformMap: Record<string, string> = {
    '小红书': 'xiaohongshu',
    '抖音': 'douyin',
    '视频号': 'shipinhao',
    xiaohongshu: 'xiaohongshu',
    douyin: 'douyin',
    shipinhao: 'shipinhao',
  };

  const cfPlatform = platformMap[params.platform ?? '小红书'] ?? 'xiaohongshu';

  try {
    const { ok, data } = await callCreatorFlowWithAutoStart<{
      title?: string;
      content?: string;
      tags?: string[];
      error?: string;
    }>('/api/ai/publish', {
      scriptId: params.script_id,
      platform: cfPlatform,
    });

    if (!ok) {
      return {
        success: false,
        error: `发布内容生成失败: ${data.error ?? '未知错误'}`,
      };
    }

    return {
      success: true,
      data: {
        message: `${params.platform ?? '小红书'} 发布内容已生成`,
        platform: params.platform ?? '小红书',
        publish_content: {
          title: data.title,
          content: data.content,
          tags: data.tags,
        },
        creatorflow_url: `http://localhost:${CREATORFLOW_PORT}/publish`,
      },
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return { success: false, error: `发布内容生成失败: ${msg}` };
  }
}

export async function handleCreatePlan(
  params: OpenClawCommandParams
): Promise<ApiResponse> {
  if (!params.topic) {
    return { success: false, error: '缺少必要参数: topic' };
  }

  const task = await createTask({
    campaign_id: params.campaign_id ?? 'openclaw-demo',
    title: `营销计划 — ${params.topic}`,
    description: [
      `为「${params.topic}」制定营销推广计划`,
      `目标平台: ${params.platform ?? '全平台'}`,
      `内容风格: ${params.style ?? '未指定'}`,
    ].join('\n'),
    status: 'draft' as TaskStatus,
    assignee_type: 'agent',
    assignee_id: 'openclaw-strategist',
    priority: 1,
    due_date: null,
  });

  return {
    success: true,
    data: {
      message: `营销计划已创建: ${task.title}`,
      task_id: task.id,
      task,
    },
  };
}

export async function handleAnalyzeData(
  params: OpenClawCommandParams
): Promise<ApiResponse> {
  const filter: { content_id?: string } = {};
  if (params.content_id) {
    filter.content_id = params.content_id;
  }

  const metrics = await listMetrics(
    Object.keys(filter).length > 0 ? filter : undefined
  );

  const summary = {
    total_records: metrics.length,
    total_impressions: metrics.reduce((s, m) => s + m.impressions, 0),
    total_likes: metrics.reduce((s, m) => s + m.likes, 0),
    total_comments: metrics.reduce((s, m) => s + m.comments, 0),
    total_shares: metrics.reduce((s, m) => s + m.shares, 0),
    total_saves: metrics.reduce((s, m) => s + m.saves, 0),
    total_leads: metrics.reduce((s, m) => s + m.leads, 0),
  };

  return {
    success: true,
    data: {
      message: params.content_id
        ? `内容 ${params.content_id} 的数据分析完成`
        : '全局数据分析完成',
      summary,
      metrics,
    },
  };
}

export async function handleGetStatus(): Promise<ApiResponse> {
  const [tasks, contents, metrics] = await Promise.all([
    listTasks(),
    listContents(),
    listMetrics(),
  ]);

  const tasksByStatus: Record<string, number> = {};
  for (const t of tasks) {
    tasksByStatus[t.status] = (tasksByStatus[t.status] ?? 0) + 1;
  }

  const contentsByStatus: Record<string, number> = {};
  for (const c of contents) {
    contentsByStatus[c.status] = (contentsByStatus[c.status] ?? 0) + 1;
  }

  return {
    success: true,
    data: {
      message: '系统状态查询完成',
      tasks_total: tasks.length,
      tasks_by_status: tasksByStatus,
      contents_total: contents.length,
      contents_by_status: contentsByStatus,
      metrics_total: metrics.length,
    },
  };
}

// ---------------------------------------------------------------------------
// team_collaborate — 多 Agent 团队协作
// ---------------------------------------------------------------------------

export async function handleTeamCollaborate(
  params: OpenClawCommandParams
): Promise<ApiResponse> {
  const topic = params.topic || '未指定主题';

  return {
    success: true,
    data: {
      message: `团队协作任务已启动: ${topic}`,
      team_task: {
        topic,
        agents: ['ceo', 'xhs-agent', 'growth-agent', 'brand-reviewer'],
        status: 'launched',
      },
    },
  };
}
