/**
 * GET /api/agent/events — EventBus SSE 推送
 *
 * 客户端连接此端点后，实时接收 Agent 执行事件。
 * 用于 Agent Monitor 组件展示实时状态。
 *
 * 查询参数：
 * - since: 时间戳，只返回此时间之后的事件
 */

import { eventBus } from "@/lib/agent-sdk/event-bus";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const since = url.searchParams.get("since");
  const sinceTs = since ? parseInt(since, 10) : undefined;

  const encoder = new TextEncoder();
  let closed = false;

  const stream = new ReadableStream({
    start(controller) {
      // 发送连接确认
      controller.enqueue(encoder.encode(`: connected\n\n`));

      // 发送历史事件（如果有 since 参数）
      if (sinceTs) {
        const recent = eventBus.getRecentEvents(sinceTs, 50);
        for (const event of recent) {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(event)}\n\n`),
          );
        }
      }

      // 监听新事件
      const unsubscribe = eventBus.on("*", (event) => {
        if (closed) return;
        try {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(event)}\n\n`),
          );
        } catch {
          closed = true;
          unsubscribe();
        }
      });

      // 心跳保活（每 30 秒）
      const heartbeat = setInterval(() => {
        if (closed) {
          clearInterval(heartbeat);
          return;
        }
        try {
          controller.enqueue(encoder.encode(`: heartbeat\n\n`));
        } catch {
          closed = true;
          clearInterval(heartbeat);
          unsubscribe();
        }
      }, 30_000);

      // 连接关闭时清理
      req.signal.addEventListener("abort", () => {
        closed = true;
        clearInterval(heartbeat);
        unsubscribe();
        try {
          controller.close();
        } catch { /* already closed */ }
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
