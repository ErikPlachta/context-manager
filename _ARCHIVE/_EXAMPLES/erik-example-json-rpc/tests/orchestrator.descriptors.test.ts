import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll, jest } from "@jest/globals";
import { Orchestrator } from "@agent/orchestrator";
import { orchestratorConfig } from "@agent/orchestrator/agent.config";
import type { ConfigDescriptor } from "@internal-types/agentConfig";

describe("Orchestrator descriptor map", () => {
  const orchestrator = new Orchestrator(orchestratorConfig);
  const descriptors: Record<string, ConfigDescriptor> =
    orchestrator.getConfigDescriptors();

  it("should expose non-empty descriptor collection", () => {
    expect(Object.keys(descriptors).length).toBeGreaterThan(0);
  });

  it("all descriptor verify paths should resolve", () => {
    for (const [key, desc] of Object.entries(descriptors)) {
      const { passed, missing } = orchestrator.verifyDescriptor(desc);
      expect(passed).toBe(true);
      if (!passed) {
        // Provide granular debug info on failure
        // eslint-disable-next-line no-console
        console.error("Descriptor missing paths", { key, missing });
      }
    }
  });

  it("getByDescriptor should return same value as direct getConfigItem", () => {
    Object.values(descriptors).forEach((desc) => {
      const viaDescriptor = orchestrator.getByDescriptor(desc);
      const direct = orchestrator.getConfigItem(desc.path);
      expect(viaDescriptor).toEqual(direct);
    });
  });

  it("should throw when required nested leaf is missing during construction", () => {
    const cloned = JSON.parse(JSON.stringify(orchestratorConfig));
    delete cloned.orchestration.textProcessing.scoringWeights.signalMatch;
    expect(() => new Orchestrator(cloned)).toThrow(
      /scoringWeights.signalMatch/
    );
  });

  it("setByDescriptor should mutate nested object and getByDescriptor should reflect change", () => {
    const desc = descriptors.scoringWeights;
    const original =
      orchestrator.getByDescriptor<Record<string, number>>(desc)!;
    const updated = { ...original, signalMatch: original.signalMatch + 1 };
    orchestrator.setByDescriptor(desc, updated, "local");
    const roundTrip =
      orchestrator.getByDescriptor<Record<string, number>>(desc)!;
    expect(roundTrip).toEqual(updated);
    // Reset by clearing local override
    orchestrator.setByDescriptor(desc, undefined, "local");
    const reverted =
      orchestrator.getByDescriptor<Record<string, number>>(desc)!;
    expect(reverted).toEqual(original);
  });

  it("should support enhanced descriptor properties", () => {
    const vaguePhrases = descriptors.vaguePhrases;
    expect(vaguePhrases).toBeDefined();
    expect(vaguePhrases.group).toBe("Escalation");
    expect(vaguePhrases.description).toBe(
      "List of phrases that trigger escalation to fallback agent"
    );
    expect(typeof vaguePhrases.validate).toBe("function");
  });

  it("should validate descriptor values correctly", () => {
    const vaguePhrases = descriptors.vaguePhrases;
    if (vaguePhrases.validate) {
      // Valid array of strings
      expect(vaguePhrases.validate(["help", "what", "how"])).toBe(true);
      // Invalid: not an array
      expect(vaguePhrases.validate("not an array")).toBe("Must be an array");
      // Invalid: array with non-string items
      expect(vaguePhrases.validate(["help", 123])).toBe(
        "All items must be strings"
      );
    }
  });

  it("should support clearOverride method", () => {
    const desc = descriptors.vaguePhrases;
    const original = orchestrator.getByDescriptor<string[]>(desc)!;

    // Set an override
    orchestrator.setByDescriptor(desc, ["test"], "local");
    expect(orchestrator.getByDescriptor<string[]>(desc)).toEqual(["test"]);

    // Clear the override
    orchestrator.clearOverride(desc, "local");
    expect(orchestrator.getByDescriptor<string[]>(desc)).toEqual(original);
  });

  it("should support getAllDescriptors method", () => {
    const allDescriptors = orchestrator.getAllDescriptors();
    const currentDescriptors = orchestrator.getConfigDescriptors();

    // Verify it returns the same object structure
    expect(Object.keys(allDescriptors)).toEqual(
      Object.keys(currentDescriptors)
    );
    expect(Object.keys(allDescriptors).length).toBeGreaterThan(0);

    // Verify each descriptor has the expected properties
    for (const [key, descriptor] of Object.entries(allDescriptors)) {
      expect(descriptor).toHaveProperty("name");
      expect(descriptor).toHaveProperty("path");
      expect(descriptor).toHaveProperty("type");
      expect(descriptor).toHaveProperty("verifyPaths");
      expect(descriptor).toHaveProperty("visibility");
      expect((descriptor as ConfigDescriptor).name).toBe(
        currentDescriptors[key].name
      );
      expect((descriptor as ConfigDescriptor).path).toBe(
        currentDescriptors[key].path
      );
    }
  });
});
