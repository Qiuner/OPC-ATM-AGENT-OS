import { useState, useEffect, useCallback, useRef } from "react";
import type { Content } from "@/types";
import { getApi } from "@/lib/ipc";

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
        : "pending",
    platforms: [
      { platform: content.platform || "X", ready: true, format: "AI Generated" },
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
function formatX(item: PublishItem): string {
  const full = `${item.title}\n\n${item.body ?? ""}`;
  const tags = (item.tags ?? []).map((t) => `#${t}`).join(" ");
  const tweet = full.slice(0, 260) + (tags ? `\n\n${tags}` : "");
  return tweet.slice(0, 280);
}

function formatLinkedIn(item: PublishItem): string {
  return `${item.title}\n\n${item.body ?? ""}\n\n${(item.tags ?? []).map((t) => `#${t}`).join(" ")}\n\n---\nWhat are your thoughts? Drop a comment below.`;
}

function formatTikTok(item: PublishItem): string {
  const body = item.body ?? "";
  const hook = body.slice(0, 50) + (body.length > 50 ? "..." : "");
  return `[Hook - 3s] ${hook}\n\n[Main Content - 15-45s]\n${body}\n\n[CTA - 3s] Follow for more! Like & Share!`;
}

function formatMeta(item: PublishItem): string {
  return `${item.title}\n\n${item.body ?? ""}\n\n${(item.tags ?? []).map((t) => `#${t}`).join(" ")}`;
}

function formatEmail(item: PublishItem): string {
  const body = item.body ?? "";
  return `Subject: ${item.title}\nPreheader: ${body.slice(0, 80)}\n\n---\n\nHi [First Name],\n\n${body}\n\nBest regards,\n[Brand Name]\n\n---\nUnsubscribe | View in browser`;
}

function formatBlog(item: PublishItem): string {
  const body = item.body ?? "";
  const tags = (item.tags ?? []).map((t) => t).join(", ");
  return `# ${item.title}\n\nMeta Description: ${body.slice(0, 155)}\nKeywords: ${tags}\n\n---\n\n${body}\n\n---\n\n## Key Takeaways\n\n- [Takeaway 1]\n- [Takeaway 2]\n- [Takeaway 3]`;
}

type PlatformKey = "X" | "LinkedIn" | "TikTok" | "Meta" | "Email" | "Blog";

const PLATFORM_FORMATTERS: Record<PlatformKey, (item: PublishItem) => string> = {
  X: formatX,
  LinkedIn: formatLinkedIn,
  TikTok: formatTikTok,
  Meta: formatMeta,
  Email: formatEmail,
  Blog: formatBlog,
};

const PLATFORM_LABELS: Record<PlatformKey, string> = {
  X: "X · 推文 (280 chars)",
  LinkedIn: "LinkedIn · 专业文章",
  TikTok: "TikTok · 短视频脚本",
  Meta: "Meta · FB/IG 帖子",
  Email: "Email · 营销邮件",
  Blog: "Blog · SEO 长文",
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
  const [activePlatform, setActivePlatform] = useState<PlatformKey>("X");
  const [toast, setToast] = useState("");
  const backdropRef = useRef<HTMLDivElement>(null);

  const allPlatforms: PlatformKey[] = ["X", "LinkedIn", "TikTok", "Meta", "Email", "Blog"];
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
      onClick={(e) => { if (e.target === backdropRef.current) onClose(); }}
    >
      <div
        className="w-full max-w-2xl rounded-xl p-6 shadow-xl mx-4"
        style={{ background: "var(--card)", border: "1px solid var(--border)" }}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-foreground">
            平台预览 — {item.title}
          </h3>
          <button onClick={onClose} className="rounded-md p-1 transition-colors" style={{ color: "var(--muted-foreground)" }}>
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex flex-wrap gap-1 mb-4 pb-2" style={{ borderBottom: "1px solid var(--border)" }}>
          {allPlatforms.map((p) => (
            <button
              key={p}
              onClick={() => setActivePlatform(p)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                activePlatform === p ? "bg-[#a78bfa] text-white" : "hover:bg-white/5"
              }`}
              style={activePlatform !== p ? { color: "var(--muted-foreground)" } : undefined}
            >
              {p}
            </button>
          ))}
        </div>

        <p className="text-xs mb-2" style={{ color: "var(--muted-foreground)" }}>
          {PLATFORM_LABELS[activePlatform]}
        </p>

        <div
          className="rounded-lg p-4 min-h-[160px] max-h-[300px] overflow-y-auto"
          style={{ background: "var(--background)", border: "1px solid var(--border)" }}
        >
          <pre className="whitespace-pre-wrap text-sm font-sans" style={{ color: "var(--muted-foreground)" }}>
            {formatted}
          </pre>
        </div>

        <div className="flex justify-end gap-2 mt-4">
          <button
            onClick={handleCopy}
            className="h-8 rounded-lg px-3 text-sm font-medium transition-colors"
            style={{ border: "1px solid var(--border)", color: "var(--muted-foreground)", background: "transparent" }}
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

export function PublishingPage() {
  const [items, setItems] = useState<PublishItem[]>([]);
  const [activeTab, setActiveTab] = useState<TabKey>("pending");
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState("");
  const [previewItem, setPreviewItem] = useState<PublishItem | null>(null);

  const fetchContents = useCallback(async () => {
    const api = getApi();
    if (!api) { setLoading(false); return; }

    try {
      const [approvedRes, publishedRes] = await Promise.all([
        api.contents.list({ status: "approved" }),
        api.contents.list({ status: "published" }),
      ]);

      const apiItems: PublishItem[] = [];
      if (approvedRes.success && approvedRes.data && approvedRes.data.length > 0) {
        apiItems.push(...approvedRes.data.map(mapContentToPublishItem));
      }
      if (publishedRes.success && publishedRes.data && publishedRes.data.length > 0) {
        apiItems.push(
          ...publishedRes.data.map((c) => ({
            ...mapContentToPublishItem(c),
            tab: "published" as const,
          }))
        );
      }

      if (apiItems.length > 0) {
        setItems(apiItems);
      }
    } catch {
      // empty state on error
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchContents(); }, [fetchContents]);

  const filteredItems = items.filter((item) => item.tab === activeTab);

  const tabCounts: Record<TabKey, number> = {
    pending: items.filter((i) => i.tab === "pending").length,
    exported: items.filter((i) => i.tab === "exported").length,
    published: items.filter((i) => i.tab === "published").length,
  };

  const handleExportJson = (item: PublishItem) => {
    const exportData = {
      id: item.id, title: item.title, campaign: item.campaign,
      scheduledAt: item.scheduledAt, platforms: item.platforms,
      body: item.body ?? "", tags: item.tags ?? [],
      exportedAt: new Date().toISOString(),
    };
    downloadJson(exportData, `${item.id}-${item.title}.json`);
    setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, tab: "exported" as const } : i)));
    setToast(`已导出 JSON: ${item.title}`);
  };

  const handleExportMarkdown = (item: PublishItem) => {
    const md = itemToMarkdown(item);
    downloadMarkdown(md, `${item.id}-${item.title}.md`);
    setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, tab: "exported" as const } : i)));
    setToast(`已导出 Markdown: ${item.title}`);
  };

  const handleExportAllJson = () => {
    const pendingItems = items.filter((i) => i.tab === "pending");
    if (pendingItems.length === 0) return;
    const exportData = {
      exportedAt: new Date().toISOString(),
      count: pendingItems.length,
      items: pendingItems.map((item) => ({
        id: item.id, title: item.title, campaign: item.campaign,
        scheduledAt: item.scheduledAt, platforms: item.platforms,
        body: item.body ?? "", tags: item.tags ?? [],
      })),
    };
    downloadJson(exportData, `publish-all-${Date.now()}.json`);
    setItems((prev) => prev.map((i) => (i.tab === "pending" ? { ...i, tab: "exported" as const } : i)));
    setToast(`已批量导出 ${pendingItems.length} 项 (JSON)`);
  };

  const handleExportAllMarkdown = () => {
    const pendingItems = items.filter((i) => i.tab === "pending");
    if (pendingItems.length === 0) return;
    const md = pendingItems.map(itemToMarkdown).join("\n\n---\n\n");
    downloadMarkdown(md, `publish-all-${Date.now()}.md`);
    setItems((prev) => prev.map((i) => (i.tab === "pending" ? { ...i, tab: "exported" as const } : i)));
    setToast(`已批量导出 ${pendingItems.length} 项 (Markdown)`);
  };

  const handleCopyToClipboard = async (item: PublishItem) => {
    const text = formatX(item);
    try {
      await navigator.clipboard.writeText(text);
      setToast(`已复制: ${item.title}`);
    } catch {
      setToast("复制失败");
    }
  };

  const handleMarkPublished = async (item: PublishItem) => {
    if (item.fromApi) {
      const api = getApi();
      if (!api) return;
      try {
        const res = await api.contents.update(item.id, { status: "published" });
        if (!res.success) { setToast("标记失败"); return; }
      } catch {
        setToast("标记失败");
        return;
      }
    }
    setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, tab: "published" as const } : i)));
    setToast(`已标记为已发布: ${item.title}`);
  };

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

  const [openExportMenu, setOpenExportMenu] = useState<string | null>(null);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Publishing Hub</h1>
        <div className="flex items-center gap-2">
          {loading && (
            <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-t-[#a78bfa]" style={{ borderColor: "var(--border)", borderTopColor: "var(--primary)" }} />
          )}
          <div className="relative" ref={batchMenuRef}>
            <button
              onClick={() => setShowBatchMenu(!showBatchMenu)}
              className="h-9 rounded-lg px-4 text-sm font-medium transition-colors"
              style={{ border: "1px solid var(--border)", color: "var(--muted-foreground)", background: "transparent" }}
            >
              导出全部
            </button>
            {showBatchMenu && (
              <div className="absolute right-0 top-10 z-40 w-44 rounded-lg py-1 shadow-lg" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
                <button onClick={() => { handleExportAllJson(); setShowBatchMenu(false); }} className="w-full px-3 py-2 text-left text-sm hover:bg-white/5 transition-colors" style={{ color: "var(--muted-foreground)" }}>导出全部 JSON</button>
                <button onClick={() => { handleExportAllMarkdown(); setShowBatchMenu(false); }} className="w-full px-3 py-2 text-left text-sm hover:bg-white/5 transition-colors" style={{ color: "var(--muted-foreground)" }}>导出全部 Markdown</button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1" style={{ borderBottom: "1px solid var(--border)" }}>
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.key ? "border-[#a78bfa] text-white" : "border-transparent hover:text-white/80"
            }`}
            style={activeTab !== tab.key ? { color: "var(--muted-foreground)" } : undefined}
          >
            {tab.label}
            <span className="ml-1.5 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-xs font-medium" style={{ background: "var(--muted)", color: "var(--muted-foreground)" }}>
              {tabCounts[tab.key]}
            </span>
          </button>
        ))}
      </div>

      <div className="space-y-4">
        {filteredItems.map((item) => (
          <div key={item.id} className="rounded-xl p-6" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-semibold text-foreground">{item.title}</h3>
                  {item.fromApi && (
                    <span className="rounded bg-[#a78bfa]/20 px-1.5 py-0.5 text-[10px] font-medium text-[#a78bfa]">AI 生成</span>
                  )}
                </div>
                <p className="text-xs mt-1" style={{ color: "var(--muted-foreground)" }}>{item.campaign} · 计划发布：{item.scheduledAt}</p>
                {item.tags && item.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {item.tags.map((tag) => (
                      <span key={tag} className="rounded-full px-2 py-0.5 text-[10px]" style={{ background: "var(--muted)", color: "var(--muted-foreground)" }}>#{tag}</span>
                    ))}
                  </div>
                )}
              </div>
              <span className="text-xs" style={{ color: "var(--muted-foreground)" }}>{item.id}</span>
            </div>

            {item.body && (
              <p className="text-sm mb-4 line-clamp-2" style={{ color: "var(--muted-foreground)" }}>{item.body}</p>
            )}

            <div>
              {item.platforms.map((ps) => (
                <div key={ps.platform} className="flex items-center justify-between py-3 last:border-0" style={{ borderBottom: "1px solid var(--border)" }}>
                  <div className="flex items-center gap-3">
                    <span className="text-sm">{ps.ready ? "✅" : "⬜"}</span>
                    <span className="text-sm font-medium w-16" style={{ color: "var(--muted-foreground)" }}>{ps.platform}</span>
                    <span className="text-xs" style={{ color: "var(--muted-foreground)" }}>{ps.format}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setPreviewItem(item)} className="h-7 rounded-md px-2.5 text-xs font-medium transition-colors hover:bg-white/5" style={{ border: "1px solid var(--border)", color: "var(--muted-foreground)" }}>预览</button>
                    {ps.ready ? (
                      <button onClick={() => handleCopyToClipboard(item)} className="h-7 rounded-md px-2.5 text-xs font-medium transition-colors hover:bg-white/5" style={{ border: "1px solid var(--border)", color: "var(--muted-foreground)" }}>复制</button>
                    ) : (
                      <button className="h-7 rounded-md px-2.5 text-xs font-medium text-[#22d3ee] transition-colors hover:bg-[#22d3ee]/10" style={{ border: "1px solid rgba(34,211,238,0.3)" }}>生成</button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-end gap-2 mt-4 pt-3" style={{ borderTop: "1px solid var(--border)" }}>
              <div className="relative">
                <button onClick={() => setOpenExportMenu(openExportMenu === item.id ? null : item.id)} className="h-8 rounded-lg px-3 text-sm font-medium transition-colors hover:bg-white/5" style={{ border: "1px solid var(--border)", color: "var(--muted-foreground)" }}>导出 ▾</button>
                {openExportMenu === item.id && (
                  <div className="absolute right-0 top-9 z-40 w-40 rounded-lg py-1 shadow-lg" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
                    <button onClick={() => { handleExportJson(item); setOpenExportMenu(null); }} className="w-full px-3 py-2 text-left text-sm hover:bg-white/5 transition-colors" style={{ color: "var(--muted-foreground)" }}>JSON 导出</button>
                    <button onClick={() => { handleExportMarkdown(item); setOpenExportMenu(null); }} className="w-full px-3 py-2 text-left text-sm hover:bg-white/5 transition-colors" style={{ color: "var(--muted-foreground)" }}>Markdown 导出</button>
                  </div>
                )}
              </div>
              {item.tab === "exported" && (
                <button onClick={() => handleMarkPublished(item)} className="h-8 rounded-lg px-3 text-sm font-medium text-white transition-colors" style={{ background: "linear-gradient(135deg, #a78bfa, #7c3aed)" }}>标记为已发布</button>
              )}
            </div>
          </div>
        ))}

        {filteredItems.length === 0 && (
          <div className="flex h-40 items-center justify-center rounded-xl border-dashed" style={{ border: "1px dashed var(--border)" }}>
            <span className="text-sm" style={{ color: "var(--muted-foreground)" }}>暂无内容</span>
          </div>
        )}
      </div>

      {previewItem && <PlatformPreviewModal item={previewItem} onClose={() => setPreviewItem(null)} />}
      {toast && !previewItem && <Toast message={toast} onClose={() => setToast("")} />}
    </div>
  );
}
