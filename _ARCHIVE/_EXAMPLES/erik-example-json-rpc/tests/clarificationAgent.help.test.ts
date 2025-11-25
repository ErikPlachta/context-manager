import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll, jest } from "@jest/globals";

/**
 * @packageDocumentation Tests for ClarificationAgent help system functionality.
 */

import { ClarificationAgent } from "../src/agent/clarificationAgent";
import { listAgentCapabilities } from "../src/mcp/config/agentManifest";
import type { AgentConfigDefinition } from "../src/types/agentConfig";
import { clarificationAgentConfig } from "../src/agent/clarificationAgent/agent.config";

/**
 * Helper to create test config with helpSystem overrides
 */
function createTestConfig(
  helpSystemOverrides: Record<string, unknown>
): AgentConfigDefinition {
  return {
    ...clarificationAgentConfig,
    clarification: {
      ...clarificationAgentConfig.clarification!,
      guidance: {
        ...clarificationAgentConfig.clarification!.guidance,
        helpSystem: {
          enabled: true,
          listAgentCapabilities: true,
          includeExampleQueries: true,
          maxExamplesPerAgent: 3,
          ...helpSystemOverrides,
        },
      },
    },
  };
}

describe("ClarificationAgent Help System", () => {
  describe("provideHelp() basic functionality", () => {
    it("returns formatted help content by default", () => {
      const agent = new ClarificationAgent();
      const help = agent.provideHelp();

      expect(help).toContain("# Available Capabilities");
      expect(help).toContain("I can assist you with the following tasks");
      expect(help).toContain("---");
    });

    it("includes all agent capabilities when listAgentCapabilities is true", () => {
      const agent = new ClarificationAgent();
      const help = agent.provideHelp();
      const capabilities = listAgentCapabilities();

      for (const capability of capabilities) {
        expect(help).toContain(capability.title);
        expect(help).toContain(capability.description);
      }
    });

    it("includes primary signals for each capability", () => {
      const agent = new ClarificationAgent();
      const help = agent.provideHelp();

      expect(help).toContain("**Key signals**:");
    });

    it("includes example queries by default", () => {
      const agent = new ClarificationAgent();
      const help = agent.provideHelp();

      expect(help).toContain("**Example queries**:");
      expect(help).toContain("Show me");
    });

    it("respects maxExamplesPerAgent configuration", () => {
      const config = createTestConfig({ maxExamplesPerAgent: 1 });
      const agent = new ClarificationAgent(config);
      const help = agent.provideHelp();

      // Count example query lines (should be limited)
      const exampleLines = help.match(/- "Show me/g);
      const capabilities = listAgentCapabilities().filter(
        (c) => c.primarySignals.length > 0
      );

      // Each capability should have at most 1 example
      expect(exampleLines?.length).toBeLessThanOrEqual(capabilities.length);
    });
  });

  describe("provideHelp() configuration options", () => {
    it("returns disabled message when helpSystem.enabled is false", () => {
      const config = createTestConfig({ enabled: false });
      const agent = new ClarificationAgent(config);
      const help = agent.provideHelp();

      expect(help).toBe("Help system is currently disabled.");
    });

    it("omits capability list when listAgentCapabilities is false", () => {
      const config = createTestConfig({ listAgentCapabilities: false });
      const agent = new ClarificationAgent(config);
      const help = agent.provideHelp();

      expect(help).toContain("# Available Capabilities");
      expect(help).not.toContain("Orchestrator");
      expect(help).not.toContain("Database Query");
    });

    it("omits examples when includeExampleQueries is false", () => {
      const config = createTestConfig({ includeExampleQueries: false });
      const agent = new ClarificationAgent(config);
      const help = agent.provideHelp();

      expect(help).not.toContain("**Example queries**:");
      expect(help).not.toContain("Show me");
    });

    it("uses default values when helpSystem config is omitted", () => {
      const config: AgentConfigDefinition = {
        ...clarificationAgentConfig,
        clarification: {
          ...clarificationAgentConfig.clarification!,
          guidance: {
            ...clarificationAgentConfig.clarification!.guidance,
            // No helpSystem field
          },
        },
      };

      const agent = new ClarificationAgent(config);
      const help = agent.provideHelp();

      // Should use defaults: enabled=true, listCapabilities=true, includeExamples=true
      expect(help).toContain("# Available Capabilities");
      expect(help).toContain("**Key signals**:");
      expect(help).toContain("**Example queries**:");
    });
  });

  describe("provideHelp() content quality", () => {
    it("generates valid markdown structure", () => {
      const agent = new ClarificationAgent();
      const help = agent.provideHelp();

      // Check for markdown headings
      expect(help).toMatch(/^# /m);
      expect(help).toMatch(/^## /m);

      // Check for markdown lists
      expect(help).toMatch(/^- /m);

      // Check for markdown bold
      expect(help).toMatch(/\*\*[^*]+\*\*/);

      // Check for horizontal rule
      expect(help).toContain("---");
    });

    it("includes closing guidance at the end", () => {
      const agent = new ClarificationAgent();
      const help = agent.provideHelp();

      expect(help).toContain(
        "Ask me questions using natural language, and I'll route your request"
      );
    });

    it("formats signals as comma-separated list", () => {
      const agent = new ClarificationAgent();
      const help = agent.provideHelp();

      // Find a signals line
      const signalsMatch = help.match(/\*\*Key signals\*\*: (.+)/);
      expect(signalsMatch).toBeTruthy();

      if (signalsMatch) {
        const signalsList = signalsMatch[1];
        // Should contain commas if multiple signals
        const capabilities = listAgentCapabilities();
        const hasMultipleSignals = capabilities.some(
          (c) => c.primarySignals.length > 1
        );

        if (hasMultipleSignals) {
          expect(signalsList).toContain(",");
        }
      }
    });

    it("generates example queries that follow consistent pattern", () => {
      const agent = new ClarificationAgent();
      const help = agent.provideHelp();

      const exampleMatches = help.matchAll(/- "([^"]+)"/g);
      const examples = Array.from(exampleMatches).map((m) => m[1]);

      expect(examples.length).toBeGreaterThan(0);

      // All examples should start with "Show me"
      for (const example of examples) {
        expect(example).toMatch(/^Show me /);
      }
    });
  });

  describe("provideHelp() integration with agent manifest", () => {
    it("includes all agent capabilities from manifest", () => {
      const agent = new ClarificationAgent();
      const help = agent.provideHelp();
      const capabilities = listAgentCapabilities();

      expect(capabilities.length).toBeGreaterThan(0);

      for (const capability of capabilities) {
        expect(help).toContain(capability.title);
      }
    });

    it("respects agent capability structure", () => {
      const agent = new ClarificationAgent();
      const help = agent.provideHelp();
      const capabilities = listAgentCapabilities();

      for (const capability of capabilities) {
        // Each capability should have required fields
        expect(capability.id).toBeTruthy();
        expect(capability.title).toBeTruthy();
        expect(capability.description).toBeTruthy();
        expect(Array.isArray(capability.primarySignals)).toBe(true);

        // Help should include these fields
        expect(help).toContain(capability.title);
        expect(help).toContain(capability.description);
      }
    });

    it("handles capabilities with no signals gracefully", () => {
      const agent = new ClarificationAgent();
      const help = agent.provideHelp();
      const capabilities = listAgentCapabilities();

      const noSignalsCaps = capabilities.filter(
        (c) => c.primarySignals.length === 0
      );

      for (const capability of noSignalsCaps) {
        // Should still include title and description
        expect(help).toContain(capability.title);
        expect(help).toContain(capability.description);
      }
    });
  });

  describe("provideHelp() edge cases", () => {
    it("handles maxExamplesPerAgent of 0", () => {
      const config = createTestConfig({ maxExamplesPerAgent: 0 });
      const agent = new ClarificationAgent(config);
      const help = agent.provideHelp();

      // Should not crash, but no examples shown
      expect(help).toContain("# Available Capabilities");
      const exampleLines = help.match(/- "Show me/g);
      expect(exampleLines).toBeNull();
    });

    it("handles very large maxExamplesPerAgent gracefully", () => {
      const config = createTestConfig({ maxExamplesPerAgent: 9999 });
      const agent = new ClarificationAgent(config);
      const help = agent.provideHelp();

      // Should not crash; examples capped by actual signal count
      expect(help).toContain("# Available Capabilities");
      expect(help).toContain("**Example queries**:");
    });

    it("returns consistent output across multiple calls", () => {
      const agent = new ClarificationAgent();

      const help1 = agent.provideHelp();
      const help2 = agent.provideHelp();

      expect(help1).toBe(help2);
    });
  });

  describe("provideHelp() vs clarify() method coexistence", () => {
    it("does not interfere with existing clarify() functionality", async () => {
      const agent = new ClarificationAgent();

      agent.loadKnowledge([
        {
          id: "kb1",
          title: "Test Doc",
          content: "Test content for clarification.",
        },
      ]);

      // Call provideHelp first
      const help = agent.provideHelp();
      expect(help).toContain("# Available Capabilities");

      // Then call clarify - should work normally
      const response = await agent.clarify({
        question: "What is the status?",
        topic: "status",
        missingSignals: ["specify timeframe"],
        candidateAgents: ["database-agent"],
      });

      expect(response.prompt).toBeTruthy();
      expect(typeof response.prompt).toBe("string");
    });

    it("allows interleaved calls to provideHelp() and clarify()", async () => {
      const agent = new ClarificationAgent();

      agent.loadKnowledge([
        {
          id: "kb1",
          title: "Guide",
          content: "Guidance content.",
        },
      ]);

      const help1 = agent.provideHelp();
      const clarifyResponse1 = await agent.clarify({
        question: "Need info",
        topic: "data",
        missingSignals: [],
        candidateAgents: ["data-agent"],
      });
      const help2 = agent.provideHelp();

      // All should work correctly
      expect(help1).toContain("# Available Capabilities");
      expect(clarifyResponse1.prompt).toBeTruthy();
      expect(help2).toBe(help1); // Should be consistent
    });
  });

  describe("clarify() help detection and delegation", () => {
    it("detects 'help' keyword and delegates to provideHelp()", async () => {
      const agent = new ClarificationAgent();

      const response = await agent.clarify({
        question: "help",
        topic: "",
        missingSignals: [],
        candidateAgents: [],
      });

      expect(response.prompt).toContain("# Available Capabilities");
      expect(response.knowledgeSnippets).toEqual([]);
    });

    it("detects 'Help' with different casing", async () => {
      const agent = new ClarificationAgent();

      const response = await agent.clarify({
        question: "Help",
        topic: "",
        missingSignals: [],
        candidateAgents: [],
      });

      expect(response.prompt).toContain("# Available Capabilities");
    });

    it("detects 'help ' with trailing space", async () => {
      const agent = new ClarificationAgent();

      const response = await agent.clarify({
        question: "help me",
        topic: "",
        missingSignals: [],
        candidateAgents: [],
      });

      expect(response.prompt).toContain("# Available Capabilities");
    });

    it("detects 'what can you do' as help request", async () => {
      const agent = new ClarificationAgent();

      const response = await agent.clarify({
        question: "what can you do",
        topic: "",
        missingSignals: [],
        candidateAgents: [],
      });

      expect(response.prompt).toContain("# Available Capabilities");
    });

    it("detects 'what are your capabilities' as help request", async () => {
      const agent = new ClarificationAgent();

      const response = await agent.clarify({
        question: "what are your capabilities",
        topic: "",
        missingSignals: [],
        candidateAgents: [],
      });

      expect(response.prompt).toContain("# Available Capabilities");
    });

    it("does not treat 'helpful' as help request", async () => {
      const agent = new ClarificationAgent();

      agent.loadKnowledge([
        {
          id: "kb1",
          title: "Guide",
          content: "Be helpful.",
        },
      ]);

      const response = await agent.clarify({
        question: "Be helpful with my query",
        topic: "data",
        missingSignals: [],
        candidateAgents: ["data-agent"],
      });

      // Should use regular clarification, not help
      expect(response.prompt).not.toContain("# Available Capabilities");
      expect(response.knowledgeSnippets.length).toBeGreaterThan(0);
    });

    it("returns empty knowledge snippets for help requests", async () => {
      const agent = new ClarificationAgent();

      const response = await agent.clarify({
        question: "help",
        topic: "",
        missingSignals: [],
        candidateAgents: [],
      });

      expect(response.knowledgeSnippets).toEqual([]);
    });
  });
});
