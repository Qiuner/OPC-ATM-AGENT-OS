'use client';

import { PhoneFrame } from './phone-frame';
import type { PreviewData } from './types';

interface TikTokPreviewProps {
  data: PreviewData;
}

export function TikTokPreview({ data }: TikTokPreviewProps) {
  return (
    <PhoneFrame>
      <div className="relative" style={{ background: '#000', minHeight: '580px' }}>
        {/* Top tabs */}
        <div className="flex items-center justify-center gap-4 py-2">
          {['Following', 'For You'].map((tab, i) => (
            <span
              key={tab}
              className="text-[15px] font-semibold"
              style={{
                color: i === 1 ? '#ffffff' : 'rgba(255,255,255,0.5)',
                borderBottom: i === 1 ? '2px solid #ffffff' : '2px solid transparent',
                paddingBottom: '4px',
              }}
            >
              {tab}
            </span>
          ))}
        </div>

        {/* Video area */}
        <div
          className="relative mx-1 rounded-lg overflow-hidden"
          style={{
            height: '440px',
            background: data.mediaUrls[0]
              ? `url(${data.mediaUrls[0]}) center/cover`
              : 'linear-gradient(180deg, #1a1a2e, #16213e)',
          }}
        >
          {/* Play button */}
          <div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-16 w-16 flex items-center justify-center rounded-full"
            style={{ background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)' }}
          >
            <svg className="h-8 w-8 ml-1" viewBox="0 0 24 24" fill="white">
              <polygon points="5 3 19 12 5 21 5 3" />
            </svg>
          </div>

          {/* Right interaction bar */}
          <div className="absolute right-3 bottom-[100px] flex flex-col items-center gap-5">
            {/* Avatar + follow */}
            <div className="relative">
              <div
                className="h-12 w-12 rounded-full flex items-center justify-center text-[16px] font-bold"
                style={{ background: 'rgba(255,255,255,0.2)', color: '#fff', border: '2px solid white' }}
              >
                {data.author.name.charAt(0)}
              </div>
              <div
                className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 h-5 w-5 rounded-full flex items-center justify-center text-[14px] font-bold text-white"
                style={{ background: '#ff0050' }}
              >
                +
              </div>
            </div>

            {/* Engagement buttons */}
            {[
              { label: '12.5K', path: 'M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z' },
              { label: '342', path: 'M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z' },
              { label: '89', path: 'M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z' },
              { label: '56', path: 'M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z' },
            ].map((btn, i) => (
              <div key={i} className="flex flex-col items-center gap-0.5">
                <svg className="h-8 w-8" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={1.5}>
                  <path d={btn.path} />
                </svg>
                <span className="text-[11px] font-medium text-white">{btn.label}</span>
              </div>
            ))}

            {/* Spinning disc */}
            <div
              className="h-11 w-11 rounded-full"
              style={{
                background: 'linear-gradient(135deg, #333, #000)',
                border: '2px solid #333',
              }}
            />
          </div>

          {/* Bottom text overlay */}
          <div className="absolute left-3 bottom-[16px] right-[80px]">
            <span className="text-[15px] font-semibold text-white">
              @{data.author.handle.replace('@', '')}
            </span>
            <p className="text-[14px] text-white mt-1 leading-[18px] line-clamp-2">
              {data.body.slice(0, 100)}
              {data.tags.length > 0 && ' '}
              {data.tags.map((t) => (
                <span key={t} style={{ fontWeight: 600 }}>
                  #{t}{' '}
                </span>
              ))}
            </p>
            <div className="flex items-center gap-1.5 mt-2">
              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="white">
                <path d="M9 18V5l12-2v13M9 18c0 1.66-1.34 3-3 3s-3-1.34-3-3 1.34-3 3-3 3 1.34 3 3zM21 16c0 1.66-1.34 3-3 3s-3-1.34-3-3 1.34-3 3-3 3 1.34 3 3z" />
              </svg>
              <span className="text-[12px] text-white">
                Original sound — {data.author.handle.replace('@', '')}
              </span>
            </div>
          </div>
        </div>

        {/* Bottom nav */}
        <div
          className="flex items-center justify-around py-2 mt-1"
          style={{ background: '#000' }}
        >
          {['Home', 'Friends', '', 'Inbox', 'Profile'].map((label, i) => (
            <div key={i} className="flex flex-col items-center">
              {i === 2 ? (
                <div
                  className="h-8 w-12 rounded-lg flex items-center justify-center"
                  style={{
                    background: 'linear-gradient(135deg, #00f2ea, #ff0050)',
                  }}
                >
                  <span className="text-white text-[18px] font-bold">+</span>
                </div>
              ) : (
                <>
                  <div
                    className="h-5 w-5 rounded"
                    style={{ background: i === 0 ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.3)' }}
                  />
                  <span
                    className="text-[10px] mt-0.5"
                    style={{ color: i === 0 ? '#fff' : 'rgba(255,255,255,0.5)' }}
                  >
                    {label}
                  </span>
                </>
              )}
            </div>
          ))}
        </div>
      </div>
    </PhoneFrame>
  );
}
