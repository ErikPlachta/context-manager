import { CommandHandler, CommandResult } from "../types/command.types";
import { loadDefaultConfig } from "../.bin/utils/config.utils";
import { mergeTemplates } from "../features/template-merge";
import { logInfo } from "../utils/logger";

export const syncTemplatesCommand: CommandHandler = async ({ cwd }): Promise<CommandResult> => {
  const config = loadDefaultConfig(cwd);
  const result = await mergeTemplates(config);
  if (result.details) {
    logInfo(result.details);
  }
  return {
    success: result.success,
    message: result.details,
    data: result
  };
};
