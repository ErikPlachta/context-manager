import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll, jest } from "@jest/globals";
import {
  agentManifest,
  getAgentMetadata,
} from "../src/mcp/config/agentManifest";
import {
  ClarificationAgentProfile,
  DataAgentProfile,
  DatabaseAgentProfile,
  RelevantDataManagerAgentProfile,
} from "../src/mcp/config/agentProfiles";
import { renderEscalationPrompt } from "../src/mcp/prompts";
import { createInvocationLogger, InvocationEvent } from "../src/mcp/telemetry";
import {
  detectDuplicateSchemas,
  validateCategorySchemas,
} from "../src/mcp/schemaUtils";
import { KnowledgeBase } from "../src/mcp/knowledgeBase";
import { ClarificationAgent } from "../src/agent/clarificationAgent";
import type { BusinessCategory } from "../src/agent/userContextAgent";

describe("Shared MCP utilities", () => {
  it("exposes manifest metadata for every agent", () => {
    const manifestEntries = agentManifest;
    expect(Object.keys(manifestEntries)).toEqual(
      expect.arrayContaining([
        RelevantDataManagerAgentProfile.id,
        DatabaseAgentProfile.id,
        DataAgentProfile.id,
        ClarificationAgentProfile.id,
      ])
    );
    const metadata = getAgentMetadata(DatabaseAgentProfile.id);
    expect(metadata.description).toMatch(/structured queries/i);
    expect(metadata.dependsOn).toContain(RelevantDataManagerAgentProfile.id);
  });

  it("builds escalation prompts using manifest phrasing", () => {
    const manifest = getAgentMetadata(ClarificationAgentProfile.id);
    const prompt = renderEscalationPrompt({
      topic: "people",
      manifest,
      missingSignals: ["include relationship context"],
      additionalGuidance: "Share the access level you expect.",
    });
    expect(prompt).toContain("Clarification Agent");
    expect(prompt).toContain("people");
    expect(prompt).toContain("relationship context");
    expect(prompt).toContain("access level");
  });

  it("emits telemetry for success and failure", async () => {
    const events: InvocationEvent[] = [];
    const logger = { log: (event: InvocationEvent) => events.push(event) };
    const wrap = createInvocationLogger("test-agent", logger);
    const result = await wrap("success", async () => "ok", { input: 1 });
    expect(result).toBe("ok");
    await expect(
      wrap("failure", async () => {
        throw new Error("boom");
      })
    ).rejects.toThrow("boom");
    expect(events).toHaveLength(2);
    expect(events[0]).toMatchObject({
      status: "success",
      operation: "success",
    });
    expect(events[1]).toMatchObject({ status: "error", operation: "failure" });
    expect(events[1].error?.message).toBe("boom");
  });

  it("detects schema duplicates and missing relationships", () => {
    const category: BusinessCategory = {
      id: "category-a",
      name: "Category A",
      description: "A",
      aliases: [],
      config: {
        purpose: "",
        primaryKeys: ["id"],
        updateCadence: "",
        access: "",
        folder: {
          root: "",
          configFile: "",
          schemaFiles: [],
          typeFiles: [],
          examplesDir: "",
          queriesDir: "",
        },
        relationships: [
          {
            name: "links",
            targetCategory: "category-b",
            viaField: "id",
            cardinality: "one",
            description: "",
          },
        ],
        orchestration: {
          summary: "",
          signals: [],
          agents: {
            relevantDataManager: { focus: "", signals: [], promptStarters: [] },
            databaseAgent: { focus: "", signals: [], promptStarters: [] },
            dataAgent: { focus: "", signals: [], promptStarters: [] },
          },
        },
      },
      schemas: [
        { name: "Record", description: "", schema: {} },
        { name: "record", description: "", schema: {} },
      ],
      types: [],
      examples: [],
      queries: [],
      records: [],
      validation: { checkedAt: "", status: "pass", issues: [] },
    };
    const summary = validateCategorySchemas([category]);
    expect(summary.duplicateSchemaNames).toContain("record");
    expect(summary.missingRelationships[0].relationship.targetCategory).toBe(
      "category-b"
    );
    const duplicates = detectDuplicateSchemas(category.schemas);
    expect(duplicates).toContain("record");
  });

  it("queries the knowledge base for relevant snippets", () => {
    const knowledge = new KnowledgeBase();
    knowledge.indexDocuments([
      {
        id: "1",
        title: "Schema guide",
        content: "Schema relationships for departments.",
      },
      { id: "2", title: "Runbooks", content: "Operational steps." },
    ]);
    const hits = knowledge.query("departments schema", 1);
    expect(hits).toHaveLength(1);
    expect(hits[0].title).toBe("Schema guide");
    expect(hits[0].summary.length).toBeGreaterThan(0);
  });

  it("uses clarification agent to craft follow-up prompts", async () => {
    const agent = new ClarificationAgent();
    agent.loadKnowledge([
      {
        id: "kb",
        title: "Metadata",
        content: "Schemas describe fields and relationships.",
      },
    ]);
    const response = await agent.clarify({
      question: "Need schema details",
      topic: "people",
      missingSignals: ["include schema names"],
      candidateAgents: [RelevantDataManagerAgentProfile.id],
    });
    expect(response.prompt).toContain("Relevant Data Manager");
    expect(response.knowledgeSnippets[0].title).toBe("Metadata");
  });
});
