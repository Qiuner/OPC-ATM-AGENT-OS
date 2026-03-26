'use client';

import { useState } from 'react';
import { PhoneFrame } from './phone-frame';
import type { PreviewData } from './types';

interface InstagramPreviewProps {
  data: PreviewData;
}

type IgViewMode = 'feed' | 'story' | 'reels';

function IgHeartIcon() {
  return (
    <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="#f5f5f5" strokeWidth={1.5}>
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  );
}

function IgCommentIcon() {
  return (
    <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="#f5f5f5" strokeWidth={1.5}>
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
    </svg>
  );
}

function IgShareIcon() {
  return (
    <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="#f5f5f5" strokeWidth={1.5}>
      <line x1="22" y1="2" x2="11" y2="13" />
      <polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
  );
}

function IgBookmarkIcon() {
  return (
    <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="#f5f5f5" strokeWidth={1.5}>
      <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
    </svg>
  );
}

/** Feed post view */
function FeedView({ data }: { data: PreviewData }) {
  return (
    <div style={{ background: '#000' }}>
      {/* IG header */}
      <div className="flex items-center justify-between px-3 py-2">
        <span className="text-[16px] font-semibold" style={{ color: '#f5f5f5', fontFamily: '-apple-system, sans-serif' }}>
          Instagram
        </span>
        <div className="flex items-center gap-4">
          <IgHeartIcon />
          <IgShareIcon />
        </div>
      </div>

      {/* Post header */}
      <div className="flex items-center justify-between px-3 py-2.5">
        <div className="flex items-center gap-2.5">
          <div
            className="h-8 w-8 rounded-full flex items-center justify-center text-[11px] font-bold"
            style={{ background: 'rgba(225,48,108,0.2)', color: '#e1306c' }}
          >
            {data.author.name.charAt(0)}
          </div>
          <span className="text-[14px] font-semibold" style={{ color: '#f5f5f5' }}>
            {data.author.handle.replace('@', '')}
          </span>
        </div>
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="#f5f5f5">
          <circle cx="5" cy="12" r="2" />
          <circle cx="12" cy="12" r="2" />
          <circle cx="19" cy="12" r="2" />
        </svg>
      </div>

      {/* Image */}
      <div
        className="w-full aspect-square bg-cover bg-center"
        style={{
          background: data.mediaUrls[0]
            ? `url(${data.mediaUrls[0]}) center/cover`
            : 'linear-gradient(135deg, #833ab4, #fd1d1d, #fcb045)',
        }}
      />

      {/* Action icons */}
      <div className="flex items-center justify-between px-3 py-2.5">
        <div className="flex items-center gap-4">
          <IgHeartIcon />
          <IgCommentIcon />
          <IgShareIcon />
        </div>
        <IgBookmarkIcon />
      </div>

      {/* Likes */}
      <div className="px-3 text-[14px] font-semibold" style={{ color: '#f5f5f5' }}>
        1,284 likes
      </div>

      {/* Caption */}
      <div className="px-3 mt-1 text-[14px] leading-[18px]" style={{ color: '#f5f5f5' }}>
        <span className="font-semibold">{data.author.handle.replace('@', '')}</span>{' '}
        {data.body.slice(0, 150)}
        {data.body.length > 150 && (
          <span style={{ color: '#a8a8a8' }}> ...more</span>
        )}
      </div>

      {/* Tags */}
      {data.tags.length > 0 && (
        <div className="px-3 mt-1 text-[14px]" style={{ color: '#e0f1ff' }}>
          {data.tags.map((t) => `#${t}`).join(' ')}
        </div>
      )}

      {/* Comments link */}
      <div className="px-3 pt-1 text-[14px]" style={{ color: '#a8a8a8' }}>
        View all 42 comments
      </div>

      {/* Time */}
      <div className="px-3 pt-1 pb-3 text-[10px] uppercase" style={{ color: '#a8a8a8' }}>
        2 hours ago
      </div>
    </div>
  );
}

/** Story preview */
function StoryView({ data }: { data: PreviewData }) {
  return (
    <div className="relative" style={{ background: '#000', minHeight: '580px' }}>
      {/* Progress bar */}
      <div className="flex gap-1 px-2 pt-2">
        <div className="flex-1 h-0.5 rounded-full" style={{ background: '#ffffff' }} />
        <div className="flex-1 h-0.5 rounded-full" style={{ background: 'rgba(255,255,255,0.3)' }} />
        <div className="flex-1 h-0.5 rounded-full" style={{ background: 'rgba(255,255,255,0.3)' }} />
      </div>

      {/* User info */}
      <div className="flex items-center justify-between px-3 py-2">
        <div className="flex items-center gap-2">
          <div
            className="h-8 w-8 rounded-full flex items-center justify-center text-[11px] font-bold"
            style={{ background: 'rgba(225,48,108,0.3)', color: '#e1306c' }}
          >
            {data.author.name.charAt(0)}
          </div>
          <span className="text-[14px] font-semibold text-white">
            {data.author.handle.replace('@', '')}
          </span>
          <span className="text-[12px]" style={{ color: 'rgba(255,255,255,0.6)' }}>
            2h
          </span>
        </div>
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2}>
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </div>

      {/* Full-screen content */}
      <div
        className="mx-2 rounded-lg aspect-[9/16] max-h-[420px] bg-cover bg-center flex items-end"
        style={{
          background: data.mediaUrls[0]
            ? `url(${data.mediaUrls[0]}) center/cover`
            : 'linear-gradient(180deg, #833ab4, #fd1d1d, #fcb045)',
        }}
      >
        {/* Bottom gradient overlay */}
        <div
          className="w-full p-4 rounded-b-lg"
          style={{ background: 'linear-gradient(transparent, rgba(0,0,0,0.7))' }}
        >
          <p className="text-white text-[16px] font-semibold leading-tight">
            {data.title}
          </p>
          <p className="text-white/70 text-[13px] mt-1 line-clamp-2">
            {data.body.slice(0, 100)}
          </p>
        </div>
      </div>

      {/* Bottom input */}
      <div className="flex items-center gap-3 px-3 py-3 mt-auto">
        <div
          className="flex-1 rounded-full px-4 py-2 text-[14px]"
          style={{ border: '1px solid rgba(255,255,255,0.3)', color: 'rgba(255,255,255,0.5)' }}
        >
          Send message
        </div>
        <IgHeartIcon />
        <IgShareIcon />
      </div>
    </div>
  );
}

/** Reels preview */
function ReelsView({ data }: { data: PreviewData }) {
  return (
    <div className="relative" style={{ background: '#000', minHeight: '580px' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2">
        <span className="text-[16px] font-semibold text-white">Reels</span>
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2}>
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.35-4.35" />
        </svg>
      </div>

      {/* Video area */}
      <div
        className="relative mx-1 rounded-lg overflow-hidden"
        style={{
          height: '480px',
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

        {/* Right sidebar */}
        <div className="absolute right-3 bottom-[120px] flex flex-col items-center gap-5">
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
            { label: '12.5K', icon: 'M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z' },
            { label: '342', icon: 'M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z' },
            { label: '89', icon: 'M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z' },
            { label: '56', icon: 'M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z' },
          ].map((btn, i) => (
            <div key={i} className="flex flex-col items-center gap-0.5">
              <svg className="h-8 w-8" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={1.5}>
                <path d={btn.icon} />
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

        {/* Bottom text */}
        <div className="absolute left-3 bottom-[20px] right-[80px]">
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
              Original audio — {data.author.handle.replace('@', '')}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export function InstagramPreview({ data }: InstagramPreviewProps) {
  const [viewMode, setViewMode] = useState<IgViewMode>('feed');

  return (
    <div>
      {/* View mode toggle */}
      <div className="flex items-center justify-center gap-1 mb-3">
        {(['feed', 'story', 'reels'] as const).map((mode) => (
          <button
            key={mode}
            onClick={() => setViewMode(mode)}
            className="rounded-md px-3 py-1 text-[11px] font-medium transition-all"
            style={
              viewMode === mode
                ? { background: 'rgba(225,48,108,0.15)', color: '#e1306c', border: '1px solid rgba(225,48,108,0.25)' }
                : { background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.4)', border: '1px solid transparent' }
            }
          >
            {mode.charAt(0).toUpperCase() + mode.slice(1)}
          </button>
        ))}
      </div>

      <PhoneFrame>
        {viewMode === 'feed' && <FeedView data={data} />}
        {viewMode === 'story' && <StoryView data={data} />}
        {viewMode === 'reels' && <ReelsView data={data} />}
      </PhoneFrame>
    </div>
  );
}
