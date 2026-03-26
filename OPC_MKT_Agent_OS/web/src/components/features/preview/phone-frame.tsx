'use client';

import type { ReactNode } from 'react';

interface PhoneFrameProps {
  children: ReactNode;
}

export function PhoneFrame({ children }: PhoneFrameProps) {
  return (
    <div
      className="relative mx-auto overflow-hidden rounded-[32px]"
      style={{
        width: '375px',
        maxHeight: '667px',
        background: '#000',
        border: '8px solid #1a1a1a',
        boxShadow:
          '0 0 0 2px rgba(255,255,255,0.06), 0 20px 60px rgba(0,0,0,0.6)',
      }}
    >
      {/* Status bar */}
      <div
        className="flex items-center justify-between px-6 py-1.5 text-[11px] font-semibold"
        style={{ color: 'rgba(255,255,255,0.6)' }}
      >
        <span>9:41</span>
        <div className="flex items-center gap-1">
          <svg
            className="h-3 w-3"
            viewBox="0 0 24 24"
            fill="currentColor"
          >
            <path d="M1 9l2 2c4.97-4.97 13.03-4.97 18 0l2-2C16.93 2.93 7.08 2.93 1 9zm8 8l3 3 3-3c-1.65-1.66-4.34-1.66-6 0zm-4-4l2 2c2.76-2.76 7.24-2.76 10 0l2-2C15.14 9.14 8.87 9.14 5 13z" />
          </svg>
          <span>5G</span>
          <svg
            className="h-3 w-3"
            viewBox="0 0 24 24"
            fill="currentColor"
          >
            <path d="M15.67 4H14V2h-4v2H8.33C7.6 4 7 4.6 7 5.33v15.33C7 21.4 7.6 22 8.33 22h7.33c.74 0 1.34-.6 1.34-1.33V5.33C17 4.6 16.4 4 15.67 4z" />
          </svg>
        </div>
      </div>

      {/* Content area */}
      <div
        className="overflow-y-auto"
        style={{ maxHeight: 'calc(667px - 32px - 20px)' }}
      >
        {children}
      </div>

      {/* Home indicator */}
      <div className="flex justify-center py-2">
        <div
          className="h-1 w-32 rounded-full"
          style={{ background: 'rgba(255,255,255,0.2)' }}
        />
      </div>
    </div>
  );
}
