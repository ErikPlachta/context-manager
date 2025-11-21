import { loadConfig, loadDefaultConfig } from "./.bin/configs/config.default";
import { installTemplates as installTemplatesFeature } from "./features/template-installer";
import { generatePathRouting } from "./features/path-routing-generator";
import { generateDocsForRouting } from "./features/doc-generator";
import { validateStructure as validateStructureFeature } from "./features/structure-validator";
import { checkForDrift } from "./features/drift-checker";
import { resetTemplates } from "./features/template-reset";
import { RoutingGenerationOptions } from "./types/routing.types";
import { ContextManagerConfig } from "./types/config.types";

export const loadConfigApi = loadConfig;
export const loadDefaultConfigApi = loadDefaultConfig;

export const installTemplates = (config: ContextManagerConfig) => installTemplatesFeature(config);

export const generatePathDocs = async (options: RoutingGenerationOptions) => {
  const routingResult = await generatePathRouting(options);
  if (routingResult.payload) {
    await generateDocsForRouting(routingResult.payload, options.docsDir);
  }
  return routingResult;
};

export const validateStructure = validateStructureFeature;

export const getStatus = (templateDir: string, workingDir: string) =>
  checkForDrift(templateDir, workingDir);

export const resetContext = (config: ContextManagerConfig) => resetTemplates(config);
