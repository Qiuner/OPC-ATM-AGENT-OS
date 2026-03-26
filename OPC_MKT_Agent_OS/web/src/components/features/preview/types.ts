// ==========================================
// 多平台预览系统 — 统一数据接口
// ==========================================

export type PlatformType =
  | 'xiaohongshu'
  | 'x'
  | 'instagram'
  | 'meta'
  | 'tiktok'
  | 'linkedin'
  | 'email'
  | 'poster';

export interface PreviewData {
  /** 内容标题 */
  title: string;
  /** 正文内容 */
  body: string;
  /** 标签列表 */
  tags: string[];
  /** 媒体 URL 列表 (图片/视频封面) */
  mediaUrls: string[];
  /** 作者/品牌信息 */
  author: {
    name: string;
    handle: string;
    avatarUrl?: string;
    title?: string;
    company?: string;
  };
  /** CTA 按钮文案 (用于 Email/Poster) */
  ctaText?: string;
  /** CTA 链接 */
  ctaUrl?: string;
  /** 品牌名 (用于 Email From / Poster Logo) */
  brandName?: string;
}

export type ViewMode = 'split' | 'grid';

export type PosterAspectRatio = '1:1' | '16:9' | '9:16' | '4:5';

export interface PlatformConfig {
  type: PlatformType;
  label: string;
  icon: string;
  brandColor: string;
  selectedStyle: {
    background: string;
    color: string;
    border: string;
  };
}

export const PLATFORM_CONFIGS: PlatformConfig[] = [
  {
    type: 'xiaohongshu',
    label: '小红书',
    icon: 'XHS',
    brandColor: '#ff2a54',
    selectedStyle: {
      background: 'rgba(255,42,84,0.15)',
      color: '#ff2a54',
      border: '1px solid rgba(255,42,84,0.25)',
    },
  },
  {
    type: 'x',
    label: 'X',
    icon: 'X',
    brandColor: '#ffffff',
    selectedStyle: {
      background: 'rgba(255,255,255,0.10)',
      color: '#ffffff',
      border: '1px solid rgba(255,255,255,0.20)',
    },
  },
  {
    type: 'instagram',
    label: 'Instagram',
    icon: 'IG',
    brandColor: '#e1306c',
    selectedStyle: {
      background: 'rgba(225,48,108,0.15)',
      color: '#e1306c',
      border: '1px solid rgba(225,48,108,0.25)',
    },
  },
  {
    type: 'meta',
    label: 'Meta',
    icon: 'FB',
    brandColor: '#1877f2',
    selectedStyle: {
      background: 'rgba(24,119,242,0.15)',
      color: '#1877f2',
      border: '1px solid rgba(24,119,242,0.25)',
    },
  },
  {
    type: 'tiktok',
    label: 'TikTok',
    icon: 'TT',
    brandColor: '#00f2ea',
    selectedStyle: {
      background: 'rgba(0,242,234,0.12)',
      color: '#00f2ea',
      border: '1px solid rgba(0,242,234,0.25)',
    },
  },
  {
    type: 'linkedin',
    label: 'LinkedIn',
    icon: 'LI',
    brandColor: '#0a66c2',
    selectedStyle: {
      background: 'rgba(10,102,194,0.15)',
      color: '#0a66c2',
      border: '1px solid rgba(10,102,194,0.25)',
    },
  },
  {
    type: 'email',
    label: 'Email',
    icon: 'EM',
    brandColor: '#a78bfa',
    selectedStyle: {
      background: 'rgba(167,139,250,0.15)',
      color: '#a78bfa',
      border: '1px solid rgba(167,139,250,0.25)',
    },
  },
  {
    type: 'poster',
    label: '海报',
    icon: 'PS',
    brandColor: '#fbbf24',
    selectedStyle: {
      background: 'rgba(251,191,36,0.15)',
      color: '#fbbf24',
      border: '1px solid rgba(251,191,36,0.25)',
    },
  },
];

/** 默认预览数据 (用于空状态展示) */
export const DEFAULT_PREVIEW_DATA: PreviewData = {
  title: 'Your Content Title',
  body: 'Your content body text will appear here. Write something amazing to preview across all platforms.',
  tags: ['marketing', 'ai', 'automation'],
  mediaUrls: [],
  author: {
    name: 'Brand Name',
    handle: '@brandhandle',
    avatarUrl: undefined,
    title: 'Marketing Lead',
    company: 'Company Inc.',
  },
  ctaText: 'Learn More',
  ctaUrl: 'https://example.com',
  brandName: 'Brand Name',
};
