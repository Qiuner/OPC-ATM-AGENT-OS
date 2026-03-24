// ==============================
// Types for real agent-chat monitor
// ==============================

export type AgentStatus = 'online' | 'offline' | 'busy';

export interface MonitorAgent {
  id: string;
  name: string;
  nameEn: string;
  role: string;
  color: string;
  avatar: string; // emoji
  status: AgentStatus;
  currentTool?: string;
  currentToolInput?: string;
  toolCallCount?: number;
}

export interface LogEntry {
  id: number;
  timestamp: number;
  level: 'info' | 'success' | 'warn' | 'error';
  source: string;
  message: string;
}

export interface MonitorData {
  ts: number;
  launched: boolean;
  agents: MonitorAgent[];
  agentLogs: Record<string, LogEntry[]>;
  globalLogs: LogEntry[];
}

// Status display config
export const STATUS_CONFIG: Record<AgentStatus, { label: string; color: string; dotClass: string }> = {
  busy:    { label: 'BUSY',    color: '#f59e0b', dotClass: 'animate-pulse' },
  online:  { label: 'ONLINE',  color: '#22c55e', dotClass: '' },
  offline: { label: 'OFFLINE', color: '#4a5568', dotClass: '' },
};

export const LOG_LEVEL_COLORS: Record<string, string> = {
  info:    '#60a5fa',
  success: '#4ade80',
  warn:    '#fbbf24',
  error:   '#f87171',
};

// EventBus event types for SSE
export type AgentEventType =
  | 'agent:start'
  | 'agent:stop'
  | 'agent:text'
  | 'agent:done'
  | 'agent:tool_call'
  | 'agent:tool_result'
  | 'agent:sub_agent_start'
  | 'agent:sub_agent_stop'
  | 'agent:approval_needed'
  | 'system:log'
  | 'system:heartbeat';

export interface AgentEvent {
  id: number;
  type: AgentEventType;
  timestamp: number;
  agentId?: string;
  data: Record<string, unknown>;
}
