import { ValidateStructureResult } from "../types/feature.types";
import { RoutingMap } from "../types/routing.types";
import { validateRoutingMap } from "../utils/routing-utils";

export const validateStructure = async (routing: RoutingMap): Promise<ValidateStructureResult> => {
  const validation = validateRoutingMap(routing);
  const missing = [...validation.missingDocs, ...validation.missingTemplates];
  return {
    success: missing.length === 0,
    details: missing.length === 0 ? "Structure is valid" : "Missing required files",
    missing
  };
};
