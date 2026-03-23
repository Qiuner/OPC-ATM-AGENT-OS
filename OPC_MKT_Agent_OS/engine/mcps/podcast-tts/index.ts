#!/usr/bin/env node
/**
 * Podcast TTS MCP Server
 *
 * 对接 TTS 服务，为播客 Agent 提供音频合成能力：
 * - 单人文字转语音、多角色对话合成、音频拼接、时长估算
 *
 * 传输方式：stdio
 *
 * 环境变量：
 * - TTS_API_URL — TTS 服务地址（可选，默认 mock）
 * - TTS_API_KEY — API 密钥（可选）
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { tools, handleToolCall } from "./tools.js";

const server = new Server(
  { name: "podcast-tts-mcp", version: "1.0.0" },
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
