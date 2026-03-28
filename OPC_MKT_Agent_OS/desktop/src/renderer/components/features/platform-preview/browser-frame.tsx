import type { ReactNode } from 'react';

interface BrowserFrameProps {
  url: string;
  children: ReactNode;
}

export function BrowserFrame({ url, children }: BrowserFrameProps) {
  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{
        border: '1px solid var(--border)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
      }}
    >
      {/* Title bar */}
      <div
        className="flex items-center gap-2 px-4 py-2.5"
        style={{
          background: 'var(--muted)',
          borderBottom: '1px solid var(--border)',
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
            background: 'var(--background)',
            color: 'var(--muted-foreground)',
          }}
        >
          {url}
        </div>
      </div>

      {/* Content */}
      <div className="overflow-y-auto" style={{ maxHeight: '420px' }}>
        {children}
      </div>
    </div>
  );
}
