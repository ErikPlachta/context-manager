import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll, jest } from "@jest/globals";
import { promises as fs } from "fs";
import * as os from "os";
import * as path from "path";
import {
  storeSharedCacheEntry,
  readSharedCacheEntry,
  listSharedCacheEntries,
  deleteSharedCacheEntry,
  logInvocation,
} from "../src/extension/mcpCache";

jest.mock(
  "vscode",
  () => ({
    workspace: {
      get workspaceFolders() {
        return undefined;
      },
    },
  }),
  { virtual: true }
);

describe("mcpCache helpers", () => {
  let cacheDir: string;
  let sharedDir: string;

  beforeEach(async () => {
    cacheDir = await fs.mkdtemp(path.join(os.tmpdir(), "mcp-cache-extra-"));
    sharedDir = path.join(cacheDir, "shared");
    await fs.mkdir(sharedDir, { recursive: true });
  });

  it("stores, reads, lists, and deletes shared cache entries", async () => {
    const entry = {
      key: "employees.query",
      toolName: "test-tool",
      timestamp: new Date().toISOString(),
      value: [{ id: "1" }],
      metadata: { version: "1" },
    };

    await storeSharedCacheEntry(cacheDir, entry);

    const readBack = await readSharedCacheEntry<typeof entry.value>(
      cacheDir,
      entry.key
    );
    expect(readBack?.value).toEqual(entry.value);
    expect(readBack?.metadata).toEqual(entry.metadata);

    const entries = await listSharedCacheEntries(cacheDir);
    expect(entries.map((item) => item.key)).toContain(entry.key);

    await deleteSharedCacheEntry(cacheDir, entry.key);
    const afterDelete = await readSharedCacheEntry(cacheDir, entry.key);
    expect(afterDelete).toBeUndefined();
  });

  it("handles missing entries and ignores non-json files", async () => {
    await fs.writeFile(path.join(sharedDir, "ignore.txt"), "noop", "utf8");

    const missing = await readSharedCacheEntry(cacheDir, "missing");
    expect(missing).toBeUndefined();

    const entries = await listSharedCacheEntries(cacheDir);
    expect(entries).toEqual([]);

    await expect(
      deleteSharedCacheEntry(cacheDir, "missing")
    ).resolves.toBeUndefined();
  });

  it("logs invocations to jsonl file", async () => {
    const logPath = path.join(cacheDir, "invocations.jsonl");
    await logInvocation(cacheDir, {
      timestamp: new Date().toISOString(),
      toolName: "test",
      args: { id: "1" },
      context: ["sample"],
      response: { ok: true },
    });

    const raw = await fs.readFile(logPath, "utf8");
    expect(raw.trim().length).toBeGreaterThan(0);
    const parsed = raw
      .trim()
      .split("\n")
      .map((line) => JSON.parse(line));
    expect(parsed[0].toolName).toBe("test");
  });
});
