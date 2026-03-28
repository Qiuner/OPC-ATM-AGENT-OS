'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import {
  LayoutDashboard,
  Database,
  CheckCircle,
  Send,
  BarChart3,
  Pen,
  Zap,
  Settings,
  ChevronLeft,
  Search,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { SettingsPanel } from '@/components/features/settings-panel';
import type { LucideIcon } from 'lucide-react';

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  shortcut?: string;
  badge?: number;
  badgeText?: string;
  badgeColor?: string;
}

const mainNav: NavItem[] = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard, shortcut: '1' },
  { href: '/team-studio', label: 'Team Studio', icon: Zap, shortcut: '2', badgeText: 'LIVE', badgeColor: '#22d3ee' },
  { href: '/publishing', label: 'Publishing', icon: Send, shortcut: '3' },
  { href: '/approval', label: 'Approval', icon: CheckCircle, shortcut: '4', badge: 3 },
];

const toolsNav: NavItem[] = [
  { href: '/context-vault', label: 'Context Vault', icon: Database, shortcut: '5' },
  { href: '/creatorflow', label: 'CreatorFlow', icon: Pen, shortcut: '6', badgeText: 'LIVE', badgeColor: '#22d3ee' },
  { href: '/analytics', label: 'Analytics', icon: BarChart3, shortcut: '7' },
];

function NavSection({ label, items, pathname, collapsed }: {
  label: string;
  items: NavItem[];
  pathname: string;
  collapsed: boolean;
}) {
  return (
    <div className="space-y-0.5">
      {!collapsed && (
        <div className="px-3 pt-4 pb-1.5">
          <span className="text-[10px] font-semibold uppercase tracking-[0.15em]"
            style={{ color: 'rgba(255,255,255,0.2)' }}
          >
            {label}
          </span>
        </div>
      )}
      {collapsed && <div className="pt-3" />}
      {items.map((item) => {
        const isActive = pathname === item.href ||
          (item.href !== '/' && pathname.startsWith(item.href));

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'group relative flex items-center gap-3 rounded-lg mx-2 px-3 py-2 text-[13px] font-medium transition-all duration-150',
              collapsed && 'justify-center px-0',
              isActive
                ? 'text-white'
                : 'text-[rgba(255,255,255,0.45)] hover:text-[rgba(255,255,255,0.8)]'
            )}
            style={isActive ? {
              background: 'rgba(255,255,255,0.06)',
            } : {}}
            title={collapsed ? item.label : undefined}
          >
            {/* Active indicator bar */}
            {isActive && (
              <div
                className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-4 rounded-r-full"
                style={{ background: '#a78bfa' }}
              />
            )}

            <item.icon className={cn(
              'h-[17px] w-[17px] shrink-0 transition-colors duration-150',
              isActive ? 'text-[#a78bfa]' : 'text-[rgba(255,255,255,0.35)] group-hover:text-[rgba(255,255,255,0.6)]'
            )} />

            {!collapsed && (
              <>
                <span className="flex-1 truncate">{item.label}</span>

                {item.badge ? (
                  <span className="flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1 text-[10px] font-semibold"
                    style={{ background: 'rgba(251,191,36,0.12)', color: '#fbbf24' }}
                  >
                    {item.badge}
                  </span>
                ) : item.badgeText ? (
                  <span className="flex h-[18px] items-center rounded-full px-1.5 text-[9px] font-bold tracking-wider"
                    style={{
                      background: `${item.badgeColor ?? '#22d3ee'}12`,
                      color: item.badgeColor ?? '#22d3ee',
                    }}
                  >
                    {item.badgeText}
                  </span>
                ) : item.shortcut ? (
                  <span className="text-[10px] font-mono opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                    style={{ color: 'rgba(255,255,255,0.2)' }}
                  >
                    ⌘{item.shortcut}
                  </span>
                ) : null}
              </>
            )}

            {/* Hover background */}
            {!isActive && (
              <div className="absolute inset-0 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-150 -z-10"
                style={{ background: 'rgba(255,255,255,0.03)' }}
              />
            )}
          </Link>
        );
      })}
    </div>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={cn(
        'flex h-screen flex-col shrink-0 transition-all duration-300 ease-out relative',
        collapsed ? 'w-16' : 'w-[220px]'
      )}
      style={{
        background: '#060609',
        borderRight: '1px solid rgba(255,255,255,0.06)',
      }}
    >
      {/* Logo area */}
      <div className={cn(
        'flex items-center shrink-0 h-14',
        collapsed ? 'justify-center px-2' : 'px-4'
      )}
        style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}
      >
        {collapsed ? (
          <div className="flex h-8 w-8 items-center justify-center rounded-lg"
            style={{ background: 'linear-gradient(135deg, #a78bfa, #818cf8)' }}
          >
            <span className="text-[13px] font-bold text-white">O</span>
          </div>
        ) : (
          <div className="flex items-center gap-2.5 flex-1">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg"
              style={{ background: 'linear-gradient(135deg, #a78bfa, #818cf8)' }}
            >
              <span className="text-[12px] font-bold text-white">O</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[13px] font-semibold text-white leading-tight tracking-tight">
                OPC MKT
              </span>
              <span className="text-[9px] font-medium tracking-[0.08em]"
                style={{ color: 'rgba(255,255,255,0.25)' }}
              >
                AGENT OS
              </span>
            </div>
          </div>
        )}

        {!collapsed && (
          <button
            onClick={() => setCollapsed(true)}
            className="flex h-6 w-6 items-center justify-center rounded-md opacity-0 hover:opacity-100 focus:opacity-100 transition-opacity"
            style={{ color: 'rgba(255,255,255,0.3)' }}
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Quick search */}
      {!collapsed && (
        <div className="px-3 pt-3">
          <button
            className="flex items-center gap-2 w-full rounded-lg px-3 py-[7px] text-[12px] transition-all duration-150"
            style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.06)',
              color: 'rgba(255,255,255,0.25)',
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.1)';
              (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.04)';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.06)';
              (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.03)';
            }}
          >
            <Search className="h-3.5 w-3.5" />
            <span className="flex-1 text-left">Search...</span>
            <kbd className="text-[10px] font-mono px-1 py-0.5 rounded"
              style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.3)' }}
            >
              ⌘K
            </kbd>
          </button>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden py-1">
        <NavSection label="Workspace" items={mainNav} pathname={pathname} collapsed={collapsed} />
        <NavSection label="Tools" items={toolsNav} pathname={pathname} collapsed={collapsed} />
      </nav>

      {/* Bottom section */}
      <div className="shrink-0 px-2 py-3 space-y-0.5"
        style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}
      >
        {/* Settings */}
        {collapsed ? (
          <div className="flex justify-center">
            <button
              className="flex h-9 w-9 items-center justify-center rounded-lg transition-colors"
              style={{ color: 'rgba(255,255,255,0.35)' }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.04)'}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
            >
              <Settings className="h-[17px] w-[17px]" />
            </button>
          </div>
        ) : (
          <SettingsPanel />
        )}

        {/* User profile */}
        <div className={cn(
          'flex items-center gap-2.5 rounded-lg transition-colors cursor-default',
          collapsed ? 'justify-center py-2' : 'px-3 py-2'
        )}
          onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.03)'}
          onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
        >
          <Avatar className="h-7 w-7">
            <AvatarFallback className="text-[11px] font-semibold"
              style={{ background: 'rgba(167,139,250,0.12)', color: '#a78bfa' }}
            >
              J
            </AvatarFallback>
          </Avatar>
          {!collapsed && (
            <div className="flex flex-col min-w-0">
              <span className="text-[12px] font-medium text-white truncate">Jayden</span>
              <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.25)' }}>Owner</span>
            </div>
          )}
        </div>

        {/* Expand button when collapsed */}
        {collapsed && (
          <div className="flex justify-center pt-1">
            <button
              onClick={() => setCollapsed(false)}
              className="flex h-6 w-6 items-center justify-center rounded-md transition-all"
              style={{ color: 'rgba(255,255,255,0.25)' }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.6)'}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.25)'}
            >
              <ChevronLeft className="h-3.5 w-3.5 rotate-180" />
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
