import type { Task, TaskStatus } from '@/types';
import { readCollection, writeCollection, generateId, nowISO } from './index';

const COLLECTION = 'tasks';

export async function listTasks(filter?: {
  status?: TaskStatus;
  campaign_id?: string;
}): Promise<Task[]> {
  let items = readCollection<Task>(COLLECTION);
  if (filter?.status) {
    items = items.filter((item) => item.status === filter.status);
  }
  if (filter?.campaign_id) {
    items = items.filter((item) => item.campaign_id === filter.campaign_id);
  }
  return items;
}

export async function getTask(id: string): Promise<Task | null> {
  const items = readCollection<Task>(COLLECTION);
  return items.find((item) => item.id === id) ?? null;
}

export async function createTask(
  data: Omit<Task, 'id' | 'created_at' | 'updated_at'>
): Promise<Task> {
  const items = readCollection<Task>(COLLECTION);
  const now = nowISO();
  const newItem: Task = {
    ...data,
    id: generateId('task'),
    created_at: now,
    updated_at: now,
  };
  items.push(newItem);
  writeCollection(COLLECTION, items);
  return newItem;
}

export async function updateTask(
  id: string,
  data: Partial<Task>
): Promise<Task> {
  const items = readCollection<Task>(COLLECTION);
  const index = items.findIndex((item) => item.id === id);
  if (index === -1) {
    throw new Error(`Task not found: ${id}`);
  }
  const updated: Task = {
    ...items[index],
    ...data,
    id: items[index].id,
    updated_at: nowISO(),
  };
  items[index] = updated;
  writeCollection(COLLECTION, items);
  return updated;
}

export async function deleteTask(id: string): Promise<void> {
  const items = readCollection<Task>(COLLECTION);
  const filtered = items.filter((item) => item.id !== id);
  if (filtered.length === items.length) {
    throw new Error(`Task not found: ${id}`);
  }
  writeCollection(COLLECTION, filtered);
}
