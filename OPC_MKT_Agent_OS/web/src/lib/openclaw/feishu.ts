import type { ApiResponse } from './handlers';

/**
 * Push a result card to Feishu if a chat_id is provided.
 * Best-effort push — failure does not affect the main flow.
 */
export async function pushToFeishu(
  chatId: string,
  message: string
): Promise<void> {
  const token = process.env.FEISHU_APP_ACCESS_TOKEN;
  if (!token) {
    console.warn('[OpenClaw] FEISHU_APP_ACCESS_TOKEN not set, skip push');
    return;
  }

  try {
    await fetch(
      'https://open.feishu.cn/open-apis/im/v1/messages?receive_id_type=chat_id',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          receive_id: chatId,
          msg_type: 'text',
          content: JSON.stringify({ text: message }),
        }),
      }
    );
  } catch (err) {
    console.error('[OpenClaw] Failed to push to Feishu:', err);
  }
}

/**
 * POST the result to a callback URL if provided.
 */
export async function invokeCallback(
  url: string,
  payload: ApiResponse
): Promise<void> {
  try {
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    console.error('[OpenClaw] Callback failed:', err);
  }
}
