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
}

export interface PlatformPreviewProps {
  item: PublishItem;
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

/** Text formatter functions for clipboard copy */
export function formatX(item: PublishItem): string {
  const full = `${item.title}\n\n${item.body ?? ''}`;
  const tags = (item.tags ?? []).map((t) => `#${t}`).join(' ');
  const tweet = full.slice(0, 260) + (tags ? `\n\n${tags}` : '');
  return tweet.slice(0, 280);
}

export function formatLinkedIn(item: PublishItem): string {
  return `${item.title}\n\n${item.body ?? ''}\n\n${(item.tags ?? []).map((t) => `#${t}`).join(' ')}\n\n---\nWhat are your thoughts? Drop a comment below.`;
}

export function formatTikTok(item: PublishItem): string {
  const body = item.body ?? '';
  const hook = body.slice(0, 50) + (body.length > 50 ? '...' : '');
  return `[Hook - 3s] ${hook}\n\n[Main Content - 15-45s]\n${body}\n\n[CTA - 3s] Follow for more! Like & Share!`;
}

export function formatMeta(item: PublishItem): string {
  return `${item.title}\n\n${item.body ?? ''}\n\n${(item.tags ?? []).map((t) => `#${t}`).join(' ')}`;
}

export function formatEmail(item: PublishItem): string {
  const body = item.body ?? '';
  return `Subject: ${item.title}\nPreheader: ${body.slice(0, 80)}\n\n---\n\nHi [First Name],\n\n${body}\n\nBest regards,\n[Brand Name]\n\n---\nUnsubscribe | View in browser`;
}

export function formatBlog(item: PublishItem): string {
  const body = item.body ?? '';
  const tags = (item.tags ?? []).map((t) => t).join(', ');
  return `# ${item.title}\n\nMeta Description: ${body.slice(0, 155)}\nKeywords: ${tags}\n\n---\n\n${body}\n\n---\n\n## Key Takeaways\n\n- [Takeaway 1]\n- [Takeaway 2]\n- [Takeaway 3]`;
}

export function formatXhs(item: PublishItem): string {
  const body = item.body ?? '';
  const tags = (item.tags ?? []).map((t) => `#${t}`).join(' ');
  return `${item.title}\n\n${body}\n\n${tags}`;
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
