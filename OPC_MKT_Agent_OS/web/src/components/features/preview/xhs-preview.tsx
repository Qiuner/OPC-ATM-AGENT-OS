'use client';

import { PhoneFrame } from './phone-frame';
import type { PreviewData } from './types';

interface XhsPreviewProps {
  data: PreviewData;
}

function HeartIcon({ filled }: { filled?: boolean }) {
  return (
    <svg className="h-3 w-3" viewBox="0 0 24 24" fill={filled ? '#ff2a54' : 'none'} stroke={filled ? '#ff2a54' : 'currentColor'} strokeWidth={2}>
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  );
}

/** 小红书笔记卡片 (瀑布流单卡) */
function NoteCard({
  title,
  authorName,
  likes,
  hasImage,
  imageIdx,
}: {
  title: string;
  authorName: string;
  likes: string;
  hasImage: boolean;
  imageIdx: number;
}) {
  const gradients = [
    'linear-gradient(135deg, #ff2a54, #ff6b81)',
    'linear-gradient(135deg, #ff6b81, #ffb4c2)',
    'linear-gradient(135deg, #ff2a54, #c21e3a)',
    'linear-gradient(135deg, #ffb4c2, #ff2a54)',
  ];

  return (
    <div className="rounded-md overflow-hidden" style={{ background: '#262626' }}>
      {/* Cover image */}
      <div
        className="w-full bg-cover bg-center"
        style={{
          aspectRatio: imageIdx % 2 === 0 ? '3/4' : '4/3',
          background: hasImage ? undefined : gradients[imageIdx % gradients.length],
        }}
      />
      {/* Title */}
      <div
        className="px-2 pt-2 text-[12px] font-medium leading-tight line-clamp-2"
        style={{ color: '#ffffff' }}
      >
        {title}
      </div>
      {/* User row */}
      <div className="flex items-center justify-between px-2 py-2">
        <div className="flex items-center gap-1.5">
          <div
            className="h-4 w-4 rounded-full"
            style={{ background: 'rgba(255,255,255,0.1)' }}
          />
          <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.5)' }}>
            {authorName}
          </span>
        </div>
        <div
          className="flex items-center gap-0.5 text-[10px]"
          style={{ color: 'rgba(255,255,255,0.4)' }}
        >
          <HeartIcon />
          <span>{likes}</span>
        </div>
      </div>
    </div>
  );
}

export function XhsPreview({ data }: XhsPreviewProps) {
  const titleChunks = data.title.length > 12
    ? [data.title.slice(0, 12), data.title.slice(12, 24)]
    : [data.title];

  return (
    <PhoneFrame>
      <div style={{ background: '#1a1a1a', minHeight: '580px' }}>
        {/* App header */}
        <div className="flex items-center justify-between px-3 py-2">
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth={2}>
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>
          <span className="text-[14px] font-semibold" style={{ color: '#ff2a54' }}>
            小红书
          </span>
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth={2}>
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </div>

        {/* Tab bar */}
        <div
          className="flex items-center gap-4 px-3 pb-2"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
        >
          {['关注', '发现', '附近'].map((tab, i) => (
            <span
              key={tab}
              className="text-[13px] font-medium pb-1"
              style={{
                color: i === 1 ? '#ffffff' : 'rgba(255,255,255,0.4)',
                borderBottom: i === 1 ? '2px solid #ff2a54' : '2px solid transparent',
              }}
            >
              {tab}
            </span>
          ))}
        </div>

        {/* Waterfall grid */}
        <div className="grid grid-cols-2 gap-2 px-2 pt-2">
          {/* Main content card (highlighted) */}
          <div className="rounded-md overflow-hidden" style={{ background: '#262626', border: '1px solid rgba(255,42,84,0.3)' }}>
            <div
              className="w-full bg-cover bg-center"
              style={{
                aspectRatio: '3/4',
                background: data.mediaUrls[0]
                  ? `url(${data.mediaUrls[0]}) center/cover`
                  : 'linear-gradient(135deg, #ff2a54, #ff6b81)',
              }}
            />
            <div
              className="px-2 pt-2 text-[12px] font-medium leading-tight line-clamp-2"
              style={{ color: '#ffffff' }}
            >
              {data.title}
            </div>
            <div className="flex items-center justify-between px-2 py-2">
              <div className="flex items-center gap-1.5">
                <div
                  className="h-4 w-4 rounded-full flex items-center justify-center text-[8px] font-bold"
                  style={{ background: 'rgba(255,42,84,0.3)', color: '#ff2a54' }}
                >
                  {data.author.name.charAt(0)}
                </div>
                <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.5)' }}>
                  {data.author.name}
                </span>
              </div>
              <div
                className="flex items-center gap-0.5 text-[10px]"
                style={{ color: 'rgba(255,255,255,0.4)' }}
              >
                <HeartIcon filled />
                <span>328</span>
              </div>
            </div>
          </div>

          {/* Placeholder cards */}
          {titleChunks.map((chunk, i) => (
            <NoteCard
              key={i}
              title={chunk + '...'}
              authorName={`user_${i + 1}`}
              likes={String(200 + i * 150)}
              hasImage={false}
              imageIdx={i + 1}
            />
          ))}

          <NoteCard
            title="探索更多精彩内容"
            authorName="小红书推荐"
            likes="1.2k"
            hasImage={false}
            imageIdx={3}
          />
        </div>

        {/* Tags */}
        {data.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 px-3 pt-3">
            {data.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-full px-2 py-0.5 text-[10px]"
                style={{ background: 'rgba(255,42,84,0.1)', color: '#ff2a54' }}
              >
                #{tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </PhoneFrame>
  );
}
