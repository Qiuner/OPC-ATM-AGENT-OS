import type { ApprovalRecord } from '@/types';
import { readCollection, writeCollection, generateId, nowISO } from './index';

const COLLECTION = 'approvals';

export async function listApprovals(filter?: {
  content_id?: string;
}): Promise<ApprovalRecord[]> {
  let items = readCollection<ApprovalRecord>(COLLECTION);
  if (filter?.content_id) {
    items = items.filter((item) => item.content_id === filter.content_id);
  }
  // Sort by newest first
  items.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  return items;
}

export async function createApproval(
  data: Omit<ApprovalRecord, 'id' | 'created_at'>
): Promise<ApprovalRecord> {
  const items = readCollection<ApprovalRecord>(COLLECTION);
  const newItem: ApprovalRecord = {
    ...data,
    id: generateId('apr'),
    created_at: nowISO(),
  };
  items.push(newItem);
  writeCollection(COLLECTION, items);
  return newItem;
}
