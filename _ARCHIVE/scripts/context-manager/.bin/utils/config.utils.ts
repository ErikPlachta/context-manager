import path from "path";
import { ContextManagerConfig } from "../../types/config.types";
import {
  ConfigDefaults,
  ConfigUtilityOptions,
  ConfigDefaultFlags,
  ConfigDefaultPaths
} from "../../types/config.defaults.types";
import { configDefaults } from "../configs/config.defaults";

const resolveRoot = (cwd: string, overrides: Partial<ContextManagerConfig>, defaults: ConfigDefaults) => {
  const rootDir = overrides.rootDir ?? defaults.rootDir;
  return path.resolve(cwd, rootDir);
};

const resolveFlags = (
  overrides: Partial<ContextManagerConfig>,
  defaults: ConfigDefaultFlags
) => ({
  dryRun: overrides.flags?.dryRun ?? defaults.dryRun,
  verbose: overrides.flags?.verbose ?? defaults.verbose,
  force: overrides.flags?.force ?? defaults.force,
  interactive: overrides.flags?.interactive ?? defaults.interactive
});

const resolvePaths = (
  rootDir: string,
  overrides: Partial<ContextManagerConfig>,
  defaults: ConfigDefaultPaths
) => {
  const cachePath = overrides.paths?.cache ?? defaults.cache;

  return {
    templates: path.resolve(rootDir, overrides.paths?.templates ?? defaults.templates),
    docs: path.resolve(rootDir, overrides.paths?.docs ?? defaults.docs),
    bin: path.resolve(rootDir, overrides.paths?.bin ?? defaults.bin),
    cache: cachePath ? path.resolve(rootDir, cachePath) : undefined
  };
};

export const buildConfig = (options: ConfigUtilityOptions = {}): ContextManagerConfig => {
  const { cwd = process.cwd(), overrides = {}, defaults = configDefaults } = options;
  const rootDir = resolveRoot(cwd, overrides, defaults);

  return {
    rootDir,
    templateDir: path.resolve(rootDir, overrides.templateDir ?? defaults.templateDir),
    docsDir: path.resolve(rootDir, overrides.docsDir ?? defaults.docsDir),
    paths: resolvePaths(rootDir, overrides, defaults.paths),
    flags: resolveFlags(overrides, defaults.flags)
  };
};

export const loadDefaultConfig = (
  cwd: string = process.cwd(),
  overrides: Partial<ContextManagerConfig> = {}
): ContextManagerConfig => buildConfig({ cwd, overrides });

export const loadConfig = (options: ConfigUtilityOptions = {}): ContextManagerConfig =>
  buildConfig(options);
