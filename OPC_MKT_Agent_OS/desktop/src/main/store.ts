/**
 * 本地 JSON 文件 Store — 从 web/src/lib/store/index.ts 迁移
 *
 * 在 Electron main 进程中运行，使用 app.getPath('userData') 存储数据，
 * 首次启动时从项目 web/src/data/ 目录拷贝种子数据。
 */

import fs from 'fs'
import path from 'path'
import { app } from 'electron'

const DATA_DIR = path.join(app.getPath('userData'), 'data')

/** 确保数据目录存在 */
function ensureDataDir(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true })
  }
}

function getFilePath(collection: string): string {
  return path.join(DATA_DIR, `${collection}.json`)
}

export function readCollection<T>(collection: string): T[] {
  ensureDataDir()
  const filePath = getFilePath(collection)
  if (!fs.existsSync(filePath)) {
    return []
  }
  const raw = fs.readFileSync(filePath, 'utf-8')
  return JSON.parse(raw) as T[]
}

export function writeCollection<T>(collection: string, data: T[]): void {
  ensureDataDir()
  const filePath = getFilePath(collection)
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8')
}

export function readJsonFile<T>(filename: string): T | null {
  ensureDataDir()
  const filePath = path.join(DATA_DIR, filename)
  if (!fs.existsSync(filePath)) {
    return null
  }
  const raw = fs.readFileSync(filePath, 'utf-8')
  return JSON.parse(raw) as T
}

export function writeJsonFile<T>(filename: string, data: T): void {
  ensureDataDir()
  const filePath = path.join(DATA_DIR, filename)
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8')
}

export function generateId(prefix: string): string {
  const timestamp = Date.now().toString(36)
  const random = Math.random().toString(36).substring(2, 8)
  return `${prefix}-${timestamp}-${random}`
}

export function nowISO(): string {
  return new Date().toISOString()
}

/**
 * 初始化数据目录 — 将 web/src/data/ 的种子数据拷贝到 userData
 * 仅在数据目录为空时执行
 */
export function initDataFromSeed(seedDir: string): void {
  ensureDataDir()
  const collections = ['tasks', 'contents', 'approvals', 'agent-runs', 'context-assets', 'metrics', 'settings', 'campaigns']

  for (const name of collections) {
    const targetFile = getFilePath(name)
    if (fs.existsSync(targetFile)) continue

    const seedFile = path.join(seedDir, `${name}.json`)
    if (fs.existsSync(seedFile)) {
      fs.copyFileSync(seedFile, targetFile)
    } else {
      // 创建空集合或默认文件
      if (name === 'settings') {
        writeJsonFile('settings.json', { approval: { mode: 'manual', autoThreshold: 7 } })
      } else {
        writeCollection(name, [])
      }
    }
  }
}

export function getDataDir(): string {
  return DATA_DIR
}
