import { NextRequest, NextResponse } from 'next/server';
import { listApprovals, createApproval } from '@/lib/store/approvals';
import type { ApprovalRecord } from '@/types';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const content_id = searchParams.get('content_id');
    const filter: { content_id?: string } = {};
    if (content_id) filter.content_id = content_id;
    const data = await listApprovals(Object.keys(filter).length > 0 ? filter : undefined);
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
    const body = await request.json() as {
      content_id?: string;
      decision?: ApprovalRecord['decision'];
      comment?: string;
      reviewer?: string;
    };
    const { content_id, decision, comment, reviewer } = body;

    if (!content_id || !decision) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: content_id, decision' },
        { status: 400 }
      );
    }

    if (!['approved', 'rejected', 'revision'].includes(decision)) {
      return NextResponse.json(
        { success: false, error: 'Invalid decision. Must be: approved, rejected, or revision' },
        { status: 400 }
      );
    }

    const data = await createApproval({
      content_id,
      decision,
      comment: comment ?? '',
      reviewer: reviewer ?? 'user-001',
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
