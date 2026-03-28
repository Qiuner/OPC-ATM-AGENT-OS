import fs from 'node:fs'
import path from 'node:path'
import { app } from 'electron'

function parseEnvValue(rawValue: string): string {
  const trimmed = rawValue.trim()
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1)
  }
  return trimmed
}

function loadEnvFile(filePath: string): void {
  if (!fs.existsSync(filePath)) return

  const source = fs.readFileSync(filePath, 'utf-8')
  const lines = source.split(/\r?\n/)

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue

    const separatorIndex = trimmed.indexOf('=')
    if (separatorIndex <= 0) continue

    const key = trimmed.slice(0, separatorIndex).trim()
    const value = parseEnvValue(trimmed.slice(separatorIndex + 1))

    if (!key || process.env[key] !== undefined) continue
    process.env[key] = value
  }
}

export function loadProjectEnv(): void {
  const appPath = app.getAppPath()
  const candidatePaths = [
    path.join(process.cwd(), '.env'),
    path.join(process.cwd(), '..', '.env'),
    path.join(appPath, '.env'),
    path.join(appPath, '..', '.env'),
    path.join(appPath, '..', '..', '.env'),
  ]

  for (const candidatePath of candidatePaths) {
    loadEnvFile(path.resolve(candidatePath))
  }
}
