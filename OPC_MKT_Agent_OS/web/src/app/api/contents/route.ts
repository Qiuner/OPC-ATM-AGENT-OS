import { NextRequest, NextResponse } from 'next/server';
import { listContents, createContent } from '@/lib/store/contents';
import type { ContentStatus } from '@/types';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const status = searchParams.get('status') as ContentStatus | null;
    const campaign_id = searchParams.get('campaign_id');
    const filter: { status?: ContentStatus; campaign_id?: string } = {};
    if (status) filter.status = status;
    if (campaign_id) filter.campaign_id = campaign_id;
    const data = await listContents(Object.keys(filter).length > 0 ? filter : undefined);
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
    const { task_id, campaign_id, title, body: contentBody, platform, status, media_urls, metadata, created_by } = body;

    if (!task_id || !campaign_id || !title) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: task_id, campaign_id, title' },
        { status: 400 }
      );
    }

    const data = await createContent({
      task_id,
      campaign_id,
      title,
      body: contentBody ?? '',
      platform: platform ?? '',
      status: status ?? 'draft',
      media_urls: media_urls ?? [],
      metadata: metadata ?? {},
      created_by: created_by ?? 'user-001',
      agent_run_id: body.agent_run_id ?? null,
      agent_type: body.agent_type ?? null,
      learning_id: body.learning_id ?? null,
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
