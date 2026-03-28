/**
 * 小红书数据 MCP Server — 工具定义
 *
 * 数据采集（mock / API）+ 真实发布（Playwright 浏览器自动化）：
 * - 笔记数据回收、热搜话题、竞品监控 → mock 或 XHS_API_URL
 * - 登录检测、QR 扫码、笔记发布     → 内置 Playwright
 *
 * 环境变量（均可选）：
 * - XHS_API_URL — 数据 API 地址（无配置时使用 mock）
 * - XHS_API_KEY — API 密钥（无配置时使用 mock）
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
      "通过 Playwright 浏览器自动化发布小红书笔记。需要先登录（调用 xhs_login）。",
    inputSchema: {
      type: "object" as const,
      properties: {
        title: { type: "string", description: "笔记标题（≤20字）" },
        content: { type: "string", description: "笔记正文" },
        tags: {
          type: "array",
          items: { type: "string" },
          description: "话题标签列表",
        },
        images: {
          type: "array",
          items: { type: "string" },
          description: "图片本地文件路径列表",
        },
      },
      required: ["title", "content"],
    },
  },
  {
    name: "xhs_search_top_posts",
    description:
      "通过 Playwright 搜索小红书热门笔记（真实数据）。返回笔记 ID、标题、作者、点赞数、封面链接。用于分析竞品爆款模式。需先登录。",
    inputSchema: {
      type: "object" as const,
      properties: {
        keyword: { type: "string", description: "搜索关键词" },
        sortBy: {
          type: "string",
          enum: ["general", "most_popular", "latest"],
          description: "排序方式：general(综合), most_popular(最热), latest(最新)。默认 general",
        },
        limit: {
          type: "number",
          description: "返回数量（默认 10，最多 30）",
        },
      },
      required: ["keyword"],
    },
  },
  {
    name: "xhs_get_post_detail",
    description:
      "通过 Playwright 获取小红书笔记完整详情（真实数据）。返回标题、正文全文、互动数据、话题标签、图片列表、Top 评论。用于深度分析爆款内容。需先登录。",
    inputSchema: {
      type: "object" as const,
      properties: {
        noteId: { type: "string", description: "笔记 ID（从搜索结果中获取）" },
      },
      required: ["noteId"],
    },
  },
  {
    name: "xhs_check_login",
    description:
      "检查小红书登录状态，返回是否已登录和用户名。发布前应先检查登录态。",
    inputSchema: {
      type: "object" as const,
      properties: {},
    },
  },
  {
    name: "xhs_login",
    description:
      "启动小红书 QR 码扫码登录。将打开浏览器窗口，用户需用小红书 App 扫码完成登录。登录成功后 cookie 自动持久化，后续发布无需再次登录。",
    inputSchema: {
      type: "object" as const,
      properties: {},
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
        const browser = await import("./browser.js");
        const loginStatus = await browser.checkLogin();
        if (!loginStatus.loggedIn) {
          return errResult(
            "未登录小红书。请先调用 xhs_login 工具扫码登录。",
          );
        }
        const result = await browser.publishNote({
          title: args.title as string,
          content: args.content as string,
          tags: (args.tags as string[]) || [],
          images: (args.images as string[]) || [],
        });
        if (result.success) return okResult(result);
        return errResult(result.error || "发布失败");
      }

      case "xhs_search_top_posts": {
        const browser = await import("./browser.js");
        const loginStatus = await browser.checkLogin();
        if (!loginStatus.loggedIn) {
          return errResult(
            "未登录小红书。请先调用 xhs_login 工具扫码登录，然后重新搜索。",
          );
        }
        const result = await browser.searchNotes(args.keyword as string, {
          sortBy: (args.sortBy as "general" | "most_popular" | "latest") || "general",
          limit: Math.min(Number(args.limit) || 10, 30),
        });
        if (result.notes.length === 0) {
          return errResult(
            "搜索未返回结果。可能原因：关键词无匹配、页面结构变化、网络超时。请尝试更换关键词或稍后重试。",
          );
        }
        return okResult(result);
      }

      case "xhs_get_post_detail": {
        const browser = await import("./browser.js");
        const loginStatus = await browser.checkLogin();
        if (!loginStatus.loggedIn) {
          return errResult(
            "未登录小红书。请先调用 xhs_login 工具扫码登录。",
          );
        }
        const detail = await browser.getNoteDetail(args.noteId as string);
        if (!detail) {
          return errResult(
            "获取笔记详情失败。可能原因：笔记已删除、noteId 无效、页面结构变化。",
          );
        }
        return okResult(detail);
      }

      case "xhs_check_login": {
        const browser = await import("./browser.js");
        return okResult(await browser.checkLogin());
      }

      case "xhs_login": {
        const browser = await import("./browser.js");
        return okResult(await browser.startQRLogin());
      }

      default:
        return errResult(`Unknown tool: ${name}`);
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return errResult(msg);
  }
}
