import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const SETTINGS_FILE = path.join(process.cwd(), 'src', 'data', 'settings.json');

interface Settings {
  email?: {
    address: string;
    senderName: string;
    verified: boolean;
    configuredAt: string;
  };
  approval?: {
    mode: "auto" | "manual";
    autoThreshold: number;
  };
  [key: string]: unknown;
}

const DEFAULT_APPROVAL = { mode: "manual" as const, autoThreshold: 7 };

function readSettings(): Settings {
  let settings: Settings = {};
  try {
    if (fs.existsSync(SETTINGS_FILE)) {
      const raw = fs.readFileSync(SETTINGS_FILE, 'utf-8');
      settings = JSON.parse(raw) as Settings;
    }
  } catch {
    // Return defaults on parse error
  }
  // Ensure approval defaults are always present
  if (!settings.approval) {
    settings.approval = { ...DEFAULT_APPROVAL };
  }
  return settings;
}

function writeSettings(settings: Settings): void {
  fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2), 'utf-8');
}

/**
 * GET /api/settings — Read all settings
 */
export async function GET() {
  try {
    const settings = readSettings();
    return NextResponse.json({ success: true, data: settings });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

/**
 * PUT /api/settings — Update settings (merge)
 * Body: partial settings object
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const current = readSettings();
    const updated = { ...current, ...body } as Settings;
    writeSettings(updated);
    return NextResponse.json({ success: true, data: updated });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
