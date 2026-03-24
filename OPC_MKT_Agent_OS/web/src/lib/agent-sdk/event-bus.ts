/**
 * EventBus — Agent 事件总线
 *
 * 从 agent-chat/ 迁移并增强。用于：
 * - Agent 执行状态实时推送（SSE → Agent Monitor）
 * - 工具调用 / 子 Agent 调度事件捕获
 * - 系统日志
 */

export type AgentEventType =
  | "agent:start"
  | "agent:stop"
  | "agent:text"
  | "agent:done"
  | "agent:tool_call"
  | "agent:tool_result"
  | "agent:sub_agent_start"
  | "agent:sub_agent_stop"
  | "agent:message"
  | "system:log"
  | "system:heartbeat";

export interface AgentEvent {
  id: number;
  type: AgentEventType;
  timestamp: number;
  agentId?: string;
  data: Record<string, unknown>;
}

type EventHandler = (event: AgentEvent) => void;

class EventBus {
  private handlers = new Map<string, Set<EventHandler>>();
  private buffer: AgentEvent[] = [];
  private maxBuffer = 500;
  private eventId = 0;

  emit(event: Omit<AgentEvent, "id" | "timestamp">): AgentEvent {
    const full: AgentEvent = {
      ...event,
      id: ++this.eventId,
      timestamp: Date.now(),
    };

    this.buffer.push(full);
    if (this.buffer.length > this.maxBuffer) {
      this.buffer.splice(0, this.buffer.length - this.maxBuffer);
    }

    // Wildcard handlers
    const wildcardHandlers = this.handlers.get("*");
    if (wildcardHandlers) {
      for (const handler of wildcardHandlers) {
        try {
          handler(full);
        } catch { /* ignore handler errors */ }
      }
    }

    // Type-specific handlers
    const typeHandlers = this.handlers.get(event.type);
    if (typeHandlers) {
      for (const handler of typeHandlers) {
        try {
          handler(full);
        } catch { /* ignore handler errors */ }
      }
    }

    return full;
  }

  on(type: AgentEventType | "*", handler: EventHandler): () => void {
    if (!this.handlers.has(type)) {
      this.handlers.set(type, new Set());
    }
    this.handlers.get(type)!.add(handler);

    return () => {
      this.handlers.get(type)?.delete(handler);
    };
  }

  getRecentEvents(since?: number, limit?: number): AgentEvent[] {
    let events =
      since !== undefined
        ? this.buffer.filter((e) => e.timestamp > since)
        : [...this.buffer];

    if (limit !== undefined) {
      events = events.slice(-limit);
    }
    return events;
  }

  getLastEventId(): number {
    return this.eventId;
  }
}

// Singleton via globalThis to survive Turbopack hot reloads
const GLOBAL_KEY = "__agentEventBus_v2__";

export const eventBus: EventBus =
  ((globalThis as Record<string, unknown>)[GLOBAL_KEY] as EventBus) ??
  ((globalThis as Record<string, unknown>)[GLOBAL_KEY] = new EventBus());
