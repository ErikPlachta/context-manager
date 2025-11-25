import { getTools } from "@server/index";
import { listCategorySummariesBridge } from "@server/orchestratorBridge";
import { jest } from "@jest/globals";
import * as path from "path";

// Ensure dataset discovery resolves to built-in source dataset during tests
process.env.VSCODE_TEMPLATE_DATA_ROOT = path.join(
  process.cwd(),
  "src",
  "userContext"
);

// Mock vscode workspace to satisfy cache directory resolution in createAgents
let workspaceFoldersMock: any[] | undefined;
jest.mock(
  "vscode",
  () => ({
    workspace: {
      get workspaceFolders() {
        return workspaceFoldersMock;
      },
    },
  }),
  { virtual: true }
);

/**
 * Dynamic tools registry tests ensure descriptors derive from live category metadata.
 */
describe("dynamic tools registry", () => {
  it("includes all known category ids in describe tool description", async () => {
    let summaries;
    try {
      summaries = await listCategorySummariesBridge();
    } catch (e) {
      // Surface initialization failure for debugging
      // eslint-disable-next-line no-console
      console.error("listCategorySummariesBridge error", e);
      throw e;
    }
    const categories = summaries.map((s: { id: string }) => s.id);
    expect(categories.length).toBeGreaterThan(0);

    const tools = await getTools();
    const describeTool = tools.find(
      (t: { name: string }) => t.name === "user-context.describeCategory"
    );
    expect(describeTool).toBeDefined();
    for (const id of categories) {
      expect(describeTool!.description).toContain(id);
    }
  });

  it("contains at least one category id in search tool description", async () => {
    let summaries;
    try {
      summaries = await listCategorySummariesBridge();
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error("listCategorySummariesBridge error", e);
      throw e;
    }
    const categories = summaries.map((s: { id: string }) => s.id);

    const tools = await getTools();
    const searchTool = tools.find(
      (t: { name: string; description: string }) =>
        t.name === "user-context.searchRecords"
    );
    expect(searchTool).toBeDefined();
    const matched = categories.filter((id: string) =>
      searchTool!.description.includes(id)
    );
    expect(matched.length).toBeGreaterThan(0);
  });
});
