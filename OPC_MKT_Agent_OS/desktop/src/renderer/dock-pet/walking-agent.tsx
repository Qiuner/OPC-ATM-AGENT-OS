import { useCallback } from 'react'
import type { AgentPosition } from './walk-engine'
import { PixelAgentSVG, type MarketingAgentId } from '../components/features/agent-monitor/pixel-agents'
import type { PixelAgentStatus } from '../components/features/agent-monitor/pixel-agents'
import { ThinkingBubble } from './thinking-bubble'

interface WalkingAgentProps {
  agentId: MarketingAgentId
  label: string
  position: AgentPosition
  status: PixelAgentStatus
  onMouseEnter: () => void
  onMouseLeave: () => void
  onClick: (agentId: string, x: number) => void
}

export function WalkingAgent({
  agentId,
  label,
  position,
  status,
  onMouseEnter,
  onMouseLeave,
  onClick,
}: WalkingAgentProps) {
  const { x, bobY, direction, isWalking, walkFrame } = position

  const handleClick = useCallback(() => {
    onClick(agentId, x + 28)
  }, [agentId, onClick, x])

  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        bottom: 4,
        width: 56,
        cursor: 'pointer',
        transform: `translateY(${-bobY}px)`,
        transition: isWalking ? undefined : 'transform 0.3s ease',
      }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onClick={handleClick}
    >
      {/* Status action overlay — above character */}
      {status === 'busy' && <ThinkingBubble />}
      {status === 'review' && <ReviewBell />}

      {/* Name label */}
      <div
        style={{
          textAlign: 'center',
          fontSize: 9,
          fontWeight: 600,
          color: 'rgba(255,255,255,0.85)',
          marginBottom: 2,
          textShadow: '0 1px 3px rgba(0,0,0,0.8)',
          whiteSpace: 'nowrap',
          letterSpacing: 0.5,
        }}
      >
        {label}
      </div>

      {/* Character + status action layer */}
      <div style={{ position: 'relative' }}>
        <div
          style={{
            transform: direction === -1 ? 'scaleX(-1)' : undefined,
          }}
        >
          <PixelAgentSVG
            agentId={agentId}
            status={status}
            walking={isWalking}
            walkFrame={walkFrame}
            style={{ width: 56, height: 84 }}
          />
        </div>

        {/* Busy: big sweat drops + speed lines */}
        {status === 'busy' && <BusyEffects />}

        {/* Idle: big floating Z's */}
        {status === 'online' && !isWalking && <IdleZzz />}
      </div>

      {/* Ground shadow */}
      <div
        style={{
          width: 36,
          height: 6,
          margin: '0 auto',
          borderRadius: '50%',
          background: 'rgba(0,0,0,0.35)',
          filter: 'blur(2px)',
          marginTop: -2,
        }}
      />
    </div>
  )
}

/** Review: 🔔 bell ringing above head */
function ReviewBell() {
  return (
    <div
      style={{
        position: 'absolute',
        bottom: '100%',
        left: '50%',
        transform: 'translateX(-50%)',
        marginBottom: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
      }}
    >
      <div
        style={{
          fontSize: 20,
          lineHeight: 1,
          animation: 'bellRing 0.8s ease-in-out infinite',
          transformOrigin: 'top center',
          filter: 'drop-shadow(0 2px 4px rgba(250,204,21,0.5))',
        }}
      >
        🔔
      </div>
      <style>{`
        @keyframes bellRing {
          0%, 100% { transform: rotate(0deg); }
          15% { transform: rotate(15deg); }
          30% { transform: rotate(-15deg); }
          45% { transform: rotate(10deg); }
          60% { transform: rotate(-10deg); }
          75% { transform: rotate(4deg); }
        }
      `}</style>
    </div>
  )
}

/** Busy: big sweat drops flying off + speed lines */
function BusyEffects() {
  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: -12,
        width: 80,
        height: '100%',
        pointerEvents: 'none',
      }}
    >
      {/* Big sweat drops */}
      <svg
        style={{ position: 'absolute', top: -4, right: -6, width: 28, height: 36 }}
        viewBox="0 0 28 36"
      >
        {/* Drop 1 — large */}
        <path d="M8 4 Q10 0 12 4 L12 12 Q10 16 8 12 Z" fill="#38bdf8" opacity="0.9">
          <animate attributeName="opacity" values="0.9;0.3;0.9" dur="0.8s" repeatCount="indefinite" />
          <animateTransform attributeName="transform" type="translate" values="0,0;2,8;0,0" dur="0.8s" repeatCount="indefinite" />
        </path>
        {/* Drop 2 */}
        <path d="M18 8 Q20 4 22 8 L22 16 Q20 20 18 16 Z" fill="#38bdf8" opacity="0.7">
          <animate attributeName="opacity" values="0.7;0.2;0.7" dur="1.1s" repeatCount="indefinite" />
          <animateTransform attributeName="transform" type="translate" values="0,0;1,10;0,0" dur="1.1s" repeatCount="indefinite" />
        </path>
        {/* Drop 3 — small accent */}
        <path d="M4 14 Q5 11 6 14 L6 18 Q5 20 4 18 Z" fill="#38bdf8" opacity="0.6">
          <animate attributeName="opacity" values="0.6;0.1;0.6" dur="1.4s" repeatCount="indefinite" />
          <animateTransform attributeName="transform" type="translate" values="0,0;-1,6;0,0" dur="1.4s" repeatCount="indefinite" />
        </path>
      </svg>

      {/* Speed/effort lines on left side */}
      <svg
        style={{ position: 'absolute', top: 10, left: -2, width: 18, height: 40 }}
        viewBox="0 0 18 40"
      >
        <line x1="16" y1="4" x2="2" y2="8" stroke="#fbbf24" strokeWidth="2.5" opacity="0.8" strokeLinecap="round">
          <animate attributeName="opacity" values="0.8;0;0.8" dur="0.6s" repeatCount="indefinite" />
        </line>
        <line x1="17" y1="16" x2="3" y2="19" stroke="#fbbf24" strokeWidth="2.5" opacity="0.6" strokeLinecap="round">
          <animate attributeName="opacity" values="0;0.7;0" dur="0.6s" repeatCount="indefinite" />
        </line>
        <line x1="16" y1="28" x2="2" y2="31" stroke="#fbbf24" strokeWidth="2.5" opacity="0.7" strokeLinecap="round">
          <animate attributeName="opacity" values="0.5;0;0.5" dur="0.8s" repeatCount="indefinite" />
        </line>
      </svg>

      {/* Stress marks (cross) above head on right */}
      <svg
        style={{ position: 'absolute', top: -8, right: 8, width: 16, height: 16 }}
        viewBox="0 0 16 16"
      >
        <line x1="3" y1="3" x2="13" y2="13" stroke="#f87171" strokeWidth="2.5" strokeLinecap="round">
          <animate attributeName="opacity" values="1;0.3;1" dur="1s" repeatCount="indefinite" />
        </line>
        <line x1="13" y1="3" x2="3" y2="13" stroke="#f87171" strokeWidth="2.5" strokeLinecap="round">
          <animate attributeName="opacity" values="1;0.3;1" dur="1s" repeatCount="indefinite" />
        </line>
      </svg>
    </div>
  )
}

/** Idle: big floating Z's drifting up */
function IdleZzz() {
  return (
    <div
      style={{
        position: 'absolute',
        top: -14,
        right: -14,
        pointerEvents: 'none',
      }}
    >
      <svg width="36" height="42" viewBox="0 0 36 42">
        <text x="24" y="36" fontSize="16" fill="#a5b4fc" opacity="0.9" fontWeight="bold" fontFamily="monospace">
          Z
          <animate attributeName="opacity" values="0.9;0.2;0.9" dur="1.8s" repeatCount="indefinite" />
          <animateTransform attributeName="transform" type="translate" values="0,0;-4,-8" dur="1.8s" repeatCount="indefinite" />
        </text>
        <text x="14" y="24" fontSize="13" fill="#a5b4fc" opacity="0.7" fontWeight="bold" fontFamily="monospace">
          Z
          <animate attributeName="opacity" values="0.2;0.7;0.2" dur="2.2s" repeatCount="indefinite" />
          <animateTransform attributeName="transform" type="translate" values="0,0;-5,-10" dur="2.2s" repeatCount="indefinite" />
        </text>
        <text x="6" y="14" fontSize="10" fill="#a5b4fc" opacity="0.5" fontWeight="bold" fontFamily="monospace">
          Z
          <animate attributeName="opacity" values="0.5;0.1;0.5" dur="2.6s" repeatCount="indefinite" />
          <animateTransform attributeName="transform" type="translate" values="0,0;-3,-10" dur="2.6s" repeatCount="indefinite" />
        </text>
      </svg>
      {/* 💤 sleep bubble for extra clarity */}
      <div style={{
        position: 'absolute',
        top: -2,
        right: -4,
        fontSize: 14,
        animation: 'idleFloat 2s ease-in-out infinite',
      }}>
        💤
      </div>
      <style>{`
        @keyframes idleFloat {
          0%, 100% { transform: translateY(0); opacity: 0.8; }
          50% { transform: translateY(-6px); opacity: 1; }
        }
      `}</style>
    </div>
  )
}
