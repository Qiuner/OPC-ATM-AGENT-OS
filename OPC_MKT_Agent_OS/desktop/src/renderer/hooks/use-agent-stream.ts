/**
 * useAgentStream — React hook for IPC-based agent execution streaming
 *
 * 替代 web/ 中的 SSE fetch('/api/chat') 模式。
 * 通过 IPC event listeners 接收 main 进程推送的流式事件。
 */

import { useState, useCallback, useEffect, useRef } from 'react'
import { getApi } from '@/lib/ipc'

interface AgentStreamEvent {
  type: 'text' | 'tool_use' | 'tool_result' | 'error' | 'status' | 'stream_end'
  agentId?: string
  content?: string
  message?: string
  [key: string]: unknown
}

interface AgentStreamState {
  /** Accumulated text output */
  text: string
  /** Whether the stream is currently active */
  streaming: boolean
  /** Error message if stream failed */
  error: string | null
  /** All received events */
  events: AgentStreamEvent[]
  /** Execute an agent with a prompt */
  execute: (agentId: string, message: string, context?: Record<string, unknown>) => Promise<void>
  /** Reset state for a new execution */
  reset: () => void
}

export function useAgentStream(): AgentStreamState {
  const [text, setText] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [events, setEvents] = useState<AgentStreamEvent[]>([])
  const cleanupRef = useRef<Array<() => void>>([])

  // Cleanup listeners on unmount
  useEffect(() => {
    return () => {
      for (const cleanup of cleanupRef.current) {
        cleanup()
      }
      cleanupRef.current = []
    }
  }, [])

  const reset = useCallback(() => {
    setText('')
    setStreaming(false)
    setError(null)
    setEvents([])
    for (const cleanup of cleanupRef.current) {
      cleanup()
    }
    cleanupRef.current = []
  }, [])

  const execute = useCallback(async (agentId: string, message: string, context?: Record<string, unknown>) => {
    const api = getApi()
    if (!api) {
      setError('IPC API not available — not running in Electron')
      return
    }

    // Reset state
    setText('')
    setError(null)
    setEvents([])
    setStreaming(true)

    // Clean up previous listeners
    for (const cleanup of cleanupRef.current) {
      cleanup()
    }
    cleanupRef.current = []

    // Subscribe to stream events from main process
    const unsubChunk = api.agent.onStreamChunk((event) => {
      const e = event as AgentStreamEvent
      setEvents((prev) => [...prev, e])
      if (e.type === 'text' && e.content) {
        setText((prev) => prev + e.content)
      }
    })

    const unsubEnd = api.agent.onStreamEnd(() => {
      setStreaming(false)
    })

    const unsubError = api.agent.onStreamError((err) => {
      const e = err as AgentStreamEvent
      setError(e.message ?? 'Stream error')
      setStreaming(false)
    })

    cleanupRef.current = [unsubChunk, unsubEnd, unsubError]

    // Trigger execution in main process via agent engine
    try {
      const res = await api.agent.execute({
        agentId,
        message,
        mode: 'direct',
        context,
      })
      if (!res.success) {
        setError(res.error ?? 'Failed to execute agent')
        setStreaming(false)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
      setStreaming(false)
    }
  }, [])

  return { text, streaming, error, events, execute, reset }
}
