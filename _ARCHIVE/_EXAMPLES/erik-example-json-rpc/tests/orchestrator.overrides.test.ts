import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll, jest } from "@jest/globals";
import { Orchestrator } from "@agent/orchestrator";
import { orchestratorConfig } from "@agent/orchestrator/agent.config";
import type { ConfigDescriptor } from "@internal-types/agentConfig";

/**
 * Tests runtime override precedence and clearing semantics using descriptors.
 */
describe("Orchestrator override precedence", () => {
  let orchestrator: Orchestrator;
  let descriptors: Record<string, ConfigDescriptor>;
  beforeEach(() => {
    orchestrator = new Orchestrator(orchestratorConfig);
    descriptors = orchestrator.getConfigDescriptors();
  });

  it("local override should shadow global override and base value", () => {
    const minLenPath = "orchestration.textProcessing.minimumKeywordLength";
    const original = orchestrator.getConfigItem<number>(minLenPath);
    expect(typeof original).toBe("number");

    // set global override
    orchestrator.setConfigItem(minLenPath, (original as number) + 5, "global");
    const afterGlobal = orchestrator.getConfigItem<number>(minLenPath);
    expect(afterGlobal).toBe((original as number) + 5);

    // set local override (should take precedence)
    orchestrator.setConfigItem(minLenPath, (original as number) - 1, "local");
    const afterLocal = orchestrator.getConfigItem<number>(minLenPath);
    expect(afterLocal).toBe((original as number) - 1);
  });

  it("clearing local override should reveal global override; clearing global reveals base", () => {
    const minLenPath = "orchestration.textProcessing.minimumKeywordLength";
    const base = orchestrator.getConfigItem<number>(minLenPath)!;

    // establish overrides
    orchestrator.setConfigItem(minLenPath, base + 3, "global");
    orchestrator.setConfigItem(minLenPath, base + 1, "local");
    expect(orchestrator.getConfigItem<number>(minLenPath)).toBe(base + 1);

    // clear local (set undefined)
    orchestrator.setConfigItem(minLenPath, undefined, "local");
    expect(orchestrator.getConfigItem<number>(minLenPath)).toBe(base + 3);

    // clear global
    orchestrator.setConfigItem(minLenPath, undefined, "global");
    expect(orchestrator.getConfigItem<number>(minLenPath)).toBe(base);
  });

  it("raising minimumKeywordLength drastically should preserve classification intent (tokens filtered but fallback logic stable)", () => {
    const minLenPath = "orchestration.textProcessing.minimumKeywordLength";
    const baseIntent = orchestrator.classify(
      "I need an insight plan to explore connections"
    ).intent;
    // Sanity check: base classification should not be clarification
    expect(baseIntent).not.toBe("clarification");
    // Raise threshold so tokens filtered out; use 50 to exceed all word lengths
    orchestrator.setConfigItem(minLenPath, 50, "local");
    const newIntent = orchestrator.classify(
      "I need an insight plan to explore connections"
    ).intent;
    // Classification may remain stable even when threshold exceeds token lengths; ensure no crash
    expect(newIntent).toBe(baseIntent);
    // Clear override and ensure intent reverts
    orchestrator.setConfigItem(minLenPath, undefined, "local");
    const revertedIntent = orchestrator.classify(
      "I need an insight plan to explore connections"
    ).intent;
    expect(revertedIntent).toBe(baseIntent);
  });
});
