import { describe, it, expect } from "@jest/globals";
import * as fs from "fs";
import * as path from "path";

/**
 * Phase 6 enforcement test: ensure no runtime validator implementations remain in src/types/**.
 * Specifically checks that previous validator function names are absent.
 */
describe("Types Purity Enforcement", () => {
  const root = path.resolve(process.cwd(), "src", "types");
  const forbidden = [
    "validateCategoryConfig(",
    "validateCategoryRecord(",
    "validateRelationshipDefinition(",
    "formatValidationErrors(",
    "validateAgentConfig(",
    "validateCompatibility(",
    "generateValidationReport(",
  ];

  it("contains no runtime validator implementations", () => {
    const files: string[] = [];
    const walk = (dir: string) => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) walk(full);
        else if (entry.isFile() && full.endsWith(".ts")) files.push(full);
      }
    };
    walk(root);
    const violations: Array<{ file: string; snippet: string }> = [];
    for (const file of files) {
      const raw = fs.readFileSync(file, "utf8");
      // Strip block and line comments so example snippets do not trigger false positives.
      const content = raw
        .replace(/\/\*[\s\S]*?\*\//g, "")
        .replace(/\/\/.*$/gm, "");
      for (const token of forbidden) {
        if (content.includes(token)) {
          violations.push({ file, snippet: token });
        }
      }
    }
    expect(violations).toHaveLength(0);
    if (violations.length > 0) {
      console.error("Found forbidden runtime validators in types:", violations);
    }
  });
});
