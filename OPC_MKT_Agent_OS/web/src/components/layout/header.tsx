'use client';

import { usePathname } from 'next/navigation';

const pageTitles: Record<string, string> = {
  '/': 'Dashboard',
  '/context-vault': 'Context Vault',
  '/campaigns': 'Campaigns',
  '/task-board': 'Task Board',
  '/approval': 'Approval Center',
  '/publishing': 'Publishing Hub',
  '/team-studio': 'Team Studio',
  '/analytics': 'Analytics',
};

export function Header() {
  const pathname = usePathname();
  const title = pageTitles[pathname] ?? 'OPC MKT';

  return (
    <header
      className="h-14 px-6 flex items-center gap-4 shrink-0"
      style={{
        background: 'rgba(3,3,5,0.6)',
        backdropFilter: 'blur(24px) saturate(1.2)',
        WebkitBackdropFilter: 'blur(24px) saturate(1.2)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
      }}
    >
      <h1 className="text-[15px] font-semibold text-white tracking-tight shrink-0">
        {title}
      </h1>

      {/* Portal target — pages can inject controls here */}
      <div id="header-actions" className="flex-1 flex items-center justify-end gap-3" />

      <div className="flex items-center gap-3 shrink-0">
        <span className="text-[11px] font-medium tracking-wider"
          style={{ color: 'rgba(255,255,255,0.3)' }}
        >
          OPC MKT AGENT OS
        </span>
        <div className="h-2 w-2 rounded-full animate-pulse"
          style={{ background: '#a78bfa', boxShadow: '0 0 8px rgba(167,139,250,0.5)' }}
        />
      </div>
    </header>
  );
}
