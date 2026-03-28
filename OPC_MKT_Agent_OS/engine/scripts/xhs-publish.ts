#!/usr/bin/env npx tsx
/**
 * 小红书发布脚本 — 直接调用 Playwright 发布，不经过 Claude CLI
 *
 * 用法:
 *   npx tsx scripts/xhs-publish.ts '{"title":"标题","content":"正文","tags":["标签"],"images":[]}'
 *
 * 输出: 每行一个 JSON，type 为 progress 或 result
 *   {"type":"progress","stage":"navigate","message":"正在打开创作者发布页..."}
 *   {"type":"result","success":true,"noteUrl":"..."}
 *
 * 退出码: 0=成功, 1=失败
 */

import { publishNote } from '../mcps/xhs-data/browser.js'

function emit(data: Record<string, unknown>): void {
  process.stdout.write(JSON.stringify(data) + '\n')
}

async function main(): Promise<void> {
  const raw = process.argv[2]
  if (!raw) {
    emit({ type: 'result', success: false, error: '缺少参数，请传入 JSON 字符串' })
    process.exit(1)
  }

  let params: { title: string; content: string; tags?: string[]; images?: string[] }
  try {
    params = JSON.parse(raw)
  } catch {
    emit({ type: 'result', success: false, error: 'JSON 参数解析失败' })
    process.exit(1)
  }

  if (!params.title || !params.content) {
    emit({ type: 'result', success: false, error: '缺少 title 或 content' })
    process.exit(1)
  }

  try {
    const result = await publishNote({
      title: params.title,
      content: params.content,
      tags: params.tags || [],
      images: params.images || [],
      onProgress: (stage, message, detail) => {
        emit({ type: 'progress', stage, message, detail })
      },
    })
    emit({ type: 'result', ...result })
    process.exit(result.success ? 0 : 1)
  } catch (err) {
    emit({
      type: 'result',
      success: false,
      error: err instanceof Error ? err.message : '发布异常',
    })
    process.exit(1)
  }
}

main()
