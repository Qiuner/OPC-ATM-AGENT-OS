"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { Content } from "@/types";

// --------------- Types ---------------

interface PlatformStatus {
  platform: string;
  ready: boolean;
  format: string;
}

interface PublishItem {
  id: string;
  title: string;
  campaign: string;
  scheduledAt: string;
  tab: "pending" | "exported" | "published";
  platforms: PlatformStatus[];
  body?: string;
  tags?: string[];
  fromApi: boolean;
}

type TabKey = "pending" | "exported" | "published";

// --------------- Constants ---------------

const TABS: { key: TabKey; label: string }[] = [
  { key: "pending", label: "待发布" },
  { key: "exported", label: "已导出" },
  { key: "published", label: "已发布" },
];

const MOCK_ITEMS: PublishItem[] = [
  {
    id: "PUB-012",
    title: "小红书种草笔记 #12",
    campaign: "春季推广",
    scheduledAt: "2026-03-12 10:00",
    tab: "pending",
    platforms: [
      { platform: "小红书", ready: true, format: "图文笔记 · 9图 + 正文" },
      { platform: "抖音", ready: true, format: "短视频脚本 · 30s" },
      { platform: "视频号", ready: false, format: "竖版视频 · 待适配" },
      { platform: "X", ready: true, format: "推文线程 · 5条" },
    ],
    body: "春季新品推荐，打工人必备好物清单！从护肤到办公，每一件都是精挑细选。",
    tags: ["春季好物", "打工人必备", "种草"],
    fromApi: false,
  },
  {
    id: "PUB-005",
    title: "品牌故事短视频 #5",
    campaign: "品牌曝光",
    scheduledAt: "2026-03-13 14:00",
    tab: "pending",
    platforms: [
      { platform: "抖音", ready: true, format: "竖版短视频 · 60s" },
      { platform: "视频号", ready: true, format: "竖版视频 · 60s" },
      { platform: "小红书", ready: false, format: "视频笔记 · 待适配封面" },
    ],
    body: "从一个想法到一个产品，我们的故事从未停止。今天带你走进幕后，看看产品是怎么诞生的。",
    tags: ["品牌故事", "幕后", "创业"],
    fromApi: false,
  },
  {
    id: "PUB-003",
    title: "AI 工具推荐帖 #3",
    campaign: "内容营销",
    scheduledAt: "2026-03-14 09:00",
    tab: "pending",
    platforms: [
      { platform: "小红书", ready: true, format: "图文笔记 · 6图 + 正文" },
      { platform: "即刻", ready: true, format: "动态帖子 · 正文" },
      { platform: "X", ready: true, format: "推文 · 单条" },
    ],
    body: "2026年最值得用的AI工具合集！效率直接翻倍，第3个真的绝了。",
    tags: ["AI工具", "效率提升", "推荐"],
    fromApi: false,
  },
  {
    id: "PUB-011",
    title: "创始人故事 — 从0到1",
    campaign: "品牌曝光",
    scheduledAt: "2026-03-11 12:00",
    tab: "exported",
    platforms: [
      { platform: "视频号", ready: true, format: "竖版视频 · 90s" },
      { platform: "抖音", ready: true, format: "竖版短视频 · 60s" },
    ],
    body: "创业3年，踩过无数坑。今天分享我从0到1的心路历程，希望能给正在路上的你一些启发。",
    tags: ["创始人", "创业故事", "心路历程"],
    fromApi: false,
  },
  {
    id: "PUB-010",
    title: "开箱测评 — 新品首发",
    campaign: "春季推广",
    scheduledAt: "2026-03-08 18:00",
    tab: "published",
    platforms: [
      { platform: "抖音", ready: true, format: "竖版短视频 · 45s" },
      { platform: "小红书", ready: true, format: "视频笔记 · 45s" },
      { platform: "X", ready: true, format: "推文 · 单条" },
    ],
    body: "新品到了！开箱第一感受：质感拉满。来看看细节做得怎么样。",
    tags: ["开箱", "新品", "测评"],
    fromApi: false,
  },
  {
    id: "PUB-009",
    title: "FAQ 合集 — 高频问题解答",
    campaign: "用户教育",
    scheduledAt: "2026-03-07 10:00",
    tab: "published",
    platforms: [
      { platform: "小红书", ready: true, format: "图文笔记 · 12图" },
      { platform: "即刻", ready: true, format: "动态帖子" },
    ],
    body: "收集了大家问得最多的10个问题，一次性全部解答！收藏起来随时查看。",
    tags: ["FAQ", "问题解答", "教程"],
    fromApi: false,
  },
];

// --------------- Helpers ---------------

function mapContentToPublishItem(content: Content): PublishItem {
  const tags = (content.metadata?.tags as string[] | undefined) ?? [];
  return {
    id: content.id,
    title: content.title,
    campaign: content.campaign_id,
    scheduledAt: new Date(content.created_at).toLocaleString("zh-CN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }),
    tab:
      content.status === "published"
        ? "published"
        : content.status === "approved"
          ? "pending"
          : "pending",
    platforms: [
      { platform: content.platform || "小红书", ready: true, format: "AI 生成内容" },
    ],
    body: content.body,
    tags,
    fromApi: true,
  };
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function downloadJson(data: Record<string, unknown>, filename: string) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  triggerDownload(blob, filename);
}

function downloadMarkdown(md: string, filename: string) {
  const blob = new Blob([md], { type: "text/markdown;charset=utf-8" });
  triggerDownload(blob, filename);
}

function itemToMarkdown(item: PublishItem): string {
  const lines: string[] = [];
  lines.push(`# ${item.title}`);
  lines.push("");
  lines.push(`> ${item.campaign} · ${item.scheduledAt}`);
  lines.push("");
  if (item.body) {
    lines.push(item.body);
    lines.push("");
  }
  if (item.tags && item.tags.length > 0) {
    lines.push(item.tags.map((t) => `#${t}`).join(" "));
    lines.push("");
  }
  lines.push("---");
  lines.push("");
  lines.push("**平台适配：**");
  for (const ps of item.platforms) {
    lines.push(`- ${ps.ready ? "[x]" : "[ ]"} ${ps.platform} — ${ps.format}`);
  }
  return lines.join("\n");
}

// Platform preview formatters
function formatXiaoHongShu(item: PublishItem): string {
  const emoji = "🌸";
  const title = `${emoji} ${item.title}`;
  const body = (item.body ?? "").slice(0, 1000);
  const tags = (item.tags ?? []).map((t) => `#${t}`).join(" ");
  return `${title}\n\n${body}\n\n${tags}`;
}

function formatDouyin(item: PublishItem): string {
  const body = item.body ?? "";
  const hook = body.slice(0, 50) + (body.length > 50 ? "..." : "");
  const mainBody = body.slice(0, 200);
  return `【Hook】${hook}\n\n【正文】${mainBody}\n\n【CTA】关注我，获取更多好内容！`;
}

function formatX(item: PublishItem): string {
  const full = `${item.title}\n\n${item.body ?? ""}`;
  return full.slice(0, 280);
}

function formatJike(item: PublishItem): string {
  return `${item.title}\n\n${item.body ?? ""}\n\n${(item.tags ?? []).map((t) => `#${t}`).join(" ")}`;
}

function formatShiPinHao(item: PublishItem): string {
  const body = item.body ?? "";
  return `【视频号脚本】\n\n标题：${item.title}\n\n开场白：${body.slice(0, 80)}\n\n正文：${body}\n\n结尾CTA：点赞关注不迷路！`;
}

type PlatformKey = "小红书" | "抖音" | "X" | "即刻" | "视频号";

const PLATFORM_FORMATTERS: Record<PlatformKey, (item: PublishItem) => string> = {
  "小红书": formatXiaoHongShu,
  "抖音": formatDouyin,
  X: formatX,
  "即刻": formatJike,
  "视频号": formatShiPinHao,
};

const PLATFORM_LABELS: Record<PlatformKey, string> = {
  "小红书": "小红书 · 图文笔记",
  "抖音": "抖音 · 短视频脚本",
  X: "X · 推文 (280字符)",
  "即刻": "即刻 · 社区动态",
  "视频号": "视频号 · 视频脚本",
};

// --------------- Toast Component ---------------

function Toast({ message, onClose }: { message: string; onClose: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 2500);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className="fixed bottom-6 right-6 z-50 animate-in fade-in slide-in-from-bottom-4 duration-200">
      <div
        className="rounded-lg px-4 py-2.5 text-sm text-white shadow-lg"
        style={{ background: "rgba(167,139,250,0.9)" }}
      >
        {message}
      </div>
    </div>
  );
}

// --------------- Platform Preview Modal ---------------

function PlatformPreviewModal({
  item,
  onClose,
}: {
  item: PublishItem;
  onClose: () => void;
}) {
  const [activePlatform, setActivePlatform] = useState<PlatformKey>("小红书");
  const [toast, setToast] = useState("");
  const backdropRef = useRef<HTMLDivElement>(null);

  const allPlatforms: PlatformKey[] = ["小红书", "抖音", "X", "即刻", "视频号"];

  const formatted = PLATFORM_FORMATTERS[activePlatform](item);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(formatted);
      setToast("已复制到剪贴板");
    } catch {
      setToast("复制失败");
    }
  };

  return (
    <div
      ref={backdropRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === backdropRef.current) onClose();
      }}
    >
      <div
        className="w-full max-w-2xl rounded-xl p-6 shadow-xl mx-4"
        style={{ background: "#0a0a0f", border: "1px solid rgba(255,255,255,0.08)" }}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-white">
            平台预览 — {item.title}
          </h3>
          <button
            onClick={onClose}
            className="rounded-md p-1 transition-colors"
            style={{ color: "rgba(255,255,255,0.4)" }}
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Platform Tabs */}
        <div
          className="flex flex-wrap gap-1 mb-4 pb-2"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}
        >
          {allPlatforms.map((p) => (
            <button
              key={p}
              onClick={() => setActivePlatform(p)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                activePlatform === p
                  ? "bg-[#a78bfa] text-white"
                  : "hover:bg-white/5"
              }`}
              style={activePlatform !== p ? { color: "rgba(255,255,255,0.6)" } : undefined}
            >
              {p}
            </button>
          ))}
        </div>

        {/* Format label */}
        <p className="text-xs mb-2" style={{ color: "rgba(255,255,255,0.4)" }}>
          {PLATFORM_LABELS[activePlatform]}
        </p>

        {/* Preview */}
        <div
          className="rounded-lg p-4 min-h-[160px] max-h-[300px] overflow-y-auto"
          style={{ background: "#030305", border: "1px solid rgba(255,255,255,0.08)" }}
        >
          <pre className="whitespace-pre-wrap text-sm font-sans" style={{ color: "rgba(255,255,255,0.6)" }}>
            {formatted}
          </pre>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 mt-4">
          <button
            onClick={handleCopy}
            className="h-8 rounded-lg px-3 text-sm font-medium transition-colors"
            style={{ border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.6)", background: "transparent" }}
          >
            复制文案
          </button>
          <button
            onClick={onClose}
            className="h-8 rounded-lg px-3 text-sm font-medium text-white transition-colors"
            style={{ background: "linear-gradient(135deg, #a78bfa, #7c3aed)" }}
          >
            关闭
          </button>
        </div>
      </div>

      {toast && <Toast message={toast} onClose={() => setToast("")} />}
    </div>
  );
}

// --------------- Main Page ---------------

export default function PublishingPage() {
  const [items, setItems] = useState<PublishItem[]>(MOCK_ITEMS);
  const [activeTab, setActiveTab] = useState<TabKey>("pending");
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState("");
  const [previewItem, setPreviewItem] = useState<PublishItem | null>(null);

  const fetchContents = useCallback(async () => {
    try {
      const [approvedRes, publishedRes] = await Promise.all([
        fetch("/api/contents?status=approved"),
        fetch("/api/contents?status=published"),
      ]);
      const approvedJson = (await approvedRes.json()) as { success: boolean; data: Content[] };
      const publishedJson = (await publishedRes.json()) as { success: boolean; data: Content[] };

      const apiItems: PublishItem[] = [];
      if (approvedJson.success && approvedJson.data.length > 0) {
        apiItems.push(...approvedJson.data.map(mapContentToPublishItem));
      }
      if (publishedJson.success && publishedJson.data.length > 0) {
        apiItems.push(
          ...publishedJson.data.map((c) => ({
            ...mapContentToPublishItem(c),
            tab: "published" as const,
          }))
        );
      }

      if (apiItems.length > 0) {
        setItems([...apiItems, ...MOCK_ITEMS]);
      }
    } catch {
      // fallback to mock
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchContents();
  }, [fetchContents]);

  const filteredItems = items.filter((item) => item.tab === activeTab);

  const tabCounts: Record<TabKey, number> = {
    pending: items.filter((i) => i.tab === "pending").length,
    exported: items.filter((i) => i.tab === "exported").length,
    published: items.filter((i) => i.tab === "published").length,
  };

  // --- Export handlers ---

  const handleExportJson = (item: PublishItem) => {
    const exportData = {
      id: item.id,
      title: item.title,
      campaign: item.campaign,
      scheduledAt: item.scheduledAt,
      platforms: item.platforms,
      body: item.body ?? "",
      tags: item.tags ?? [],
      exportedAt: new Date().toISOString(),
    };
    downloadJson(exportData, `${item.id}-${item.title}.json`);
    setItems((prev) =>
      prev.map((i) => (i.id === item.id ? { ...i, tab: "exported" as const } : i))
    );
    setToast(`已导出 JSON: ${item.title}`);
  };

  const handleExportMarkdown = (item: PublishItem) => {
    const md = itemToMarkdown(item);
    downloadMarkdown(md, `${item.id}-${item.title}.md`);
    setItems((prev) =>
      prev.map((i) => (i.id === item.id ? { ...i, tab: "exported" as const } : i))
    );
    setToast(`已导出 Markdown: ${item.title}`);
  };

  const handleExportAllJson = () => {
    const pendingItems = items.filter((i) => i.tab === "pending");
    if (pendingItems.length === 0) return;
    const exportData = {
      exportedAt: new Date().toISOString(),
      count: pendingItems.length,
      items: pendingItems.map((item) => ({
        id: item.id,
        title: item.title,
        campaign: item.campaign,
        scheduledAt: item.scheduledAt,
        platforms: item.platforms,
        body: item.body ?? "",
        tags: item.tags ?? [],
      })),
    };
    downloadJson(exportData, `publish-all-${Date.now()}.json`);
    setItems((prev) =>
      prev.map((i) => (i.tab === "pending" ? { ...i, tab: "exported" as const } : i))
    );
    setToast(`已批量导出 ${pendingItems.length} 项 (JSON)`);
  };

  const handleExportAllMarkdown = () => {
    const pendingItems = items.filter((i) => i.tab === "pending");
    if (pendingItems.length === 0) return;
    const md = pendingItems.map(itemToMarkdown).join("\n\n---\n\n");
    downloadMarkdown(md, `publish-all-${Date.now()}.md`);
    setItems((prev) =>
      prev.map((i) => (i.tab === "pending" ? { ...i, tab: "exported" as const } : i))
    );
    setToast(`已批量导出 ${pendingItems.length} 项 (Markdown)`);
  };

  const handleCopyToClipboard = async (item: PublishItem) => {
    const text = formatXiaoHongShu(item);
    try {
      await navigator.clipboard.writeText(text);
      setToast(`已复制: ${item.title}`);
    } catch {
      setToast("复制失败");
    }
  };

  const handleMarkPublished = async (item: PublishItem) => {
    if (item.fromApi) {
      try {
        const res = await fetch(`/api/contents/${item.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "published" }),
        });
        const json = (await res.json()) as { success: boolean };
        if (!json.success) {
          setToast("标记失败");
          return;
        }
      } catch {
        setToast("标记失败");
        return;
      }
    }
    setItems((prev) =>
      prev.map((i) => (i.id === item.id ? { ...i, tab: "published" as const } : i))
    );
    setToast(`已标记为已发布: ${item.title}`);
  };

  // --- Batch export dropdown ---
  const [showBatchMenu, setShowBatchMenu] = useState(false);
  const batchMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (batchMenuRef.current && !batchMenuRef.current.contains(e.target as Node)) {
        setShowBatchMenu(false);
      }
    }
    if (showBatchMenu) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showBatchMenu]);

  // --- Export dropdown per item ---
  const [openExportMenu, setOpenExportMenu] = useState<string | null>(null);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">
          Publishing Hub
        </h1>
        <div className="flex items-center gap-2">
          {loading && (
            <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-t-[#a78bfa]" style={{ borderColor: "rgba(255,255,255,0.15)", borderTopColor: "#a78bfa" }} />
          )}
          <div className="relative" ref={batchMenuRef}>
            <button
              onClick={() => setShowBatchMenu(!showBatchMenu)}
              className="h-9 rounded-lg px-4 text-sm font-medium transition-colors"
              style={{ border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.6)", background: "transparent" }}
            >
              导出全部
            </button>
            {showBatchMenu && (
              <div
                className="absolute right-0 top-10 z-40 w-44 rounded-lg py-1 shadow-lg"
                style={{ background: "#0a0a0f", border: "1px solid rgba(255,255,255,0.08)" }}
              >
                <button
                  onClick={() => {
                    handleExportAllJson();
                    setShowBatchMenu(false);
                  }}
                  className="w-full px-3 py-2 text-left text-sm hover:bg-white/5 transition-colors"
                  style={{ color: "rgba(255,255,255,0.6)" }}
                >
                  导出全部 JSON
                </button>
                <button
                  onClick={() => {
                    handleExportAllMarkdown();
                    setShowBatchMenu(false);
                  }}
                  className="w-full px-3 py-2 text-left text-sm hover:bg-white/5 transition-colors"
                  style={{ color: "rgba(255,255,255,0.6)" }}
                >
                  导出全部 Markdown
                </button>
              </div>
            )}
          </div>
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
            <span
              className="ml-1.5 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-xs font-medium"
              style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.4)" }}
            >
              {tabCounts[tab.key]}
            </span>
          </button>
        ))}
      </div>

      {/* Card List */}
      <div className="space-y-4">
        {filteredItems.map((item) => (
          <div
            key={item.id}
            className="rounded-xl p-6"
            style={{ background: "#0a0a0f", border: "1px solid rgba(255,255,255,0.08)" }}
          >
            {/* Card Header */}
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-semibold text-white">
                    {item.title}
                  </h3>
                  {item.fromApi && (
                    <span className="rounded bg-[#a78bfa]/20 px-1.5 py-0.5 text-[10px] font-medium text-[#a78bfa]">
                      AI 生成
                    </span>
                  )}
                </div>
                <p className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.4)" }}>
                  {item.campaign} · 计划发布：{item.scheduledAt}
                </p>
                {item.tags && item.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {item.tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full px-2 py-0.5 text-[10px]"
                        style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.4)" }}
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs" style={{ color: "rgba(255,255,255,0.25)" }}>
                  {item.id}
                </span>
              </div>
            </div>

            {/* Body preview */}
            {item.body && (
              <p className="text-sm mb-4 line-clamp-2" style={{ color: "rgba(255,255,255,0.6)" }}>
                {item.body}
              </p>
            )}

            {/* Platform Status List */}
            <div>
              {item.platforms.map((ps) => (
                <div
                  key={ps.platform}
                  className="flex items-center justify-between py-3 last:border-0"
                  style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-sm">
                      {ps.ready ? "✅" : "⬜"}
                    </span>
                    <span className="text-sm font-medium w-16" style={{ color: "rgba(255,255,255,0.6)" }}>
                      {ps.platform}
                    </span>
                    <span className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>
                      {ps.format}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setPreviewItem(item)}
                      className="h-7 rounded-md px-2.5 text-xs font-medium transition-colors hover:bg-white/5"
                      style={{ border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.4)" }}
                    >
                      预览
                    </button>
                    {ps.ready ? (
                      <button
                        onClick={() => handleCopyToClipboard(item)}
                        className="h-7 rounded-md px-2.5 text-xs font-medium transition-colors hover:bg-white/5"
                        style={{ border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.4)" }}
                      >
                        复制
                      </button>
                    ) : (
                      <button
                        className="h-7 rounded-md px-2.5 text-xs font-medium text-[#22d3ee] transition-colors hover:bg-[#22d3ee]/10"
                        style={{ border: "1px solid rgba(34,211,238,0.3)" }}
                      >
                        生成
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Card actions */}
            <div
              className="flex items-center justify-end gap-2 mt-4 pt-3"
              style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}
            >
              {/* Export dropdown */}
              <div className="relative">
                <button
                  onClick={() =>
                    setOpenExportMenu(openExportMenu === item.id ? null : item.id)
                  }
                  className="h-8 rounded-lg px-3 text-sm font-medium transition-colors hover:bg-white/5"
                  style={{ border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.6)" }}
                >
                  导出 ▾
                </button>
                {openExportMenu === item.id && (
                  <div
                    className="absolute right-0 top-9 z-40 w-40 rounded-lg py-1 shadow-lg"
                    style={{ background: "#0a0a0f", border: "1px solid rgba(255,255,255,0.08)" }}
                  >
                    <button
                      onClick={() => {
                        handleExportJson(item);
                        setOpenExportMenu(null);
                      }}
                      className="w-full px-3 py-2 text-left text-sm hover:bg-white/5 transition-colors"
                      style={{ color: "rgba(255,255,255,0.6)" }}
                    >
                      JSON 导出
                    </button>
                    <button
                      onClick={() => {
                        handleExportMarkdown(item);
                        setOpenExportMenu(null);
                      }}
                      className="w-full px-3 py-2 text-left text-sm hover:bg-white/5 transition-colors"
                      style={{ color: "rgba(255,255,255,0.6)" }}
                    >
                      Markdown 导出
                    </button>
                  </div>
                )}
              </div>

              {item.tab === "exported" && (
                <button
                  onClick={() => handleMarkPublished(item)}
                  className="h-8 rounded-lg px-3 text-sm font-medium text-white transition-colors"
                  style={{ background: "linear-gradient(135deg, #a78bfa, #7c3aed)" }}
                >
                  标记为已发布
                </button>
              )}
            </div>
          </div>
        ))}

        {filteredItems.length === 0 && (
          <div
            className="flex h-40 items-center justify-center rounded-xl border-dashed"
            style={{ border: "1px dashed rgba(255,255,255,0.08)" }}
          >
            <span className="text-sm" style={{ color: "rgba(255,255,255,0.25)" }}>
              暂无内容
            </span>
          </div>
        )}
      </div>

      {/* Platform Preview Modal */}
      {previewItem && (
        <PlatformPreviewModal
          item={previewItem}
          onClose={() => setPreviewItem(null)}
        />
      )}

      {/* Toast */}
      {toast && !previewItem && <Toast message={toast} onClose={() => setToast("")} />}
    </div>
  );
}
