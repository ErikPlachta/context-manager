import * as fs from "node:fs";
import * as path from "node:path";
import { writeWithBackup } from "../bin/repo-ops-next/fs";

const TEMP_DIR = path.join(process.cwd(), "tests_tmp_writeWithBackup");

function ensureTempDir(): void {
  if (!fs.existsSync(TEMP_DIR)) {
    fs.mkdirSync(TEMP_DIR, { recursive: true });
  }
}

function cleanupTempDir(): void {
  if (fs.existsSync(TEMP_DIR)) {
    fs.rmSync(TEMP_DIR, { recursive: true, force: true });
  }
}

describe("writeWithBackup", () => {
  beforeEach(() => {
    cleanupTempDir();
    ensureTempDir();
  });

  afterAll(() => {
    cleanupTempDir();
  });

  it("writes a new file without creating a backup when none exists", () => {
    const relativePath = "sample.txt";

    const result = writeWithBackup({
      cwd: TEMP_DIR,
      relativePath,
      content: "hello world",
    });

    const fullPath = path.join(TEMP_DIR, relativePath);

    expect(result.ok).toBe(true);
    expect(result.writtenPath).toBe(fullPath);
    expect(result.backupPath).toBeUndefined();
    expect(fs.readFileSync(fullPath, "utf8")).toBe("hello world");
  });

  it("creates a backup when overwriting an existing file", () => {
    const relativePath = "sample.txt";
    const fullPath = path.join(TEMP_DIR, relativePath);
    fs.writeFileSync(fullPath, "original", "utf8");

    const result = writeWithBackup({
      cwd: TEMP_DIR,
      relativePath,
      content: "updated",
    });

    expect(result.ok).toBe(true);
    expect(result.writtenPath).toBe(fullPath);
    expect(result.backupPath).toBeDefined();

    const backupPath = result.backupPath as string;
    expect(fs.existsSync(backupPath)).toBe(true);
    expect(fs.readFileSync(backupPath, "utf8")).toBe("original");
    expect(fs.readFileSync(fullPath, "utf8")).toBe("updated");
  });
});
