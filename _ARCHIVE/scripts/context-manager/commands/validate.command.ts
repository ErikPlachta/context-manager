import { CommandHandler, CommandResult } from "../types/command.types";
import { loadDefaultConfig } from "../.bin/utils/config.utils";
import { generatePathRouting } from "../features/path-routing-generator";
import { validateStructure } from "../features/structure-validator";

export const validateCommand: CommandHandler = async ({ cwd }): Promise<CommandResult> => {
  const config = loadDefaultConfig(cwd);
  const routingResult = await generatePathRouting({
    baseDir: config.rootDir,
    docsDir: config.docsDir,
    templateDir: config.paths.templates
  });
  const validation = await validateStructure({});
  validation.details = routingResult.details;
  return {
    success: validation.success,
    message: validation.details,
    data: validation
  };
};
