import type { Campaign } from '@/types';
import { readCollection, writeCollection, generateId, nowISO } from './index';

const COLLECTION = 'campaigns';

export async function listCampaigns(filter?: {
  status?: string;
}): Promise<Campaign[]> {
  const items = readCollection<Campaign>(COLLECTION);
  if (filter?.status) {
    return items.filter((item) => item.status === filter.status);
  }
  return items;
}

export async function getCampaign(id: string): Promise<Campaign | null> {
  const items = readCollection<Campaign>(COLLECTION);
  return items.find((item) => item.id === id) ?? null;
}

export async function createCampaign(
  data: Omit<Campaign, 'id' | 'created_at' | 'updated_at'>
): Promise<Campaign> {
  const items = readCollection<Campaign>(COLLECTION);
  const now = nowISO();
  const newItem: Campaign = {
    ...data,
    id: generateId('camp'),
    created_at: now,
    updated_at: now,
  };
  items.push(newItem);
  writeCollection(COLLECTION, items);
  return newItem;
}

export async function updateCampaign(
  id: string,
  data: Partial<Campaign>
): Promise<Campaign> {
  const items = readCollection<Campaign>(COLLECTION);
  const index = items.findIndex((item) => item.id === id);
  if (index === -1) {
    throw new Error(`Campaign not found: ${id}`);
  }
  const updated: Campaign = {
    ...items[index],
    ...data,
    id: items[index].id,
    updated_at: nowISO(),
  };
  items[index] = updated;
  writeCollection(COLLECTION, items);
  return updated;
}

export async function deleteCampaign(id: string): Promise<void> {
  const items = readCollection<Campaign>(COLLECTION);
  const filtered = items.filter((item) => item.id !== id);
  if (filtered.length === items.length) {
    throw new Error(`Campaign not found: ${id}`);
  }
  writeCollection(COLLECTION, filtered);
}
