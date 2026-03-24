export type ProviderName = 'claude' | 'openai' | 'gemini' | 'deepseek' | 'minimax' | 'glm';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LLMOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface LLMResponse {
  content: string;
  usage?: { inputTokens: number; outputTokens: number };
}

export interface LLMProvider {
  name: ProviderName;
  chat(messages: ChatMessage[], options?: LLMOptions): Promise<LLMResponse>;
}
