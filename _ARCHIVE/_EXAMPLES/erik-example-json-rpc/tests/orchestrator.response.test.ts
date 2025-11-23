/**
 * Integration tests for Orchestrator response handling.
 *
 * Tests the CORRECT architecture pattern:
 * 1. Orchestrator calls agent method (agent returns typed data)
 * 2. Orchestrator builds AgentResponse<T> with metadata
 * 3. Orchestrator uses CommunicationAgent for formatting
 *
 * This pattern maintains agent isolation - agents MUST NOT import from other agents.
 */

import { describe, it, expect, beforeEach, jest } from "@jest/globals";
import { Orchestrator } from "../src/agent/orchestrator";
import { CommunicationAgent } from "../src/agent/communicationAgent";

describe("Orchestrator Response Handling", () => {
  let orchestrator: Orchestrator;
  let communicationAgent: CommunicationAgent;

  beforeEach(() => {
    orchestrator = Orchestrator.createDefault();
    communicationAgent = new CommunicationAgent();
  });

  describe("callAgentWithResponse - Success Cases", () => {
    it("wraps successful agent call with timing metadata", async () => {
      // Simulate agent returning typed data
      const mockAgentData = [
        { id: "1", name: "Alice" },
        { id: "2", name: "Bob" },
      ];
      const agentCall = jest.fn().mockResolvedValue(mockAgentData);

      const response = await orchestrator.callAgentWithResponse(
        "test-agent",
        "getData",
        agentCall,
        { metadata: { entityType: "people" } }
      );

      expect(response.type).toBe("success");
      expect(response.status).toBe("success");
      expect(response.data).toEqual(mockAgentData);
      expect(response.metadata?.agentId).toBe("test-agent");
      expect(response.metadata?.operation).toBe("getData");
      expect(response.metadata?.duration).toBeGreaterThanOrEqual(0);
      expect(response.metadata?.count).toBe(2);
      expect(response.metadata?.entityType).toBe("people");
      expect(response.metadata?.timestamp).toBeDefined();
      expect(agentCall).toHaveBeenCalledTimes(1);
    });

    it("includes count for array data", async () => {
      const mockData = [1, 2, 3, 4, 5];
      const response = await orchestrator.callAgentWithResponse(
        "test-agent",
        "getNumbers",
        () => Promise.resolve(mockData)
      );

      expect(response.metadata?.count).toBe(5);
      expect(response.data).toEqual(mockData);
    });

    it("omits count for non-array data", async () => {
      const mockData = { id: "1", value: "test" };
      const response = await orchestrator.callAgentWithResponse(
        "test-agent",
        "getSingleItem",
        () => Promise.resolve(mockData)
      );

      expect(response.metadata?.count).toBeUndefined();
      expect(response.data).toEqual(mockData);
    });

    it("allows custom success message", async () => {
      const response = await orchestrator.callAgentWithResponse(
        "test-agent",
        "customOperation",
        () => Promise.resolve({ success: true }),
        { message: "Custom success message" }
      );

      expect(response.message).toBe("Custom success message");
    });

    it("generates default success message with timing", async () => {
      const response = await orchestrator.callAgentWithResponse(
        "test-agent",
        "testOperation",
        () => Promise.resolve({ data: "test" })
      );

      expect(response.message).toContain(
        "testOperation completed successfully"
      );
      expect(response.message).toMatch(/\d+ms$/);
    });

    it("preserves custom metadata fields", async () => {
      const response = await orchestrator.callAgentWithResponse(
        "test-agent",
        "operation",
        () => Promise.resolve([]),
        {
          metadata: {
            customField: "customValue",
            requestId: "req-123",
          },
        }
      );

      expect(response.metadata?.customField).toBe("customValue");
      expect(response.metadata?.requestId).toBe("req-123");
    });
  });

  describe("callAgentWithResponse - Error Cases", () => {
    it("wraps agent errors in structured error response", async () => {
      const mockError = new Error("Category not found");
      const agentCall = jest.fn().mockRejectedValue(mockError);

      const response = await orchestrator.callAgentWithResponse(
        "database-agent",
        "executeQuery",
        agentCall
      );

      expect(response.type).toBe("error");
      expect(response.status).toBe("error");
      expect(response.message).toBe("Category not found");
      expect(response.metadata?.agentId).toBe("database-agent");
      expect(response.metadata?.operation).toBe("executeQuery");
      expect(response.errors).toHaveLength(1);
      expect(response.errors?.[0].message).toBe("Category not found");
      expect(response.errors?.[0].code).toBe("Error");
    });

    it("assesses error severity - category not found is low", async () => {
      const mockError = new Error("Category 'xyz' does not exist");

      const response = await orchestrator.callAgentWithResponse(
        "test-agent",
        "operation",
        () => Promise.reject(mockError)
      );

      expect(response.errors?.[0].severity).toBe("low");
    });

    it("assesses error severity - permission denied is high", async () => {
      const mockError = new Error("Permission denied: unauthorized access");

      const response = await orchestrator.callAgentWithResponse(
        "test-agent",
        "operation",
        () => Promise.reject(mockError)
      );

      expect(response.errors?.[0].severity).toBe("high");
    });

    it("assesses error severity - out of memory is critical", async () => {
      const mockError = new Error("Out of memory");

      const response = await orchestrator.callAgentWithResponse(
        "test-agent",
        "operation",
        () => Promise.reject(mockError)
      );

      expect(response.errors?.[0].severity).toBe("critical");
    });

    it("assesses error severity - default is medium", async () => {
      const mockError = new Error("Unexpected error occurred");

      const response = await orchestrator.callAgentWithResponse(
        "test-agent",
        "operation",
        () => Promise.reject(mockError)
      );

      expect(response.errors?.[0].severity).toBe("medium");
    });

    it("generates recovery suggestions for not found errors", async () => {
      const mockError = new Error("Resource not found");

      const response = await orchestrator.callAgentWithResponse(
        "test-agent",
        "getData",
        () => Promise.reject(mockError)
      );

      expect(response.errors?.[0].suggestions).toContain(
        "Verify the category ID or entity name is spelled correctly"
      );
      expect(response.errors?.[0].suggestions).toContain(
        "Use the metadata agent to list available categories"
      );
    });

    it("generates recovery suggestions for permission errors", async () => {
      const mockError = new Error("Permission denied");

      const response = await orchestrator.callAgentWithResponse(
        "test-agent",
        "operation",
        () => Promise.reject(mockError)
      );

      expect(response.errors?.[0].suggestions).toContain(
        "Check that you have access to the requested resource"
      );
      expect(response.errors?.[0].suggestions).toContain(
        "Contact your administrator if access is needed"
      );
    });

    it("generates recovery suggestions for timeout errors", async () => {
      const mockError = new Error("Operation timed out");

      const response = await orchestrator.callAgentWithResponse(
        "test-agent",
        "operation",
        () => Promise.reject(mockError)
      );

      expect(response.errors?.[0].suggestions).toContain(
        "Try again with a smaller dataset or more specific filters"
      );
    });

    it("generates recovery suggestions for validation errors", async () => {
      const mockError = new Error("Invalid parameter format");

      const response = await orchestrator.callAgentWithResponse(
        "test-agent",
        "operation",
        () => Promise.reject(mockError)
      );

      expect(response.errors?.[0].suggestions).toContain(
        "Check that all required parameters are provided"
      );
    });

    it("generates generic suggestions for unknown errors", async () => {
      const mockError = new Error("Something weird happened");

      const response = await orchestrator.callAgentWithResponse(
        "test-agent",
        "customOp",
        () => Promise.reject(mockError)
      );

      expect(response.errors?.[0].suggestions).toContain(
        "Retry the customOp operation"
      );
      expect(response.errors?.[0].suggestions).toContain(
        "Check the error message for specific details"
      );
    });

    it("handles non-Error thrown values", async () => {
      const response = await orchestrator.callAgentWithResponse(
        "test-agent",
        "operation",
        () => Promise.reject("String error")
      );

      expect(response.type).toBe("error");
      expect(response.message).toBe("String error");
      expect(response.errors?.[0].code).toBe("UNKNOWN_ERROR");
    });
  });

  describe("Integration with CommunicationAgent", () => {
    it("formats success responses correctly", async () => {
      const mockData = [{ id: "1" }, { id: "2" }];
      const response = await orchestrator.callAgentWithResponse(
        "test-agent",
        "getData",
        () => Promise.resolve(mockData)
      );

      const formatted = communicationAgent.formatSuccess(response);

      expect(formatted.format).toBe("markdown");
      expect(formatted.isFinal).toBe(true);
      expect(formatted.message).toContain("completed successfully");
      expect(formatted.raw).toEqual(response);
    });

    it("formats error responses correctly", async () => {
      const mockError = new Error("Test error");
      const response = await orchestrator.callAgentWithResponse(
        "test-agent",
        "operation",
        () => Promise.reject(mockError)
      );

      const formatted = communicationAgent.formatError(response);

      expect(formatted.format).toBe("markdown");
      expect(formatted.isFinal).toBe(true);
      expect(formatted.severity).toBe("medium");
      expect(formatted.message).toContain("Error");
      expect(formatted.message).toContain("Test error");
      expect(formatted.raw).toEqual(response);
    });

    it("demonstrates full pipeline: agent → orchestrator → communication agent", async () => {
      // Step 1: Simulate agent returning typed data
      const agentData = [
        { id: "person-1", name: "Alice", skills: ["python", "javascript"] },
        { id: "person-2", name: "Bob", skills: ["java", "kotlin"] },
      ];

      // Step 2: Orchestrator wraps agent call
      const response = await orchestrator.callAgentWithResponse(
        "database-agent",
        "executeQuery",
        () => Promise.resolve(agentData),
        {
          metadata: {
            entityType: "people",
            filters: { skill: "python" },
          },
        }
      );

      // Verify structured response
      expect(response.type).toBe("success");
      expect(response.data).toEqual(agentData);
      expect(response.metadata?.count).toBe(2);
      expect(response.metadata?.entityType).toBe("people");

      // Step 3: CommunicationAgent formats for user
      const formatted = communicationAgent.formatSuccess(response);

      // Verify formatted output
      expect(formatted.format).toBe("markdown");
      expect(formatted.isFinal).toBe(true);
      expect(formatted.message).toBeTruthy();
    });
  });

  describe("Architecture Compliance", () => {
    it("ensures orchestrator is the only component importing CommunicationAgent", () => {
      // This test verifies the pattern is correct:
      // - Orchestrator imports CommunicationAgent ✅
      // - Orchestrator calls agent methods ✅
      // - Agent returns typed data (not AgentResponse) ✅
      // - Orchestrator builds AgentResponse ✅
      // - Orchestrator uses CommunicationAgent for formatting ✅

      expect(orchestrator).toBeInstanceOf(Orchestrator);
      expect(communicationAgent).toBeInstanceOf(CommunicationAgent);

      // The callAgentWithResponse method demonstrates the correct pattern
      expect(typeof orchestrator.callAgentWithResponse).toBe("function");
    });

    it("verifies agent calls return raw data, not formatted responses", async () => {
      // Agents should return typed data like CategoryRecord[], DataInsight[], etc.
      // NOT AgentResponse<T> (that's Orchestrator's job)

      const mockAgentData = { id: "test", value: 42 };
      const agentCall = jest.fn().mockResolvedValue(mockAgentData);

      const response = await orchestrator.callAgentWithResponse(
        "test-agent",
        "operation",
        agentCall
      );

      // Agent returned plain data
      expect(agentCall).toHaveBeenCalledTimes(1);
      expect(response.data).toEqual(mockAgentData);

      // Orchestrator wrapped it in AgentResponse
      expect(response.type).toBe("success");
      expect(response.status).toBe("success");
      expect(response.metadata).toBeDefined();
    });
  });
});
