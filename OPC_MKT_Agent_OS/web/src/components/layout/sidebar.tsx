'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Database,
  CheckCircle,
  Send,
  BarChart3,
  Pen,
  Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { SettingsPanel } from '@/components/features/settings-panel';
import type { LucideIcon } from 'lucide-react';

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  badge?: number;
  badgeText?: string;
  badgeColor?: string;
}

const navItems: NavItem[] = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/team-studio', label: 'Team Studio', icon: Zap, badgeText: 'LIVE', badgeColor: '#22d3ee' },
  { href: '/context-vault', label: 'Context Vault', icon: Database },
  { href: '/approval', label: 'Approval Center', icon: CheckCircle, badge: 3 },
  { href: '/publishing', label: 'Publishing Hub', icon: Send },
  { href: '/creatorflow', label: 'CreatorFlow', icon: Pen, badgeText: 'LIVE', badgeColor: '#22d3ee' },
  { href: '/analytics', label: 'Analytics', icon: BarChart3 },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex h-screen w-60 flex-col shrink-0"
      style={{
        background: '#050508',
        borderRight: '1px solid rgba(255,255,255,0.06)',
      }}
    >
      {/* Logo */}
      <div className="flex h-16 items-center px-5"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
      >
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg"
            style={{ background: 'linear-gradient(135deg, #a78bfa, #22d3ee)' }}
          >
            <span className="text-sm font-bold text-white">O</span>
          </div>
          <span className="text-[15px] font-semibold text-white tracking-tight">
            OPC MKT
          </span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-0.5 px-3 py-4">
        {navItems.map((item) => {
          // Active state: exact match, or for /team-studio exact match only (not v3)
          const isActive = pathname === item.href || (item.href === '/team-studio' && pathname.startsWith('/team-studio'));

          return (
            <div key={item.href}>
              <Link
                href={item.href}
                data-nav={item.href === '/' ? 'dashboard' : item.href.slice(1)}
                className={cn(
                  'flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium transition-all duration-200',
                  isActive
                    ? 'text-white'
                    : 'text-[rgba(255,255,255,0.4)] hover:text-[rgba(255,255,255,0.7)]'
                )}
                style={isActive ? {
                  background: 'rgba(167,139,250,0.1)',
                  boxShadow: 'inset 0 0 0 1px rgba(167,139,250,0.15)',
                } : {}}
                onMouseEnter={e => {
                  if (!isActive) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.03)';
                }}
                onMouseLeave={e => {
                  if (!isActive) (e.currentTarget as HTMLElement).style.background = 'transparent';
                }}
              >
                <item.icon className={cn('h-[18px] w-[18px]', isActive ? 'text-[#a78bfa]' : '')} />
                <span className="flex-1">{item.label}</span>
                {item.badge && (
                  <span className="flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-semibold"
                    style={{ background: 'rgba(251,191,36,0.12)', color: '#fbbf24' }}
                  >
                    {item.badge}
                  </span>
                )}
                {item.badgeText && (
                  <span className="flex h-5 items-center justify-center rounded-full px-1.5 text-[10px] font-bold tracking-wider"
                    style={{
                      background: `${item.badgeColor ?? '#22d3ee'}15`,
                      color: item.badgeColor ?? '#22d3ee',
                    }}
                  >
                    {item.badgeText}
                  </span>
                )}
              </Link>
            </div>
          );
        })}
      </nav>

      {/* Settings + User */}
      <div className="px-3 py-4 space-y-1"
        style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
      >
        <SettingsPanel />
        <div className="flex items-center gap-3 rounded-xl px-3 py-2">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="text-sm font-medium"
              style={{ background: 'rgba(167,139,250,0.15)', color: '#a78bfa' }}
            >
              J
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col">
            <span className="text-sm font-medium text-white">Jayden</span>
            <span className="text-[11px]" style={{ color: 'rgba(255,255,255,0.35)' }}>Owner</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
