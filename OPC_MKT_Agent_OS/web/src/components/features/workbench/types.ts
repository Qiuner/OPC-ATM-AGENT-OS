/** Workbench shared types */

export type TaskStatus = 'waiting' | 'running' | 'done' | 'error' | 'intervention';
export type WorkbenchMode = 'execute' | 'cocreate';

export interface AgentInfo {
  id: string;
  name: string;
  nameEn: string;
  color: string;
  avatar: string;
  level: string;
  description: string;
}

export interface AgentTask {
  id: string;
  agentId: string;
  agent: AgentInfo;
  description: string;
  status: TaskStatus;
  progress: number;
  currentTool?: string;
  toolCallCount: number;
  dependencies: string[];
  result?: string;
  error?: string;
  startedAt?: number;
  finishedAt?: number;
}

export interface LogEntry {
  id: string;
  timestamp: number;
  agentId: string;
  type: 'info' | 'tool' | 'result' | 'error' | 'communication';
  message: string;
}

export interface ExecutionState {
  isRunning: boolean;
  startedAt?: number;
  prompt: string;
  tasks: AgentTask[];
  logs: LogEntry[];
  result?: string;
  totalTokens: number;
}

/** Agent brand colors map */
export const AGENT_COLORS: Record<string, { color: string; avatar: string; name: string }> = {
  ceo: { color: '#e74c3c', avatar: 'CEO', name: 'CEO' },
  'xhs-agent': { color: '#ff2442', avatar: 'XHS', name: 'XHS Agent' },
  'analyst-agent': { color: '#22d3ee', avatar: 'AN', name: 'Analyst' },
  'growth-agent': { color: '#00cec9', avatar: 'G', name: 'Growth' },
  'brand-reviewer': { color: '#a855f7', avatar: 'BR', name: 'Reviewer' },
  'podcast-agent': { color: '#f59e0b', avatar: 'POD', name: 'Podcast' },
  'x-twitter-agent': { color: '#1da1f2', avatar: 'X', name: 'X/Twitter' },
  'visual-gen-agent': { color: '#ec4899', avatar: 'VIS', name: 'Visual' },
  'strategist-agent': { color: '#8b5cf6', avatar: 'STR', name: 'Strategist' },
};
