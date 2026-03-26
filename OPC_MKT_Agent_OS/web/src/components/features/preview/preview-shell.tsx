'use client';

import { useState, useMemo } from 'react';
import type { PlatformType, PreviewData, ViewMode } from './types';
import { PLATFORM_CONFIGS, DEFAULT_PREVIEW_DATA } from './types';
import { XhsPreview } from './xhs-preview';
import { XPreview } from './x-preview';
import { InstagramPreview } from './instagram-preview';
import { MetaPreview } from './meta-preview';
import { TikTokPreview } from './tiktok-preview';
import { LinkedInPreview } from './linkedin-preview';
import { EmailPreview } from './email-preview';
import { PosterPreview } from './poster-preview';

interface PreviewShellProps {
  /** 预览数据，未传则使用默认数据 */
  data?: PreviewData;
  /** 初始选中平台 */
  defaultPlatform?: PlatformType;
}

const PREVIEW_COMPONENTS: Record<PlatformType, React.ComponentType<{ data: PreviewData }>> = {
  xiaohongshu: XhsPreview,
  x: XPreview,
  instagram: InstagramPreview,
  meta: MetaPreview,
  tiktok: TikTokPreview,
  linkedin: LinkedInPreview,
  email: EmailPreview,
  poster: PosterPreview,
};

export function PreviewShell({ data, defaultPlatform = 'x' }: PreviewShellProps) {
  const [activePlatform, setActivePlatform] = useState<PlatformType>(defaultPlatform);
  const [viewMode, setViewMode] = useState<ViewMode>('split');

  const previewData = useMemo(() => data ?? DEFAULT_PREVIEW_DATA, [data]);

  const ActiveComponent = PREVIEW_COMPONENTS[activePlatform];

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div
        className="flex items-center justify-between px-4 py-2 rounded-xl"
        style={{
          background: 'rgba(255,255,255,0.02)',
          border: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        {/* Platform tabs */}
        <div className="flex flex-wrap gap-1">
          {PLATFORM_CONFIGS.map((platform) => {
            const isActive = activePlatform === platform.type;
            return (
              <button
                key={platform.type}
                onClick={() => setActivePlatform(platform.type)}
                className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px] font-medium transition-all duration-200 ease-out"
                style={
                  isActive
                    ? {
                        background: platform.selectedStyle.background,
                        color: platform.selectedStyle.color,
                        border: platform.selectedStyle.border,
                      }
                    : {
                        background: 'rgba(255,255,255,0.04)',
                        color: 'rgba(255,255,255,0.4)',
                        border: '1px solid rgba(255,255,255,0.06)',
                      }
                }
              >
                <span className="text-[10px] font-bold opacity-60">{platform.icon}</span>
                {platform.label}
              </button>
            );
          })}
        </div>

        {/* View mode toggle */}
        <div className="flex items-center gap-1 ml-3">
          <button
            onClick={() => setViewMode('split')}
            className="rounded-md px-2 py-1 text-[11px] font-medium transition-all"
            style={
              viewMode === 'split'
                ? { background: 'rgba(167,139,250,0.15)', color: '#a78bfa' }
                : { color: 'rgba(255,255,255,0.3)' }
            }
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <line x1="12" y1="3" x2="12" y2="21" />
            </svg>
          </button>
          <button
            onClick={() => setViewMode('grid')}
            className="rounded-md px-2 py-1 text-[11px] font-medium transition-all"
            style={
              viewMode === 'grid'
                ? { background: 'rgba(167,139,250,0.15)', color: '#a78bfa' }
                : { color: 'rgba(255,255,255,0.3)' }
            }
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
              <rect x="3" y="3" width="7" height="7" rx="1" />
              <rect x="14" y="3" width="7" height="7" rx="1" />
              <rect x="3" y="14" width="7" height="7" rx="1" />
              <rect x="14" y="14" width="7" height="7" rx="1" />
            </svg>
          </button>
        </div>
      </div>

      {/* Preview area */}
      {viewMode === 'split' ? (
        <div
          className="animate-in fade-in slide-in-from-bottom-2 duration-300"
          key={activePlatform}
        >
          <ActiveComponent data={previewData} />
        </div>
      ) : (
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          {PLATFORM_CONFIGS.map((platform) => {
            const Component = PREVIEW_COMPONENTS[platform.type];
            return (
              <div
                key={platform.type}
                className="cursor-pointer transition-all duration-200 rounded-xl overflow-hidden"
                style={{
                  border: activePlatform === platform.type
                    ? `2px solid ${platform.brandColor}`
                    : '2px solid transparent',
                  transform: 'scale(0.9)',
                  transformOrigin: 'top center',
                }}
                onClick={() => {
                  setActivePlatform(platform.type);
                  setViewMode('split');
                }}
              >
                <div className="pointer-events-none" style={{ transform: 'scale(0.5)', transformOrigin: 'top left', width: '200%', height: '200%' }}>
                  <Component data={previewData} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
