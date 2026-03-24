"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
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
import { PlusIcon, CalendarIcon, Loader2Icon, ListTodoIcon } from "lucide-react";
import type { Campaign, Task } from "@/types";

type CampaignStatus = "active" | "planned" | "completed";

const statusConfig: Record<
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

const allPlatforms = ["小红书", "抖音", "视频号", "X", "即刻"];

// Task stats per campaign
interface CampaignTaskStats {
  total: number;
  published: number;
}

export default function CampaignsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<CampaignStatus | "all">("active");
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [taskStatsMap, setTaskStatsMap] = useState<Record<string, CampaignTaskStats>>({});
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const nameRef = useRef<HTMLInputElement>(null);
  const goalRef = useRef<HTMLTextAreaElement>(null);
  const startDateRef = useRef<HTMLInputElement>(null);
  const endDateRef = useRef<HTMLInputElement>(null);

  const fetchCampaigns = useCallback(async () => {
    try {
      setLoading(true);
      const [campaignsRes, tasksRes] = await Promise.all([
        fetch("/api/campaigns"),
        fetch("/api/tasks"),
      ]);
      const campaignsJson = (await campaignsRes.json()) as {
        success: boolean;
        data: Campaign[];
      };
      const tasksJson = (await tasksRes.json()) as {
        success: boolean;
        data: Task[];
      };

      if (campaignsJson.success) {
        setCampaigns(campaignsJson.data);
      }
      if (tasksJson.success) {
        // Build stats map
        const statsMap: Record<string, CampaignTaskStats> = {};
        for (const task of tasksJson.data) {
          if (!statsMap[task.campaign_id]) {
            statsMap[task.campaign_id] = { total: 0, published: 0 };
          }
          statsMap[task.campaign_id].total++;
          if (task.status === "published") {
            statsMap[task.campaign_id].published++;
          }
        }
        setTaskStatsMap(statsMap);
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCampaigns();
  }, [fetchCampaigns]);

  const filteredCampaigns =
    activeTab === "all"
      ? campaigns
      : campaigns.filter((c) => c.status === activeTab);

  const statusCounts = {
    active: campaigns.filter((c) => c.status === "active").length,
    planned: campaigns.filter((c) => c.status === "planned").length,
    completed: campaigns.filter((c) => c.status === "completed").length,
    all: campaigns.length,
  };

  const statusTabs: { label: string; value: CampaignStatus | "all"; count: number }[] = [
    { label: "进行中", value: "active", count: statusCounts.active },
    { label: "计划中", value: "planned", count: statusCounts.planned },
    { label: "已完成", value: "completed", count: statusCounts.completed },
    { label: "全部", value: "all", count: statusCounts.all },
  ];

  const togglePlatform = (platform: string) => {
    setSelectedPlatforms((prev) =>
      prev.includes(platform)
        ? prev.filter((p) => p !== platform)
        : [...prev, platform]
    );
  };

  const handleCreate = async () => {
    const name = nameRef.current?.value?.trim();
    const goal = goalRef.current?.value?.trim();
    const start_date = startDateRef.current?.value || null;
    const end_date = endDateRef.current?.value || null;

    if (!name || !goal) return;

    setSaving(true);
    try {
      const res = await fetch("/api/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          goal,
          description: goal,
          start_date,
          end_date,
          status: "planned",
        }),
      });
      const json = (await res.json()) as { success: boolean; data: Campaign };
      if (json.success) {
        setCampaigns((prev) => [...prev, json.data]);
      }
      setDialogOpen(false);
    } catch {
      // handle error silently
    } finally {
      setSaving(false);
    }
  };

  const getTaskProgress = (campaignId: string): number => {
    const stats = taskStatsMap[campaignId];
    if (!stats || stats.total === 0) return 0;
    return Math.round((stats.published / stats.total) * 100);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Campaigns</h1>
        <Button
          className="text-white border-0"
          style={{ background: "linear-gradient(135deg, #a78bfa, #818cf8)" }}
          onClick={() => {
            setSelectedPlatforms([]);
            setDialogOpen(true);
          }}
        >
          <PlusIcon className="size-4 mr-1.5" />
          创建活动
        </Button>
      </div>

      {/* Tab filter */}
      <div
        className="flex gap-1 rounded-lg p-1"
        style={{ backgroundColor: "#0a0a0f" }}
      >
        {statusTabs.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setActiveTab(tab.value)}
            className="px-3 py-1.5 text-sm rounded-md transition-colors"
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
            {tab.label}({tab.count})
          </button>
        ))}
      </div>

      {/* Loading */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2Icon className="size-6 animate-spin" style={{ color: "rgba(255,255,255,0.4)" }} />
        </div>
      ) : (
        /* Campaign cards */
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filteredCampaigns.length === 0 ? (
            <div
              className="col-span-full px-4 py-8 text-center text-sm"
              style={{ color: "rgba(255,255,255,0.25)" }}
            >
              暂无数据
            </div>
          ) : (
            filteredCampaigns.map((campaign) => {
              const status = statusConfig[campaign.status as CampaignStatus] ??
                statusConfig.planned;
              const stats = taskStatsMap[campaign.id];
              const taskTotal = stats?.total ?? 0;
              const taskPublished = stats?.published ?? 0;
              const progress = getTaskProgress(campaign.id);
              return (
                <div
                  key={campaign.id}
                  onClick={() => router.push(`/campaigns/${campaign.id}`)}
                  className="p-6 cursor-pointer transition-all duration-200"
                  style={{
                    backgroundColor: "#0a0a0f",
                    border: "1px solid rgba(255,255,255,0.08)",
                    borderRadius: "16px",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = "translateY(-2px)";
                    e.currentTarget.style.borderColor = "rgba(255,255,255,0.15)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)";
                  }}
                >
                  {/* Title row */}
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-base font-medium text-white">
                      {campaign.name}
                    </h3>
                    <Badge
                      variant="secondary"
                      className="border-transparent"
                      style={{
                        backgroundColor: status.bg,
                        color: status.color,
                      }}
                    >
                      {status.label}
                    </Badge>
                  </div>

                  {/* Goal */}
                  <p className="text-sm mb-3" style={{ color: "rgba(255,255,255,0.6)" }}>
                    {campaign.goal}
                  </p>

                  {/* Date range & task count */}
                  <div className="flex items-center gap-4 text-xs mb-4" style={{ color: "rgba(255,255,255,0.4)" }}>
                    <div className="flex items-center gap-1.5">
                      <CalendarIcon className="size-3.5" />
                      <span>
                        {campaign.start_date ?? "未定"} — {campaign.end_date ?? "未定"}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <ListTodoIcon className="size-3.5" />
                      <span>
                        {taskPublished}/{taskTotal} 任务已发布
                      </span>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="mb-0">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs" style={{ color: "rgba(255,255,255,0.6)" }}>
                        进度
                      </span>
                      <span className="text-xs font-medium text-white">
                        {progress}%
                      </span>
                    </div>
                    <div
                      className="h-2 rounded-full overflow-hidden"
                      style={{ backgroundColor: "rgba(255,255,255,0.08)" }}
                    >
                      <div
                        className="h-2 rounded-full transition-all"
                        style={{ width: `${progress}%`, backgroundColor: "#22c55e" }}
                      />
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Create Campaign Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent
          className="sm:max-w-md"
          style={{
            backgroundColor: "#0a0a0f",
            border: "1px solid rgba(255,255,255,0.08)",
            color: "#fff",
          }}
        >
          <DialogHeader>
            <DialogTitle className="text-white">创建活动</DialogTitle>
            <DialogDescription style={{ color: "rgba(255,255,255,0.4)" }}>
              创建新的营销活动，设定目标与时间线
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium" style={{ color: "rgba(255,255,255,0.6)" }}>
                活动名称
              </label>
              <Input
                ref={nameRef}
                placeholder="输入活动名称"
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
                ref={goalRef}
                placeholder="描述活动目标与预期成果..."
                className="min-h-[80px] resize-y text-white placeholder:text-white/25"
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
                  ref={startDateRef}
                  type="date"
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
                  ref={endDateRef}
                  type="date"
                  className="text-white"
                  style={{
                    backgroundColor: "rgba(255,255,255,0.05)",
                    borderColor: "rgba(255,255,255,0.08)",
                  }}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium" style={{ color: "rgba(255,255,255,0.6)" }}>
                选择平台
              </label>
              <div className="flex flex-wrap gap-2">
                {allPlatforms.map((platform) => (
                  <label
                    key={platform}
                    className="flex items-center gap-1.5 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedPlatforms.includes(platform)}
                      onChange={() => togglePlatform(platform)}
                      className="size-4 rounded"
                      style={{ borderColor: "rgba(255,255,255,0.08)" }}
                    />
                    <span className="text-sm" style={{ color: "rgba(255,255,255,0.6)" }}>
                      {platform}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
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
              onClick={handleCreate}
              disabled={saving}
            >
              {saving ? (
                <Loader2Icon className="size-4 mr-1.5 animate-spin" />
              ) : null}
              创建
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
