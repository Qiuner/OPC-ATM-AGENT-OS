/**
 * 小红书数据 MCP Server — 工具定义
 *
 * 基于 Playwright 浏览器自动化：
 * - 搜索热门笔记、获取笔记详情  → 竞品分析
 * - 登录检测、QR 扫码登录       → 会话管理
 * - 笔记发布                    → 自动发布
 */

import { okResult, errResult } from "../shared/utils.js";
import type { ToolResult } from "../shared/types.js";

// ============================================================
// Tool Schema 定义
// ============================================================

export const tools = [
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
];

// ============================================================
// Tool 调用路由
// ============================================================

export async function handleToolCall(
  name: string,
  args: Record<string, unknown>,
): Promise<ToolResult> {
  try {
    switch (name) {
      case "xhs_check_login": {
        const browser = await import("./browser.js");
        return okResult(await browser.checkLogin());
      }

      case "xhs_login": {
        const browser = await import("./browser.js");
        return okResult(await browser.startQRLogin());
      }

      case "xhs_search_top_posts": {
        const browser = await import("./browser.js");
        const loginStatus = await browser.checkLogin();
        if (!loginStatus.loggedIn) {
          return errResult(
            "未登录小红书。请先在设置页面完成小红书扫码登录，然后重新搜索。",
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
            "未登录小红书。请先在设置页面完成小红书扫码登录。",
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

      case "xhs_publish_note": {
        const browser = await import("./browser.js");
        const loginStatus = await browser.checkLogin();
        if (!loginStatus.loggedIn) {
          return errResult(
            "未登录小红书。请先在设置页面完成小红书扫码登录。",
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

      default:
        return errResult(`Unknown tool: ${name}`);
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return errResult(msg);
  }
}
