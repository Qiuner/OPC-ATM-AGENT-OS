import { useState, useEffect, useCallback } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from '@/components/ui/sheet'
import {
  Cpu,
  Search,
  RefreshCw,
  FileCode2,
  FolderOpen,
  Copy,
  ExternalLink,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { getApi } from '@/lib/ipc'

interface Skill {
  id: string
  name: string
  description: string
  version: string
  source: 'built-in' | 'personal' | 'marketplace'
  filePath: string
  enabled: boolean
  lastUpdated: string
  updatedBy: string
}

type SourceFilter = 'all' | 'built-in' | 'personal' | 'marketplace'

const SOURCE_LABEL: Record<Skill['source'], string> = {
  'built-in': '内置',
  personal: '个人',
  marketplace: '市场',
}

const SOURCE_COLOR: Record<Skill['source'], string> = {
  'built-in': 'rgba(167,139,250,0.15)',
  personal: 'rgba(34,211,238,0.12)',
  marketplace: 'rgba(251,191,36,0.12)',
}

const SOURCE_TEXT: Record<Skill['source'], string> = {
  'built-in': 'rgb(167,139,250)',
  personal: 'rgb(34,211,238)',
  marketplace: 'rgb(251,191,36)',
}

/* ── Skill Card ── */

function SkillCard({
  skill,
  isSelected,
  onSelect,
  onToggle,
}: {
  skill: Skill
  isSelected: boolean
  onSelect: (skill: Skill) => void
  onToggle: (id: string, enabled: boolean) => void
}) {
  return (
    <div
      onClick={() => onSelect(skill)}
      className={cn(
        'group flex items-start gap-4 rounded-xl px-5 py-4 transition-all duration-150 cursor-pointer',
        isSelected
          ? 'dark:bg-violet-500/10 bg-violet-500/5 ring-1 ring-violet-500/30'
          : skill.enabled
            ? 'dark:bg-white/[0.03] bg-black/[0.02] hover:dark:bg-white/[0.05] hover:bg-black/[0.04]'
            : 'bg-transparent opacity-50 hover:opacity-70',
      )}
      style={{ border: isSelected ? undefined : '1px solid var(--border)' }}
    >
      {/* Icon */}
      <div
        className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
        style={{ background: 'rgba(167,139,250,0.12)' }}
      >
        <FileCode2 className="h-4 w-4" style={{ color: 'rgb(167,139,250)' }} />
      </div>

      {/* Body */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-[13px] font-semibold text-foreground truncate">{skill.name}</span>
        </div>
        <p className="mt-0.5 text-[12px] leading-relaxed text-muted-foreground line-clamp-1">
          {skill.description || '—'}
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <span
            className="rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
            style={{
              background: SOURCE_COLOR[skill.source],
              color: SOURCE_TEXT[skill.source],
            }}
          >
            {SOURCE_LABEL[skill.source]}
          </span>
          <button
            className="font-mono text-[11px] truncate max-w-[220px] text-muted-foreground/40 hover:text-violet-400 hover:underline transition-colors"
            onClick={(e) => { e.stopPropagation(); getApi()?.skills.openFolder(skill.id) }}
            title="打开技能文件夹"
          >
            {skill.filePath}
          </button>
        </div>
      </div>

      {/* Toggle — stop propagation so click doesn't open detail */}
      <div className="mt-1 shrink-0" onClick={(e) => e.stopPropagation()}>
        <Switch
          checked={skill.enabled}
          onCheckedChange={(v) => onToggle(skill.id, v)}
          className="data-[state=checked]:bg-violet-500"
        />
      </div>
    </div>
  )
}

/* ── Skill Detail Panel ── */

function SkillDetailPanel({
  skill,
  onToggle,
  onClose,
}: {
  skill: Skill
  onToggle: (id: string, enabled: boolean) => void
  onClose: () => void
}) {
  const [copied, setCopied] = useState(false)

  const handleCopyPath = async () => {
    await navigator.clipboard.writeText(skill.filePath)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <Sheet open onOpenChange={(open) => { if (!open) onClose() }}>
      <SheetContent side="right" className="w-[400px] sm:max-w-[400px] overflow-y-auto">
        <SheetHeader className="items-center text-center pt-10 pb-6 px-6">
          {/* Large icon */}
          <div
            className="flex h-20 w-20 items-center justify-center rounded-2xl mb-5"
            style={{ background: 'rgba(167,139,250,0.12)' }}
          >
            <FileCode2 className="h-9 w-9" style={{ color: 'rgb(167,139,250)' }} />
          </div>

          {/* Name */}
          <SheetTitle className="text-2xl font-bold">{skill.name}</SheetTitle>

          {/* Version + Source badges */}
          <div className="flex items-center justify-center gap-2 mt-2">
            <Badge variant="outline" className="text-xs px-2.5 py-0.5 text-muted-foreground">
              v{skill.version}
            </Badge>
            <span
              className="rounded-md px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide"
              style={{
                background: SOURCE_COLOR[skill.source],
                color: SOURCE_TEXT[skill.source],
              }}
            >
              {SOURCE_LABEL[skill.source]}
            </span>
          </div>

          {/* Description */}
          <SheetDescription className="mt-5 text-sm leading-relaxed text-center px-4">
            {skill.description}
          </SheetDescription>
        </SheetHeader>

        {/* Source section */}
        <div className="px-6 py-4 space-y-5">
          <div>
            <h4 className="text-sm font-semibold text-muted-foreground mb-2">来源</h4>
            <div className="flex items-center gap-2">
              <div className="flex-1 min-w-0 rounded-lg border border-border px-3 py-2.5">
                <span className="font-mono text-xs text-muted-foreground truncate block">
                  {skill.filePath}
                </span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 shrink-0"
                onClick={handleCopyPath}
                title="复制路径"
              >
                {copied ? (
                  <span className="text-xs text-green-500">OK</span>
                ) : (
                  <Copy className="h-4 w-4 text-muted-foreground" />
                )}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 shrink-0"
                onClick={() => getApi()?.skills.openFolder(skill.id)}
                title="打开文件夹"
              >
                <ExternalLink className="h-4 w-4 text-muted-foreground" />
              </Button>
            </div>
          </div>

          {/* Metadata */}
          {(skill.lastUpdated || skill.updatedBy) && (
            <div>
              <h4 className="text-sm font-semibold text-muted-foreground mb-2">元数据</h4>
              <div className="rounded-lg border border-border px-4 py-3 space-y-2">
                {skill.lastUpdated && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground/60">最后更新</span>
                    <span className="text-xs text-muted-foreground">{skill.lastUpdated}</span>
                  </div>
                )}
                {skill.updatedBy && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground/60">更新者</span>
                    <span className="text-xs text-muted-foreground">{skill.updatedBy}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <SheetFooter className="px-6 pb-6 flex-row gap-3">
          <Button
            className="flex-1"
            variant={skill.enabled ? 'default' : 'outline'}
            onClick={() => onToggle(skill.id, !skill.enabled)}
          >
            {skill.enabled ? '禁用' : '启用'}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}

/* ── Main Page ── */

export function SkillsPage(): React.JSX.Element {
  const [skills, setSkills] = useState<Skill[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>('all')
  const [selectedSkill, setSelectedSkill] = useState<Skill | null>(null)

  const loadSkills = useCallback(async () => {
    setLoading(true)
    try {
      const api = getApi()
      if (api && typeof api.skills?.list === 'function') {
        const res = await api.skills.list()
        if (res.success && res.data) {
          setSkills((res.data as Skill[]).map((s: Skill) => ({ ...s, enabled: true })))
          return
        }
      }
      setSkills([])
    } catch {
      setSkills([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadSkills()
  }, [loadSkills])

  const handleToggle = (id: string, enabled: boolean) => {
    setSkills((prev) => prev.map((s) => (s.id === id ? { ...s, enabled } : s)))
    // Also update selectedSkill if it's the one being toggled
    setSelectedSkill((prev) => (prev?.id === id ? { ...prev, enabled } : prev))
  }

  // Source counts
  const sourceStats = {
    all: skills.length,
    'built-in': skills.filter((s) => s.source === 'built-in').length,
    personal: skills.filter((s) => s.source === 'personal').length,
    marketplace: skills.filter((s) => s.source === 'marketplace').length,
  }

  // Filter
  const filtered = skills.filter((s) => {
    const q = search.toLowerCase()
    const matchesSearch =
      q.length === 0 ||
      s.name.toLowerCase().includes(q) ||
      s.description.toLowerCase().includes(q) ||
      s.id.toLowerCase().includes(q)
    let matchesSource = true
    if (sourceFilter !== 'all') {
      matchesSource = s.source === sourceFilter
    }
    return matchesSearch && matchesSource
  })

  const tabs: { key: SourceFilter; label: string }[] = [
    { key: 'all', label: `全部 (${sourceStats.all})` },
    { key: 'built-in', label: `内置 (${sourceStats['built-in']})` },
    { key: 'marketplace', label: `市场 (${sourceStats.marketplace})` },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-foreground">技能</h2>
        <p className="mt-1 text-[13px] text-muted-foreground">
          浏览和管理 AI 能力
        </p>
      </div>

      {/* Toolbar: search + tabs + actions */}
      <div className="flex items-center gap-3">
        {/* Search */}
        <div className="relative max-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 pointer-events-none text-muted-foreground/50" />
          <Input
            placeholder="搜索技能..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-8 text-[13px] bg-transparent"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground/40 hover:text-muted-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Tab filters */}
        <div className="flex items-center gap-1">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setSourceFilter(tab.key)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-[12px] font-medium transition-colors',
                sourceFilter === tab.key
                  ? 'bg-foreground/10 text-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-foreground/5',
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Actions */}
        <div className="ml-auto flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-[13px] gap-1.5"
            onClick={() => getApi()?.skills.openFolder()}
          >
            <FolderOpen className="h-3.5 w-3.5" />
            打开技能文件夹
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-accent"
            onClick={loadSkills}
            disabled={loading}
          >
            <RefreshCw className={cn('h-3.5 w-3.5', loading && 'animate-spin')} />
          </Button>
        </div>
      </div>

      {/* Skill list */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <RefreshCw className="h-5 w-5 animate-spin text-muted-foreground/30" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 py-20">
          <Cpu className="h-8 w-8 text-muted-foreground/20" />
          <p className="text-[13px] text-muted-foreground/40">
            {search ? '没有匹配的技能' : '暂无技能'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((skill) => (
            <SkillCard
              key={skill.id}
              skill={skill}
              isSelected={selectedSkill?.id === skill.id}
              onSelect={setSelectedSkill}
              onToggle={handleToggle}
            />
          ))}
        </div>
      )}

      {/* Detail Sheet */}
      {selectedSkill && (
        <SkillDetailPanel
          skill={selectedSkill}
          onToggle={handleToggle}
          onClose={() => setSelectedSkill(null)}
        />
      )}
    </div>
  )
}
