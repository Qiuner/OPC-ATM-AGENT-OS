'use client';

import { useState } from 'react';
import type { PreviewData, PosterAspectRatio } from './types';

interface PosterPreviewProps {
  data: PreviewData;
}

const ASPECT_RATIOS: { ratio: PosterAspectRatio; label: string; displayW: number; displayH: number; actualW: number; actualH: number }[] = [
  { ratio: '1:1', label: '1:1', displayW: 360, displayH: 360, actualW: 1080, actualH: 1080 },
  { ratio: '16:9', label: '16:9', displayW: 480, displayH: 270, actualW: 1920, actualH: 1080 },
  { ratio: '9:16', label: '9:16', displayW: 270, displayH: 480, actualW: 1080, actualH: 1920 },
  { ratio: '4:5', label: '4:5', displayW: 360, displayH: 450, actualW: 1080, actualH: 1350 },
];

export function PosterPreview({ data }: PosterPreviewProps) {
  const [selectedRatio, setSelectedRatio] = useState<PosterAspectRatio>('1:1');
  const config = ASPECT_RATIOS.find((r) => r.ratio === selectedRatio) ?? ASPECT_RATIOS[0];

  return (
    <div>
      {/* Size selector */}
      <div className="flex items-center justify-center gap-2 mb-3">
        {ASPECT_RATIOS.map((r) => (
          <button
            key={r.ratio}
            onClick={() => setSelectedRatio(r.ratio)}
            className="rounded-md px-3 py-1.5 text-[12px] font-medium transition-all"
            style={
              selectedRatio === r.ratio
                ? { background: 'rgba(251,191,36,0.15)', color: '#fbbf24', border: '1px solid rgba(251,191,36,0.25)' }
                : { background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.4)', border: '1px solid transparent' }
            }
          >
            {r.label}
          </button>
        ))}
      </div>

      {/* Checkerboard background container */}
      <div
        className="mx-auto rounded-xl overflow-hidden flex items-center justify-center p-6"
        style={{
          backgroundImage: `
            linear-gradient(45deg, #1a1a1a 25%, transparent 25%),
            linear-gradient(-45deg, #1a1a1a 25%, transparent 25%),
            linear-gradient(45deg, transparent 75%, #1a1a1a 75%),
            linear-gradient(-45deg, transparent 75%, #1a1a1a 75%)
          `,
          backgroundSize: '20px 20px',
          backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px',
          backgroundColor: '#0f0f0f',
          maxWidth: `${Math.max(config.displayW + 48, 400)}px`,
        }}
      >
        {/* Poster canvas */}
        <div
          className="relative overflow-hidden rounded-lg"
          style={{
            width: `${config.displayW}px`,
            height: `${config.displayH}px`,
            background: data.mediaUrls[0]
              ? `url(${data.mediaUrls[0]}) center/cover`
              : 'linear-gradient(135deg, #1a1a2e, #0f0f23, #1a0a2e)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
          }}
        >
          {/* Overlay gradient */}
          <div
            className="absolute inset-0"
            style={{
              background: 'linear-gradient(180deg, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.6) 100%)',
            }}
          />

          {/* Content */}
          <div className="absolute inset-0 flex flex-col justify-between p-6">
            {/* Top: Brand */}
            <div className="flex items-center gap-2">
              <div
                className="h-8 w-8 rounded-full flex items-center justify-center text-[12px] font-bold"
                style={{ background: 'rgba(167,139,250,0.3)', color: '#a78bfa' }}
              >
                {(data.brandName ?? data.author.name).charAt(0)}
              </div>
              <span className="text-[12px] font-medium text-white/70">
                {data.brandName ?? data.author.name}
              </span>
            </div>

            {/* Center: Title + Body */}
            <div className="text-center">
              <h2
                className="font-bold text-white leading-tight"
                style={{ fontSize: config.displayW > 300 ? '24px' : '18px' }}
              >
                {data.title}
              </h2>
              <p
                className="text-white/70 mt-2 line-clamp-3"
                style={{ fontSize: config.displayW > 300 ? '14px' : '12px' }}
              >
                {data.body.slice(0, 120)}
              </p>
            </div>

            {/* Bottom: CTA */}
            <div className="flex items-center justify-between">
              {data.tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {data.tags.slice(0, 3).map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full px-2 py-0.5 text-[10px]"
                      style={{ background: 'rgba(251,191,36,0.2)', color: '#fbbf24' }}
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              )}
              {data.ctaText && (
                <span
                  className="rounded-lg px-4 py-1.5 text-[12px] font-semibold text-black"
                  style={{ background: '#fbbf24' }}
                >
                  {data.ctaText}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Size annotation */}
      <div className="text-center mt-2 text-[11px]" style={{ color: 'rgba(255,255,255,0.3)' }}>
        {config.actualW} x {config.actualH}px ({config.ratio})
      </div>
    </div>
  );
}
