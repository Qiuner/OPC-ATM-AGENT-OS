import { NextRequest, NextResponse } from 'next/server';
import { feishuClient } from '@/lib/feishu/client';

/**
 * POST /api/openclaw/push-feishu
 * OpenClaw 通过此端点向飞书群发送消息（因为 OpenClaw 没有直接的飞书工具权限）
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { chat_id, message } = body as { chat_id?: string; message?: string };

    if (!message) {
      return NextResponse.json(
        { success: false, error: '缺少 message 参数' },
        { status: 400 },
      );
    }

    const targetChatId = chat_id || 'oc_34b771771cb6dac5b305cf8ee4fe11ca';

    const result = await feishuClient.sendText(targetChatId, message);

    console.log(`[push-feishu] Message sent to ${targetChatId}, message_id: ${result.data?.message_id}`);

    return NextResponse.json({
      success: true,
      data: { message_id: result.data?.message_id },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[push-feishu] Error:', msg);
    return NextResponse.json(
      { success: false, error: msg },
      { status: 500 },
    );
  }
}
