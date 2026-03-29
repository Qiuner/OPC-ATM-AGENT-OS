import { useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import type { Content } from "@/types";
import { getApi } from "@/lib/ipc";
import { stripMarkdown } from "@/lib/strip-markdown";
import { XPreview } from "@/components/features/platform-preview/x-preview";
import { LinkedInPreview } from "@/components/features/platform-preview/linkedin-preview";
import { TikTokPreview } from "@/components/features/platform-preview/tiktok-preview";
import { MetaPreview } from "@/components/features/platform-preview/meta-preview";
import { EmailPreview } from "@/components/features/platform-preview/email-preview";
import { BlogPreview } from "@/components/features/platform-preview/blog-preview";
import { XhsPreview } from "@/components/features/platform-preview/xhs-preview";
import type { PlatformPreviewProps, PlatformKey } from "@/components/features/platform-preview/types";
import {
  ALL_PLATFORMS,
  PLATFORM_LABELS,
  PLATFORM_BRAND_COLORS,
  PLATFORM_FORMATTERS,
} from "@/components/features/platform-preview/types";

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
  platform: string;
  mediaUrls: string[];
  metadata?: Record<string, unknown>;
}

type TabKey = "pending" | "exported" | "published";

// --------------- Constants ---------------

const TABS: { key: TabKey; label: string }[] = [
  { key: "pending", label: "待发布" },
  { key: "exported", label: "已导出" },
  { key: "published", label: "已发布" },
];

const PREVIEW_COMPONENTS: Record<PlatformKey, React.ComponentType<PlatformPreviewProps>> = {
  X: XPreview,
  LinkedIn: LinkedInPreview,
  TikTok: TikTokPreview,
  Meta: MetaPreview,
  Email: EmailPreview,
  Blog: BlogPreview,
  小红书: XhsPreview,
};

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
    platform: content.platform || 'general',
    mediaUrls: content.media_urls || [],
    metadata: content.metadata,
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

/** Map platform string from DB to PlatformKey for preview */
function getDefaultPreviewPlatform(platformStr: string): PlatformKey {
  if (platformStr === 'xiaohongshu') return '小红书';
  if (platformStr === 'x' || platformStr === 'twitter') return 'X';
  if (platformStr === 'linkedin') return 'LinkedIn';
  if (platformStr === 'tiktok' || platformStr === 'douyin') return 'TikTok';
  if (platformStr === 'meta' || platformStr === 'facebook') return 'Meta';
  return '小红书'; // default
}

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

// --------------- Main Page ---------------

export function PublishingPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [items, setItems] = useState<PublishItem[]>([]);
  const [activeTab, setActiveTab] = useState<TabKey>("pending");
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [previewPlatform, setPreviewPlatform] = useState<PlatformKey>("小红书");
  const [publishing, setPublishing] = useState<string | null>(null);
  const [publishProgress, setPublishProgress] = useState<{ stage: string; message: string } | null>(null);
  const [xhsLoggedIn, setXhsLoggedIn] = useState<boolean | null>(null);

  // 检查小红书登录状态
  useEffect(() => {
    const api = getApi();
    if (!api) return;
    api.platformAuth.status().then(res => {
      if (res.success && res.data) {
        const xhs = (res.data as { xhs?: { loggedIn: boolean } }).xhs;
        setXhsLoggedIn(xhs?.loggedIn ?? false);
      }
    }).catch(() => setXhsLoggedIn(false));
  }, []);

  // 监听发布进度
  useEffect(() => {
    const api = getApi();
    if (!api) return;
    const unsub = api.agent.onPublishProgress((data) => {
      setPublishProgress({ stage: data.stage, message: data.message });
      if (data.stage === 'done' || data.stage === 'error') {
        setTimeout(() => setPublishProgress(null), 3000);
      }
    });
    return unsub;
  }, []);

  const handlePublishToXhs = async (item: PublishItem) => {
    const api = getApi();
    if (!api) return;

    if (xhsLoggedIn === false) {
      setToast('请先在设置中完成小红书扫码登录');
      return;
    }

    setPublishing(item.id);
    setPublishProgress(null);
    try {
      const res = await api.agent.publish({
        contentId: item.id,
        title: item.title,
        body: stripMarkdown(item.body || ''),
        tags: item.tags || [],
        images: item.mediaUrls || [],
        platform: 'xiaohongshu',
      });
      if (res.success) {
        setItems(prev => prev.map(i =>
          i.id === item.id ? { ...i, tab: 'published' as const } : i
        ));
        setToast(`已发布到小红书: ${item.title}`);
      } else {
        const errMsg = (res as { error?: string }).error || '未知错误';
        if (errMsg === 'XHS_NOT_LOGGED_IN') {
          setXhsLoggedIn(false);
          setToast('未登录小红书，请先在设置中完成扫码登录');
        } else {
          setToast(`发布失败: ${errMsg}`);
        }
      }
    } catch (err) {
      setToast(`发布失败: ${err instanceof Error ? err.message : '网络错误'}`);
    } finally {
      setPublishing(null);
    }
  };

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

      setItems(apiItems);
      // Auto-select from query param or first item
      const paramId = searchParams.get('contentId');
      const target = paramId ? apiItems.find(i => i.id === paramId) : null;
      if (target) {
        setSelectedId(target.id);
        setPreviewPlatform(getDefaultPreviewPlatform(target.platform));
        // Clear query param after consuming
        setSearchParams({}, { replace: true });
      } else if (apiItems.length > 0 && !selectedId) {
        setSelectedId(apiItems[0].id);
        setPreviewPlatform(getDefaultPreviewPlatform(apiItems[0].platform));
      }
    } catch (err) {
      console.error('[Publishing] Failed to fetch contents:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedId]);

  useEffect(() => { fetchContents(); }, [fetchContents]);

  const filteredItems = items
    .filter((item) => item.tab === activeTab)
    .sort((a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime());

  const tabCounts: Record<TabKey, number> = {
    pending: items.filter((i) => i.tab === "pending").length,
    exported: items.filter((i) => i.tab === "exported").length,
    published: items.filter((i) => i.tab === "published").length,
  };

  const selectedItem = selectedId ? filteredItems.find(i => i.id === selectedId) : filteredItems[0] ?? null;

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

  const handleCopyFormatted = async () => {
    if (!selectedItem) return;
    const formatted = PLATFORM_FORMATTERS[previewPlatform](selectedItem);
    try {
      await navigator.clipboard.writeText(formatted);
      setToast(`已复制 ${PLATFORM_LABELS[previewPlatform]} 格式文案`);
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

  const PreviewComponent = selectedItem ? PREVIEW_COMPONENTS[previewPlatform] : null;

  return (
    <div className="space-y-4 h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between shrink-0">
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

      {/* Tabs */}
      <div className="flex items-center gap-1 shrink-0" style={{ borderBottom: "1px solid var(--border)" }}>
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => { setActiveTab(tab.key); setSelectedId(null); }}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.key ? "border-[#a78bfa] text-[#a78bfa]" : "border-transparent"
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

      {/* Left-right split layout */}
      <div className="flex gap-4 flex-1 min-h-0">
        {/* ── Left: Content list (40%) ── */}
        <div className="w-[40%] shrink-0 overflow-y-auto space-y-2 pr-1">
          {filteredItems.length === 0 && (
            <div className="flex h-40 items-center justify-center rounded-xl border-dashed" style={{ border: "1px dashed var(--border)" }}>
              <span className="text-sm" style={{ color: "var(--muted-foreground)" }}>暂无内容</span>
            </div>
          )}

          {filteredItems.map((item) => {
            const isSelected = selectedItem?.id === item.id;
            return (
              <div
                key={item.id}
                onClick={() => {
                  setSelectedId(item.id);
                  setPreviewPlatform(getDefaultPreviewPlatform(item.platform));
                }}
                className={`rounded-xl p-4 cursor-pointer transition-all ${
                  isSelected ? 'ring-1 ring-[#a78bfa]/50' : 'hover:bg-white/[0.02]'
                }`}
                style={{
                  background: isSelected ? 'var(--card)' : 'transparent',
                  border: `1px solid ${isSelected ? 'var(--border)' : 'transparent'}`,
                }}
              >
                {/* Title row */}
                <div className="flex items-center gap-2 mb-1">
                  {item.mediaUrls.length > 0 && (
                    <img
                      src={item.mediaUrls[0].startsWith('http') ? item.mediaUrls[0] : `file://${item.mediaUrls[0]}`}
                      alt=""
                      className="h-10 w-10 rounded-lg object-cover shrink-0"
                      style={{ border: '1px solid var(--border)' }}
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold text-foreground truncate">{item.title}</h3>
                      {item.fromApi && (
                        <span className="rounded bg-[#a78bfa]/20 px-1 py-0.5 text-[9px] font-medium text-[#a78bfa] shrink-0">AI</span>
                      )}
                    </div>
                    <p className="text-[11px] mt-0.5 truncate" style={{ color: "var(--muted-foreground)" }}>
                      {item.campaign} · {item.scheduledAt}
                    </p>
                  </div>
                </div>

                {/* Tags */}
                {item.tags && item.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {item.tags.slice(0, 4).map((tag) => (
                      <span key={tag} className="rounded-full px-1.5 py-0.5 text-[9px]" style={{ background: "var(--muted)", color: "var(--muted-foreground)" }}>#{tag}</span>
                    ))}
                    {item.tags.length > 4 && (
                      <span className="text-[9px] px-1" style={{ color: "var(--muted-foreground)" }}>+{item.tags.length - 4}</span>
                    )}
                  </div>
                )}

                {/* Actions row */}
                <div className="flex items-center justify-between mt-3 pt-2" style={{ borderTop: '1px solid var(--border)' }}>
                  <div className="relative">
                    <button
                      onClick={(e) => { e.stopPropagation(); setOpenExportMenu(openExportMenu === item.id ? null : item.id); }}
                      className="h-7 rounded-md px-2 text-[11px] font-medium transition-colors hover:bg-white/5"
                      style={{ border: "1px solid var(--border)", color: "var(--muted-foreground)" }}
                    >
                      导出 ▾
                    </button>
                    {openExportMenu === item.id && (
                      <div className="absolute left-0 top-8 z-40 w-36 rounded-lg py-1 shadow-lg" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
                        <button onClick={(e) => { e.stopPropagation(); handleExportJson(item); setOpenExportMenu(null); }} className="w-full px-3 py-1.5 text-left text-[11px] hover:bg-white/5 transition-colors" style={{ color: "var(--muted-foreground)" }}>JSON</button>
                        <button onClick={(e) => { e.stopPropagation(); handleExportMarkdown(item); setOpenExportMenu(null); }} className="w-full px-3 py-1.5 text-left text-[11px] hover:bg-white/5 transition-colors" style={{ color: "var(--muted-foreground)" }}>Markdown</button>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5">
                    {item.tab === "pending" && item.platform === "xiaohongshu" && (
                      <button
                        onClick={(e) => { e.stopPropagation(); handlePublishToXhs(item); }}
                        disabled={publishing === item.id || xhsLoggedIn === false}
                        className="h-7 rounded-md px-2.5 text-[11px] font-medium text-white transition-colors disabled:opacity-50"
                        style={{ background: xhsLoggedIn === false ? '#666' : 'linear-gradient(135deg, #FF2442, #FF6B81)' }}
                        title={xhsLoggedIn === false ? '请先在设置中完成小红书扫码登录' : undefined}
                      >
                        {publishing === item.id ? '发布中...' : '发布小红书'}
                      </button>
                    )}
                    {item.tab === "exported" && (
                      <button
                        onClick={(e) => { e.stopPropagation(); handleMarkPublished(item); }}
                        className="h-7 rounded-md px-2.5 text-[11px] font-medium text-white transition-colors"
                        style={{ background: "linear-gradient(135deg, #a78bfa, #7c3aed)" }}
                      >
                        标记已发布
                      </button>
                    )}
                  </div>
                </div>

                {/* Publish progress */}
                {publishing === item.id && publishProgress && (
                  <div className="mt-2 text-[11px] truncate" style={{ color: publishProgress.stage === 'error' ? '#f87171' : 'var(--muted-foreground)' }}>
                    {publishProgress.message}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* ── Right: Platform preview (60%) ── */}
        <div className="flex-1 flex flex-col min-h-0 rounded-xl" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
          {selectedItem ? (
            <>
              {/* Platform tab switcher */}
              <div className="flex items-center justify-between px-4 pt-3 pb-2 shrink-0" style={{ borderBottom: '1px solid var(--border)' }}>
                <div className="flex flex-wrap gap-1">
                  {ALL_PLATFORMS.map((p) => {
                    const isActive = previewPlatform === p;
                    const brandColor = PLATFORM_BRAND_COLORS[p];
                    return (
                      <button
                        key={p}
                        onClick={() => setPreviewPlatform(p)}
                        className="rounded-md px-2.5 py-1 text-[11px] font-medium transition-all"
                        style={
                          isActive
                            ? {
                                background: `${brandColor}20`,
                                color: brandColor,
                                border: `1px solid ${brandColor}40`,
                              }
                            : {
                                color: 'var(--muted-foreground)',
                                border: '1px solid transparent',
                              }
                        }
                      >
                        {p}
                      </button>
                    );
                  })}
                </div>
                <button
                  onClick={handleCopyFormatted}
                  className="h-7 rounded-md px-2.5 text-[11px] font-medium transition-colors hover:bg-white/5 shrink-0"
                  style={{ border: '1px solid var(--border)', color: 'var(--muted-foreground)' }}
                >
                  复制文案
                </button>
              </div>

              {/* Platform label */}
              <div className="px-4 pt-2 pb-1 shrink-0">
                <p className="text-[11px]" style={{ color: 'var(--muted-foreground)' }}>
                  {PLATFORM_LABELS[previewPlatform]} · {selectedItem.title}
                </p>
              </div>

              {/* Preview component */}
              <div className="flex-1 overflow-y-auto px-4 pb-4">
                <div className="flex justify-center py-4">
                  <div key={`${selectedItem.id}-${previewPlatform}`} className="animate-in fade-in duration-200">
                    {PreviewComponent && <PreviewComponent item={selectedItem} />}
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <span className="text-sm" style={{ color: "var(--muted-foreground)" }}>
                {filteredItems.length === 0 ? '暂无内容' : '选择左侧内容查看预览'}
              </span>
            </div>
          )}
        </div>
      </div>

      {toast && <Toast message={toast} onClose={() => setToast("")} />}
    </div>
  );
}
