/**
 * 小红书数据 MCP Server — 工具定义
 *
 * 对接小红书数据采集和内容发布：
 * - 笔记数据回收、热搜话题、竞品监控、内容发布
 *
 * 环境变量：
 * - XHS_API_URL — 小红书数据 API 地址
 * - XHS_API_KEY — API 密钥
 * - XHS_COOKIE  — 小红书登录 Cookie（发布用）
 */

import { okResult, errResult, getOptionalEnv } from "../shared/utils.js";
import type { ToolResult } from "../shared/types.js";

// ============================================================
// Tool Schema 定义
// ============================================================

export const tools = [
  {
    name: "xhs_get_note_metrics",
    description:
      "获取小红书笔记的详细数据指标（点赞、收藏、评论、分享、浏览量）。",
    inputSchema: {
      type: "object" as const,
      properties: {
        noteId: { type: "string", description: "笔记 ID" },
      },
      required: ["noteId"],
    },
  },
  {
    name: "xhs_batch_get_metrics",
    description:
      "批量获取多篇笔记的数据指标，用于数据飞轮分析。",
    inputSchema: {
      type: "object" as const,
      properties: {
        noteIds: {
          type: "array",
          items: { type: "string" },
          description: "笔记 ID 列表（最多 50）",
        },
      },
      required: ["noteIds"],
    },
  },
  {
    name: "xhs_get_trending_topics",
    description:
      "获取小红书当前热搜话题和趋势关键词，用于选题参考。",
    inputSchema: {
      type: "object" as const,
      properties: {
        category: {
          type: "string",
          enum: ["general", "tech", "lifestyle", "business", "education"],
          description: "话题分类（默认 general）",
        },
        limit: {
          type: "number",
          description: "返回数量（默认 20）",
        },
      },
    },
  },
  {
    name: "xhs_search_notes",
    description:
      "搜索小红书笔记，按关键词、排序方式筛选，用于竞品分析。",
    inputSchema: {
      type: "object" as const,
      properties: {
        keyword: { type: "string", description: "搜索关键词" },
        sortBy: {
          type: "string",
          enum: ["relevance", "likes", "time"],
          description: "排序方式（默认 relevance）",
        },
        limit: {
          type: "number",
          description: "返回数量（默认 20）",
        },
      },
      required: ["keyword"],
    },
  },
  {
    name: "xhs_get_user_profile",
    description:
      "获取小红书用户主页信息（粉丝数、笔记数、获赞数、简介）。",
    inputSchema: {
      type: "object" as const,
      properties: {
        userId: { type: "string", description: "用户 ID" },
      },
      required: ["userId"],
    },
  },
  {
    name: "xhs_get_user_notes",
    description:
      "获取某用户的笔记列表（含基础数据），用于竞品监控。",
    inputSchema: {
      type: "object" as const,
      properties: {
        userId: { type: "string", description: "用户 ID" },
        limit: {
          type: "number",
          description: "返回数量（默认 20）",
        },
        sortBy: {
          type: "string",
          enum: ["time", "likes"],
          description: "排序方式（默认 time）",
        },
      },
      required: ["userId"],
    },
  },
  {
    name: "xhs_publish_note",
    description:
      "发布小红书笔记（需要配置 XHS_COOKIE）。返回发布结果和笔记 ID。",
    inputSchema: {
      type: "object" as const,
      properties: {
        title: { type: "string", description: "笔记标题" },
        content: { type: "string", description: "笔记正文" },
        tags: {
          type: "array",
          items: { type: "string" },
          description: "标签列表",
        },
        images: {
          type: "array",
          items: { type: "string" },
          description: "图片 URL 列表",
        },
      },
      required: ["title", "content"],
    },
  },
];

// ============================================================
// Tool 调用处理
// ============================================================

const API_URL = getOptionalEnv("XHS_API_URL") || "https://xhs-data-api.example.com";
const API_KEY = getOptionalEnv("XHS_API_KEY");

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
    throw new Error(`XHS Data API error: ${res.status} ${res.statusText}`);
  }

  return res.json();
}

/** Mock 响应 */
function mockResponse(endpoint: string, body?: unknown): unknown {
  const ts = new Date().toISOString();

  if (endpoint.includes("metrics") && endpoint.includes("batch")) {
    const ids = (body as { noteIds?: string[] })?.noteIds || [];
    return {
      metrics: ids.map((id, i) => ({
        noteId: id,
        likes: 800 + i * 120,
        collects: 300 + i * 50,
        comments: 45 + i * 10,
        shares: 20 + i * 5,
        views: 5000 + i * 800,
        performanceScore: 72 + i * 3,
        recordedAt: ts,
      })),
    };
  }

  if (endpoint.includes("metrics")) {
    return {
      noteId: (body as { noteId?: string })?.noteId || "note_unknown",
      likes: 1250,
      collects: 480,
      comments: 67,
      shares: 32,
      views: 8500,
      performanceScore: 82,
      recordedAt: ts,
    };
  }

  if (endpoint.includes("trending")) {
    return {
      topics: [
        { rank: 1, keyword: "AI 工具推荐", heat: 98500, trend: "rising" },
        { rank: 2, keyword: "一人公司", heat: 76200, trend: "stable" },
        { rank: 3, keyword: "效率神器", heat: 65800, trend: "rising" },
        { rank: 4, keyword: "副业赚钱", heat: 54300, trend: "stable" },
        { rank: 5, keyword: "知识管理", heat: 43100, trend: "new" },
      ],
      updatedAt: ts,
    };
  }

  if (endpoint.includes("search")) {
    const kw = (body as { keyword?: string })?.keyword || "";
    return {
      notes: [
        {
          noteId: "note_mock_001",
          title: `[Mock] ${kw} 完整指南`,
          author: "效率控小王",
          likes: 2300,
          collects: 890,
          publishedAt: ts,
        },
        {
          noteId: "note_mock_002",
          title: `[Mock] ${kw} 实战分享`,
          author: "AI 探索者",
          likes: 1800,
          collects: 650,
          publishedAt: ts,
        },
      ],
      total: 2,
    };
  }

  if (endpoint.includes("users") && endpoint.includes("notes")) {
    return {
      notes: [
        { noteId: "note_mock_u1", title: "[Mock] 用户最新笔记 1", likes: 500, publishedAt: ts },
        { noteId: "note_mock_u2", title: "[Mock] 用户最新笔记 2", likes: 320, publishedAt: ts },
      ],
      total: 2,
    };
  }

  if (endpoint.includes("users")) {
    return {
      userId: (body as { userId?: string })?.userId || "user_unknown",
      nickname: "[Mock] AI 效率博主",
      followers: 12500,
      notes: 86,
      totalLikes: 95000,
      bio: "分享 AI 工具和效率技巧",
    };
  }

  if (endpoint.includes("publish")) {
    return {
      noteId: `note_${Date.now().toString(36)}`,
      status: "published",
      url: `https://www.xiaohongshu.com/explore/mock_${Date.now().toString(36)}`,
      publishedAt: ts,
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
      case "xhs_get_note_metrics": {
        const data = await apiRequest("/v1/notes/metrics", "POST", {
          noteId: args.noteId,
        });
        return okResult(data);
      }

      case "xhs_batch_get_metrics": {
        const ids = args.noteIds as string[];
        if (!ids || ids.length === 0) return errResult("noteIds cannot be empty");
        if (ids.length > 50) return errResult("Maximum 50 note IDs per request");
        const data = await apiRequest("/v1/notes/metrics/batch", "POST", {
          noteIds: ids,
        });
        return okResult(data);
      }

      case "xhs_get_trending_topics": {
        const params = new URLSearchParams();
        if (args.category) params.set("category", args.category as string);
        if (args.limit) params.set("limit", String(args.limit));
        const qs = params.toString();
        const data = await apiRequest(`/v1/trending${qs ? `?${qs}` : ""}`);
        return okResult(data);
      }

      case "xhs_search_notes": {
        const data = await apiRequest("/v1/notes/search", "POST", {
          keyword: args.keyword,
          sortBy: args.sortBy || "relevance",
          limit: args.limit || 20,
        });
        return okResult(data);
      }

      case "xhs_get_user_profile": {
        const data = await apiRequest(`/v1/users/${args.userId}`);
        return okResult(data);
      }

      case "xhs_get_user_notes": {
        const params = new URLSearchParams();
        if (args.limit) params.set("limit", String(args.limit));
        if (args.sortBy) params.set("sortBy", args.sortBy as string);
        const qs = params.toString();
        const data = await apiRequest(
          `/v1/users/${args.userId}/notes${qs ? `?${qs}` : ""}`,
        );
        return okResult(data);
      }

      case "xhs_publish_note": {
        if (!getOptionalEnv("XHS_COOKIE")) {
          return errResult(
            "XHS_COOKIE not configured. Cannot publish notes without authentication.",
          );
        }
        const data = await apiRequest("/v1/notes/publish", "POST", {
          title: args.title,
          content: args.content,
          tags: args.tags || [],
          images: args.images || [],
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
