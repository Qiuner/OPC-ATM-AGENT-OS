import { useState, useRef, useEffect } from 'react';
import { XPreview } from './x-preview';
import { LinkedInPreview } from './linkedin-preview';
import { TikTokPreview } from './tiktok-preview';
import { MetaPreview } from './meta-preview';
import { EmailPreview } from './email-preview';
import { BlogPreview } from './blog-preview';
import { XhsPreview } from './xhs-preview';
import type { PlatformPreviewProps, PublishItem } from './types';
import {
  ALL_PLATFORMS,
  PLATFORM_LABELS,
  PLATFORM_BRAND_COLORS,
  PLATFORM_FORMATTERS,
} from './types';
import type { PlatformKey } from './types';

const PREVIEW_COMPONENTS: Record<PlatformKey, React.ComponentType<PlatformPreviewProps>> = {
  X: XPreview,
  LinkedIn: LinkedInPreview,
  TikTok: TikTokPreview,
  Meta: MetaPreview,
  Email: EmailPreview,
  Blog: BlogPreview,
  小红书: XhsPreview,
};

function Toast({ message, onClose }: { message: string; onClose: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 2500);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className="fixed bottom-6 right-6 z-50 animate-in fade-in slide-in-from-bottom-4 duration-200">
      <div
        className="rounded-lg px-4 py-2.5 text-sm text-white shadow-lg"
        style={{ background: 'rgba(167,139,250,0.9)' }}
      >
        {message}
      </div>
    </div>
  );
}

export function PlatformPreviewModal({
  item,
  onClose,
}: {
  item: PublishItem;
  onClose: () => void;
}) {
  const [activePlatform, setActivePlatform] = useState<PlatformKey>('X');
  const [toast, setToast] = useState('');
  const backdropRef = useRef<HTMLDivElement>(null);

  const ActiveComponent = PREVIEW_COMPONENTS[activePlatform];

  const handleCopy = async () => {
    const formatted = PLATFORM_FORMATTERS[activePlatform](item);
    try {
      await navigator.clipboard.writeText(formatted);
      setToast('已复制到剪贴板');
    } catch {
      setToast('复制失败');
    }
  };

  return (
    <div
      ref={backdropRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={(e) => { if (e.target === backdropRef.current) onClose(); }}
    >
      <div
        className="w-full max-w-2xl rounded-xl p-6 shadow-xl mx-4 max-h-[90vh] flex flex-col"
        style={{ background: 'var(--card)', border: '1px solid var(--border)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4 shrink-0">
          <h3 className="text-base font-semibold text-foreground truncate pr-4">
            平台预览 — {item.title}
          </h3>
          <button
            onClick={onClose}
            className="rounded-md p-1 transition-colors hover:bg-white/10"
            style={{ color: 'var(--muted-foreground)' }}
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Platform tabs */}
        <div className="flex flex-wrap gap-1 mb-4 pb-3 shrink-0" style={{ borderBottom: '1px solid var(--border)' }}>
          {ALL_PLATFORMS.map((p) => {
            const isActive = activePlatform === p;
            const brandColor = PLATFORM_BRAND_COLORS[p];
            return (
              <button
                key={p}
                onClick={() => setActivePlatform(p)}
                className="rounded-md px-3 py-1.5 text-xs font-medium transition-all"
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

        {/* Platform label */}
        <p className="text-xs mb-3 shrink-0" style={{ color: 'var(--muted-foreground)' }}>
          {PLATFORM_LABELS[activePlatform]}
        </p>

        {/* Preview content */}
        <div className="overflow-y-auto flex-1 min-h-0">
          <div key={activePlatform} className="animate-in fade-in slide-in-from-bottom-2 duration-200">
            <ActiveComponent item={item} />
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 mt-4 pt-3 shrink-0" style={{ borderTop: '1px solid var(--border)' }}>
          <button
            onClick={handleCopy}
            className="h-8 rounded-lg px-3 text-sm font-medium transition-colors hover:bg-white/5"
            style={{ border: '1px solid var(--border)', color: 'var(--muted-foreground)', background: 'transparent' }}
          >
            复制文案
          </button>
          <button
            onClick={onClose}
            className="h-8 rounded-lg px-3 text-sm font-medium text-white transition-colors"
            style={{ background: 'linear-gradient(135deg, #a78bfa, #7c3aed)' }}
          >
            关闭
          </button>
        </div>
      </div>

      {toast && <Toast message={toast} onClose={() => setToast('')} />}
    </div>
  );
}
