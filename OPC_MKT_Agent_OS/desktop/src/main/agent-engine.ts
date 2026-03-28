/**
 * Agent Engine — Electron Main 进程的 Agent 执行引擎
 *
 * 通过 spawn `claude` CLI 子进程执行 Agent 任务，
 * 将 stream-json 输出转换为 IPC 事件推送到 renderer 进程。
 *
 * 采用 CLI 路径（而非直接导入 SDK）的原因：
 * - engine/ 是 ESM，desktop main 是 CJS（electron-vite 打包）
 * - CLI 路径不需要额外依赖，只需本机安装 claude CLI
 * - 复用已验证的 stream-json 协议
 */

import { spawn, type ChildProcess } from 'node:child_process'
import { createInterface } from 'node:readline'
import { join } from 'node:path'
import { readFile } from 'node:fs/promises'
import { readFileSync, existsSync } from 'node:fs'
import { BrowserWindow } from 'electron'
import { getApiKey } from './safe-storage'
import { IPC } from '../shared/ipc-channels'
import { isOrchestratorRunning, getSubAgentStatuses } from './orchestrator-engine'

// ── .env 文件加载 ──

/** 读取 engine/.env 文件，返回 key-value 对象 */
function loadEnvFile(dir: string): Record<string, string> {
  const envPath = join(dir, '.env')
  if (!existsSync(envPath)) return {}
  try {
    const content = readFileSync(envPath, 'utf-8')
    const result: Record<string, string> = {}
    for (const line of content.split('\n')) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      const eqIdx = trimmed.indexOf('=')
      if (eqIdx < 1) continue
      const key = trimmed.slice(0, eqIdx).trim()
      let value = trimmed.slice(eqIdx + 1).trim()
      // 去除引号
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1)
      }
      if (value) result[key] = value
    }
    return result
  } catch {
    return {}
  }
}

// ── Types ──

/** stream-json 单行事件 */
interface StreamJsonEvent {
  type: string
  subtype?: string
  content_block?: {
    type: string
    text?: string
    name?: string
    id?: string
    input?: unknown
  }
  tool_result?: {
    tool_use_id: string
    content: unknown
    is_error?: boolean
  }
  result?: string
  message?: Record<string, unknown>
  is_error?: boolean
  session_id?: string
  total_cost_usd?: number
  duration_ms?: number
  [key: string]: unknown
}

/** Agent 执行请求 */
export interface AgentExecuteRequest {
  agentId: string
  message: string
  mode: 'direct' | 'team'
  context?: Record<string, unknown>
  model?: 'opus' | 'sonnet' | 'haiku'
  maxBudgetUsd?: number
  timeoutMs?: number
  sessionId?: string  // 传入上一轮的 sessionId 以恢复对话上下文
}

/** Agent 定义（从 engine/agents/registry.ts 镜像核心字段） */
interface AgentDef {
  id: string
  name: string
  description: string
  skillFile: string
  model: string
  /** 需要预授权的 MCP server 名称（会转为 mcp__<name> 通配符） */
  allowedMcpServers?: string[]
}

/** 推送到 renderer 的流式事件 */
export interface AgentStreamChunkEvent {
  type: 'text' | 'tool_use' | 'tool_result' | 'status' | 'error'
  agentId: string
  content?: string
  tool?: string
  toolInput?: string
  message?: string
}

// ── Engine Root Paths ──

function getEngineDir(): string {
  // In dev: desktop/ is at OPC_MKT_Agent_OS/desktop, engine/ is at OPC_MKT_Agent_OS/engine
  return join(__dirname, '../../..', 'engine')
}

function getSkillsDir(): string {
  return join(getEngineDir(), 'skills')
}

function getMemoryDir(): string {
  return join(getEngineDir(), 'memory')
}

// ── Agent Registry (static subset for CLI prompt building) ──

const AGENT_REGISTRY: AgentDef[] = [
  { id: 'ceo', name: 'CEO 营销总监', description: '营销团队总指挥，需求拆解、子 Agent 调度与质量终审', skillFile: '', model: 'claude-sonnet-4-20250514', allowedMcpServers: ['xhs-data', 'image-gen', 'creatorflow'] },
  { id: 'xhs-agent', name: '小红书创作专家', description: '端到端小红书营销：搜索竞品→分析爆款→内容创作→审查→发布。支持真实数据抓取和自动发布。', skillFile: 'xhs.SKILL.md', model: 'claude-sonnet-4-20250514', allowedMcpServers: ['xhs-data', 'image-gen'] },
  { id: 'analyst-agent', name: '数据飞轮分析师', description: '分析内容表现数据，提炼胜出模式', skillFile: 'analyst.SKILL.md', model: 'claude-sonnet-4-20250514' },
  { id: 'growth-agent', name: '增长营销专家', description: '选题研究、热点捕捉、竞品分析、发布策略', skillFile: 'growth.SKILL.md', model: 'claude-sonnet-4-20250514' },
  { id: 'brand-reviewer', name: '品牌风控审查', description: '审查内容合规性与品牌调性一致性', skillFile: 'brand-reviewer.SKILL.md', model: 'claude-sonnet-4-20250514' },
  { id: 'podcast-agent', name: '播客制作专家', description: '生成播客脚本、对话式音频内容', skillFile: 'podcast.SKILL.md', model: 'claude-sonnet-4-20250514' },
  { id: 'global-content-agent', name: '全球内容创作', description: 'Generate English marketing content for Meta/X/TikTok/LinkedIn/Email/Blog', skillFile: 'global-content.SKILL.md', model: 'claude-sonnet-4-20250514' },
  { id: 'meta-ads-agent', name: 'Meta 广告投手', description: 'Meta advertising — campaign creation, budget optimization, ROAS analysis', skillFile: 'meta-ads.SKILL.md', model: 'claude-sonnet-4-20250514' },
  { id: 'email-agent', name: '邮件营销专家', description: 'Email marketing automation — sequences, campaigns, A/B testing', skillFile: 'email-marketing.SKILL.md', model: 'claude-sonnet-4-20250514' },
  { id: 'seo-agent', name: 'SEO 专家', description: 'Technical & content SEO — keyword research, on-page optimization', skillFile: 'seo-expert.SKILL.md', model: 'claude-sonnet-4-20250514' },
  { id: 'geo-agent', name: 'GEO 专家', description: 'Generative Engine Optimization — optimize content for AI search engines', skillFile: 'geo-expert.SKILL.md', model: 'claude-sonnet-4-20250514' },
  { id: 'x-twitter-agent', name: 'X/Twitter 创作专家', description: '生成高互动率的推文和 Thread', skillFile: 'x-twitter.SKILL.md', model: 'claude-sonnet-4-20250514' },
  { id: 'visual-gen-agent', name: '视觉内容生成专家', description: 'AI 图片生成 + 营销视觉创作。支持 OpenAI/Google/DashScope/Replicate 生图。', skillFile: 'visual-gen.SKILL.md', model: 'claude-sonnet-4-20250514', allowedMcpServers: ['image-gen'] },
  { id: 'strategist-agent', name: '营销策略师', description: '制定营销策略、内容战略、渠道规划', skillFile: 'strategist.SKILL.md', model: 'claude-sonnet-4-20250514' },
]

function getAgentDef(id: string): AgentDef | undefined {
  return AGENT_REGISTRY.find((a) => a.id === id)
}

// ── File Loader ──

async function loadFile(path: string): Promise<string> {
  try {
    return await readFile(path, 'utf-8')
  } catch {
    return ''
  }
}

// ── Prompt Builder ──

async function buildAgentPrompt(agent: AgentDef, userMessage: string, context?: Record<string, unknown>): Promise<string> {
  const skill = agent.skillFile ? await loadFile(join(getSkillsDir(), agent.skillFile)) : ''
  const brandVoice = await loadFile(join(getMemoryDir(), 'context', 'brand-voice.md'))
  const audience = await loadFile(join(getMemoryDir(), 'context', 'target-audience.md'))

  const parts = [
    `你是${agent.name}。${agent.description}`,
    skill && `## SOP\n${skill}`,
    brandVoice && `## 品牌调性\n${brandVoice}`,
    audience && `## 目标受众\n${audience}`,
    context && Object.keys(context).length > 0 && `## 上下文\n${JSON.stringify(context, null, 2)}`,
  ].filter(Boolean).join('\n\n---\n\n')

  return `${parts}\n\n---\n\nUser: ${userMessage}`
}

// ── Session Tracking (per agent) ──
// 保持每个 agent 最近的 sessionId，切换页面后仍可恢复对话
const agentSessions = new Map<string, string>()

/** 获取 agent 的 sessionId */
export function getAgentSessionId(agentId: string): string | undefined {
  return agentSessions.get(agentId)
}

/** 清除 agent 的 sessionId（开启新对话） */
export function clearAgentSession(agentId: string): void {
  agentSessions.delete(agentId)
}

// ── Active Process Tracking ──

let activeProcess: ChildProcess | null = null
let activeAbort: AbortController | null = null

/** 检查是否有 Agent 正在运行 */
export function isAgentRunning(): boolean {
  return activeProcess !== null && !activeProcess.killed
}

/** 中止当前运行的 Agent */
export function abortAgent(): void {
  if (activeProcess && !activeProcess.killed) {
    activeProcess.kill('SIGTERM')
  }
  activeAbort?.abort('User cancelled')
  activeProcess = null
  activeAbort = null
}

// ── Core Execution ──

/**
 * 执行 Agent — spawn claude CLI 子进程，流式推送事件到 renderer
 *
 * 返回执行结果摘要。
 */
export async function executeAgent(
  request: AgentExecuteRequest
): Promise<{ success: boolean; result?: string; error?: string; sessionId?: string; cost?: number }> {
  const agent = getAgentDef(request.agentId)
  if (!agent) {
    return { success: false, error: `Unknown agent: ${request.agentId}` }
  }

  // 如果有正在运行的 Agent，先中止
  if (isAgentRunning()) {
    abortAgent()
  }

  const timeout = request.timeoutMs ?? 300_000 // 5 minutes default
  // 优先用请求中的 sessionId，否则从 main 进程缓存中取
  const resumeSessionId = request.sessionId || agentSessions.get(request.agentId)
  const isResume = !!resumeSessionId

  // Build CLI args
  const args: string[] = [
    '-p',
    '--output-format', 'stream-json',
    '--verbose',
  ]

  // 恢复会话：用 --resume 保持对话上下文；首次：用 --permission-mode
  if (isResume) {
    args.push('--resume', resumeSessionId!)
  } else {
    args.push('--permission-mode', 'acceptEdits')
  }

  if (request.model) {
    args.push('--model', request.model)
  }

  if (request.maxBudgetUsd) {
    args.push('--max-budget-usd', String(request.maxBudgetUsd))
  }

  // 预授权 MCP 工具（headless 模式下无法弹出授权提示）
  // --allowedTools 是 variadic，必须用 -- 分隔后面的 prompt
  // 使用 mcp__<server>__* 通配符匹配该 server 下所有工具
  if (agent.allowedMcpServers && agent.allowedMcpServers.length > 0) {
    args.push('--allowedTools', ...agent.allowedMcpServers.map(s => `mcp__${s}__*`))
  }

  // 用 -- 分隔选项和 prompt（防止 variadic --allowedTools 吞掉 prompt）
  args.push('--')

  // 首次：构建完整 prompt（含 SKILL + context）；恢复：只发用户消息
  if (isResume) {
    args.push(request.message)
  } else {
    const prompt = await buildAgentPrompt(agent, request.message, request.context)
    args.push(prompt)
  }

  // Spawn claude process
  activeAbort = new AbortController()
  console.log('[AgentEngine] Spawning claude CLI:', { agentId: request.agentId, cwd: getEngineDir(), argsCount: args.length })

  // Build clean env: remove Claude Code nesting vars
  const cleanEnv = { ...process.env }
  delete cleanEnv.CLAUDECODE
  delete cleanEnv.CLAUDE_CODE_ENTRYPOINT
  delete cleanEnv.CLAUDE_CODE_IS_AGENT

  // 1. 从 engine/.env 加载配置
  const dotEnv = loadEnvFile(getEngineDir())
  for (const [key, value] of Object.entries(dotEnv)) {
    if (!cleanEnv[key]) {
      cleanEnv[key] = value
    }
  }

  // 2. 从 safe-storage (keychain) 注入 API key（优先级高于 .env）
  const keyMapping: Record<string, string> = {
    'anthropic': 'ANTHROPIC_API_KEY',
    'openai': 'OPENAI_API_KEY',
    'google': 'GOOGLE_API_KEY',
    'dashscope': 'DASHSCOPE_API_KEY',
    'replicate': 'REPLICATE_API_TOKEN',
  }
  for (const [provider, envVar] of Object.entries(keyMapping)) {
    const key = getApiKey(provider)
    if (key) {
      cleanEnv[envVar] = key
    }
  }

  try {
    activeProcess = spawn('claude', args, {
      cwd: getEngineDir(),
      env: cleanEnv,
      stdio: ['ignore', 'pipe', 'pipe'],
      signal: activeAbort.signal,
    })
    console.log('[AgentEngine] claude process spawned, pid:', activeProcess.pid)
  } catch (err) {
    activeProcess = null
    activeAbort = null
    const message = err instanceof Error ? err.message : 'Failed to spawn claude process'
    console.error('[AgentEngine] spawn failed:', message)
    return { success: false, error: message }
  }

  // Timeout control
  const timer = setTimeout(() => {
    abortAgent()
    sendChunk(request.agentId, { type: 'error', message: 'Execution timed out' })
    sendEnd()
  }, timeout)

  // Stream parsing
  const stdout = createInterface({ input: activeProcess.stdout! })
  const stderrChunks: string[] = []

  activeProcess.stderr?.on('data', (chunk: Buffer) => {
    const text = chunk.toString()
    stderrChunks.push(text)
    console.error('[AgentEngine] stderr:', text.slice(0, 200))
  })

  let finalResult = ''
  let sessionId: string | undefined
  let totalCost: number | undefined
  const capturedImageUrls: string[] = []
  let lastToolWasImageGen = false

  return new Promise((resolve) => {
    let resolved = false
    const finish = (result: { success: boolean; result?: string; error?: string; sessionId?: string; cost?: number; imageUrls?: string[] }): void => {
      if (resolved) return
      resolved = true
      clearTimeout(timer)
      activeProcess = null
      activeAbort = null
      resolve(result)
    }

    stdout.on('line', (line: string) => {
      const trimmed = line.trim()
      if (!trimmed) return

      let event: StreamJsonEvent
      try {
        event = JSON.parse(trimmed) as StreamJsonEvent
      } catch {
        return // skip non-JSON lines
      }

      // Process event and push to renderer
      processStreamEvent(event, request.agentId)

      // Track generate_image tool calls to capture image paths from results
      if (event.type === 'assistant') {
        const msg = event.message as Record<string, unknown> | undefined
        const blocks = msg?.content
        if (Array.isArray(blocks)) {
          for (const block of blocks) {
            if (block?.type === 'tool_use' && block?.name === 'generate_image') {
              lastToolWasImageGen = true
            }
          }
        }
      }
      if (event.type === 'tool_result' && lastToolWasImageGen) {
        lastToolWasImageGen = false
        const tr = event.tool_result as Record<string, unknown> | undefined
        const resultText = typeof tr?.content === 'string'
          ? tr.content
          : JSON.stringify(tr?.content || '')
        const pathMatch = resultText.match(/路径:\s*(.+?)(?:\n|$)/)
        if (pathMatch?.[1]) {
          capturedImageUrls.push(pathMatch[1].trim())
        }
      }

      // Capture final result & persist session for resume
      if (event.type === 'result') {
        finalResult = (event.result as string) || ''
        sessionId = event.session_id
        totalCost = event.total_cost_usd as number | undefined
        if (sessionId) {
          agentSessions.set(request.agentId, sessionId)
          console.log('[AgentEngine] session saved:', request.agentId, '->', sessionId.slice(0, 12))
        }
      }
    })

    activeProcess!.on('close', (code: number | null) => {
      console.log('[AgentEngine] process closed, code:', code, 'stderr length:', stderrChunks.join('').length)
      sendEnd()

      if (code !== 0) {
        const errMsg = stderrChunks.join('').slice(0, 500) || `claude process exited with code ${code}`
        console.error('[AgentEngine] execution failed:', errMsg)
        sendChunk(request.agentId, { type: 'error', message: errMsg })
        finish({ success: false, error: errMsg })
      } else {
        console.log('[AgentEngine] execution succeeded, result length:', finalResult.length, 'images:', capturedImageUrls.length)
        finish({ success: true, result: finalResult, sessionId, cost: totalCost, imageUrls: capturedImageUrls })
      }
    })

    activeProcess!.on('error', (err: Error) => {
      console.error('[AgentEngine] process error:', err.message)
      sendEnd()
      sendChunk(request.agentId, { type: 'error', message: err.message })
      finish({ success: false, error: err.message })
    })
  })
}

// ── Stream Event Processing ──

function processStreamEvent(event: StreamJsonEvent, agentId: string): void {
  switch (event.type) {
    case 'assistant': {
      const message = event.message as Record<string, unknown> | undefined
      const content = message?.content
      if (Array.isArray(content)) {
        for (const block of content) {
          if (block?.type === 'text' && block?.text) {
            sendChunk(agentId, { type: 'text', content: block.text as string })
          }
          if (block?.type === 'tool_use') {
            sendChunk(agentId, {
              type: 'tool_use',
              tool: (block.name || '') as string,
              toolInput: JSON.stringify(block.input || {}).slice(0, 500),
            })
          }
        }
      }
      break
    }

    case 'tool_result': {
      const toolResult = event.tool_result
      if (toolResult) {
        sendChunk(agentId, {
          type: 'tool_result',
          content: typeof toolResult.content === 'string'
            ? toolResult.content.slice(0, 500)
            : JSON.stringify(toolResult.content).slice(0, 500),
        })
      }
      break
    }

    case 'error': {
      sendChunk(agentId, {
        type: 'error',
        message: (event.result as string) || 'Unknown error',
      })
      break
    }

    default:
      break
  }
}

// ── IPC Push Helpers — broadcast to all windows ──

function broadcastToAll(channel: string, ...args: unknown[]): void {
  for (const win of BrowserWindow.getAllWindows()) {
    if (!win.isDestroyed()) {
      win.webContents.send(channel, ...args)
    }
  }
}

function sendChunk(agentId: string, data: Partial<AgentStreamChunkEvent>): void {
  broadcastToAll(IPC.AGENT_STREAM_CHUNK, { agentId, ...data })
}

function sendEnd(): void {
  broadcastToAll(IPC.AGENT_STREAM_END)
}

// ── Agent Status ──

export interface AgentStatusInfo {
  id: string
  name: string
  description: string
  status: 'idle' | 'busy' | 'offline'
}

export function getAgentStatuses(runningAgentId?: string): AgentStatusInfo[] {
  // Check orchestrator sub-agent statuses for dock pet sync
  const orchSubs = isOrchestratorRunning() ? getSubAgentStatuses() : []
  const orchRunningIds = new Set(orchSubs.filter(s => s.status === 'running').map(s => s.agentId))

  return AGENT_REGISTRY.map((a) => ({
    id: a.id,
    name: a.name,
    description: a.description,
    status:
      (a.id === runningAgentId && isAgentRunning()) ? 'busy' as const
      : orchRunningIds.has(a.id) ? 'busy' as const
      : (a.id === 'ceo' && isOrchestratorRunning()) ? 'busy' as const
      : 'idle' as const,
  }))
}
