import { NextRequest, NextResponse } from 'next/server';
import {
  listContextAssets,
  createContextAsset,
} from '@/lib/store/context-assets';
import type { ContextAssetType } from '@/types';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const type = searchParams.get('type') as ContextAssetType | null;
    const filter = type ? { type } : undefined;
    const data = await listContextAssets(filter);
    return NextResponse.json({ success: true, data });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, title, content, metadata, workspace_id, created_by } = body;

    if (!type || !title || !content) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: type, title, content' },
        { status: 400 }
      );
    }

    const data = await createContextAsset({
      workspace_id: workspace_id ?? 'ws-001',
      type,
      title,
      content,
      metadata: metadata ?? {},
      created_by: created_by ?? 'user-001',
    });
    return NextResponse.json({ success: true, data }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
