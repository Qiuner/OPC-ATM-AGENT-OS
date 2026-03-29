import { useState } from 'react';
import { BrowserFrame } from './browser-frame';
import type { PlatformPreviewProps } from './types';
import { getAuthorName, getHandle, getAdaptedContent } from './types';
import { stripMarkdown } from '@/lib/strip-markdown';

function highlightEntities(text: string, linkColor: string) {
  const parts = text.split(/(#\w+|@\w+|https?:\/\/\S+)/g);
  return parts.map((part, i) => {
    if (/^[#@]/.test(part) || /^https?:\/\//.test(part)) {
      return (
        <span key={i} style={{ color: linkColor }}>
          {part}
        </span>
      );
    }
    return part;
  });
}

function VerifiedBadge() {
  return (
    <svg className="h-[18px] w-[18px] ml-0.5 shrink-0" viewBox="0 0 24 24" fill="#1d9bf0">
      <path d="M22.25 12c0-1.43-.88-2.67-2.19-3.34.46-1.39.2-2.9-.81-3.91s-2.52-1.27-3.91-.81c-.66-1.31-1.91-2.19-3.34-2.19s-2.67.88-3.33 2.19c-1.4-.46-2.91-.2-3.92.81s-1.26 2.52-.8 3.91c-1.31.67-2.2 1.91-2.2 3.34s.89 2.67 2.2 3.34c-.46 1.39-.21 2.9.8 3.91s2.52 1.26 3.91.81c.67 1.31 1.91 2.19 3.34 2.19s2.68-.88 3.34-2.19c1.39.45 2.9.2 3.91-.81s1.27-2.52.81-3.91c1.31-.67 2.19-1.91 2.19-3.34zm-11.71 4.2L6.8 12.46l1.41-1.42 2.26 2.26 4.8-5.23 1.47 1.36-6.2 6.77z" />
    </svg>
  );
}

export function XPreview({ item }: PlatformPreviewProps) {
  const [isDark, setIsDark] = useState(true);
  const authorName = getAuthorName(item);
  const handle = getHandle(item);

  const colors = isDark
    ? { bg: '#000000', text: '#e7e9ea', secondary: '#71767b', border: 'rgba(255,255,255,0.08)', link: '#1d9bf0' }
    : { bg: '#ffffff', text: '#0f1419', secondary: '#536471', border: '#eff3f4', link: '#1d9bf0' };

  const adapted = getAdaptedContent(item, 'X');
  const body = stripMarkdown(adapted.body);
  const tweetText = body.slice(0, 260);
  const tagsText = adapted.tags.map((t) => `#${t}`).join(' ');
  const fullText = tweetText + (tagsText ? `\n\n${tagsText}` : '');

  return (
    <BrowserFrame url="x.com/home">
      <div style={{ background: colors.bg, minHeight: '360px' }}>
        {/* Theme toggle */}
        <div className="flex justify-end px-3 pt-2">
          <button
            onClick={() => setIsDark(!isDark)}
            className="flex items-center gap-1.5 rounded-full px-2 py-1 text-[10px] transition-all"
            style={{
              background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
              color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)',
            }}
          >
            {isDark ? '☀️' : '🌙'} {isDark ? 'Light' : 'Dark'}
          </button>
        </div>

        {/* Tweet */}
        <div className="px-4 py-3" style={{ borderBottom: `1px solid ${colors.border}` }}>
          <div className="flex gap-3">
            {/* Avatar */}
            <div
              className="h-10 w-10 rounded-full shrink-0 flex items-center justify-center text-[14px] font-bold"
              style={{
                background: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
                color: colors.secondary,
              }}
            >
              {authorName.charAt(0)}
            </div>

            <div className="flex-1 min-w-0">
              {/* Name row */}
              <div className="flex items-center gap-1">
                <span className="text-[15px] font-bold truncate" style={{ color: colors.text }}>
                  {authorName}
                </span>
                <VerifiedBadge />
                <span className="text-[15px] truncate" style={{ color: colors.secondary }}>
                  {handle} · 2h
                </span>
              </div>

              {/* Tweet text */}
              <div className="mt-1 text-[15px] leading-[20px] whitespace-pre-wrap" style={{ color: colors.text }}>
                {highlightEntities(fullText, colors.link)}
              </div>

              {/* Media placeholder */}
              <div className="mt-3 rounded-2xl overflow-hidden" style={{ border: `1px solid ${colors.border}` }}>
                <div
                  className="w-full aspect-video flex items-center justify-center text-[13px]"
                  style={{
                    background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)',
                    color: colors.secondary,
                  }}
                >
                  {item.title}
                </div>
              </div>

              {/* Engagement bar */}
              <div className="flex items-center justify-between mt-3 max-w-[400px]">
                {[
                  { icon: 'M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z', count: '48' },
                  { icon: 'M17 1l4 4-4 4M3 11V9a4 4 0 0 1 4-4h14M7 23l-4-4 4-4M21 13v2a4 4 0 0 1-4 4H3', count: '128' },
                  { icon: 'M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z', count: '1.2K' },
                  { icon: 'M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8zM12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z', count: '24.5K' },
                ].map((action, i) => (
                  <div key={i} className="flex items-center gap-1">
                    <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke={colors.secondary} strokeWidth={1.5}>
                      <path d={action.icon} />
                    </svg>
                    <span className="text-[13px]" style={{ color: colors.secondary }}>{action.count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </BrowserFrame>
  );
}
