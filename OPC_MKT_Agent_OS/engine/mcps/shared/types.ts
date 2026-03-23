/**
 * MCP Server 共享类型定义
 */

/** MCP Tool 调用结果 */
export interface ToolResult {
  content: Array<{ type: "text"; text: string }>;
  isError?: boolean;
  [key: string]: unknown;
}

/** 通用 API 响应 */
export interface APIResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

/** 环境变量配置 */
export interface EnvConfig {
  [key: string]: string | undefined;
}
