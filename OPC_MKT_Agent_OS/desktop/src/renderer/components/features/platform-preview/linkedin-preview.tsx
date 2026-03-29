import { BrowserFrame } from './browser-frame';
import type { PlatformPreviewProps } from './types';
import { getAuthorName, DEFAULT_AUTHOR, getAdaptedContent } from './types';
import { stripMarkdown } from '@/lib/strip-markdown';

export function LinkedInPreview({ item }: PlatformPreviewProps) {
  const authorName = getAuthorName(item);
  const adapted = getAdaptedContent(item, 'LinkedIn');
  const body = stripMarkdown(adapted.body);
  const tagsText = adapted.tags.map((t) => `#${t}`).join(' ');
  const showMore = body.length > 200;
  const displayBody = showMore ? body.slice(0, 200) : body;

  return (
    <BrowserFrame url="linkedin.com/feed">
      <div style={{ background: '#1b1f23', minHeight: '360px', padding: '12px' }}>
        <div className="rounded-lg overflow-hidden" style={{ background: '#1e2328', border: '1px solid #38434f' }}>
          {/* Header */}
          <div className="flex items-start gap-3 px-4 pt-3">
            <div
              className="h-12 w-12 rounded-full shrink-0 flex items-center justify-center text-[16px] font-bold"
              style={{ background: 'rgba(10,102,194,0.2)', color: '#0a66c2' }}
            >
              {authorName.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[14px] font-semibold" style={{ color: 'rgba(255,255,255,0.9)' }}>
                {authorName}
              </div>
              <div className="text-[12px]" style={{ color: 'rgba(255,255,255,0.6)' }}>
                {DEFAULT_AUTHOR.title} at {DEFAULT_AUTHOR.company}
              </div>
              <div className="flex items-center gap-1 text-[12px]" style={{ color: 'rgba(255,255,255,0.5)' }}>
                <span>2h</span>
                <span>·</span>
                <svg className="h-3 w-3" viewBox="0 0 24 24" fill="rgba(255,255,255,0.5)">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" />
                </svg>
              </div>
            </div>
          </div>

          {/* Body */}
          <div className="px-4 py-3 text-[14px] leading-[20px] whitespace-pre-line break-words" style={{ color: 'rgba(255,255,255,0.9)' }}>
            {displayBody}
            {showMore && (
              <span className="text-[14px] font-semibold cursor-pointer" style={{ color: 'rgba(255,255,255,0.6)' }}>
                {' '}...see more
              </span>
            )}
            {tagsText && (
              <div className="mt-2" style={{ color: '#71b7fb' }}>
                {tagsText}
              </div>
            )}
          </div>

          {/* Media placeholder */}
          <div
            className="w-full aspect-video"
            style={{ background: 'linear-gradient(135deg, rgba(10,102,194,0.3), rgba(10,102,194,0.1))' }}
          />

          {/* Reactions */}
          <div className="flex items-center justify-between px-4 py-1.5">
            <div className="flex items-center gap-1">
              <div className="flex -space-x-1">
                <span className="text-[12px]">👍</span>
                <span className="text-[12px]">🎉</span>
                <span className="text-[12px]">💡</span>
              </div>
              <span className="text-[12px] ml-1" style={{ color: 'rgba(255,255,255,0.5)' }}>128</span>
            </div>
            <span className="text-[12px]" style={{ color: 'rgba(255,255,255,0.5)' }}>
              42 comments · 8 reposts
            </span>
          </div>

          {/* Action bar */}
          <div className="flex items-center justify-around px-2 py-1" style={{ borderTop: '1px solid #38434f' }}>
            {[
              { label: 'Like', icon: 'M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3H14zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3' },
              { label: 'Comment', icon: 'M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z' },
              { label: 'Repost', icon: 'M17 1l4 4-4 4M3 11V9a4 4 0 0 1 4-4h14M7 23l-4-4 4-4M21 13v2a4 4 0 0 1-4 4H3' },
              { label: 'Send', icon: 'M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z' },
            ].map(({ label, icon }) => (
              <button
                key={label}
                className="flex items-center gap-1.5 px-3 py-2.5 rounded-md text-[13px] font-medium"
                style={{ color: 'rgba(255,255,255,0.6)' }}
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                  <path d={icon} />
                </svg>
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </BrowserFrame>
  );
}
