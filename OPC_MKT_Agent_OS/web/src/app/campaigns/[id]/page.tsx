"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  ArrowLeftIcon,
  CalendarIcon,
  Loader2Icon,
  PlayIcon,
  PencilIcon,
  ListTodoIcon,
  FileTextIcon,
  BarChart3Icon,
} from "lucide-react";
import type { Campaign, Task, Content, MetricRecord, TaskStatus, ContentStatus } from "@/types";

// ---------- Status configs ----------
type CampaignStatus = "active" | "planned" | "completed";

const campaignStatusConfig: Record<
  CampaignStatus,
  { label: string; color: string; bg: string }
> = {
  active: {
    label: "进行中",
    color: "#22d3ee",
    bg: "rgba(34, 211, 238, 0.10)",
  },
  planned: {
    label: "计划中",
    color: "#fbbf24",
    bg: "rgba(251, 191, 36, 0.10)",
  },
  completed: {
    label: "已完成",
    color: "#22c55e",
    bg: "rgba(34, 197, 94, 0.10)",
  },
};

const taskStatusConfig: Record<TaskStatus, { label: string; color: string; bg: string }> = {
  backlog: {
    label: "待办",
    color: "rgba(255,255,255,0.6)",
    bg: "rgba(255,255,255,0.08)",
  },
  draft: {
    label: "草稿",
    color: "#fbbf24",
    bg: "rgba(251, 191, 36, 0.10)",
  },
  review: {
    label: "审核中",
    color: "#fbbf24",
    bg: "rgba(251, 191, 36, 0.10)",
  },
  approved: {
    label: "已审核",
    color: "#22c55e",
    bg: "rgba(34, 197, 94, 0.10)",
  },
  scheduled: {
    label: "已排期",
    color: "#22d3ee",
    bg: "rgba(34, 211, 238, 0.10)",
  },
  published: {
    label: "已发布",
    color: "#a78bfa",
    bg: "rgba(167, 139, 250, 0.10)",
  },
};

const contentStatusConfig: Record<ContentStatus, { label: string; color: string; bg: string }> = {
  draft: {
    label: "草稿",
    color: "#fbbf24",
    bg: "rgba(251, 191, 36, 0.10)",
  },
  review: {
    label: "审核中",
    color: "#fbbf24",
    bg: "rgba(251, 191, 36, 0.10)",
  },
  approved: {
    label: "已审核",
    color: "#22c55e",
    bg: "rgba(34, 197, 94, 0.10)",
  },
  rejected: {
    label: "已拒绝",
    color: "#ef4444",
    bg: "rgba(239, 68, 68, 0.10)",
  },
  published: {
    label: "已发布",
    color: "#a78bfa",
    bg: "rgba(167, 139, 250, 0.10)",
  },
};

type TabValue = "tasks" | "content" | "metrics";

export default function CampaignDetailPage() {
  const params = useParams();
  const router = useRouter();
  const campaignId = params.id as string;

  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [contents, setContents] = useState<Content[]>([]);
  const [metrics, setMetrics] = useState<MetricRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabValue>("tasks");
  const [runningAgent, setRunningAgent] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editSaving, setEditSaving] = useState(false);

  const editNameRef = useRef<HTMLInputElement>(null);
  const editGoalRef = useRef<HTMLTextAreaElement>(null);
  const editStartRef = useRef<HTMLInputElement>(null);
  const editEndRef = useRef<HTMLInputElement>(null);

  // ---------- Fetch data ----------
  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [campaignRes, tasksRes, contentsRes] = await Promise.all([
        fetch(`/api/campaigns/${campaignId}`),
        fetch(`/api/tasks?campaign_id=${campaignId}`),
        fetch(`/api/contents?campaign_id=${campaignId}`),
      ]);

      const campaignJson = (await campaignRes.json()) as {
        success: boolean;
        data: Campaign;
      };
      const tasksJson = (await tasksRes.json()) as {
        success: boolean;
        data: Task[];
      };
      const contentsJson = (await contentsRes.json()) as {
        success: boolean;
        data: Content[];
      };

      if (campaignJson.success) setCampaign(campaignJson.data);
      if (tasksJson.success) setTasks(tasksJson.data);
      if (contentsJson.success) {
        setContents(contentsJson.data);
        // Fetch metrics for all contents
        const contentIds = contentsJson.data.map((c) => c.id);
        if (contentIds.length > 0) {
          try {
            const metricsRes = await fetch("/api/metrics");
            const metricsJson = (await metricsRes.json()) as {
              success: boolean;
              data: MetricRecord[];
            };
            if (metricsJson.success) {
              const idSet = new Set(contentIds);
              setMetrics(
                metricsJson.data.filter((m) => idSet.has(m.content_id))
              );
            }
          } catch {
            // metrics are optional
          }
        }
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, [campaignId]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // ---------- Computed ----------
  const publishedTaskCount = tasks.filter((t) => t.status === "published").length;
  const totalTaskCount = tasks.length;
  const progressPct = totalTaskCount > 0 ? Math.round((publishedTaskCount / totalTaskCount) * 100) : 0;

  const campStatusData = campaignStatusConfig[(campaign?.status ?? "planned") as CampaignStatus] ??
    campaignStatusConfig.planned;

  // ---------- Run Agent ----------
  const handleRunAgent = async () => {
    setRunningAgent(true);
    try {
      await fetch("/api/agents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campaignId }),
      });
      // Refresh data after agent run
      await fetchAll();
    } catch {
      // silently fail
    } finally {
      setRunningAgent(false);
    }
  };

  // ---------- Edit Campaign ----------
  const handleEditSave = async () => {
    const name = editNameRef.current?.value?.trim();
    const goal = editGoalRef.current?.value?.trim();
    const start_date = editStartRef.current?.value || null;
    const end_date = editEndRef.current?.value || null;

    if (!name || !goal) return;

    setEditSaving(true);
    try {
      const res = await fetch(`/api/campaigns/${campaignId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, goal, description: goal, start_date, end_date }),
      });
      const json = (await res.json()) as { success: boolean; data: Campaign };
      if (json.success) {
        setCampaign(json.data);
      }
      setEditDialogOpen(false);
    } catch {
      // silently fail
    } finally {
      setEditSaving(false);
    }
  };

  // ---------- Tab config ----------
  const tabItems: { label: string; value: TabValue; icon: typeof ListTodoIcon; count: number }[] = [
    { label: "任务", value: "tasks", icon: ListTodoIcon, count: tasks.length },
    { label: "内容", value: "content", icon: FileTextIcon, count: contents.length },
    { label: "数据", value: "metrics", icon: BarChart3Icon, count: metrics.length },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2Icon className="size-6 animate-spin" style={{ color: "rgba(255,255,255,0.4)" }} />
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="space-y-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push("/campaigns")}
          className="text-white hover:bg-white/5"
        >
          <ArrowLeftIcon className="size-4 mr-1.5" />
          返回列表
        </Button>
        <div
          className="text-center py-12 text-sm"
          style={{ color: "rgba(255,255,255,0.25)" }}
        >
          未找到该活动
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => router.push("/campaigns")}
        className="text-white hover:bg-white/5"
      >
        <ArrowLeftIcon className="size-4 mr-1.5" />
        返回列表
      </Button>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-white">{campaign.name}</h1>
            <Badge
              variant="secondary"
              className="border-transparent"
              style={{
                backgroundColor: campStatusData.bg,
                color: campStatusData.color,
              }}
            >
              {campStatusData.label}
            </Badge>
          </div>
          <p className="text-sm" style={{ color: "rgba(255,255,255,0.6)" }}>
            {campaign.goal}
          </p>
          <div className="flex items-center gap-1.5 text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>
            <CalendarIcon className="size-3.5" />
            <span>
              {campaign.start_date ?? "未定"} — {campaign.end_date ?? "未定"}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setEditDialogOpen(true)}
            className="text-white"
            style={{
              backgroundColor: "transparent",
              borderColor: "rgba(255,255,255,0.08)",
            }}
          >
            <PencilIcon className="size-4 mr-1.5" />
            编辑
          </Button>
          <Button
            className="text-white border-0"
            size="sm"
            onClick={handleRunAgent}
            disabled={runningAgent}
            style={{ background: "linear-gradient(135deg, #a78bfa, #818cf8)" }}
          >
            {runningAgent ? (
              <Loader2Icon className="size-4 mr-1.5 animate-spin" />
            ) : (
              <PlayIcon className="size-4 mr-1.5" />
            )}
            运行 Agent
          </Button>
        </div>
      </div>

      {/* Progress bar */}
      <div
        className="p-4"
        style={{
          backgroundColor: "#0a0a0f",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: "16px",
        }}
      >
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm" style={{ color: "rgba(255,255,255,0.6)" }}>
            任务完成进度
          </span>
          <span className="text-sm font-medium text-white">
            {publishedTaskCount}/{totalTaskCount} ({progressPct}%)
          </span>
        </div>
        <div
          className="h-2.5 rounded-full overflow-hidden"
          style={{ backgroundColor: "rgba(255,255,255,0.08)" }}
        >
          <div
            className="h-2.5 rounded-full transition-all"
            style={{ width: `${progressPct}%`, backgroundColor: "#22c55e" }}
          />
        </div>
      </div>

      {/* Tabs */}
      <div
        className="flex gap-1 rounded-lg p-1"
        style={{ backgroundColor: "#0a0a0f" }}
      >
        {tabItems.map((tab) => {
          const TabIcon = tab.icon;
          return (
            <button
              key={tab.value}
              onClick={() => setActiveTab(tab.value)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md transition-colors"
              style={
                activeTab === tab.value
                  ? {
                      backgroundColor: "rgba(255,255,255,0.08)",
                      color: "#fff",
                      fontWeight: 500,
                    }
                  : {
                      color: "rgba(255,255,255,0.4)",
                    }
              }
            >
              <TabIcon className="size-4" />
              {tab.label}({tab.count})
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      {activeTab === "tasks" && (
        <div
          className="overflow-hidden"
          style={{
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: "16px",
          }}
        >
          {tasks.length === 0 ? (
            <div
              className="px-4 py-8 text-center text-sm"
              style={{ color: "rgba(255,255,255,0.25)" }}
            >
              暂无任务，点击「运行 Agent」生成
            </div>
          ) : (
            tasks.map((task, index) => {
              const sc = taskStatusConfig[task.status];
              return (
                <div
                  key={task.id}
                  className="flex items-center justify-between px-4 py-3 transition-colors hover:bg-white/[0.02]"
                  style={{
                    borderTop: index > 0 ? "1px solid rgba(255,255,255,0.08)" : "none",
                  }}
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-white truncate">
                      {task.title}
                    </p>
                    {task.description && (
                      <p className="text-xs truncate" style={{ color: "rgba(255,255,255,0.6)" }}>
                        {task.description}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-3 shrink-0 ml-4">
                    {task.due_date && (
                      <span className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>
                        {task.due_date}
                      </span>
                    )}
                    <Badge
                      variant="secondary"
                      className="border-transparent"
                      style={{
                        backgroundColor: sc.bg,
                        color: sc.color,
                      }}
                    >
                      {sc.label}
                    </Badge>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {activeTab === "content" && (
        <div
          className="overflow-hidden"
          style={{
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: "16px",
          }}
        >
          {contents.length === 0 ? (
            <div
              className="px-4 py-8 text-center text-sm"
              style={{ color: "rgba(255,255,255,0.25)" }}
            >
              暂无内容
            </div>
          ) : (
            contents.map((c, index) => {
              const sc = contentStatusConfig[c.status];
              return (
                <div
                  key={c.id}
                  className="flex items-center justify-between px-4 py-3 transition-colors hover:bg-white/[0.02]"
                  style={{
                    borderTop: index > 0 ? "1px solid rgba(255,255,255,0.08)" : "none",
                  }}
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-white truncate">
                      {c.title}
                    </p>
                    {c.platform && (
                      <p className="text-xs" style={{ color: "rgba(255,255,255,0.6)" }}>
                        {c.platform}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-3 shrink-0 ml-4">
                    <span className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>
                      {c.created_at.split("T")[0]}
                    </span>
                    <Badge
                      variant="secondary"
                      className="border-transparent"
                      style={{
                        backgroundColor: sc.bg,
                        color: sc.color,
                      }}
                    >
                      {sc.label}
                    </Badge>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {activeTab === "metrics" && (
        <div
          className="overflow-hidden"
          style={{
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: "16px",
          }}
        >
          {metrics.length === 0 ? (
            <div
              className="px-4 py-8 text-center text-sm"
              style={{ color: "rgba(255,255,255,0.25)" }}
            >
              暂无数据指标
            </div>
          ) : (
            metrics.map((m, index) => (
              <div
                key={m.id}
                className="px-4 py-3 transition-colors hover:bg-white/[0.02]"
                style={{
                  borderTop: index > 0 ? "1px solid rgba(255,255,255,0.08)" : "none",
                }}
              >
                <div className="flex items-center justify-between mb-1">
                  <p className="text-sm font-medium text-white">
                    {m.content_title}
                  </p>
                  <span className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>
                    {m.platform} &middot; {m.recorded_at.split("T")[0]}
                  </span>
                </div>
                <div className="flex items-center gap-4 text-xs" style={{ color: "rgba(255,255,255,0.6)" }}>
                  <span>曝光 {m.impressions}</span>
                  <span>点赞 {m.likes}</span>
                  <span>评论 {m.comments}</span>
                  <span>收藏 {m.saves}</span>
                  <span>分享 {m.shares}</span>
                  <span>线索 {m.leads}</span>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Edit Campaign Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent
          className="sm:max-w-md"
          style={{
            backgroundColor: "#0a0a0f",
            border: "1px solid rgba(255,255,255,0.08)",
            color: "#fff",
          }}
        >
          <DialogHeader>
            <DialogTitle className="text-white">编辑活动</DialogTitle>
            <DialogDescription style={{ color: "rgba(255,255,255,0.4)" }}>
              修改活动基本信息
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium" style={{ color: "rgba(255,255,255,0.6)" }}>
                活动名称
              </label>
              <Input
                ref={editNameRef}
                defaultValue={campaign.name}
                key={campaign.id + "-name"}
                className="text-white placeholder:text-white/25"
                style={{
                  backgroundColor: "rgba(255,255,255,0.05)",
                  borderColor: "rgba(255,255,255,0.08)",
                }}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium" style={{ color: "rgba(255,255,255,0.6)" }}>
                目标描述
              </label>
              <Textarea
                ref={editGoalRef}
                defaultValue={campaign.goal}
                className="min-h-[80px] resize-y text-white placeholder:text-white/25"
                key={campaign.id + "-goal"}
                style={{
                  backgroundColor: "rgba(255,255,255,0.05)",
                  borderColor: "rgba(255,255,255,0.08)",
                }}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-sm font-medium" style={{ color: "rgba(255,255,255,0.6)" }}>
                  开始日期
                </label>
                <Input
                  ref={editStartRef}
                  type="date"
                  defaultValue={campaign.start_date ?? ""}
                  key={campaign.id + "-start"}
                  className="text-white"
                  style={{
                    backgroundColor: "rgba(255,255,255,0.05)",
                    borderColor: "rgba(255,255,255,0.08)",
                  }}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium" style={{ color: "rgba(255,255,255,0.6)" }}>
                  结束日期
                </label>
                <Input
                  ref={editEndRef}
                  type="date"
                  defaultValue={campaign.end_date ?? ""}
                  key={campaign.id + "-end"}
                  className="text-white"
                  style={{
                    backgroundColor: "rgba(255,255,255,0.05)",
                    borderColor: "rgba(255,255,255,0.08)",
                  }}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditDialogOpen(false)}
              className="text-white"
              style={{
                backgroundColor: "transparent",
                borderColor: "rgba(255,255,255,0.08)",
              }}
            >
              取消
            </Button>
            <Button
              className="text-white border-0"
              style={{ background: "linear-gradient(135deg, #a78bfa, #818cf8)" }}
              onClick={handleEditSave}
              disabled={editSaving}
            >
              {editSaving ? (
                <Loader2Icon className="size-4 mr-1.5 animate-spin" />
              ) : null}
              保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
