import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll, jest } from "@jest/globals";
import { loadApplicationConfig } from "../src/shared/configurationLoader";

/**
 * Basic tests for the ConfigurationLoader preferring TypeScript application config.
 */
describe("ConfigurationLoader / application.config.ts integration", () => {
  test("loads typed application config without falling back to legacy JSON", async () => {
    const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
    const config = await loadApplicationConfig();
    expect(config.application.name).toMatch(
      /VSCode MCP Extension Configuration File/
    );
    expect(config.typescript.include).toContain("src/**/*.ts");
    // Ensure no deprecation warning fired
    expect(warnSpy).not.toHaveBeenCalled();
    warnSpy.mockRestore();
  });
});
