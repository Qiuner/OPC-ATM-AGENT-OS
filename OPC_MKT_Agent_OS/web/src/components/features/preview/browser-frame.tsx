'use client';

import type { ReactNode } from 'react';

interface BrowserFrameProps {
  url: string;
  children: ReactNode;
}

export function BrowserFrame({ url, children }: BrowserFrameProps) {
  return (
    <div
      className="mx-auto rounded-xl overflow-hidden"
      style={{
        maxWidth: '520px',
        background: '#0a0a0f',
        border: '1px solid rgba(255,255,255,0.08)',
        boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
      }}
    >
      {/* Title bar */}
      <div
        className="flex items-center gap-2 px-4 py-2.5"
        style={{
          background: 'rgba(255,255,255,0.03)',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        {/* Traffic lights */}
        <div className="flex gap-1.5">
          <div className="h-2.5 w-2.5 rounded-full" style={{ background: '#ff5f57' }} />
          <div className="h-2.5 w-2.5 rounded-full" style={{ background: '#febc2e' }} />
          <div className="h-2.5 w-2.5 rounded-full" style={{ background: '#28c840' }} />
        </div>

        {/* URL bar */}
        <div
          className="ml-2 flex-1 rounded-md px-3 py-1 text-[11px]"
          style={{
            background: 'rgba(255,255,255,0.04)',
            color: 'rgba(255,255,255,0.3)',
          }}
        >
          {url}
        </div>
      </div>

      {/* Content */}
      <div className="overflow-y-auto" style={{ maxHeight: '500px' }}>
        {children}
      </div>
    </div>
  );
}
