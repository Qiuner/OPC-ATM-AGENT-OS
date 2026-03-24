'use client';

import { useState } from 'react';
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { User, FileText, Settings, Plus, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAgentProfiles } from '@/lib/agent-profiles';
import type { AgentProfile, AgentOutputRecord } from '@/lib/agent-profiles';

// ==========================================
// Output type icons
// ==========================================

const OUTPUT_TYPE_ICONS: Record<AgentOutputRecord['type'], string> = {
  plan: '\u{1F4CB}',
  content: '\u270F\uFE0F',
  analysis: '\u{1F4CA}',
  text: '\u{1F4AC}',
};

const OUTPUT_TYPE_LABELS: Record<AgentOutputRecord['type'], string> = {
  plan: '计划',
  content: '内容',
  analysis: '分析',
  text: '文本',
};

// ==========================================
// Sub-components
// ==========================================

function ProfileTab({ profile }: { profile: AgentProfile }) {
  const outputCount = profile.outputHistory.length;
  const lastActive = profile.outputHistory[0]?.timestamp;
  const lastActiveText = lastActive
    ? new Date(lastActive).toLocaleString('zh-CN', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '暂无记录';

  return (
    <div className="flex flex-col items-center gap-4 py-6">
      {/* Large avatar */}
      <div className="relative">
        <div
          className={cn(
            'w-16 h-16 rounded-full flex items-center justify-center text-white text-xl font-bold',
            profile.color
          )}
        >
          {profile.avatar}
        </div>
        {/* Online indicator */}
        <span className="absolute bottom-0 right-0 h-4 w-4 rounded-full bg-green-500 border-2 border-white dark:border-zinc-900" />
      </div>

      {/* Name + label */}
      <div className="text-center">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-zinc-100">
          {profile.name}
        </h3>
        <p className="text-sm text-gray-500 dark:text-zinc-400">{profile.label}</p>
      </div>

      {/* Description */}
      <p className="text-sm text-gray-600 dark:text-zinc-300 text-center px-4">
        {profile.description}
      </p>

      {/* Stats */}
      <div className="flex gap-8 mt-2">
        <div className="text-center">
          <p className="text-2xl font-bold text-gray-900 dark:text-zinc-100">{outputCount}</p>
          <p className="text-xs text-gray-500 dark:text-zinc-400">总输出</p>
        </div>
        <div className="text-center">
          <p className="text-sm font-medium text-gray-900 dark:text-zinc-100">{lastActiveText}</p>
          <p className="text-xs text-gray-500 dark:text-zinc-400">最近活跃</p>
        </div>
      </div>

      {/* Skills summary */}
      <div className="w-full px-4 mt-2">
        <p className="text-xs font-medium text-gray-500 dark:text-zinc-400 mb-2">技能</p>
        <div className="flex flex-wrap gap-1.5">
          {profile.skills
            .filter((s) => s.enabled)
            .map((s) => (
              <span
                key={s.id}
                className="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-zinc-300"
              >
                {s.name}
              </span>
            ))}
        </div>
      </div>
    </div>
  );
}

function OutputDetailDialog({ record }: { record: AgentOutputRecord }) {
  return (
    <Dialog>
      <DialogTrigger
        className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-gray-50 dark:hover:bg-zinc-800/60 transition-colors cursor-pointer"
      >
        <div className="flex items-start gap-2.5">
          <span className="text-base shrink-0 mt-0.5">
            {OUTPUT_TYPE_ICONS[record.type]}
          </span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-medium text-gray-900 dark:text-zinc-100 truncate">
                {record.title}
              </span>
              <span className="text-xs text-gray-400 dark:text-zinc-500 shrink-0">
                {new Date(record.timestamp).toLocaleString('zh-CN', {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </div>
            <p className="text-xs text-gray-500 dark:text-zinc-400 mt-0.5 line-clamp-2">
              {record.preview}
            </p>
          </div>
        </div>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span>{OUTPUT_TYPE_ICONS[record.type]}</span>
            {record.title}
          </DialogTitle>
          <DialogDescription>
            {OUTPUT_TYPE_LABELS[record.type]} &middot;{' '}
            {new Date(record.timestamp).toLocaleString('zh-CN')}
          </DialogDescription>
        </DialogHeader>
        <div className="mt-4">
          <pre className="text-sm text-gray-700 dark:text-zinc-300 whitespace-pre-wrap font-sans">
            {JSON.stringify(record.data, null, 2)}
          </pre>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function OutputsTab({ profile }: { profile: AgentProfile }) {
  if (profile.outputHistory.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-gray-400 dark:text-zinc-500">
        <FileText className="h-8 w-8 mb-2" />
        <p className="text-sm">暂无输出记录</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1 py-2">
      {profile.outputHistory.map((record) => (
        <OutputDetailDialog key={record.id} record={record} />
      ))}
    </div>
  );
}

function SettingsTab({ profile }: { profile: AgentProfile }) {
  const { updateSystemPrompt, resetSystemPrompt, toggleSkill, addSkill } = useAgentProfiles();
  const [isAddingSkill, setIsAddingSkill] = useState(false);
  const [newSkillName, setNewSkillName] = useState('');
  const [newSkillDesc, setNewSkillDesc] = useState('');

  const handleAddSkill = () => {
    if (!newSkillName.trim()) return;
    addSkill(profile.id, {
      name: newSkillName.trim(),
      description: newSkillDesc.trim(),
    });
    setNewSkillName('');
    setNewSkillDesc('');
    setIsAddingSkill(false);
  };

  return (
    <div className="flex flex-col gap-6 py-4 px-1">
      {/* System Prompt */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium text-gray-900 dark:text-zinc-100">
            System Prompt
          </label>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => resetSystemPrompt(profile.id)}
            className="h-7 text-xs gap-1 text-gray-500 dark:text-zinc-400"
          >
            <RotateCcw className="h-3 w-3" />
            恢复默认
          </Button>
        </div>
        <Textarea
          value={profile.systemPrompt}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
            updateSystemPrompt(profile.id, e.target.value)
          }
          className="min-h-[200px] text-xs font-mono resize-y"
          placeholder="输入 system prompt..."
        />
      </div>

      {/* Skills */}
      <div>
        <label className="text-sm font-medium text-gray-900 dark:text-zinc-100 mb-3 block">
          技能列表
        </label>
        <div className="flex flex-col gap-2">
          {profile.skills.map((skill) => (
            <div
              key={skill.id}
              className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800/50"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-zinc-100">
                  {skill.name}
                </p>
                {skill.description && (
                  <p className="text-xs text-gray-500 dark:text-zinc-400 mt-0.5">
                    {skill.description}
                  </p>
                )}
              </div>
              <Switch
                checked={skill.enabled}
                onCheckedChange={() => toggleSkill(profile.id, skill.id)}
                size="sm"
              />
            </div>
          ))}
        </div>

        {/* Add custom skill */}
        {isAddingSkill ? (
          <div className="mt-3 p-3 rounded-lg border border-gray-200 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-800/30 space-y-2">
            <Input
              placeholder="技能名称"
              value={newSkillName}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewSkillName(e.target.value)}
              className="text-sm"
            />
            <Input
              placeholder="技能描述（可选）"
              value={newSkillDesc}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewSkillDesc(e.target.value)}
              className="text-sm"
            />
            <div className="flex gap-2 justify-end">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setIsAddingSkill(false);
                  setNewSkillName('');
                  setNewSkillDesc('');
                }}
              >
                取消
              </Button>
              <Button size="sm" onClick={handleAddSkill} disabled={!newSkillName.trim()}>
                添加
              </Button>
            </div>
          </div>
        ) : (
          <Button
            variant="outline"
            size="sm"
            className="mt-3 w-full gap-1"
            onClick={() => setIsAddingSkill(true)}
          >
            <Plus className="h-3.5 w-3.5" />
            添加自定义 Skill
          </Button>
        )}
      </div>
    </div>
  );
}

// ==========================================
// Main component
// ==========================================

interface AgentProfileSheetProps {
  agentId: string;
  children: React.ReactNode;
}

export function AgentProfileSheet({ agentId, children }: AgentProfileSheetProps) {
  const { getProfile } = useAgentProfiles();
  const profile = getProfile(agentId);

  if (!profile) return <>{children}</>;

  return (
    <Sheet>
      <SheetTrigger className="cursor-pointer">{children}</SheetTrigger>
      <SheetContent side="right" className="w-[400px] sm:max-w-[400px] overflow-y-auto p-0">
        <SheetHeader className="px-4 pt-4 pb-2">
          <SheetTitle className="text-base">{profile.name} Profile</SheetTitle>
          <SheetDescription>{profile.label}</SheetDescription>
        </SheetHeader>

        <Tabs defaultValue="profile" className="flex-1">
          <TabsList className="mx-4 w-[calc(100%-2rem)]">
            <TabsTrigger value="profile" className="gap-1 text-xs">
              <User className="h-3.5 w-3.5" />
              概览
            </TabsTrigger>
            <TabsTrigger value="outputs" className="gap-1 text-xs">
              <FileText className="h-3.5 w-3.5" />
              输出记录
            </TabsTrigger>
            <TabsTrigger value="settings" className="gap-1 text-xs">
              <Settings className="h-3.5 w-3.5" />
              设置
            </TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="px-4">
            <ProfileTab profile={profile} />
          </TabsContent>

          <TabsContent value="outputs" className="px-4">
            <OutputsTab profile={profile} />
          </TabsContent>

          <TabsContent value="settings" className="px-4">
            <SettingsTab profile={profile} />
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
