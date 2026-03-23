/**
 * CreatorFlow MCP Server — 工具定义
 *
 * 对接 CreatorFlow API，提供：
 * - 竞品同步、素材管理、脚本生成、质量检查
 *
 * 环境变量：
 * - CREATORFLOW_API_URL — API 根地址
 * - CREATORFLOW_API_KEY — API 密钥
 */

import { okResult, errResult, getOptionalEnv } from "../shared/utils.js";
import type { ToolResult } from "../shared/types.js";

// ============================================================
// Tool Schema 定义
// ============================================================

export const tools = [
  {
    name: "creatorflow_sync_competitors",
    description:
      "同步竞品账号的最新笔记到本地数据库。输入竞品账号 ID 列表，返回同步结果。",
    inputSchema: {
      type: "object" as const,
      properties: {
        competitorIds: {
          type: "array",
          items: { type: "string" },
          description: "竞品账号 ID 列表",
        },
        platform: {
          type: "string",
          enum: ["xhs", "douyin", "x"],
          description: "平台（默认 xhs）",
        },
      },
      required: ["competitorIds"],
    },
  },
  {
    name: "creatorflow_create_material",
    description: "创建素材（标题 + 正文），存入 CreatorFlow 素材库。返回素材 ID。",
    inputSchema: {
      type: "object" as const,
      properties: {
        title: { type: "string", description: "素材标题" },
        content: { type: "string", description: "素材正文" },
        tags: {
          type: "array",
          items: { type: "string" },
          description: "标签列表",
        },
        channel: {
          type: "string",
          enum: ["xhs", "douyin", "x", "podcast"],
          description: "目标渠道",
        },
      },
      required: ["title", "content"],
    },
  },
  {
    name: "creatorflow_generate_script",
    description:
      "基于素材 ID 生成发布脚本（含标题、正文、标签、封面建议）。",
    inputSchema: {
      type: "object" as const,
      properties: {
        materialId: { type: "string", description: "素材 ID" },
        style: {
          type: "string",
          enum: ["casual", "professional", "storytelling", "data-driven"],
          description: "脚本风格（默认 casual）",
        },
      },
      required: ["materialId"],
    },
  },
  {
    name: "creatorflow_quality_check",
    description:
      "对内容进行质量检查，返回评分和改进建议（标题吸引力、正文可读性、CTA 强度、品牌一致性）。",
    inputSchema: {
      type: "object" as const,
      properties: {
        title: { type: "string", description: "标题" },
        content: { type: "string", description: "正文内容" },
        channel: {
          type: "string",
          enum: ["xhs", "douyin", "x", "podcast"],
          description: "目标渠道",
        },
      },
      required: ["title", "content"],
    },
  },
  {
    name: "creatorflow_list_materials",
    description:
      "查询素材库中的素材列表，支持按渠道、标签、状态筛选。",
    inputSchema: {
      type: "object" as const,
      properties: {
        channel: {
          type: "string",
          enum: ["xhs", "douyin", "x", "podcast"],
          description: "按渠道筛选",
        },
        tags: {
          type: "array",
          items: { type: "string" },
          description: "按标签筛选",
        },
        limit: {
          type: "number",
          description: "返回数量（默认 20）",
        },
      },
    },
  },
  {
    name: "creatorflow_trigger_workflow",
    description:
      "触发 CreatorFlow 工作流（如自动发布、定时推送、批量生成）。",
    inputSchema: {
      type: "object" as const,
      properties: {
        workflowId: { type: "string", description: "工作流 ID" },
        params: {
          type: "object",
          description: "工作流参数",
          additionalProperties: true,
        },
      },
      required: ["workflowId"],
    },
  },
  {
    name: "creatorflow_get_workflow_status",
    description: "查询工作流执行状态。",
    inputSchema: {
      type: "object" as const,
      properties: {
        executionId: { type: "string", description: "工作流执行 ID" },
      },
      required: ["executionId"],
    },
  },
];

// ============================================================
// Tool 调用处理
// ============================================================

const API_URL = getOptionalEnv("CREATORFLOW_API_URL") || "https://api.creatorflow.example.com";
const API_KEY = getOptionalEnv("CREATORFLOW_API_KEY");

/** 通用 API 请求封装 */
async function apiRequest(
  endpoint: string,
  method: "GET" | "POST" = "GET",
  body?: unknown,
): Promise<unknown> {
  if (!API_KEY) {
    // Mock 模式 — API key 未配置时返回模拟数据
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
    throw new Error(`CreatorFlow API error: ${res.status} ${res.statusText}`);
  }

  return res.json();
}

/** Mock 响应 — 无 API key 时使用 */
function mockResponse(endpoint: string, body?: unknown): unknown {
  const ts = new Date().toISOString();

  if (endpoint.includes("sync-competitors")) {
    const ids = (body as { competitorIds?: string[] })?.competitorIds || [];
    return {
      synced: ids.length,
      newPosts: ids.length * 3,
      lastSync: ts,
      competitors: ids.map((id) => ({
        id,
        newPosts: 3,
        topPost: { title: `[Mock] ${id} 的热门笔记`, likes: 1200, collects: 450 },
      })),
    };
  }

  if (endpoint.includes("materials") && !body) {
    return {
      materials: [
        { id: "mat_001", title: "[Mock] AI 效率工具盘点", channel: "xhs", tags: ["AI", "效率"], createdAt: ts },
        { id: "mat_002", title: "[Mock] 一人公司运营指南", channel: "xhs", tags: ["创业", "运营"], createdAt: ts },
      ],
      total: 2,
    };
  }

  if (endpoint.includes("materials") && body) {
    const mat = body as { title?: string };
    return {
      id: `mat_${Date.now().toString(36)}`,
      title: mat.title || "Untitled",
      status: "draft",
      createdAt: ts,
    };
  }

  if (endpoint.includes("generate-script")) {
    return {
      title: "[Mock] 自动生成的脚本标题",
      content: "[Mock] 这是根据素材自动生成的发布脚本正文...",
      tags: ["AI", "效率", "一人公司"],
      coverSuggestion: "建议使用数据图表或工具截图作为封面",
      generatedAt: ts,
    };
  }

  if (endpoint.includes("quality-check")) {
    return {
      overallScore: 78,
      breakdown: {
        titleAttractiveness: { score: 82, feedback: "[Mock] 标题有吸引力，建议加入数字增强冲击" },
        contentReadability: { score: 75, feedback: "[Mock] 段落稍长，建议拆分为短段落" },
        ctaStrength: { score: 70, feedback: "[Mock] CTA 可更明确，建议直接引导行动" },
        brandConsistency: { score: 85, feedback: "[Mock] 品牌调性一致" },
      },
      suggestions: ["加入 1-2 个数据点", "正文拆分为 3-5 个短段落", "结尾增加明确 CTA"],
    };
  }

  if (endpoint.includes("workflow") && endpoint.includes("status")) {
    return {
      executionId: "exec_mock_001",
      status: "completed",
      startedAt: ts,
      completedAt: ts,
      result: { publishedCount: 1 },
    };
  }

  if (endpoint.includes("workflow")) {
    return {
      executionId: `exec_${Date.now().toString(36)}`,
      status: "running",
      startedAt: ts,
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
      case "creatorflow_sync_competitors": {
        const data = await apiRequest("/v1/sync-competitors", "POST", {
          competitorIds: args.competitorIds,
          platform: args.platform || "xhs",
        });
        return okResult(data);
      }

      case "creatorflow_create_material": {
        const data = await apiRequest("/v1/materials", "POST", {
          title: args.title,
          content: args.content,
          tags: args.tags || [],
          channel: args.channel || "xhs",
        });
        return okResult(data);
      }

      case "creatorflow_generate_script": {
        const data = await apiRequest("/v1/generate-script", "POST", {
          materialId: args.materialId,
          style: args.style || "casual",
        });
        return okResult(data);
      }

      case "creatorflow_quality_check": {
        const data = await apiRequest("/v1/quality-check", "POST", {
          title: args.title,
          content: args.content,
          channel: args.channel || "xhs",
        });
        return okResult(data);
      }

      case "creatorflow_list_materials": {
        const params = new URLSearchParams();
        if (args.channel) params.set("channel", args.channel as string);
        if (args.limit) params.set("limit", String(args.limit));
        const qs = params.toString();
        const data = await apiRequest(`/v1/materials${qs ? `?${qs}` : ""}`);
        return okResult(data);
      }

      case "creatorflow_trigger_workflow": {
        const data = await apiRequest("/v1/workflows/trigger", "POST", {
          workflowId: args.workflowId,
          params: args.params || {},
        });
        return okResult(data);
      }

      case "creatorflow_get_workflow_status": {
        const data = await apiRequest(
          `/v1/workflows/executions/${args.executionId}/status`,
        );
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
