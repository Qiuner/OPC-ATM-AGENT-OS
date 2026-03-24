import type { MetricRecord } from '@/types';
import { readCollection, writeCollection, generateId, nowISO } from './index';

const COLLECTION = 'metrics';

export async function listMetrics(filter?: {
  content_id?: string;
}): Promise<MetricRecord[]> {
  let items = readCollection<MetricRecord>(COLLECTION);
  if (filter?.content_id) {
    items = items.filter((item) => item.content_id === filter.content_id);
  }
  // Sort by recorded_at descending
  items.sort((a, b) => new Date(b.recorded_at).getTime() - new Date(a.recorded_at).getTime());
  return items;
}

export async function getMetricRecord(id: string): Promise<MetricRecord | null> {
  const items = readCollection<MetricRecord>(COLLECTION);
  return items.find((item) => item.id === id) ?? null;
}

export async function createMetricRecord(
  data: Omit<MetricRecord, 'id' | 'created_at'>
): Promise<MetricRecord> {
  const items = readCollection<MetricRecord>(COLLECTION);
  const newItem: MetricRecord = {
    ...data,
    id: generateId('met'),
    created_at: nowISO(),
  };
  items.push(newItem);
  writeCollection(COLLECTION, items);
  return newItem;
}
