import path from "path";
import { ConfigPaths } from "../../types/config.types";

export const defaultPaths = (root: string): ConfigPaths => ({
  templates: path.join(root, ".bin/templates"),
  docs: path.join(root, ".docs"),
  bin: path.join(root, ".bin")
});
