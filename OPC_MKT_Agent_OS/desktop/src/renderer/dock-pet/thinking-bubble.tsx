import { useEffect, useState } from 'react'

const PHRASES = [
  '🔥 working...',
  '💻 coding...',
  '🧠 thinking...',
  '⚡ 处理中...',
  '📝 analyzing...',
  '🔍 研究中...',
]

export function ThinkingBubble() {
  const [phraseIdx, setPhraseIdx] = useState(0)

  useEffect(() => {
    const timer = setInterval(() => {
      setPhraseIdx((i) => (i + 1) % PHRASES.length)
    }, 2000)
    return () => clearInterval(timer)
  }, [])

  return (
    <div
      style={{
        position: 'absolute',
        bottom: '100%',
        left: '50%',
        transform: 'translateX(-50%)',
        marginBottom: 4,
        whiteSpace: 'nowrap',
      }}
    >
      {/* Bubble — bigger and brighter */}
      <div
        style={{
          background: 'rgba(0,0,0,0.85)',
          border: '2px solid rgba(251,191,36,0.8)',
          borderRadius: 10,
          padding: '4px 10px',
          fontSize: 12,
          fontWeight: 600,
          color: '#fbbf24',
          textAlign: 'center',
          boxShadow: '0 2px 10px rgba(251,191,36,0.3)',
          animation: 'thinkPulse 1.5s ease-in-out infinite',
        }}
      >
        {PHRASES[phraseIdx]}
      </div>

      {/* Tail dots — bigger */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 4, marginTop: 3 }}>
        <div
          style={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            background: 'rgba(251,191,36,0.6)',
          }}
        />
        <div
          style={{
            width: 4,
            height: 4,
            borderRadius: '50%',
            background: 'rgba(251,191,36,0.4)',
          }}
        />
      </div>

      <style>{`
        @keyframes thinkPulse {
          0%, 100% { opacity: 0.9; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.05); }
        }
      `}</style>
    </div>
  )
}
