/**
 * Pipeline Diagnostic Logger — 全链路日志追踪
 *
 * 每次 Agent 执行生成一个 session log 文件，记录：
 * 1. Agent 启动参数（CLI args、MCP servers、env keys）
 * 2. 流式输出摘要（text chunks、tool calls、tool results）
 * 3. 提交到审批的原始数据
 * 4. Haiku 解析请求/响应
 * 5. 最终存储结果
 *
 * 日志写到 engine/output/pipeline-logs/<timestamp>-<agentId>.jsonl
 */

import { join } from 'node:path'
import { mkdirSync, appendFileSync, existsSync } from 'node:fs'

// ── Log directory ──

function getLogDir(): string {
  const dir = join(__dirname, '../../..', 'engine', 'output', 'pipeline-logs')
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true })
  }
  return dir
}

// ── Active session tracking ──

let currentLogFile: string | null = null
let currentSessionId: string | null = null

/**
 * Start a new log session for an agent execution.
 * Returns the session ID.
 */
export function startLogSession(agentId: string): string {
  const ts = new Date().toISOString().replace(/[:.]/g, '-')
  const sessionId = `${ts}_${agentId}`
  const logFile = join(getLogDir(), `${sessionId}.jsonl`)
  currentLogFile = logFile
  currentSessionId = sessionId

  pipelineLog('session_start', {
    agentId,
    timestamp: new Date().toISOString(),
    nodeVersion: process.version,
    platform: process.platform,
  })

  return sessionId
}

/**
 * Write a structured log entry to the current session file.
 */
export function pipelineLog(
  stage: string,
  data: Record<string, unknown>,
  level: 'info' | 'warn' | 'error' = 'info'
): void {
  const entry = {
    ts: new Date().toISOString(),
    level,
    stage,
    ...data,
  }

  // Always log to console
  const prefix = `[Pipeline:${stage}]`
  if (level === 'error') {
    console.error(prefix, JSON.stringify(data, null, 0).slice(0, 500))
  } else if (level === 'warn') {
    console.warn(prefix, JSON.stringify(data, null, 0).slice(0, 300))
  } else {
    console.log(prefix, JSON.stringify(data, null, 0).slice(0, 300))
  }

  // Write to file if session is active
  if (currentLogFile) {
    try {
      appendFileSync(currentLogFile, JSON.stringify(entry) + '\n', 'utf-8')
    } catch (err) {
      console.error('[PipelineLogger] Failed to write log:', err)
    }
  }
}

/**
 * End the current log session.
 */
export function endLogSession(): void {
  if (currentLogFile) {
    pipelineLog('session_end', { logFile: currentLogFile })
    console.log('[PipelineLogger] Log saved to:', currentLogFile)
  }
  currentLogFile = null
  currentSessionId = null
}

/**
 * Get the current session ID (for passing to IPC handlers).
 */
export function getCurrentLogSession(): string | null {
  return currentSessionId
}

/**
 * Get the current log file path.
 */
export function getCurrentLogFile(): string | null {
  return currentLogFile
}
