/**
 * Orchestrator Engine — CEO Agent 多 Agent 编排引擎
 *
 * 通过 spawn 单个 `claude` CLI 进程（CEO 角色 + --agents 参数），
 * SDK 内部自动 spawn 子 Agent 进程。
 * 解析 stream-json 输出，检测子 Agent 事件，推送到 renderer 进程。
 */

import { spawn, type ChildProcess } from 'node:child_process'
import { createInterface } from 'node:readline'
import { join } from 'node:path'
import { readFile } from 'node:fs/promises'
import { readFileSync, existsSync } from 'node:fs'
import { BrowserWindow } from 'electron'
import { IPC } from '../shared/ipc-channels'
import { getApiKey } from './safe-storage'
import { buildDesktopModeOverride } from './desktop-mode-overrides'

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
  onlineAgents: string[]
  plan?: string
  finalResult?: string
  error?: string
}

/** 流式事件类型 */
export type OrchestratorEvent =
  | { type: 'plan'; plan: string; agentIds: string[] }
  | { type: 'agents-selected'; agentIds: string[] }
  | { type: 'sub-start'; agentId: string; name: string; task: string }
  | { type: 'sub-stream'; agentId: string; text: string }
  | { type: 'sub-done'; agentId: string; result: string }
  | { type: 'sub-error'; agentId: string; error: string }
  | { type: 'progress'; done: number; total: number; running: string[] }
  | { type: 'result'; result: string }
  | { type: 'error'; message: string }
  | { type: 'status'; status: OrchestratorState['ceoStatus'] }

// ── Agent Registry (mirrored from agent-engine.ts) ──

interface AgentDef {
  id: string
  name: string
  description: string
  skillFile: string
  model: string
  tools: string[]
  /** MCP server names this agent needs access to */
  allowedMcpServers?: string[]
}

const AGENT_REGISTRY: AgentDef[] = [
  { id: 'ceo', name: 'CEO 营销总监', description: '营销团队总指挥，需求拆解、子 Agent 调度与质量终审', skillFile: '', model: 'claude-sonnet-4-20250514', tools: ['Read', 'Write', 'Glob', 'Grep', 'Bash', 'Agent'], allowedMcpServers: ['xhs-data', 'image-gen', 'creatorflow'] },
  { id: 'xhs-agent', name: '小红书创作专家', description: '端到端小红书营销：搜索竞品→分析爆款→内容创作→配图生成→审查→发布', skillFile: 'xhs.SKILL.md', model: 'claude-sonnet-4-20250514', tools: ['Read', 'Write', 'Glob', 'WebSearch'], allowedMcpServers: ['xhs-data', 'image-gen'] },
  { id: 'analyst-agent', name: '数据飞轮分析师', description: '分析内容表现数据，提炼胜出模式', skillFile: 'analyst.SKILL.md', model: 'claude-sonnet-4-20250514', tools: ['Read', 'Write', 'Glob', 'Grep'] },
  { id: 'growth-agent', name: '增长营销专家', description: '选题研究、热点捕捉、竞品分析、发布策略', skillFile: 'growth.SKILL.md', model: 'claude-sonnet-4-20250514', tools: ['Read', 'Glob', 'Grep', 'Bash'] },
  { id: 'brand-reviewer', name: '品牌风控审查', description: '审查内容合规性与品牌调性一致性', skillFile: 'brand-reviewer.SKILL.md', model: 'claude-sonnet-4-20250514', tools: ['Read', 'Glob'] },
  { id: 'podcast-agent', name: '播客制作专家', description: '生成播客脚本、对话式音频内容', skillFile: 'podcast.SKILL.md', model: 'claude-sonnet-4-20250514', tools: ['Read', 'Write', 'Glob'] },
  { id: 'global-content-agent', name: '全球内容创作', description: 'Generate English marketing content for Meta/X/TikTok/LinkedIn/Email/Blog', skillFile: 'global-content.SKILL.md', model: 'claude-sonnet-4-20250514', tools: ['Read', 'Write', 'Glob'] },
  { id: 'meta-ads-agent', name: 'Meta 广告投手', description: 'Meta advertising — campaign creation, budget optimization, ROAS analysis', skillFile: 'meta-ads.SKILL.md', model: 'claude-sonnet-4-20250514', tools: ['Read', 'Write', 'Glob', 'Bash'] },
  { id: 'email-agent', name: '邮件营销专家', description: 'Email marketing automation — sequences, campaigns, A/B testing', skillFile: 'email-marketing.SKILL.md', model: 'claude-sonnet-4-20250514', tools: ['Read', 'Write', 'Glob'] },
  { id: 'seo-agent', name: 'SEO 专家', description: 'Technical & content SEO — keyword research, on-page optimization', skillFile: 'seo-expert.SKILL.md', model: 'claude-sonnet-4-20250514', tools: ['Read', 'Write', 'Glob', 'Grep', 'Bash'] },
  { id: 'geo-agent', name: 'GEO 专家', description: 'Generative Engine Optimization — optimize content for AI search engines', skillFile: 'geo-expert.SKILL.md', model: 'claude-sonnet-4-20250514', tools: ['Read', 'Write', 'Glob', 'Grep'] },
  { id: 'x-twitter-agent', name: 'X/Twitter 创作专家', description: '生成高互动率的推文和 Thread', skillFile: 'x-twitter.SKILL.md', model: 'claude-sonnet-4-20250514', tools: ['Read', 'Write', 'Glob'] },
  { id: 'visual-gen-agent', name: '视觉内容生成专家', description: 'AI 图片生成 + 营销视觉创作', skillFile: 'visual-gen.SKILL.md', model: 'claude-sonnet-4-20250514', tools: ['Read', 'Write', 'Glob'], allowedMcpServers: ['image-gen'] },
  { id: 'strategist-agent', name: '营销策略师', description: '制定营销策略、内容战略、渠道规划', skillFile: 'strategist.SKILL.md', model: 'claude-sonnet-4-20250514', tools: ['Read', 'Write', 'Glob', 'Grep'] },
]

/** All known agent IDs for plan extraction */
const ALL_AGENT_IDS = AGENT_REGISTRY.filter(a => a.id !== 'ceo').map(a => a.id)

// ── Engine Root Paths ──

function getEngineDir(): string {
  return join(__dirname, '../../..', 'engine')
}

function getSkillsDir(): string {
  return join(getEngineDir(), 'skills')
}

function getMemoryDir(): string {
  return join(getEngineDir(), 'memory')
}

async function loadFile(path: string): Promise<string> {
  try {
    return await readFile(path, 'utf-8')
  } catch {
    return ''
  }
}

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

/** Collect all unique MCP server names needed by any agent */
function collectAllMcpServers(): string[] {
  const servers = new Set<string>()
  for (const agent of AGENT_REGISTRY) {
    if (agent.allowedMcpServers) {
      for (const s of agent.allowedMcpServers) servers.add(s)
    }
  }
  return Array.from(servers)
}

// ── State Management ──

const state: OrchestratorState = {
  isRunning: false,
  ceoStatus: 'idle',
  subAgents: new Map(),
  onlineAgents: [],
}

let activeProcess: ChildProcess | null = null
let activeAbort: AbortController | null = null

// Accumulated CEO text for plan detection across multiple chunks
let accumulatedCeoText = ''

// ── Public State Getters ──

export function getOrchestratorState(): OrchestratorState {
  return {
    ...state,
    subAgents: new Map(state.subAgents),
    onlineAgents: [...state.onlineAgents],
  }
}

export function isOrchestratorRunning(): boolean {
  return state.isRunning && activeProcess !== null && !activeProcess.killed
}

export function getSubAgentStatuses(): SubAgentStatus[] {
  return Array.from(state.subAgents.values())
}

// ── Config Builders ──

/**
 * Build --agents JSON: for each non-CEO agent, construct { description, prompt, tools }
 */
async function buildAgentsJson(): Promise<string> {
  const agents: Record<string, { description: string; prompt: string; tools: string[] }> = {}
  const brandVoice = await loadFile(join(getMemoryDir(), 'context', 'brand-voice.md'))
  const audience = await loadFile(join(getMemoryDir(), 'context', 'target-audience.md'))

  for (const agent of AGENT_REGISTRY.filter(a => a.id !== 'ceo')) {
    const skill = agent.skillFile ? await loadFile(join(getSkillsDir(), agent.skillFile)) : ''
    // Include MCP tool wildcards in the agent's tools list
    const mcpTools = (agent.allowedMcpServers || []).map(s => `mcp__${s}__*`)
    const desktopOverride = buildDesktopModeOverride(agent.id)
    agents[agent.id] = {
      description: agent.description,
      prompt: [
        `你是${agent.name}。${agent.description}`,
        skill && `## SOP\n${skill}`,
        desktopOverride && `## Desktop 模式限制（优先级高于 SOP）\n${desktopOverride}`,
        brandVoice && `## 品牌调性\n${brandVoice}`,
        audience && `## 目标受众\n${audience}`,
      ].filter(Boolean).join('\n\n'),
      tools: [...agent.tools, ...mcpTools],
    }
  }
  return JSON.stringify(agents)
}

/**
 * Build CEO system prompt with routing table, workflow, and plan format markers
 */
async function buildCeoPrompt(userMessage: string, context?: Record<string, unknown>): Promise<string> {
  const brandVoice = await loadFile(join(getMemoryDir(), 'context', 'brand-voice.md'))
  const audience = await loadFile(join(getMemoryDir(), 'context', 'target-audience.md'))
  const calendar = await loadFile(join(getMemoryDir(), 'content-calendar.json'))

  const agentList = AGENT_REGISTRY
    .filter(a => a.id !== 'ceo')
    .map(a => `- ${a.id}: ${a.description}`)
    .join('\n')

  return `你是 CEO 营销总监，营销团队的编排者和决策者。

## 核心原则 — 必须委派，禁止自己创作
你是管理者，不是创作者。你的工作是：
1. 分析用户需求
2. 拆解为子任务
3. 用 Agent 工具调度对应的子 Agent 执行
4. 评审子 Agent 的产出质量
5. 汇总结果交付用户

**严禁**：你绝不能自己撰写小红书笔记、推文、播客脚本、视觉内容或任何营销文案。
所有内容创作任务必须通过调用 Agent 工具委派给对应的子 Agent。

## 可用团队成员
${agentList}

## 任务路由表
| 需求类型 | 目标 Agent |
|---------|-----------|
| 英文多平台内容（X/LinkedIn/Meta/Email/Blog） | global-content-agent |
| 推文/Twitter/Thread（英文） | x-twitter-agent |
| Meta/Facebook/Instagram 广告 | meta-ads-agent |
| Email 营销/序列 | email-agent |
| SEO 优化/关键词/内容策略 | seo-agent |
| GEO 优化/AI 搜索引擎优化 | geo-agent |
| 小红书笔记/种草内容 | xhs-agent |
| 播客/音频内容 | podcast-agent |
| 视觉内容/封面/海报 | visual-gen-agent |
| 营销策略/内容规划 | strategist-agent |
| 选题研究/热点分析/竞品 | growth-agent |
| 数据分析/内容复盘 | analyst-agent |
| 内容审查/品牌风控 | brand-reviewer |

## 标准工作流（必须严格执行）
1. 分析用户需求 → 确定使用哪个子 Agent
2. **立即调用 Agent 工具委派**，不要先自己写一遍再委派
3. 收到子 Agent 结果后 → 调度 brand-reviewer 审查
4. 审查通过 → 汇总结果交付用户
5. 审查不通过 → 要求子 Agent 修改（最多 2 轮）

## 绝对禁止
- ❌ 绝不自己写任何内容（推文、文章、邮件、广告文案等）
- ❌ 不要先写一个草稿再"让子 Agent 优化"
- ❌ 不要在汇报中问用户"需要我继续调度吗？"— 直接做完全部
- ❌ 不要只调度一个 Agent，如果任务涉及多个平台就调度多个

## 输出格式要求（必须遵守）
在开始调度前，你必须先输出执行计划，严格使用以下格式：
---PLAN_START---
1. [任务描述] → [目标 Agent ID]
2. [任务描述] → [目标 Agent ID]
...
---PLAN_END---

输出计划后立即开始调度，不要等待用户确认。

## 调度子 Agent 的方法
使用 Agent 工具调度子 Agent，调用格式：
- agent_name: 子 Agent 的 id（如 "xhs-agent"）
- prompt: 给子 Agent 的具体任务指令

## 任务分配规则
- 每个任务必须明确：目标、输入上下文、期望产出格式
- 传递品牌信息和受众画像给创作型 Agent
- 如果用户需求涉及多个内容类型，分别调度不同 Agent
- 收到子 Agent 结果后评估质量，不达标则要求修改

${brandVoice ? `## 品牌信息\n${brandVoice}\n` : ''}
${audience ? `## 目标受众\n${audience}\n` : ''}
${calendar ? `## 内容日历\n${calendar}\n` : ''}
${context && Object.keys(context).length > 0 ? `## 上下文\n${JSON.stringify(context, null, 2)}\n` : ''}
User: ${userMessage}`
}

/**
 * Extract agent IDs from plan text (between PLAN_START/PLAN_END markers)
 */
function extractAgentIdsFromPlan(planText: string): string[] {
  const ids: string[] = []
  for (const agentId of ALL_AGENT_IDS) {
    if (planText.includes(agentId)) {
      ids.push(agentId)
    }
  }
  return ids
}

// ── Core Execution ──

/**
 * 执行 CEO 编排任务
 *
 * 流程：
 * 1. 构建 CEO prompt + --agents JSON
 * 2. Spawn 单个 claude CLI 进程
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
  state.onlineAgents = ['ceo']
  state.plan = undefined
  state.finalResult = undefined
  state.error = undefined
  accumulatedCeoText = ''

  onEvent({ type: 'status', status: 'planning' })

  const timeout = request.timeoutMs ?? 600_000 // 10 minutes default

  // Build config
  console.log('[Orchestrator] Building CEO config...')
  let agentsJson: string
  let ceoPrompt: string
  try {
    agentsJson = await buildAgentsJson()
    ceoPrompt = await buildCeoPrompt(request.prompt, request.context)
  } catch (err) {
    state.isRunning = false
    state.ceoStatus = 'error'
    const msg = err instanceof Error ? err.message : 'Failed to build config'
    return { success: false, error: msg }
  }

  // Build CLI args — include MCP tool wildcards so sub-agents can use MCP tools
  const mcpServerNames = collectAllMcpServers()
  const mcpToolPatterns = mcpServerNames.map(s => `mcp__${s}__*`)
  const mcpConfigPath = join(getEngineDir(), '.mcp.json')
  const args: string[] = [
    '-p',
    '--output-format', 'stream-json',
    '--verbose',
    '--permission-mode', 'acceptEdits',
    '--mcp-config', mcpConfigPath,
    '--agents', agentsJson,
    '--allowedTools', 'Read', 'Write', 'Glob', 'Grep', 'Bash', 'Agent', ...mcpToolPatterns,
    '--', ceoPrompt,
  ]

  if (request.model) {
    // Insert model before '--'
    const dashIdx = args.indexOf('--')
    args.splice(dashIdx, 0, '--model', request.model)
  }

  if (request.maxBudgetUsd) {
    const dashIdx = args.indexOf('--')
    args.splice(dashIdx, 0, '--max-budget-usd', String(request.maxBudgetUsd))
  }

  // Spawn CEO process
  activeAbort = new AbortController()
  const cleanEnv = { ...process.env }
  delete cleanEnv.CLAUDECODE
  delete cleanEnv.CLAUDE_CODE_ENTRYPOINT
  delete cleanEnv.CLAUDE_CODE_IS_AGENT

  // Load .env from engine directory
  const dotEnv = loadEnvFile(getEngineDir())
  for (const [key, value] of Object.entries(dotEnv)) {
    if (!cleanEnv[key]) {
      cleanEnv[key] = value
    }
  }

  // Inject API keys from keychain (higher priority than .env)
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

  console.log('[Orchestrator] Spawning CEO claude CLI, cwd:', getEngineDir(), 'mcpTools:', mcpToolPatterns)

  try {
    activeProcess = spawn('claude', args, {
      cwd: getEngineDir(),
      env: cleanEnv,
      stdio: ['ignore', 'pipe', 'pipe'],
      signal: activeAbort.signal,
    })
    console.log('[Orchestrator] CEO process spawned, pid:', activeProcess.pid)
  } catch (err) {
    state.isRunning = false
    state.ceoStatus = 'error'
    activeAbort = null
    const message = err instanceof Error ? err.message : 'Failed to spawn CEO process'
    console.error('[Orchestrator] spawn failed:', message)
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

      processStreamEvent(event, onEvent)
    })

    activeProcess!.on('close', (code: number | null) => {
      console.log('[Orchestrator] process closed, code:', code)
      if (code !== 0) {
        const errMsg = stderrChunks.join('').slice(0, 500) || `Process exited with code ${code}`
        onEvent({ type: 'error', message: errMsg })
        finish({ success: false, error: errMsg })
      } else {
        onEvent({ type: 'status', status: 'done' })
        finish({ success: true, result: state.finalResult || '' })
      }
    })

    activeProcess!.on('error', (err: Error) => {
      console.error('[Orchestrator] process error:', err.message)
      onEvent({ type: 'error', message: err.message })
      finish({ success: false, error: err.message })
    })
  })
}

// ── Stream Event Processing ──

let planDetected = false

function processStreamEvent(
  event: Record<string, unknown>,
  onEvent: (event: OrchestratorEvent) => void
): void {
  switch (event.type) {
    case 'assistant': {
      const message = event.message as Record<string, unknown> | undefined
      const content = message?.content

      if (Array.isArray(content)) {
        for (const block of content) {
          if (block?.type === 'text' && block?.text) {
            const text = block.text as string
            accumulatedCeoText += text

            // Detect plan via markers
            if (!planDetected) {
              const planMatch = accumulatedCeoText.match(/---PLAN_START---([\s\S]*?)---PLAN_END---/)
              if (planMatch) {
                planDetected = true
                const planContent = planMatch[1].trim()
                state.plan = planContent
                const agentIds = extractAgentIdsFromPlan(planContent)
                state.onlineAgents = ['ceo', ...agentIds]
                state.ceoStatus = 'executing'

                onEvent({ type: 'plan', plan: planContent, agentIds })
                onEvent({ type: 'agents-selected', agentIds })
                onEvent({ type: 'status', status: 'executing' })
              }
            }

            // Emit sub-stream if a sub-agent is currently running
            const runningAgent = Array.from(state.subAgents.values()).find(s => s.status === 'running')
            if (runningAgent) {
              onEvent({ type: 'sub-stream', agentId: runningAgent.agentId, text })
            }
          }

          // Detect Agent tool use (sub-agent spawn)
          if (block?.type === 'tool_use' && block?.name === 'Agent') {
            const input = block.input as Record<string, unknown> | undefined
            // SDK uses subagent_type for the agent ID
            const agentId = (input?.subagent_type as string) || (input?.agent_name as string) || (input?.name as string) || 'unknown'
            const agentPrompt = (input?.prompt as string) || (input?.description as string) || ''

            // Extract task description
            const taskMatch = agentPrompt.match(/任务[:：](.+?)(?:\n|$)/)
            const task = taskMatch ? taskMatch[1].trim() : agentPrompt.slice(0, 100)

            const agentDef = AGENT_REGISTRY.find(a => a.id === agentId)

            state.subAgents.set(agentId, {
              agentId,
              name: agentDef?.name || agentId,
              status: 'running',
              task,
              output: '',
              startTime: Date.now(),
            })

            state.ceoStatus = 'executing'

            onEvent({
              type: 'sub-start',
              agentId,
              name: agentDef?.name || agentId,
              task,
            })

            // Update progress
            emitProgress(onEvent)
          }
        }
      }
      break
    }

    // Sub-agent results come back as type: "user" with tool_use_result or tool_result content
    case 'user': {
      const msg = event.message as Record<string, unknown> | undefined
      const userContent = msg?.content
      // Check for tool_use_result in the event itself (SDK format)
      const toolUseResult = event.tool_use_result as Record<string, unknown> | undefined
      const toolUseResultStatus = typeof toolUseResult?.status === 'string'
        ? toolUseResult.status
        : ''
      if (toolUseResult && (toolUseResultStatus === 'completed' || toolUseResultStatus === 'error')) {
        const resultContent = Array.isArray(toolUseResult.content)
          ? (toolUseResult.content as Array<Record<string, unknown>>)
              .filter(b => b.type === 'text')
              .map(b => b.text)
              .join('\n')
          : String(toolUseResult.content || '')
        const isError = toolUseResultStatus === 'error'

        const runningAgents = Array.from(state.subAgents.values())
          .filter(s => s.status === 'running')

        if (runningAgents.length > 0) {
          const agent = runningAgents[runningAgents.length - 1]
          agent.endTime = Date.now()
          if (isError) {
            agent.status = 'error'
            onEvent({ type: 'sub-error', agentId: agent.agentId, error: resultContent })
          } else {
            agent.status = 'done'
            agent.output = resultContent
            onEvent({ type: 'sub-done', agentId: agent.agentId, result: resultContent })
          }
          emitProgress(onEvent)

          const stillRunning = Array.from(state.subAgents.values())
            .filter(s => s.status === 'running')
          if (stillRunning.length === 0 && state.ceoStatus === 'executing') {
            state.ceoStatus = 'reviewing'
            onEvent({ type: 'status', status: 'reviewing' })
          }
        }
      }
      // Also check array content for tool_result blocks
      if (Array.isArray(userContent)) {
        for (const block of (userContent as Array<Record<string, unknown>>)) {
          if (block.type === 'tool_result') {
            const resultContent = typeof block.content === 'string'
              ? block.content
              : Array.isArray(block.content)
                ? (block.content as Array<Record<string, unknown>>).filter(b => b.type === 'text').map(b => b.text).join('\n')
                : JSON.stringify(block.content)

            const runningAgents = Array.from(state.subAgents.values())
              .filter(s => s.status === 'running')

            if (runningAgents.length > 0) {
              const agent = runningAgents[runningAgents.length - 1]
              agent.endTime = Date.now()
              agent.status = 'done'
              agent.output = resultContent
              onEvent({ type: 'sub-done', agentId: agent.agentId, result: resultContent })
              emitProgress(onEvent)

              const stillRunning = Array.from(state.subAgents.values())
                .filter(s => s.status === 'running')
              if (stillRunning.length === 0 && state.ceoStatus === 'executing') {
                state.ceoStatus = 'reviewing'
                onEvent({ type: 'status', status: 'reviewing' })
              }
            }
          }
        }
      }
      break
    }

    case 'tool_result': {
      const toolResult = event.tool_result as Record<string, unknown> | undefined
      if (toolResult) {
        const resultContent = typeof toolResult.content === 'string'
          ? toolResult.content
          : JSON.stringify(toolResult.content)
        const isError = !!toolResult.is_error

        // Find the most recent running sub-agent
        const runningAgents = Array.from(state.subAgents.values())
          .filter(s => s.status === 'running')

        if (runningAgents.length > 0) {
          const agent = runningAgents[runningAgents.length - 1]
          agent.endTime = Date.now()

          if (isError) {
            agent.status = 'error'
            onEvent({ type: 'sub-error', agentId: agent.agentId, error: resultContent })
          } else {
            agent.status = 'done'
            agent.output = resultContent
            onEvent({ type: 'sub-done', agentId: agent.agentId, result: resultContent })
          }

          emitProgress(onEvent)

          // If no more running agents, CEO is reviewing
          const stillRunning = Array.from(state.subAgents.values())
            .filter(s => s.status === 'running')
          if (stillRunning.length === 0 && state.ceoStatus === 'executing') {
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

function emitProgress(onEvent: (event: OrchestratorEvent) => void): void {
  const allAgents = Array.from(state.subAgents.values())
  const running = allAgents.filter(s => s.status === 'running').map(s => s.agentId)
  onEvent({
    type: 'progress',
    done: allAgents.filter(s => s.status === 'done').length,
    total: state.subAgents.size,
    running,
  })
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
  state.onlineAgents = []
  planDetected = false
  accumulatedCeoText = ''
}

// ── IPC Push Helpers ──

export function broadcastToAll(channel: string, ...args: unknown[]): void {
  for (const win of BrowserWindow.getAllWindows()) {
    if (!win.isDestroyed()) {
      win.webContents.send(channel, ...args)
    }
  }
}
