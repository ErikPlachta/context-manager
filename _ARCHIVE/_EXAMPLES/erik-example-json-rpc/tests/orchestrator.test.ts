import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll, jest } from "@jest/globals";
import { Orchestrator } from "../src/agent/orchestrator";

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

describe("Orchestrator", () => {
  beforeEach(() => {
    workspaceFoldersMock = undefined;
  });

  it("classifies metadata, record, and insight intents", () => {
    const orchestrator = new Orchestrator();
    const metadata = orchestrator.classify("Show schemas for departments", {
      topic: "departments",
    });
    const records = orchestrator.classify("List people with python skills", {
      topic: "people",
    });
    const insight = orchestrator.classify("Create an exploration plan", {
      topic: "departments",
    });
    expect(metadata.intent).toBe("metadata");
    expect(metadata.matchedSignals).toBeDefined();
    expect(records.intent).toBe("records");
    expect(records.matchedSignals).toBeDefined();
    expect(insight.intent).toBe("insight");
    expect(insight.matchedSignals).toBeDefined();
  });

  it("routes metadata questions to the manager", async () => {
    const orchestrator = new Orchestrator();
    const response = await orchestrator.handle({
      topic: "departments",
      question: "Which schemas describe departments?",
    });
    expect(response.agent).toBe("relevant-data-manager");
    expect(response.intent).toBe("metadata");
    expect(response.summary).toMatch(/departments/i);
    const payload = response.payload as Record<string, unknown>;
    expect(payload).toHaveProperty("guidance");
    expect(payload).toHaveProperty("matchedSignals");
  });

  it("routes record lookups through the database agent", async () => {
    const orchestrator = new Orchestrator();
    const response = await orchestrator.handle({
      topic: "people",
      question: "List people with python skills",
      criteria: { skill: "python" },
    });
    expect(response.agent).toBe("database-agent");
    expect(response.intent).toBe("records");
    expect(response.summary).toMatch(/people/i);
    const payload = response.payload as Record<string, unknown>;
    expect(payload).toHaveProperty("connections");
    expect(payload).toHaveProperty("guidance");
  });

  it("produces exploration plans via the data agent", async () => {
    const orchestrator = new Orchestrator();
    const response = await orchestrator.handle({
      topic: "departments",
      question: "Create an exploration plan for the analytics team",
    });
    expect(response.agent).toBe("data-agent");
    expect(response.intent).toBe("insight");
    const payload = response.payload as Record<string, unknown>;
    expect(payload).toHaveProperty("plan");
    expect((payload.plan as { steps: unknown[] }).steps).toBeDefined();
    expect(payload).toHaveProperty("overview");
    expect(payload).toHaveProperty("guidance");
  });

  it("surfaces escalation guidance when unable to classify", () => {
    const orchestrator = new Orchestrator();
    const classification = orchestrator.classify("Tell me more", {
      topic: "people",
    });
    expect(classification.intent).toBe("clarification");
    expect(classification.escalationPrompt).toBeDefined();
    expect(classification.missingSignals).toBeDefined();
  });

  it("asks for clarification when topic is missing", async () => {
    const orchestrator = new Orchestrator();
    const response = await orchestrator.handle({
      question: "List records",
    });
    expect(response.intent).toBe("clarification");
    expect(response.agent).toBe("clarification-agent");
    expect((response.payload as { prompt: string }).prompt).toMatch(/clarify/i);
  });
});
