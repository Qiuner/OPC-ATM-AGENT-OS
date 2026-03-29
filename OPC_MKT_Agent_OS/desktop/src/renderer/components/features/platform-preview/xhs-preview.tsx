import { useState, useEffect } from 'react';
import { PhoneFrame } from './phone-frame';
import type { PlatformPreviewProps } from './types';
import { getAuthorName, getAdaptedContent } from './types';
import { stripMarkdown } from '@/lib/strip-markdown';

/** Load local image via IPC (same pattern as approval.tsx LocalImage) */
function LocalImg({ path, alt, className, style }: {
  path: string; alt?: string; className?: string; style?: React.CSSProperties;
}) {
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    if (path.startsWith('http')) { setSrc(path); return; }
    let cancelled = false;
    const api = (window as unknown as { api?: { file?: { readImage(p: string): Promise<{ success: boolean; data?: { dataUrl: string } }> } } }).api;
    if (!api?.file?.readImage) return;
    api.file.readImage(path).then((res) => {
      if (!cancelled && res.success && res.data) setSrc(res.data.dataUrl);
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [path]);
  if (!src) return null;
  return <img src={src} alt={alt ?? ''} className={className} style={style} />;
}

/* ---- Mock data for realistic preview ---- */

const MOCK_COMMENTS = [
  { avatar: '🌸', name: '甜甜圈日记', time: '3小时前', text: '天呐太实用了吧！已收藏 ❤️', likes: 42, liked: true },
  { avatar: '🎨', name: 'Zoey_设计师', time: '5小时前', text: '刚好需要这个！马住了 📌', likes: 18, liked: false },
  { avatar: '☀️', name: '阿猫是运营喵', time: '昨天', text: '请问有完整版教程吗？想跟着学一下～', likes: 7, liked: false },
];

const MOCK_COVER_IMAGES = [
  // Gradient simulating a stylish content cover
  'linear-gradient(165deg, #ffecd2 0%, #fcb69f 40%, #ff9a9e 100%)',
  'linear-gradient(165deg, #a18cd1 0%, #fbc2eb 50%, #f6d5f7 100%)',
  'linear-gradient(165deg, #89f7fe 0%, #66a6ff 50%, #818cf8 100%)',
];

export function XhsPreview({ item }: PlatformPreviewProps) {
  const authorName = getAuthorName(item);
  const adapted = getAdaptedContent(item, '小红书');
  const body = stripMarkdown(adapted.body);
  const tags = adapted.tags;
  const mediaUrls = (item as { mediaUrls?: string[] }).mediaUrls ?? [];
  const hasRealImages = mediaUrls.length > 0;

  // Use title hash to pick a consistent cover gradient
  const coverIdx = Math.abs(item.title.length) % MOCK_COVER_IMAGES.length;

  return (
    <PhoneFrame variant="light">
      <div style={{ background: '#ffffff', minHeight: '500px' }}>
        {/* ── Top nav bar ── */}
        <div
          className="flex items-center justify-between px-3 py-2"
          style={{ background: '#fff', borderBottom: '1px solid #f0f0f0' }}
        >
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="#333" strokeWidth={2}>
            <path d="M15 18l-6-6 6-6" />
          </svg>

          {/* Author info in nav */}
          <div className="flex items-center gap-2">
            <div
              className="h-7 w-7 rounded-full flex items-center justify-center text-[10px] font-bold"
              style={{ background: '#fff0f1', color: '#FF2442' }}
            >
              {authorName.charAt(0)}
            </div>
            <span className="text-[13px] font-medium" style={{ color: '#333' }}>
              {authorName}
            </span>
            <button
              className="rounded-full px-3 py-0.5 text-[11px] font-semibold"
              style={{ border: '1px solid #FF2442', color: '#FF2442', background: 'transparent' }}
            >
              关注
            </button>
          </div>

          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="#333" strokeWidth={2}>
            <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
            <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
            <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
          </svg>
        </div>

        {/* ── Image carousel area ── */}
        <div className="relative w-full" style={{ aspectRatio: '3/4', background: hasRealImages ? '#f5f5f5' : MOCK_COVER_IMAGES[coverIdx] }}>
          {hasRealImages ? (
            <LocalImg
              path={mediaUrls[0]}
              alt={item.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center px-8">
              <div
                className="text-[20px] font-bold text-center leading-[28px]"
                style={{ color: '#fff', textShadow: '0 2px 12px rgba(0,0,0,0.15)' }}
              >
                {item.title.length > 30 ? item.title.slice(0, 30) + '...' : item.title}
              </div>
              <div
                className="mt-2 text-[12px] font-medium"
                style={{ color: 'rgba(255,255,255,0.8)', textShadow: '0 1px 4px rgba(0,0,0,0.1)' }}
              >
                {authorName} · 原创内容
              </div>
            </div>
          )}

          {/* Dot indicators */}
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-[5px]">
            {(hasRealImages ? mediaUrls : [0, 1, 2]).map((_, i) => (
              <div
                key={i}
                style={{
                  width: i === 0 ? '14px' : '5px',
                  height: '5px',
                  borderRadius: '3px',
                  background: i === 0 ? '#fff' : 'rgba(255,255,255,0.45)',
                  transition: 'width 0.2s',
                }}
              />
            ))}
          </div>
        </div>

        {/* ── Title ── */}
        <div className="px-4 pt-3">
          <h2 className="text-[17px] font-bold leading-[24px]" style={{ color: '#222' }}>
            {item.title}
          </h2>
        </div>

        {/* ── Body text ── */}
        <div className="px-4 pt-2 text-[14px] leading-[24px]" style={{ color: '#333', whiteSpace: 'pre-line' }}>
          {body || '分享一些超实用的干货内容，希望对大家有帮助～记得点赞收藏哦！'}
        </div>

        {/* ── Hashtags ── */}
        {tags.length > 0 && (
          <div className="px-4 pt-2">
            {tags.map((tag) => (
              <span key={tag} className="text-[14px] mr-1" style={{ color: '#3F7FBF' }}>
                #{tag}
              </span>
            ))}
          </div>
        )}

        {/* ── Location & time ── */}
        <div className="px-4 pt-3 flex items-center gap-1 text-[11px]" style={{ color: '#bbb' }}>
          <span>IP属地: 上海</span>
          <span>·</span>
          <span>3小时前</span>
        </div>

        {/* ── Divider ── */}
        <div className="mx-4 mt-3 mb-1" style={{ borderTop: '1px solid #f0f0f0' }} />

        {/* ── Comments section ── */}
        <div className="px-4 pt-2 pb-1">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[13px] font-semibold" style={{ color: '#333' }}>共 56 条评论</span>
            <span className="text-[11px]" style={{ color: '#999' }}>最热</span>
          </div>

          {MOCK_COMMENTS.map((c, i) => (
            <div key={i} className="flex gap-2.5 mb-4">
              <div
                className="h-8 w-8 rounded-full shrink-0 flex items-center justify-center text-[14px]"
                style={{ background: '#f5f5f5' }}
              >
                {c.avatar}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[13px] font-medium" style={{ color: '#333' }}>{c.name}</span>
                  <span className="text-[11px]" style={{ color: '#bbb' }}>{c.time}</span>
                </div>
                <p className="text-[14px] mt-1 leading-[20px]" style={{ color: '#333' }}>{c.text}</p>
                <div className="flex items-center gap-4 mt-1.5">
                  <span className="text-[11px]" style={{ color: '#999' }}>回复</span>
                </div>
              </div>
              <div className="flex flex-col items-center gap-0.5 shrink-0 pt-2">
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill={c.liked ? '#FF2442' : 'none'} stroke={c.liked ? '#FF2442' : '#ccc'} strokeWidth={2}>
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                </svg>
                <span className="text-[10px]" style={{ color: c.liked ? '#FF2442' : '#ccc' }}>{c.likes}</span>
              </div>
            </div>
          ))}
        </div>

        {/* ── Bottom engagement bar ── */}
        <div
          className="flex items-center gap-2 px-3 py-2.5"
          style={{ borderTop: '1px solid #f0f0f0', background: '#fff' }}
        >
          {/* Input */}
          <div
            className="flex-1 rounded-full px-3 py-1.5 text-[13px]"
            style={{ background: '#f5f5f5', color: '#bbb' }}
          >
            说点什么...
          </div>

          {/* Like */}
          <div className="flex items-center gap-1 px-1">
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="#FF2442" stroke="#FF2442" strokeWidth={1.5}>
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
            <span className="text-[11px]" style={{ color: '#333' }}>328</span>
          </div>

          {/* Collect */}
          <div className="flex items-center gap-1 px-1">
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="#FECE0A" stroke="#FECE0A" strokeWidth={1.5}>
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
            <span className="text-[11px]" style={{ color: '#333' }}>186</span>
          </div>

          {/* Comment */}
          <div className="flex items-center gap-1 px-1">
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="#333" strokeWidth={1.5}>
              <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
            </svg>
            <span className="text-[11px]" style={{ color: '#333' }}>56</span>
          </div>

          {/* Share */}
          <div className="px-1">
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="#333" strokeWidth={1.5}>
              <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
            </svg>
          </div>
        </div>
      </div>
    </PhoneFrame>
  );
}
