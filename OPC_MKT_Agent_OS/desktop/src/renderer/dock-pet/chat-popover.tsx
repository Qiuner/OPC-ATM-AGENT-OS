import { useState, useRef, useEffect, useCallback } from 'react'
import { PixelAgentSVG, type MarketingAgentId } from '../components/features/agent-monitor/pixel-agents'

const AGENT_NAMES: Record<string, string> = {
  ceo: 'CEO 营销总监',
  'xhs-agent': '小红书创作专家',
  'growth-agent': '增长营销专家',
  'brand-reviewer': '品牌风控审查',
}

interface Message {
  role: 'user' | 'assistant'
  content: string
}

interface ChatPopoverProps {
  agentId: string
}

export function ChatPopover({ agentId }: ChatPopoverProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus()
  }, [agentId])

  // Listen for stream chunks (from any agent.execute() — local or remote)
  useEffect(() => {
    const unsubChunk = window.api.agent.onStreamChunk((event: unknown) => {
      const e = event as { type?: string; content?: string; text?: string; agentId?: string }
      // Only process events for our agent
      if (e.agentId && e.agentId !== agentId) return
      const text = e.text || (e.type === 'text' ? e.content : undefined)
      if (text) {
        setIsStreaming(true)
        setMessages((prev) => {
          const last = prev[prev.length - 1]
          if (last && last.role === 'assistant') {
            return [...prev.slice(0, -1), { role: 'assistant', content: last.content + text }]
          }
          return [...prev, { role: 'assistant', content: text }]
        })
      }
    })

    const unsubEnd = window.api.agent.onStreamEnd(() => {
      setIsStreaming(false)
      // Broadcast final assistant response to other windows
      setMessages((prev) => {
        const last = prev[prev.length - 1]
        if (last?.role === 'assistant') {
          window.api.chatSync?.send({ agentId, role: 'assistant', content: last.content, mode: 'exec' })
        }
        return prev
      })
    })

    const unsubError = window.api.agent.onStreamError(() => {
      setIsStreaming(false)
    })

    return () => {
      unsubChunk()
      unsubEnd()
      unsubError()
    }
  }, [agentId])

  // Reset messages when agent changes
  useEffect(() => {
    setMessages([])
    setInput('')
  }, [agentId])

  // Listen for chat sync from other windows (e.g. Team Studio)
  useEffect(() => {
    if (!window.api?.chatSync) return
    const unsub = window.api.chatSync.onMessage((msg) => {
      if (msg.agentId !== agentId) return
      // Avoid duplicating messages we sent ourselves
      setMessages((prev) => {
        const last = prev[prev.length - 1]
        if (last && last.role === msg.role && last.content === msg.content) return prev
        if (msg.role === 'assistant' && last?.role === 'assistant') {
          // Update streaming assistant message
          return [...prev.slice(0, -1), { role: 'assistant' as const, content: msg.content }]
        }
        return [...prev, { role: msg.role as 'user' | 'assistant', content: msg.content }]
      })
    })
    return unsub
  }, [agentId])

  const sendMessage = useCallback(async () => {
    const text = input.trim()
    if (!text || isStreaming) return

    setInput('')
    setMessages((prev) => [...prev, { role: 'user', content: text }])
    setIsStreaming(true)

    // Broadcast user message to other windows
    window.api.chatSync?.send({ agentId, role: 'user', content: text, mode: 'exec' })

    try {
      await window.api.agent.execute({
        agentId,
        message: text,
        mode: 'direct',
      })
    } catch {
      setIsStreaming(false)
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: '(Error: failed to execute agent)' },
      ])
    }
  }, [input, isStreaming, agentId])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        sendMessage()
      }
    },
    [sendMessage]
  )

  const agentName = AGENT_NAMES[agentId] ?? agentId

  return (
    <div style={containerStyle}>
      {/* Header */}
      <div style={headerStyle}>
        <PixelAgentSVG
          agentId={agentId as MarketingAgentId}
          status="online"
          style={{ width: 24, height: 32 }}
        />
        <span style={{ fontWeight: 600, fontSize: 12 }}>{agentName}</span>
        <button
          style={closeStyle}
          onClick={() => window.api.dockPet.hidePopover()}
        >
          ×
        </button>
      </div>

      {/* Messages */}
      <div ref={scrollRef} style={messagesStyle}>
        {messages.length === 0 && (
          <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, textAlign: 'center', marginTop: 40 }}>
            Say something to {agentName}...
          </div>
        )}
        {messages.map((msg, i) => (
          <div
            key={i}
            style={{
              marginBottom: 8,
              textAlign: msg.role === 'user' ? 'right' : 'left',
            }}
          >
            <span
              style={{
                display: 'inline-block',
                maxWidth: '85%',
                padding: '5px 10px',
                borderRadius: 8,
                fontSize: 12,
                lineHeight: 1.5,
                background:
                  msg.role === 'user'
                    ? 'rgba(99,102,241,0.3)'
                    : 'rgba(255,255,255,0.08)',
                color: 'rgba(255,255,255,0.9)',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
              }}
            >
              {msg.content}
            </span>
          </div>
        ))}
        {isStreaming && messages.length > 0 && messages[messages.length - 1].role !== 'assistant' && (
          <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11 }}>thinking...</div>
        )}
      </div>

      {/* Input */}
      <div style={inputContainerStyle}>
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message..."
          disabled={isStreaming}
          style={inputStyle}
        />
        <button
          onClick={sendMessage}
          disabled={isStreaming || !input.trim()}
          style={{
            ...sendBtnStyle,
            opacity: isStreaming || !input.trim() ? 0.4 : 1,
          }}
        >
          ↵
        </button>
      </div>

      {/* Tail pointer */}
      <div style={tailStyle} />
    </div>
  )
}

// ── Styles ──

const containerStyle: React.CSSProperties = {
  width: '100%',
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  background: 'rgba(10,10,15,0.92)',
  backdropFilter: 'blur(20px)',
  WebkitBackdropFilter: 'blur(20px)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 12,
  overflow: 'hidden',
  color: '#fff',
  fontFamily: "'Geist Mono', 'JetBrains Mono', ui-monospace, monospace",
}

const headerStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  padding: '8px 12px',
  borderBottom: '1px solid rgba(255,255,255,0.08)',
  WebkitAppRegion: 'drag' as unknown as string,
}

const closeStyle: React.CSSProperties = {
  marginLeft: 'auto',
  background: 'none',
  border: 'none',
  color: 'rgba(255,255,255,0.5)',
  fontSize: 18,
  cursor: 'pointer',
  padding: '0 4px',
  WebkitAppRegion: 'no-drag' as unknown as string,
}

const messagesStyle: React.CSSProperties = {
  flex: 1,
  overflowY: 'auto',
  padding: '10px 12px',
}

const inputContainerStyle: React.CSSProperties = {
  display: 'flex',
  gap: 6,
  padding: '8px 10px',
  borderTop: '1px solid rgba(255,255,255,0.08)',
}

const inputStyle: React.CSSProperties = {
  flex: 1,
  background: 'rgba(255,255,255,0.06)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 6,
  padding: '6px 10px',
  fontSize: 12,
  color: '#fff',
  outline: 'none',
  fontFamily: 'inherit',
}

const sendBtnStyle: React.CSSProperties = {
  background: 'rgba(99,102,241,0.5)',
  border: 'none',
  borderRadius: 6,
  padding: '4px 10px',
  color: '#fff',
  fontSize: 14,
  cursor: 'pointer',
  fontWeight: 700,
}

const tailStyle: React.CSSProperties = {
  position: 'absolute',
  bottom: -8,
  left: '50%',
  marginLeft: -8,
  width: 0,
  height: 0,
  borderLeft: '8px solid transparent',
  borderRight: '8px solid transparent',
  borderTop: '8px solid rgba(10,10,15,0.92)',
}
