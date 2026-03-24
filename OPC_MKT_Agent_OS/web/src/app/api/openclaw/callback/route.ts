import { NextRequest, NextResponse } from 'next/server';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ApiResponse {
  success: boolean;
  data?: unknown;
  error?: string;
}

interface FeishuUrlVerification {
  challenge: string;
  token: string;
  type: 'url_verification';
}

interface FeishuMessageEvent {
  schema?: string;
  header?: {
    event_id: string;
    event_type: string;
    create_time: string;
    token: string;
    app_id: string;
    tenant_key: string;
  };
  event?: {
    sender?: {
      sender_id?: {
        open_id?: string;
        user_id?: string;
        union_id?: string;
      };
      sender_type?: string;
      tenant_key?: string;
    };
    message?: {
      message_id?: string;
      root_id?: string;
      parent_id?: string;
      create_time?: string;
      chat_id?: string;
      chat_type?: string;
      message_type?: string;
      content?: string;
    };
  };
}

type FeishuPayload = FeishuUrlVerification | FeishuMessageEvent;

type CommandType =
  | 'collect_materials'
  | 'generate_script'
  | 'generate_podcast'
  | 'publish_content'
  | 'create_plan'
  | 'analyze_data'
  | 'get_status';

interface OpenClawCommand {
  command: CommandType;
  params: {
    topic?: string;
    platform?: string;
    style?: string;
    campaign_id?: string;
    content_id?: string;
    url?: string;
    duration?: string;
    script_id?: string;
    content?: string;
  };
  feishu_chat_id?: string;
  callback_url?: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isUrlVerification(
  payload: FeishuPayload
): payload is FeishuUrlVerification {
  return (
    typeof payload === 'object' &&
    payload !== null &&
    'type' in payload &&
    payload.type === 'url_verification'
  );
}

/**
 * 将飞书消息文本解析为 OpenClawCommand。
 *
 * 支持的格式示例：
 *   /生成脚本 主题=防晒测评 平台=小红书 风格=种草
 *   /素材收集 主题=AI工具
 *   /创建计划 主题=618大促
 *   /数据分析
 *   /系统状态
 */
function parseMessageToCommand(text: string): OpenClawCommand | null {
  const trimmed = text.trim();

  const commandMap: Record<string, CommandType> = {
    '/素材收集': 'collect_materials',
    '/收集素材': 'collect_materials',
    '/爬取': 'collect_materials',
    '/生成脚本': 'generate_script',
    '/写脚本': 'generate_script',
    '/做视频': 'generate_script',
    '/生成播客': 'generate_podcast',
    '/做播客': 'generate_podcast',
    '/播客': 'generate_podcast',
    '/发布内容': 'publish_content',
    '/发布': 'publish_content',
    '/创建计划': 'create_plan',
    '/营销计划': 'create_plan',
    '/数据分析': 'analyze_data',
    '/分析数据': 'analyze_data',
    '/系统状态': 'get_status',
    '/状态': 'get_status',
  };

  let matchedCommand: CommandType | null = null;
  let restText = trimmed;

  for (const [keyword, cmd] of Object.entries(commandMap)) {
    if (trimmed.startsWith(keyword)) {
      matchedCommand = cmd;
      restText = trimmed.slice(keyword.length).trim();
      break;
    }
  }

  if (!matchedCommand) {
    return null;
  }

  // Parse key=value pairs from the remaining text
  const params: Record<string, string> = {};
  const kvPattern = /(\S+?)=(\S+)/g;
  let match: RegExpExecArray | null;
  while ((match = kvPattern.exec(restText)) !== null) {
    const key = match[1];
    const value = match[2];
    // Map Chinese param names to English
    const keyMap: Record<string, string> = {
      '主题': 'topic',
      '平台': 'platform',
      '风格': 'style',
      '活动': 'campaign_id',
      '内容': 'content_id',
      '链接': 'url',
      '网址': 'url',
      '时长': 'duration',
      '脚本': 'script_id',
      topic: 'topic',
      platform: 'platform',
      style: 'style',
      campaign_id: 'campaign_id',
      content_id: 'content_id',
      url: 'url',
      duration: 'duration',
      script_id: 'script_id',
    };
    const mappedKey = keyMap[key] ?? key;
    params[mappedKey] = value;
  }

  return {
    command: matchedCommand,
    params: {
      topic: params.topic,
      platform: params.platform,
      style: params.style,
      campaign_id: params.campaign_id,
      content_id: params.content_id,
      url: params.url,
      duration: params.duration,
      script_id: params.script_id,
    },
  };
}

// ---------------------------------------------------------------------------
// Route Handler
// ---------------------------------------------------------------------------

/**
 * POST /api/openclaw/callback
 * 飞书事件订阅回调端点
 */
export async function POST(
  request: NextRequest
): Promise<NextResponse<ApiResponse | { challenge: string }>> {
  try {
    const payload: FeishuPayload = await request.json();

    // 1. 处理 URL 验证（飞书首次订阅时发送 challenge）
    if (isUrlVerification(payload)) {
      return NextResponse.json({ challenge: payload.challenge });
    }

    // 2. 解析消息事件
    const event = (payload as FeishuMessageEvent).event;
    if (!event?.message) {
      return NextResponse.json({
        success: true,
        data: { message: '非消息事件，已忽略' },
      });
    }

    const { message } = event;

    // 只处理文本消息
    if (message.message_type !== 'text') {
      return NextResponse.json({
        success: true,
        data: { message: '非文本消息，已忽略' },
      });
    }

    // 解析消息内容（飞书的 content 是 JSON 字符串）
    let textContent = '';
    try {
      const contentObj = JSON.parse(message.content ?? '{}') as {
        text?: string;
      };
      textContent = contentObj.text ?? '';
    } catch {
      textContent = message.content ?? '';
    }

    if (!textContent) {
      return NextResponse.json({
        success: true,
        data: { message: '消息内容为空，已忽略' },
      });
    }

    // 3. 将消息转换为 OpenClawCommand
    const command = parseMessageToCommand(textContent);

    if (!command) {
      return NextResponse.json({
        success: true,
        data: {
          message: '无法识别的命令。支持: /素材收集, /生成脚本, /创建计划, /数据分析, /系统状态',
          received_text: textContent,
        },
      });
    }

    // 附加飞书 chat_id 以便结果回推
    if (message.chat_id) {
      command.feishu_chat_id = message.chat_id;
    }

    // 4. 转发到主路由（主路由会自动创建 WorkflowRun + 逐步执行）
    const baseUrl = new URL(request.url);
    const host = `${baseUrl.protocol}//${baseUrl.host}`;

    // Fire-and-forget: 不阻塞飞书回调响应
    fetch(`${host}/api/openclaw`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(command),
    }).catch((err) => {
      console.error('[OpenClaw Callback] Failed to dispatch:', err);
    });

    return NextResponse.json({
      success: true,
      data: {
        message: `指令已接收: ${command.command}`,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[OpenClaw Callback] POST error:', err);
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
