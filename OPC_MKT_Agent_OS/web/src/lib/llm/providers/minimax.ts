import OpenAI from 'openai';
import type { LLMProvider, ChatMessage, LLMOptions, LLMResponse } from '../types';

export class MiniMaxProvider implements LLMProvider {
  name = 'minimax' as const;
  private client: OpenAI;

  constructor(apiKey?: string) {
    this.client = new OpenAI({
      apiKey: apiKey || process.env.MINIMAX_API_KEY || '',
      baseURL: 'https://api.minimax.chat/v1',
    });
  }

  async chat(messages: ChatMessage[], options?: LLMOptions): Promise<LLMResponse> {
    const response = await this.client.chat.completions.create({
      model: options?.model ?? 'abab6.5s-chat',
      max_tokens: options?.maxTokens ?? 4096,
      temperature: options?.temperature,
      messages: messages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
    });

    const choice = response.choices[0];

    return {
      content: choice?.message?.content ?? '',
      usage: response.usage
        ? {
            inputTokens: response.usage.prompt_tokens,
            outputTokens: response.usage.completion_tokens ?? 0,
          }
        : undefined,
    };
  }
}
