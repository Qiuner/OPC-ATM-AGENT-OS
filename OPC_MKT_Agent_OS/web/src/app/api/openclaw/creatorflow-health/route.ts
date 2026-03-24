import { NextResponse } from 'next/server';
import { spawn } from 'child_process';

const CREATORFLOW_PORT = process.env.CREATORFLOW_PORT ?? '3002';
const CREATORFLOW_DIR =
  process.env.CREATORFLOW_DIR ??
  '/Users/jaydenworkplace/Desktop/Agent-team-project/AI自媒体工具/自媒体工具/creatorflow';

let starting = false;

async function isRunning(): Promise<boolean> {
  try {
    const res = await fetch(`http://localhost:${CREATORFLOW_PORT}/api/settings`, {
      method: 'GET',
      signal: AbortSignal.timeout(3_000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * GET — 检查 CreatorFlow 是否在运行
 */
export async function GET() {
  const running = await isRunning();
  return NextResponse.json({ running, starting, port: CREATORFLOW_PORT });
}

/**
 * POST — 触发启动 CreatorFlow
 */
export async function POST() {
  if (await isRunning()) {
    return NextResponse.json({ running: true, starting: false, port: CREATORFLOW_PORT });
  }

  if (starting) {
    return NextResponse.json({ running: false, starting: true, port: CREATORFLOW_PORT });
  }

  starting = true;

  try {
    const child = spawn('npx', ['next', 'dev', '--port', CREATORFLOW_PORT], {
      cwd: CREATORFLOW_DIR,
      stdio: 'ignore',
      detached: true,
      env: { ...process.env, NODE_ENV: 'development' },
    });
    child.unref();

    // 等待就绪（最多 30 秒）
    for (let i = 0; i < 30; i++) {
      await new Promise(r => setTimeout(r, 1_000));
      if (await isRunning()) {
        starting = false;
        return NextResponse.json({ running: true, starting: false, port: CREATORFLOW_PORT });
      }
    }

    starting = false;
    return NextResponse.json(
      { running: false, starting: false, error: '启动超时' },
      { status: 504 }
    );
  } catch (err) {
    starting = false;
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json(
      { running: false, starting: false, error: msg },
      { status: 500 }
    );
  }
}
