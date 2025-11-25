export interface TemplateFile {
  relativePath: string;
  contents: string;
  permissions?: number;
}

export interface TemplateSource {
  root: string;
  files: TemplateFile[];
}

export interface TemplateCopyOptions {
  overwrite?: boolean;
  preserveTimestamps?: boolean;
}

export interface TemplateRenderContext {
  [key: string]: string | number | boolean | undefined;
}

export interface TemplateManifest {
  name: string;
  version: string;
  source: string;
}
