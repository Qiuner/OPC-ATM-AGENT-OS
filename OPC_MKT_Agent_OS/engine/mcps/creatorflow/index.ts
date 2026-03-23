#!/usr/bin/env node
/**
 * CreatorFlow MCP Server
 *
 * 对接 CreatorFlow API，为 Agent 提供内容管理工具：
 * - 竞品同步、素材管理、脚本生成、质量检查、工作流触发
 *
 * 传输方式：stdio（被 Claude Agent SDK 自动启动和管理）
 *
 * 环境变量：
 * - CREATORFLOW_API_URL — API 根地址（可选，默认 mock）
 * - CREATORFLOW_API_KEY — API 密钥（可选，无 key 时使用 mock 数据）
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { tools, handleToolCall } from "./tools.js";

const server = new Server(
  { name: "creatorflow-mcp", version: "1.0.0" },
  { capabilities: { tools: {} } },
);

// 列出可用工具
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools,
}));

// 处理工具调用
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  return handleToolCall(name, (args as Record<string, unknown>) || {});
});

// 启动 stdio 传输
const transport = new StdioServerTransport();
await server.connect(transport);
