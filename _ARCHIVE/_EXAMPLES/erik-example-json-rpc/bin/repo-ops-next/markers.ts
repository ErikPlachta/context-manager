/**
 * @packageDocumentation
 * Centralized marker and section configuration for repo-ops-next.
 */

export interface MarkerDescriptor {
  id: string;
  label: string;
  value: string;
}

export const CONTEXT_SESSION_MARKERS: MarkerDescriptor[] = [
  {
    id: "currentFocusSummary",
    label: "Current Focus Summary",
    value: "<!-- BEGIN:CURRENT-FOCUS-SUMMARY -->",
  },
  {
    id: "currentFocusDetail",
    label: "Current Focus Detail",
    value: "<!-- BEGIN:CURRENT-FOCUS-DETAIL -->",
  },
  {
    id: "llmThinkingNotes",
    label: "LLM Thinking Notes Area",
    value: "<!-- BEGIN:CONTEXT-SESSION-LLM-THINKING-NOTES-AREA -->",
  },
];
