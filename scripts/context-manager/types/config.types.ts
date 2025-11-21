export interface ConfigPaths {
  templates: string;
  docs: string;
  bin: string;
  cache?: string;
}

export interface ConfigFlags {
  dryRun?: boolean;
  verbose?: boolean;
  force?: boolean;
  interactive?: boolean;
}

export interface ContextManagerConfig {
  rootDir: string;
  templateDir: string;
  docsDir: string;
  paths: ConfigPaths;
  flags: ConfigFlags;
}

export interface LoadConfigOptions {
  cwd?: string;
  overrides?: Partial<ContextManagerConfig>;
}
