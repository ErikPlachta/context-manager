import { ContextManagerConfig } from "./config.types";

export interface ConfigDefaultPaths {
  templates: string;
  docs: string;
  bin: string;
  cache?: string;
}

export interface ConfigDefaultFlags {
  dryRun: boolean;
  verbose: boolean;
  force: boolean;
  interactive: boolean;
}

export interface ConfigDefaults {
  rootDir: string;
  templateDir: string;
  docsDir: string;
  paths: ConfigDefaultPaths;
  flags: ConfigDefaultFlags;
}

export interface ConfigUtilityOptions {
  cwd?: string;
  overrides?: Partial<ContextManagerConfig>;
  defaults?: ConfigDefaults;
}
