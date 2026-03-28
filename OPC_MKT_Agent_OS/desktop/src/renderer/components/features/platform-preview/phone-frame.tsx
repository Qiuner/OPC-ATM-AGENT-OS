import type { ReactNode } from 'react';

interface PhoneFrameProps {
  children: ReactNode;
  /** 'dark' for TikTok/etc, 'light' for XHS/etc. Default: dark */
  variant?: 'dark' | 'light';
}

export function PhoneFrame({ children, variant = 'dark' }: PhoneFrameProps) {
  const isDark = variant === 'dark';
  const fg = isDark ? '#fff' : '#000';
  const bg = isDark ? '#000' : '#fff';
  const indicatorBg = isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.15)';

  return (
    <div
      className="mx-auto rounded-[32px] overflow-hidden"
      style={{
        width: '320px',
        border: '6px solid var(--muted)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.25)',
      }}
    >
      {/* Status bar */}
      <div
        className="flex items-center justify-between px-6 py-1.5"
        style={{ background: bg }}
      >
        <span className="text-[12px] font-semibold" style={{ color: fg }}>9:41</span>
        <div className="flex items-center gap-1.5">
          {/* Signal */}
          <svg className="h-3 w-3" viewBox="0 0 24 24" fill={fg}>
            <rect x="1" y="14" width="4" height="8" rx="1" />
            <rect x="7" y="10" width="4" height="12" rx="1" />
            <rect x="13" y="6" width="4" height="16" rx="1" />
            <rect x="19" y="2" width="4" height="20" rx="1" />
          </svg>
          {/* 5G */}
          <span className="text-[10px] font-bold" style={{ color: fg }}>5G</span>
          {/* Battery */}
          <svg className="h-3 w-5" viewBox="0 0 28 14" fill="none">
            <rect x="0.5" y="0.5" width="23" height="13" rx="2" stroke={fg} strokeWidth="1" />
            <rect x="2" y="2" width="18" height="10" rx="1" fill={fg} />
            <rect x="25" y="4" width="3" height="6" rx="1" fill={fg} />
          </svg>
        </div>
      </div>

      {/* Content */}
      <div className="overflow-y-auto" style={{ maxHeight: '540px', background: bg }}>
        {children}
      </div>

      {/* Home indicator */}
      <div className="flex items-center justify-center py-2" style={{ background: bg }}>
        <div className="h-1 w-28 rounded-full" style={{ background: indicatorBg }} />
      </div>
    </div>
  );
}
