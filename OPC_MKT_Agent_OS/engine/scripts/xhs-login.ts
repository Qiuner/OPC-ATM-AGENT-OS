#!/usr/bin/env npx tsx
/**
 * 小红书登录脚本 — 直接调用 Playwright 启动 QR 扫码登录
 *
 * 用法:
 *   npx tsx scripts/xhs-login.ts
 *
 * 输出: 每行一个 JSON，type 为 progress 或 result
 *   {"type":"progress","message":"正在启动浏览器窗口..."}
 *   {"type":"result","status":"success","message":"登录成功，cookie 已保存"}
 *
 * 退出码: 0=成功, 1=失败/超时
 */

import { startQRLogin, closeBrowser } from '../mcps/xhs-data/browser.js'

function emit(data: Record<string, unknown>): void {
  process.stdout.write(JSON.stringify(data) + '\n')
}

async function main(): Promise<void> {
  emit({ type: 'progress', message: '正在启动浏览器窗口，请扫码登录...' })

  try {
    const result = await startQRLogin()
    emit({ type: 'result', ...result })

    await closeBrowser()
    process.exit(result.status === 'success' ? 0 : 1)
  } catch (err) {
    emit({
      type: 'result',
      status: 'error',
      message: err instanceof Error ? err.message : '登录异常',
    })
    await closeBrowser().catch(() => {})
    process.exit(1)
  }
}

main()
