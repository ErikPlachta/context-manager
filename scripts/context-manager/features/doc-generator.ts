import path from "path";
import { RoutingMap } from "../types/routing.types";
import { FeatureResult } from "../types/feature.types";
import { writeFileSafe } from "../utils/fs-utils";

export const generateDocsForRouting = async (routing: RoutingMap, docsDir: string): Promise<FeatureResult> => {
  await Promise.all(
    Object.values(routing).map(async (route) => {
      const destination = route.docPath || path.join(docsDir, `path-${path.basename(route.path)}.md`);
      await writeFileSafe(destination, "# Auto-generated documentation\n");
    })
  );

  return {
    success: true,
    details: "Documentation placeholders generated"
  };
};
