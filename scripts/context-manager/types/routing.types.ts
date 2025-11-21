export interface PathRoute {
  path: string;
  template?: string;
  docPath?: string;
  description?: string;
}

export type RoutingMap = Record<string, PathRoute>;

export interface RoutingGenerationOptions {
  baseDir: string;
  docsDir: string;
  templateDir: string;
}

export interface RoutingValidation {
  missingDocs: string[];
  missingTemplates: string[];
}
