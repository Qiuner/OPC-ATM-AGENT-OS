import { NextResponse } from 'next/server';
import type { ProviderName } from '@/lib/llm/types';

interface ServerConfig {
  keys: Record<ProviderName, string>;
  mode: 'off' | 'core' | 'full';
  defaultProvider: ProviderName;
  features: Record<string, boolean>;
}

// In-memory store (MVP); resets on server restart
let serverConfig: ServerConfig | null = null;

export async function POST(request: Request) {
  try {
    const body = await request.json() as ServerConfig;

    serverConfig = {
      keys: body.keys ?? {},
      mode: body.mode ?? 'off',
      defaultProvider: body.defaultProvider ?? 'claude',
      features: body.features ?? {},
    };

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid request body' }, { status: 400 });
  }
}

export async function GET() {
  if (!serverConfig) {
    return NextResponse.json({
      success: true,
      data: {
        configured: {} as Record<string, boolean>,
        mode: 'off',
        defaultProvider: 'claude',
        features: {},
      },
    });
  }

  // Don't return full keys—only whether each is configured
  const configured: Record<string, boolean> = {};
  for (const [key, value] of Object.entries(serverConfig.keys)) {
    configured[key] = !!value;
  }

  return NextResponse.json({
    success: true,
    data: {
      configured,
      mode: serverConfig.mode,
      defaultProvider: serverConfig.defaultProvider,
      features: serverConfig.features,
    },
  });
}
