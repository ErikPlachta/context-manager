import path from "path";
import { listDirectory, readFileSafe } from "./fs-utils";
import { TemplateFile, TemplateSource } from "../types/template.types";

export const loadTemplatesFromDirectory = async (templateDir: string): Promise<TemplateSource> => {
  const entries = await listDirectory(templateDir);
  const files: TemplateFile[] = await Promise.all(
    entries.map(async (entry) => {
      const fullPath = path.join(templateDir, entry);
      const contents = await readFileSafe(fullPath);
      return {
        relativePath: entry,
        contents
      };
    })
  );

  return {
    root: templateDir,
    files
  };
};
