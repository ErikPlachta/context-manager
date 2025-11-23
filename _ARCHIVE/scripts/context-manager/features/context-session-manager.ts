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
      contents: `# context\n\nfocus:\n- (3–5 bullets)\n\nplan:\n- micro steps\n\ndone-when:\n- measurable condition\n\nnotes:\n- temporary, purge\n`
    }
  ];
  await writeTemplateFiles(targetDir, files, context);
  return {
    success: true,
    details: "Context session templates managed"
  };
};
