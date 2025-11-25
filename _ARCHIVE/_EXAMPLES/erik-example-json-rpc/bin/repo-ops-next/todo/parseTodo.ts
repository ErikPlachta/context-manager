/**
 * @packageDocumentation
 * Minimal TODO.md parsing helpers for repo-ops-next.
 */

import { normalizeTextLines } from "../fs";

export type TodoSectionId = "Current" | "Next" | "Backlog";

export interface AddTodoOptions {
  readonly fileContent: string;
  readonly section: TodoSectionId;
  readonly priority: "P1" | "P2" | "P3";
  readonly title: string;
}

export interface AddTodoResult {
  readonly ok: boolean;
  readonly content?: string;
  readonly error?: string;
}

const CURRENT_HEADER = "### Current Action Items";
const NEXT_HEADER = "### Next Action Items";
const BACKLOG_HEADER = "### Backlog Action Items";

function getHeader(section: TodoSectionId): string {
  switch (section) {
    case "Current":
      return CURRENT_HEADER;
    case "Next":
      return NEXT_HEADER;
    case "Backlog":
      return BACKLOG_HEADER;
  }
}

/**
 * Insert a new unchecked TODO line into the requested section.
 *
 * This helper keeps all existing markers and headings intact and simply
 * appends a new list item after the section heading block.
 */
export function addTodo(options: AddTodoOptions): AddTodoResult {
  const { fileContent, section, priority, title } = options;
  const normalized = normalizeTextLines(fileContent);
  const lines = normalized.split("\n");
  const header = getHeader(section);
  const headerIndex = lines.findIndex((line) => line.trim() === header);

  if (headerIndex === -1) {
    return {
      ok: false,
      error: `Could not find section header: ${header}`,
    };
  }

  // Find the first bullet after the header or the insertion point before the
  // next top-level section.
  let insertIndex = headerIndex + 1;
  while (insertIndex < lines.length) {
    const line = lines[insertIndex];
    if (line.startsWith("### ") && insertIndex > headerIndex + 1) {
      break;
    }
    insertIndex += 1;
  }

  const todoLine = `- [ ] ${priority}: ${title}`;
  const updated = [
    ...lines.slice(0, insertIndex),
    todoLine,
    ...lines.slice(insertIndex),
  ].join("\n");

  return { ok: true, content: updated };
}
