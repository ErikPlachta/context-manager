import { CommandHandler, CommandResult } from "../types/command.types";
import { loadDefaultConfig } from "../.bin/configs/config.default";
import { resetTemplates } from "../features/template-reset";

export const resetCommand: CommandHandler = async ({ cwd }): Promise<CommandResult> => {
  const config = loadDefaultConfig(cwd);
  const result = await resetTemplates(config);
  return {
    success: result.success,
    message: result.details,
    data: result
  };
};
