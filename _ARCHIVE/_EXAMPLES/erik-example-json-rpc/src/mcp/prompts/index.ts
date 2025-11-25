/**
 * @packageDocumentation index implementation for prompts module
 */

// NOTE: Prompt rendering helpers used by agents for escalation / clarification.

import type { AgentCapabilityMetadata } from "@mcp/config/agentManifest";

/**
 * EscalationPromptOptions interface.
 *
 */
export interface EscalationPromptOptions {
  topic?: string;
  missingSignals?: string[];
  manifest?: AgentCapabilityMetadata | null;
  additionalGuidance?: string;
}

/**
 * Renders an escalation prompt for clarification or routing.
 *
 * @param {EscalationPromptOptions} options - Prompt construction options.
 * @param {string} [options.topic] - Domain or category topic needing clarification.
 * @param {string[]} [options.missingSignals] - Routing signals that were absent and should be highlighted.
 * @param {AgentCapabilityMetadata | null} [options.manifest] - Capability manifest describing agent scope/escalation criteria.
 * @param {string} [options.additionalGuidance] - Extra guidance text appended at end.
 * @returns {string} Markdown-formatted escalation prompt.
 */
export function renderEscalationPrompt({
  topic,
  missingSignals,
  manifest,
  additionalGuidance,
}: EscalationPromptOptions): string {
  const lines: string[] = [];
  if (manifest) {
    lines.push(
      `The ${manifest.title} handles ${manifest.description.toLowerCase()}.`
    );
    if (manifest.escalateWhen.length) {
      lines.push(
        `It usually escalates when ${manifest.escalateWhen
          .map((entry) => entry.toLowerCase())
          .join(", ")}.`
      );
    }
  }
  if (topic) {
    lines.push(`Clarify how this relates to the **${topic}** category.`);
  }
  if (missingSignals?.length) {
    lines.push("Highlight at least one of these routing signals:");
    missingSignals.forEach((signal) => lines.push(`- ${signal}`));
  }
  if (additionalGuidance) {
    lines.push(additionalGuidance);
  }
  return lines.join("\n");
}

/**
 * ClarificationPromptOptions interface.
 *
 */
export interface ClarificationPromptOptions {
  question: string;
  manifest: AgentCapabilityMetadata;
  missingSignals?: string[];
  knowledgeSnippets?: Array<{ source: string; summary: string }>;
}

/**
 * Renders a clarification prompt to solicit more precise user input.
 *
 * @param {ClarificationPromptOptions} options - Prompt construction options.
 * @param {string} options.question - Original user question text.
 * @param {AgentCapabilityMetadata} options.manifest - Capability manifest describing agent scope.
 * @param {string[]} [options.missingSignals] - Signals missing from the question to enumerate.
 * @param {{ source: string; summary: string }[]} [options.knowledgeSnippets] - Optional background knowledge entries.
 * @returns {string} Markdown-formatted clarification prompt.
 */
export function renderClarificationPrompt({
  question,
  manifest,
  missingSignals,
  knowledgeSnippets,
}: ClarificationPromptOptions): string {
  const segments: string[] = [
    `The user asked: "${question.trim()}"`,
    `${manifest.title} focuses on ${manifest.description.toLowerCase()}.`,
  ];
  if (missingSignals?.length) {
    segments.push("Ask them to cover one of these signals:");
    missingSignals.forEach((signal) => segments.push(`- ${signal}`));
  }
  if (knowledgeSnippets?.length) {
    segments.push("Helpful background:");
    knowledgeSnippets.forEach((snippet) => {
      segments.push(`- ${snippet.summary} _(source: ${snippet.source})_`);
    });
  }
  segments.push("Respond with a clarifying question that keeps scope focused.");
  return segments.join("\n");
}

/**
 * ClassificationSummaryOptions interface.
 *
 */
export interface ClassificationSummaryOptions {
  agent: AgentCapabilityMetadata;
  matchedSignals?: string[];
}

/**
 * Renders a concise classification summary for logging or UI display.
 *
 * @param {ClassificationSummaryOptions} options - Summary construction options.
 * @param {AgentCapabilityMetadata} options.agent - Capability metadata for matched agent.
 * @param {string[]} [options.matchedSignals] - Signals that contributed to the match.
 * @returns {string} Summary string with matched signals appended when provided.
 */
export function renderClassificationSummary({
  agent,
  matchedSignals,
}: ClassificationSummaryOptions): string {
  const pieces = [`${agent.title}: ${agent.description}`];
  if (matchedSignals?.length) {
    pieces.push(`Matched signals: ${matchedSignals.join(", ")}`);
  }
  return pieces.join(" | ");
}
