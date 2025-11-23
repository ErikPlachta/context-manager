import { ContextManagerConfig } from "../types/config.types";
import { SyncTemplatesResult } from "../types/feature.types";
import { loadTemplatesFromDirectory } from "../utils/template-loader";
import { writeTemplateFiles } from "../utils/template-writer";

export const mergeTemplates = async (config: ContextManagerConfig): Promise<SyncTemplatesResult> => {
  const source = await loadTemplatesFromDirectory(config.templateDir);
  await writeTemplateFiles(config.paths.templates, source.files, {});
  return {
    success: true,
    details: "Templates synchronized",
    updatedFiles: source.files.map((file) => file.relativePath)
  };
};
