import { StatusResult } from "../types/feature.types";
import { loadTemplatesFromDirectory } from "../utils/template-loader";

export const checkForDrift = async (templateDir: string, workingDir: string): Promise<StatusResult> => {
  const source = await loadTemplatesFromDirectory(templateDir);
  const working = await loadTemplatesFromDirectory(workingDir);
  const sourcePaths = new Set(source.files.map((file) => file.relativePath));
  const workingPaths = new Set(working.files.map((file) => file.relativePath));

  const extraInWorking = working.files
    .filter((file) => !sourcePaths.has(file.relativePath))
    .map((file) => file.relativePath);

  const missingInWorking = source.files
    .filter((file) => !workingPaths.has(file.relativePath))
    .map((file) => file.relativePath);

  const drifted = [...extraInWorking, ...missingInWorking];

  return {
    success: true,
    details: "Drift evaluation complete",
    drifted
  };
};
