import type { CLIResult } from './types.js';

const BASE_URL = process.env.CREATORFLOW_URL || 'http://localhost:3000';

export async function cfApi<T = unknown>(
  method: string,
  path: string,
  body?: unknown,
  query?: Record<string, string>,
): Promise<CLIResult<T>> {
  const url = new URL(path, BASE_URL);
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      url.searchParams.set(k, v);
    }
  }

  const start = Date.now();
  const meta = { endpoint: path, method, duration_ms: 0 };

  try {
    const res = await fetch(url.toString(), {
      method,
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });

    meta.duration_ms = Date.now() - start;

    if (!res.ok) {
      let errorMsg = `HTTP ${res.status}`;
      try {
        const errBody = await res.json();
        errorMsg = errBody.error || errBody.message || errorMsg;
      } catch {
        errorMsg = await res.text().catch(() => errorMsg);
      }
      return { success: false, error: errorMsg, meta };
    }

    const data = await res.json() as T;
    return { success: true, data, meta };
  } catch (err) {
    meta.duration_ms = Date.now() - start;
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, error: msg, meta };
  }
}
