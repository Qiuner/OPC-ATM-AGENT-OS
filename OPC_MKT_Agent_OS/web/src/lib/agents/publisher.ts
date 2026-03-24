import type { AgentInput, AgentOutput } from './base';

// ==========================================
// Publisher Agent — 多平台格式化发布包
// 纯逻辑处理，不调用 LLM
// ==========================================

interface WriterDraft {
  platform: string;
  title: string;
  body: string;
  tags: string[];
  cta: string;
  mediaPrompt: string;
  riskCheck: { passed: boolean; warnings: string[] };
  editableHints: string[];
}

interface PlatformLimits {
  maxTitleLength: number;
  maxBodyLength: number;
  maxTags: number;
  tagPrefix: string;
}

const PLATFORM_LIMITS: Record<string, PlatformLimits> = {
  小红书: { maxTitleLength: 20, maxBodyLength: 1000, maxTags: 10, tagPrefix: '#' },
  抖音: { maxTitleLength: 30, maxBodyLength: 2000, maxTags: 5, tagPrefix: '#' },
  视频号: { maxTitleLength: 30, maxBodyLength: 2000, maxTags: 5, tagPrefix: '#' },
  X: { maxTitleLength: 0, maxBodyLength: 280, maxTags: 5, tagPrefix: '#' },
  即刻: { maxTitleLength: 50, maxBodyLength: 3000, maxTags: 5, tagPrefix: '#' },
};

function checkForbiddenClaims(
  text: string,
  forbidden: string[]
): { passed: boolean; details: string[] } {
  const details: string[] = [];
  for (const claim of forbidden) {
    if (text.includes(claim)) {
      details.push(`包含禁用表达: "${claim}"`);
    }
  }
  return { passed: details.length === 0, details };
}

function formatForPlatform(draft: WriterDraft, limits: PlatformLimits): WriterDraft {
  const formatted = { ...draft };

  // 截断标题
  if (limits.maxTitleLength > 0 && formatted.title.length > limits.maxTitleLength) {
    formatted.title = formatted.title.slice(0, limits.maxTitleLength - 1) + '…';
  }

  // 限制标签数量，确保有前缀
  formatted.tags = formatted.tags.slice(0, limits.maxTags).map((tag) => {
    return tag.startsWith(limits.tagPrefix) ? tag : `${limits.tagPrefix}${tag}`;
  });

  return formatted;
}

function toMarkdown(draft: WriterDraft): string {
  const lines: string[] = [];
  lines.push(`# ${draft.title}`);
  lines.push('');
  lines.push(`**平台**: ${draft.platform}`);
  lines.push('');
  lines.push(draft.body);
  lines.push('');
  lines.push(`**标签**: ${draft.tags.join(' ')}`);
  lines.push('');
  lines.push(`**CTA**: ${draft.cta}`);
  if (draft.mediaPrompt) {
    lines.push('');
    lines.push(`**配图建议**: ${draft.mediaPrompt}`);
  }
  return lines.join('\n');
}

export class PublisherAgent {
  name = 'publisher';

  async run(input: AgentInput): Promise<AgentOutput> {
    try {
      const draft = input.previousOutput as unknown as WriterDraft;
      if (!draft || !draft.platform) {
        return {
          agentType: this.name,
          status: 'failed',
          data: {},
          error: '缺少 Writer Agent 的输出数据',
        };
      }

      const forbiddenClaims = (input.context.forbidden_claims as string[]) ?? [];
      const scheduledTime = (input.context.scheduledTime as string) ?? null;

      // 风险检测
      const fullText = `${draft.title} ${draft.body} ${draft.cta}`;
      const riskResult = checkForbiddenClaims(fullText, forbiddenClaims);

      // 格式化
      const limits = PLATFORM_LIMITS[draft.platform] ?? PLATFORM_LIMITS['小红书'];
      const formatted = formatForPlatform(draft, limits);

      const publishPack = {
        platform: formatted.platform,
        title: formatted.title,
        body: formatted.body,
        tags: formatted.tags,
        cta: formatted.cta,
        mediaPrompt: formatted.mediaPrompt,
        scheduledTime: scheduledTime ?? new Date(Date.now() + 86400000).toISOString(),
        riskScore: riskResult.details.length,
        riskDetails: riskResult.details,
        exportFormats: {
          json: JSON.stringify(formatted, null, 2),
          markdown: toMarkdown(formatted),
        },
      };

      return {
        agentType: this.name,
        status: 'success',
        data: { publishPack },
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        agentType: this.name,
        status: 'failed',
        data: {},
        error: message,
      };
    }
  }

  async runWithLog(input: AgentInput) {
    const startedAt = new Date().toISOString();
    const startMs = Date.now();

    const output = await this.run(input);

    return {
      output,
      log: {
        agentType: this.name,
        startedAt,
        finishedAt: new Date().toISOString(),
        durationMs: Date.now() - startMs,
        status: output.status,
        input: { hasDraft: !!input.previousOutput },
        output: output.status === 'success' ? output.data : null,
        error: output.error,
      },
    };
  }
}
