import path from "path";
import { CommandHandler, CommandResult } from "../types/command.types";
import { loadDefaultConfig } from "../.bin/utils/config.utils";
import { generatePathRouting } from "../features/path-routing-generator";

export const generatePathCommand: CommandHandler = async ({ cwd }): Promise<CommandResult> => {
  const config = loadDefaultConfig(cwd);
  const result = await generatePathRouting({
    baseDir: config.rootDir,
    docsDir: config.docsDir,
    templateDir: path.resolve(config.paths.templates)
  });
  return {
    success: result.success,
    message: result.details,
    data: result
  };
};
