/**
 * Content Parser — 使用 Haiku 从 Agent 原始输出中提取结构化内容 + 多平台适配
 *
 * 核心流程：
 * 1. 调用 Claude Haiku API 提取 title / body / tags / imageUrls
 * 2. 同时生成 7 个平台的适配版本（小红书/X/LinkedIn/TikTok/Meta/Email/Blog）
 * 3. 超时或失败时 fallback 到正则提取（无平台适配）
 */

import { readFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { join, isAbsolute } from 'node:path'
import { pipelineLog } from './pipeline-logger'

// ── Types ──

export interface ParsedContent {
  title: string
  body: string
  tags: string[]
}

/** Platform-specific adapted content */
export interface PlatformAdaptation {
  title: string
  body: string
  tags: string[]
  extra?: Record<string, string>
}

export type AdaptPlatformKey = 'xiaohongshu' | 'x' | 'linkedin' | 'tiktok' | 'meta' | 'email' | 'blog'

/** Enhanced parse result with image URLs and platform adaptations */
export interface EnhancedParsedContent extends ParsedContent {
  imageUrls: string[]
  platforms: Partial<Record<AdaptPlatformKey, PlatformAdaptation>>
}

// ── Engine Dir Helper ──

function getEngineDir(): string {
  return join(__dirname, '../../..', 'engine')
}

/**
 * Resolve file references in CEO output.
 * CEO often outputs summaries like "完整内容已保存至 engine/output/xxx.md".
 * This function detects such references, reads the actual file, and returns the content.
 */
async function resolveFileReferences(rawText: string): Promise<string> {
  // Generic approach: find ALL .md file paths in the text (absolute or engine-relative)
  // This handles any CEO output format without needing specific Chinese keyword patterns
  const mdPathPattern = /[`"']?((?:\/[\w./-]+|engine\/[\w./-]+)\.md)[`"']?/g

  const candidates: string[] = []
  for (const m of rawText.matchAll(mdPathPattern)) {
    candidates.push(m[1].trim())
  }

  // Also try specific keyword-prefixed patterns for relative paths like "output/xxx.md"
  const keywordPattern = /(?:保存|写入|全文|文件|笔记|内容|saved?\s*(?:to|at)?)[：:]*\s*[`"']?([\w./-]+\.md)[`"']?/gi
  for (const m of rawText.matchAll(keywordPattern)) {
    candidates.push(m[1].trim())
  }

  // Deduplicate
  const uniquePaths = [...new Set(candidates)]

  for (const filePath of uniquePaths) {
    const resolvedPath = isAbsolute(filePath)
      ? filePath
      : filePath.startsWith('engine/')
        ? join(getEngineDir(), '..', filePath)
        : join(getEngineDir(), filePath)

    if (existsSync(resolvedPath)) {
      try {
        const content = await readFile(resolvedPath, 'utf-8')
        if (content.length > rawText.length) {
          console.log('[ContentParser] Resolved file reference: %s (%d chars)', resolvedPath, content.length)
          pipelineLog('resolve_file_ref', { path: resolvedPath, length: content.length })
          return content
        }
      } catch { /* ignore read errors */ }
    }
  }

  return rawText
}

// ── Parse Config ──

const PARSE_TIMEOUT_MS = 20_000
const ENHANCED_TIMEOUT_MS = 30_000

// ── Basic Parse (legacy) ──

const SYSTEM_PROMPT = `你是一个内容提取工具。从用户提供的社交媒体内容创作结果中，精确提取以下字段并以 JSON 格式输出：

{
  "title": "标题文本（纯文本，不含标点装饰，不超过20字）",
  "body": "正文文本（纯文本）",
  "tags": ["标签1", "标签2", "标签3"]
}

提取规则：
- title: 提取"标题"字段的内容，去掉字数统计如"（15/20）"，去掉 emoji 装饰，保留核心内容
- body: 提取"正文"字段的内容。必须去除所有 markdown 格式（**粗体**、##标题、- 列表等），去除字数统计如"（800/1000）"，去除"自检结果"、"研究依据"等非正文段落。保留 emoji 表情。
- tags: 提取"标签"字段中的标签，去掉 # 符号，返回纯文本数组

如果找不到明确的标题/正文/标签结构，尽力从内容中提取最合理的标题和正文。
只输出 JSON，不要其他任何文字。`

// ── Enhanced Parse (with platform adaptations) ──

const ENHANCED_SYSTEM_PROMPT = `你是一个内容提取 + 多平台适配工具。

## 任务 1: 从原始 Agent 输出中提取结构化数据
提取：title, body, tags, imageUrls。

## 任务 2: 为 7 个平台生成适配版本
基于提取的内容，为每个平台生成符合该平台规范的内容版本。

输出严格 JSON 格式：
{
  "title": "提取的标题（纯文本，≤20字）",
  "body": "提取的正文（纯文本，去除 markdown/自检/字数统计）",
  "tags": ["标签1", "标签2"],
  "imageUrls": ["从内容中提取的图片路径或URL"],
  "platforms": {
    "xiaohongshu": {
      "title": "≤20字标题",
      "body": "≤1000字纯文本正文（无markdown，保留emoji，像朋友聊天的口吻）",
      "tags": ["标签1", "标签2", "标签3"]
    },
    "x": {
      "title": "",
      "body": "≤280字符推文（hashtags计入字数，简洁有力，英文）",
      "tags": ["tag1", "tag2"]
    },
    "linkedin": {
      "title": "",
      "body": "专业但人性化，3-5段，末尾加引导评论的问题，英文",
      "tags": ["tag1", "tag2", "tag3"],
      "extra": { "cta": "引导评论的问题（英文）" }
    },
    "tiktok": {
      "title": "",
      "body": "[Hook - 3s] 吸引注意的一句话\\n[Main - 15-45s] 核心内容\\n[CTA - 3s] 引导互动",
      "tags": ["tag1", "tag2"]
    },
    "meta": {
      "title": "",
      "body": "轻松随意语气，50-150词，适量emoji，英文",
      "tags": ["tag1", "tag2", "tag3"]
    },
    "email": {
      "title": "邮件主题行（6-10词，英文）",
      "body": "邮件正文（含问候语+价值内容+CTA，英文）",
      "tags": [],
      "extra": { "preheader": "≤80字符预览文本", "cta": "CTA按钮文本" }
    },
    "blog": {
      "title": "含SEO关键词的标题（英文）",
      "body": "完整博客正文（含H2子标题结构，英文）",
      "tags": ["keyword1", "keyword2"],
      "extra": { "metaDescription": "≤155字符SEO描述", "slug": "url-friendly-slug" }
    }
  }
}

## 提取规则
- title: 提取"标题"字段，去掉字数统计和装饰
- body: 提取"正文"字段，去除所有 markdown 格式、字数统计、自检结果等非正文段落，保留 emoji
- tags: 提取标签，去掉 # 符号
- imageUrls: 提取所有出现的图片文件路径（如 ./output/xxx.png, /tmp/xxx.jpg）和图片URL

## 平台适配规则
- 小红书：中文，纯文本无markdown，标题≤20字，正文≤1000字，保留emoji，像朋友聊天
- X/Twitter：英文，总计≤280字符（含hashtags），简洁有力
- LinkedIn：英文，专业但人性化，末尾引导评论的问题
- TikTok：英文，[Hook]+[Main]+[CTA] 脚本格式
- Meta/Facebook：英文，轻松随意，50-150词，emoji适量
- Email：英文，主题行6-10词，正文含问候+价值+CTA按钮
- Blog：英文，SEO优化标题，≤155字元描述，完整正文含H2结构

如果原始内容是中文：小红书保持中文，其他平台翻译为英文。
如果原始内容是英文：所有平台用英文。

只输出 JSON，不要其他任何文字。`

// ── CLI-based LLM Call ──

/**
 * Call local Claude CLI for content parsing — no API key management needed.
 * Uses `claude -p --model haiku` for fast, cheap parsing.
 */
async function callLlmApi<T>(
  systemPrompt: string,
  userContent: string,
  _maxTokens: number,
  timeoutMs: number,
): Promise<T | null> {
  const { spawn: spawnChild } = await import('node:child_process')

  const prompt = `${systemPrompt}\n\n---\n\n${userContent}`

  pipelineLog('cli_parse_call', {
    timeoutMs,
    inputLength: userContent.length,
    inputPreview: userContent.slice(0, 300),
  })

  return new Promise<T | null>((resolve) => {
    // Ensure PATH includes common CLI locations; clear CLAUDECODE to avoid nested-session block
    const env = { ...process.env }
    delete env.CLAUDECODE
    const extraPaths = ['/usr/local/bin', '/opt/homebrew/bin', `${env.HOME}/bin`, `${env.HOME}/.local/bin`]
    env.PATH = [...extraPaths, env.PATH].join(':')

    const proc = spawnChild('claude', ['-p', '--model', 'haiku', '--output-format', 'text', '--', prompt], {
      cwd: getEngineDir(),
      env,
      stdio: ['ignore', 'pipe', 'pipe'],
    })

    let stdout = ''
    let stderr = ''
    proc.stdout?.on('data', (chunk: Buffer) => { stdout += chunk.toString() })
    proc.stderr?.on('data', (chunk: Buffer) => { stderr += chunk.toString() })

    const timer = setTimeout(() => {
      proc.kill('SIGTERM')
      pipelineLog('cli_parse_timeout', { timeoutMs }, 'warn')
      console.warn('[ContentParser] CLI parse timed out')
      resolve(null)
    }, timeoutMs)

    proc.on('close', (code) => {
      clearTimeout(timer)
      if (code !== 0) {
        pipelineLog('cli_parse_error', { code, stderr: stderr.slice(0, 500) }, 'error')
        console.error('[ContentParser] CLI parse failed, code:', code, stderr.slice(0, 200))
        resolve(null)
        return
      }

      try {
        const jsonStr = stdout
          .replace(/^```json?\s*\n?/m, '')
          .replace(/\n?```\s*$/m, '')
          .trim()
        pipelineLog('cli_parse_response', {
          responseLength: stdout.length,
          responsePreview: stdout.slice(0, 500),
        })
        resolve(JSON.parse(jsonStr) as T)
      } catch (err) {
        pipelineLog('cli_parse_json_fail', { error: String(err), output: stdout.slice(0, 500) }, 'error')
        console.error('[ContentParser] CLI parse JSON failed:', (err as Error).message)
        resolve(null)
      }
    })

    proc.on('error', (err) => {
      clearTimeout(timer)
      pipelineLog('cli_parse_spawn_fail', { error: err.message }, 'error')
      console.error('[ContentParser] CLI spawn failed:', err.message)
      resolve(null)
    })
  })
}

// ── Basic Parse (legacy) ──

async function callHaiku(rawContent: string): Promise<ParsedContent | null> {
  const raw = await callLlmApi<{ title?: string; body?: string; tags?: string[] }>(
    SYSTEM_PROMPT, rawContent, 2048, PARSE_TIMEOUT_MS,
  )
  if (!raw) return null

  return {
    title: (raw.title ?? '').trim(),
    body: (raw.body ?? '').trim(),
    tags: Array.isArray(raw.tags)
      ? raw.tags.map(t => String(t).replace(/#/g, '').trim()).filter(Boolean)
      : [],
  }
}

// ── Enhanced Parse ──

interface RawEnhancedResponse {
  title?: string
  body?: string
  tags?: string[]
  imageUrls?: string[]
  platforms?: Record<string, {
    title?: string; body?: string; tags?: string[];
    extra?: Record<string, string>
  }>
}

function normalizePlatforms(
  raw: RawEnhancedResponse['platforms']
): Partial<Record<AdaptPlatformKey, PlatformAdaptation>> {
  if (!raw || typeof raw !== 'object') return {}
  const result: Partial<Record<AdaptPlatformKey, PlatformAdaptation>> = {}
  const validKeys: AdaptPlatformKey[] = ['xiaohongshu', 'x', 'linkedin', 'tiktok', 'meta', 'email', 'blog']

  for (const key of validKeys) {
    const entry = raw[key]
    if (entry && typeof entry === 'object') {
      result[key] = {
        title: String(entry.title ?? '').trim(),
        body: String(entry.body ?? '').trim(),
        tags: Array.isArray(entry.tags)
          ? entry.tags.map(t => String(t).replace(/#/g, '').trim()).filter(Boolean)
          : [],
        extra: entry.extra && typeof entry.extra === 'object' ? entry.extra : undefined,
      }
    }
  }
  return result
}

async function callHaikuEnhanced(rawContent: string): Promise<EnhancedParsedContent | null> {
  const raw = await callLlmApi<RawEnhancedResponse>(
    ENHANCED_SYSTEM_PROMPT, rawContent, 4096, ENHANCED_TIMEOUT_MS,
  )
  if (!raw) return null

  return {
    title: (raw.title ?? '').trim(),
    body: (raw.body ?? '').trim(),
    tags: Array.isArray(raw.tags)
      ? raw.tags.map(t => String(t).replace(/#/g, '').trim()).filter(Boolean)
      : [],
    imageUrls: Array.isArray(raw.imageUrls)
      ? raw.imageUrls.map(u => String(u).trim()).filter(Boolean)
      : [],
    platforms: normalizePlatforms(raw.platforms),
  }
}

// ── Regex Fallbacks ──

function fallbackParse(text: string): ParsedContent {
  let title = ''
  let body = ''
  const tags: string[] = []

  const lines = text.split('\n')

  // Extract title — supports both "标题：xxx" and "## 标题(...)\nxxx" formats
  const titleLineIdx = lines.findIndex(l => /^(#{1,3}\s*)?标题[（(]?/i.test(l.trim()))
  if (titleLineIdx !== -1) {
    const titleLine = lines[titleLineIdx].trim()
    // Check if title text is on the same line (e.g. "标题：xxx" or "标题（18字/20）xxx")
    const inlineTitle = titleLine
      .replace(/^#{1,3}\s*/, '')
      .replace(/^标题[（(][^）)]*[）)][：:]?\s*/i, '')
      .replace(/^标题[：:]\s*/i, '')
      .trim()
    if (inlineTitle) {
      title = inlineTitle
    } else {
      // Title is on the next non-empty line
      for (let i = titleLineIdx + 1; i < lines.length; i++) {
        const nextLine = lines[i].trim()
        if (nextLine) { title = nextLine; break }
      }
    }
  }

  // Extract body — supports both "正文：xxx" and "## 正文(...)\nxxx" formats
  const bodyStartIdx = lines.findIndex(l => /^(#{1,3}\s*)?正文[（(]?/i.test(l.trim()))
  if (bodyStartIdx !== -1) {
    const bodyLines: string[] = []
    // Check if body starts on the same line
    const firstLine = lines[bodyStartIdx].trim()
      .replace(/^#{1,3}\s*/, '')
      .replace(/^正文[（(][^）)]*[）)][：:]?\s*/i, '')
      .replace(/^正文[：:]\s*/i, '')
      .trim()
    if (firstLine) bodyLines.push(firstLine)

    for (let i = bodyStartIdx + 1; i < lines.length; i++) {
      const trimmed = lines[i].trim()
      if (/^[（(]\d+\/\d+[）)]/.test(trimmed)) break
      // Stop at markdown section headers (## 标签, ## 配图 etc.) — require ## prefix to avoid matching body content like "配图环节"
      if (/^#{1,3}\s+(标签|配图|研究依据|自检结果|图片|元数据|配图描述)/.test(trimmed)) break
      if (/^【/.test(trimmed) && trimmed !== '【待发布内容预览】') break
      bodyLines.push(lines[i])
    }
    body = bodyLines.join('\n').trim()
  }

  // If no structured markers found, use the whole text (minus common noise)
  if (!title && !body) {
    body = text
      .replace(/【.*?】/g, '')
      .replace(/自检结果[\s\S]*$/m, '')
      .trim()
    const firstLine = body.split('\n').find(l => l.trim().length > 0 && l.trim().length <= 30)
    if (firstLine) {
      title = firstLine.trim()
      body = body.replace(firstLine, '').trim()
    }
  }

  // Extract tags — supports both "标签：#xxx#" and "## 标签\n#xxx#" formats
  const tagLineIdx = lines.findIndex(l => /^(#{1,3}\s*)?标签[：:]?/i.test(l.trim()))
  if (tagLineIdx !== -1) {
    // Collect tag text from this line and subsequent lines until next section
    let tagText = lines[tagLineIdx]
    for (let i = tagLineIdx + 1; i < lines.length; i++) {
      const trimmed = lines[i].trim()
      if (!trimmed) break
      if (/^(#{1,3}\s*)?(配图|研究依据|自检结果|元数据)/.test(trimmed)) break
      tagText += ' ' + trimmed
    }
    const tagMatches = tagText.match(/#[\u4e00-\u9fa5a-zA-Z0-9_]+#?/g)
    if (tagMatches) {
      for (const t of tagMatches) {
        const tag = t.replace(/#/g, '')
        if (tag && !tags.includes(tag)) tags.push(tag)
      }
    }
  }

  // Strip markdown from body
  body = body
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/~~(.+?)~~/g, '$1')
    .replace(/`(.+?)`/g, '$1')
    .replace(/^\s*[-*+]\s+/gm, '')
    .replace(/^\s*\d+\.\s+/gm, '')
    .replace(/\[(.+?)\]\(.+?\)/g, '$1')
    .replace(/^>\s?/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()

  return { title, body, tags }
}

/** Regex extraction of image URLs/paths from raw text */
export function extractImageUrlsRegex(text: string): string[] {
  const urls: string[] = []
  const imgExt = 'png|jpe?g|webp|gif|svg'
  const pathPatterns = [
    // Absolute paths: /Users/.../xxx.png
    new RegExp(`(/[\\w./-]+\\.(?:${imgExt}))`, 'gi'),
    // Relative paths starting with engine/: engine/tools/.../xxx.png
    new RegExp(`(engine/[\\w./-]+\\.(?:${imgExt}))`, 'gi'),
    // Relative paths starting with ./: ./output/xxx.png
    new RegExp(`(\\./[\\w./-]+\\.(?:${imgExt}))`, 'gi'),
    // HTTP image URLs
    new RegExp(`(https?://\\S+\\.(?:${imgExt}))`, 'gi'),
  ]
  for (const pat of pathPatterns) {
    for (const m of text.matchAll(pat)) {
      urls.push(m[1].trim())
    }
  }
  return [...new Set(urls)]
}

// ── Public API ──

/**
 * Parse raw agent output into structured content (basic).
 * Tries Haiku first, falls back to regex extraction.
 */
export async function parseContent(rawText: string): Promise<ParsedContent> {
  const haiku = await callHaiku(rawText)
  if (haiku && (haiku.title || haiku.body)) {
    console.log('[ContentParser] Haiku parse succeeded: title=%s, bodyLen=%d, tags=%d',
      haiku.title.slice(0, 20), haiku.body.length, haiku.tags.length)
    return haiku
  }

  console.log('[ContentParser] Using fallback regex parser')
  return fallbackParse(rawText)
}

/** Resolve relative image paths to absolute + filter to existing files */
function resolveImageUrls(rawText: string, resolvedText: string): string[] {
  const rawUrls = [
    ...extractImageUrlsRegex(rawText),
    ...extractImageUrlsRegex(resolvedText),
  ]
  return [...new Set(
    rawUrls.map(u => {
      if (u.startsWith('http') || isAbsolute(u)) return u
      if (u.startsWith('engine/')) return join(getEngineDir(), '..', u)
      return join(getEngineDir(), u)
    }).filter(u => u.startsWith('http') || existsSync(u))
  )]
}

/**
 * Quick parse: fast extraction of title/body/tags/imageUrls.
 * Uses basic parse (faster, ~15s) for immediate display.
 * Platform adaptations are deferred to submitToReview background processing.
 */
export async function quickParseContent(rawText: string): Promise<{
  title: string; body: string; tags: string[]; imageUrls: string[]
  platforms: Partial<Record<AdaptPlatformKey, PlatformAdaptation>>
}> {
  const resolvedText = await resolveFileReferences(rawText)
  const imageUrls = resolveImageUrls(rawText, resolvedText)

  // Use basic parse for speed — platform adaptations handled after submit
  const basic = await parseContent(resolvedText)
  if (basic.title || basic.body) {
    console.log('[ContentParser] Quick parse succeeded: title=%s images=%d',
      basic.title.slice(0, 20), imageUrls.length)
    return { ...basic, imageUrls, platforms: {} }
  }

  // Regex fallback
  console.log('[ContentParser] Quick parse falling back to regex')
  const fb = fallbackParse(resolvedText)
  return { ...fb, imageUrls, platforms: {} }
}

// ── Platform Adaptation Only ──

const ADAPT_ONLY_SYSTEM_PROMPT = `你是一个多平台内容适配工具。用户会给你一段已经提取好的社交媒体内容正文。
你需要为 7 个平台生成适配版本。

输出严格 JSON 格式：
{
  "xiaohongshu": {
    "title": "≤20字标题",
    "body": "≤1000字纯文本正文（无markdown，保留emoji，像朋友聊天的口吻）",
    "tags": ["标签1", "标签2", "标签3"]
  },
  "x": {
    "title": "",
    "body": "≤280字符推文（hashtags计入字数，简洁有力，英文）",
    "tags": ["tag1", "tag2"]
  },
  "linkedin": {
    "title": "",
    "body": "专业但人性化，3-5段，末尾加引导评论的问题，英文",
    "tags": ["tag1", "tag2", "tag3"],
    "extra": { "cta": "引导评论的问题（英文）" }
  },
  "tiktok": {
    "title": "",
    "body": "[Hook - 3s] 吸引注意的一句话\\n[Main - 15-45s] 核心内容\\n[CTA - 3s] 引导互动",
    "tags": ["tag1", "tag2"]
  },
  "meta": {
    "title": "",
    "body": "轻松随意语气，50-150词，适量emoji，英文",
    "tags": ["tag1", "tag2", "tag3"]
  },
  "email": {
    "title": "邮件主题行（6-10词，英文）",
    "body": "邮件正文（含问候语+价值内容+CTA，英文）",
    "tags": [],
    "extra": { "preheader": "≤80字符预览文本", "cta": "CTA按钮文本" }
  },
  "blog": {
    "title": "含SEO关键词的标题（英文）",
    "body": "完整博客正文（含H2子标题结构，英文）",
    "tags": ["keyword1", "keyword2"],
    "extra": { "metaDescription": "≤155字符SEO描述", "slug": "url-friendly-slug" }
  }
}

规则：
- 如果原始内容是中文：小红书保持中文，其他平台翻译为英文
- 如果原始内容是英文：所有平台用英文
- 只输出 JSON，不要其他任何文字`

const ADAPT_TIMEOUT_MS = 20_000

/**
 * Generate platform adaptations only (no base extraction).
 * Used after approval to create 7-platform adapted versions.
 */
export async function adaptPlatformsOnly(
  bodyText: string
): Promise<Partial<Record<AdaptPlatformKey, PlatformAdaptation>>> {
  const raw = await callLlmApi<Record<string, {
    title?: string; body?: string; tags?: string[];
    extra?: Record<string, string>
  }>>(ADAPT_ONLY_SYSTEM_PROMPT, bodyText, 4096, ADAPT_TIMEOUT_MS)

  if (!raw) return {}
  return normalizePlatforms(raw)
}

/**
 * Enhanced parse: extracts structured content + 7-platform adaptations + image URLs.
 * Single Haiku API call. Falls back to basic parseContent() on failure.
 */
export async function parseContentEnhanced(rawText: string): Promise<EnhancedParsedContent> {
  // Resolve file references first
  const resolvedText = await resolveFileReferences(rawText)

  pipelineLog('parse_enhanced_start', {
    rawTextLength: resolvedText.length,
    rawTextPreview: resolvedText.slice(0, 300),
    hasStructuredMarkers: {
      title: /标题[：:]/.test(resolvedText),
      body: /正文[：:]/.test(resolvedText),
      tags: /标签[：:]/.test(resolvedText),
      imageUrl: /\.(png|jpe?g|webp|gif|svg)/i.test(resolvedText),
    },
    fileResolved: resolvedText !== rawText,
  })

  const enhanced = await callHaikuEnhanced(resolvedText)
  if (enhanced && (enhanced.title || enhanced.body)) {
    pipelineLog('parse_enhanced_success', {
      title: enhanced.title,
      bodyLength: enhanced.body.length,
      bodyPreview: enhanced.body.slice(0, 200),
      tags: enhanced.tags,
      imageUrls: enhanced.imageUrls,
      platformKeys: Object.keys(enhanced.platforms),
    })
    console.log('[ContentParser] Enhanced parse succeeded: platforms=%d, images=%d',
      Object.keys(enhanced.platforms).length, enhanced.imageUrls.length)
    return enhanced
  }

  // Fallback: use basic parse + regex image extraction
  pipelineLog('parse_enhanced_fallback', { reason: 'enhanced parse returned null or empty' }, 'warn')
  console.log('[ContentParser] Enhanced parse failed, falling back to basic parse')
  const basic = await parseContent(resolvedText)
  const regexImages = [...new Set([...extractImageUrlsRegex(rawText), ...extractImageUrlsRegex(resolvedText)])]
  pipelineLog('parse_fallback_result', {
    title: basic.title,
    bodyLength: basic.body.length,
    tags: basic.tags,
    regexImages,
  })
  return {
    ...basic,
    imageUrls: regexImages,
    platforms: {},
  }
}
