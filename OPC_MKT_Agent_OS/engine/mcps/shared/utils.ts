/**
 * MCP Server 共享工具函数
 */

import type { ToolResult } from "./types.js";

/** 构建成功的 Tool 结果 */
export function okResult(data: unknown): ToolResult {
  return {
    content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
  };
}

/** 构建错误的 Tool 结果 */
export function errResult(message: string): ToolResult {
  return {
    content: [{ type: "text", text: JSON.stringify({ error: message }) }],
    isError: true,
  };
}

/** 安全获取环境变量 */
export function getEnv(key: string, fallback?: string): string {
  const val = process.env[key];
  if (!val && !fallback) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return val || fallback!;
}

/** 安全获取可选环境变量 */
export function getOptionalEnv(key: string): string | undefined {
  return process.env[key];
}
