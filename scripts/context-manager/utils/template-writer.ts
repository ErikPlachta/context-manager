import path from "path";
import { TemplateFile, TemplateRenderContext } from "../types/template.types";
import { writeFileSafe, ensureDir } from "./fs-utils";
import { applyReplacements } from "./replace-utils";

export const writeTemplateFiles = async (
  targetDir: string,
  files: TemplateFile[],
  context: TemplateRenderContext = {}
): Promise<void> => {
  await ensureDir(targetDir);
  await Promise.all(
    files.map(async (file) => {
      const rendered = applyReplacements(file.contents, context);
      const destination = path.join(targetDir, file.relativePath);
      await writeFileSafe(destination, rendered);
    })
  );
};
