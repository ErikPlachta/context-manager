/**
 * @packageDocumentation
 * TODO command wiring for the next-gen repo-ops CLI.
 */

import process from "node:process";
import * as fs from "node:fs";
import * as path from "node:path";
import type { FlagValue } from "../flags";
import { EXIT_CODES } from "../architecture";
import { readFileSafe, writeWithBackup } from "../fs";
import { addTodo } from "../todo/parseTodo";
import { logError } from "../log";

export async function runTodoCommand(
  subcommand: string | undefined,
  flags: Record<string, FlagValue>
): Promise<number> {
  const cwd = process.cwd();
  const todoPath = path.join(cwd, "TODO.md");

  if (!subcommand || subcommand === "add") {
    const sectionFlag = String(flags.section ?? "Current");
    const priorityFlag = String(flags.priority ?? "P2");
    const titleFlag = String(flags.title ?? "");

    if (!titleFlag) {
      logError("Missing --title value for todo add.");
      return EXIT_CODES.validationError;
    }

    const section =
      sectionFlag === "Next" || sectionFlag === "Backlog"
        ? sectionFlag
        : "Current";
    const priority =
      priorityFlag === "P1" || priorityFlag === "P3" ? priorityFlag : "P2";

    const read = readFileSafe(cwd, "TODO.md");
    if (!read.ok || !read.content) {
      logError(read.error ?? "Failed to read TODO.md");
      return EXIT_CODES.ioError;
    }

    const added = addTodo({
      fileContent: read.content,
      section,
      priority,
      title: titleFlag,
    });

    if (!added.ok || !added.content) {
      logError(added.error ?? "Failed to update TODO content.");
      return EXIT_CODES.validationError;
    }

    const result = writeWithBackup({
      cwd,
      relativePath: path.relative(cwd, todoPath),
      content: added.content,
      backupsDir: ".repo-ops-backups",
    });

    if (!result.ok) {
      logError(result.error ?? "Failed to write updated TODO.md");
      return EXIT_CODES.ioError;
    }

    return EXIT_CODES.success;
  }

  logError(`Unknown todo subcommand: ${subcommand}`);
  return EXIT_CODES.validationError;
}
