/**
 * Orchestrator Engine — CEO Agent 多 Agent 编排引擎
 *
 * 使用 Claude Agent SDK 的 Supervisor 模式：
 * - 调用 registry.buildSupervisorConfig() 构建 CEO 配置
 * - 使用 query() 启动 CEO Agent
 * - CEO 自动分析需求并调度子 Agent
 * - 流式推送事件到 renderer 进程
 */

import { spawn, type ChildProcess } from 'node:child_process'
import { createInterface } from 'node:readline'
import { join } from 'node:path'
import { BrowserWindow } from 'electron'

// ── Types ──

/** Orchestrator 执行请求 */
export interface OrchestratorExecuteRequest {
  prompt: string
  context?: Record<string, unknown>
  model?: 'opus' | 'sonnet' | 'haiku'
  maxBudgetUsd?: number
  timeoutMs?: number
}

/** 子 Agent 执行状态 */
export interface SubAgentStatus {
  agentId: string
  name: string
  status: 'idle' | 'running' | 'done' | 'error'
  task?: string
  output?: string
  startTime?: number
  endTime?: number
}

/** Orchestrator 执行状态 */
export interface OrchestratorState {
  isRunning: boolean
  ceoStatus: 'idle' | 'planning' | 'executing' | 'reviewing' | 'done' | 'error'
  subAgents: Map<string, SubAgentStatus>
  plan?: string
  finalResult?: string
  error?: string
}

/** 流式事件类型 */
export type OrchestratorEvent =
  | { type: 'plan'; plan: string }
  | { type: 'sub-start'; agentId: string; name: string; task: string }
  | { type: 'sub-stream'; agentId: string; text: string }
  | { type: 'sub-done'; agentId: string; result: string }
  | { type: 'sub-error'; agentId: string; error: string }
  | { type: 'progress'; done: number; total: number; running: string[] }
  | { type: 'result'; result: string }
  | { type: 'error'; message: string }
  | { type: 'status'; status: OrchestratorState['ceoStatus'] }

// ── Engine Root Paths ──

function getEngineDir(): string {
  return join(__dirname, '../../..', 'engine')
}

// ── State Management ──

const state: OrchestratorState = {
  isRunning: false,
  ceoStatus: 'idle',
  subAgents: new Map(),
}

let activeProcess: ChildProcess | null = null
let activeAbort: AbortController | null = null

// ── Public State Getters ──

export function getOrchestratorState(): OrchestratorState {
  return {
    ...state,
    subAgents: new Map(state.subAgents),
  }
}

export function isOrchestratorRunning(): boolean {
  return state.isRunning && activeProcess !== null && !activeProcess.killed
}

export function getSubAgentStatuses(): SubAgentStatus[] {
  return Array.from(state.subAgents.values())
}

// ── Core Execution ──

/**
 * 执行 CEO 编排任务
 *
 * 流程：
 * 1. 调用 engine/agents/registry.ts 的 buildSupervisorConfig
 * 2. Spawn tsx 运行 engine/supervisor-runner.ts
 * 3. 解析 stream-json 输出，检测子 Agent 事件
 * 4. 推送事件到 renderer
 */
export async function executeOrchestrator(
  request: OrchestratorExecuteRequest,
  onEvent: (event: OrchestratorEvent) => void
): Promise<{ success: boolean; result?: string; error?: string }> {
  if (state.isRunning) {
    return { success: false, error: 'Orchestrator is already running' }
  }

  // Reset state
  state.isRunning = true
  state.ceoStatus = 'planning'
  state.subAgents.clear()
  state.plan = undefined
  state.finalResult = undefined
  state.error = undefined

  const timeout = request.timeoutMs ?? 600_000 // 10 minutes default

  // Build supervisor config via tsx script
  const configScript = `
import { AgentRegistry } from './agents/registry.ts';

const registry = AgentRegistry.getInstance();
const config = await registry.buildSupervisorConfig(${JSON.stringify(request.prompt)}, ${JSON.stringify(request.context ?? {})});

// Output config as JSON
console.log('CONFIG_START' + JSON.stringify(config) + 'CONFIG_END');
`

  // Spawn tsx to build config
  const configProcess = spawn('npx', ['tsx', '--eval', configScript], {
    cwd: getEngineDir(),
    stdio: ['ignore', 'pipe', 'pipe'],
  })

  let configJson = ''
  let configError = ''

  configProcess.stdout?.on('data', (chunk: Buffer) => {
    const text = chunk.toString()
    const startIdx = text.indexOf('CONFIG_START')
    const endIdx = text.indexOf('CONFIG_END')
    if (startIdx !== -1 && endIdx !== -1) {
      configJson = text.slice(startIdx + 12, endIdx)
    }
  })

  configProcess.stderr?.on('data', (chunk: Buffer) => {
    configError += chunk.toString()
  })

  // Wait for config
  await new Promise<void>((resolve) => {
    configProcess.on('close', () => resolve())
  })

  if (!configJson) {
    state.isRunning = false
    state.ceoStatus = 'error'
    return { success: false, error: `Failed to build supervisor config: ${configError}` }
  }

  let config: { prompt: string; options: Record<string, unknown> }
  try {
    config = JSON.parse(configJson)
  } catch {
    state.isRunning = false
    state.ceoStatus = 'error'
    return { success: false, error: 'Failed to parse supervisor config' }
  }

  // Now spawn the actual supervisor execution
  const runnerScript = `
import { query } from '@anthropic-ai/claude-agent-sdk';

const config = ${JSON.stringify(config)};

for await (const message of query({
  prompt: config.prompt,
  options: config.options,
})) {
  console.log(JSON.stringify(message));
}
`

  activeAbort = new AbortController()

  try {
    activeProcess = spawn('npx', ['tsx', '--eval', runnerScript], {
      cwd: getEngineDir(),
      stdio: ['ignore', 'pipe', 'pipe'],
      signal: activeAbort.signal,
      env: {
        ...process.env,
        // Clean env to avoid Claude Code nesting issues
        CLAUDECODE: undefined,
        CLAUDE_CODE_ENTRYPOINT: undefined,
        CLAUDE_CODE_IS_AGENT: undefined,
      },
    })
  } catch (err) {
    state.isRunning = false
    state.ceoStatus = 'error'
    const message = err instanceof Error ? err.message : 'Failed to spawn orchestrator'
    return { success: false, error: message }
  }

  // Timeout control
  const timer = setTimeout(() => {
    abortOrchestrator()
    onEvent({ type: 'error', message: 'Execution timed out' })
  }, timeout)

  // Stream parsing
  const stdout = createInterface({ input: activeProcess.stdout! })
  const stderrChunks: string[] = []

  activeProcess.stderr?.on('data', (chunk: Buffer) => {
    const text = chunk.toString()
    stderrChunks.push(text)
    console.error('[Orchestrator] stderr:', text.slice(0, 200))
  })

  return new Promise((resolve) => {
    let resolved = false
    const finish = (result: { success: boolean; result?: string; error?: string }): void => {
      if (resolved) return
      resolved = true
      clearTimeout(timer)
      activeProcess = null
      activeAbort = null
      state.isRunning = false
      state.ceoStatus = result.success ? 'done' : 'error'
      resolve(result)
    }

    stdout.on('line', (line: string) => {
      const trimmed = line.trim()
      if (!trimmed) return

      let event: Record<string, unknown>
      try {
        event = JSON.parse(trimmed)
      } catch {
        return // skip non-JSON lines
      }

      // Process event and push to renderer
      processStreamEvent(event, onEvent)
    })

    activeProcess!.on('close', (code: number | null) => {
      if (code !== 0) {
        const errMsg = stderrChunks.join('').slice(0, 500) || `Process exited with code ${code}`
        onEvent({ type: 'error', message: errMsg })
        finish({ success: false, error: errMsg })
      } else {
        finish({ success: true, result: state.finalResult || '' })
      }
    })

    activeProcess!.on('error', (err: Error) => {
      onEvent({ type: 'error', message: err.message })
      finish({ success: false, error: err.message })
    })
  })
}

// ── Stream Event Processing ──

function processStreamEvent(
  event: Record<string, unknown>,
  onEvent: (event: OrchestratorEvent) => void
): void {
  console.log('[Orchestrator] Event:', event.type)

  switch (event.type) {
    case 'assistant': {
      const message = event.message as Record<string, unknown> | undefined
      const content = message?.content

      if (Array.isArray(content)) {
        for (const block of content) {
          if (block?.type === 'text' && block?.text) {
            const text = block.text as string

            // Detect plan output (early in conversation)
            if (state.ceoStatus === 'planning' && text.includes('计划') || text.includes('任务')) {
              state.plan = text
              onEvent({ type: 'plan', plan: text })
            }

            // Detect final result (late in conversation, contains summary)
            if (text.includes('交付') || text.includes('结果') || text.includes('总结')) {
              state.finalResult = text
            }

            onEvent({ type: 'status', status: state.ceoStatus })
          }

          // Detect Agent tool use (sub-agent spawn)
          if (block?.type === 'tool_use' && block?.name === 'Agent') {
            const input = block.input as Record<string, unknown> | undefined
            const agentId = (input?.agent_name as string) || 'unknown'
            const agentPrompt = (input?.prompt as string) || ''

            // Extract task description from prompt
            const taskMatch = agentPrompt.match(/任务[:：](.+?)(?:\n|$)/)
            const task = taskMatch ? taskMatch[1].trim() : agentPrompt.slice(0, 100)

            state.subAgents.set(agentId, {
              agentId,
              name: agentId,
              status: 'running',
              task,
              output: '',
              startTime: Date.now(),
            })

            state.ceoStatus = 'executing'

            onEvent({
              type: 'sub-start',
              agentId,
              name: agentId,
              task,
            })

            // Update progress
            const running = Array.from(state.subAgents.values())
              .filter(s => s.status === 'running')
              .map(s => s.agentId)
            onEvent({
              type: 'progress',
              done: Array.from(state.subAgents.values()).filter(s => s.status === 'done').length,
              total: state.subAgents.size,
              running,
            })
          }
        }
      }
      break
    }

    case 'tool_result': {
      const toolResult = event.tool_result as Record<string, unknown> | undefined
      if (toolResult) {
        const content = typeof toolResult.content === 'string'
          ? toolResult.content
          : JSON.stringify(toolResult.content)

        // Find which sub-agent this result belongs to
        // (most recent running agent)
        const runningAgents = Array.from(state.subAgents.values())
          .filter(s => s.status === 'running')

        if (runningAgents.length > 0) {
          const agent = runningAgents[runningAgents.length - 1]
          agent.status = 'done'
          agent.output = content
          agent.endTime = Date.now()

          onEvent({
            type: 'sub-done',
            agentId: agent.agentId,
            result: content,
          })

          // Update progress
          const allAgents = Array.from(state.subAgents.values())
          const stillRunning = allAgents.filter(s => s.status === 'running').map(s => s.agentId)
          onEvent({
            type: 'progress',
            done: allAgents.filter(s => s.status === 'done').length,
            total: state.subAgents.size,
            running: stillRunning,
          })

          // If no more running agents, CEO is reviewing
          if (stillRunning.length === 0) {
            state.ceoStatus = 'reviewing'
            onEvent({ type: 'status', status: 'reviewing' })
          }
        }
      }
      break
    }

    case 'result': {
      const result = event.result as string | undefined
      if (result) {
        state.finalResult = result
        onEvent({ type: 'result', result })
      }
      break
    }

    case 'error': {
      const errorMsg = (event.result as string) || (event.message as string) || 'Unknown error'
      state.error = errorMsg
      onEvent({ type: 'error', message: errorMsg })
      break
    }

    default:
      break
  }
}

// ── Abort ──

export function abortOrchestrator(): void {
  if (activeProcess && !activeProcess.killed) {
    activeProcess.kill('SIGTERM')
  }
  activeAbort?.abort('User cancelled')
  activeProcess = null
  activeAbort = null
  state.isRunning = false
  state.ceoStatus = 'idle'
}

// ── IPC Push Helpers ──

export function broadcastToAll(channel: string, ...args: unknown[]): void {
  for (const win of BrowserWindow.getAllWindows()) {
    if (!win.isDestroyed()) {
      win.webContents.send(channel, ...args)
    }
  }
}
