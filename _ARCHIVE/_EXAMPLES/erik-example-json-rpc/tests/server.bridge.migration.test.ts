import {
  describeCategoryBridge,
  searchCategoryRecordsBridge,
} from "../src/server/orchestratorBridge.js";
import * as path from "path";
import { fileURLToPath } from "url";

/**
 * @packageDocumentation Tests ensuring server transport delegates resolution to bridge/agents.
 */

describe("server bridge migration", () => {
  beforeAll(() => {
    const here = path.dirname(fileURLToPath(import.meta.url));
    process.env.VSCODE_TEMPLATE_DATA_ROOT = path.resolve(
      here,
      "..",
      "src",
      "userContext"
    );
  });

  test("describeCategoryBridge unknown category enumerates available categories", async () => {
    const result = await describeCategoryBridge("__unknown_category__");
    expect(result.message).toMatch(/Available categories/i);
  });

  test("searchCategoryRecordsBridge unknown category enumerates available categories", async () => {
    const result = await searchCategoryRecordsBridge(
      "__unknown_category__",
      {}
    );
    expect(result.message).toMatch(/Available categories/i);
  });
});
