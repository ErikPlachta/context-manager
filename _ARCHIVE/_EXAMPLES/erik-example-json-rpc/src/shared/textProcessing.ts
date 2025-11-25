/**
 * @packageDocumentation Shared text processing utilities for agents
 *
 * Provides reusable text processing functions for keyword extraction, fuzzy matching,
 * and signal scoring used by orchestrator, clarification, and other agents.
 */

/**
 * Configuration options for text processing operations.
 */
export interface TextProcessingConfig {
  /** Set of stop words to exclude from keyword extraction */
  stopWords?: Set<string>;
  /** Minimum keyword length to include (default: 3) */
  minimumKeywordLength?: number;
  /** Fuzzy match threshold 0-1 (default: 0.8) */
  fuzzyMatchThreshold?: number;
  /** Whether to handle plural/singular variations (default: true) */
  handleInflections?: boolean;
}

/**
 * Result of a signal matching operation.
 */
export interface SignalMatchResult {
  /** Signals that matched the input text */
  matched: string[];
  /** Signals that did not match */
  unmatched: string[];
  /** Total match score based on weights */
  score: number;
}

/**
 * Default stop words commonly excluded from keyword analysis.
 */
export const DEFAULT_STOP_WORDS = new Set([
  "the",
  "a",
  "an",
  "and",
  "or",
  "but",
  "in",
  "on",
  "at",
  "to",
  "for",
  "of",
  "with",
  "by",
  "from",
  "as",
  "is",
  "was",
  "are",
  "were",
  "be",
  "been",
  "being",
  "have",
  "has",
  "had",
  "do",
  "does",
  "did",
  "will",
  "would",
  "should",
  "could",
  "may",
  "might",
  "can",
  "this",
  "that",
  "these",
  "those",
  "i",
  "you",
  "he",
  "she",
  "it",
  "we",
  "they",
  "what",
  "which",
  "who",
  "when",
  "where",
  "why",
  "how",
]);

/**
 * Extracts meaningful keywords from text by filtering stop words and applying length constraints.
 *
 * @param {string} text - Source text to extract keywords from
 * @param {TextProcessingConfig} [config] - Optional configuration for extraction behavior
 * @returns {string[]} Array of extracted keyword tokens
 *
 * @example
 * ```typescript
 * const keywords = extractKeywords("Show me all the people", { minimumKeywordLength: 3 });
 * // Returns: ["show", "people"]
 * ```
 */
export function extractKeywords(
  text: string,
  config?: TextProcessingConfig
): string[] {
  const stopWords = config?.stopWords ?? DEFAULT_STOP_WORDS;
  const minLength = config?.minimumKeywordLength ?? 3;

  // Extract tokens matching minimum length requirement
  const pattern = new RegExp(`\\b[a-z0-9]{${minLength},}\\b`, "g");
  const matches = text.toLowerCase().match(pattern) ?? [];

  // Filter out stop words
  return matches.filter((token) => !stopWords.has(token));
}

/**
 * Calculates fuzzy match score between two strings using Levenshtein distance ratio.
 * Score ranges from 0 (no match) to 1 (exact match).
 *
 * @param {string} str1 - First string to compare
 * @param {string} str2 - Second string to compare
 * @returns {number} Similarity score between 0 and 1
 *
 * @example
 * ```typescript
 * const score = fuzzyMatch("people", "person");
 * // Returns: ~0.66 (partial match)
 * ```
 */
export function fuzzyMatch(str1: string, str2: string): number {
  const s1 = str1.toLowerCase();
  const s2 = str2.toLowerCase();

  // Handle empty strings
  if (s1.length === 0 && s2.length === 0) return 1.0;
  if (s1.length === 0 || s2.length === 0) return 0.0;

  // Exact match
  if (s1 === s2) return 1.0;

  // One contains the other
  if (s1.includes(s2) || s2.includes(s1)) {
    return Math.max(s2.length / s1.length, s1.length / s2.length);
  }

  // Levenshtein distance
  const len1 = s1.length;
  const len2 = s2.length;
  const matrix: number[][] = [];

  // Initialize matrix
  for (let i = 0; i <= len1; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= len2; j++) {
    matrix[0][j] = j;
  }

  // Calculate distances
  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      if (s1[i - 1] === s2[j - 1]) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1, // insertion
          matrix[i - 1][j] + 1 // deletion
        );
      }
    }
  }

  const distance = matrix[len1][len2];
  const maxLen = Math.max(len1, len2);
  return 1 - distance / maxLen;
}

/**
 * Scores how well input text matches a set of signals, accounting for inflections.
 *
 * @param {string} text - Input text to match against signals
 * @param {string[]} signals - Array of signal keywords to look for
 * @param {TextProcessingConfig} [config] - Optional configuration for matching behavior
 * @returns {SignalMatchResult} Match results with matched/unmatched signals and total score
 *
 * @example
 * ```typescript
 * const result = scoreSignals(
 *   "Show me all people records",
 *   ["people", "records", "department"],
 *   { handleInflections: true }
 * );
 * // Returns: { matched: ["people", "records"], unmatched: ["department"], score: 2 }
 * ```
 */
export function scoreSignals(
  text: string,
  signals: string[],
  config?: TextProcessingConfig
): SignalMatchResult {
  const textLower = text.toLowerCase();
  const keywords = new Set(extractKeywords(text, config));
  const handleInflections = config?.handleInflections ?? true;

  const matched: string[] = [];
  const unmatched: string[] = [];

  for (const signal of signals) {
    const signalLower = signal.toLowerCase();
    let isMatch = false;

    // Check if signal appears in text
    if (textLower.includes(signalLower)) {
      isMatch = true;
    }
    // Check if signal is in extracted keywords
    else if (keywords.has(signalLower)) {
      isMatch = true;
    }
    // Handle inflections (plural/singular)
    else if (handleInflections) {
      // Check for plural form
      if (keywords.has(signalLower + "s")) {
        isMatch = true;
      }
      // Check for singular form (remove trailing 's')
      else if (
        signalLower.endsWith("s") &&
        keywords.has(signalLower.slice(0, -1))
      ) {
        isMatch = true;
      }
    }

    if (isMatch) {
      matched.push(signal);
    } else {
      unmatched.push(signal);
    }
  }

  return {
    matched,
    unmatched,
    score: matched.length,
  };
}

/**
 * Normalizes text for comparison by lowercasing and removing extra whitespace.
 *
 * @param {string} text - Text to normalize
 * @returns {string} Normalized text
 *
 * @example
 * ```typescript
 * const normalized = normalizeText("  Show ME   the   PEOPLE  ");
 * // Returns: "show me the people"
 * ```
 */
export function normalizeText(text: string): string {
  return text.toLowerCase().trim().replace(/\s+/g, " ");
}

/**
 * Checks if text contains any of the provided phrases (case-insensitive).
 *
 * @param {string} text - Text to search within
 * @param {string[]} phrases - Phrases to look for
 * @returns {boolean} True if any phrase is found
 *
 * @example
 * ```typescript
 * const hasVague = containsAnyPhrase("help me", ["help", "assist", "what"]);
 * // Returns: true
 * ```
 */
export function containsAnyPhrase(text: string, phrases: string[]): boolean {
  const textLower = text.toLowerCase().trim();
  return phrases.some(
    (phrase) =>
      textLower === phrase ||
      textLower.startsWith(phrase + " ") ||
      textLower.endsWith(" " + phrase)
  );
}
