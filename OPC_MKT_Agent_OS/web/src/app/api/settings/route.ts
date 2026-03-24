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
  [key: string]: unknown;
}

function readSettings(): Settings {
  try {
    if (fs.existsSync(SETTINGS_FILE)) {
      const raw = fs.readFileSync(SETTINGS_FILE, 'utf-8');
      return JSON.parse(raw) as Settings;
    }
  } catch {
    // Return empty settings on parse error
  }
  return {};
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
