"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import type { Content, ApprovalDecision, ApprovalRecord } from "@/types";

interface ApprovalItem {
  id: string;
  title: string;
  campaign: string;
  platform: string;
  priority: 0 | 1 | 2;
  source: "ai" | "human";
  decision: ApprovalDecision;
  timeAgo: string;
  body: string;
  tags: string[];
  risk: string | null;
  fromApi: boolean;
}

const MOCK_ITEMS: ApprovalItem[] = [
  {
    id: "A-012",
    title: "小红书种草 #12",
    campaign: "春季推广",
    platform: "小红书",
    priority: 0,
    source: "ai",
    decision: "pending",
    timeAgo: "2h ago",
    body: `🌸 姐妹们！这个春天我发现了一个宝藏工具，真的太好用了！

用了一周，效率直接翻倍，之前要花3小时的工作现在30分钟搞定 ✨

分享一下我的使用心得：
1️⃣ 操作超简单，打开就能上手
2️⃣ AI 自动帮你生成内容初稿
3️⃣ 一键多平台分发，省时省力

保证效果立竿见影，谁用谁知道！

赶紧试试吧，链接放评论区了 👇`,
    tags: ["#种草推荐", "#效率工具", "#AI神器", "#春季必备"],
    risk: "检测到敏感表达：'保证效果'，建议修改为 '亲测有效' 或删除该表述",
    fromApi: false,
  },
  {
    id: "A-008",
    title: "抖音脚本 #8",
    campaign: "品牌曝光",
    platform: "抖音",
    priority: 1,
    source: "ai",
    decision: "pending",
    timeAgo: "3h ago",
    body: `【开场】（0-3秒）
画面：快速切换多个 AI 工具界面
旁白："你还在手动写内容？"

【痛点】（3-10秒）
画面：一个人对着电脑发呆、删了写写了删
旁白："每天花3小时写文案，效果还不好？"

【解决方案】（10-25秒）
画面：产品操作录屏
旁白："用 OpenClaw，30秒生成专业文案，一键分发6大平台"

【结尾】（25-30秒）
画面：数据增长曲线
旁白："已有1000+创作者在用，链接在主页"`,
    tags: ["#AI工具", "#效率提升", "#内容创作"],
    risk: null,
    fromApi: false,
  },
  {
    id: "A-005",
    title: "X 推文 #5",
    campaign: "内容营销",
    platform: "X",
    priority: 2,
    source: "human",
    decision: "pending",
    timeAgo: "5h ago",
    body: `Thread: 5 AI tools that changed my content workflow in 2024 🧵

1/ First up: AI-powered content generation
Gone are the days of staring at blank pages. Now I generate first drafts in seconds.

2/ Cross-platform distribution
One piece of content, adapted for 6 platforms automatically. No more copy-paste madness.

3/ Smart scheduling
AI analyzes your audience's active hours and schedules posts for maximum engagement.

4/ Performance analytics
Real-time insights across all platforms in one dashboard.

5/ Content approval workflow
Team collaboration made easy with built-in review and approval flows.

What AI tools are you using? Drop them below 👇`,
    tags: ["#AItools", "#ContentCreation", "#Productivity"],
    risk: null,
    fromApi: false,
  },
  {
    id: "A-003",
    title: "品牌故事视频 #3",
    campaign: "品牌曝光",
    platform: "视频号",
    priority: 0,
    source: "ai",
    decision: "approved",
    timeAgo: "1d ago",
    body: "品牌创始人专访视频脚本，讲述从0到1的创业历程，已通过审核。",
    tags: ["#品牌故事", "#创业"],
    risk: null,
    fromApi: false,
  },
  {
    id: "A-001",
    title: "产品FAQ帖子 #1",
    campaign: "用户教育",
    platform: "小红书",
    priority: 1,
    source: "ai",
    decision: "rejected",
    timeAgo: "2d ago",
    body: "常见问题解答帖子，因内容过于生硬被退回修改。",
    tags: ["#FAQ", "#产品介绍"],
    risk: null,
    fromApi: false,
  },
];

type TabKey = "all" | "pending" | "approved" | "rejected";

const TABS: { key: TabKey; label: string }[] = [
  { key: "all", label: "全部" },
  { key: "pending", label: "待审核" },
  { key: "approved", label: "已通过" },
  { key: "rejected", label: "已退回" },
];

const PRIORITY_COLORS: Record<number, string> = {
  0: "text-red-400",
  1: "text-yellow-400",
  2: "text-white/25",
};

const DECISION_DOT: Record<ApprovalDecision, string> = {
  pending: "bg-amber-400",
  approved: "bg-[#22d3ee]",
  rejected: "bg-red-500",
  revision: "bg-[#a78bfa]",
};

function mapContentStatusToDecision(status: string): ApprovalDecision {
  switch (status) {
    case "review":
    case "draft":
      return "pending";
    case "approved":
    case "published":
      return "approved";
    case "rejected":
      return "rejected";
    default:
      return "pending";
  }
}

function mapContentToItem(content: Content): ApprovalItem {
  const metadata = content.metadata as {
    tags?: string[];
    riskCheck?: string | { passed?: boolean; warnings?: string[] };
    cta?: string;
  };
  const createdDate = new Date(content.created_at);
  const now = new Date();
  const diffMs = now.getTime() - createdDate.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const timeAgo = diffHours < 24 ? `${diffHours}h ago` : `${Math.floor(diffHours / 24)}d ago`;

  let riskText: string | null = null;
  const rc = metadata?.riskCheck;
  if (rc) {
    if (typeof rc === "string" && rc !== "") {
      riskText = rc;
    } else if (typeof rc === "object" && !rc.passed && rc.warnings && rc.warnings.length > 0) {
      riskText = rc.warnings.join("；");
    }
  }

  return {
    id: content.id,
    title: content.title,
    campaign: content.campaign_id,
    platform: content.platform,
    priority: 0,
    source: content.created_by === "agent" ? "ai" : "human",
    decision: mapContentStatusToDecision(content.status),
    timeAgo,
    body: content.body,
    tags: Array.isArray(metadata?.tags) ? metadata.tags.filter((t): t is string => typeof t === "string") : [],
    risk: riskText,
    fromApi: true,
  };
}

// --- Dialog types ---
type DialogMode = "approve" | "reject" | null;

interface BulkDialogState {
  mode: "approve" | "reject";
  ids: string[];
}

export default function ApprovalPage() {
  const [items, setItems] = useState<ApprovalItem[]>(MOCK_ITEMS);
  const [activeTab, setActiveTab] = useState<TabKey>("all");
  const [selectedId, setSelectedId] = useState<string>("A-012");
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Dialog state
  const [dialogMode, setDialogMode] = useState<DialogMode>(null);
  const [dialogComment, setDialogComment] = useState("");
  const [dialogItemId, setDialogItemId] = useState<string | null>(null);

  // Bulk selection
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());
  const [bulkDialog, setBulkDialog] = useState<BulkDialogState | null>(null);
  const [bulkComment, setBulkComment] = useState("");

  // Approval history
  const [approvalHistory, setApprovalHistory] = useState<Record<string, ApprovalRecord[]>>({});

  const fetchContents = useCallback(async () => {
    try {
      const res = await fetch("/api/contents");
      const json = await res.json() as { success: boolean; data: Content[] };
      if (json.success && json.data.length > 0) {
        const apiItems = json.data.map(mapContentToItem);
        setItems([...apiItems, ...MOCK_ITEMS]);
        if (apiItems.length > 0) {
          setSelectedId(apiItems[0].id);
        }
      }
    } catch {
      // fallback to mock
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchApprovalHistory = useCallback(async (contentId: string) => {
    try {
      const res = await fetch(`/api/approvals?content_id=${encodeURIComponent(contentId)}`);
      const json = await res.json() as { success: boolean; data: ApprovalRecord[] };
      if (json.success) {
        setApprovalHistory((prev) => ({ ...prev, [contentId]: json.data }));
      }
    } catch {
      // silent fail
    }
  }, []);

  useEffect(() => {
    fetchContents();
  }, [fetchContents]);

  // Fetch approval history when selected item changes
  useEffect(() => {
    if (selectedId) {
      fetchApprovalHistory(selectedId);
    }
  }, [selectedId, fetchApprovalHistory]);

  // --- Single item approve/reject with dialog ---
  const openDialog = (mode: DialogMode, id: string) => {
    setDialogMode(mode);
    setDialogItemId(id);
    setDialogComment("");
  };

  const closeDialog = () => {
    setDialogMode(null);
    setDialogItemId(null);
    setDialogComment("");
  };

  const submitDecision = async () => {
    if (!dialogItemId || !dialogMode) return;

    // Reject requires comment
    if (dialogMode === "reject" && dialogComment.trim() === "") {
      toast.error("退回时必须填写原因");
      return;
    }

    const decision: ApprovalRecord["decision"] = dialogMode === "approve" ? "approved" : "rejected";
    setActionLoading(dialogItemId);

    // Optimistic update
    setItems((prev) =>
      prev.map((item) =>
        item.id === dialogItemId ? { ...item, decision: decision as ApprovalDecision } : item
      )
    );

    try {
      // Record approval
      const approvalRes = await fetch("/api/approvals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content_id: dialogItemId,
          decision,
          comment: dialogComment,
          reviewer: "user-001",
        }),
      });
      const approvalJson = await approvalRes.json() as { success: boolean };

      // Update content status via existing API
      const endpoint = dialogMode === "approve"
        ? `/api/contents/${dialogItemId}/approve`
        : `/api/contents/${dialogItemId}/reject`;
      const res = await fetch(endpoint, { method: "POST" });
      const json = await res.json() as { success: boolean };

      if (!json.success && !approvalJson.success) {
        // Revert
        setItems((prev) =>
          prev.map((item) =>
            item.id === dialogItemId ? { ...item, decision: "pending" as ApprovalDecision } : item
          )
        );
        toast.error("操作失败，请重试");
      } else {
        toast.success(dialogMode === "approve" ? "已通过审核" : "已退回修改");
        // Refresh history
        fetchApprovalHistory(dialogItemId);
      }
    } catch {
      setItems((prev) =>
        prev.map((item) =>
          item.id === dialogItemId ? { ...item, decision: "pending" as ApprovalDecision } : item
        )
      );
      toast.error("网络错误，请重试");
    } finally {
      setActionLoading(null);
      closeDialog();
    }
  };

  // --- Bulk actions ---
  const toggleCheck = (id: string) => {
    setCheckedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleAllPending = () => {
    const pendingIds = filteredItems
      .filter((i) => i.decision === "pending")
      .map((i) => i.id);
    const allChecked = pendingIds.every((id) => checkedIds.has(id));
    if (allChecked) {
      setCheckedIds((prev) => {
        const next = new Set(prev);
        pendingIds.forEach((id) => next.delete(id));
        return next;
      });
    } else {
      setCheckedIds((prev) => {
        const next = new Set(prev);
        pendingIds.forEach((id) => next.add(id));
        return next;
      });
    }
  };

  const openBulkDialog = (mode: "approve" | "reject") => {
    const ids = Array.from(checkedIds).filter((id) => {
      const item = items.find((i) => i.id === id);
      return item?.decision === "pending";
    });
    if (ids.length === 0) {
      toast.warning("请先选择待审核的内容");
      return;
    }
    setBulkDialog({ mode, ids });
    setBulkComment("");
  };

  const submitBulkDecision = async () => {
    if (!bulkDialog) return;

    if (bulkDialog.mode === "reject" && bulkComment.trim() === "") {
      toast.error("批量退回时必须填写原因");
      return;
    }

    const decision: ApprovalRecord["decision"] = bulkDialog.mode === "approve" ? "approved" : "rejected";

    // Optimistic update all
    setItems((prev) =>
      prev.map((item) =>
        bulkDialog.ids.includes(item.id)
          ? { ...item, decision: decision as ApprovalDecision }
          : item
      )
    );

    let successCount = 0;
    let failCount = 0;

    for (const id of bulkDialog.ids) {
      try {
        await fetch("/api/approvals", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            content_id: id,
            decision,
            comment: bulkComment,
            reviewer: "user-001",
          }),
        });

        const endpoint = bulkDialog.mode === "approve"
          ? `/api/contents/${id}/approve`
          : `/api/contents/${id}/reject`;
        await fetch(endpoint, { method: "POST" });
        successCount++;
      } catch {
        failCount++;
        // Revert individual item
        setItems((prev) =>
          prev.map((item) =>
            item.id === id ? { ...item, decision: "pending" as ApprovalDecision } : item
          )
        );
      }
    }

    if (successCount > 0) {
      toast.success(
        `${bulkDialog.mode === "approve" ? "批量通过" : "批量退回"} ${successCount} 项`
      );
    }
    if (failCount > 0) {
      toast.error(`${failCount} 项操作失败`);
    }

    setCheckedIds(new Set());
    setBulkDialog(null);
    setBulkComment("");

    // Refresh history for selected
    if (selectedId) {
      fetchApprovalHistory(selectedId);
    }
  };

  const filteredItems =
    activeTab === "all"
      ? items
      : items.filter((item) => item.decision === activeTab);

  const selected = items.find((item) => item.id === selectedId) ?? items[0];
  const pendingCount = items.filter((i) => i.decision === "pending").length;
  const checkedPendingCount = Array.from(checkedIds).filter((id) => {
    const item = items.find((i) => i.id === id);
    return item?.decision === "pending";
  }).length;

  const selectedHistory = selectedId ? (approvalHistory[selectedId] ?? []) : [];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">
          Approval Center
        </h1>
        <div className="flex items-center gap-3">
          {checkedPendingCount > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>
                已选 {checkedPendingCount} 项
              </span>
              <button
                onClick={() => openBulkDialog("approve")}
                className="h-8 rounded-lg bg-[#22d3ee] px-3 text-xs font-medium text-black hover:bg-[#22d3ee]/80 transition-colors"
              >
                批量通过
              </button>
              <button
                onClick={() => openBulkDialog("reject")}
                className="h-8 rounded-lg px-3 text-xs font-medium text-red-400 hover:bg-red-500/10 transition-colors"
                style={{ border: "1px solid rgba(239,68,68,0.3)" }}
              >
                批量拒绝
              </button>
            </div>
          )}
          {loading && (
            <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-t-[#a78bfa]" style={{ borderColor: "rgba(255,255,255,0.15)", borderTopColor: "#a78bfa" }} />
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1" style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.key
                ? "border-[#a78bfa] text-white"
                : "border-transparent hover:text-white/80"
            }`}
            style={activeTab !== tab.key ? { color: "rgba(255,255,255,0.4)" } : undefined}
          >
            {tab.label}
            {tab.key === "pending" && (
              <span className="ml-1.5 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-amber-500/20 px-1.5 text-xs font-medium text-amber-400">
                {pendingCount}
              </span>
            )}
          </button>
        ))}

        {/* Select all pending checkbox */}
        <div className="ml-auto flex items-center gap-2 px-2">
          <label className="flex items-center gap-1.5 text-xs cursor-pointer select-none" style={{ color: "rgba(255,255,255,0.4)" }}>
            <input
              type="checkbox"
              checked={
                filteredItems.filter((i) => i.decision === "pending").length > 0 &&
                filteredItems
                  .filter((i) => i.decision === "pending")
                  .every((i) => checkedIds.has(i.id))
              }
              onChange={toggleAllPending}
              className="h-3.5 w-3.5 rounded accent-[#a78bfa]"
              style={{ borderColor: "rgba(255,255,255,0.15)" }}
            />
            全选待审
          </label>
        </div>
      </div>

      {/* Main Layout: List + Preview */}
      <div className="flex gap-4 min-h-[calc(100vh-260px)]">
        {/* Left: Approval List (40%) */}
        <div className="w-2/5 space-y-1 overflow-y-auto">
          {filteredItems.map((item) => (
            <div
              key={item.id}
              className={`flex items-start gap-2 rounded-lg px-3 py-3 transition-colors ${
                selectedId === item.id
                  ? "border-l-2 border-[#a78bfa] bg-[#a78bfa]/5"
                  : "border-l-2 border-transparent hover:bg-white/[0.02]"
              }`}
            >
              {/* Checkbox for pending items */}
              {item.decision === "pending" && (
                <input
                  type="checkbox"
                  checked={checkedIds.has(item.id)}
                  onChange={() => toggleCheck(item.id)}
                  className="mt-1 h-3.5 w-3.5 shrink-0 rounded accent-[#a78bfa]"
                  style={{ borderColor: "rgba(255,255,255,0.15)" }}
                />
              )}
              {item.decision !== "pending" && <div className="w-3.5 shrink-0" />}

              <button
                onClick={() => setSelectedId(item.id)}
                className="flex-1 text-left min-w-0"
              >
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className={`inline-block h-2 w-2 rounded-full shrink-0 ${DECISION_DOT[item.decision]}`}
                  />
                  <span className="text-sm font-medium text-white truncate">
                    {item.title}
                  </span>
                  {item.fromApi && (
                    <span className="shrink-0 rounded bg-[#a78bfa]/20 px-1 py-0.5 text-[10px] font-medium text-[#a78bfa]">
                      AI
                    </span>
                  )}
                  {/* Risk badge in list */}
                  {item.risk ? (
                    <span className="shrink-0 rounded bg-red-500/20 px-1.5 py-0.5 text-[10px] font-medium text-red-400">
                      风险
                    </span>
                  ) : (
                    <span className="shrink-0 rounded bg-[#22d3ee]/20 px-1.5 py-0.5 text-[10px] font-medium text-[#22d3ee]">
                      安全
                    </span>
                  )}
                </div>
                <div className="ml-4 flex items-center gap-2 text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>
                  <span>{item.campaign}</span>
                  <span>·</span>
                  <span className={PRIORITY_COLORS[item.priority]}>
                    P{item.priority}
                  </span>
                  <span>·</span>
                  <span>{item.source === "ai" ? "AI 生成" : "人工编写"}</span>
                  <span>·</span>
                  <span>{item.timeAgo}</span>
                </div>
              </button>
            </div>
          ))}

          {filteredItems.length === 0 && (
            <div className="flex h-24 items-center justify-center text-sm" style={{ color: "rgba(255,255,255,0.25)" }}>
              暂无内容
            </div>
          )}
        </div>

        {/* Right: Content Preview (60%) */}
        {selected && (
          <div
            className="w-3/5 rounded-xl p-6 flex flex-col"
            style={{ background: "#0a0a0f", border: "1px solid rgba(255,255,255,0.08)" }}
          >
            {/* Preview Header */}
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-2">
                <span
                  className="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium"
                  style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.4)" }}
                >
                  {selected.platform}
                </span>
                <span
                  className="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium"
                  style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.4)" }}
                >
                  {selected.source === "ai" ? "AI 生成" : "人工编写"}
                </span>
                {/* Risk badge */}
                {selected.risk ? (
                  <span className="inline-flex items-center rounded-md bg-red-500/20 px-2 py-0.5 text-xs font-medium text-red-400">
                    风险
                  </span>
                ) : (
                  <span className="inline-flex items-center rounded-md bg-[#22d3ee]/20 px-2 py-0.5 text-xs font-medium text-[#22d3ee]">
                    安全
                  </span>
                )}
              </div>
              <h2 className="text-lg font-semibold text-white">
                {selected.title}
              </h2>
              <p className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.4)" }}>
                {selected.campaign} · {selected.timeAgo}
              </p>
            </div>

            {/* Content Body */}
            <div className="flex-1 overflow-y-auto mb-4">
              <div className="whitespace-pre-wrap text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.6)" }}>
                {selected.body}
              </div>

              {/* Tags */}
              <div className="flex flex-wrap gap-2 mt-4">
                {selected.tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs"
                    style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.4)" }}
                  >
                    {tag}
                  </span>
                ))}
              </div>

              {/* Risk Alert */}
              {selected.risk && (
                <div
                  className="mt-4 rounded-lg p-3"
                  style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}
                >
                  <div className="flex items-start gap-2">
                    <span className="text-red-400 text-sm mt-0.5">
                      ⚠
                    </span>
                    <div>
                      <p className="text-sm font-medium text-red-300">
                        风险检测
                      </p>
                      <p className="text-sm text-red-400 mt-0.5">
                        {selected.risk}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {!selected.risk && (
                <div
                  className="mt-4 rounded-lg p-3"
                  style={{ background: "rgba(34,211,238,0.08)", border: "1px solid rgba(34,211,238,0.2)" }}
                >
                  <div className="flex items-start gap-2">
                    <span className="text-[#22d3ee] text-sm mt-0.5">
                      ✓
                    </span>
                    <p className="text-sm text-[#22d3ee]">
                      安全检测通过，未发现风险内容
                    </p>
                  </div>
                </div>
              )}

              {/* Approval History */}
              {selectedHistory.length > 0 && (
                <div className="mt-6">
                  <h3 className="text-sm font-medium mb-3" style={{ color: "rgba(255,255,255,0.6)" }}>
                    审批记录
                  </h3>
                  <div className="space-y-2">
                    {selectedHistory.map((record) => (
                      <div
                        key={record.id}
                        className="flex items-start gap-3 rounded-lg p-3"
                        style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.08)" }}
                      >
                        <span
                          className={`mt-0.5 inline-block h-2 w-2 rounded-full shrink-0 ${
                            record.decision === "approved"
                              ? "bg-[#22d3ee]"
                              : record.decision === "rejected"
                              ? "bg-red-500"
                              : "bg-[#a78bfa]"
                          }`}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 text-xs">
                            <span className="font-medium" style={{ color: "rgba(255,255,255,0.6)" }}>
                              {record.reviewer}
                            </span>
                            <span
                              className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${
                                record.decision === "approved"
                                  ? "bg-[#22d3ee]/20 text-[#22d3ee]"
                                  : record.decision === "rejected"
                                  ? "bg-red-500/20 text-red-400"
                                  : "bg-[#a78bfa]/20 text-[#a78bfa]"
                              }`}
                            >
                              {record.decision === "approved"
                                ? "通过"
                                : record.decision === "rejected"
                                ? "退回"
                                : "修改"}
                            </span>
                            <span style={{ color: "rgba(255,255,255,0.25)" }}>
                              {new Date(record.created_at).toLocaleString("zh-CN")}
                            </span>
                          </div>
                          {record.comment && (
                            <p className="mt-1 text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>
                              {record.comment}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Action Bar */}
            {selected.decision === "pending" && (
              <div
                className="flex items-center justify-end gap-3 pt-4"
                style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}
              >
                <button
                  onClick={() => openDialog("reject", selected.id)}
                  disabled={actionLoading === selected.id}
                  className="h-9 rounded-lg px-4 text-sm font-medium transition-colors disabled:opacity-50 hover:bg-white/5"
                  style={{ border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.6)" }}
                >
                  退回修改
                </button>
                <button
                  onClick={() => openDialog("approve", selected.id)}
                  disabled={actionLoading === selected.id}
                  className="h-9 rounded-lg px-4 text-sm font-medium text-white transition-colors disabled:opacity-50"
                  style={{ background: "linear-gradient(135deg, #a78bfa, #7c3aed)" }}
                >
                  通过
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Approve/Reject Dialog */}
      <Dialog open={dialogMode !== null} onOpenChange={(open) => { if (!open) closeDialog(); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {dialogMode === "approve" ? "确认通过" : "退回修改"}
            </DialogTitle>
            <DialogDescription>
              {dialogMode === "approve"
                ? "确认通过该内容？可选填写审批备注。"
                : "退回该内容进行修改。请填写退回原因（必填）。"}
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <textarea
              value={dialogComment}
              onChange={(e) => setDialogComment(e.target.value)}
              placeholder={
                dialogMode === "approve"
                  ? "审批备注（选填）..."
                  : "退回原因（必填）..."
              }
              rows={3}
              className="w-full rounded-lg px-3 py-2 text-sm text-white outline-none focus:ring-1 focus:ring-[#a78bfa]"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.8)" }}
            />
          </div>
          <DialogFooter>
            <button
              onClick={closeDialog}
              className="h-9 rounded-lg px-4 text-sm font-medium transition-colors hover:bg-white/5"
              style={{ border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.6)" }}
            >
              取消
            </button>
            <button
              onClick={submitDecision}
              disabled={actionLoading !== null}
              className={`h-9 rounded-lg px-4 text-sm font-medium transition-colors disabled:opacity-50 ${
                dialogMode === "approve"
                  ? "bg-[#22d3ee] text-black hover:bg-[#22d3ee]/80"
                  : "bg-red-600 text-white hover:bg-red-700"
              }`}
            >
              {dialogMode === "approve" ? "确认通过" : "确认退回"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Action Dialog */}
      <Dialog open={bulkDialog !== null} onOpenChange={(open) => { if (!open) setBulkDialog(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {bulkDialog?.mode === "approve" ? "批量通过" : "批量退回"}
            </DialogTitle>
            <DialogDescription>
              {bulkDialog?.mode === "approve"
                ? `确认批量通过 ${bulkDialog?.ids.length ?? 0} 项内容？可选填写备注。`
                : `批量退回 ${bulkDialog?.ids.length ?? 0} 项内容。请填写退回原因（必填）。`}
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <textarea
              value={bulkComment}
              onChange={(e) => setBulkComment(e.target.value)}
              placeholder={
                bulkDialog?.mode === "approve"
                  ? "审批备注（选填）..."
                  : "退回原因（必填）..."
              }
              rows={3}
              className="w-full rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-[#a78bfa]"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.8)" }}
            />
          </div>
          <DialogFooter>
            <button
              onClick={() => setBulkDialog(null)}
              className="h-9 rounded-lg px-4 text-sm font-medium transition-colors hover:bg-white/5"
              style={{ border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.6)" }}
            >
              取消
            </button>
            <button
              onClick={submitBulkDecision}
              className={`h-9 rounded-lg px-4 text-sm font-medium transition-colors ${
                bulkDialog?.mode === "approve"
                  ? "bg-[#22d3ee] text-black hover:bg-[#22d3ee]/80"
                  : "bg-red-600 text-white hover:bg-red-700"
              }`}
            >
              {bulkDialog?.mode === "approve"
                ? `通过 ${bulkDialog?.ids.length ?? 0} 项`
                : `退回 ${bulkDialog?.ids.length ?? 0} 项`}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
