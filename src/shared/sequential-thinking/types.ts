/**
 * Sequential Thinking Types
 */

/**
 * Thinking configuration
 */
export interface ThinkingConfig {
  /** Enable extended thinking */
  enabled: boolean;
  /** Budget for thinking tokens */
  budgetTokens?: number;
  /** Maximum thinking depth */
  maxDepth?: number;
}

/**
 * Thinking result
 */
export interface ThinkingResult {
  /** Thinking process */
  thinking?: string;
  /** Final response */
  response: string;
  /** Tokens used for thinking */
  thinkingTokens?: number;
  /** Total tokens used */
  totalTokens?: number;
}

/**
 * Thinking prompt options
 */
export interface ThinkingPromptOptions {
  /** System prompt */
  system?: string;
  /** User prompt */
  prompt: string;
  /** Thinking configuration */
  thinking?: ThinkingConfig;
  /** Model to use */
  model?: string;
  /** Temperature */
  temperature?: number;
  /** Max tokens for response */
  maxTokens?: number;
}
