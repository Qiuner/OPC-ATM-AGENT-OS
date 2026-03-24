import type { AgentRun } from '@/types';
import { readCollection, writeCollection, generateId, nowISO } from './index';

const COLLECTION = 'agent-runs';

export async function listAgentRuns(filter?: {
  task_id?: string;
  status?: string;
}): Promise<AgentRun[]> {
  let items = readCollection<AgentRun>(COLLECTION);
  if (filter?.task_id) {
    items = items.filter((item) => item.task_id === filter.task_id);
  }
  if (filter?.status) {
    items = items.filter((item) => item.status === filter.status);
  }
  return items;
}

export async function createAgentRun(
  data: Omit<AgentRun, 'id'>
): Promise<AgentRun> {
  const items = readCollection<AgentRun>(COLLECTION);
  const newItem: AgentRun = {
    ...data,
    id: generateId('run'),
  };
  items.push(newItem);
  writeCollection(COLLECTION, items);
  return newItem;
}
