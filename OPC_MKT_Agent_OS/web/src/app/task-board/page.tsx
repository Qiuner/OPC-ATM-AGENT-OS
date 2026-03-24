"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { Task, TaskStatus } from "@/types";

// --------------- Types ---------------

interface TaskCard {
  id: string;
  title: string;
  platform: string;
  priority: 0 | 1 | 2;
  dueDate: string;
  status: TaskStatus;
  campaign: string;
  source: "api" | "mock";
}

interface NewTaskForm {
  title: string;
  platform: string;
  priority: 0 | 1 | 2;
  campaign: string;
  dueDate: string;
}

// --------------- Constants ---------------

const COLUMNS: { key: TaskStatus; label: string }[] = [
  { key: "backlog", label: "Backlog" },
  { key: "draft", label: "Draft" },
  { key: "review", label: "Review" },
  { key: "approved", label: "Approved" },
  { key: "scheduled", label: "Scheduled" },
  { key: "published", label: "Published" },
];

const PLATFORM_ICONS: Record<string, string> = {
  "小红书": "📕",
  "抖音": "🎵",
  "即刻": "⚡",
  X: "𝕏",
  "视频号": "📹",
};

const PLATFORM_OPTIONS = ["小红书", "抖音", "即刻", "X", "视频号"];

const MOCK_CAMPAIGNS = ["春季推广", "品牌曝光", "内容营销", "社区运营", "用户教育", "用户增长"];

const MOCK_TASKS: TaskCard[] = [
  { id: "T-001", title: "小红书种草笔记 — 春季新品推荐", platform: "小红书", priority: 0, dueDate: "03-12", status: "backlog", campaign: "春季推广", source: "mock" },
  { id: "T-002", title: "抖音短视频脚本构思", platform: "抖音", priority: 1, dueDate: "03-14", status: "backlog", campaign: "品牌曝光", source: "mock" },
  { id: "T-003", title: "即刻社区互动帖子", platform: "即刻", priority: 2, dueDate: "03-15", status: "backlog", campaign: "社区运营", source: "mock" },
  { id: "T-004", title: "品牌故事视频脚本 — 创始人专访", platform: "抖音", priority: 0, dueDate: "03-11", status: "draft", campaign: "品牌曝光", source: "mock" },
  { id: "T-005", title: "X 推文线程 — AI 工具盘点", platform: "X", priority: 1, dueDate: "03-13", status: "draft", campaign: "内容营销", source: "mock" },
  { id: "T-006", title: "小红书教程 — 10分钟上手指南", platform: "小红书", priority: 1, dueDate: "03-16", status: "draft", campaign: "用户教育", source: "mock" },
  { id: "T-007", title: "产品对比测评 — 3款热门工具横评", platform: "小红书", priority: 0, dueDate: "03-10", status: "review", campaign: "内容营销", source: "mock" },
  { id: "T-008", title: "用户案例分享 — 效率提升300%", platform: "即刻", priority: 1, dueDate: "03-11", status: "review", campaign: "用户增长", source: "mock" },
  { id: "T-009", title: "春季活动预热 — 限时优惠海报", platform: "小红书", priority: 0, dueDate: "03-09", status: "approved", campaign: "春季推广", source: "mock" },
  { id: "T-010", title: "AI 工具推荐合集", platform: "X", priority: 1, dueDate: "03-10", status: "scheduled", campaign: "内容营销", source: "mock" },
  { id: "T-011", title: "创始人故事 — 从0到1的旅程", platform: "视频号", priority: 1, dueDate: "03-11", status: "scheduled", campaign: "品牌曝光", source: "mock" },
  { id: "T-012", title: "开箱测评 — 新品首发体验", platform: "抖音", priority: 0, dueDate: "03-08", status: "published", campaign: "春季推广", source: "mock" },
  { id: "T-013", title: "FAQ 合集 — 用户高频问题解答", platform: "小红书", priority: 2, dueDate: "03-07", status: "published", campaign: "用户教育", source: "mock" },
  { id: "T-014", title: "产品功能深度解析", platform: "即刻", priority: 1, dueDate: "03-06", status: "published", campaign: "内容营销", source: "mock" },
];

const PRIORITY_COLORS: Record<number, string> = {
  0: "bg-red-500",
  1: "bg-yellow-400",
  2: "bg-[rgba(255,255,255,0.25)]",
};

const PRIORITY_LABELS: Record<number, string> = {
  0: "P0",
  1: "P1",
  2: "P2",
};

// --------------- Helpers ---------------

function extractPlatform(title: string): string {
  const platforms = ["小红书", "抖音", "即刻", "X", "视频号"];
  for (const p of platforms) {
    if (title.includes(p)) return p;
  }
  return "小红书";
}

function mapTaskToCard(task: Task): TaskCard {
  const dueDate = task.due_date
    ? new Date(task.due_date).toLocaleDateString("zh-CN", { month: "2-digit", day: "2-digit" }).replace("/", "-")
    : "--";
  const priority = Math.min(Math.max(task.priority, 0), 2) as 0 | 1 | 2;

  return {
    id: task.id,
    title: task.title,
    platform: extractPlatform(task.title),
    priority,
    dueDate,
    status: task.status,
    campaign: task.campaign_id,
    source: "api",
  };
}

// --------------- Toast ---------------

function Toast({ message, onClose }: { message: string; onClose: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 2500);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className="fixed bottom-6 right-6 z-50 animate-in fade-in slide-in-from-bottom-4 duration-200">
      <div
        className="rounded-lg px-4 py-2.5 text-sm text-white shadow-lg"
        style={{ backgroundColor: "#0a0a0f", border: "1px solid rgba(255,255,255,0.08)" }}
      >
        {message}
      </div>
    </div>
  );
}

// --------------- Status Dropdown ---------------

function StatusDropdown({
  currentStatus,
  onSelect,
  onClose,
}: {
  currentStatus: TaskStatus;
  onSelect: (status: TaskStatus) => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

  return (
    <div
      ref={ref}
      className="absolute left-0 top-full z-40 mt-1 w-36 rounded-lg py-1 shadow-lg"
      style={{
        backgroundColor: "#0a0a0f",
        border: "1px solid rgba(255,255,255,0.08)",
      }}
    >
      <p
        className="px-3 py-1 text-[10px] font-medium uppercase tracking-wide"
        style={{ color: "rgba(255,255,255,0.25)" }}
      >
        移动到
      </p>
      {COLUMNS.map((col) => (
        <button
          key={col.key}
          onClick={(e) => {
            e.stopPropagation();
            onSelect(col.key);
          }}
          disabled={col.key === currentStatus}
          className="w-full px-3 py-1.5 text-left text-xs transition-colors"
          style={{
            color:
              col.key === currentStatus
                ? "rgba(255,255,255,0.25)"
                : "rgba(255,255,255,0.6)",
            backgroundColor:
              col.key === currentStatus
                ? "rgba(255,255,255,0.02)"
                : "transparent",
            cursor: col.key === currentStatus ? "default" : "pointer",
          }}
          onMouseEnter={(e) => {
            if (col.key !== currentStatus) {
              (e.currentTarget as HTMLElement).style.backgroundColor = "rgba(255,255,255,0.05)";
            }
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.backgroundColor =
              col.key === currentStatus ? "rgba(255,255,255,0.02)" : "transparent";
          }}
        >
          {col.key === currentStatus ? `● ${col.label}` : col.label}
        </button>
      ))}
    </div>
  );
}

// --------------- Create Task Modal ---------------

function CreateTaskModal({
  campaigns,
  onClose,
  onCreate,
}: {
  campaigns: string[];
  onClose: () => void;
  onCreate: (form: NewTaskForm) => void;
}) {
  const [form, setForm] = useState<NewTaskForm>({
    title: "",
    platform: "小红书",
    priority: 1,
    campaign: campaigns[0] ?? "春季推广",
    dueDate: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const backdropRef = useRef<HTMLDivElement>(null);

  const handleSubmit = () => {
    if (!form.title.trim()) return;
    setSubmitting(true);
    onCreate(form);
  };

  return (
    <div
      ref={backdropRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === backdropRef.current) onClose();
      }}
    >
      <div
        className="w-full max-w-md rounded-xl p-6 shadow-xl mx-4"
        style={{
          backgroundColor: "#0a0a0f",
          border: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-base font-semibold text-white">
            新建任务
          </h3>
          <button
            onClick={onClose}
            className="rounded-md p-1 transition-colors"
            style={{ color: "rgba(255,255,255,0.4)" }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.6)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.4)"; }}
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-4">
          {/* Title */}
          <div>
            <label
              className="block text-xs font-medium mb-1"
              style={{ color: "rgba(255,255,255,0.6)" }}
            >
              任务标题 *
            </label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="输入任务标题..."
              className="h-9 w-full rounded-lg px-3 text-sm text-white focus:outline-none"
              style={{
                backgroundColor: "rgba(255,255,255,0.02)",
                border: "1px solid rgba(255,255,255,0.08)",
                color: "white",
              }}
            />
          </div>

          {/* Platform */}
          <div>
            <label
              className="block text-xs font-medium mb-1"
              style={{ color: "rgba(255,255,255,0.6)" }}
            >
              平台
            </label>
            <select
              value={form.platform}
              onChange={(e) => setForm({ ...form, platform: e.target.value })}
              className="h-9 w-full rounded-lg px-3 text-sm"
              style={{
                backgroundColor: "rgba(255,255,255,0.02)",
                border: "1px solid rgba(255,255,255,0.08)",
                color: "rgba(255,255,255,0.6)",
              }}
            >
              {PLATFORM_OPTIONS.map((p) => (
                <option key={p} value={p} style={{ backgroundColor: "#0a0a0f" }}>
                  {PLATFORM_ICONS[p] ?? ""} {p}
                </option>
              ))}
            </select>
          </div>

          {/* Priority */}
          <div>
            <label
              className="block text-xs font-medium mb-1"
              style={{ color: "rgba(255,255,255,0.6)" }}
            >
              优先级
            </label>
            <div className="flex gap-2">
              {([0, 1, 2] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => setForm({ ...form, priority: p })}
                  className="h-8 flex-1 rounded-lg text-xs font-medium transition-colors"
                  style={{
                    backgroundColor:
                      form.priority === p
                        ? p === 0
                          ? "#ef4444"
                          : p === 1
                            ? "#fbbf24"
                            : "rgba(255,255,255,0.1)"
                        : "transparent",
                    color:
                      form.priority === p
                        ? p === 1
                          ? "#030305"
                          : "white"
                        : "rgba(255,255,255,0.4)",
                    border:
                      form.priority === p
                        ? "1px solid transparent"
                        : "1px solid rgba(255,255,255,0.08)",
                  }}
                >
                  {PRIORITY_LABELS[p]}
                </button>
              ))}
            </div>
          </div>

          {/* Campaign */}
          <div>
            <label
              className="block text-xs font-medium mb-1"
              style={{ color: "rgba(255,255,255,0.6)" }}
            >
              关联活动
            </label>
            <select
              value={form.campaign}
              onChange={(e) => setForm({ ...form, campaign: e.target.value })}
              className="h-9 w-full rounded-lg px-3 text-sm"
              style={{
                backgroundColor: "rgba(255,255,255,0.02)",
                border: "1px solid rgba(255,255,255,0.08)",
                color: "rgba(255,255,255,0.6)",
              }}
            >
              {campaigns.map((c) => (
                <option key={c} value={c} style={{ backgroundColor: "#0a0a0f" }}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* Due date */}
          <div>
            <label
              className="block text-xs font-medium mb-1"
              style={{ color: "rgba(255,255,255,0.6)" }}
            >
              截止日期
            </label>
            <input
              type="date"
              value={form.dueDate}
              onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
              className="h-9 w-full rounded-lg px-3 text-sm"
              style={{
                backgroundColor: "rgba(255,255,255,0.02)",
                border: "1px solid rgba(255,255,255,0.08)",
                color: "rgba(255,255,255,0.6)",
                colorScheme: "dark",
              }}
            />
          </div>
        </div>

        {/* Footer */}
        <div
          className="flex justify-end gap-2 mt-6 pt-4"
          style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}
        >
          <button
            onClick={onClose}
            className="h-9 rounded-lg px-4 text-sm font-medium transition-colors"
            style={{
              backgroundColor: "transparent",
              border: "1px solid rgba(255,255,255,0.08)",
              color: "rgba(255,255,255,0.6)",
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = "rgba(255,255,255,0.05)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = "transparent"; }}
          >
            取消
          </button>
          <button
            onClick={handleSubmit}
            disabled={!form.title.trim() || submitting}
            className="h-9 rounded-lg px-4 text-sm font-medium transition-colors disabled:opacity-50"
            style={{
              backgroundColor: "#a78bfa",
              color: "#030305",
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = "#b69dff"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = "#a78bfa"; }}
          >
            {submitting ? "创建中..." : "创建任务"}
          </button>
        </div>
      </div>
    </div>
  );
}

// --------------- Main Page ---------------

export default function TaskBoardPage() {
  const [tasks, setTasks] = useState<TaskCard[]>(MOCK_TASKS);
  const [loading, setLoading] = useState(true);
  const [filterCampaign, setFilterCampaign] = useState("all");
  const [filterPlatform, setFilterPlatform] = useState("all");
  const [toast, setToast] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [openStatusDropdown, setOpenStatusDropdown] = useState<string | null>(null);
  const [flashingCards, setFlashingCards] = useState<Set<string>>(new Set());

  const fetchTasks = useCallback(async () => {
    try {
      const res = await fetch("/api/tasks");
      const json = (await res.json()) as { success: boolean; data: Task[] };
      if (json.success && json.data.length > 0) {
        const apiTasks = json.data.map(mapTaskToCard);
        setTasks([...apiTasks, ...MOCK_TASKS]);
      }
    } catch {
      // fallback to mock data
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const campaigns = [...new Set(tasks.map((t) => t.campaign))];
  const platforms = [...new Set(tasks.map((t) => t.platform))];

  const filtered = tasks.filter((t) => {
    if (filterCampaign !== "all" && t.campaign !== filterCampaign) return false;
    if (filterPlatform !== "all" && t.platform !== filterPlatform) return false;
    return true;
  });

  // Flash animation helper
  const flashCard = (id: string) => {
    setFlashingCards((prev) => new Set(prev).add(id));
    setTimeout(() => {
      setFlashingCards((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }, 800);
  };

  // Status change handler
  const handleStatusChange = async (task: TaskCard, newStatus: TaskStatus) => {
    setOpenStatusDropdown(null);

    if (task.source === "api") {
      try {
        const res = await fetch(`/api/tasks/${task.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: newStatus }),
        });
        const json = (await res.json()) as { success: boolean };
        if (!json.success) {
          setToast("状态更新失败");
          return;
        }
      } catch {
        setToast("状态更新失败");
        return;
      }
    }

    setTasks((prev) =>
      prev.map((t) => (t.id === task.id ? { ...t, status: newStatus } : t))
    );
    flashCard(task.id);

    const colLabel = COLUMNS.find((c) => c.key === newStatus)?.label ?? newStatus;
    setToast(`${task.title} → ${colLabel}`);
  };

  // Create task handler
  const handleCreateTask = async (form: NewTaskForm) => {
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          campaign_id: form.campaign,
          title: form.title,
          description: "",
          status: "backlog",
          assignee_type: "agent",
          priority: form.priority,
          due_date: form.dueDate || null,
        }),
      });
      const json = (await res.json()) as { success: boolean; data: Task };
      if (json.success) {
        const newCard = mapTaskToCard(json.data);
        setTasks((prev) => [newCard, ...prev]);
        flashCard(newCard.id);
        setToast(`任务已创建: ${form.title}`);
      } else {
        // Fallback: add as mock card
        const mockId = `T-${Date.now().toString().slice(-4)}`;
        const dueDate = form.dueDate
          ? new Date(form.dueDate)
              .toLocaleDateString("zh-CN", { month: "2-digit", day: "2-digit" })
              .replace("/", "-")
          : "--";
        const newCard: TaskCard = {
          id: mockId,
          title: form.title,
          platform: form.platform,
          priority: form.priority,
          dueDate,
          status: "backlog",
          campaign: form.campaign,
          source: "mock",
        };
        setTasks((prev) => [newCard, ...prev]);
        flashCard(mockId);
        setToast(`任务已创建: ${form.title}`);
      }
    } catch {
      // Fallback: add locally
      const mockId = `T-${Date.now().toString().slice(-4)}`;
      const dueDate = form.dueDate
        ? new Date(form.dueDate)
            .toLocaleDateString("zh-CN", { month: "2-digit", day: "2-digit" })
            .replace("/", "-")
        : "--";
      const newCard: TaskCard = {
        id: mockId,
        title: form.title,
        platform: form.platform,
        priority: form.priority,
        dueDate,
        status: "backlog",
        campaign: form.campaign,
        source: "mock",
      };
      setTasks((prev) => [newCard, ...prev]);
      flashCard(mockId);
      setToast(`任务已创建: ${form.title}`);
    }
    setShowCreateModal(false);
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">
          Task Board
        </h1>
        <div className="flex items-center gap-3">
          <select
            value={filterCampaign}
            onChange={(e) => setFilterCampaign(e.target.value)}
            className="h-9 rounded-lg px-3 text-sm"
            style={{
              backgroundColor: "rgba(255,255,255,0.02)",
              border: "1px solid rgba(255,255,255,0.08)",
              color: "rgba(255,255,255,0.6)",
            }}
          >
            <option value="all" style={{ backgroundColor: "#0a0a0f" }}>全部活动</option>
            {campaigns.map((c) => (
              <option key={c} value={c} style={{ backgroundColor: "#0a0a0f" }}>{c}</option>
            ))}
          </select>
          <select
            value={filterPlatform}
            onChange={(e) => setFilterPlatform(e.target.value)}
            className="h-9 rounded-lg px-3 text-sm"
            style={{
              backgroundColor: "rgba(255,255,255,0.02)",
              border: "1px solid rgba(255,255,255,0.08)",
              color: "rgba(255,255,255,0.6)",
            }}
          >
            <option value="all" style={{ backgroundColor: "#0a0a0f" }}>全部平台</option>
            {platforms.map((p) => (
              <option key={p} value={p} style={{ backgroundColor: "#0a0a0f" }}>{p}</option>
            ))}
          </select>
          <button
            onClick={() => setShowCreateModal(true)}
            className="h-9 rounded-lg px-4 text-sm font-medium transition-colors"
            style={{
              backgroundColor: "#a78bfa",
              color: "#030305",
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = "#b69dff"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = "#a78bfa"; }}
          >
            + 新任务
          </button>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div
          className="flex items-center gap-2 text-sm"
          style={{ color: "rgba(255,255,255,0.4)" }}
        >
          <span
            className="inline-block h-4 w-4 animate-spin rounded-full"
            style={{
              borderWidth: "2px",
              borderStyle: "solid",
              borderColor: "rgba(255,255,255,0.1)",
              borderTopColor: "rgba(255,255,255,0.4)",
            }}
          />
          加载中...
        </div>
      )}

      {/* Kanban Board */}
      <div className="overflow-x-auto flex gap-4 pb-4">
        {COLUMNS.map((col) => {
          const colTasks = filtered.filter((t) => t.status === col.key);
          return (
            <div
              key={col.key}
              className="w-72 min-w-[288px] rounded-xl p-2 flex flex-col gap-2 shrink-0"
              style={{
                backgroundColor: "rgba(255,255,255,0.02)",
                border: "1px solid rgba(255,255,255,0.05)",
              }}
            >
              {/* Column Header */}
              <div className="flex items-center justify-between px-2 py-1.5">
                <span
                  className="text-sm font-semibold"
                  style={{ color: "rgba(255,255,255,0.6)" }}
                >
                  {col.label}
                </span>
                <span
                  className="flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-xs font-medium"
                  style={{
                    backgroundColor: "rgba(255,255,255,0.05)",
                    color: "rgba(255,255,255,0.4)",
                  }}
                >
                  {colTasks.length}
                </span>
              </div>

              {/* Task Cards */}
              {colTasks.map((task) => {
                const isFlashing = flashingCards.has(task.id);
                return (
                  <div
                    key={task.id}
                    className="relative rounded-xl p-3 transition-all duration-150 cursor-pointer"
                    style={{
                      backgroundColor: "#0a0a0f",
                      border: isFlashing
                        ? "1px solid #a78bfa"
                        : "1px solid rgba(255,255,255,0.08)",
                      boxShadow: isFlashing
                        ? "0 0 0 2px rgba(167,139,250,0.2)"
                        : "none",
                    }}
                    onMouseEnter={(e) => {
                      if (!isFlashing) {
                        (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.15)";
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isFlashing) {
                        (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.08)";
                      }
                    }}
                    onClick={() =>
                      setOpenStatusDropdown(
                        openStatusDropdown === task.id ? null : task.id
                      )
                    }
                  >
                    {task.source === "api" && (
                      <span
                        className="mb-1.5 inline-block rounded px-1.5 py-0.5 text-[10px] font-medium"
                        style={{
                          backgroundColor: "rgba(34,211,238,0.10)",
                          color: "#22d3ee",
                        }}
                      >
                        AI 生成
                      </span>
                    )}
                    <p className="text-sm font-medium text-white line-clamp-2 mb-2">
                      {task.title}
                    </p>
                    <div
                      className="flex items-center justify-between text-xs"
                      style={{ color: "rgba(255,255,255,0.4)" }}
                    >
                      <div className="flex items-center gap-2">
                        <span title={task.platform}>
                          {PLATFORM_ICONS[task.platform] ?? "📄"}
                        </span>
                        <span className="flex items-center gap-1">
                          <span
                            className={`inline-block h-2 w-2 rounded-full ${PRIORITY_COLORS[task.priority]}`}
                          />
                          {PRIORITY_LABELS[task.priority]}
                        </span>
                      </div>
                      <span>{task.dueDate}</span>
                    </div>

                    {/* Status dropdown */}
                    {openStatusDropdown === task.id && (
                      <StatusDropdown
                        currentStatus={task.status}
                        onSelect={(newStatus) => handleStatusChange(task, newStatus)}
                        onClose={() => setOpenStatusDropdown(null)}
                      />
                    )}
                  </div>
                );
              })}

              {colTasks.length === 0 && (
                <div
                  className="flex h-24 items-center justify-center rounded-lg"
                  style={{
                    border: "1px dashed rgba(255,255,255,0.08)",
                  }}
                >
                  <span
                    className="text-xs"
                    style={{ color: "rgba(255,255,255,0.25)" }}
                  >
                    暂无任务
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Create Task Modal */}
      {showCreateModal && (
        <CreateTaskModal
          campaigns={campaigns.length > 0 ? campaigns : MOCK_CAMPAIGNS}
          onClose={() => setShowCreateModal(false)}
          onCreate={handleCreateTask}
        />
      )}

      {/* Toast */}
      {toast && <Toast message={toast} onClose={() => setToast("")} />}
    </div>
  );
}
