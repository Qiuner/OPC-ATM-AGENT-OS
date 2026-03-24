import { NextRequest, NextResponse } from 'next/server';
import { listTasks, createTask } from '@/lib/store/tasks';
import type { TaskStatus } from '@/types';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const status = searchParams.get('status') as TaskStatus | null;
    const campaign_id = searchParams.get('campaign_id');
    const filter: { status?: TaskStatus; campaign_id?: string } = {};
    if (status) filter.status = status;
    if (campaign_id) filter.campaign_id = campaign_id;
    const data = await listTasks(Object.keys(filter).length > 0 ? filter : undefined);
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
    const { campaign_id, title, description, status, assignee_type, assignee_id, priority, due_date } = body;

    if (!campaign_id || !title) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: campaign_id, title' },
        { status: 400 }
      );
    }

    const data = await createTask({
      campaign_id,
      title,
      description: description ?? '',
      status: status ?? 'backlog',
      assignee_type: assignee_type ?? 'agent',
      assignee_id: assignee_id ?? null,
      priority: priority ?? 0,
      due_date: due_date ?? null,
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
