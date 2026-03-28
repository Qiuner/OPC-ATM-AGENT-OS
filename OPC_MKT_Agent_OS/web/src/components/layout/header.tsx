'use client';

import { usePathname } from 'next/navigation';
import { ChevronRight } from 'lucide-react';

const pageMeta: Record<string, { title: string; section?: string; desc?: string }> = {
  '/': { title: 'Dashboard', desc: 'Overview & metrics' },
  '/context-vault': { title: 'Context Vault', section: 'Tools', desc: 'Brand context & assets' },
  '/approval': { title: 'Approval', section: 'Workspace', desc: 'Review & approve content' },
  '/publishing': { title: 'Publishing', section: 'Workspace', desc: 'Content distribution' },
  '/team-studio': { title: 'Team Studio', section: 'Workspace', desc: 'Multi-agent collaboration' },
  '/creatorflow': { title: 'CreatorFlow', section: 'Tools', desc: 'Content creation pipeline' },
  '/analytics': { title: 'Analytics', section: 'Tools', desc: 'Performance insights' },
};

export function Header() {
  const pathname = usePathname();
  const meta = pageMeta[pathname] ?? { title: 'OPC MKT', desc: '' };

  return (
    <header
      className="h-12 px-6 flex items-center gap-4 shrink-0 relative z-20"
      style={{
        background: 'rgba(3,3,5,0.75)',
        backdropFilter: 'blur(20px) saturate(1.2)',
        WebkitBackdropFilter: 'blur(20px) saturate(1.2)',
        borderBottom: '1px solid rgba(255,255,255,0.05)',
      }}
    >
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5">
        {meta.section && (
          <>
            <span className="text-[12px]" style={{ color: 'rgba(255,255,255,0.25)' }}>
              {meta.section}
            </span>
            <ChevronRight className="h-3 w-3" style={{ color: 'rgba(255,255,255,0.15)' }} />
          </>
        )}
        <h1 className="text-[13px] font-semibold text-white tracking-tight">
          {meta.title}
        </h1>
        {meta.desc && (
          <>
            <span className="mx-2 h-3.5 w-px" style={{ background: 'rgba(255,255,255,0.08)' }} />
            <span className="text-[11px]" style={{ color: 'rgba(255,255,255,0.25)' }}>
              {meta.desc}
            </span>
          </>
        )}
      </div>

      {/* Portal target for page-specific actions */}
      <div id="header-actions" className="flex-1 flex items-center justify-end gap-2" />

      {/* System status */}
      <div className="flex items-center gap-2 shrink-0">
        <div className="flex items-center gap-1.5 rounded-md px-2 py-1"
          style={{ background: 'rgba(255,255,255,0.03)' }}
        >
          <div className="h-1.5 w-1.5 rounded-full"
            style={{ background: '#22c55e', boxShadow: '0 0 6px rgba(34,197,94,0.4)' }}
          />
          <span className="text-[10px] font-medium" style={{ color: 'rgba(255,255,255,0.35)' }}>
            Online
          </span>
        </div>
      </div>
    </header>
  );
}
