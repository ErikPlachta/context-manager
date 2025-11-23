import path from "path";
import { listDirectory } from "./fs-utils";

export const scanTopLevelPaths = async (root: string): Promise<string[]> => {
  const entries = await listDirectory(root);
  return entries.map((entry) => path.join(root, entry));
};
