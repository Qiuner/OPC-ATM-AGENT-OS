import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  Database,
  CheckCircle,
  Send,
  BarChart3,
  Pen,
  Zap,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { cn } from '@/lib/utils'
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
  badge?: number
}

const navItems: NavItem[] = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/team-studio', label: 'Team Studio', icon: Zap },
  { href: '/context-vault', label: 'Context Vault', icon: Database },
  { href: '/approval', label: 'Approval Center', icon: CheckCircle, badge: 3 },
  { href: '/publishing', label: 'Publishing Hub', icon: Send },
  { href: '/creatorflow', label: 'CreatorFlow', icon: Pen },
  { href: '/analytics', label: 'Analytics', icon: BarChart3 },
]

export function Sidebar(): React.JSX.Element {
  const { pathname } = useLocation()
  const [collapsed, setCollapsed] = useState(false)

  return (
    <aside
      className="flex h-screen flex-col shrink-0 transition-all duration-300 ease-in-out bg-sidebar border-r border-sidebar-border relative z-40"
      style={{
        width: collapsed ? 72 : 260,
      }}
    >
      {/* 品牌区：模仿 ClawX 的衬线体设计 */}
      <div
        className="flex items-center titlebar-drag shrink-0 pt-10 px-6 pb-6"
        style={{
          justifyContent: collapsed ? 'center' : 'flex-start',
        }}
      >
        <div className="flex items-center gap-3 titlebar-no-drag">
          <div
            className="flex h-9 w-9 items-center justify-center rounded-xl shrink-0 shadow-sm"
            style={{ background: 'var(--primary)' }}
          >
            <span className="text-base font-bold text-white">O</span>
          </div>
          {!collapsed && (
            <span className="text-xl font-serif font-bold text-foreground tracking-tight whitespace-nowrap opacity-100 transition-all duration-300">
              OPC MKT
            </span>
          )}
        </div>
      </div>

      {/* 导航项：增加间距，提升圆角至 16px (2xl) */}
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
                  {item.badge && item.badge > 0 && (
                    <span
                      className="flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-bold shadow-sm"
                      style={{ background: 'var(--primary)', color: 'white' }}
                    >
                      {item.badge}
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

      {/* 底部区：保持极简 */}
      <div
        className={cn('py-6 mt-auto space-y-4 border-t border-sidebar-border/50 px-4', collapsed ? 'px-2' : 'px-5')}
      >
        <div
          className={cn(
            'flex items-center rounded-2xl cursor-pointer hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors',
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
            <div className="flex flex-col min-w-0">
              <span className="text-[14px] font-bold text-foreground truncate">Jayden</span>
              <span className="text-[11px] text-muted-foreground font-medium">
                Admin
              </span>
            </div>
          )}
        </div>

        <button
          onClick={() => setCollapsed((c) => !c)}
          className={cn(
            "flex items-center gap-2 w-full text-muted-foreground/60 hover:text-foreground transition-colors py-2",
            collapsed ? "justify-center" : "px-2"
          )}
        >
          {collapsed ? (
            <ChevronRight className="h-5 w-5" />
          ) : (
            <>
              <ChevronLeft className="h-5 w-5" />
              <span className="text-xs font-bold uppercase tracking-widest">Collapse</span>
            </>
          )}
        </button>
      </div>
    </aside>
  )
}
