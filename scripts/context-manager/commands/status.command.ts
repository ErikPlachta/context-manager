import { CommandHandler, CommandResult } from "../types/command.types";
import { loadDefaultConfig } from "../.bin/configs/config.default";
import { checkForDrift } from "../features/drift-checker";

export const statusCommand: CommandHandler = async ({ cwd }): Promise<CommandResult> => {
  const config = loadDefaultConfig(cwd);
  const result = await checkForDrift(config.templateDir, config.paths.templates);
  return {
    success: result.success,
    message: result.details,
    data: result
  };
};
