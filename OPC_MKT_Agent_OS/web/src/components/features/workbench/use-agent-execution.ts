'use client';

import { useState, useCallback, useRef } from 'react';
import type { ExecutionState, AgentTask, LogEntry, AgentInfo } from './types';
import { AGENT_COLORS } from './types';

let logIdCounter = 0;
let taskIdCounter = 0;

function makeLogId(): string {
  return `log-${Date.now()}-${++logIdCounter}`;
}

function makeTaskId(): string {
  return `task-${Date.now()}-${++taskIdCounter}`;
}

function getAgentInfo(agentId: string): AgentInfo {
  const known = AGENT_COLORS[agentId];
  return {
    id: agentId,
    name: known?.name ?? agentId,
    nameEn: known?.name ?? agentId,
    color: known?.color ?? '#a78bfa',
    avatar: known?.avatar ?? agentId.charAt(0).toUpperCase(),
    level: agentId === 'ceo' ? 'orchestrator' : 'specialist',
    description: '',
  };
}

const INITIAL_STATE: ExecutionState = {
  isRunning: false,
  prompt: '',
  tasks: [],
  logs: [],
  totalTokens: 0,
};

export function useAgentExecution() {
  const [state, setState] = useState<ExecutionState>(INITIAL_STATE);
  const abortRef = useRef<AbortController | null>(null);

  const addLog = useCallback((entry: Omit<LogEntry, 'id'>) => {
    setState(prev => ({
      ...prev,
      logs: [...prev.logs, { ...entry, id: makeLogId() }].slice(-200),
    }));
  }, []);

  const upsertTask = useCallback((agentId: string, update: Partial<AgentTask>) => {
    setState(prev => {
      const existing = prev.tasks.find(t => t.agentId === agentId);
      if (existing) {
        return {
          ...prev,
          tasks: prev.tasks.map(t =>
            t.agentId === agentId ? { ...t, ...update } : t
          ),
        };
      }
      const newTask: AgentTask = {
        id: makeTaskId(),
        agentId,
        agent: getAgentInfo(agentId),
        description: update.description ?? '',
        status: update.status ?? 'waiting',
        progress: update.progress ?? 0,
        toolCallCount: update.toolCallCount ?? 0,
        dependencies: update.dependencies ?? [],
        ...update,
      };
      return { ...prev, tasks: [...prev.tasks, newTask] };
    });
  }, []);

  const execute = useCallback(async (prompt: string, agentId: string = 'ceo') => {
    // Abort any previous execution
    if (abortRef.current) {
      abortRef.current.abort();
    }
    const controller = new AbortController();
    abortRef.current = controller;

    setState({
      isRunning: true,
      startedAt: Date.now(),
      prompt,
      tasks: [],
      logs: [],
      totalTokens: 0,
    });

    // Add CEO as the first task
    if (agentId === 'ceo') {
      upsertTask('ceo', {
        description: '分析需求，拆解任务',
        status: 'running',
        progress: 10,
      });
    }

    addLog({
      timestamp: Date.now(),
      agentId,
      type: 'info',
      message: `开始执行: ${prompt.slice(0, 100)}`,
    });

    try {
      const res = await fetch('/api/agent/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agent: agentId, message: prompt }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Request failed' }));
        throw new Error((err as { error?: string }).error ?? `HTTP ${res.status}`);
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error('No response stream');

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const jsonStr = line.slice(6).trim();
          if (!jsonStr) continue;

          try {
            const event = JSON.parse(jsonStr) as Record<string, unknown>;
            processSSEEvent(event, addLog, upsertTask, setState);
          } catch {
            // skip malformed events
          }
        }
      }
    } catch (err) {
      if ((err as Error).name === 'AbortError') return;
      const msg = err instanceof Error ? err.message : 'Unknown error';
      addLog({
        timestamp: Date.now(),
        agentId,
        type: 'error',
        message: msg,
      });
    } finally {
      setState(prev => ({ ...prev, isRunning: false }));
      abortRef.current = null;
    }
  }, [addLog, upsertTask]);

  const stop = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    setState(prev => ({ ...prev, isRunning: false }));
  }, []);

  const reset = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    setState(INITIAL_STATE);
  }, []);

  return { state, execute, stop, reset };
}

function processSSEEvent(
  event: Record<string, unknown>,
  addLog: (entry: Omit<LogEntry, 'id'>) => void,
  upsertTask: (agentId: string, update: Partial<AgentTask>) => void,
  setState: React.Dispatch<React.SetStateAction<ExecutionState>>,
) {
  const type = event.type as string;
  const agentId = (event.agentId ?? 'ceo') as string;
  const now = Date.now();

  switch (type) {
    case 'text': {
      const content = event.content as string;
      addLog({
        timestamp: now,
        agentId,
        type: 'info',
        message: content.slice(0, 200),
      });
      // Update task progress
      upsertTask(agentId, {
        status: 'running',
        progress: Math.min(90, (AGENT_COLORS[agentId] ? 30 : 10) + Math.random() * 40),
      });
      // Accumulate result text
      setState(prev => ({
        ...prev,
        result: (prev.result ?? '') + content,
      }));
      break;
    }

    case 'tool_call': {
      const tool = event.tool as string;
      upsertTask(agentId, {
        status: 'running',
        currentTool: tool,
        toolCallCount: undefined as unknown as number, // will be incremented below
      });
      // Manually increment tool call count
      setState(prev => ({
        ...prev,
        tasks: prev.tasks.map(t =>
          t.agentId === agentId
            ? { ...t, toolCallCount: t.toolCallCount + 1, currentTool: tool, status: 'running' as const }
            : t
        ),
      }));
      addLog({
        timestamp: now,
        agentId,
        type: 'tool',
        message: `调用工具: ${tool}`,
      });
      break;
    }

    case 'tool_result': {
      const success = event.success as boolean;
      addLog({
        timestamp: now,
        agentId,
        type: success ? 'result' : 'error',
        message: success ? '工具调用完成' : `工具调用失败: ${(event.result as string)?.slice(0, 100)}`,
      });
      break;
    }

    case 'sub_agent_start': {
      const task = (event.task ?? '') as string;
      upsertTask(agentId, {
        description: task.slice(0, 100),
        status: 'running',
        progress: 5,
        startedAt: now,
      });
      addLog({
        timestamp: now,
        agentId,
        type: 'communication',
        message: `CEO 调度 ${getAgentInfo(agentId).name} 开始执行`,
      });
      break;
    }

    case 'sub_agent_done': {
      const success = event.success as boolean;
      upsertTask(agentId, {
        status: success ? 'done' : 'error',
        progress: success ? 100 : 0,
        finishedAt: now,
      });
      addLog({
        timestamp: now,
        agentId,
        type: success ? 'result' : 'error',
        message: `${getAgentInfo(agentId).name} ${success ? '执行完成' : '执行失败'}`,
      });
      break;
    }

    case 'done': {
      upsertTask(agentId, {
        status: 'done',
        progress: 100,
        finishedAt: now,
      });
      addLog({
        timestamp: now,
        agentId,
        type: 'info',
        message: `${getAgentInfo(agentId).name} 全部完成`,
      });
      break;
    }

    case 'error': {
      const message = event.message as string;
      upsertTask(agentId, {
        status: 'error',
        error: message,
      });
      addLog({
        timestamp: now,
        agentId,
        type: 'error',
        message,
      });
      break;
    }

    case 'stream_end':
      // No-op, handled by the fetch loop
      break;
  }
}
