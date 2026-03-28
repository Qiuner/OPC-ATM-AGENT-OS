import Anthropic from '@anthropic-ai/sdk'
import {
  EXPERT_ROLE_DEFINITIONS,
  isContextAssetType,
  isExpertRoleId,
  type ContextAssetType,
  type ExpertRoleId,
} from '../shared/context-ownership'

export interface ContextAutoClassifyResult {
  type: ContextAssetType
  expert_role_id: ExpertRoleId
  title: string
  rawText: string
  model: string
}

const DEFAULT_MODEL = 'claude-sonnet-4-20250514'

const SYSTEM_PROMPT = `你是一个严格的上下文资产分类器。

你的任务是根据用户提供的“内容”，完成营销资产归类。

你必须只返回固定 3 行，且不要输出任何额外解释：
CATEGORY: <product|brand|audience|content>
EXPERT: <必须从给定专家枚举中选择一个>
TITLE: <8-30字的中文资产名称总结>

规则：
1. CATEGORY 只能是 product、brand、audience、content 之一。
2. EXPERT 只能是提供给你的专家 id 之一。
3. TITLE 必须简洁、稳定、可直接作为资产名称。
4. 不要输出 Markdown，不要输出多余标点，不要输出分析过程。`

function extractTextFromMessage(message: Awaited<ReturnType<Anthropic['messages']['create']>>): string {
  if (!('content' in message)) return ''

  return message.content
    .filter((block): block is Extract<(typeof message.content)[number], { type: 'text' }> => block.type === 'text')
    .map((block) => block.text)
    .join('\n')
    .trim()
}

function parseField(name: string, text: string): string | null {
  const pattern = new RegExp(`^${name}:\\s*(.+)$`, 'mi')
  return text.match(pattern)?.[1]?.trim() ?? null
}

export async function classifyContextContent(content: string): Promise<ContextAutoClassifyResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY?.trim()
  const baseURL = process.env.ANTHROPIC_BASE_URL?.trim()
  const model = process.env.ANTHROPIC_MODEL?.trim() || DEFAULT_MODEL

  if (!apiKey) {
    throw new Error('Missing ANTHROPIC_API_KEY in .env')
  }

  if (!baseURL) {
    throw new Error('Missing ANTHROPIC_BASE_URL in .env')
  }

  const client = new Anthropic({
    apiKey,
    baseURL,
  })

  const expertOptions = EXPERT_ROLE_DEFINITIONS.map((role) => `${role.id}: ${role.label}`).join('\n')

  const response = await client.messages.create({
    model,
    max_tokens: 120,
    temperature: 0,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: `专家枚举：
${expertOptions}

待分类内容：
${content}`,
      },
    ],
  })

  const rawText = extractTextFromMessage(response)
  const category = parseField('CATEGORY', rawText)
  const expertRoleId = parseField('EXPERT', rawText)
  const title = parseField('TITLE', rawText)

  if (!category || !isContextAssetType(category)) {
    throw new Error(`AI returned invalid CATEGORY: ${category ?? 'empty'}`)
  }

  if (!expertRoleId || !isExpertRoleId(expertRoleId)) {
    throw new Error(`AI returned invalid EXPERT: ${expertRoleId ?? 'empty'}`)
  }

  if (!title) {
    throw new Error('AI returned empty TITLE')
  }

  return {
    type: category,
    expert_role_id: expertRoleId,
    title,
    rawText,
    model,
  }
}
