import { StatusResult } from "../types/feature.types";
import { loadTemplatesFromDirectory } from "../utils/template-loader";

export const checkForDrift = async (templateDir: string, workingDir: string): Promise<StatusResult> => {
  const source = await loadTemplatesFromDirectory(templateDir);
  const working = await loadTemplatesFromDirectory(workingDir);
  const drifted = working.files
    .filter((file) => !source.files.find((ref) => ref.relativePath === file.relativePath))
    .map((file) => file.relativePath);

  return {
    success: true,
    details: "Drift evaluation complete",
    drifted
  };
};
