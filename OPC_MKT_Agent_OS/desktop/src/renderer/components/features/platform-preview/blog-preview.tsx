import { BrowserFrame } from './browser-frame';
import type { PlatformPreviewProps } from './types';
import { getAuthorName } from './types';

export function BlogPreview({ item }: PlatformPreviewProps) {
  const authorName = getAuthorName(item);
  const body = item.body ?? '';
  const tags = item.tags ?? [];
  const readingTime = Math.max(1, Math.ceil((body.split(/\s+/).length) / 200));
  const slug = item.title.toLowerCase().replace(/[^a-z0-9\u4e00-\u9fff]+/g, '-').slice(0, 40);

  return (
    <BrowserFrame url={`blog.example.com/${slug}`}>
      <div style={{ background: '#ffffff', minHeight: '360px' }}>
        {/* Category + Title */}
        <div className="px-6 pt-6">
          {tags.length > 0 && (
            <span
              className="inline-block rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-wide"
              style={{ background: '#dcfce7', color: '#166534' }}
            >
              {tags[0]}
            </span>
          )}
          <h1 className="text-[22px] font-bold mt-2 leading-[28px]" style={{ color: '#111827' }}>
            {item.title}
          </h1>

          {/* Author & meta */}
          <div className="flex items-center gap-3 mt-3">
            <div
              className="h-8 w-8 rounded-full shrink-0 flex items-center justify-center text-[12px] font-bold"
              style={{ background: '#e5e7eb', color: '#6b7280' }}
            >
              {authorName.charAt(0)}
            </div>
            <div className="text-[13px]" style={{ color: '#6b7280' }}>
              <span style={{ color: '#374151', fontWeight: 500 }}>{authorName}</span>
              {' · '}
              {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              {' · '}
              {readingTime} min read
            </div>
          </div>
        </div>

        {/* Hero image placeholder */}
        <div
          className="w-full mt-4"
          style={{
            aspectRatio: '2/1',
            background: 'linear-gradient(135deg, #ecfdf5, #d1fae5, #a7f3d0)',
          }}
        />

        {/* Body */}
        <div className="px-6 py-4 text-[15px] leading-[24px]" style={{ color: '#374151' }}>
          {body.split('\n').filter(Boolean).map((paragraph, i) => (
            <p key={i} className={i > 0 ? 'mt-3' : ''}>
              {paragraph}
            </p>
          ))}
        </div>

        {/* Tags */}
        {tags.length > 0 && (
          <div className="px-6 pb-4 flex flex-wrap gap-2">
            {tags.map((tag) => (
              <span
                key={tag}
                className="rounded-full px-3 py-1 text-[12px] font-medium"
                style={{ background: '#f3f4f6', color: '#4b5563' }}
              >
                #{tag}
              </span>
            ))}
          </div>
        )}

        {/* SEO Meta Description preview */}
        <div className="px-6 py-3" style={{ borderTop: '1px solid #e5e7eb', background: '#f9fafb' }}>
          <div className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: '#9ca3af' }}>
            SEO Meta Description
          </div>
          <div className="text-[13px] mt-1" style={{ color: '#6b7280' }}>
            {body.slice(0, 155)}{body.length > 155 ? '...' : ''}
          </div>
          {tags.length > 0 && (
            <div className="text-[11px] mt-1.5" style={{ color: '#9ca3af' }}>
              Keywords: {tags.join(', ')}
            </div>
          )}
        </div>
      </div>
    </BrowserFrame>
  );
}
