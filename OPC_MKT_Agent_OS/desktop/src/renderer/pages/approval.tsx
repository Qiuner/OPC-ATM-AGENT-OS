import React, { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Loader2,
  LayoutGrid,
  Sparkles,
  Clock,
  CheckCircle,
  Send,
  CheckCheck,
  ChevronRight,
  Check,
  X,
  Trash2,
} from "lucide-react";
import { getApi } from "@/lib/ipc";
import type { Content, ApprovalDecision, ApprovalRecord } from "@/types";

// --- Pipeline Stage definitions ---
type PipelineStageKey =
  | "generating"
  | "adapting"
  | "ai-review"
  | "pending"
  | "approved"
  | "publishing"
  | "published";

interface PipelineStageDef {
  key: PipelineStageKey;
  label: string;
  icon: React.ComponentType<
    React.SVGProps<SVGSVGElement> & { size?: number | string }
  >;
}

const PIPELINE_STAGES: PipelineStageDef[] = [
  { key: "generating", label: "Generating", icon: Loader2 },
  { key: "adapting", label: "Adapting", icon: LayoutGrid },
  { key: "ai-review", label: "AI Review", icon: Sparkles },
  { key: "pending", label: "Pending", icon: Clock },
  { key: "approved", label: "Approved", icon: CheckCircle },
  { key: "publishing", label: "Publishing", icon: Send },
  { key: "published", label: "Published", icon: CheckCheck },
];

// --- Approval item interface ---
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
  pipelineStage: PipelineStageKey;
  brandScore: number;
}

type TabKey = "all" | "pending" | "approved" | "rejected";

const TABS: { key: TabKey; label: string }[] = [
  { key: "all", label: "All" },
  { key: "pending", label: "Pending" },
  { key: "approved", label: "Approved" },
  { key: "rejected", label: "Rejected" },
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
    pipelineStage?: PipelineStageKey;
    brandScore?: number;
  };
  const createdDate = new Date(content.created_at);
  const now = new Date();
  const diffMs = now.getTime() - createdDate.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const timeAgo =
    diffHours < 24 ? `${diffHours}h ago` : `${Math.floor(diffHours / 24)}d ago`;

  let riskText: string | null = null;
  const rc = metadata?.riskCheck;
  if (rc) {
    if (typeof rc === "string" && rc !== "") {
      riskText = rc;
    } else if (
      typeof rc === "object" &&
      !rc.passed &&
      rc.warnings &&
      rc.warnings.length > 0
    ) {
      riskText = rc.warnings.join("; ");
    }
  }

  const decision = mapContentStatusToDecision(content.status);

  return {
    id: content.id,
    title: content.title,
    campaign: content.campaign_id,
    platform: content.platform,
    priority: 0,
    source: content.created_by === "agent" ? "ai" : "human",
    decision,
    timeAgo,
    body: content.body,
    tags: Array.isArray(metadata?.tags)
      ? metadata.tags.filter((t): t is string => typeof t === "string")
      : [],
    risk: riskText,
    fromApi: true,
    pipelineStage:
      metadata?.pipelineStage ??
      (decision === "approved" ? "approved" : "pending"),
    brandScore: metadata?.brandScore ?? 5,
  };
}

// --- Dialog types ---
type DialogMode = "approve" | "reject" | null;
type ApprovalMode = "auto" | "manual";

interface BulkDialogState {
  mode: "approve" | "reject";
  ids: string[];
}

interface DeleteConfirmState {
  type: "single" | "bulk";
  ids: string[];
  title?: string;
  count?: number;
}

export function ApprovalPage(): React.JSX.Element {
  const [items, setItems] = useState<ApprovalItem[]>([]);
  const [activeTab, setActiveTab] = useState<TabKey>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Pipeline filter
  const [activeStage, setActiveStage] = useState<PipelineStageKey | null>(null);

  // Approval mode
  const [approvalMode, setApprovalMode] = useState<ApprovalMode>("manual");
  const [autoThreshold, setAutoThreshold] = useState(7);
  const [showModeConfirm, setShowModeConfirm] = useState(false);

  // Dialog state
  const [dialogMode, setDialogMode] = useState<DialogMode>(null);
  const [dialogComment, setDialogComment] = useState("");
  const [dialogItemId, setDialogItemId] = useState<string | null>(null);

  // Bulk selection
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());
  const [bulkDialog, setBulkDialog] = useState<BulkDialogState | null>(null);
  const [bulkComment, setBulkComment] = useState("");

  // Delete confirmation
  const [deleteConfirm, setDeleteConfirm] = useState<DeleteConfirmState | null>(
    null
  );

  // Approval history
  const [approvalHistory, setApprovalHistory] = useState<
    Record<string, ApprovalRecord[]>
  >({});

  const fetchSettings = useCallback(async () => {
    try {
      const api = getApi();
      if (!api) return;
      const res = await api.settings.get();
      const json = res as {
        success: boolean;
        data?: {
          approval?: { mode: ApprovalMode; autoThreshold: number };
        };
      };
      if (json.success && json.data?.approval) {
        setApprovalMode(json.data.approval.mode);
        setAutoThreshold(json.data.approval.autoThreshold ?? 7);
      }
    } catch {
      // fallback to manual
    }
  }, []);

  const fetchContents = useCallback(async () => {
    try {
      const api = getApi();
      if (!api) return;
      const res = await api.contents.list();
      if (res.success && res.data && res.data.length > 0) {
        const apiItems = res.data.map(mapContentToItem);
        setItems(apiItems);
        setSelectedId(apiItems[0].id);
      }
    } catch {
      // empty state on error
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchApprovalHistory = useCallback(async (contentId: string) => {
    try {
      const api = getApi();
      if (!api) return;
      const res = await api.approvals.list({
        content_id: contentId,
      });
      const json = res as { success: boolean; data?: ApprovalRecord[] };
      if (json.success && json.data) {
        setApprovalHistory((prev) => ({
          ...prev,
          [contentId]: json.data as ApprovalRecord[],
        }));
      }
    } catch {
      // silent fail
    }
  }, []);

  useEffect(() => {
    fetchContents();
    fetchSettings();
  }, [fetchContents, fetchSettings]);

  useEffect(() => {
    if (selectedId) {
      fetchApprovalHistory(selectedId);
    }
  }, [selectedId, fetchApprovalHistory]);

  // --- Auto-approval logic ---
  useEffect(() => {
    if (approvalMode !== "auto") return;

    const pendingAutoApprove = items.filter(
      (item) =>
        item.decision === "pending" &&
        item.brandScore >= autoThreshold &&
        !item.risk
    );

    if (pendingAutoApprove.length === 0) return;

    setItems((prev) =>
      prev.map((item) =>
        pendingAutoApprove.some((p) => p.id === item.id)
          ? {
              ...item,
              decision: "approved" as ApprovalDecision,
              pipelineStage: "approved" as PipelineStageKey,
            }
          : item
      )
    );

    const api = getApi();
    if (!api) return;

    for (const item of pendingAutoApprove) {
      (async () => {
        try {
          await api.approvals.create({
            content_id: item.id,
            decision: "approved",
            comment: `Auto-approved: brandScore ${item.brandScore} >= ${autoThreshold}`,
            reviewer: "brand-reviewer-agent",
          });
          await api.contents.update(item.id, { status: "approved" });
        } catch {
          // silent
        }
      })();
    }

    toast.success(
      `Auto-approved ${pendingAutoApprove.length} item${pendingAutoApprove.length > 1 ? "s" : ""} (score >= ${autoThreshold})`
    );
  }, [approvalMode, autoThreshold, items.length]); // eslint-disable-line react-hooks/exhaustive-deps

  // --- Pipeline stage filter ---
  const handleStageFilter = (key: PipelineStageKey) => {
    setActiveStage((prev) => (prev === key ? null : key));
  };

  const stageCounts: Record<PipelineStageKey, number> = {
    generating: 0,
    adapting: 0,
    "ai-review": 0,
    pending: 0,
    approved: 0,
    publishing: 0,
    published: 0,
  };
  for (const item of items) {
    if (item.pipelineStage in stageCounts) {
      stageCounts[item.pipelineStage]++;
    }
  }

  // --- Approval mode toggle ---
  const handleModeToggle = async () => {
    const newMode = approvalMode === "auto" ? "manual" : "auto";
    setApprovalMode(newMode);
    setShowModeConfirm(false);

    try {
      const api = getApi();
      if (!api) return;
      await api.settings.update({
        approval: { mode: newMode, autoThreshold },
      });
      toast.success(
        `Switched to ${newMode === "auto" ? "Auto" : "Manual"} approval mode`
      );
    } catch {
      setApprovalMode(approvalMode);
      toast.error("Failed to update approval mode");
    }
  };

  // --- Single item approve/reject ---
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

    if (dialogMode === "reject" && dialogComment.trim() === "") {
      toast.error("Rejection reason is required");
      return;
    }

    const decision: ApprovalRecord["decision"] =
      dialogMode === "approve" ? "approved" : "rejected";
    const newPipelineStage: PipelineStageKey =
      dialogMode === "approve" ? "approved" : "pending";
    setActionLoading(dialogItemId);

    setItems((prev) =>
      prev.map((item) =>
        item.id === dialogItemId
          ? { ...item, decision: decision as ApprovalDecision, pipelineStage: newPipelineStage }
          : item
      )
    );

    try {
      const api = getApi();
      if (!api) throw new Error("No API");

      await api.approvals.create({
        content_id: dialogItemId,
        decision,
        comment: dialogComment,
        reviewer: "user-001",
      });

      const newStatus =
        dialogMode === "approve" ? "approved" : "rejected";
      const res = await api.contents.update(dialogItemId, {
        status: newStatus,
        metadata: { pipelineStage: newPipelineStage },
      });

      if (!res.success) {
        setItems((prev) =>
          prev.map((item) =>
            item.id === dialogItemId
              ? { ...item, decision: "pending" as ApprovalDecision, pipelineStage: "pending" as PipelineStageKey }
              : item
          )
        );
        toast.error("Operation failed, please retry");
      } else {
        toast.success(
          dialogMode === "approve"
            ? "Approved"
            : "Rejected \u2014 sent back for revision"
        );
        fetchApprovalHistory(dialogItemId);
      }
    } catch {
      setItems((prev) =>
        prev.map((item) =>
          item.id === dialogItemId
            ? { ...item, decision: "pending" as ApprovalDecision, pipelineStage: "pending" as PipelineStageKey }
            : item
        )
      );
      toast.error("Network error, please retry");
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

  let filteredItems =
    activeTab === "all"
      ? items
      : items.filter((item) => item.decision === activeTab);

  if (activeStage) {
    filteredItems = filteredItems.filter(
      (item) => item.pipelineStage === activeStage
    );
  }

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
      toast.warning("Select pending items first");
      return;
    }
    setBulkDialog({ mode, ids });
    setBulkComment("");
  };

  const submitBulkDecision = async () => {
    if (!bulkDialog) return;

    if (bulkDialog.mode === "reject" && bulkComment.trim() === "") {
      toast.error("Rejection reason is required for bulk reject");
      return;
    }

    const decision: ApprovalRecord["decision"] =
      bulkDialog.mode === "approve" ? "approved" : "rejected";

    setItems((prev) =>
      prev.map((item) =>
        bulkDialog.ids.includes(item.id)
          ? { ...item, decision: decision as ApprovalDecision }
          : item
      )
    );

    const api = getApi();
    if (!api) return;

    let successCount = 0;
    let failCount = 0;

    for (const id of bulkDialog.ids) {
      try {
        await api.approvals.create({
          content_id: id,
          decision,
          comment: bulkComment,
          reviewer: "user-001",
        });

        const newStatus =
          bulkDialog.mode === "approve" ? "approved" : "rejected";
        await api.contents.update(id, { status: newStatus });
        successCount++;
      } catch {
        failCount++;
        setItems((prev) =>
          prev.map((item) =>
            item.id === id
              ? { ...item, decision: "pending" as ApprovalDecision }
              : item
          )
        );
      }
    }

    if (successCount > 0) {
      toast.success(
        `${bulkDialog.mode === "approve" ? "Bulk approved" : "Bulk rejected"} ${successCount} items`
      );
    }
    if (failCount > 0) {
      toast.error(`${failCount} items failed`);
    }

    setCheckedIds(new Set());
    setBulkDialog(null);
    setBulkComment("");

    if (selectedId) {
      fetchApprovalHistory(selectedId);
    }
  };

  // --- Delete actions ---
  const openDeleteConfirm = (id: string) => {
    const item = items.find((i) => i.id === id);
    setDeleteConfirm({ type: "single", ids: [id], title: item?.title });
  };

  const openBulkDeleteConfirm = () => {
    const ids = Array.from(checkedIds);
    if (ids.length === 0) return;
    setDeleteConfirm({ type: "bulk", ids, count: ids.length });
  };

  const handleConfirmDelete = async () => {
    if (!deleteConfirm) return;
    const api = getApi();
    if (!api) return;

    for (const id of deleteConfirm.ids) {
      try {
        await api.contents.delete(id);
      } catch {
        /* skip */
      }
    }
    setItems((prev) =>
      prev.filter((i) => !deleteConfirm.ids.includes(i.id))
    );
    setCheckedIds((prev) => {
      const next = new Set(prev);
      deleteConfirm.ids.forEach((id) => next.delete(id));
      return next;
    });
    toast.success(
      `Deleted ${deleteConfirm.ids.length} item${deleteConfirm.ids.length > 1 ? "s" : ""}`
    );
    setDeleteConfirm(null);
  };

  const selected =
    (selectedId ? items.find((item) => item.id === selectedId) : null) ??
    items[0] ??
    null;
  const pendingCount = items.filter((i) => i.decision === "pending").length;
  const checkedPendingCount = Array.from(checkedIds).filter((id) => {
    const item = items.find((i) => i.id === id);
    return item?.decision === "pending";
  }).length;

  const selectedHistory = selectedId
    ? (approvalHistory[selectedId] ?? [])
    : [];

  return (
    <div className="space-y-5">
      {/* Header with Approval Mode Toggle */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Approval Center</h1>
        <div className="flex items-center gap-3">
          {checkedPendingCount > 0 && (
            <div className="flex items-center gap-2">
              <span
                className="text-sm"
                style={{ color: "var(--muted-foreground)" }}
              >
                {checkedPendingCount} selected
              </span>
              <button
                onClick={() => openBulkDialog("approve")}
                className="h-8 rounded-lg bg-[#22d3ee] px-3 text-xs font-medium text-black hover:bg-[#22d3ee]/80 transition-colors"
              >
                Bulk Approve
              </button>
              <button
                onClick={() => openBulkDialog("reject")}
                className="h-8 rounded-lg px-3 text-xs font-medium text-red-400 hover:bg-red-500/10 transition-colors"
                style={{ border: "1px solid rgba(239,68,68,0.3)" }}
              >
                Bulk Reject
              </button>
              <button
                onClick={() => openBulkDeleteConfirm()}
                className="h-8 rounded-lg px-3 text-xs font-medium transition-colors hover:bg-red-500/10"
                style={{
                  color: "var(--muted-foreground)",
                  border: "1px solid var(--border)",
                }}
              >
                <Trash2 className="size-3 mr-1 inline" />
                Bulk Delete
              </button>
            </div>
          )}

          {/* Approval Mode Toggle */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span
                className={`text-xs font-medium ${approvalMode === "auto" ? "text-[#a78bfa]" : ""}`}
                style={
                  approvalMode !== "auto"
                    ? { color: "var(--muted-foreground)" }
                    : undefined
                }
              >
                Auto
              </span>
              <button
                onClick={() => setShowModeConfirm(true)}
                className={`relative w-11 h-6 rounded-full transition-all duration-200 ${
                  approvalMode === "auto" ? "bg-[#a78bfa]" : "bg-white/15"
                }`}
              >
                <span
                  className={`absolute top-0.5 size-5 rounded-full bg-white shadow transition-transform duration-200 ${
                    approvalMode === "manual"
                      ? "translate-x-[22px]"
                      : "translate-x-0.5"
                  }`}
                />
              </button>
              <span
                className={`text-xs font-medium ${approvalMode === "manual" ? "text-white" : ""}`}
                style={
                  approvalMode !== "manual"
                    ? { color: "var(--muted-foreground)" }
                    : undefined
                }
              >
                Manual
              </span>
            </div>
            {approvalMode === "auto" && (
              <span
                className="text-[11px] rounded-md px-2 py-0.5"
                style={{
                  background: "rgba(167,139,250,0.08)",
                  color: "#a78bfa",
                }}
              >
                Score &ge; {autoThreshold} auto-approved
              </span>
            )}
          </div>

          {loading && (
            <span
              className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-t-[#a78bfa]"
              style={{
                borderColor: "var(--border)",
                borderTopColor: "#a78bfa",
              }}
            />
          )}
        </div>
      </div>

      {/* Pipeline Status Bar */}
      <div
        className="flex items-center rounded-xl px-4 py-3.5 overflow-x-auto"
        style={{
          background: "var(--muted)",
          border: "1px solid var(--border)",
        }}
      >
        {PIPELINE_STAGES.map((stage, idx) => (
          <React.Fragment key={stage.key}>
            <button
              onClick={() => handleStageFilter(stage.key)}
              className={`flex items-center gap-2 rounded-lg px-3 py-2 transition-all shrink-0 ${
                activeStage === stage.key
                  ? "font-medium"
                  : "dark:hover:bg-white/[0.04] hover:bg-black/[0.04]"
              }`}
              style={
                activeStage === stage.key
                  ? {
                      background: "rgba(167,139,250,0.10)",
                      border: "1px solid rgba(167,139,250,0.20)",
                    }
                  : {}
              }
            >
              <stage.icon
                className={`size-4 ${activeStage === stage.key ? "text-[#a78bfa]" : ""}`}
                style={
                  activeStage !== stage.key
                    ? { color: "var(--muted-foreground)" }
                    : undefined
                }
              />
              <span
                className={`text-xs ${activeStage === stage.key ? "text-white" : ""}`}
                style={
                  activeStage !== stage.key
                    ? { color: "var(--muted-foreground)" }
                    : undefined
                }
              >
                {stage.label}
              </span>
              <span
                className={`inline-flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-[10px] font-semibold ${
                  activeStage === stage.key
                    ? "bg-[#a78bfa]/20 text-[#a78bfa]"
                    : stage.key === "pending" && stageCounts[stage.key] > 0
                      ? "bg-amber-500/20 text-amber-400"
                      : (stage.key === "approved" ||
                            stage.key === "published") &&
                          stageCounts[stage.key] > 0
                        ? "bg-[#22d3ee]/20 text-[#22d3ee]"
                        : "dark:bg-white/[0.06] bg-black/[0.04] text-muted-foreground"
                }`}
              >
                {stageCounts[stage.key]}
              </span>
            </button>
            {idx < PIPELINE_STAGES.length - 1 && (
              <div className="flex items-center mx-1 shrink-0">
                <div
                  className="w-4 h-px"
                  style={{ background: "var(--muted)" }}
                />
                <ChevronRight
                  className="size-3"
                  style={{ color: "var(--muted-foreground)" }}
                />
              </div>
            )}
          </React.Fragment>
        ))}
      </div>

      {/* Tabs */}
      <div
        className="flex items-center gap-1"
        style={{ borderBottom: "1px solid var(--border)" }}
      >
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.key
                ? "border-[#a78bfa] text-white"
                : "border-transparent hover:text-white/80"
            }`}
            style={
              activeTab !== tab.key
                ? { color: "var(--muted-foreground)" }
                : undefined
            }
          >
            {tab.label}
            {tab.key === "pending" && (
              <span className="ml-1.5 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-amber-500/20 px-1.5 text-xs font-medium text-amber-400">
                {pendingCount}
              </span>
            )}
          </button>
        ))}

        <div className="ml-auto flex items-center gap-2 px-2">
          <label
            className="flex items-center gap-1.5 text-xs cursor-pointer select-none"
            style={{ color: "var(--muted-foreground)" }}
          >
            <input
              type="checkbox"
              checked={
                filteredItems.filter((i) => i.decision === "pending").length >
                  0 &&
                filteredItems
                  .filter((i) => i.decision === "pending")
                  .every((i) => checkedIds.has(i.id))
              }
              onChange={toggleAllPending}
              className="h-3.5 w-3.5 rounded accent-[#a78bfa]"
              style={{ borderColor: "var(--border)" }}
            />
            Select all pending
          </label>
        </div>
      </div>

      {/* Main Layout: List + Preview */}
      <div className="flex gap-4 min-h-[calc(100vh-320px)]">
        {/* Left: Approval List (40%) */}
        <div className="w-2/5 space-y-1 overflow-y-auto">
          {filteredItems.map((item) => (
            <div
              key={item.id}
              className={`group relative flex items-start gap-2 rounded-lg px-3 py-3 transition-colors ${
                selectedId === item.id
                  ? "border-l-2 border-[#a78bfa] bg-[#a78bfa]/5"
                  : "border-l-2 border-transparent dark:hover:bg-white/[0.02] hover:bg-black/[0.02]"
              }`}
            >
              {item.decision === "pending" && (
                <input
                  type="checkbox"
                  checked={checkedIds.has(item.id)}
                  onChange={() => toggleCheck(item.id)}
                  className="mt-1 h-3.5 w-3.5 shrink-0 rounded accent-[#a78bfa]"
                  style={{ borderColor: "var(--border)" }}
                />
              )}
              {item.decision !== "pending" && (
                <div className="w-3.5 shrink-0" />
              )}

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
                  {item.risk ? (
                    <span className="shrink-0 rounded bg-red-500/20 px-1.5 py-0.5 text-[10px] font-medium text-red-400">
                      Risk
                    </span>
                  ) : (
                    <span className="shrink-0 rounded bg-[#22d3ee]/20 px-1.5 py-0.5 text-[10px] font-medium text-[#22d3ee]">
                      Safe
                    </span>
                  )}
                  <span
                    className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium ${
                      item.brandScore >= 7
                        ? "bg-[#22d3ee]/20 text-[#22d3ee]"
                        : item.brandScore >= 5
                          ? "bg-amber-500/20 text-amber-400"
                          : "bg-red-500/20 text-red-400"
                    }`}
                  >
                    {item.brandScore.toFixed(1)}
                  </span>
                </div>
                <div
                  className="ml-4 flex items-center gap-2 text-xs"
                  style={{ color: "var(--muted-foreground)" }}
                >
                  <span>{item.campaign}</span>
                  <span>&middot;</span>
                  <span className={PRIORITY_COLORS[item.priority]}>
                    P{item.priority}
                  </span>
                  <span>&middot;</span>
                  <span>
                    {item.source === "ai" ? "AI Generated" : "Human"}
                  </span>
                  <span>&middot;</span>
                  <span>{item.timeAgo}</span>
                </div>
              </button>

              {/* Hover quick actions */}
              {item.decision === "pending" && (
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      openDialog("approve", item.id);
                    }}
                    className="flex items-center justify-center size-7 rounded-md transition-colors hover:bg-[#22d3ee]/10"
                    title="Approve"
                  >
                    <Check className="size-4 text-[#22d3ee]" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      openDialog("reject", item.id);
                    }}
                    className="flex items-center justify-center size-7 rounded-md transition-colors hover:bg-red-500/10"
                    title="Reject"
                  >
                    <X className="size-4 text-red-400" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      openDeleteConfirm(item.id);
                    }}
                    className="flex items-center justify-center size-7 rounded-md transition-colors hover:bg-red-500/10"
                    title="Delete"
                  >
                    <Trash2 className="size-3.5 text-red-400" />
                  </button>
                </div>
              )}
            </div>
          ))}

          {filteredItems.length === 0 && (
            <div
              className="flex h-24 items-center justify-center text-sm"
              style={{ color: "var(--muted-foreground)" }}
            >
              No items
            </div>
          )}
        </div>

        {/* Right: Content Preview (60%) */}
        {selected && (
          <div
            className="w-3/5 rounded-xl p-6 flex flex-col"
            style={{
              background: "var(--card)",
              border: "1px solid var(--border)",
            }}
          >
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-2">
                <span
                  className="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium"
                  style={{
                    background: "var(--muted)",
                    color: "var(--muted-foreground)",
                  }}
                >
                  {selected.platform}
                </span>
                <span
                  className="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium"
                  style={{
                    background: "var(--muted)",
                    color: "var(--muted-foreground)",
                  }}
                >
                  {selected.source === "ai" ? "AI Generated" : "Human"}
                </span>
                {selected.risk ? (
                  <span className="inline-flex items-center rounded-md bg-red-500/20 px-2 py-0.5 text-xs font-medium text-red-400">
                    Risk
                  </span>
                ) : (
                  <span className="inline-flex items-center rounded-md bg-[#22d3ee]/20 px-2 py-0.5 text-xs font-medium text-[#22d3ee]">
                    Safe
                  </span>
                )}
                <span
                  className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${
                    selected.brandScore >= 7
                      ? "bg-[#22d3ee]/20 text-[#22d3ee]"
                      : selected.brandScore >= 5
                        ? "bg-amber-500/20 text-amber-400"
                        : "bg-red-500/20 text-red-400"
                  }`}
                >
                  Score: {selected.brandScore.toFixed(1)}
                </span>
              </div>
              <h2 className="text-lg font-semibold text-foreground">
                {selected.title}
              </h2>
              <p
                className="text-xs mt-1"
                style={{ color: "var(--muted-foreground)" }}
              >
                {selected.campaign} &middot; {selected.timeAgo}
              </p>
            </div>

            <div className="flex-1 overflow-y-auto mb-4">
              <div
                className="whitespace-pre-wrap text-sm leading-relaxed"
                style={{ color: "var(--muted-foreground)" }}
              >
                {selected.body}
              </div>

              <div className="flex flex-wrap gap-2 mt-4">
                {selected.tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs"
                    style={{
                      background: "var(--muted)",
                      color: "var(--muted-foreground)",
                    }}
                  >
                    {tag}
                  </span>
                ))}
              </div>

              {selected.risk && (
                <div
                  className="mt-4 rounded-lg p-3"
                  style={{
                    background: "rgba(239,68,68,0.08)",
                    border: "1px solid rgba(239,68,68,0.2)",
                  }}
                >
                  <div className="flex items-start gap-2">
                    <span className="text-red-400 text-sm mt-0.5">
                      &#9888;
                    </span>
                    <div>
                      <p className="text-sm font-medium text-red-300">
                        Risk Detection
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
                  style={{
                    background: "rgba(34,211,238,0.08)",
                    border: "1px solid rgba(34,211,238,0.2)",
                  }}
                >
                  <div className="flex items-start gap-2">
                    <span className="text-[#22d3ee] text-sm mt-0.5">
                      &#10003;
                    </span>
                    <p className="text-sm text-[#22d3ee]">
                      Safety check passed — no risks detected
                    </p>
                  </div>
                </div>
              )}

              {selectedHistory.length > 0 && (
                <div className="mt-6">
                  <h3
                    className="text-sm font-medium mb-3"
                    style={{ color: "var(--muted-foreground)" }}
                  >
                    Approval History
                  </h3>
                  <div className="space-y-2">
                    {selectedHistory.map((record) => (
                      <div
                        key={record.id}
                        className="flex items-start gap-3 rounded-lg p-3"
                        style={{
                          background: "var(--muted)",
                          border: "1px solid var(--border)",
                        }}
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
                            <span
                              className="font-medium"
                              style={{ color: "var(--muted-foreground)" }}
                            >
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
                                ? "Approved"
                                : record.decision === "rejected"
                                  ? "Rejected"
                                  : "Revision"}
                            </span>
                            <span
                              style={{ color: "var(--muted-foreground)" }}
                            >
                              {new Date(
                                record.created_at
                              ).toLocaleString("en-US")}
                            </span>
                          </div>
                          {record.comment && (
                            <p
                              className="mt-1 text-xs"
                              style={{ color: "var(--muted-foreground)" }}
                            >
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
                style={{ borderTop: "1px solid var(--border)" }}
              >
                <button
                  onClick={() => openDialog("reject", selected.id)}
                  disabled={actionLoading === selected.id}
                  className="h-9 rounded-lg px-4 text-sm font-medium transition-colors disabled:opacity-50 hover:bg-white/5"
                  style={{
                    border: "1px solid var(--border)",
                    color: "var(--muted-foreground)",
                  }}
                >
                  Reject
                </button>
                <button
                  onClick={() => openDialog("approve", selected.id)}
                  disabled={actionLoading === selected.id}
                  className="h-9 rounded-lg px-4 text-sm font-medium text-white transition-colors disabled:opacity-50"
                  style={{
                    background: "linear-gradient(135deg, #a78bfa, #7c3aed)",
                  }}
                >
                  Approve
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Approve/Reject Dialog */}
      <Dialog
        open={dialogMode !== null}
        onOpenChange={(open) => {
          if (!open) closeDialog();
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {dialogMode === "approve"
                ? "Confirm Approval"
                : "Reject \u2014 Send Back"}
            </DialogTitle>
            <DialogDescription>
              {dialogMode === "approve"
                ? "Approve this content? You may add an optional note."
                : "Reject this content and send it back for revision. Reason is required."}
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <textarea
              value={dialogComment}
              onChange={(e) => setDialogComment(e.target.value)}
              placeholder={
                dialogMode === "approve"
                  ? "Note (optional)..."
                  : "Rejection reason (required)..."
              }
              rows={3}
              className="w-full rounded-lg px-3 py-2 text-sm text-white outline-none focus:ring-1 focus:ring-[#a78bfa]"
              style={{
                background: "var(--muted)",
                border: "1px solid var(--border)",
                color: "var(--foreground)",
              }}
            />
          </div>
          <DialogFooter>
            <button
              onClick={closeDialog}
              className="h-9 rounded-lg px-4 text-sm font-medium transition-colors hover:bg-white/5"
              style={{
                border: "1px solid var(--border)",
                color: "var(--muted-foreground)",
              }}
            >
              Cancel
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
              {dialogMode === "approve"
                ? "Confirm Approve"
                : "Confirm Reject"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Action Dialog */}
      <Dialog
        open={bulkDialog !== null}
        onOpenChange={(open) => {
          if (!open) setBulkDialog(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {bulkDialog?.mode === "approve"
                ? "Bulk Approve"
                : "Bulk Reject"}
            </DialogTitle>
            <DialogDescription>
              {bulkDialog?.mode === "approve"
                ? `Approve ${bulkDialog?.ids.length ?? 0} items? You may add an optional note.`
                : `Reject ${bulkDialog?.ids.length ?? 0} items and send back for revision. Reason is required.`}
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <textarea
              value={bulkComment}
              onChange={(e) => setBulkComment(e.target.value)}
              placeholder={
                bulkDialog?.mode === "approve"
                  ? "Note (optional)..."
                  : "Rejection reason (required)..."
              }
              rows={3}
              className="w-full rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-[#a78bfa]"
              style={{
                background: "var(--muted)",
                border: "1px solid var(--border)",
                color: "var(--foreground)",
              }}
            />
          </div>
          <DialogFooter>
            <button
              onClick={() => setBulkDialog(null)}
              className="h-9 rounded-lg px-4 text-sm font-medium transition-colors hover:bg-white/5"
              style={{
                border: "1px solid var(--border)",
                color: "var(--muted-foreground)",
              }}
            >
              Cancel
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
                ? `Approve ${bulkDialog?.ids.length ?? 0} items`
                : `Reject ${bulkDialog?.ids.length ?? 0} items`}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Mode Confirm Dialog */}
      <Dialog open={showModeConfirm} onOpenChange={setShowModeConfirm}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Switch Approval Mode</DialogTitle>
            <DialogDescription>
              {approvalMode === "auto"
                ? "Switch to Manual mode? All content will require human review before publishing."
                : `Switch to Auto mode? Content with brand score >= ${autoThreshold} and no risk will be auto-approved.`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <button
              onClick={() => setShowModeConfirm(false)}
              className="h-9 rounded-lg px-4 text-sm font-medium transition-colors hover:bg-white/5"
              style={{
                border: "1px solid var(--border)",
                color: "var(--muted-foreground)",
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleModeToggle}
              className="h-9 rounded-lg px-4 text-sm font-medium text-white transition-colors"
              style={{
                background: "linear-gradient(135deg, #a78bfa, #7c3aed)",
              }}
            >
              Confirm Switch
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteConfirm !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteConfirm(null);
        }}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-red-400">
              Confirm Delete
            </DialogTitle>
            <DialogDescription>
              {deleteConfirm?.type === "single"
                ? `Delete "${deleteConfirm.title}"? This action cannot be undone.`
                : `Delete ${deleteConfirm?.count} items? This action cannot be undone.`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <button
              onClick={() => setDeleteConfirm(null)}
              className="h-9 rounded-lg px-4 text-sm font-medium transition-colors hover:bg-white/5"
              style={{
                border: "1px solid var(--border)",
                color: "var(--muted-foreground)",
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleConfirmDelete}
              className="h-9 rounded-lg bg-red-600 px-4 text-sm font-medium text-white transition-colors hover:bg-red-700"
            >
              Confirm Delete
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
