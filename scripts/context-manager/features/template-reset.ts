import { ContextManagerConfig } from "../types/config.types";
import { ResetResult } from "../types/feature.types";
import { loadTemplatesFromDirectory } from "../utils/template-loader";
import { writeTemplateFiles } from "../utils/template-writer";

export const resetTemplates = async (config: ContextManagerConfig): Promise<ResetResult> => {
  const source = await loadTemplatesFromDirectory(config.templateDir);
  await writeTemplateFiles(config.paths.templates, source.files, {});
  return {
    success: true,
    details: "Templates reset to source state",
    resetFiles: source.files.map((file) => file.relativePath)
  };
};
