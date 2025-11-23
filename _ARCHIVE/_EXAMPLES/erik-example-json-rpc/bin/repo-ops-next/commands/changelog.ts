/**
 * @packageDocumentation
 * Changelog command wiring for the next-gen repo-ops CLI.
 */
import process from "node:process";
import * as path from "node:path";
import type { FlagValue } from "../flags";
import { deriveBooleanFlags } from "../flags";
import { EXIT_CODES } from "../architecture";
import { writeEntry, writeEntryDryRun } from "../changelog/write";
import { mapChangelog } from "../changelog/map";
import { verifyLatestEntry } from "../changelog/verify";
import { logError } from "../log";

export async function runChangelogCommand(
  subcommand: string | undefined,
  flags: Record<string, FlagValue>
): Promise<number> {
  const { write, validate } = deriveBooleanFlags(flags);
  const override = process.env.REPO_OPS_CHANGELOG_PATH;
  const changelogPath = override
    ? path.isAbsolute(override)
      ? override
      : path.join(process.cwd(), override)
    : path.join(process.cwd(), "CHANGELOG.md");

  if (!subcommand || subcommand === "map") {
    try {
      await mapChangelog(changelogPath);
      return EXIT_CODES.success;
    } catch (error) {
      logError(
        `Failed to map changelog: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
      return EXIT_CODES.ioError;
    }
  }

  if (subcommand === "verify-only") {
    try {
      const result = await verifyLatestEntry({
        changelogPath,
        force: flags.force === true,
      });
      if (!result.updated) {
        if (result.notes?.length) {
          for (const note of result.notes) {
            logError(note);
          }
        }
        return EXIT_CODES.validationError;
      }
      return EXIT_CODES.success;
    } catch (error) {
      logError(
        `Failed to verify latest changelog entry: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
      return EXIT_CODES.ioError;
    }
  }

  if (subcommand === "write") {
    const type = String(flags.type ?? "");
    const summary = String(flags.summary ?? "");
    if (!summary) {
      logError("Missing --summary value for changelog write.");
      return EXIT_CODES.validationError;
    }

    try {
      const entryFlags = {
        type: type || "chore",
        summary,
        context: typeof flags.context === "string" ? flags.context : undefined,
        changes: typeof flags.changes === "string" ? flags.changes : undefined,
        architecture:
          typeof flags.architecture === "string"
            ? flags.architecture
            : undefined,
        filesChanged:
          typeof flags.filesChanged === "string"
            ? flags.filesChanged
            : undefined,
        testing: typeof flags.testing === "string" ? flags.testing : undefined,
        impact: typeof flags.impact === "string" ? flags.impact : undefined,
      };
      const result = await (write
        ? writeEntry({ changelogPath, flags: entryFlags })
        : writeEntryDryRun({ changelogPath, flags: entryFlags }));
      if (!result.ok) {
        if (result.error) {
          logError(result.error);
        }
        return EXIT_CODES.ioError;
      }
      if (!write && validate) {
        // In this minimal port, validate just means dry-run succeeded.
        return EXIT_CODES.success;
      }
      return EXIT_CODES.success;
    } catch (error) {
      logError(
        `Failed to write changelog entry: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
      return EXIT_CODES.ioError;
    }
  }

  logError(`Unknown changelog subcommand: ${subcommand}`);
  return EXIT_CODES.validationError;
}
