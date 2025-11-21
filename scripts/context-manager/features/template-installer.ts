import path from "path";
import { ContextManagerConfig } from "../types/config.types";
import { InstallTemplatesResult } from "../types/feature.types";
import { loadTemplatesFromDirectory } from "../utils/template-loader";
import { writeTemplateFiles } from "../utils/template-writer";

export const installTemplates = async (config: ContextManagerConfig): Promise<InstallTemplatesResult> => {
  const sourceDir = path.resolve(config.rootDir, ".github");
  const templates = await loadTemplatesFromDirectory(sourceDir);
  await writeTemplateFiles(path.resolve(config.rootDir, config.paths.templates), templates.files, {});
  return {
    success: true,
    details: "Templates installed from .github",
    templateCount: templates.files.length
  };
};
