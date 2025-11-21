import { CommandHandler, CommandResult } from "../types/command.types";
import { loadDefaultConfig } from "../.bin/configs/config.default";
import { installTemplates } from "../features/template-installer";
import { logInfo } from "../utils/logger";

export const initCommand: CommandHandler = async ({ cwd }): Promise<CommandResult> => {
  const config = loadDefaultConfig(cwd);
  const result = await installTemplates(config);
  if (result.details) {
    logInfo(result.details);
  }
  return {
    success: result.success,
    message: result.details,
    data: result
  };
};
