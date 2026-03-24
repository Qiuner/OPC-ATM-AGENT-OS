"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  PackageIcon,
  PaletteIcon,
  UsersIcon,
  FileTextIcon,
  PlusIcon,
  Loader2Icon,
  ImagePlusIcon,
  XIcon,
  DownloadIcon,
  UploadIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  HistoryIcon,
} from "lucide-react";
import type { ContextAsset, ContextAssetType } from "@/types";

// ---------- Version history type ----------
interface ContextAssetVersion {
  title: string;
  content: string;
  type: ContextAssetType;
  metadata: Record<string, unknown>;
  saved_at: string;
}

// Extend ContextAsset with optional versions stored in metadata
interface ContextAssetWithVersions extends ContextAsset {
  metadata: Record<string, unknown> & {
    images?: string[];
    versions?: ContextAssetVersion[];
  };
}

// ---------- Constants ----------
const tabs: { label: string; value: ContextAssetType | "all" }[] = [
  { label: "全部", value: "all" },
  { label: "产品", value: "product" },
  { label: "品牌", value: "brand" },
  { label: "受众", value: "audience" },
  { label: "案例", value: "content" },
];

const typeConfig: Record<
  ContextAssetType,
  { icon: typeof PackageIcon; bgClass: string; textClass: string; badgeClass: string }
> = {
  product: {
    icon: PackageIcon,
    bgClass: "bg-[#a78bfa]/20",
    textClass: "text-[#a78bfa]",
    badgeClass: "bg-[#a78bfa]/20 text-[#a78bfa] border-transparent",
  },
  brand: {
    icon: PaletteIcon,
    bgClass: "bg-[#a78bfa]/20",
    textClass: "text-[#a78bfa]",
    badgeClass: "bg-[#a78bfa]/20 text-[#a78bfa] border-transparent",
  },
  audience: {
    icon: UsersIcon,
    bgClass: "bg-[#22d3ee]/20",
    textClass: "text-[#22d3ee]",
    badgeClass: "bg-[#22d3ee]/20 text-[#22d3ee] border-transparent",
  },
  content: {
    icon: FileTextIcon,
    bgClass: "bg-orange-500/20",
    textClass: "text-orange-400",
    badgeClass: "bg-orange-500/20 text-orange-400 border-transparent",
  },
};

const typeLabels: Record<ContextAssetType, string> = {
  product: "产品",
  brand: "品牌",
  audience: "受众",
  content: "案例",
};

// ---------- Validation errors ----------
interface FormErrors {
  title?: string;
  type?: string;
  content?: string;
}

export default function ContextVaultPage() {
  const [activeTab, setActiveTab] = useState<ContextAssetType | "all">("all");
  const [assets, setAssets] = useState<ContextAssetWithVersions[]>([]);
  const [loading, setLoading] = useState(true);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<ContextAssetWithVersions | null>(null);
  const [saving, setSaving] = useState(false);
  const [images, setImages] = useState<string[]>([]);
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [notification, setNotification] = useState<string | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [versionDialogAsset, setVersionDialogAsset] = useState<ContextAssetWithVersions | null>(null);
  const [importing, setImporting] = useState(false);

  const titleRef = useRef<HTMLInputElement>(null);
  const typeRef = useRef<ContextAssetType>("product");
  const contentRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const jsonInputRef = useRef<HTMLInputElement>(null);

  const MAX_IMAGE_SIZE = 2 * 1024 * 1024; // 2MB
  const MAX_IMAGES = 9;
  const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];
  const CONTENT_TRUNCATE_LENGTH = 80;

  // ---------- Notification helper ----------
  const showNotification = useCallback((msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3000);
  }, []);

  // ---------- Image handling ----------
  const handleImageUpload = useCallback(
    (files: FileList | null) => {
      if (!files) return;
      const remaining = MAX_IMAGES - images.length;
      const toProcess = Array.from(files).slice(0, remaining);

      toProcess.forEach((file) => {
        if (!ACCEPTED_TYPES.includes(file.type)) return;
        if (file.size > MAX_IMAGE_SIZE) return;

        const reader = new FileReader();
        reader.onload = (e) => {
          const result = e.target?.result as string;
          if (result) {
            setImages((prev) => {
              if (prev.length >= MAX_IMAGES) return prev;
              return [...prev, result];
            });
          }
        };
        reader.readAsDataURL(file);
      });
    },
    [images.length]
  );

  const handleRemoveImage = useCallback((index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      handleImageUpload(e.dataTransfer.files);
    },
    [handleImageUpload]
  );

  // ---------- Data fetching ----------
  const fetchAssets = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/context");
      const json = (await res.json()) as { success: boolean; data: ContextAssetWithVersions[] };
      if (json.success) {
        setAssets(json.data);
      }
    } catch {
      // silently fail, keep existing data
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAssets();
  }, [fetchAssets]);

  const filteredAssets =
    activeTab === "all"
      ? assets
      : assets.filter((a) => a.type === activeTab);

  // ---------- Expand / Collapse content ----------
  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // ---------- Sheet open ----------
  const handleOpenSheet = (asset: ContextAssetWithVersions | null) => {
    setSelectedAsset(asset);
    setFormErrors({});
    if (asset) {
      typeRef.current = asset.type;
      const savedImages = Array.isArray(asset.metadata?.images)
        ? (asset.metadata.images as string[])
        : [];
      setImages(savedImages);
    } else {
      typeRef.current = "product";
      setImages([]);
    }
    setSheetOpen(true);
  };

  // ---------- Validation ----------
  const validateForm = (): FormErrors => {
    const errors: FormErrors = {};
    const title = titleRef.current?.value?.trim();
    const content = contentRef.current?.value?.trim();

    if (!title) errors.title = "名称不能为空";
    if (!content) errors.content = "内容不能为空";

    return errors;
  };

  // ---------- Save ----------
  const handleSave = async () => {
    const errors = validateForm();
    setFormErrors(errors);
    if (Object.keys(errors).length > 0) return;

    const title = titleRef.current?.value?.trim() ?? "";
    const content = contentRef.current?.value?.trim() ?? "";
    const type = typeRef.current;

    setSaving(true);

    // Build version history
    let versions: ContextAssetVersion[] = [];
    if (selectedAsset) {
      const existingVersions = Array.isArray(selectedAsset.metadata?.versions)
        ? (selectedAsset.metadata.versions as ContextAssetVersion[])
        : [];
      // Save old state as a version
      const oldVersion: ContextAssetVersion = {
        title: selectedAsset.title,
        content: selectedAsset.content,
        type: selectedAsset.type,
        metadata: { ...selectedAsset.metadata, versions: undefined },
        saved_at: selectedAsset.updated_at,
      };
      versions = [...existingVersions, oldVersion];
    }

    const metadata: Record<string, unknown> = {
      ...(selectedAsset?.metadata ?? {}),
      images,
      versions,
    };

    try {
      if (selectedAsset) {
        const res = await fetch(`/api/context/${selectedAsset.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title, content, type, metadata }),
        });
        const json = (await res.json()) as { success: boolean; data: ContextAssetWithVersions };
        if (json.success) {
          setAssets((prev) =>
            prev.map((a) => (a.id === selectedAsset.id ? json.data : a))
          );
        }
      } else {
        const res = await fetch("/api/context", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title, content, type, metadata }),
        });
        const json = (await res.json()) as { success: boolean; data: ContextAssetWithVersions };
        if (json.success) {
          setAssets((prev) => [...prev, json.data]);
        }
      }
      setSheetOpen(false);
    } catch {
      // handle error silently
    } finally {
      setSaving(false);
    }
  };

  // ---------- JSON Import ----------
  const handleJsonImport = async (file: File) => {
    setImporting(true);
    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as unknown;

      const items: Array<{ type?: string; title?: string; content?: string; metadata?: Record<string, unknown> }> =
        Array.isArray(parsed) ? parsed : [parsed];

      let successCount = 0;
      for (const item of items) {
        if (!item.type || !item.title || !item.content) continue;
        try {
          const res = await fetch("/api/context", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              type: item.type,
              title: item.title,
              content: item.content,
              metadata: item.metadata ?? {},
            }),
          });
          const json = (await res.json()) as { success: boolean; data: ContextAssetWithVersions };
          if (json.success) {
            setAssets((prev) => [...prev, json.data]);
            successCount++;
          }
        } catch {
          // skip individual failures
        }
      }
      showNotification(`成功导入 ${successCount} 条资产`);
    } catch {
      showNotification("JSON 解析失败，请检查文件格式");
    } finally {
      setImporting(false);
      if (jsonInputRef.current) jsonInputRef.current.value = "";
    }
  };

  // ---------- JSON Export ----------
  const handleJsonExport = async () => {
    try {
      const res = await fetch("/api/context");
      const json = (await res.json()) as { success: boolean; data: ContextAssetWithVersions[] };
      if (!json.success) return;

      const blob = new Blob([JSON.stringify(json.data, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `context-vault-${new Date().toISOString().split("T")[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showNotification("导出成功");
    } catch {
      showNotification("导出失败");
    }
  };

  // ---------- Helpers ----------
  const getStatus = (asset: ContextAssetWithVersions): "complete" | "incomplete" => {
    return asset.metadata?.status === "complete" ? "complete" : "incomplete";
  };

  const formatDate = (dateStr: string) => {
    return dateStr.split("T")[0];
  };

  return (
    <div className="space-y-6">
      {/* Notification Toast */}
      {notification && (
        <div
          className="fixed top-4 right-4 z-50 px-4 py-2 rounded-lg shadow-lg text-sm text-white animate-in fade-in slide-in-from-top-2"
          style={{ background: "rgba(167,139,250,0.9)" }}
        >
          {notification}
        </div>
      )}

      {/* Hidden JSON file input */}
      <input
        ref={jsonInputRef}
        type="file"
        accept=".json"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleJsonImport(file);
        }}
      />

      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Context Vault</h1>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => jsonInputRef.current?.click()}
            disabled={importing}
            className="border-white/[0.08] bg-transparent hover:bg-white/5"
            style={{ color: "rgba(255,255,255,0.6)" }}
          >
            {importing ? (
              <Loader2Icon className="size-4 mr-1.5 animate-spin" />
            ) : (
              <UploadIcon className="size-4 mr-1.5" />
            )}
            导入 JSON
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleJsonExport}
            className="border-white/[0.08] bg-transparent hover:bg-white/5"
            style={{ color: "rgba(255,255,255,0.6)" }}
          >
            <DownloadIcon className="size-4 mr-1.5" />
            导出 JSON
          </Button>
          <Button
            className="bg-gradient-to-r from-[#a78bfa] to-[#7c3aed] text-white hover:opacity-90 border-0"
            onClick={() => handleOpenSheet(null)}
          >
            <PlusIcon className="size-4 mr-1.5" />
            新增资产
          </Button>
        </div>
      </div>

      {/* Tab Filter */}
      <div
        className="flex gap-1 rounded-lg p-1"
        style={{ background: "rgba(255,255,255,0.04)" }}
      >
        {tabs.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setActiveTab(tab.value)}
            className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
              activeTab === tab.value
                ? "bg-white/10 text-white shadow-sm font-medium"
                : "hover:text-white/80"
            }`}
            style={activeTab !== tab.value ? { color: "rgba(255,255,255,0.4)" } : undefined}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Asset List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2Icon className="size-6 animate-spin" style={{ color: "rgba(255,255,255,0.25)" }} />
        </div>
      ) : (
        <div
          className="rounded-xl overflow-hidden"
          style={{ border: "1px solid rgba(255,255,255,0.08)" }}
        >
          {filteredAssets.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm" style={{ color: "rgba(255,255,255,0.25)" }}>
              暂无数据
            </div>
          ) : (
            filteredAssets.map((asset, idx) => {
              const config = typeConfig[asset.type];
              const Icon = config.icon;
              const status = getStatus(asset);
              const isExpanded = expandedIds.has(asset.id);
              const needsTruncate = asset.content.length > CONTENT_TRUNCATE_LENGTH;
              const displayContent =
                needsTruncate && !isExpanded
                  ? asset.content.slice(0, CONTENT_TRUNCATE_LENGTH) + "..."
                  : asset.content;
              const imgs = Array.isArray(asset.metadata?.images)
                ? (asset.metadata.images as string[])
                : [];
              const versions = Array.isArray(asset.metadata?.versions)
                ? (asset.metadata.versions as ContextAssetVersion[])
                : [];

              return (
                <div
                  key={asset.id}
                  className="hover:bg-white/[0.02] transition-colors"
                  style={idx < filteredAssets.length - 1 ? { borderBottom: "1px solid rgba(255,255,255,0.08)" } : undefined}
                >
                  <div
                    onClick={() => handleOpenSheet(asset)}
                    className="flex items-center justify-between px-4 py-3 cursor-pointer"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {imgs.length > 0 ? (
                        <div
                          className="size-9 rounded-lg shrink-0 overflow-hidden"
                          style={{ border: "1px solid rgba(255,255,255,0.08)" }}
                        >
                          <img src={imgs[0]} alt="" className="w-full h-full object-cover" />
                        </div>
                      ) : (
                        <div
                          className={`flex items-center justify-center size-9 rounded-lg shrink-0 ${config.bgClass}`}
                        >
                          <Icon className={`size-4 ${config.textClass}`} />
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-white truncate">
                          {asset.title}
                        </p>
                        <p className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>
                          {displayContent}
                          {needsTruncate && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleExpand(asset.id);
                              }}
                              className="ml-1 text-[#a78bfa] hover:text-[#c4b5fd] inline-flex items-center"
                            >
                              {isExpanded ? (
                                <>
                                  收起
                                  <ChevronUpIcon className="size-3 ml-0.5" />
                                </>
                              ) : (
                                <>
                                  展开
                                  <ChevronDownIcon className="size-3 ml-0.5" />
                                </>
                              )}
                            </button>
                          )}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0 ml-4">
                      {/* Type badge */}
                      <Badge variant="secondary" className={config.badgeClass}>
                        {typeLabels[asset.type]}
                      </Badge>
                      {imgs.length > 0 && (
                        <Badge
                          variant="outline"
                          className="bg-[#a78bfa]/10 text-[#a78bfa] border-[#a78bfa]/30"
                        >
                          {imgs.length} 张素材
                        </Badge>
                      )}
                      {versions.length > 0 && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setVersionDialogAsset(asset);
                          }}
                          className="flex items-center gap-1 text-xs hover:text-white/60"
                          style={{ color: "rgba(255,255,255,0.25)" }}
                          title="查看历史版本"
                        >
                          <HistoryIcon className="size-3.5" />
                          {versions.length}
                        </button>
                      )}
                      <Badge
                        variant={status === "complete" ? "secondary" : "outline"}
                        className={
                          status === "complete"
                            ? "bg-[#22d3ee]/20 text-[#22d3ee] border-transparent"
                            : "bg-amber-500/10 text-amber-400 border-amber-500/30"
                        }
                      >
                        {status === "complete" ? "已完善" : "待补充"}
                      </Badge>
                      <span className="text-xs whitespace-nowrap" style={{ color: "rgba(255,255,255,0.25)" }}>
                        {formatDate(asset.created_at)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Version History Dialog */}
      <Dialog
        open={versionDialogAsset !== null}
        onOpenChange={(open) => {
          if (!open) setVersionDialogAsset(null);
        }}
      >
        <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>历史版本 — {versionDialogAsset?.title}</DialogTitle>
            <DialogDescription>
              共 {(versionDialogAsset?.metadata?.versions as ContextAssetVersion[] | undefined)?.length ?? 0} 个历史版本
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            {(
              (versionDialogAsset?.metadata?.versions as ContextAssetVersion[] | undefined) ?? []
            )
              .slice()
              .reverse()
              .map((ver, idx) => (
                <div
                  key={idx}
                  className="rounded-lg p-3 space-y-1"
                  style={{ border: "1px solid rgba(255,255,255,0.08)" }}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-white">
                      {ver.title}
                    </span>
                    <span className="text-xs" style={{ color: "rgba(255,255,255,0.25)" }}>
                      {formatDate(ver.saved_at)}
                    </span>
                  </div>
                  <Badge variant="secondary" className={typeConfig[ver.type].badgeClass}>
                    {typeLabels[ver.type]}
                  </Badge>
                  <p className="text-xs whitespace-pre-wrap mt-1" style={{ color: "rgba(255,255,255,0.4)" }}>
                    {ver.content.length > 200 ? ver.content.slice(0, 200) + "..." : ver.content}
                  </p>
                </div>
              ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit / Create Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="right" className="w-[560px] sm:max-w-[560px]">
          <SheetHeader>
            <SheetTitle>
              {selectedAsset ? "编辑资产" : "新增资产"}
            </SheetTitle>
            <SheetDescription>
              {selectedAsset
                ? "修改上下文资产的详细信息"
                : "添加新的上下文资产到 Vault"}
            </SheetDescription>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto px-4 space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium" style={{ color: "rgba(255,255,255,0.6)" }}>
                名称 <span className="text-red-500">*</span>
              </label>
              <Input
                ref={titleRef}
                placeholder="资产名称"
                defaultValue={selectedAsset?.title ?? ""}
                key={selectedAsset?.id ?? "new"}
                className={formErrors.title ? "border-red-500" : ""}
                onChange={() => {
                  if (formErrors.title) setFormErrors((prev) => ({ ...prev, title: undefined }));
                }}
              />
              {formErrors.title && (
                <p className="text-xs text-red-500">{formErrors.title}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium" style={{ color: "rgba(255,255,255,0.6)" }}>
                类型 <span className="text-red-500">*</span>
              </label>
              <Select
                defaultValue={selectedAsset?.type ?? "product"}
                onValueChange={(v) => {
                  typeRef.current = v as ContextAssetType;
                }}
                key={selectedAsset?.id ?? "new-select"}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="选择类型" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="product">产品</SelectItem>
                  <SelectItem value="brand">品牌</SelectItem>
                  <SelectItem value="audience">受众</SelectItem>
                  <SelectItem value="content">案例</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium" style={{ color: "rgba(255,255,255,0.6)" }}>
                内容 <span className="text-red-500">*</span>
              </label>
              <Textarea
                ref={contentRef}
                placeholder="输入资产详细内容..."
                className={`min-h-[200px] resize-y ${formErrors.content ? "border-red-500" : ""}`}
                defaultValue={selectedAsset?.content ?? ""}
                key={selectedAsset?.id ?? "new-content"}
                onChange={() => {
                  if (formErrors.content) setFormErrors((prev) => ({ ...prev, content: undefined }));
                }}
              />
              {formErrors.content && (
                <p className="text-xs text-red-500">{formErrors.content}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium" style={{ color: "rgba(255,255,255,0.6)" }}>
                标签
              </label>
              <Input
                placeholder="用逗号分隔多个标签"
                defaultValue={
                  selectedAsset ? typeLabels[selectedAsset.type] : ""
                }
                key={selectedAsset?.id ?? "new-tags"}
              />
            </div>

            {/* Image upload area */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium" style={{ color: "rgba(255,255,255,0.6)" }}>
                素材图片
              </label>

              {images.length < MAX_IMAGES && (
                <label
                  className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-xl cursor-pointer hover:border-[#a78bfa] hover:bg-white/[0.02] transition-colors"
                  style={{ borderColor: "rgba(255,255,255,0.08)" }}
                  onDrop={handleDrop}
                  onDragOver={(e) => e.preventDefault()}
                >
                  <ImagePlusIcon className="w-8 h-8 mb-2" style={{ color: "rgba(255,255,255,0.25)" }} />
                  <span className="text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>
                    点击或拖拽上传图片素材
                  </span>
                  <span className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.25)" }}>
                    支持 JPG/PNG/WebP，单张 &le; 2MB，最多 {MAX_IMAGES} 张
                  </span>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    multiple
                    className="hidden"
                    onChange={(e) => handleImageUpload(e.target.files)}
                  />
                </label>
              )}

              {images.length > 0 && (
                <div className="grid grid-cols-3 gap-2 mt-3">
                  {images.map((img, i) => (
                    <div
                      key={i}
                      className="relative group aspect-square rounded-lg overflow-hidden"
                      style={{ border: "1px solid rgba(255,255,255,0.08)" }}
                    >
                      <img
                        src={img}
                        alt={`素材 ${i + 1}`}
                        className="w-full h-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveImage(i)}
                        className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/50 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <XIcon className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <SheetFooter>
            <Button
              variant="outline"
              onClick={() => setSheetOpen(false)}
              className="border-white/[0.08] bg-transparent hover:bg-white/5"
              style={{ color: "rgba(255,255,255,0.6)" }}
            >
              取消
            </Button>
            <Button
              className="bg-gradient-to-r from-[#a78bfa] to-[#7c3aed] text-white hover:opacity-90 border-0"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? (
                <Loader2Icon className="size-4 mr-1.5 animate-spin" />
              ) : null}
              保存
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}
