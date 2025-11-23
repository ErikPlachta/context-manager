import { describe, test, expect, jest, beforeEach } from "@jest/globals";

// Mock @internal-types/configRegistry before importing module under test (ESM)
type MockConfigUtils = {
  isValidConfigId: jest.Mock<boolean, [string]>;
  getMetadata: jest.Mock<any, [string]>;
  areCompatible: jest.Mock<boolean, [string, string]>;
};

const mock: { utils?: MockConfigUtils } = {} as any;

jest.unstable_mockModule("@internal-types/configRegistry", () => {
  const utils: MockConfigUtils = {
    isValidConfigId: jest.fn(() => false),
    getMetadata: jest.fn(() => undefined),
    areCompatible: jest.fn(() => true),
  };
  mock.utils = utils;
  return { ConfigUtils: utils };
});

// Import module under test after mocks are set up
const { validateAgentConfig, validateCompatibility, generateValidationReport } =
  await import("@shared/validation/configValidation");

describe("shared/configValidation coverage", () => {
  beforeEach(() => {
    // reset mock behaviors between tests
    mock.utils!.isValidConfigId.mockReset().mockReturnValue(false);
    mock.utils!.getMetadata.mockReset().mockReturnValue(undefined);
    mock.utils!.areCompatible.mockReset().mockReturnValue(true);
  });

  test("validateAgentConfig: rejects non-object with type error", () => {
    const res = validateAgentConfig(null as unknown as object);
    expect(res.isValid).toBe(false);
    expect(res.errors[0]).toMatchObject({ path: "$root", category: "type" });
  });

  test("validateAgentConfig: missing $configId and agent fields reported", () => {
    const res = validateAgentConfig({});
    const paths = res.errors.map((e) => e.path);
    expect(paths).toContain("$configId");
    expect(paths).toContain("agent");
  });

  test("validateAgentConfig: $configId wrong type and agent field type/schema errors", () => {
    const res = validateAgentConfig({ $configId: 123, agent: {} });
    // $configId type error
    expect(
      res.errors.some((e) => e.path === "$configId" && e.category === "type")
    ).toBe(true);
    // agent required fields
    const agentPaths = res.errors
      .filter((e) => e.path.startsWith("agent."))
      .map((e) => e.path);
    expect(agentPaths).toEqual(
      expect.arrayContaining([
        "agent.id",
        "agent.name",
        "agent.version",
        "agent.description",
      ])
    );
  });

  test("validateAgentConfig: invalid $configId per registry", () => {
    mock.utils!.isValidConfigId.mockReturnValue(false);
    const res = validateAgentConfig({
      $configId: "not.in.registry",
      agent: { id: "a", name: "A", version: "1.0.0", description: "d" },
    });
    expect(
      res.errors.some(
        (e) => e.path === "$configId" && e.message.includes("Invalid")
      )
    ).toBe(true);
  });

  test("validateAgentConfig: orchestrator section validation errors", () => {
    mock.utils!.isValidConfigId.mockReturnValue(true);
    mock.utils!.getMetadata.mockReturnValue({ agentType: "orchestrator" });

    // Missing orchestration section
    let res = validateAgentConfig({
      $configId: "agent.orchestrator.v1.0.0",
      agent: { id: "o", name: "Orch", version: "1.0.0", description: "routes" },
    });
    expect(res.errors.some((e) => e.path === "orchestration")).toBe(true);

    // Missing intents
    res = validateAgentConfig({
      $configId: "agent.orchestrator.v1.0.0",
      agent: { id: "o", name: "Orch", version: "1.0.0", description: "routes" },
      orchestration: {},
    });
    expect(res.errors.some((e) => e.path === "orchestration.intents")).toBe(
      true
    );

    // Intents wrong type (non-object)
    res = validateAgentConfig({
      $configId: "agent.orchestrator.v1.0.0",
      agent: { id: "o", name: "Orch", version: "1.0.0", description: "routes" },
      orchestration: { intents: "oops" as any },
    });
    expect(
      res.errors.some(
        (e) => e.path === "orchestration.intents" && e.category === "type"
      )
    ).toBe(true);

    // textProcessing.stopWords not array and weights type checks
    res = validateAgentConfig({
      $configId: "agent.orchestrator.v1.0.0",
      agent: { id: "o", name: "Orch", version: "1.0.0", description: "routes" },
      orchestration: {
        intents: {},
        textProcessing: {
          stopWords: "nope",
          scoring: {
            weights: {
              exactMatch: "1",
              partialMatch: "2",
              wordOrder: "x",
              frequency: "y",
            },
          },
        },
      },
    });
    const paths = res.errors.map((e) => e.path);
    expect(paths).toContain("textProcessing.stopWords");
    expect(paths).toContain("textProcessing.scoring.weights.exactMatch");
    expect(paths).toContain("textProcessing.scoring.weights.partialMatch");
    expect(paths).toContain("textProcessing.scoring.weights.wordOrder");
    expect(paths).toContain("textProcessing.scoring.weights.frequency");
  });

  test("validateAgentConfig: unknown agent type produces a warning", () => {
    mock.utils!.isValidConfigId.mockReturnValue(true);
    mock.utils!.getMetadata.mockReturnValue({ agentType: "unknown-type" });
    const res = validateAgentConfig({
      $configId: "agent.unknown.v1.0.0",
      agent: { id: "u", name: "U", version: "1.0.0", description: "unknown" },
    });
    expect(
      res.warnings.some((w) => w.message.includes("Unknown agent type"))
    ).toBe(true);
  });

  test("validateAgentConfig: agent.version emits semver warning when non x.y.z", () => {
    const res = validateAgentConfig({
      $configId: "ignored",
      agent: { id: "a", name: "A", version: "1.x", description: "d" },
    });
    expect(res.warnings.some((w) => w.path === "agent.version")).toBe(true);
  });

  test("validateCompatibility: missing IDs yields early error", () => {
    const res = validateCompatibility({} as any, {} as any);
    expect(res.isValid).toBe(false);
    expect(res.errors[0]).toMatchObject({ category: "compatibility" });
  });

  test("validateCompatibility: incompatible versions produce error", () => {
    mock.utils!.areCompatible.mockReturnValue(false);
    const res = validateCompatibility(
      { $configId: "agent.orchestrator.v1.0.0" } as any,
      { $configId: "agent.orchestrator.v2.0.0" } as any
    );
    expect(res.isValid).toBe(false);
    expect(res.errors[0].message).toContain("not compatible");
  });

  test("validateCompatibility: compatible versions pass", () => {
    mock.utils!.areCompatible.mockReturnValue(true);
    const res = validateCompatibility(
      { $configId: "agent.orchestrator.v1.0.0" } as any,
      { $configId: "agent.orchestrator.v1.1.0" } as any
    );
    expect(res.isValid).toBe(true);
    expect(res.errors.length).toBe(0);
  });

  test("generateValidationReport includes expected/actual and sections", () => {
    const report = generateValidationReport({
      isValid: false,
      errors: [
        {
          level: "error",
          category: "schema",
          path: "agent.id",
          message: "Missing required field",
          expected: "string",
          actual: 123,
        },
      ],
      warnings: [
        {
          level: "warning",
          category: "business_rule",
          path: "agent.version",
          message: "Version should follow semantic versioning (x.y.z)",
        },
      ],
    });
    expect(report).toContain("Configuration validation failed");
    expect(report).toContain("Errors:");
    expect(report).toContain("Warnings:");
    expect(report).toContain('Expected: "string"');
    expect(report).toContain("Actual: 123");
  });
});
