import type { WorkflowRun, WorkflowStatus } from '@/types/workflow';
import { readCollection, writeCollection, generateId, nowISO } from './index';

const COLLECTION = 'workflow-runs';

export async function createWorkflowRun(
  data: Omit<WorkflowRun, 'id' | 'created_at' | 'updated_at'>
): Promise<WorkflowRun> {
  const items = readCollection<WorkflowRun>(COLLECTION);
  const now = nowISO();
  const newItem: WorkflowRun = {
    ...data,
    id: generateId('wfr'),
    created_at: now,
    updated_at: now,
  };
  items.push(newItem);
  writeCollection(COLLECTION, items);
  return newItem;
}

export async function getWorkflowRun(id: string): Promise<WorkflowRun | null> {
  const items = readCollection<WorkflowRun>(COLLECTION);
  return items.find((item) => item.id === id) ?? null;
}

export async function updateWorkflowRun(
  id: string,
  updates: Partial<WorkflowRun>
): Promise<WorkflowRun | null> {
  const items = readCollection<WorkflowRun>(COLLECTION);
  const index = items.findIndex((item) => item.id === id);
  if (index === -1) {
    return null;
  }
  const updated: WorkflowRun = {
    ...items[index],
    ...updates,
    id: items[index].id,
    updated_at: nowISO(),
  };
  items[index] = updated;
  writeCollection(COLLECTION, items);
  return updated;
}

export async function getActiveWorkflowRun(): Promise<WorkflowRun | null> {
  const items = readCollection<WorkflowRun>(COLLECTION);
  const terminalStatuses: WorkflowStatus[] = ['completed', 'failed'];
  const active = items
    .filter((item) => !terminalStatuses.includes(item.status))
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  return active[0] ?? null;
}

export async function listWorkflowRuns(): Promise<WorkflowRun[]> {
  return readCollection<WorkflowRun>(COLLECTION);
}
