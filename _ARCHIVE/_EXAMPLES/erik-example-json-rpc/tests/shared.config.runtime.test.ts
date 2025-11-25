import {
  setConfigItem,
  getFullConfig,
  getUserFacingConfig,
} from "@shared/config/runtime";
import type { AgentConfigDefinition } from "@internal-types/agentConfig";

describe("shared/config/runtime helpers", () => {
  test("setConfigItem sets nested value in local overrides by default", () => {
    const local: Record<string, unknown> = {};
    const global: Record<string, unknown> = {};

    setConfigItem(local, global, "a.b.c", 123);

    expect(local).toEqual({ a: { b: { c: 123 } } });
    expect(global).toEqual({});
  });

  test("setConfigItem with env global writes to global overrides", () => {
    const local: Record<string, unknown> = {};
    const global: Record<string, unknown> = {};

    setConfigItem(local, global, "x.y", true, "global");

    expect(local).toEqual({});
    expect(global).toEqual({ x: { y: true } });
  });

  test("setConfigItem with undefined removes value and prunes empty parents", () => {
    const local: Record<string, unknown> = {};
    const global: Record<string, unknown> = {};

    setConfigItem(local, global, "p.q.r", "value");
    // Now delete
    setConfigItem(local, global, "p.q.r", undefined);

    expect(local).toEqual({});
    expect(global).toEqual({});
  });

  test("getFullConfig returns the same object (identity)", () => {
    const cfg = {
      $configId: "test",
      agent: { id: "a", name: "A", version: "1.0.0", description: "desc" },
    } as unknown as AgentConfigDefinition;
    const result = getFullConfig(cfg);
    expect(result).toBe(cfg);
  });

  test("getUserFacingConfig returns userFacing section", () => {
    const cfg = {
      $configId: "test",
      agent: { id: "a", name: "A", version: "1.0.0", description: "desc" },
      userFacing: {
        overview: "Overview",
        capabilities: ["one", "two"],
        examples: [{ input: "Q", output: "A" }],
      },
    } as unknown as AgentConfigDefinition;

    const uf = getUserFacingConfig(cfg);
    expect(uf?.overview).toBe("Overview");
    expect(uf?.capabilities).toEqual(["one", "two"]);
  });
});
