import { NextRequest, NextResponse } from 'next/server';
import { listCampaigns, createCampaign } from '@/lib/store/campaigns';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const status = searchParams.get('status');
    const filter = status ? { status } : undefined;
    const data = await listCampaigns(filter);
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
    const { name, description, goal, start_date, end_date, status, workspace_id, created_by } = body;

    if (!name || !goal) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: name, goal' },
        { status: 400 }
      );
    }

    const data = await createCampaign({
      workspace_id: workspace_id ?? 'ws-001',
      name,
      description: description ?? '',
      goal,
      start_date: start_date ?? null,
      end_date: end_date ?? null,
      status: status ?? 'planned',
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
