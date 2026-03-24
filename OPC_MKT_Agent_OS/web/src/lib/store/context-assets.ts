import type { ContextAsset, ContextAssetType } from '@/types';
import { readCollection, writeCollection, generateId, nowISO } from './index';

const COLLECTION = 'context-assets';

export async function listContextAssets(filter?: {
  type?: ContextAssetType;
}): Promise<ContextAsset[]> {
  const items = readCollection<ContextAsset>(COLLECTION);
  if (filter?.type) {
    return items.filter((item) => item.type === filter.type);
  }
  return items;
}

export async function getContextAsset(
  id: string
): Promise<ContextAsset | null> {
  const items = readCollection<ContextAsset>(COLLECTION);
  return items.find((item) => item.id === id) ?? null;
}

export async function createContextAsset(
  data: Omit<ContextAsset, 'id' | 'created_at' | 'updated_at'>
): Promise<ContextAsset> {
  const items = readCollection<ContextAsset>(COLLECTION);
  const now = nowISO();
  const newItem: ContextAsset = {
    ...data,
    id: generateId('ca'),
    created_at: now,
    updated_at: now,
  };
  items.push(newItem);
  writeCollection(COLLECTION, items);
  return newItem;
}

export async function updateContextAsset(
  id: string,
  data: Partial<ContextAsset>
): Promise<ContextAsset> {
  const items = readCollection<ContextAsset>(COLLECTION);
  const index = items.findIndex((item) => item.id === id);
  if (index === -1) {
    throw new Error(`Context asset not found: ${id}`);
  }
  const updated: ContextAsset = {
    ...items[index],
    ...data,
    id: items[index].id,
    updated_at: nowISO(),
  };
  items[index] = updated;
  writeCollection(COLLECTION, items);
  return updated;
}

export async function deleteContextAsset(id: string): Promise<void> {
  const items = readCollection<ContextAsset>(COLLECTION);
  const filtered = items.filter((item) => item.id !== id);
  if (filtered.length === items.length) {
    throw new Error(`Context asset not found: ${id}`);
  }
  writeCollection(COLLECTION, filtered);
}
