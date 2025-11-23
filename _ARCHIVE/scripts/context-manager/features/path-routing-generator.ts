import { RoutingGenerationOptions, RoutingMap } from "../types/routing.types";
import { GeneratePathDocsResult } from "../types/feature.types";
import { scanTopLevelPaths } from "../utils/path-scanner";
import { buildRoutingMap } from "../utils/routing-utils";

export const generatePathRouting = async (options: RoutingGenerationOptions): Promise<GeneratePathDocsResult> => {
  const paths = await scanTopLevelPaths(options.baseDir);
  const routing: RoutingMap = buildRoutingMap(paths, options);
  return {
    success: true,
    details: "Routing generated",
    routes: Object.keys(routing),
    payload: routing
  };
};
