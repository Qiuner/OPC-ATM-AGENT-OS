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
  SettingsIcon,
  GlobeIcon,
  LinkIcon,
  Trash2Icon,
  PencilIcon,
  MailIcon,
  FileUpIcon,
  InfoIcon,
  CheckCircleIcon,
  AlertCircleIcon,
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

// ---------- Product card (scraped) ----------
interface ProductCard {
  id: string;
  name: string;
  description: string;
  price: string | null;
  image: string | null;
  features: string[];
  url: string;
  scraped_at: string;
}

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

  // ---------- Brand Setup state ----------
  const [brandSetupOpen, setBrandSetupOpen] = useState(true);
  const [brandTab, setBrandTab] = useState<"product-url" | "skills" | "email">("product-url");
  const [scrapeUrl, setScrapeUrl] = useState("");
  const [scraping, setScraping] = useState(false);
  const [productCards, setProductCards] = useState<ProductCard[]>([]);

  // Custom Skills state
  const [customSkills, setCustomSkills] = useState<
    { id: string; name: string; description: string; content: string; updatedAt: string }[]
  >([]);
  const [skillName, setSkillName] = useState("");
  const [skillContent, setSkillContent] = useState("");
  const [skillSaving, setSkillSaving] = useState(false);

  // Email Config state
  const [emailAddress, setEmailAddress] = useState("");
  const [senderName, setSenderName] = useState("");
  const [emailVerified, setEmailVerified] = useState(false);
  const [savingEmail, setSavingEmail] = useState(false);

  const titleRef = useRef<HTMLInputElement>(null);
  const typeRef = useRef<ContextAssetType>("product");
  const contentRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const jsonInputRef = useRef<HTMLInputElement>(null);
  const skillFileInputRef = useRef<HTMLInputElement>(null);

  const MAX_IMAGE_SIZE = 2 * 1024 * 1024; // 2MB
  const MAX_IMAGES = 9;
  const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];
  const CONTENT_TRUNCATE_LENGTH = 80;

  // ---------- Notification helper ----------
  const showNotification = useCallback((msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3000);
  }, []);

  // ---------- Scrape product URL ----------
  const handleScrape = useCallback(async () => {
    if (!scrapeUrl.trim()) return;
    setScraping(true);
    try {
      const res = await fetch("/api/context/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: scrapeUrl.trim() }),
      });
      const json = (await res.json()) as {
        success: boolean;
        data?: ContextAssetWithVersions;
        product?: ProductCard;
        error?: string;
      };
      if (json.success && json.data) {
        // Add to assets list
        setAssets((prev) => [...prev, json.data as ContextAssetWithVersions]);
        // Add to product cards
        const meta = json.data.metadata as Record<string, unknown>;
        setProductCards((prev) => [
          ...prev,
          {
            id: json.data!.id,
            name: (meta.product_name as string) || json.data!.title,
            description: (meta.product_description as string) || "",
            price: (meta.product_price as string) || null,
            image: (meta.product_image as string) || null,
            features: (meta.product_features as string[]) || [],
            url: (meta.source_url as string) || scrapeUrl,
            scraped_at: (meta.scraped_at as string) || new Date().toISOString(),
          },
        ]);
        setScrapeUrl("");
        showNotification("Product scraped successfully");
      } else {
        showNotification(json.error || "Scrape failed");
      }
    } catch {
      showNotification("Network error during scrape");
    } finally {
      setScraping(false);
    }
  }, [scrapeUrl, showNotification]);

  // Load existing product cards from assets on mount
  useEffect(() => {
    const products = assets
      .filter((a) => a.type === "product" && a.metadata?.source_url)
      .map((a) => {
        const meta = a.metadata as Record<string, unknown>;
        return {
          id: a.id,
          name: (meta.product_name as string) || a.title,
          description: (meta.product_description as string) || "",
          price: (meta.product_price as string) || null,
          image: (meta.product_image as string) || null,
          features: (meta.product_features as string[]) || [],
          url: (meta.source_url as string) || "",
          scraped_at: (meta.scraped_at as string) || a.created_at,
        };
      });
    setProductCards(products);
  }, [assets]);

  // ---------- Delete product card ----------
  const handleDeleteProduct = useCallback(async (productId: string) => {
    try {
      const res = await fetch(`/api/context/${productId}`, { method: "DELETE" });
      const json = (await res.json()) as { success: boolean };
      if (json.success) {
        setAssets((prev) => prev.filter((a) => a.id !== productId));
        setProductCards((prev) => prev.filter((p) => p.id !== productId));
        showNotification("Product deleted");
      }
    } catch {
      showNotification("Delete failed");
    }
  }, [showNotification]);

  // ---------- Custom Skills handlers ----------
  const fetchSkills = useCallback(async () => {
    try {
      const res = await fetch("/api/skills/custom");
      const json = (await res.json()) as {
        success: boolean;
        data?: { id: string; name: string; description: string; content: string; updatedAt: string }[];
      };
      if (json.success && json.data) {
        setCustomSkills(json.data);
      }
    } catch {
      // silently fail
    }
  }, []);

  const handleAddSkill = useCallback(async () => {
    if (!skillName.trim() || !skillContent.trim()) return;
    setSkillSaving(true);
    try {
      const res = await fetch("/api/skills/custom", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: skillName.trim(), content: skillContent.trim() }),
      });
      const json = (await res.json()) as { success: boolean; error?: string };
      if (json.success) {
        setSkillName("");
        setSkillContent("");
        showNotification("Skill saved successfully");
        fetchSkills();
      } else {
        showNotification(json.error || "Save failed");
      }
    } catch {
      showNotification("Network error");
    } finally {
      setSkillSaving(false);
    }
  }, [skillName, skillContent, showNotification, fetchSkills]);

  const handleDeleteSkill = useCallback(async (id: string) => {
    try {
      const res = await fetch("/api/skills/custom", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const json = (await res.json()) as { success: boolean };
      if (json.success) {
        setCustomSkills((prev) => prev.filter((s) => s.id !== id));
        showNotification("Skill deleted");
      }
    } catch {
      showNotification("Delete failed");
    }
  }, [showNotification]);

  const handleSkillFileUpload = useCallback(async (files: FileList | null) => {
    if (!files) return;
    for (const file of Array.from(files)) {
      if (!file.name.match(/\.(md|txt)$/i)) {
        showNotification("Only .md and .txt files are supported");
        continue;
      }
      if (file.size > 10 * 1024 * 1024) {
        showNotification("File too large (max 10MB)");
        continue;
      }
      try {
        const content = await file.text();
        const name = file.name.replace(/\.(md|txt)$/i, "");
        const res = await fetch("/api/skills/custom", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, content }),
        });
        const json = (await res.json()) as { success: boolean };
        if (json.success) {
          showNotification(`Skill "${name}" uploaded`);
          fetchSkills();
        }
      } catch {
        showNotification(`Failed to upload ${file.name}`);
      }
    }
    if (skillFileInputRef.current) skillFileInputRef.current.value = "";
  }, [showNotification, fetchSkills]);

  // ---------- Email Config handlers ----------
  const fetchSettings = useCallback(async () => {
    try {
      const res = await fetch("/api/settings");
      const json = (await res.json()) as {
        success: boolean;
        data?: { email?: { address: string; senderName: string; verified: boolean } };
      };
      if (json.success && json.data?.email) {
        setEmailAddress(json.data.email.address);
        setSenderName(json.data.email.senderName);
        setEmailVerified(json.data.email.verified);
      }
    } catch {
      // silently fail
    }
  }, []);

  const handleSaveEmail = useCallback(async () => {
    if (!emailAddress.trim()) return;
    setSavingEmail(true);
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: {
            address: emailAddress.trim(),
            senderName: senderName.trim() || emailAddress.trim().split("@")[0],
            verified: false,
            configuredAt: new Date().toISOString(),
          },
        }),
      });
      const json = (await res.json()) as { success: boolean };
      if (json.success) {
        setEmailVerified(false);
        showNotification("Email config saved");
      } else {
        showNotification("Save failed");
      }
    } catch {
      showNotification("Network error");
    } finally {
      setSavingEmail(false);
    }
  }, [emailAddress, senderName, showNotification]);

  // Load skills and settings on mount
  useEffect(() => {
    fetchSkills();
    fetchSettings();
  }, [fetchSkills, fetchSettings]);

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

      {/* Brand Setup Section */}
      <div
        className="rounded-2xl p-6 bg-[#0a0a0f]"
        style={{ border: "1px solid rgba(255,255,255,0.08)" }}
      >
        {/* Collapsible Header */}
        <button
          onClick={() => setBrandSetupOpen((v) => !v)}
          className="flex items-center justify-between w-full"
        >
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center size-9 rounded-lg bg-[#a78bfa]/20">
              <SettingsIcon className="size-4 text-[#a78bfa]" />
            </div>
            <h2 className="text-lg font-semibold text-white">Brand Setup</h2>
            <Badge className="bg-[#22d3ee]/20 text-[#22d3ee] border-transparent text-xs">
              {brandTab === "product-url" ? "Product URL" : brandTab === "skills" ? "Custom Skills" : "Email"}
            </Badge>
          </div>
          {brandSetupOpen ? (
            <ChevronUpIcon className="size-5" style={{ color: "rgba(255,255,255,0.4)" }} />
          ) : (
            <ChevronDownIcon className="size-5" style={{ color: "rgba(255,255,255,0.4)" }} />
          )}
        </button>

        {/* Collapsible Content */}
        {brandSetupOpen && (
          <div className="mt-5 space-y-5">
            {/* Brand Tab Switcher */}
            <div
              className="flex gap-1 rounded-lg p-1"
              style={{ background: "rgba(255,255,255,0.04)" }}
            >
              {[
                { label: "Product URL", value: "product-url" as const, icon: LinkIcon },
                { label: "Custom Skills", value: "skills" as const, icon: FileTextIcon },
                { label: "Email Config", value: "email" as const, icon: MailIcon },
              ].map((tab) => (
                <button
                  key={tab.value}
                  onClick={() => setBrandTab(tab.value)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md transition-colors ${
                    brandTab === tab.value
                      ? "bg-white/10 text-white shadow-sm font-medium"
                      : "hover:text-white/80"
                  }`}
                  style={brandTab !== tab.value ? { color: "rgba(255,255,255,0.4)" } : undefined}
                >
                  <tab.icon className="size-3.5" />
                  {tab.label}
                </button>
              ))}
            </div>

            {/* ===== Product URL Tab ===== */}
            {brandTab === "product-url" && (
              <div className="space-y-5">
                <div className="flex gap-3">
                  <Input
                    placeholder="Enter product page URL, e.g. https://example.com/product"
                    className="flex-1"
                    value={scrapeUrl}
                    onChange={(e) => setScrapeUrl(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleScrape();
                    }}
                    disabled={scraping}
                  />
                  <Button
                    className="bg-gradient-to-r from-[#a78bfa] to-[#7c3aed] text-white hover:opacity-90 border-0 shrink-0"
                    onClick={handleScrape}
                    disabled={scraping || !scrapeUrl.trim()}
                  >
                    {scraping ? (
                      <Loader2Icon className="size-4 mr-1.5 animate-spin" />
                    ) : (
                      <GlobeIcon className="size-4 mr-1.5" />
                    )}
                    {scraping ? "Scraping..." : "Scrape"}
                  </Button>
                </div>

                {productCards.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <GlobeIcon className="size-10 mb-3" style={{ color: "rgba(255,255,255,0.15)" }} />
                    <p className="text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>
                      Enter a product URL and click Scrape to auto-generate product cards
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {productCards.map((product) => (
                      <div
                        key={product.id}
                        className="rounded-xl p-4 bg-white/[0.03] transition-all hover:-translate-y-0.5"
                        style={{ border: "1px solid rgba(255,255,255,0.08)" }}
                      >
                        {product.image ? (
                          <img
                            src={product.image}
                            alt={product.name}
                            className="rounded-lg h-40 w-full object-cover mb-3"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = "none";
                            }}
                          />
                        ) : (
                          <div
                            className="rounded-lg h-40 w-full flex items-center justify-center mb-3"
                            style={{ background: "rgba(255,255,255,0.04)" }}
                          >
                            <PackageIcon className="size-8" style={{ color: "rgba(255,255,255,0.15)" }} />
                          </div>
                        )}
                        <h3 className="text-sm font-semibold text-white truncate">{product.name}</h3>
                        {product.price && (
                          <p className="text-base font-bold text-[#a78bfa] mt-1">{product.price}</p>
                        )}
                        <p
                          className="text-xs line-clamp-2 mt-1.5"
                          style={{ color: "rgba(255,255,255,0.4)" }}
                        >
                          {product.description}
                        </p>
                        <div className="flex items-center gap-1 mt-2">
                          <LinkIcon className="size-3" style={{ color: "rgba(255,255,255,0.25)" }} />
                          <span
                            className="text-xs truncate"
                            style={{ color: "rgba(255,255,255,0.25)" }}
                          >
                            {product.url}
                          </span>
                        </div>
                        <div className="flex gap-2 mt-3">
                          <Button
                            variant="outline"
                            size="sm"
                            className="border-white/[0.08] bg-transparent hover:bg-white/5 text-xs"
                            style={{ color: "rgba(255,255,255,0.6)" }}
                            onClick={() => {
                              const asset = assets.find((a) => a.id === product.id);
                              if (asset) handleOpenSheet(asset);
                            }}
                          >
                            <PencilIcon className="size-3 mr-1" />
                            Edit
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-400 hover:text-red-300 hover:bg-red-500/10 text-xs"
                            onClick={() => handleDeleteProduct(product.id)}
                          >
                            <Trash2Icon className="size-3 mr-1" />
                            Delete
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ===== Custom Skills Tab ===== */}
            {brandTab === "skills" && (
              <div className="space-y-5">
                {/* File upload dropzone */}
                <label
                  className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-xl cursor-pointer hover:border-[#a78bfa] hover:bg-white/[0.02] transition-colors"
                  style={{ borderColor: "rgba(255,255,255,0.08)" }}
                  onDrop={(e) => {
                    e.preventDefault();
                    handleSkillFileUpload(e.dataTransfer.files);
                  }}
                  onDragOver={(e) => e.preventDefault()}
                >
                  <FileUpIcon className="size-8 mb-2" style={{ color: "rgba(255,255,255,0.25)" }} />
                  <span className="text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>
                    Click or drag to upload Skills files
                  </span>
                  <span className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.25)" }}>
                    Supports .md / .txt, max 10MB per file
                  </span>
                  <input
                    ref={skillFileInputRef}
                    type="file"
                    accept=".md,.txt"
                    multiple
                    className="hidden"
                    onChange={(e) => handleSkillFileUpload(e.target.files)}
                  />
                </label>

                {/* Skills list */}
                {customSkills.length > 0 && (
                  <div
                    className="rounded-xl overflow-hidden"
                    style={{ border: "1px solid rgba(255,255,255,0.08)" }}
                  >
                    {customSkills.map((skill, idx) => (
                      <div
                        key={skill.id}
                        className="flex items-center justify-between px-4 py-3.5 hover:bg-white/[0.02]"
                        style={idx < customSkills.length - 1 ? { borderBottom: "1px solid rgba(255,255,255,0.08)" } : undefined}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="flex items-center justify-center size-8 rounded-lg bg-[#a78bfa]/20 shrink-0">
                            <FileTextIcon className="size-4 text-[#a78bfa]" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-[13px] font-medium text-white truncate">{skill.name}</p>
                            <p className="text-xs truncate" style={{ color: "rgba(255,255,255,0.4)" }}>
                              {skill.description || skill.id + ".SKILL.md"}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 shrink-0 ml-4">
                          <span className="text-xs whitespace-nowrap" style={{ color: "rgba(255,255,255,0.25)" }}>
                            {skill.updatedAt ? skill.updatedAt.split("T")[0] : ""}
                          </span>
                          <button
                            className="text-white/25 hover:text-red-400 transition-colors"
                            title="Delete"
                            onClick={() => handleDeleteSkill(skill.id)}
                          >
                            <XIcon className="size-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Divider: or manual input */}
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.08)" }} />
                  <span className="text-xs shrink-0" style={{ color: "rgba(255,255,255,0.25)" }}>
                    or manual input
                  </span>
                  <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.08)" }} />
                </div>

                {/* Manual input */}
                <div className="space-y-3">
                  <Input
                    placeholder="Skill name, e.g. Holiday Campaign SOP"
                    value={skillName}
                    onChange={(e) => setSkillName(e.target.value)}
                  />
                  <Textarea
                    placeholder="Paste your marketing SOP / skill content here (Markdown supported)..."
                    className="min-h-[120px] resize-y"
                    value={skillContent}
                    onChange={(e) => setSkillContent(e.target.value)}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-white/[0.08] bg-transparent hover:bg-white/5"
                    style={{ color: "rgba(255,255,255,0.6)" }}
                    onClick={handleAddSkill}
                    disabled={skillSaving || !skillName.trim() || !skillContent.trim()}
                  >
                    {skillSaving ? (
                      <Loader2Icon className="size-4 mr-1.5 animate-spin" />
                    ) : (
                      <PlusIcon className="size-4 mr-1.5" />
                    )}
                    {skillSaving ? "Saving..." : "Add Skill"}
                  </Button>
                </div>

                {/* Empty state (only when no skills and no upload) */}
                {customSkills.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-6 text-center">
                    <p className="text-xs" style={{ color: "rgba(255,255,255,0.25)" }}>
                      No custom skills yet
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* ===== Email Config Tab ===== */}
            {brandTab === "email" && (
              <div className="space-y-5">
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium" style={{ color: "rgba(255,255,255,0.6)" }}>
                      Email Address
                    </label>
                    <Input
                      type="email"
                      placeholder="marketing@yourbrand.com"
                      value={emailAddress}
                      onChange={(e) => setEmailAddress(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium" style={{ color: "rgba(255,255,255,0.6)" }}>
                      Sender Name
                    </label>
                    <Input
                      placeholder="Your Brand Name"
                      value={senderName}
                      onChange={(e) => setSenderName(e.target.value)}
                    />
                  </div>

                  {/* Verification status */}
                  <div className="flex items-center gap-2">
                    {emailVerified ? (
                      <Badge className="bg-emerald-500/20 text-emerald-400 border-transparent">
                        <CheckCircleIcon className="size-3 mr-1" />
                        Verified
                      </Badge>
                    ) : emailAddress ? (
                      <Badge className="bg-amber-500/20 text-amber-400 border-transparent">
                        <AlertCircleIcon className="size-3 mr-1" />
                        Not Verified
                      </Badge>
                    ) : null}
                  </div>

                  {/* Info note */}
                  <div
                    className="flex items-start gap-2 rounded-lg px-3 py-2.5"
                    style={{ background: "rgba(167,139,250,0.08)", border: "1px solid rgba(167,139,250,0.15)" }}
                  >
                    <InfoIcon className="size-4 shrink-0 mt-0.5 text-[#a78bfa]" />
                    <p className="text-xs" style={{ color: "rgba(255,255,255,0.5)" }}>
                      Email sending will be available in Phase 2. Configure your address now so the Email Marketing Agent knows your sender identity.
                    </p>
                  </div>

                  <div className="flex justify-end">
                    <Button
                      className="bg-gradient-to-r from-[#a78bfa] to-[#7c3aed] text-white hover:opacity-90 border-0"
                      onClick={handleSaveEmail}
                      disabled={savingEmail || !emailAddress.trim()}
                    >
                      {savingEmail ? (
                        <Loader2Icon className="size-4 mr-1.5 animate-spin" />
                      ) : (
                        <MailIcon className="size-4 mr-1.5" />
                      )}
                      {savingEmail ? "Saving..." : "Save Email Config"}
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
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
