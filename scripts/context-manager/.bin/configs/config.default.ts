import path from "path";
import { ContextManagerConfig, LoadConfigOptions } from "../../types/config.types";
import { defaultPaths } from "./config.paths";
import { defaultFlags } from "./config.flags";

export const loadDefaultConfig = (
  cwd: string = process.cwd(),
  overrides: Partial<ContextManagerConfig> = {}
): ContextManagerConfig => {
  const resolvedPaths = defaultPaths(cwd);
  const baseConfig: ContextManagerConfig = {
    rootDir: cwd,
    templateDir: path.join(cwd, ".github"),
    docsDir: path.join(cwd, ".docs"),
    paths: resolvedPaths,
    flags: defaultFlags()
  };

  return {
    ...baseConfig,
    ...overrides,
    paths: overrides.paths ?? baseConfig.paths,
    flags: overrides.flags ?? baseConfig.flags
  };
};

export const loadConfig = (options: LoadConfigOptions = {}): ContextManagerConfig =>
  loadDefaultConfig(options.cwd ?? process.cwd(), options.overrides);
