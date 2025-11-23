import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll, jest } from "@jest/globals";

/**
 * @fileoverview Tests for shared text processing utilities
 */

import {
  extractKeywords,
  fuzzyMatch,
  scoreSignals,
  normalizeText,
  containsAnyPhrase,
  DEFAULT_STOP_WORDS,
  type TextProcessingConfig,
} from "../src/shared/textProcessing";

describe("extractKeywords", () => {
  it("extracts keywords with default stop words", () => {
    const result = extractKeywords("Show me the people in department");
    expect(result).toEqual(["show", "people", "department"]);
  });

  it("respects minimum keyword length", () => {
    const result = extractKeywords("I am ok", { minimumKeywordLength: 3 });
    expect(result).toEqual([]); // "am" and "ok" are < 3 chars
  });

  it("filters custom stop words", () => {
    const config: TextProcessingConfig = {
      stopWords: new Set(["custom", "stop"]),
      minimumKeywordLength: 2,
    };
    const result = extractKeywords("custom words stop here", config);
    expect(result).toEqual(["words", "here"]);
  });

  it("handles empty strings", () => {
    const result = extractKeywords("");
    expect(result).toEqual([]);
  });

  it("handles strings with only stop words", () => {
    const result = extractKeywords("the and or but");
    expect(result).toEqual([]);
  });

  it("extracts alphanumeric keywords", () => {
    const result = extractKeywords("Find user123 and item456");
    expect(result).toEqual(["find", "user123", "item456"]);
  });

  it("lowercases all keywords", () => {
    const result = extractKeywords("PEOPLE Department RECORDS");
    expect(result).toEqual(["people", "department", "records"]);
  });
});

describe("fuzzyMatch", () => {
  it("returns 1.0 for exact matches", () => {
    expect(fuzzyMatch("people", "people")).toBe(1.0);
  });

  it("returns high score for substring matches", () => {
    const score = fuzzyMatch("people", "peopl");
    expect(score).toBeGreaterThan(0.8);
  });

  it("returns moderate score for similar strings", () => {
    const score = fuzzyMatch("people", "person");
    // "people" vs "person" have 4 different chars, similarity ~0.33
    expect(score).toBeGreaterThan(0.3);
    expect(score).toBeLessThan(0.5);
  });

  it("returns low score for very different strings", () => {
    const score = fuzzyMatch("people", "xyz");
    expect(score).toBeLessThan(0.3);
  });

  it("is case-insensitive", () => {
    expect(fuzzyMatch("PEOPLE", "people")).toBe(1.0);
  });

  it("handles empty strings", () => {
    const score = fuzzyMatch("", "test");
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(1);
  });

  it("calculates Levenshtein-based similarity", () => {
    // "kitten" -> "sitting" requires 3 edits out of 7 chars max
    const score = fuzzyMatch("kitten", "sitting");
    expect(score).toBeCloseTo(1 - 3 / 7, 2);
  });
});

describe("scoreSignals", () => {
  it("matches signals in text", () => {
    const result = scoreSignals("Show me all people records", [
      "people",
      "records",
      "department",
    ]);
    expect(result.matched).toEqual(["people", "records"]);
    expect(result.unmatched).toEqual(["department"]);
    expect(result.score).toBe(2);
  });

  it("handles plural/singular inflections", () => {
    const result = scoreSignals("Show me people", ["person"]);
    // "people" should NOT match "person" with inflection logic
    expect(result.matched).toEqual([]);
    expect(result.unmatched).toEqual(["person"]);

    // But "record" should match "records"
    const result2 = scoreSignals("Show me records", ["record"], {
      handleInflections: true,
    });
    expect(result2.matched).toEqual(["record"]);
  });

  it("disables inflection handling when configured", () => {
    // When inflections disabled, "records" will still match "record" if it appears in text
    const result = scoreSignals("Show me records", ["record"], {
      handleInflections: false,
    });
    // "record" signal appears in "records" text, so it matches via text.includes()
    expect(result.matched).toEqual(["record"]);
    expect(result.unmatched).toEqual([]);
  });

  it("detects signals in extracted keywords", () => {
    const result = scoreSignals("find people", ["people", "department"], {
      minimumKeywordLength: 3,
    });
    expect(result.matched).toEqual(["people"]);
    expect(result.score).toBe(1);
  });

  it("handles empty signal array", () => {
    const result = scoreSignals("some text", []);
    expect(result.matched).toEqual([]);
    expect(result.unmatched).toEqual([]);
    expect(result.score).toBe(0);
  });

  it("handles empty text", () => {
    const result = scoreSignals("", ["people", "records"]);
    expect(result.matched).toEqual([]);
    expect(result.unmatched).toEqual(["people", "records"]);
    expect(result.score).toBe(0);
  });

  it("is case-insensitive", () => {
    const result = scoreSignals("SHOW ME PEOPLE", ["People", "RECORDS"]);
    expect(result.matched).toEqual(["People"]);
    expect(result.unmatched).toEqual(["RECORDS"]);
  });

  it("matches signals with 's' suffix inflection", () => {
    const result = scoreSignals("Show me records", ["record"], {
      handleInflections: true,
    });
    expect(result.matched).toEqual(["record"]);
  });
});

describe("normalizeText", () => {
  it("lowercases text", () => {
    expect(normalizeText("HELLO World")).toBe("hello world");
  });

  it("trims whitespace", () => {
    expect(normalizeText("  hello  ")).toBe("hello");
  });

  it("collapses multiple spaces", () => {
    expect(normalizeText("hello    world")).toBe("hello world");
  });

  it("handles empty strings", () => {
    expect(normalizeText("")).toBe("");
  });

  it("handles strings with only whitespace", () => {
    expect(normalizeText("   ")).toBe("");
  });

  it("handles tabs and newlines", () => {
    expect(normalizeText("hello\t\nworld")).toBe("hello world");
  });
});

describe("containsAnyPhrase", () => {
  it("matches exact phrase", () => {
    expect(containsAnyPhrase("help", ["help", "assist"])).toBe(true);
  });

  it("matches phrase at start", () => {
    expect(containsAnyPhrase("help me", ["help", "assist"])).toBe(true);
  });

  it("matches phrase at end", () => {
    expect(containsAnyPhrase("need help", ["help", "assist"])).toBe(true);
  });

  it("does not match phrase in middle", () => {
    expect(containsAnyPhrase("I need help please", ["help"])).toBe(false);
  });

  it("is case-insensitive", () => {
    expect(containsAnyPhrase("HELP", ["help"])).toBe(true);
  });

  it("handles empty phrase array", () => {
    expect(containsAnyPhrase("some text", [])).toBe(false);
  });

  it("handles empty text", () => {
    expect(containsAnyPhrase("", ["help"])).toBe(false);
  });

  it("matches any of multiple phrases", () => {
    expect(containsAnyPhrase("assist me", ["help", "assist", "what"])).toBe(
      true
    );
  });

  it("trims text before matching", () => {
    expect(containsAnyPhrase("  help  ", ["help"])).toBe(true);
  });
});

describe("DEFAULT_STOP_WORDS", () => {
  it("includes common English stop words", () => {
    expect(DEFAULT_STOP_WORDS.has("the")).toBe(true);
    expect(DEFAULT_STOP_WORDS.has("and")).toBe(true);
    expect(DEFAULT_STOP_WORDS.has("or")).toBe(true);
  });

  it("does not include non-stop words", () => {
    expect(DEFAULT_STOP_WORDS.has("people")).toBe(false);
    expect(DEFAULT_STOP_WORDS.has("department")).toBe(false);
  });
});
