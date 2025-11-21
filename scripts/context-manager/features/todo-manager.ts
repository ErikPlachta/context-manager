import path from "path";
import { FeatureResult } from "../types/feature.types";
import { TemplateRenderContext } from "../types/template.types";
import { writeTemplateFiles } from "../utils/template-writer";

export const manageTodoTemplates = async (
  targetDir: string,
  context: TemplateRenderContext
): Promise<FeatureResult> => {
  const files = [
    {
      relativePath: path.join(targetDir, "TODO.md"),
      contents: "# TODO\n"
    }
  ];
  await writeTemplateFiles(targetDir, files, context);
  return {
    success: true,
    details: "TODO templates managed"
  };
};
