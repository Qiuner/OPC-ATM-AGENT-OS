import type { ProviderName, ChatMessage, LLMOptions, LLMResponse } from '@/lib/llm/types';
import { createProvider } from '@/lib/llm/provider';

// ==========================================
// Agent 基础框架
// ==========================================

export interface AgentConfig {
  provider: ProviderName;
  model?: string;
  temperature?: number;
  apiKey?: string;
}

export interface AgentInput {
  context: Record<string, unknown>;
  previousOutput?: Record<string, unknown>;
  config?: AgentConfig;
}

export interface AgentOutput {
  agentType: string;
  status: 'success' | 'failed';
  data: Record<string, unknown>;
  usage?: { inputTokens: number; outputTokens: number };
  error?: string;
}

export interface AgentRunLog {
  agentType: string;
  startedAt: string;
  finishedAt: string;
  durationMs: number;
  status: 'success' | 'failed';
  input: Record<string, unknown>;
  output: Record<string, unknown> | null;
  error?: string;
  usage?: { inputTokens: number; outputTokens: number };
}

const MOCK_ENABLED_KEY = 'MOCK_LLM';

function isMockMode(apiKey?: string): boolean {
  // If a client-supplied API key is provided, never use mock mode
  if (apiKey) return false;
  // 如果没有任何 LLM API Key，启用 mock 模式
  const hasAnyKey = !!(
    process.env.ANTHROPIC_API_KEY ||
    process.env.OPENAI_API_KEY ||
    process.env.GOOGLE_AI_API_KEY ||
    process.env.DEEPSEEK_API_KEY
  );
  if (process.env[MOCK_ENABLED_KEY] === 'true') return true;
  return !hasAnyKey;
}

export abstract class BaseAgent {
  abstract name: string;

  protected abstract buildSystemPrompt(): string;
  protected abstract buildUserPrompt(input: AgentInput): string;
  protected abstract getMockResponse(input: AgentInput): Record<string, unknown>;

  async run(input: AgentInput): Promise<AgentOutput> {
    const startedAt = Date.now();

    try {
      const config = input.config ?? { provider: 'claude' as ProviderName };
      const apiKey = config.apiKey;

      if (isMockMode(apiKey)) {
        const mockData = this.getMockResponse(input);
        return {
          agentType: this.name,
          status: 'success',
          data: mockData,
        };
      }

      const provider = createProvider(config.provider, apiKey);

      const messages: ChatMessage[] = [
        { role: 'system', content: this.buildSystemPrompt() },
        { role: 'user', content: this.buildUserPrompt(input) },
      ];

      const options: LLMOptions = {
        model: config.model,
        temperature: config.temperature ?? 0.7,
        maxTokens: 4096,
      };

      const response: LLMResponse = await provider.chat(messages, options);
      const parsed = this.parseResponse(response.content);

      return {
        agentType: this.name,
        status: 'success',
        data: parsed,
        usage: response.usage,
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

  async runWithLog(input: AgentInput): Promise<{ output: AgentOutput; log: AgentRunLog }> {
    const startedAt = new Date().toISOString();
    const startMs = Date.now();

    const output = await this.run(input);

    const finishedAt = new Date().toISOString();
    const durationMs = Date.now() - startMs;

    const log: AgentRunLog = {
      agentType: this.name,
      startedAt,
      finishedAt,
      durationMs,
      status: output.status,
      input: { context: Object.keys(input.context), hasPreview: !!input.previousOutput },
      output: output.status === 'success' ? output.data : null,
      error: output.error,
      usage: output.usage,
    };

    return { output, log };
  }

  protected parseResponse(content: string): Record<string, unknown> {
    // 尝试从 LLM 响应中提取 JSON
    const jsonMatch = content.match(/```json\s*([\s\S]*?)```/);
    const raw = jsonMatch ? jsonMatch[1].trim() : content.trim();

    try {
      return JSON.parse(raw) as Record<string, unknown>;
    } catch {
      // 如果无法解析为 JSON，返回原始文本
      return { rawContent: content };
    }
  }
}
