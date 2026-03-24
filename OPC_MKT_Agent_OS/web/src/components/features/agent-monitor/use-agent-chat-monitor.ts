'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { MonitorData, LogEntry, AgentEvent, MonitorAgent } from './types';
import { toMonitorAgents, MARKETING_AGENT_IDS } from '@/lib/agents/marketing-team';

const AGENT_CHAT_BASE = 'http://localhost:3001';
const POLL_INTERVAL = 2500;

/**
 * Map backend agents → marketing team agents for display.
 * Backend might have psychologists; we always show marketing team in the UI.
 * If backend agents match marketing IDs, use their live status. Otherwise overlay.
 */
function mapToMarketingAgents(backendAgents: MonitorAgent[]): MonitorAgent[] {
  const marketingAgents = toMonitorAgents('offline');
  const backendMap = new Map(backendAgents.map(a => [a.id, a]));

  // If backend has our marketing agents, use their live status
  const hasMarketingAgents = MARKETING_AGENT_IDS.some(id => backendMap.has(id));
  if (hasMarketingAgents) {
    return marketingAgents.map(ma => {
      const ba = backendMap.get(ma.id);
      if (ba) {
        return { ...ma, status: ba.status, currentTool: ba.currentTool, currentToolInput: ba.currentToolInput, toolCallCount: ba.toolCallCount };
      }
      return ma;
    });
  }

  // Backend has different agents (e.g. psychologists) — map by index for status mirroring
  const backendList = backendAgents.filter(a => a.status !== 'offline');
  const anyLaunched = backendList.length > 0;

  return marketingAgents.map((ma, i) => {
    if (!anyLaunched) return ma;
    // Mirror the "launched" state from backend — if any backend agent is online/busy, show marketing agents as online
    const mirrorAgent = backendAgents[i % backendAgents.length];
    return {
      ...ma,
      status: mirrorAgent?.status ?? 'online',
      currentTool: mirrorAgent?.currentTool,
      toolCallCount: mirrorAgent?.toolCallCount,
    };
  });
}

export function useAgentChatMonitor() {
  const [data, setData] = useState<MonitorData | null>(null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sseActive, setSseActive] = useState(false);

  const lastTsRef = useRef(0);
  const allAgentLogsRef = useRef<Record<string, LogEntry[]>>({});
  const allGlobalLogsRef = useRef<LogEntry[]>([]);
  const toolStateRef = useRef<Record<string, { currentTool?: string; currentToolInput?: string; toolCallCount: number }>>({});
  const statusOverrideRef = useRef<Record<string, 'online' | 'busy'>>({});
  const eventSourceRef = useRef<EventSource | null>(null);

  // ---- Process SSE AgentEvent ----
  const processEvent = useCallback((event: AgentEvent) => {
    const agentId = event.agentId;

    if (event.type === 'agent:tool_call' && agentId) {
      if (!toolStateRef.current[agentId]) {
        toolStateRef.current[agentId] = { toolCallCount: 0 };
      }
      const state = toolStateRef.current[agentId];
      state.currentTool = event.data.toolName as string;
      state.currentToolInput = event.data.inputPreview as string;
      state.toolCallCount = (state.toolCallCount || 0) + 1;
    }

    if (event.type === 'agent:tool_result' && agentId) {
      if (toolStateRef.current[agentId]) {
        toolStateRef.current[agentId].currentTool = undefined;
        toolStateRef.current[agentId].currentToolInput = undefined;
      }
    }

    if (event.type === 'agent:done' && agentId) {
      if (toolStateRef.current[agentId]) {
        toolStateRef.current[agentId].currentTool = undefined;
        toolStateRef.current[agentId].currentToolInput = undefined;
      }
      statusOverrideRef.current[agentId] = 'online';
    }

    // Sub-agent lifecycle — update status to busy/online
    if (event.type === 'agent:start' && agentId) {
      statusOverrideRef.current[agentId] = 'busy';
      if (!toolStateRef.current[agentId]) {
        toolStateRef.current[agentId] = { toolCallCount: 0 };
      }
    }

    if (event.type === 'agent:sub_agent_start' && agentId) {
      statusOverrideRef.current[agentId] = 'busy';
      if (!toolStateRef.current[agentId]) {
        toolStateRef.current[agentId] = { toolCallCount: 0 };
      }
      // Generate log for sub-agent activation
      const taskPreview = (event.data.taskPreview as string || '').slice(0, 60);
      const logEntry: LogEntry = {
        id: event.id,
        timestamp: event.timestamp,
        level: 'info',
        source: `agent:${agentId}`,
        message: `${agentId} 开始工作${taskPreview ? `: ${taskPreview}` : ''}`,
      };
      allGlobalLogsRef.current.push(logEntry);
      if (!allAgentLogsRef.current[agentId]) allAgentLogsRef.current[agentId] = [];
      allAgentLogsRef.current[agentId].push(logEntry);
    }

    if (event.type === 'agent:sub_agent_stop' && agentId) {
      statusOverrideRef.current[agentId] = 'online';
      if (toolStateRef.current[agentId]) {
        toolStateRef.current[agentId].currentTool = undefined;
        toolStateRef.current[agentId].currentToolInput = undefined;
      }
      const logEntry: LogEntry = {
        id: event.id,
        timestamp: event.timestamp,
        level: 'success',
        source: `agent:${agentId}`,
        message: `${agentId} 任务完成`,
      };
      allGlobalLogsRef.current.push(logEntry);
      if (!allAgentLogsRef.current[agentId]) allAgentLogsRef.current[agentId] = [];
      allAgentLogsRef.current[agentId].push(logEntry);
    }

    // Convert to LogEntry for timeline
    if (event.type === 'system:log') {
      const logEntry: LogEntry = {
        id: event.id,
        timestamp: event.timestamp,
        level: (event.data.level as LogEntry['level']) || 'info',
        source: (event.data.source as string) || 'system',
        message: (event.data.message as string) || '',
      };

      if (agentId) {
        if (!allAgentLogsRef.current[agentId]) allAgentLogsRef.current[agentId] = [];
        allAgentLogsRef.current[agentId].push(logEntry);
        if (allAgentLogsRef.current[agentId].length > 50) {
          allAgentLogsRef.current[agentId] = allAgentLogsRef.current[agentId].slice(-50);
        }
      }
      allGlobalLogsRef.current.push(logEntry);
      if (allGlobalLogsRef.current.length > 100) {
        allGlobalLogsRef.current = allGlobalLogsRef.current.slice(-100);
      }
    }

    // Tool call events also go to timeline
    if (event.type === 'agent:tool_call' || event.type === 'agent:tool_result') {
      const level = event.type === 'agent:tool_call' ? 'info' :
        (event.data.success === false ? 'error' : 'success');
      const message = event.type === 'agent:tool_call'
        ? `🔧 ${event.data.toolName}: ${(event.data.inputPreview as string || '').slice(0, 80)}`
        : `✅ Tool result: ${(event.data.resultPreview as string || '').slice(0, 80)}`;

      const logEntry: LogEntry = {
        id: event.id,
        timestamp: event.timestamp,
        level: level as LogEntry['level'],
        source: agentId ? `tool:${agentId}` : 'tool',
        message,
      };

      allGlobalLogsRef.current.push(logEntry);
      if (allGlobalLogsRef.current.length > 100) {
        allGlobalLogsRef.current = allGlobalLogsRef.current.slice(-100);
      }

      if (agentId) {
        if (!allAgentLogsRef.current[agentId]) allAgentLogsRef.current[agentId] = [];
        allAgentLogsRef.current[agentId].push(logEntry);
        if (allAgentLogsRef.current[agentId].length > 50) {
          allAgentLogsRef.current[agentId] = allAgentLogsRef.current[agentId].slice(-50);
        }
      }
    }

    // Approval event → voice notification
    if (event.type === 'agent:approval_needed') {
      const msg = (event.data.message as string) || `Agent ${agentId} 需要您的确认`;
      fetch(`${AGENT_CHAT_BASE}/api/notify/voice`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msg }),
      }).catch(() => {});
    }

    // Trigger re-render by updating data (agents already mapped to marketing team)
    setData((prev) => {
      if (!prev) return prev;
      const agents = prev.agents.map((a): MonitorAgent => {
        const ts = toolStateRef.current[a.id];
        const statusOv = statusOverrideRef.current[a.id];
        const updatedStatus = statusOv || a.status;
        if (ts) {
          return { ...a, status: updatedStatus, currentTool: ts.currentTool, currentToolInput: ts.currentToolInput, toolCallCount: ts.toolCallCount };
        }
        if (statusOv) {
          return { ...a, status: updatedStatus };
        }
        return a;
      });
      return {
        ...prev,
        ts: Date.now(),
        agents,
        agentLogs: { ...allAgentLogsRef.current },
        globalLogs: [...allGlobalLogsRef.current],
      };
    });
  }, []);

  // ---- SSE connection ----
  const connectSSE = useCallback(() => {
    if (eventSourceRef.current) return;

    try {
      const es = new EventSource(`${AGENT_CHAT_BASE}/api/events`);
      eventSourceRef.current = es;

      es.onopen = () => {
        setSseActive(true);
        setConnected(true);
        setError(null);
      };

      es.onmessage = (e) => {
        try {
          const event: AgentEvent = JSON.parse(e.data);
          processEvent(event);
        } catch {}
      };

      es.onerror = () => {
        es.close();
        eventSourceRef.current = null;
        setSseActive(false);
        // Will fall back to polling
      };
    } catch {
      setSseActive(false);
    }
  }, [processEvent]);

  // ---- Polling fallback ----
  const poll = useCallback(async () => {
    try {
      const url = `${AGENT_CHAT_BASE}/api/monitor?since=${lastTsRef.current}`;
      const res = await fetch(url, { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json: MonitorData = await res.json();

      for (const [agentId, logs] of Object.entries(json.agentLogs)) {
        if (!allAgentLogsRef.current[agentId]) allAgentLogsRef.current[agentId] = [];
        allAgentLogsRef.current[agentId].push(...logs);
        if (allAgentLogsRef.current[agentId].length > 50) {
          allAgentLogsRef.current[agentId] = allAgentLogsRef.current[agentId].slice(-50);
        }
      }
      allGlobalLogsRef.current.push(...json.globalLogs);
      if (allGlobalLogsRef.current.length > 100) {
        allGlobalLogsRef.current = allGlobalLogsRef.current.slice(-100);
      }

      lastTsRef.current = json.ts;

      setData({
        ...json,
        agents: mapToMarketingAgents(json.agents),
        agentLogs: { ...allAgentLogsRef.current },
        globalLogs: [...allGlobalLogsRef.current],
      });
      setConnected(true);
      setError(null);

      // Try SSE after successful poll
      if (!eventSourceRef.current) {
        connectSSE();
      }
    } catch (err) {
      setConnected(false);
      setError(err instanceof Error ? err.message : 'Connection failed');
    }
  }, [connectSSE]);

  useEffect(() => {
    // Start with poll, then try SSE
    poll();
    const timer = setInterval(() => {
      // Only poll if SSE is not active
      if (!eventSourceRef.current) {
        poll();
      }
    }, POLL_INTERVAL);

    return () => {
      clearInterval(timer);
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
    };
  }, [poll]);

  const launchTeam = useCallback(async () => {
    try {
      await fetch(`${AGENT_CHAT_BASE}/api/launch-team`, { method: 'POST' });
      await poll();
    } catch {}
  }, [poll]);

  const stopTeam = useCallback(async () => {
    try {
      await fetch(`${AGENT_CHAT_BASE}/api/launch-team`, { method: 'DELETE' });
      await poll();
    } catch {}
  }, [poll]);

  return { data, connected, error, sseActive, launchTeam, stopTeam, refresh: poll };
}
