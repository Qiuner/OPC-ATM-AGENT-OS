/**
 * Agent-Chat Proxy — 转发请求到 agent-chat (localhost:3001)
 * 解决浏览器 CORS 跨域限制
 */

import { NextRequest } from 'next/server';

export const runtime = 'nodejs';
export const maxDuration = 300;

const AGENT_CHAT_BASE = process.env.AGENT_CHAT_URL || 'http://localhost:3001';

async function proxy(req: NextRequest) {
  const path = req.nextUrl.pathname.replace('/api/agent-chat', '');
  const targetUrl = `${AGENT_CHAT_BASE}${path}${req.nextUrl.search}`;

  const headers: Record<string, string> = {
    'Content-Type': req.headers.get('content-type') || 'application/json',
  };

  const init: RequestInit = {
    method: req.method,
    headers,
  };

  if (req.method !== 'GET' && req.method !== 'HEAD') {
    init.body = await req.text();
  }

  const upstream = await fetch(targetUrl, init);

  // For SSE streams, pipe through directly
  if (upstream.headers.get('content-type')?.includes('text/event-stream')) {
    return new Response(upstream.body, {
      status: upstream.status,
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  }

  // For JSON responses, pass through
  const body = await upstream.text();
  return new Response(body, {
    status: upstream.status,
    headers: {
      'Content-Type': upstream.headers.get('content-type') || 'application/json',
    },
  });
}

export const GET = proxy;
export const POST = proxy;
export const DELETE = proxy;
