/**
 * RPG Agent Town — Isometric pixel-art office where agents work.
 *
 * - AI-generated isometric office background with 14+ workstations
 * - All agents shown at fixed desk positions (no free-roaming walk)
 * - Characters at 36×54 to match scene scale
 * - Offline agents shown as greyed-out silhouettes
 */

import { useMemo } from 'react';
import { PixelAgentSVG, type MarketingAgentId } from './pixel-agents';
import rpgOfficeBg from '../../../assets/rpg-office-bg.png';

// ── Types ────────────────────────────────────────

type AgentStatus = 'busy' | 'online' | 'offline';

interface SceneAgent {
  id: string;
  nameEn: string;
  name: string;
  color: string;
  status: AgentStatus;
  currentTool?: string;
  statusText: string;
}

interface RPGSceneProps {
  agents: SceneAgent[];
  selectedAgent: string | null;
  onSelectAgent: (agentId: string) => void;
}

// ── Scene coordinate space (matches background image proportions) ──
const SCENE_W = 1920;
const SCENE_H = 1040;

// ── 14 fixed desk positions mapped to the background image ──
// The background has ~4 rows of desks in an isometric open-plan office.
// Coordinates are in the 1920×1040 space, placed at each visible desk.

interface DeskSpot {
  x: number;
  y: number;
}

// Mapped to actual desk positions in the AI-generated background:
// Row 1 (back): 3 desks near the back wall
// Row 2: 4 desks in the upper-middle area
// Row 3: 4 desks in the lower-middle area
// Row 4 (front): 3 desks in the front area
const DESK_SPOTS: Record<string, DeskSpot> = {
  'ceo':                 { x: 960,  y: 340 },  // Back center — command desk
  'strategist-agent':    { x: 640,  y: 360 },  // Back left
  'brand-reviewer':      { x: 1280, y: 360 },  // Back right

  'xhs-agent':           { x: 460,  y: 500 },  // Row 2 far left
  'growth-agent':        { x: 740,  y: 510 },  // Row 2 center-left
  'analyst-agent':       { x: 1060, y: 510 },  // Row 2 center-right
  'podcast-agent':       { x: 1380, y: 500 },  // Row 2 far right

  'visual-agent':        { x: 460,  y: 660 },  // Row 3 far left
  'email-agent':         { x: 740,  y: 670 },  // Row 3 center-left
  'seo-expert-agent':    { x: 1060, y: 670 },  // Row 3 center-right
  'x-twitter-agent':     { x: 1380, y: 660 },  // Row 3 far right

  'meta-ads-agent':      { x: 560,  y: 830 },  // Front left
  'geo-expert-agent':    { x: 920,  y: 840 },  // Front center
  'global-content-agent':{ x: 1280, y: 830 },  // Front right
};

const ALL_AGENT_IDS = new Set<string>(Object.keys(DESK_SPOTS));

// ── Main Component ──

export function RPGScene({ agents, selectedAgent, onSelectAgent }: RPGSceneProps) {
  // Assign each agent to their named desk (or fallback position)
  const placedAgents = useMemo(() => {
    return agents
      .map(agent => {
        const spot = DESK_SPOTS[agent.id];
        if (!spot) return null;
        return { agent, spot };
      })
      .filter(Boolean) as { agent: SceneAgent; spot: DeskSpot }[];
  }, [agents]);

  // Sort by Y for depth ordering (back agents render first)
  const sortedAgents = useMemo(() => {
    return [...placedAgents].sort((a, b) => a.spot.y - b.spot.y);
  }, [placedAgents]);

  return (
    <div className="relative w-full h-full overflow-hidden select-none" style={{ background: '#0d0d18' }}>
      {/* Background image container — centered with correct aspect ratio */}
      <div
        className="absolute inset-0 flex items-center justify-center"
      >
        <div
          className="relative w-full h-full"
          style={{ maxWidth: '100%', maxHeight: '100%', aspectRatio: `${SCENE_W} / ${SCENE_H}` }}
        >
          {/* AI-generated isometric office background */}
          <img
            src={rpgOfficeBg}
            alt=""
            className="absolute inset-0 w-full h-full object-contain pointer-events-none"
            draggable={false}
          />

          {/* Agent layer — all positions relative to image coordinate space */}

          {/* Busy desk glows */}
          {sortedAgents
            .filter(({ agent }) => agent.status === 'busy')
            .map(({ agent, spot }) => (
              <div
                key={`glow-${agent.id}`}
                className="absolute pointer-events-none"
                style={{
                  left: `${(spot.x / SCENE_W) * 100}%`,
                  top: `${(spot.y / SCENE_H) * 100}%`,
                  width: 80,
                  height: 50,
                  transform: 'translate(-50%, -50%)',
                  background: `radial-gradient(ellipse, ${agent.color}20, transparent 70%)`,
                  animation: 'desk-glow 3s ease-in-out infinite',
                }}
              />
            ))}

          {/* Agent sprites */}
          {sortedAgents.map(({ agent, spot }) => {
            const isKnown = ALL_AGENT_IDS.has(agent.id);
            const isBusy = agent.status === 'busy';
            const isOnline = agent.status === 'online';
            const isOffline = agent.status === 'offline';
            const isSelected = selectedAgent === agent.id;

            return (
              <div
                key={agent.id}
                className="absolute flex flex-col items-center cursor-pointer group"
                style={{
                  left: `${(spot.x / SCENE_W) * 100}%`,
                  top: `${(spot.y / SCENE_H) * 100}%`,
                  transform: 'translate(-50%, -100%)',
                  zIndex: Math.round(spot.y),
                  opacity: isOffline ? 0.35 : 1,
                  filter: isOffline ? 'grayscale(0.8)' : 'none',
                  transition: 'opacity 0.5s, filter 0.5s',
                }}
                onClick={() => onSelectAgent(agent.id)}
              >
                {/* Speech bubble — only when busy */}
                {isBusy && agent.statusText && (
                  <SpeechBubble text={agent.statusText} color={agent.color} />
                )}

                {/* Selection ring */}
                {isSelected && (
                  <div
                    className="absolute pointer-events-none"
                    style={{
                      width: 44,
                      height: 12,
                      bottom: 6,
                      left: '50%',
                      transform: 'translateX(-50%)',
                      borderRadius: '50%',
                      border: `2px solid ${agent.color}`,
                      background: `${agent.color}25`,
                      animation: 'agent-breathe 2s ease-in-out infinite',
                    }}
                  />
                )}

                {/* Shadow ellipse */}
                <div
                  className="absolute pointer-events-none"
                  style={{
                    width: 30,
                    height: 8,
                    bottom: 6,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    background: 'rgba(0,0,0,0.4)',
                    borderRadius: '50%',
                    filter: 'blur(2px)',
                  }}
                />

                {/* Character sprite — 36×54 */}
                <div
                  style={{
                    width: 36,
                    height: 54,
                    animation: isBusy
                      ? 'agent-typing 0.6s ease-in-out infinite'
                      : isOnline
                        ? 'agent-breathe 3s ease-in-out infinite'
                        : 'none',
                  }}
                >
                  {isKnown ? (
                    <PixelAgentSVG
                      agentId={agent.id as MarketingAgentId}
                      status={agent.status as 'busy' | 'online' | 'offline'}
                      walking={false}
                      walkFrame={0}
                      className="w-full h-full"
                    />
                  ) : (
                    <FallbackSprite
                      color={agent.color}
                      initial={agent.nameEn.slice(0, 2)}
                      status={agent.status}
                    />
                  )}
                </div>

                {/* Name tag — only on hover or selected */}
                <div
                  className="mt-0.5 px-1.5 py-px rounded-full text-center whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{
                    fontSize: 9,
                    fontWeight: 600,
                    color: '#fff',
                    background: `${agent.color}cc`,
                    letterSpacing: '0.02em',
                    ...(isSelected ? { opacity: 1 } : {}),
                  }}
                >
                  {agent.nameEn}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Offline count badge */}
      {(() => {
        const offlineCount = agents.filter(a => a.status === 'offline').length;
        if (offlineCount === 0) return null;
        return (
          <div
            className="absolute bottom-3 right-3 px-2.5 py-1 rounded-lg text-xs"
            style={{
              background: 'rgba(10,10,15,0.85)',
              border: '1px solid rgba(255,255,255,0.08)',
              color: 'rgba(255,255,255,0.35)',
              backdropFilter: 'blur(8px)',
            }}
          >
            {offlineCount} offline
          </div>
        );
      })()}
    </div>
  );
}

// ── Speech Bubble ──

function SpeechBubble({ text, color }: { text: string; color: string }) {
  return (
    <div className="relative mb-0.5 pointer-events-none" style={{ animation: 'bubble-float 3s ease-in-out infinite' }}>
      <div
        className="px-1.5 py-0.5 rounded whitespace-nowrap"
        style={{
          fontSize: 9,
          fontWeight: 500,
          color: '#fff',
          background: `${color}dd`,
          border: `1px solid ${color}40`,
          maxWidth: 100,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
      >
        {text}
        <span className="inline-block ml-0.5" style={{ animation: 'blink 1s infinite' }}>_</span>
      </div>
      <div
        className="mx-auto"
        style={{
          width: 0, height: 0,
          borderLeft: '4px solid transparent',
          borderRight: '4px solid transparent',
          borderTop: `4px solid ${color}dd`,
        }}
      />
    </div>
  );
}

// ── Fallback sprite ──

function FallbackSprite({ color, initial, status }: { color: string; initial: string; status: AgentStatus }) {
  return (
    <svg viewBox="0 0 48 72" className="w-full h-full">
      <g opacity={status === 'offline' ? 0.4 : 1}>
        <rect x="12" y="4" width="24" height="16" rx="5" fill="#E8B4C8" />
        <circle cx="18" cy="12" r="1.5" fill="#1A1A2E" />
        <circle cx="30" cy="12" r="1.5" fill="#1A1A2E" />
        <path d="M20 16 Q24 18 28 16" stroke="#1A1A2E" strokeWidth="0.8" fill="none" strokeLinecap="round" />
        <rect x="7" y="22" width="34" height="22" rx="4" fill={color} />
        <text x="24" y="36" textAnchor="middle" fontSize="8" fontWeight="bold" fill="#fff" fontFamily="system-ui">{initial}</text>
        <rect x="1" y="24" width="7" height="14" rx="3.5" fill={color} />
        <rect x="40" y="24" width="7" height="14" rx="3.5" fill={color} />
        <rect x="13" y="43" width="7" height="11" rx="2" fill="#2C3E50" />
        <rect x="28" y="43" width="7" height="11" rx="2" fill="#2C3E50" />
        <rect x="11" y="52" width="11" height="6" rx="3" fill="#1A1A2E" />
        <rect x="26" y="52" width="11" height="6" rx="3" fill="#1A1A2E" />
      </g>
    </svg>
  );
}
