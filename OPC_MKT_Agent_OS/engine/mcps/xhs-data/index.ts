#!/usr/bin/env node
/**
 * 小红书数据 MCP Server
 *
 * 对接小红书数据采集和内容发布 API：
 * - 笔记数据回收、热搜话题、竞品监控、内容发布
 *
 * 传输方式：stdio
 *
 * 环境变量：
 * - XHS_API_URL — 数据 API 地址（可选，默认 mock）
 * - XHS_API_KEY — API 密钥（可选）
 * - XHS_COOKIE  — 小红书登录 Cookie（发布笔记用，可选）
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { tools, handleToolCall } from "./tools.js";

const server = new Server(
  { name: "xhs-data-mcp", version: "1.0.0" },
  { capabilities: { tools: {} } },
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools,
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  return handleToolCall(name, (args as Record<string, unknown>) || {});
});

const transport = new StdioServerTransport();
await server.connect(transport);
