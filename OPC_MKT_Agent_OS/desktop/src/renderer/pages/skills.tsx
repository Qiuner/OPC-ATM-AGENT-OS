import { useState, useEffect, useCallback } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  Cpu,
  Search,
  RefreshCw,
  Download,
  FileCode2,
  Settings2,
  ChevronDown,
  ChevronUp,
  FolderOpen,
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

const SOURCE_LABEL: Record<Skill['source'], string> = {
  'built-in': '内置',
  personal: '个人',
  marketplace: '托管目录',
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

function SkillCard({
  skill,
  onToggle,
}: {
  skill: Skill
  onToggle: (id: string, enabled: boolean) => void
}) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div
      className={cn(
        'group flex items-start gap-4 rounded-xl px-5 py-4 transition-all duration-150',
        skill.enabled
          ? 'dark:bg-white/[0.03] bg-black/[0.02]'
          : 'bg-transparent opacity-50',
      )}
      style={{ border: '1px solid var(--border)' }}
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
        {/* Row 1: name + config icon */}
        <div className="flex items-center gap-2">
          <span className="text-[13px] font-semibold text-foreground truncate">{skill.name}</span>
          <Settings2 className="h-3 w-3 opacity-0 group-hover:opacity-40 transition-opacity shrink-0 text-foreground" />
        </div>

        {/* Row 2: description */}
        <div className="mt-0.5">
          <p
            className={cn(
              'text-[12px] leading-relaxed transition-all duration-200 text-muted-foreground',
              !expanded && 'line-clamp-1',
            )}
          >
            {skill.description || '—'}
          </p>
          {skill.description && skill.description.length > 60 && (
            <button
              onClick={() => setExpanded((v) => !v)}
              className="mt-0.5 flex items-center gap-0.5 text-[11px] text-muted-foreground/50 hover:text-muted-foreground transition-colors"
            >
              {expanded ? (
                <><ChevronUp className="h-3 w-3" /> 收起</>
              ) : (
                <><ChevronDown className="h-3 w-3" /> 展开</>
              )}
            </button>
          )}
        </div>

        {/* Row 3: source badge + file path + version */}
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
          <span className="font-mono text-[11px] truncate max-w-[260px] text-muted-foreground/40">
            {skill.filePath}
          </span>
          <Badge
            variant="outline"
            className="border-border text-[10px] px-1.5 py-0 text-muted-foreground"
          >
            {skill.version}
          </Badge>
        </div>
      </div>

      {/* Toggle */}
      <div className="mt-1 shrink-0">
        <Switch
          checked={skill.enabled}
          onCheckedChange={(v) => onToggle(skill.id, v)}
          className="data-[state=checked]:bg-violet-500"
        />
      </div>
    </div>
  )
}

export function SkillsPage(): React.JSX.Element {
  const [skills, setSkills] = useState<Skill[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [installOpen, setInstallOpen] = useState(false)

  const loadSkills = useCallback(async () => {
    setLoading(true)
    try {
      const api = getApi()
      if (api && 'skills' in api && typeof (api as any).skills?.list === 'function') {
        const res = await (api as any).skills.list()
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
  }

  const filtered = skills.filter(
    (s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.description.toLowerCase().includes(search.toLowerCase()),
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-foreground">技能</h2>
        <p className="mt-1 text-[13px] text-muted-foreground">
          浏览和管理 AI 能力
        </p>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 pointer-events-none text-muted-foreground/50"
          />
          <Input
            placeholder="搜索技能..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-8 text-[13px] bg-transparent"
          />
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-[13px] gap-1.5"
            onClick={() => setInstallOpen(true)}
          >
            <Download className="h-3.5 w-3.5" />
            安装技能
          </Button>
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
            <SkillCard key={skill.id} skill={skill} onToggle={handleToggle} />
          ))}
        </div>
      )}

      {/* Install dialog */}
      <Dialog open={installOpen} onOpenChange={setInstallOpen}>
        <DialogContent className="border-border">
          <DialogHeader>
            <DialogTitle>安装技能</DialogTitle>
            <DialogDescription>
              从技能目录安装新的 AI 能力，或上传自定义技能文件。
            </DialogDescription>
          </DialogHeader>
          <div
            className="flex flex-col items-center justify-center gap-3 rounded-lg py-10 border border-dashed border-border"
          >
            <Download className="h-8 w-8 text-muted-foreground/20" />
            <p className="text-[13px] text-muted-foreground/50">
              技能市场即将上线
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
