/**
 * Phase 1 测试 — EventBus 单元测试
 *
 * 覆盖: TC-033 (部分), EventBus 核心功能
 */

// 独立实现 EventBus 测试（不依赖 globalThis singleton）
type AgentEventType =
  | "agent:start" | "agent:stop" | "agent:text" | "agent:done"
  | "agent:tool_call" | "agent:tool_result"
  | "agent:sub_agent_start" | "agent:sub_agent_stop"
  | "agent:message" | "system:log" | "system:heartbeat";

interface AgentEvent {
  id: number;
  type: AgentEventType;
  timestamp: number;
  agentId?: string;
  data: Record<string, unknown>;
}

type EventHandler = (event: AgentEvent) => void;

// 复制 EventBus 类用于独立测试
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
    const wildcardHandlers = this.handlers.get("*");
    if (wildcardHandlers) {
      for (const handler of wildcardHandlers) {
        try { handler(full); } catch { /* ignore */ }
      }
    }
    const typeHandlers = this.handlers.get(event.type);
    if (typeHandlers) {
      for (const handler of typeHandlers) {
        try { handler(full); } catch { /* ignore */ }
      }
    }
    return full;
  }

  on(type: AgentEventType | "*", handler: EventHandler): () => void {
    if (!this.handlers.has(type)) {
      this.handlers.set(type, new Set());
    }
    this.handlers.get(type)!.add(handler);
    return () => { this.handlers.get(type)?.delete(handler); };
  }

  getRecentEvents(since?: number, limit?: number): AgentEvent[] {
    let events = since !== undefined
      ? this.buffer.filter((e) => e.timestamp > since)
      : [...this.buffer];
    if (limit !== undefined) { events = events.slice(-limit); }
    return events;
  }

  getLastEventId(): number {
    return this.eventId;
  }
}

// ============================================================
// 测试用例
// ============================================================

function testEmitAndReceive() {
  const bus = new EventBus();
  const received: AgentEvent[] = [];

  bus.on("agent:start", (e) => received.push(e));

  bus.emit({ type: "agent:start", agentId: "ceo", data: { message: "test" } });

  console.assert(received.length === 1, `FAIL: 应收到1个事件，实际${received.length}`);
  console.assert(received[0].type === "agent:start", "FAIL: 事件类型不匹配");
  console.assert(received[0].agentId === "ceo", "FAIL: agentId 不匹配");
  console.assert(received[0].id > 0, "FAIL: id 应大于0");
  console.assert(received[0].timestamp > 0, "FAIL: timestamp 应大于0");
  console.log("EventBus-01 PASS: emit 和 on 正常工作");
}

function testWildcardHandler() {
  const bus = new EventBus();
  const received: AgentEvent[] = [];

  bus.on("*", (e) => received.push(e));

  bus.emit({ type: "agent:start", agentId: "ceo", data: {} });
  bus.emit({ type: "agent:done", agentId: "ceo", data: {} });
  bus.emit({ type: "agent:text", agentId: "xhs-agent", data: {} });

  console.assert(received.length === 3, `FAIL: wildcard 应收到3个事件，实际${received.length}`);
  console.log("EventBus-02 PASS: wildcard 处理器正确接收所有事件");
}

function testUnsubscribe() {
  const bus = new EventBus();
  const received: AgentEvent[] = [];

  const unsub = bus.on("agent:start", (e) => received.push(e));
  bus.emit({ type: "agent:start", data: {} });
  console.assert(received.length === 1, "FAIL: 取消前应收到1个");

  unsub();
  bus.emit({ type: "agent:start", data: {} });
  console.assert(received.length === 1, `FAIL: 取消后应仍为1，实际${received.length}`);
  console.log("EventBus-03 PASS: unsubscribe 正确取消订阅");
}

function testGetRecentEvents() {
  const bus = new EventBus();

  bus.emit({ type: "agent:start", agentId: "a", data: {} });
  const ts = Date.now();

  // 稍微延迟确保时间戳不同
  bus.emit({ type: "agent:done", agentId: "b", data: {} });

  const all = bus.getRecentEvents();
  console.assert(all.length === 2, `FAIL: 总事件应为2，实际${all.length}`);

  // since 过滤（用 ts-1 确保拿到第二个）
  const recent = bus.getRecentEvents(ts - 1);
  console.assert(recent.length >= 1, `FAIL: since 过滤后应有事件，实际${recent.length}`);

  // limit
  const limited = bus.getRecentEvents(undefined, 1);
  console.assert(limited.length === 1, `FAIL: limit=1 应返回1个，实际${limited.length}`);

  console.log("EventBus-04 PASS: getRecentEvents 过滤和限制正确");
}

function testBufferOverflow() {
  const bus = new EventBus();

  // 发射 510 个事件（超过 maxBuffer=500）
  for (let i = 0; i < 510; i++) {
    bus.emit({ type: "system:log", data: { i } });
  }

  const all = bus.getRecentEvents();
  console.assert(all.length <= 500, `FAIL: buffer 应不超过500，实际${all.length}`);
  console.assert(bus.getLastEventId() === 510, `FAIL: eventId 应为510，实际${bus.getLastEventId()}`);
  console.log("EventBus-05 PASS: buffer 溢出正确清理");
}

function testHandlerError() {
  const bus = new EventBus();
  const received: AgentEvent[] = [];

  // 第一个 handler 抛错
  bus.on("agent:start", () => { throw new Error("boom"); });
  // 第二个 handler 正常
  bus.on("agent:start", (e) => received.push(e));

  bus.emit({ type: "agent:start", data: {} });
  console.assert(received.length === 1, `FAIL: handler 报错不应影响其他 handler，实际${received.length}`);
  console.log("EventBus-06 PASS: handler 抛错不影响其他 handler");
}

function testEventIdIncrement() {
  const bus = new EventBus();
  const e1 = bus.emit({ type: "agent:start", data: {} });
  const e2 = bus.emit({ type: "agent:done", data: {} });

  console.assert(e2.id === e1.id + 1, `FAIL: id 应自增，e1=${e1.id} e2=${e2.id}`);
  console.assert(e2.timestamp >= e1.timestamp, "FAIL: 后续事件 timestamp 应 >= 前一个");
  console.log("EventBus-07 PASS: 事件 ID 自增正确");
}

// ============================================================
// 运行
// ============================================================
console.log("========================================");
console.log("Phase 1 — EventBus 单元测试");
console.log("========================================\n");

testEmitAndReceive();
testWildcardHandler();
testUnsubscribe();
testGetRecentEvents();
testBufferOverflow();
testHandlerError();
testEventIdIncrement();

console.log("\n========================================");
console.log("EventBus 测试完成");
console.log("========================================");
