// Feishu Open API Client
// Handles authentication, messaging, and interactive card building

const FEISHU_BASE_URL = "https://open.feishu.cn/open-apis";

// ---------- Types ----------

interface TokenResponse {
  code: number;
  msg: string;
  tenant_access_token: string;
  expire: number;
}

interface SendMessageResponse {
  code: number;
  msg: string;
  data?: {
    message_id: string;
    root_id: string;
    parent_id: string;
    msg_type: string;
    create_time: string;
    update_time: string;
    deleted: boolean;
    chat_id: string;
    sender: {
      id: string;
      id_type: string;
      sender_type: string;
    };
  };
}

interface ChatListResponse {
  code: number;
  msg: string;
  data?: {
    items: Array<{
      chat_id: string;
      name: string;
      description: string;
      owner_id: string;
      owner_id_type: string;
    }>;
    page_token: string;
    has_more: boolean;
  };
}

interface BotInfoResponse {
  code: number;
  msg: string;
  bot?: {
    activate_status: number;
    app_name: string;
    avatar_url: string;
    open_id: string;
  };
}

export interface FeishuCardElement {
  tag: string;
  text?: { tag: string; content: string };
  actions?: Array<{
    tag: string;
    text: { tag: string; content: string };
    type?: string;
    url?: string;
    value?: Record<string, string>;
  }>;
  fields?: Array<{
    is_short: boolean;
    text: { tag: string; content: string };
  }>;
}

export interface FeishuCard {
  config?: { wide_screen_mode?: boolean };
  header: {
    title: { tag: string; content: string };
    template?: string;
  };
  elements: FeishuCardElement[];
}

type ReceiveIdType = "chat_id" | "open_id" | "user_id" | "union_id" | "email";

// ---------- Client ----------

export class FeishuClient {
  private appId: string;
  private appSecret: string;
  private token: string | null = null;
  private tokenExpiry: number = 0;

  constructor() {
    this.appId = process.env.FEISHU_APP_ID ?? "";
    this.appSecret = process.env.FEISHU_APP_SECRET ?? "";

    if (!this.appId || !this.appSecret) {
      console.warn(
        "[FeishuClient] FEISHU_APP_ID or FEISHU_APP_SECRET is not set"
      );
    }
  }

  // ---- Authentication ----

  /** Obtain tenant_access_token with automatic caching. */
  async getToken(): Promise<string> {
    const now = Date.now();
    // Refresh 5 minutes before actual expiry to avoid edge-case failures
    if (this.token && now < this.tokenExpiry - 5 * 60 * 1000) {
      return this.token;
    }

    const res = await fetch(
      `${FEISHU_BASE_URL}/auth/v3/tenant_access_token/internal`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json; charset=utf-8" },
        body: JSON.stringify({
          app_id: this.appId,
          app_secret: this.appSecret,
        }),
      }
    );

    if (!res.ok) {
      throw new Error(
        `[FeishuClient] Failed to fetch token: HTTP ${res.status}`
      );
    }

    const data: TokenResponse = await res.json();

    if (data.code !== 0) {
      throw new Error(
        `[FeishuClient] Token error (${data.code}): ${data.msg}`
      );
    }

    this.token = data.tenant_access_token;
    this.tokenExpiry = now + data.expire * 1000;
    return this.token;
  }

  // ---- Messaging ----

  /** Send a plain-text message. */
  async sendText(
    receiveId: string,
    text: string,
    receiveIdType: ReceiveIdType = "chat_id"
  ): Promise<SendMessageResponse> {
    const token = await this.getToken();

    const res = await fetch(
      `${FEISHU_BASE_URL}/im/v1/messages?receive_id_type=${receiveIdType}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json; charset=utf-8",
        },
        body: JSON.stringify({
          receive_id: receiveId,
          msg_type: "text",
          content: JSON.stringify({ text }),
        }),
      }
    );

    if (!res.ok) {
      throw new Error(
        `[FeishuClient] sendText failed: HTTP ${res.status} ${await res.text()}`
      );
    }

    const data: SendMessageResponse = await res.json();
    if (data.code !== 0) {
      throw new Error(
        `[FeishuClient] sendText error (${data.code}): ${data.msg}`
      );
    }
    return data;
  }

  /** Send an interactive card message. */
  async sendCard(
    receiveId: string,
    card: FeishuCard,
    receiveIdType: ReceiveIdType = "chat_id"
  ): Promise<SendMessageResponse> {
    const token = await this.getToken();

    const res = await fetch(
      `${FEISHU_BASE_URL}/im/v1/messages?receive_id_type=${receiveIdType}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json; charset=utf-8",
        },
        body: JSON.stringify({
          receive_id: receiveId,
          msg_type: "interactive",
          content: JSON.stringify(card),
        }),
      }
    );

    if (!res.ok) {
      throw new Error(
        `[FeishuClient] sendCard failed: HTTP ${res.status} ${await res.text()}`
      );
    }

    const data: SendMessageResponse = await res.json();
    if (data.code !== 0) {
      throw new Error(
        `[FeishuClient] sendCard error (${data.code}): ${data.msg}`
      );
    }
    return data;
  }

  // ---- Chat & Bot ----

  /** List chats the bot has joined. */
  async listChats(pageToken?: string): Promise<ChatListResponse> {
    const token = await this.getToken();

    const params = new URLSearchParams();
    if (pageToken) params.set("page_token", pageToken);

    const res = await fetch(
      `${FEISHU_BASE_URL}/im/v1/chats?${params.toString()}`,
      {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    if (!res.ok) {
      throw new Error(
        `[FeishuClient] listChats failed: HTTP ${res.status} ${await res.text()}`
      );
    }

    const data: ChatListResponse = await res.json();
    if (data.code !== 0) {
      throw new Error(
        `[FeishuClient] listChats error (${data.code}): ${data.msg}`
      );
    }
    return data;
  }

  /** Upload a file to Feishu and return the file_key. */
  async uploadFile(
    filePath: string,
    fileName: string,
    fileType: "opus" | "mp4" | "pdf" | "doc" | "xls" | "ppt" | "stream" = "opus"
  ): Promise<string> {
    const token = await this.getToken();
    const fs = await import("fs");
    const path = await import("path");

    const resolvedName = fileName || path.basename(filePath);
    const fileBuffer = fs.readFileSync(filePath);
    const blob = new Blob([fileBuffer]);

    const formData = new FormData();
    formData.append("file_type", fileType);
    formData.append("file_name", resolvedName);
    formData.append("file", blob, resolvedName);

    const res = await fetch(
      `${FEISHU_BASE_URL}/im/v1/files`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      }
    );

    if (!res.ok) {
      throw new Error(
        `[FeishuClient] uploadFile failed: HTTP ${res.status} ${await res.text()}`
      );
    }

    const data = await res.json();
    if (data.code !== 0) {
      throw new Error(
        `[FeishuClient] uploadFile error (${data.code}): ${data.msg}`
      );
    }

    return data.data?.file_key as string;
  }

  /** Send an audio message to a chat. */
  async sendAudio(
    receiveId: string,
    fileKey: string,
    receiveIdType: ReceiveIdType = "chat_id"
  ): Promise<SendMessageResponse> {
    const token = await this.getToken();

    const res = await fetch(
      `${FEISHU_BASE_URL}/im/v1/messages?receive_id_type=${receiveIdType}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json; charset=utf-8",
        },
        body: JSON.stringify({
          receive_id: receiveId,
          msg_type: "audio",
          content: JSON.stringify({ file_key: fileKey }),
        }),
      }
    );

    if (!res.ok) {
      throw new Error(
        `[FeishuClient] sendAudio failed: HTTP ${res.status} ${await res.text()}`
      );
    }

    const data: SendMessageResponse = await res.json();
    if (data.code !== 0) {
      throw new Error(
        `[FeishuClient] sendAudio error (${data.code}): ${data.msg}`
      );
    }
    return data;
  }

  /** Send a file message to a chat. */
  async sendFile(
    receiveId: string,
    fileKey: string,
    receiveIdType: ReceiveIdType = "chat_id"
  ): Promise<SendMessageResponse> {
    const token = await this.getToken();

    const res = await fetch(
      `${FEISHU_BASE_URL}/im/v1/messages?receive_id_type=${receiveIdType}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json; charset=utf-8",
        },
        body: JSON.stringify({
          receive_id: receiveId,
          msg_type: "file",
          content: JSON.stringify({ file_key: fileKey }),
        }),
      }
    );

    if (!res.ok) {
      throw new Error(
        `[FeishuClient] sendFile failed: HTTP ${res.status} ${await res.text()}`
      );
    }

    const data: SendMessageResponse = await res.json();
    if (data.code !== 0) {
      throw new Error(
        `[FeishuClient] sendFile error (${data.code}): ${data.msg}`
      );
    }
    return data;
  }

  /** Get information about the bot itself. */
  async getBotInfo(): Promise<BotInfoResponse> {
    const token = await this.getToken();

    const res = await fetch(`${FEISHU_BASE_URL}/bot/v3/info`, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
      throw new Error(
        `[FeishuClient] getBotInfo failed: HTTP ${res.status} ${await res.text()}`
      );
    }

    const data: BotInfoResponse = await res.json();
    if (data.code !== 0) {
      throw new Error(
        `[FeishuClient] getBotInfo error (${data.code}): ${data.msg}`
      );
    }
    return data;
  }
}

// ---------- Card Builders ----------

/** Build an interactive card for a generated script / content piece. */
export function buildScriptCard(
  title: string,
  platform: string,
  script: string,
  tags?: string[]
): string {
  const tagLine = tags?.length ? `**标签**: ${tags.join(" | ")}` : "";

  const card: FeishuCard = {
    config: { wide_screen_mode: true },
    header: {
      title: { tag: "plain_text", content: title },
      template: "purple",
    },
    elements: [
      {
        tag: "div",
        fields: [
          {
            is_short: true,
            text: { tag: "lark_md", content: `**平台**: ${platform}` },
          },
          {
            is_short: true,
            text: {
              tag: "lark_md",
              content: tagLine || `**类型**: 脚本`,
            },
          },
        ],
      },
      {
        tag: "div",
        text: {
          tag: "lark_md",
          content:
            script.length > 500
              ? `${script.slice(0, 500)}...\n\n*（内容已截断，点击查看完整版）*`
              : script,
        },
      },
    ],
  };

  return JSON.stringify(card);
}

/** Build an interactive card for analysis results / metrics. */
export function buildAnalysisCard(
  title: string,
  metrics: Record<string, string | number>,
  learnings: string
): string {
  const metricFields = Object.entries(metrics).map(([key, value]) => ({
    is_short: true,
    text: { tag: "lark_md" as const, content: `**${key}**: ${value}` },
  }));

  const card: FeishuCard = {
    config: { wide_screen_mode: true },
    header: {
      title: { tag: "plain_text", content: title },
      template: "blue",
    },
    elements: [
      {
        tag: "div",
        fields: metricFields,
      },
      {
        tag: "div",
        text: {
          tag: "lark_md",
          content: `📊 **分析洞察**\n\n${learnings}`,
        },
      },
    ],
  };

  return JSON.stringify(card);
}

// ---------- Singleton ----------

export const feishuClient = new FeishuClient();
