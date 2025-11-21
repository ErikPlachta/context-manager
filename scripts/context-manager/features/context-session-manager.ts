import path from "path";
import { FeatureResult } from "../types/feature.types";
import { TemplateRenderContext } from "../types/template.types";
import { writeTemplateFiles } from "../utils/template-writer";

export const manageContextSessions = async (
  targetDir: string,
  context: TemplateRenderContext
): Promise<FeatureResult> => {
  const files = [
    {
      relativePath: path.join(targetDir, "CONTEXT-SESSION.md"),
      contents: "# Context Session\n"
    }
  ];
  await writeTemplateFiles(targetDir, files, context);
  return {
    success: true,
    details: "Context session templates managed"
  };
};
