import type { Content, ContentStatus } from '@/types';
import { readCollection, writeCollection, generateId, nowISO } from './index';

const COLLECTION = 'contents';

export async function listContents(filter?: {
  status?: ContentStatus;
  campaign_id?: string;
}): Promise<Content[]> {
  let items = readCollection<Content>(COLLECTION);
  if (filter?.status) {
    items = items.filter((item) => item.status === filter.status);
  }
  if (filter?.campaign_id) {
    items = items.filter((item) => item.campaign_id === filter.campaign_id);
  }
  return items;
}

export async function getContent(id: string): Promise<Content | null> {
  const items = readCollection<Content>(COLLECTION);
  return items.find((item) => item.id === id) ?? null;
}

export async function createContent(
  data: Omit<Content, 'id' | 'created_at' | 'updated_at'>
): Promise<Content> {
  const items = readCollection<Content>(COLLECTION);
  const now = nowISO();
  const newItem: Content = {
    ...data,
    id: generateId('cnt'),
    created_at: now,
    updated_at: now,
  };
  items.push(newItem);
  writeCollection(COLLECTION, items);
  return newItem;
}

export async function updateContent(
  id: string,
  data: Partial<Content>
): Promise<Content> {
  const items = readCollection<Content>(COLLECTION);
  const index = items.findIndex((item) => item.id === id);
  if (index === -1) {
    throw new Error(`Content not found: ${id}`);
  }
  const updated: Content = {
    ...items[index],
    ...data,
    id: items[index].id,
    updated_at: nowISO(),
  };
  items[index] = updated;
  writeCollection(COLLECTION, items);
  return updated;
}

export async function deleteContent(id: string): Promise<void> {
  const items = readCollection<Content>(COLLECTION);
  const filtered = items.filter((item) => item.id !== id);
  if (filtered.length === items.length) {
    throw new Error(`Content not found: ${id}`);
  }
  writeCollection(COLLECTION, filtered);
}
