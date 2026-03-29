export type PlatformKey = 'X' | 'LinkedIn' | 'TikTok' | 'Meta' | 'Email' | 'Blog' | '小红书';

export interface PublishItem {
  id: string;
  title: string;
  campaign: string;
  scheduledAt: string;
  tab: 'pending' | 'exported' | 'published';
  platforms: { platform: string; ready: boolean; format: string }[];
  body?: string;
  tags?: string[];
  fromApi: boolean;
  mediaUrls?: string[];
  /** Pass-through Content.metadata for platform adaptations */
  metadata?: Record<string, unknown>;
}

export interface PlatformPreviewProps {
  item: PublishItem;
}

/** Platform adaptation data from Haiku parser */
export interface PlatformAdaptedData {
  title: string;
  body: string;
  tags: string[];
  extra?: Record<string, string>;
}

/** Return type of getAdaptedContent */
export interface AdaptedContent {
  title: string;
  body: string;
  tags: string[];
  extra?: Record<string, string>;
  isAdapted: boolean;
}

/** Map PlatformKey to metadata.platforms key */
const PLATFORM_KEY_MAP: Record<PlatformKey, string> = {
  '小红书': 'xiaohongshu',
  'X': 'x',
  'LinkedIn': 'linkedin',
  'TikTok': 'tiktok',
  'Meta': 'meta',
  'Email': 'email',
  'Blog': 'blog',
};

/**
 * Get platform-adapted content from PublishItem.
 * Reads AI-adapted data from metadata.platforms if available.
 * Falls back to generic item.body/item.tags if no adaptation exists.
 */
export function getAdaptedContent(item: PublishItem, platform: PlatformKey): AdaptedContent {
  const metadataKey = PLATFORM_KEY_MAP[platform];
  const platforms = item.metadata?.platforms as Record<string, PlatformAdaptedData> | undefined;
  const adapted = platforms?.[metadataKey];

  if (adapted && adapted.body) {
    return {
      title: adapted.title || item.title,
      body: adapted.body,
      tags: adapted.tags?.length > 0 ? adapted.tags : (item.tags ?? []),
      extra: adapted.extra,
      isAdapted: true,
    };
  }

  return {
    title: item.title,
    body: item.body ?? '',
    tags: item.tags ?? [],
    isAdapted: false,
  };
}

export const DEFAULT_AUTHOR = {
  name: 'Brand Name',
  handle: '@brand',
  title: 'Marketing Lead',
  company: 'Company',
} as const;

export const ALL_PLATFORMS: PlatformKey[] = ['X', 'LinkedIn', 'TikTok', 'Meta', 'Email', 'Blog', '小红书'];

export const PLATFORM_LABELS: Record<PlatformKey, string> = {
  X: 'X (Twitter)',
  LinkedIn: 'LinkedIn',
  TikTok: 'TikTok',
  Meta: 'Meta (Facebook)',
  Email: 'Email',
  Blog: 'Blog',
  小红书: '小红书 (RedNote)',
};

export const PLATFORM_BRAND_COLORS: Record<PlatformKey, string> = {
  X: '#1d9bf0',
  LinkedIn: '#0a66c2',
  TikTok: '#00f2ea',
  Meta: '#1877f2',
  Email: '#a78bfa',
  Blog: '#22c55e',
  小红书: '#ff2a54',
};

/** Helper to derive an author name from PublishItem */
export function getAuthorName(item: PublishItem): string {
  return item.campaign || DEFAULT_AUTHOR.name;
}

/** Helper to derive a handle from campaign name */
export function getHandle(item: PublishItem): string {
  const name = item.campaign || DEFAULT_AUTHOR.name;
  return '@' + name.toLowerCase().replace(/[^a-z0-9]/g, '');
}

/** Text formatter functions — use adapted content when available */
export function formatX(item: PublishItem): string {
  const { body, tags, isAdapted } = getAdaptedContent(item, 'X');
  if (isAdapted) {
    const tagsStr = tags.map((t) => `#${t}`).join(' ');
    return `${body}${tagsStr ? '\n\n' + tagsStr : ''}`.slice(0, 280);
  }
  const full = `${item.title}\n\n${item.body ?? ''}`;
  const fallbackTags = (item.tags ?? []).map((t) => `#${t}`).join(' ');
  const tweet = full.slice(0, 260) + (fallbackTags ? `\n\n${fallbackTags}` : '');
  return tweet.slice(0, 280);
}

export function formatLinkedIn(item: PublishItem): string {
  const { body, tags, extra, isAdapted } = getAdaptedContent(item, 'LinkedIn');
  if (isAdapted) {
    const tagsStr = tags.map((t) => `#${t}`).join(' ');
    const cta = extra?.cta || 'What are your thoughts? Drop a comment below.';
    return `${body}\n\n${tagsStr}\n\n---\n${cta}`;
  }
  return `${item.title}\n\n${item.body ?? ''}\n\n${(item.tags ?? []).map((t) => `#${t}`).join(' ')}\n\n---\nWhat are your thoughts? Drop a comment below.`;
}

export function formatTikTok(item: PublishItem): string {
  const { body, isAdapted } = getAdaptedContent(item, 'TikTok');
  if (isAdapted) return body;
  const fallbackBody = item.body ?? '';
  const hook = fallbackBody.slice(0, 50) + (fallbackBody.length > 50 ? '...' : '');
  return `[Hook - 3s] ${hook}\n\n[Main Content - 15-45s]\n${fallbackBody}\n\n[CTA - 3s] Follow for more! Like & Share!`;
}

export function formatMeta(item: PublishItem): string {
  const { body, tags, isAdapted } = getAdaptedContent(item, 'Meta');
  if (isAdapted) {
    const tagsStr = tags.map((t) => `#${t}`).join(' ');
    return `${body}${tagsStr ? '\n\n' + tagsStr : ''}`;
  }
  return `${item.title}\n\n${item.body ?? ''}\n\n${(item.tags ?? []).map((t) => `#${t}`).join(' ')}`;
}

export function formatEmail(item: PublishItem): string {
  const { title, body, extra, isAdapted } = getAdaptedContent(item, 'Email');
  if (isAdapted) {
    const preheader = extra?.preheader || body.slice(0, 80);
    return `Subject: ${title}\nPreheader: ${preheader}\n\n---\n\n${body}`;
  }
  const fallbackBody = item.body ?? '';
  return `Subject: ${item.title}\nPreheader: ${fallbackBody.slice(0, 80)}\n\n---\n\nHi [First Name],\n\n${fallbackBody}\n\nBest regards,\n[Brand Name]\n\n---\nUnsubscribe | View in browser`;
}

export function formatBlog(item: PublishItem): string {
  const { title, body, tags, extra, isAdapted } = getAdaptedContent(item, 'Blog');
  if (isAdapted) {
    const meta = extra?.metaDescription || body.slice(0, 155);
    const keywords = tags.join(', ');
    return `# ${title}\n\nMeta Description: ${meta}\nKeywords: ${keywords}\n\n---\n\n${body}`;
  }
  const fallbackBody = item.body ?? '';
  const fallbackTags = (item.tags ?? []).map((t) => t).join(', ');
  return `# ${item.title}\n\nMeta Description: ${fallbackBody.slice(0, 155)}\nKeywords: ${fallbackTags}\n\n---\n\n${fallbackBody}\n\n---\n\n## Key Takeaways\n\n- [Takeaway 1]\n- [Takeaway 2]\n- [Takeaway 3]`;
}

export function formatXhs(item: PublishItem): string {
  const { title, body, tags, isAdapted } = getAdaptedContent(item, '小红书');
  if (isAdapted) {
    const tagsStr = tags.map((t) => `#${t}`).join(' ');
    return `${title}\n\n${body}\n\n${tagsStr}`;
  }
  const fallbackBody = item.body ?? '';
  const fallbackTags = (item.tags ?? []).map((t) => `#${t}`).join(' ');
  return `${item.title}\n\n${fallbackBody}\n\n${fallbackTags}`;
}

export const PLATFORM_FORMATTERS: Record<PlatformKey, (item: PublishItem) => string> = {
  X: formatX,
  LinkedIn: formatLinkedIn,
  TikTok: formatTikTok,
  Meta: formatMeta,
  Email: formatEmail,
  Blog: formatBlog,
  小红书: formatXhs,
};
