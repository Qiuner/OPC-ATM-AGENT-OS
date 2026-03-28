import { BrowserFrame } from './browser-frame';
import type { PlatformPreviewProps } from './types';
import { getAuthorName, getHandle } from './types';

export function EmailPreview({ item }: PlatformPreviewProps) {
  const brandName = getAuthorName(item);
  const handle = getHandle(item);
  const initial = brandName.charAt(0).toUpperCase();
  const body = item.body ?? '';

  return (
    <BrowserFrame url="mail.google.com">
      <div style={{ background: '#111827', minHeight: '360px' }}>
        {/* Search bar */}
        <div className="px-4 py-2">
          <div
            className="rounded-lg px-4 py-2 text-[14px]"
            style={{ background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.3)' }}
          >
            Search mail
          </div>
        </div>

        {/* Inbox header */}
        <div className="flex items-center gap-2 px-4 py-2">
          <span className="text-[14px] font-semibold" style={{ color: '#f3f4f6' }}>Inbox</span>
          <span className="text-[12px]" style={{ color: '#6b7280' }}>(3)</span>
        </div>

        {/* Email list */}
        <div>
          {/* Current email (selected) */}
          <div
            className="flex items-start gap-3 px-4 py-3"
            style={{
              background: 'rgba(167,139,250,0.08)',
              borderLeft: '3px solid #a78bfa',
              borderBottom: '1px solid rgba(255,255,255,0.06)',
            }}
          >
            <div
              className="h-8 w-8 rounded-full shrink-0 flex items-center justify-center text-[12px] font-bold"
              style={{ background: 'rgba(167,139,250,0.2)', color: '#a78bfa' }}
            >
              {initial}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="text-[14px] font-semibold" style={{ color: '#f3f4f6' }}>{brandName}</span>
                <span className="text-[11px] shrink-0" style={{ color: '#6b7280' }}>3m</span>
              </div>
              <div className="text-[13px] font-medium" style={{ color: '#d1d5db' }}>{item.title}</div>
              <div className="text-[12px] line-clamp-1" style={{ color: '#6b7280' }}>{body.slice(0, 80)}</div>
            </div>
          </div>

          {/* Other emails (dimmed) */}
          {[
            { subject: 'Weekly Newsletter', preview: 'Check out our latest updates...', time: '2h' },
            { subject: 'Special Offer Inside', preview: 'Limited time offer for you...', time: '1d' },
          ].map((email, i) => (
            <div
              key={i}
              className="flex items-start gap-3 px-4 py-3"
              style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
            >
              <div
                className="h-8 w-8 rounded-full shrink-0 flex items-center justify-center text-[12px] font-bold"
                style={{ background: 'rgba(167,139,250,0.1)', color: 'rgba(167,139,250,0.6)' }}
              >
                {initial}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-[14px]" style={{ color: '#9ca3af' }}>{brandName}</span>
                  <span className="text-[11px] shrink-0" style={{ color: '#6b7280' }}>{email.time}</span>
                </div>
                <div className="text-[13px]" style={{ color: '#6b7280' }}>{email.subject}</div>
                <div className="text-[12px] line-clamp-1" style={{ color: '#4b5563' }}>{email.preview}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Divider */}
        <div className="my-2" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }} />

        {/* Email content view */}
        <div className="px-5 py-4">
          {/* Toolbar */}
          <div className="flex items-center justify-between mb-3">
            <span className="text-[13px]" style={{ color: 'rgba(255,255,255,0.4)' }}>← Back</span>
            <div className="flex items-center gap-3">
              <span className="text-[12px]" style={{ color: 'rgba(255,255,255,0.3)' }}>Reply</span>
              <span className="text-[12px]" style={{ color: 'rgba(255,255,255,0.3)' }}>Forward</span>
            </div>
          </div>

          {/* Subject */}
          <div className="text-[18px] font-semibold" style={{ color: '#f3f4f6' }}>{item.title}</div>

          {/* Meta */}
          <div className="text-[13px] mt-2 space-y-0.5" style={{ color: '#9ca3af' }}>
            <div>
              From: <span style={{ color: '#d1d5db', fontWeight: 500 }}>{brandName} &lt;{handle.replace('@', '')}@company.com&gt;</span>
            </div>
            <div>To: recipient@email.com</div>
            <div>Date: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</div>
          </div>

          {/* Divider */}
          <div className="my-3" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }} />

          {/* Body */}
          <div className="text-[14px] leading-[22px]" style={{ color: '#e5e7eb' }}>
            <p>Hi [First Name],</p>
            <br />
            <p>{body}</p>
          </div>

          {/* CTA Button */}
          <div className="mt-4">
            <span
              className="inline-block rounded-lg px-6 py-2.5 text-[14px] font-semibold text-white"
              style={{ background: '#a78bfa' }}
            >
              Learn More
            </span>
          </div>

          {/* Sign off */}
          <div className="mt-5 text-[14px] leading-[22px]" style={{ color: '#e5e7eb' }}>
            <p>Best regards,</p>
            <p className="font-medium">{brandName}</p>
          </div>

          {/* Footer */}
          <div className="mt-5 text-[11px]" style={{ color: '#6b7280' }}>
            <span style={{ borderTop: '1px solid rgba(255,255,255,0.08)', display: 'block', paddingTop: '8px' }}>
              Unsubscribe | View in browser
            </span>
          </div>
        </div>
      </div>
    </BrowserFrame>
  );
}
