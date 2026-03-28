/**
 * Sound Notify — macOS 原生音效 & TTS 引擎
 *
 * 参考 cotify 项目 (https://github.com/Jayden72Huang/cotify)
 * 使用 macOS 内置的 afplay（系统音效）和 say（TTS 语音播报）
 * 零依赖，仅依赖操作系统自带命令
 */

import { exec } from 'node:child_process'
import { getSettingValue } from './app-store'

// ── Sound Effect Definitions ──

export type SoundEvent =
  | 'agent_start'     // Agent 开始工作
  | 'agent_done'      // Agent 任务完成
  | 'tool_call'       // Tool 调用
  | 'error'           // 错误
  | 'approval_needed' // 需要审批
  | 'sub_agent_start' // 子 Agent 启动
  | 'sub_agent_done'  // 子 Agent 完成
  | 'plan_ready'      // 编排计划就绪
  | 'notify'          // 通用通知

/**
 * macOS 系统音效文件映射
 * 路径: /System/Library/Sounds/xxx.aiff
 */
const SOUND_MAP: Record<SoundEvent, string> = {
  agent_start:     'Blow',      // 启动（吹风声）
  agent_done:      'Hero',      // 完成（英雄音效）
  tool_call:       'Tink',      // 工具调用（轻敲）
  error:           'Sosumi',    // 错误
  approval_needed: 'Basso',     // 需要审批（低沉提醒）
  sub_agent_start: 'Pop',       // 子 Agent 启动（弹出）
  sub_agent_done:  'Glass',     // 子 Agent 完成（玻璃声）
  plan_ready:      'Purr',      // 计划就绪
  notify:          'Tink',      // 通用通知
}

/**
 * 每个事件的默认语音文本
 */
const VOICE_MAP: Record<SoundEvent, string> = {
  agent_start:     'Agent 开始工作',
  agent_done:      '任务完成',
  tool_call:       '',                  // tool_call 太频繁，不语音
  error:           '执行出错，请检查',
  approval_needed: '有新的审批需要处理',
  sub_agent_start: '子 Agent 启动',
  sub_agent_done:  '子 Agent 完成',
  plan_ready:      '编排计划已就绪',
  notify:          '',
}

/**
 * 事件在各模式下是否触发
 * milestone: 仅关键节点
 * full: 每个步骤
 * completion: 仅最终完成
 */
const MODE_FILTER: Record<string, Set<SoundEvent>> = {
  milestone: new Set([
    'agent_start', 'agent_done', 'error', 'approval_needed',
    'plan_ready', 'sub_agent_done',
  ]),
  full: new Set([
    'agent_start', 'agent_done', 'tool_call', 'error',
    'approval_needed', 'sub_agent_start', 'sub_agent_done',
    'plan_ready', 'notify',
  ]),
  completion: new Set([
    'agent_done', 'error',
  ]),
}

// ── Anti-spam debounce ──

const lastPlayTime: Record<string, number> = {}
const DEBOUNCE_MS = 2000 // 同一事件 2 秒内不重复

// ── Core Functions ──

/**
 * 播放系统音效 + 语音播报（受 enabled/mode 控制）
 * @param event  事件类型
 * @param voice  自定义语音文本，覆盖默认文本；传空字符串则不播语音
 */
export function playSoundEffect(event: SoundEvent, voice?: string): void {
  const settings = getSettingValue('soundNotify')
  if (!settings?.enabled) return

  // 检查模式过滤
  const allowedEvents = MODE_FILTER[settings.mode] ?? MODE_FILTER.milestone
  if (!allowedEvents.has(event)) return

  // Anti-spam debounce
  const now = Date.now()
  if (lastPlayTime[event] && now - lastPlayTime[event] < DEBOUNCE_MS) return
  lastPlayTime[event] = now

  // 1. 播放系统音效
  const soundName = SOUND_MAP[event]
  const soundPath = `/System/Library/Sounds/${soundName}.aiff`
  const volume = Math.max(0, Math.min(100, settings.volume ?? 70)) / 100

  console.log(`[SoundNotify] Playing: ${soundName} at volume ${volume}`)
  exec(`/usr/bin/afplay "${soundPath}" --volume ${volume}`, (err) => {
    if (err) {
      console.warn(`[SoundNotify] Failed to play ${soundName}:`, err.message)
    }
  })

  // 2. 语音播报（如果开启了 voiceEnabled）
  if (settings.voiceEnabled) {
    const text = voice ?? VOICE_MAP[event]
    if (text) {
      speakRaw(text, settings.voiceName || 'Lili')
    }
  }
}

/**
 * 独立语音播报（受 enabled 控制）
 */
export function speak(message: string): void {
  const settings = getSettingValue('soundNotify')
  if (!settings?.enabled || !settings.voiceEnabled) return

  speakRaw(message, settings.voiceName || 'Lili')
}

/**
 * 底层语音调用（不检查任何开关）
 */
function speakRaw(message: string, voiceName: string): void {
  const cleanMsg = message
    .replace(/['"\\`]/g, '')
    .replace(/\n/g, ' ')
    .slice(0, 200)

  if (!cleanMsg) return
  console.log(`[SoundNotify] Speaking: "${cleanMsg}" with voice ${voiceName}`)
  exec(`/usr/bin/say -v "${voiceName}" "${cleanMsg}"`, (err) => {
    if (err) {
      console.warn(`[SoundNotify] TTS failed:`, err.message)
    }
  })
}

/**
 * 直接播放音效 + 语音（跳过 enabled/mode 检查，用于测试）
 */
export function playDirectSound(event: SoundEvent): void {
  const settings = getSettingValue('soundNotify')
  const soundName = SOUND_MAP[event] ?? 'Tink'
  const soundPath = `/System/Library/Sounds/${soundName}.aiff`
  const volume = Math.max(0, Math.min(100, settings?.volume ?? 70)) / 100

  console.log(`[SoundNotify] Playing direct: ${soundName} at volume ${volume}`)
  exec(`/usr/bin/afplay "${soundPath}" --volume ${volume}`, (err) => {
    if (err) {
      console.warn(`[SoundNotify] Failed to play ${soundName}:`, err.message)
    }
  })

  // 测试时也播语音
  const text = VOICE_MAP[event]
  if (text) {
    speakRaw(text, settings?.voiceName || 'Lili')
  }
}

/**
 * 直接语音播报（跳过 enabled 检查，用于测试）
 */
export function speakDirect(message: string): void {
  const settings = getSettingValue('soundNotify')
  speakRaw(message, settings?.voiceName || 'Lili')
}

/**
 * 获取当前音效设置
 */
export function getSoundSettings(): {
  enabled: boolean
  mode: string
  volume: number
  voiceEnabled: boolean
  voiceName: string
} {
  const settings = getSettingValue('soundNotify')
  return {
    enabled: settings?.enabled ?? false,
    mode: settings?.mode ?? 'milestone',
    volume: settings?.volume ?? 70,
    voiceEnabled: settings?.voiceEnabled ?? false,
    voiceName: settings?.voiceName ?? 'Lili',
  }
}
