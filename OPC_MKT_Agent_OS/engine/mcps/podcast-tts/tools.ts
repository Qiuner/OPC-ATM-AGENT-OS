/**
 * Podcast TTS MCP Server — 工具定义
 *
 * 对接 TTS 服务，提供：
 * - 文字转语音、多角色音频合成、播客音频拼接、音频状态查询
 *
 * 环境变量：
 * - TTS_API_URL — TTS 服务地址
 * - TTS_API_KEY — API 密钥
 */

import { okResult, errResult, getOptionalEnv } from "../shared/utils.js";
import type { ToolResult } from "../shared/types.js";

// ============================================================
// Tool Schema 定义
// ============================================================

export const tools = [
  {
    name: "tts_synthesize",
    description:
      "将文本转换为语音音频。支持选择声音角色和语速。返回音频文件 URL。",
    inputSchema: {
      type: "object" as const,
      properties: {
        text: { type: "string", description: "要转换的文本" },
        voice: {
          type: "string",
          enum: [
            "male-narrator",
            "female-narrator",
            "male-casual",
            "female-casual",
            "male-professional",
            "female-professional",
          ],
          description: "声音角色（默认 male-narrator）",
        },
        speed: {
          type: "number",
          description: "语速倍率（0.5-2.0，默认 1.0）",
        },
        language: {
          type: "string",
          enum: ["zh-CN", "en-US", "zh-TW"],
          description: "语言（默认 zh-CN）",
        },
      },
      required: ["text"],
    },
  },
  {
    name: "tts_synthesize_dialogue",
    description:
      "将多角色对话脚本转换为音频。每段对话可指定不同声音角色。适用于对谈/圆桌式播客。",
    inputSchema: {
      type: "object" as const,
      properties: {
        segments: {
          type: "array",
          items: {
            type: "object",
            properties: {
              speaker: { type: "string", description: "说话人名称" },
              voice: {
                type: "string",
                description: "声音角色 ID",
              },
              text: { type: "string", description: "对话文本" },
              pause_after_ms: {
                type: "number",
                description: "段后停顿毫秒（默认 500）",
              },
            },
            required: ["speaker", "text"],
          },
          description: "对话段落列表",
        },
        title: { type: "string", description: "播客标题（用于文件命名）" },
      },
      required: ["segments"],
    },
  },
  {
    name: "tts_merge_audio",
    description:
      "将多个音频片段合并为一个完整的播客音频文件。支持添加间隔和背景音乐。",
    inputSchema: {
      type: "object" as const,
      properties: {
        audioUrls: {
          type: "array",
          items: { type: "string" },
          description: "音频文件 URL 列表（按顺序拼接）",
        },
        gapMs: {
          type: "number",
          description: "片段间间隔毫秒（默认 1000）",
        },
        bgmUrl: {
          type: "string",
          description: "背景音乐 URL（可选）",
        },
        bgmVolume: {
          type: "number",
          description: "背景音乐音量（0-1，默认 0.1）",
        },
        outputFormat: {
          type: "string",
          enum: ["mp3", "wav", "m4a"],
          description: "输出格式（默认 mp3）",
        },
      },
      required: ["audioUrls"],
    },
  },
  {
    name: "tts_get_voices",
    description: "获取可用的声音角色列表，含预览音频 URL。",
    inputSchema: {
      type: "object" as const,
      properties: {
        language: {
          type: "string",
          enum: ["zh-CN", "en-US", "zh-TW"],
          description: "按语言筛选（可选）",
        },
      },
    },
  },
  {
    name: "tts_get_job_status",
    description: "查询 TTS 合成任务的状态（排队中/处理中/完成/失败）。",
    inputSchema: {
      type: "object" as const,
      properties: {
        jobId: { type: "string", description: "任务 ID" },
      },
      required: ["jobId"],
    },
  },
  {
    name: "tts_estimate_duration",
    description:
      "估算文本转语音后的音频时长（秒），用于播客时长规划。",
    inputSchema: {
      type: "object" as const,
      properties: {
        text: { type: "string", description: "文本内容" },
        speed: {
          type: "number",
          description: "语速倍率（默认 1.0）",
        },
      },
      required: ["text"],
    },
  },
];

// ============================================================
// Tool 调用处理
// ============================================================

const API_URL = getOptionalEnv("TTS_API_URL") || "https://tts-api.example.com";
const API_KEY = getOptionalEnv("TTS_API_KEY");

/** 通用 API 请求 */
async function apiRequest(
  endpoint: string,
  method: "GET" | "POST" = "GET",
  body?: unknown,
): Promise<unknown> {
  if (!API_KEY) {
    return mockResponse(endpoint, body);
  }

  const res = await fetch(`${API_URL}${endpoint}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${API_KEY}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    throw new Error(`TTS API error: ${res.status} ${res.statusText}`);
  }

  return res.json();
}

/** 估算中文文本朗读时长（秒）— 大约 4 字/秒 */
function estimateDuration(text: string, speed: number = 1.0): number {
  const charCount = text.replace(/\s/g, "").length;
  return Math.round((charCount / 4 / speed) * 10) / 10;
}

/** Mock 响应 */
function mockResponse(endpoint: string, body?: unknown): unknown {
  const ts = new Date().toISOString();
  const jobId = `tts_${Date.now().toString(36)}`;

  if (endpoint.includes("synthesize") && endpoint.includes("dialogue")) {
    const segments = (body as { segments?: Array<{ text: string }> })?.segments || [];
    const totalText = segments.map((s) => s.text).join("");
    const duration = estimateDuration(totalText);
    return {
      jobId,
      status: "completed",
      audioUrl: `https://tts-mock.example.com/audio/${jobId}.mp3`,
      duration,
      segments: segments.length,
      createdAt: ts,
    };
  }

  if (endpoint.includes("synthesize")) {
    const text = (body as { text?: string })?.text || "";
    const speed = (body as { speed?: number })?.speed || 1.0;
    const duration = estimateDuration(text, speed);
    return {
      jobId,
      status: "completed",
      audioUrl: `https://tts-mock.example.com/audio/${jobId}.mp3`,
      duration,
      characterCount: text.length,
      createdAt: ts,
    };
  }

  if (endpoint.includes("merge")) {
    const urls = (body as { audioUrls?: string[] })?.audioUrls || [];
    return {
      jobId,
      status: "completed",
      audioUrl: `https://tts-mock.example.com/audio/${jobId}_merged.mp3`,
      inputCount: urls.length,
      createdAt: ts,
    };
  }

  if (endpoint.includes("voices")) {
    return {
      voices: [
        { id: "male-narrator", name: "男性旁白", language: "zh-CN", previewUrl: "https://tts-mock.example.com/preview/male-narrator.mp3" },
        { id: "female-narrator", name: "女性旁白", language: "zh-CN", previewUrl: "https://tts-mock.example.com/preview/female-narrator.mp3" },
        { id: "male-casual", name: "男性休闲", language: "zh-CN", previewUrl: "https://tts-mock.example.com/preview/male-casual.mp3" },
        { id: "female-casual", name: "女性休闲", language: "zh-CN", previewUrl: "https://tts-mock.example.com/preview/female-casual.mp3" },
        { id: "male-professional", name: "男性专业", language: "zh-CN", previewUrl: "https://tts-mock.example.com/preview/male-professional.mp3" },
        { id: "female-professional", name: "女性专业", language: "zh-CN", previewUrl: "https://tts-mock.example.com/preview/female-professional.mp3" },
      ],
    };
  }

  if (endpoint.includes("jobs") || endpoint.includes("status")) {
    return {
      jobId: (body as { jobId?: string })?.jobId || jobId,
      status: "completed",
      audioUrl: `https://tts-mock.example.com/audio/${jobId}.mp3`,
      createdAt: ts,
      completedAt: ts,
    };
  }

  if (endpoint.includes("estimate")) {
    const text = (body as { text?: string })?.text || "";
    const speed = (body as { speed?: number })?.speed || 1.0;
    return {
      estimatedDuration: estimateDuration(text, speed),
      characterCount: text.length,
      speed,
    };
  }

  return { mock: true, message: "Unknown endpoint" };
}

// ============================================================
// Tool 调用路由
// ============================================================

export async function handleToolCall(
  name: string,
  args: Record<string, unknown>,
): Promise<ToolResult> {
  try {
    switch (name) {
      case "tts_synthesize": {
        const text = args.text as string;
        if (!text || text.trim().length === 0) return errResult("text cannot be empty");
        const data = await apiRequest("/v1/synthesize", "POST", {
          text,
          voice: args.voice || "male-narrator",
          speed: args.speed || 1.0,
          language: args.language || "zh-CN",
        });
        return okResult(data);
      }

      case "tts_synthesize_dialogue": {
        const segments = args.segments as Array<unknown>;
        if (!segments || segments.length === 0) return errResult("segments cannot be empty");
        const data = await apiRequest("/v1/synthesize/dialogue", "POST", {
          segments,
          title: args.title || "untitled",
        });
        return okResult(data);
      }

      case "tts_merge_audio": {
        const urls = args.audioUrls as string[];
        if (!urls || urls.length < 2) return errResult("Need at least 2 audio URLs to merge");
        const data = await apiRequest("/v1/merge", "POST", {
          audioUrls: urls,
          gapMs: args.gapMs || 1000,
          bgmUrl: args.bgmUrl,
          bgmVolume: args.bgmVolume || 0.1,
          outputFormat: args.outputFormat || "mp3",
        });
        return okResult(data);
      }

      case "tts_get_voices": {
        const params = new URLSearchParams();
        if (args.language) params.set("language", args.language as string);
        const qs = params.toString();
        const data = await apiRequest(`/v1/voices${qs ? `?${qs}` : ""}`);
        return okResult(data);
      }

      case "tts_get_job_status": {
        const data = await apiRequest(`/v1/jobs/${args.jobId}/status`);
        return okResult(data);
      }

      case "tts_estimate_duration": {
        const text = args.text as string;
        if (!text) return errResult("text cannot be empty");
        const data = await apiRequest("/v1/estimate", "POST", {
          text,
          speed: args.speed || 1.0,
        });
        return okResult(data);
      }

      default:
        return errResult(`Unknown tool: ${name}`);
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return errResult(msg);
  }
}
