/**
 * Vercel AI SDK Wrapper Types
 */

/**
 * AI model provider
 */
export type AIProvider = 'anthropic' | 'openai' | 'custom';

/**
 * AI model configuration
 */
export interface AIModelConfig {
  /** Provider */
  provider: AIProvider;
  /** Model name */
  model: string;
  /** API key */
  apiKey?: string;
  /** Base URL for custom providers */
  baseURL?: string;
  /** Default temperature */
  temperature?: number;
  /** Default max tokens */
  maxTokens?: number;
}

/**
 * AI prompt options
 */
export interface AIPromptOptions {
  /** System prompt */
  system?: string;
  /** User prompt */
  prompt: string;
  /** Temperature override */
  temperature?: number;
  /** Max tokens override */
  maxTokens?: number;
  /** Stream response */
  stream?: boolean;
}

/**
 * AI response
 */
export interface AIResponse {
  /** Response text */
  text: string;
  /** Finish reason */
  finishReason?: string;
  /** Usage stats */
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

/**
 * AI stream chunk
 */
export interface AIStreamChunk {
  /** Chunk text */
  text: string;
  /** Is final chunk */
  final: boolean;
}
