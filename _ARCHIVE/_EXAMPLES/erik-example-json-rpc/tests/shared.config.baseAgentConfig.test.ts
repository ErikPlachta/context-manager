import { BaseAgentConfig } from "@shared/config/baseAgentConfig";
import type { AgentConfigDefinition } from "@internal-types/agentConfig";
import type { ConfigDescriptor } from "@shared/config/descriptors";

class TestAgent extends BaseAgentConfig {
  constructor(cfg: AgentConfigDefinition) {
    super(cfg);
  }
}

const baseConfig: AgentConfigDefinition = {
  $configId: "test-agent-config@1.0.0",
  agent: {
    id: "test-agent",
    name: "Test Agent",
    version: "1.0.0",
    description: "Test agent for BaseAgentConfig",
  },
  execution: { enableStrictMode: true },
  userFacing: { summary: "Summary", quickstart: ["Do A", "Do B"] },
  applicationFacing: {
    technicalDescription: "Tech",
    capabilities: ["cap-a"],
    performance: { optimizeTemplates: true },
  },
  dataLoader: {
    validation: { enableStrictTypeChecking: true },
    fileOperations: { encoding: "utf-8", maxFileSize: 1000 },
  },
};

describe("BaseAgentConfig (shared)", () => {
  test("reads nested config via path and respects override precedence", () => {
    const agent = new TestAgent(structuredClone(baseConfig));
    // baseline
    expect(
      agent.getConfigItem<string>("dataLoader.fileOperations.encoding")
    ).toBe("utf-8");
    // set global override
    agent.setConfigItem(
      "dataLoader.fileOperations.encoding",
      "latin1",
      "global"
    );
    expect(
      agent.getConfigItem<string>("dataLoader.fileOperations.encoding")
    ).toBe("latin1");
    // set local override (takes precedence over global)
    agent.setConfigItem("dataLoader.fileOperations.encoding", "ascii", "local");
    expect(
      agent.getConfigItem<string>("dataLoader.fileOperations.encoding")
    ).toBe("ascii");
  });

  test("confirmConfigItems reports missing paths", () => {
    const agent = new TestAgent(structuredClone(baseConfig));
    const { passed, missing } = agent.confirmConfigItems([
      "dataLoader.validation.enableStrictTypeChecking",
      "dataLoader.fileOperations.maxFileSize",
      "does.not.exist",
    ]);
    expect(passed).toBe(false);
    expect(missing).toEqual(["does.not.exist"]);
  });

  test("descriptor helpers get/set/verify work", () => {
    const agent = new TestAgent(structuredClone(baseConfig));
    const descriptor: ConfigDescriptor = {
      name: "Encoding",
      path: "dataLoader.fileOperations.encoding",
      type: "string",
      visibility: "public",
      verifyPaths: [
        "dataLoader.validation.enableStrictTypeChecking",
        "dataLoader.fileOperations.encoding",
      ],
    };
    // verify present
    const v1 = agent.verifyDescriptor(descriptor);
    expect(v1.passed).toBe(true);
    expect(v1.missing).toEqual([]);
    // set via descriptor
    agent.setByDescriptor(descriptor, "utf16le", "local");
    expect(agent.getByDescriptor<string>(descriptor)).toBe("utf16le");
    // clear override
    agent.clearOverride(descriptor, "local");
    expect(agent.getByDescriptor<string>(descriptor)).toBe("utf-8");
  });

  test("getConfig returns sanitized snapshot", () => {
    const agent = new TestAgent(structuredClone(baseConfig));
    const snapshot = agent.getConfig();
    expect(snapshot.$configId).toBe(baseConfig.$configId);
    expect(snapshot.agent).toEqual(baseConfig.agent);
    expect(snapshot.userFacing).toEqual(baseConfig.userFacing);
    // ensure we did not leak full internal config object
    // (execution present via dedicated getters, not in sanitized snapshot)
    expect((snapshot as any).dataLoader).toBeUndefined();
    expect((snapshot as any).execution).toBeUndefined();
  });
});
