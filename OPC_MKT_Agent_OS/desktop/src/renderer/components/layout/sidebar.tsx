import { useState, useEffect, useCallback, useRef } from 'react'
import { Link, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  Database,
  CheckCircle,
  Send,
  BarChart3,
  Pen,
  Zap,
  Settings,
  FileCode2,
  PanelLeftClose,
  PanelLeftOpen,
  Share2,
} from 'lucide-react'
import logoImg from '@/assets/logo.png'
import { cn } from '@/lib/utils'
import { getApi } from '@/lib/ipc'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'

interface NavItem {
  href: string
  label: string
  icon: any
  badgeKey?: 'review' | 'pending'
}

const navItems: NavItem[] = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/team-studio', label: 'Team Studio', icon: Zap },
  { href: '/context-vault', label: 'Context Vault', icon: Database },
  { href: '/approval', label: 'Approval Center', icon: CheckCircle, badgeKey: 'review' },
  { href: '/publishing', label: 'Publishing Hub', icon: Send, badgeKey: 'pending' },
  { href: '/creatorflow', label: 'CreatorFlow', icon: Pen },
  { href: '/analytics', label: 'Analytics', icon: BarChart3 },
]

export function Sidebar(): React.JSX.Element {
  const { pathname } = useLocation()
  const [collapsed, setCollapsed] = useState(false)
  const [badges, setBadges] = useState<Record<string, number>>({})
  const [profileOpen, setProfileOpen] = useState(false)
  const profileRef = useRef<HTMLDivElement>(null)

  const fetchBadges = useCallback(async () => {
    const api = getApi()
    if (!api) return
    try {
      const res = await api.contents.list()
      if (res.success && res.data) {
        const contents = res.data as { status: string }[]
        setBadges({
          review: contents.filter(c => c.status === 'review').length,
          pending: contents.filter(c => c.status === 'approved').length,
        })
      }
    } catch { /* ignore */ }
  }, [])

  useEffect(() => {
    fetchBadges()
    const timer = setInterval(fetchBadges, 5000)
    return () => clearInterval(timer)
  }, [fetchBadges])

  // Close profile popover on outside click
  useEffect(() => {
    if (!profileOpen) return
    const handler = (e: MouseEvent): void => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [profileOpen])

  return (
    <aside
      className="flex h-screen flex-col shrink-0 transition-all duration-300 ease-in-out bg-sidebar border-r border-sidebar-border relative z-40"
      style={{
        width: collapsed ? 72 : 260,
      }}
    >
      {/* 品牌区 + 折叠按钮 */}
      <div
        className="flex items-center titlebar-drag shrink-0 pt-10 px-6 pb-6"
        style={{
          justifyContent: collapsed ? 'center' : 'flex-start',
        }}
      >
        {collapsed ? (
          <div className="flex flex-col items-center gap-2 titlebar-no-drag">
            <img src={logoImg} alt="OPC MKT" className="h-9 w-9 rounded-xl shrink-0 shadow-sm" />
            <button
              onClick={() => setCollapsed(false)}
              className="flex items-center justify-center h-7 w-7 rounded-lg text-muted-foreground hover:text-foreground transition-colors"
              title="展���侧边栏"
            >
              <PanelLeftOpen className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between w-full titlebar-no-drag">
            <div className="flex items-center gap-3">
              <img src={logoImg} alt="OPC MKT" className="h-9 w-9 rounded-xl shrink-0 shadow-sm" />
              <span className="text-xl font-serif font-bold text-foreground tracking-tight whitespace-nowrap">
                OPC MKT
              </span>
            </div>
            <button
              onClick={() => setCollapsed(true)}
              className="flex items-center justify-center h-7 w-7 rounded-lg text-muted-foreground hover:text-foreground transition-colors"
              title="折叠侧边栏"
            >
              <PanelLeftClose className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      {/* 导航项 */}
      <nav className={cn('flex-1 space-y-1.5 py-2 px-4 no-scrollbar overflow-y-auto', collapsed ? 'px-2' : 'px-4')}>
        {navItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href === '/team-studio' && pathname.startsWith('/team-studio'))

          const linkElement = (
            <Link
              to={item.href}
              className={cn(
                'flex items-center rounded-2xl text-[14px] font-medium transition-all duration-300 group',
                collapsed ? 'justify-center h-12 w-12 mx-auto' : 'gap-3.5 px-4 py-3',
                isActive
                  ? 'text-foreground bg-sidebar-accent shadow-[0_1px_2px_rgba(0,0,0,0.02)]'
                  : 'text-muted-foreground hover:text-foreground hover:bg-black/[0.03] dark:hover:bg-white/[0.03]'
              )}
            >
              <item.icon
                className={cn(
                  'shrink-0 transition-transform duration-300 group-hover:scale-110',
                  collapsed ? 'h-6 w-6' : 'h-[20px] w-[20px]',
                  isActive ? 'text-primary' : ''
                )}
              />
              {!collapsed && (
                <>
                  <span className="flex-1 whitespace-nowrap transition-opacity duration-300 font-medium">
                    {item.label}
                  </span>
                  {item.badgeKey && (badges[item.badgeKey] ?? 0) > 0 && (
                    <span
                      className="flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-bold shadow-sm"
                      style={{ background: 'var(--primary)', color: 'white' }}
                    >
                      {badges[item.badgeKey]}
                    </span>
                  )}
                </>
              )}
            </Link>
          )

          if (collapsed) {
            return (
              <Tooltip key={item.href} delayDuration={0}>
                <TooltipTrigger asChild>{linkElement}</TooltipTrigger>
                <TooltipContent
                  side="right"
                  sideOffset={12}
                  className="text-xs font-semibold py-2 px-3 rounded-lg border-border"
                >
                  {item.label}
                </TooltipContent>
              </Tooltip>
            )
          }

          return <div key={item.href}>{linkElement}</div>
        })}
      </nav>

      {/* 底部区：Skills → Settings → Profile */}
      <div
        className={cn('py-4 mt-auto space-y-1.5 border-t border-sidebar-border/50 px-4', collapsed ? 'px-2' : 'px-4')}
      >
        {/* Skills */}
        {(() => {
          const isSkillsActive = pathname === '/skills'
          const skillsLink = (
            <Link
              to="/skills"
              className={cn(
                'flex items-center rounded-2xl text-[14px] font-medium transition-all duration-300 group',
                collapsed ? 'justify-center h-12 w-12 mx-auto' : 'gap-3.5 px-4 py-3',
                isSkillsActive
                  ? 'text-foreground bg-sidebar-accent shadow-[0_1px_2px_rgba(0,0,0,0.02)]'
                  : 'text-muted-foreground hover:text-foreground hover:bg-black/[0.03] dark:hover:bg-white/[0.03]'
              )}
            >
              <FileCode2
                className={cn(
                  'shrink-0 transition-transform duration-300 group-hover:scale-110',
                  collapsed ? 'h-6 w-6' : 'h-[20px] w-[20px]',
                  isSkillsActive ? 'text-primary' : ''
                )}
              />
              {!collapsed && (
                <span className="flex-1 whitespace-nowrap transition-opacity duration-300 font-medium">
                  Skills
                </span>
              )}
            </Link>
          )

          return collapsed ? (
            <Tooltip delayDuration={0}>
              <TooltipTrigger asChild>{skillsLink}</TooltipTrigger>
              <TooltipContent
                side="right"
                sideOffset={12}
                className="text-xs font-semibold py-2 px-3 rounded-lg border-border"
              >
                Skills
              </TooltipContent>
            </Tooltip>
          ) : skillsLink
        })()}

        {/* Settings */}
        {(() => {
          const isSettingsActive = pathname === '/settings'
          const settingsLink = (
            <Link
              to="/settings"
              className={cn(
                'flex items-center rounded-2xl text-[14px] font-medium transition-all duration-300 group',
                collapsed ? 'justify-center h-12 w-12 mx-auto' : 'gap-3.5 px-4 py-3',
                isSettingsActive
                  ? 'text-foreground bg-sidebar-accent shadow-[0_1px_2px_rgba(0,0,0,0.02)]'
                  : 'text-muted-foreground hover:text-foreground hover:bg-black/[0.03] dark:hover:bg-white/[0.03]'
              )}
            >
              <Settings
                className={cn(
                  'shrink-0 transition-transform duration-300 group-hover:scale-110',
                  collapsed ? 'h-6 w-6' : 'h-[20px] w-[20px]',
                  isSettingsActive ? 'text-primary' : ''
                )}
              />
              {!collapsed && (
                <span className="flex-1 whitespace-nowrap transition-opacity duration-300 font-medium">
                  Settings
                </span>
              )}
            </Link>
          )

          return collapsed ? (
            <Tooltip delayDuration={0}>
              <TooltipTrigger asChild>{settingsLink}</TooltipTrigger>
              <TooltipContent
                side="right"
                sideOffset={12}
                className="text-xs font-semibold py-2 px-3 rounded-lg border-border"
              >
                Settings
              </TooltipContent>
            </Tooltip>
          ) : settingsLink
        })()}

        {/* Jayden 个人资料按钮 + Popover */}
        <div className="relative" ref={profileRef}>
          <button
            onClick={() => setProfileOpen((v) => !v)}
            className={cn(
              'flex items-center w-full rounded-2xl cursor-pointer hover:bg-black/[0.03] dark:hover:bg-white/[0.03] transition-colors',
              collapsed ? 'justify-center py-2' : 'gap-3 px-2 py-2'
            )}
          >
            <Avatar className="h-9 w-9 shrink-0 border border-sidebar-border shadow-sm">
              <AvatarFallback
                className="text-sm font-bold bg-sidebar-accent text-primary"
              >
                J
              </AvatarFallback>
            </Avatar>
            {!collapsed && (
              <div className="flex flex-col min-w-0 text-left">
                <span className="text-[14px] font-bold text-foreground truncate">Jayden</span>
                <span className="text-[11px] text-muted-foreground font-medium">
                  Admin
                </span>
              </div>
            )}
          </button>

          {/* Profile Popover */}
          {profileOpen && (
            <div
              className={cn(
                'absolute z-50 rounded-2xl p-4 space-y-3',
                collapsed ? 'left-full ml-2 bottom-0' : 'left-0 right-0 bottom-full mb-2'
              )}
              style={{
                background: 'var(--card)',
                border: '1px solid var(--border)',
                boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
                minWidth: 220,
              }}
            >
              {/* User info */}
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10 shrink-0 border border-sidebar-border">
                  <AvatarFallback className="text-sm font-bold bg-sidebar-accent text-primary">
                    J
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-foreground">Jayden</div>
                  <div className="text-xs text-muted-foreground truncate">jayden@opc.com</div>
                </div>
              </div>

              {/* Divider */}
              <div className="border-t border-border" />

              {/* Actions */}
              <div className="flex items-center justify-between">
                <button
                  className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1.5 rounded-lg hover:bg-black/[0.03] dark:hover:bg-white/[0.03]"
                  title="分���落地页"
                >
                  <Share2 className="h-3.5 w-3.5" />
                  <span className="font-medium">Share</span>
                </button>
                <span className="text-[10px] text-muted-foreground/60 font-mono">
                  v0.1.0
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </aside>
  )
}
