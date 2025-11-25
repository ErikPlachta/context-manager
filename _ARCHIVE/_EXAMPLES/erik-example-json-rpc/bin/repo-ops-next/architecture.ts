/**
 * @packageDocumentation
 * High-level architecture descriptors for the next-gen repo-ops CLI.
 *
 * This module is the single source of truth for:
 * - Which governance files are managed (TODO, CONTEXT-SESSION, CHANGELOG)
 * - Which commands exist and whether they may write
 * - Normalized exit-code policy shared across commands
 */

export type ManagedFileId = "todo" | "contextSession" | "changelog";

export interface ManagedFileDescriptor {
  id: ManagedFileId;
  path: string;
  description: string;
  /** Whether this file is expected to be edited only via logs/append flows. */
  logsOnly: boolean;
}

export const MANAGED_FILES: ManagedFileDescriptor[] = [
  {
    id: "todo",
    path: "TODO.md",
    description:
      "Single source of truth for outstanding tasks (Current/Next/Backlog).",
    logsOnly: false,
  },
  {
    id: "contextSession",
    path: "CONTEXT-SESSION.md",
    description:
      "Session notes and focus alignment with TODO.md and CHANGELOG.md.",
    logsOnly: false,
  },
  {
    id: "changelog",
    path: "CHANGELOG.md",
    description:
      "Chronological log of changes with verification blocks (logs-only).",
    logsOnly: true,
  },
];

export type RepoOpsCommandId =
  | "help"
  | "version"
  | "status"
  | "session"
  | "todo"
  | "changelog";

export interface CommandDescriptor {
  id: RepoOpsCommandId;
  description: string;
  /**
   * When true, the command may mutate files and must respect backup
   * expectations via shared helpers (e.g., writeWithBackup).
   */
  mayWrite: boolean;
}

export const COMMANDS: CommandDescriptor[] = [
  { id: "help", description: "Show CLI help.", mayWrite: false },
  { id: "version", description: "Show CLI version.", mayWrite: false },
  {
    id: "status",
    description: "Summarize presence/health of core governance files.",
    mayWrite: false,
  },
  {
    id: "session",
    description:
      "Session commands (e.g., lint, rotate) for CONTEXT-SESSION.md.",
    mayWrite: false,
  },
  {
    id: "todo",
    description:
      "TODO management commands (add/update, enforce sections/priorities).",
    mayWrite: true,
  },
  {
    id: "changelog",
    description:
      "Changelog commands (scaffold/write/verify) using logs-only, backup-aware flows.",
    mayWrite: true,
  },
];

export interface ExitCodePolicy {
  success: number;
  validationError: number;
  ioError: number;
  unknownError: number;
}

/**
 * Normalized exit-code policy for repo-ops-next.
 */
export const EXIT_CODES: ExitCodePolicy = {
  success: 0,
  validationError: 2,
  ioError: 3,
  unknownError: 1,
};
