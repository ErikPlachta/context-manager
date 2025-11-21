#!/usr/bin/env node
import { initCommand } from "./commands/init.command";
import { syncTemplatesCommand } from "./commands/sync-templates.command";
import { generatePathCommand } from "./commands/generate-path.command";
import { validateCommand } from "./commands/validate.command";
import { statusCommand } from "./commands/status.command";
import { resetCommand } from "./commands/reset.command";
import { CommandHandler } from "./types/command.types";
import { logError, logInfo } from "./utils/logger";

const commandMap: Record<string, CommandHandler> = {
  init: initCommand,
  sync: syncTemplatesCommand,
  "generate-path": generatePathCommand,
  validate: validateCommand,
  status: statusCommand,
  reset: resetCommand
};

const parseFlags = (args: string[]): Record<string, string | boolean> => {
  return args
    .filter((arg) => arg.startsWith("--"))
    .reduce<Record<string, string | boolean>>((acc, arg) => {
      const [flag, value] = arg.replace(/^--/, "").split("=");
      acc[flag] = value ?? true;
      return acc;
    }, {});
};

const run = async (): Promise<void> => {
  const [, , commandName, ...rest] = process.argv;
  const handler = commandMap[commandName ?? ""];

  if (!handler) {
    logError(`Unknown command: ${commandName ?? ""}`);
    process.exitCode = 1;
    return;
  }

  const flags = parseFlags(rest);
  const args = rest.filter((arg) => !arg.startsWith("--"));
  const result = await handler({ cwd: process.cwd(), args, flags });

  if (result.message) {
    logInfo(result.message);
  }

  if (!result.success) {
    process.exitCode = 1;
  }
};

run().catch((error) => {
  logError(String(error));
  process.exitCode = 1;
});
