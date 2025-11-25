/**
 * @packageDocumentation
 * Next-gen Repo-ops CLI entrypoint.
 *
 * Fresh, typed CLI for governance automation around TODO, session, and
 * changelog files. Built alongside legacy `bin/repo-ops` to allow a
 * clean migration path.
 */

import process from "node:process";
import { parseFlags, deriveBooleanFlags } from "./flags";
import { getStatus, printStatus } from "./commands/status";
import {
  lintSession,
  printSessionLint,
  rotateSession,
} from "./commands/session";
import { COMMANDS, EXIT_CODES, RepoOpsCommandId } from "./architecture";
import { isDebugEnabled, logDebug, logError, ensureErrorExitCode } from "./log";
import { runChangelogCommand } from "./commands/changelog";
import { runTodoCommand } from "./commands/todo";

/** Supported top-level commands for the next-gen CLI. */
type NextCommand = RepoOpsCommandId;

/** Print a short header. */
function printHeader(): void {
  // Keep output minimal for now; will evolve with design.
  // eslint-disable-next-line no-console
  console.log("Repo-ops Next CLI (scaffold)");
}

/** Print basic help text. */
function printHelp(): void {
  printHeader();
  // eslint-disable-next-line no-console
  console.log("Usage: repo-ops-next <command> [options]\n");
  // eslint-disable-next-line no-console
  console.log("Commands:");
  for (const command of COMMANDS) {
    const label = command.id.padEnd(10, " ");
    // eslint-disable-next-line no-console
    console.log(`  ${label} ${command.description}`);
  }
}

/** Print a placeholder version string. */
function printVersion(): void {
  // eslint-disable-next-line no-console
  console.log("repo-ops-next version 0.0.0-scaffold");
}

/**
 * Main entrypoint for the next-gen repo-ops CLI.
 *
 * The supported commands and their semantics are defined in
 * `architecture.ts` (COMMANDS/RepoOpsCommandId). This function is
 * responsible solely for routing argv to those commands and applying the
 * shared exit-code policy.
 */
export function main(argv: string[] = process.argv.slice(2)): void {
  const { positionals, flags } = parseFlags(argv);
  if (isDebugEnabled(flags)) {
    const { write, validate } = deriveBooleanFlags(flags);
    const derived: Record<string, unknown> = { write, validate };
    logDebug({ argv, positionals, flags, derived });
  }

  const [command, subcommand] = positionals;
  const cmd = (command as NextCommand) || "help";

  switch (cmd) {
    case "help":
      printHelp();
      process.exitCode = EXIT_CODES.success;
      break;
    case "version":
      printVersion();
      process.exitCode = EXIT_CODES.success;
      break;
    case "status":
      printHeader();
      printStatus(getStatus());
      process.exitCode = EXIT_CODES.success;
      break;
    case "session":
      printHeader();
      if (subcommand === "lint" || subcommand === undefined) {
        printSessionLint(lintSession());
        process.exitCode = EXIT_CODES.success;
      } else if (subcommand === "rotate") {
        const result = rotateSession();
        printSessionLint(result);
        process.exitCode = result.ok
          ? EXIT_CODES.success
          : EXIT_CODES.validationError;
      } else {
        logError(`Unknown session subcommand: ${subcommand}`);
        process.exitCode = EXIT_CODES.validationError;
      }
      break;
    case "todo": {
      runTodoCommand(subcommand, flags)
        .then((code) => {
          process.exitCode = code;
          ensureErrorExitCode(EXIT_CODES.unknownError);
        })
        .catch((error: unknown) => {
          logError(
            `Unexpected error in todo command: ${
              error instanceof Error ? error.message : String(error)
            }`
          );
          process.exitCode = EXIT_CODES.unknownError;
          ensureErrorExitCode(EXIT_CODES.unknownError);
        });
      return;
    }
    case "changelog": {
      runChangelogCommand(subcommand, flags)
        .then((code) => {
          process.exitCode = code;
          ensureErrorExitCode(EXIT_CODES.unknownError);
        })
        .catch((error: unknown) => {
          logError(
            `Unexpected error in changelog command: ${
              error instanceof Error ? error.message : String(error)
            }`
          );
          process.exitCode = EXIT_CODES.unknownError;
          ensureErrorExitCode(EXIT_CODES.unknownError);
        });
      return;
    }
    default:
      logError(`Unknown command: ${command ?? "<none>"}`);
      logError("Try: repo-ops-next help");
      process.exitCode = EXIT_CODES.validationError;
  }

  ensureErrorExitCode(EXIT_CODES.unknownError);
}
