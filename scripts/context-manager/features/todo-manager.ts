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
      contents: `# todo-current\n\nstatus: ⏳ | ✔ | 🚫 | ❌\nsingle P1 parent only\n\n- [ ] P1: <objective>\n  - [ ] <step>\n`
    }
  ];
  await writeTemplateFiles(targetDir, files, context);
  return {
    success: true,
    details: "TODO templates managed"
  };
};
