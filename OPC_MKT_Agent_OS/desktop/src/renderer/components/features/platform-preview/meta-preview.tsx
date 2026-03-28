import { BrowserFrame } from './browser-frame';
import type { PlatformPreviewProps } from './types';
import { getAuthorName } from './types';

export function MetaPreview({ item }: PlatformPreviewProps) {
  const authorName = getAuthorName(item);
  const body = item.body ?? '';
  const tagsText = (item.tags ?? []).map((t) => `#${t}`).join(' ');

  return (
    <BrowserFrame url="facebook.com">
      <div style={{ background: '#242526', minHeight: '360px', padding: '12px' }}>
        <div className="rounded-lg overflow-hidden" style={{ background: '#242526' }}>
          {/* Post header */}
          <div className="flex items-center gap-3 px-4 pt-3 pb-2">
            <div
              className="h-10 w-10 rounded-full shrink-0 flex items-center justify-center text-[14px] font-bold"
              style={{ background: '#1877f2', color: '#fff' }}
            >
              {authorName.charAt(0)}
            </div>
            <div>
              <div className="text-[15px] font-semibold" style={{ color: '#e4e6eb' }}>
                {authorName}
              </div>
              <div className="flex items-center gap-1 text-[13px]" style={{ color: '#b0b3b8' }}>
                <span>2h</span>
                <span>·</span>
                <svg className="h-3 w-3" viewBox="0 0 24 24" fill="#b0b3b8">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" />
                </svg>
              </div>
            </div>
          </div>

          {/* Post body */}
          <div className="px-4 pb-3 text-[15px] leading-[20px]" style={{ color: '#e4e6eb' }}>
            {body}
            {tagsText && (
              <span style={{ color: '#1877f2' }}> {tagsText}</span>
            )}
          </div>

          {/* Media placeholder */}
          <div
            className="w-full aspect-video"
            style={{ background: 'linear-gradient(135deg, #1877f2, #42b72a)' }}
          />

          {/* Reactions */}
          <div className="flex items-center justify-between px-4 py-2">
            <div className="flex items-center gap-1">
              <div className="flex -space-x-1">
                <div className="h-[18px] w-[18px] rounded-full flex items-center justify-center text-[10px]" style={{ background: '#1877f2', zIndex: 3 }}>👍</div>
                <div className="h-[18px] w-[18px] rounded-full flex items-center justify-center text-[10px]" style={{ background: '#f33e58', zIndex: 2 }}>❤️</div>
                <div className="h-[18px] w-[18px] rounded-full flex items-center justify-center text-[10px]" style={{ background: '#f7b928', zIndex: 1 }}>😆</div>
              </div>
              <span className="text-[13px] ml-1" style={{ color: '#b0b3b8' }}>You and 128 others</span>
            </div>
            <span className="text-[13px]" style={{ color: '#b0b3b8' }}>42 comments · 8 shares</span>
          </div>

          {/* Action bar */}
          <div className="flex items-center justify-around px-4 py-1" style={{ borderTop: '1px solid #3e4042' }}>
            {[
              { label: 'Like', icon: 'M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3H14zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3' },
              { label: 'Comment', icon: 'M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z' },
              { label: 'Share', icon: 'M17 1l4 4-4 4M3 11V9a4 4 0 0 1 4-4h14M7 23l-4-4 4-4M21 13v2a4 4 0 0 1-4 4H3' },
            ].map(({ label, icon }) => (
              <button
                key={label}
                className="flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-[15px] font-medium"
                style={{ color: '#b0b3b8' }}
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
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
