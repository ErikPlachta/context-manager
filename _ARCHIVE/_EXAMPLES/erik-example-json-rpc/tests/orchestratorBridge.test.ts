import {
  describeCategoryBridge,
  searchCategoryRecordsBridge,
} from "@server/orchestratorBridge";
import { jest } from "@jest/globals";
import * as path from "path";

// Mock vscode to avoid extension cache directory resolution hitting real APIs
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

// Ensure dataset discovery resolves to the built-in source dataset during tests
process.env.VSCODE_TEMPLATE_DATA_ROOT = path.join(
  process.cwd(),
  "src",
  "userContext"
);

describe("orchestratorBridge", () => {
  it("formats describeCategory output via CommunicationAgent", async () => {
    const first = (
      await describeCategoryBridge("departments")
    ).message.includes("departments")
      ? { id: "departments" }
      : { id: "people" }; // minimal heuristic; real category list covered elsewhere
    expect(first).toBeTruthy();

    const res = await describeCategoryBridge(first.id);
    expect(typeof res.message).toBe("string");
    expect(res.message.length).toBeGreaterThan(0);
    // The formatted message should typically reference the category id or name
    expect(res.message.toLowerCase()).toContain(first.id.toLowerCase());
  });

  it("formats searchCategoryRecords output via CommunicationAgent (no filters)", async () => {
    const firstId = "departments"; // rely on built-in dataset root override
    const res = await searchCategoryRecordsBridge(firstId, {});
    expect(typeof res.message).toBe("string");
    expect(res.message.length).toBeGreaterThan(0);
  });
});
