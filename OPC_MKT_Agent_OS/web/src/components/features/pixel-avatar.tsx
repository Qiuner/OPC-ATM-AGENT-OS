'use client';

import React, { useMemo } from 'react';

/**
 * 8x8 pixel avatar for each AI agent, rendered via a single div + CSS box-shadow.
 * Each pixel = one box-shadow entry: `${x*s}px ${y*s}px 0 ${color}`
 */

type PixelRow = (string | null)[];

interface AgentPixelData {
  grid: PixelRow[];
  primary: string;
  light: string;
}

// Helper: create a color with opacity (returns rgba string)
function withAlpha(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

const P = 'P'; // primary color placeholder
const L = 'L'; // light (50% opacity) color placeholder
const _ = null; // transparent

// --- 14 Agent pixel grids (8x8) ---

const AGENT_PIXELS: Record<string, { grid: (string | null)[][], primary: string, light: string }> = {

  // 1. CEO — Crown
  CEO: {
    primary: '#e74c3c',
    light: withAlpha('#e74c3c', 0.5),
    grid: [
      [_, L, _, P, P, _, L, _],
      [_, P, _, P, P, _, P, _],
      [_, P, P, P, P, P, P, _],
      [_, _, P, P, P, P, _, _],
      [_, _, L, P, P, L, _, _],
      [_, L, P, P, P, P, L, _],
      [_, P, P, P, P, P, P, _],
      [_, _, L, L, L, L, _, _],
    ],
  },

  // 2. XHS — Book / Notebook
  XHS: {
    primary: '#ff2442',
    light: withAlpha('#ff2442', 0.5),
    grid: [
      [_, L, P, P, P, P, L, _],
      [_, P, '#fff', '#fff', '#fff', P, P, _],
      [_, P, '#fff', P, '#fff', P, P, _],
      [_, P, '#fff', '#fff', '#fff', P, P, _],
      [_, P, '#fff', P, '#fff', P, P, _],
      [_, P, '#fff', '#fff', '#fff', P, P, _],
      [_, L, P, P, P, P, L, _],
      [_, _, L, L, L, L, _, _],
    ],
  },

  // 3. Growth — Rising Arrow / Rocket
  Growth: {
    primary: '#00cec9',
    light: withAlpha('#00cec9', 0.5),
    grid: [
      [_, _, _, P, P, _, _, _],
      [_, _, P, P, P, P, _, _],
      [_, _, _, P, P, _, _, _],
      [_, _, _, P, P, _, _, _],
      [_, L, _, P, P, _, L, _],
      [_, P, _, P, P, _, P, _],
      [_, P, L, P, P, L, P, _],
      [_, _, P, L, L, P, _, _],
    ],
  },

  // 4. Visual — Camera
  Visual: {
    primary: '#e17055',
    light: withAlpha('#e17055', 0.5),
    grid: [
      [_, _, L, P, _, _, _, _],
      [_, P, P, P, P, P, P, _],
      [P, P, P, P, P, P, P, P],
      [P, P, L, P, P, L, P, P],
      [P, L, '#fff', L, L, '#fff', L, P],
      [P, P, L, P, P, L, P, P],
      [P, P, P, P, P, P, P, P],
      [_, L, L, L, L, L, L, _],
    ],
  },

  // 5. Global — Globe
  Global: {
    primary: '#0984e3',
    light: withAlpha('#0984e3', 0.5),
    grid: [
      [_, _, L, P, P, L, _, _],
      [_, L, P, L, L, P, L, _],
      [L, P, L, P, P, L, P, L],
      [P, P, P, P, P, P, P, P],
      [P, L, P, P, P, P, L, P],
      [L, P, L, P, P, L, P, L],
      [_, L, P, L, L, P, L, _],
      [_, _, L, P, P, L, _, _],
    ],
  },

  // 6. Meta Ads — Megaphone
  'Meta Ads': {
    primary: '#6c5ce7',
    light: withAlpha('#6c5ce7', 0.5),
    grid: [
      [_, _, _, _, _, P, P, _],
      [_, _, _, _, P, P, L, _],
      [P, P, _, P, P, L, _, _],
      [P, P, P, P, P, _, _, _],
      [P, P, P, P, P, _, _, _],
      [P, P, _, P, P, L, _, _],
      [_, _, _, _, P, P, L, _],
      [_, L, _, _, _, P, P, _],
    ],
  },

  // 7. Email — Envelope
  Email: {
    primary: '#fdcb6e',
    light: withAlpha('#fdcb6e', 0.5),
    grid: [
      [P, P, P, P, P, P, P, P],
      [P, L, P, P, P, P, L, P],
      [P, P, L, P, P, L, P, P],
      [P, P, P, L, L, P, P, P],
      [P, P, P, L, L, P, P, P],
      [P, P, L, '#fff', '#fff', L, P, P],
      [P, L, '#fff', '#fff', '#fff', '#fff', L, P],
      [P, P, P, P, P, P, P, P],
    ],
  },

  // 8. SEO — Magnifying Glass
  SEO: {
    primary: '#00b894',
    light: withAlpha('#00b894', 0.5),
    grid: [
      [_, _, P, P, P, _, _, _],
      [_, P, L, L, L, P, _, _],
      [P, L, _, _, L, L, P, _],
      [P, L, _, _, L, L, P, _],
      [_, P, L, L, L, P, _, _],
      [_, _, P, P, P, L, _, _],
      [_, _, _, _, _, P, L, _],
      [_, _, _, _, _, _, P, L],
    ],
  },

  // 9. GEO — AI Chip / Circuit
  GEO: {
    primary: '#00f0ff',
    light: withAlpha('#00f0ff', 0.5),
    grid: [
      [_, L, _, P, P, _, L, _],
      [L, P, P, P, P, P, P, L],
      [_, P, L, '#fff', '#fff', L, P, _],
      [P, P, '#fff', P, P, '#fff', P, P],
      [P, P, '#fff', P, P, '#fff', P, P],
      [_, P, L, '#fff', '#fff', L, P, _],
      [L, P, P, P, P, P, P, L],
      [_, L, _, P, P, _, L, _],
    ],
  },

  // 10. X — Lightning Bolt
  X: {
    primary: '#1da1f2',
    light: withAlpha('#1da1f2', 0.5),
    grid: [
      [_, _, _, P, P, L, _, _],
      [_, _, P, P, L, _, _, _],
      [_, P, P, P, _, _, _, _],
      [P, P, P, P, P, P, _, _],
      [_, _, P, P, P, P, P, _],
      [_, _, _, P, P, L, _, _],
      [_, _, L, P, L, _, _, _],
      [_, L, P, L, _, _, _, _],
    ],
  },

  // 11. Strategist — Chess Piece (King)
  Strategist: {
    primary: '#a29bfe',
    light: withAlpha('#a29bfe', 0.5),
    grid: [
      [_, _, _, P, P, _, _, _],
      [_, _, L, P, P, L, _, _],
      [_, _, _, P, P, _, _, _],
      [_, _, P, P, P, P, _, _],
      [_, _, L, P, P, L, _, _],
      [_, _, P, P, P, P, _, _],
      [_, L, P, P, P, P, L, _],
      [_, P, P, P, P, P, P, _],
    ],
  },

  // 12. Podcast — Microphone
  Podcast: {
    primary: '#fab1a0',
    light: withAlpha('#fab1a0', 0.5),
    grid: [
      [_, _, P, P, P, P, _, _],
      [_, _, P, '#fff', '#fff', P, _, _],
      [_, _, P, '#fff', '#fff', P, _, _],
      [_, _, P, P, P, P, _, _],
      [_, _, L, P, P, L, _, _],
      [_, _, _, P, P, _, _, _],
      [_, _, _, P, P, _, _, _],
      [_, L, P, P, P, P, L, _],
    ],
  },

  // 13. Analyst — Bar Chart
  Analyst: {
    primary: '#55efc4',
    light: withAlpha('#55efc4', 0.5),
    grid: [
      [_, _, _, _, _, _, P, _],
      [_, _, _, _, _, _, P, _],
      [_, _, _, _, P, _, P, _],
      [_, _, _, _, P, _, P, _],
      [_, _, P, _, P, _, P, _],
      [_, _, P, _, P, _, P, _],
      [P, _, P, _, P, _, P, _],
      [P, L, P, L, P, L, P, L],
    ],
  },

  // 14. Brand — Shield
  Brand: {
    primary: '#a855f7',
    light: withAlpha('#a855f7', 0.5),
    grid: [
      [_, P, P, P, P, P, P, _],
      [P, P, L, P, P, L, P, P],
      [P, L, '#fff', L, L, '#fff', L, P],
      [P, P, L, '#fff', '#fff', L, P, P],
      [P, P, P, L, L, P, P, P],
      [_, P, P, P, P, P, P, _],
      [_, _, P, P, P, P, _, _],
      [_, _, _, P, P, _, _, _],
    ],
  },
};

function buildBoxShadow(
  grid: (string | null)[][],
  s: number,
  primary: string,
  light: string,
): string {
  const shadows: string[] = [];
  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < 8; x++) {
      const cell = grid[y][x];
      if (cell === null) continue;
      let color: string;
      if (cell === 'P') color = primary;
      else if (cell === 'L') color = light;
      else color = cell; // literal color string
      // box-shadow: x y blur color (blur = 0, spread omitted uses pixel size via div width)
      shadows.push(`${x * s}px ${y * s}px 0 ${s}px ${color}`);
    }
  }
  return shadows.join(',');
}

interface PixelAvatarProps {
  agentName: string;
  size?: number;
}

export function PixelAvatar({ agentName, size = 32 }: PixelAvatarProps) {
  const s = size / 8;

  const data = AGENT_PIXELS[agentName];

  const boxShadow = useMemo(() => {
    if (!data) return '';
    return buildBoxShadow(data.grid, s, data.primary, data.light);
  }, [data, s]);

  if (!data) {
    // Fallback: colored square with first letter
    const fallbackColor = '#666';
    return (
      <div
        style={{
          width: size,
          height: size,
          borderRadius: 4,
          background: fallbackColor,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: size * 0.4,
          fontWeight: 700,
          color: '#fff',
          fontFamily: 'monospace',
        }}
      >
        {agentName.charAt(0).toUpperCase()}
      </div>
    );
  }

  return (
    <div
      style={{
        width: size,
        height: size,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: s,
          height: s,
          background: 'transparent',
          boxShadow,
        }}
      />
    </div>
  );
}

/** All available agent names for iteration */
export const PIXEL_AVATAR_AGENTS = Object.keys(AGENT_PIXELS);

export default PixelAvatar;
