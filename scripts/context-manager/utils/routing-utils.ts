import path from "path";
import { RoutingGenerationOptions, RoutingMap, RoutingValidation } from "../types/routing.types";

export const buildRoutingMap = (paths: string[], options: RoutingGenerationOptions): RoutingMap => {
  return paths.reduce<RoutingMap>((acc, current) => {
    const name = path.basename(current);
    acc[name] = {
      path: current,
      template: path.join(options.templateDir, name),
      docPath: path.join(options.docsDir, `path-${name}.md`)
    };
    return acc;
  }, {});
};

export const validateRoutingMap = (map: RoutingMap): RoutingValidation => {
  const missingDocs: string[] = [];
  const missingTemplates: string[] = [];
  Object.values(map).forEach((route) => {
    if (!route.docPath) {
      missingDocs.push(route.path);
    }
    if (!route.template) {
      missingTemplates.push(route.path);
    }
  });
  return { missingDocs, missingTemplates };
};
