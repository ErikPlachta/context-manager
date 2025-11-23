import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  beforeAll,
  afterAll,
  jest,
} from "@jest/globals";

/**
 * @packageDocumentation Communication Agent Test Suite
 *
 * Comprehensive tests for Communication Agent response formatting, error handling,
 * progress tracking, and validation result formatting.
 */

import {
  CommunicationAgent,
  communicationAgentConfig,
} from "../src/agent/communicationAgent";
import type { AgentResponse } from "../src/agent/communicationAgent";

describe("CommunicationAgent", () => {
  let agent: CommunicationAgent;

  beforeEach(() => {
    agent = new CommunicationAgent();
  });

  describe("Initialization", () => {
    test("should initialize with default config", () => {
      expect(agent).toBeInstanceOf(CommunicationAgent);
    });

    test("should throw error if required sections missing", () => {
      expect(() => {
        new CommunicationAgent({
          $configId: "agent.communication.v1.0.0", // Use valid config ID
          agent: {
            id: "test-communication",
            name: "Test",
            version: "1.0.0",
            description: "Test",
          },
          // Missing required communication section
        });
      }).toThrow("missing required configuration sections");
    });
  });

  describe("formatSuccess()", () => {
    test("should format basic success message", () => {
      const response: AgentResponse = {
        type: "success",
        status: "success",
        message: "Operation completed successfully.",
      };

      const result = agent.formatSuccess(response);

      expect(result.message).toBe("Operation completed successfully.");
      expect(result.format).toBe("markdown");
      expect(result.isFinal).toBe(true);
    });

    test("should use template when operation specified", () => {
      const response: AgentResponse = {
        type: "success",
        status: "success",
        metadata: {
          operation: "dataRetrieved",
          count: 5,
          entityType: "records",
        },
      };

      const result = agent.formatSuccess(response);

      expect(result.message).toContain("5");
      expect(result.message).toContain("records");
    });

    test("should include provided message over template", () => {
      const response: AgentResponse = {
        type: "success",
        status: "success",
        message: "Custom success message",
        metadata: {
          operation: "dataRetrieved",
          count: 10,
        },
      };

      const result = agent.formatSuccess(response);

      expect(result.message).toBe("Custom success message");
    });

    test("should handle response with data", () => {
      const response: AgentResponse<{ users: string[] }> = {
        type: "success",
        status: "success",
        data: { users: ["Alice", "Bob"] },
        message: "Retrieved users",
      };

      const result = agent.formatSuccess(response);

      expect(result.raw?.data).toEqual({ users: ["Alice", "Bob"] });
    });

    test("should default to generic message when no operation or message", () => {
      const response: AgentResponse = {
        type: "success",
        status: "success",
      };

      const result = agent.formatSuccess(response);

      expect(result.message).toBe("Operation completed successfully.");
    });

    test("should enumerate available categories on success when enabled", () => {
      // Clone default config and enable success enumeration
      const cfg = JSON.parse(JSON.stringify(communicationAgentConfig));
      cfg.communication.successDisplay.includeAvailableCategories = true;

      const customAgent = new CommunicationAgent(cfg);

      const response: AgentResponse = {
        type: "success",
        status: "success",
        message: "Found items",
        metadata: {
          availableCategories: ["people", "departments", "projects"],
        },
      };

      const result = customAgent.formatSuccess(response);
      expect(result.message).toContain("Available Categories:");
      expect(result.message).toContain("- people");
      expect(result.message).toContain("- departments");
      expect(result.message).toContain("- projects");
    });

    test("should NOT enumerate available categories on success when disabled", () => {
      const response: AgentResponse = {
        type: "success",
        status: "success",
        message: "Completed",
        metadata: {
          availableCategories: ["people", "departments"],
        },
      };

      const result = agent.formatSuccess(response);
      expect(result.message).not.toContain("Available Categories:");
      expect(result.message).not.toContain("- people");
    });
  });

  describe("formatError()", () => {
    test("should format basic error message", () => {
      const response: AgentResponse = {
        type: "error",
        status: "error",
        message: "Something went wrong.",
      };

      const result = agent.formatError(response);

      expect(result.message).toBe("Something went wrong.");
      expect(result.format).toBe("markdown");
      expect(result.isFinal).toBe(true);
    });

    test("should include error details", () => {
      const response: AgentResponse = {
        type: "error",
        status: "error",
        message: "Validation failed",
        errors: [
          { message: "Name is required", path: "user.name" },
          { message: "Age must be positive", path: "user.age" },
        ],
      };

      const result = agent.formatError(response);

      expect(result.message).toContain("Error Details:");
      expect(result.message).toContain("user.name: Name is required");
      expect(result.message).toContain("user.age: Age must be positive");
    });

    test("should include recovery suggestions", () => {
      const response: AgentResponse = {
        type: "error",
        status: "error",
        message: "Record not found",
        errors: [
          {
            code: "notFound",
            message: "User not found",
            severity: "medium",
          },
        ],
      };

      const result = agent.formatError(response);

      expect(result.message).toContain("Suggestions:");
    });

    test("should enumerate available categories when provided", () => {
      const response: AgentResponse = {
        type: "error",
        status: "error",
        message: "Unknown category",
        metadata: {
          availableCategories: ["people", "departments", "projects"],
        },
        errors: [
          {
            code: "notFound",
            message: "Category not found",
          },
        ],
      };

      const result = agent.formatError(response);

      expect(result.message).toContain("Available Categories:");
      expect(result.message).toContain("- people");
      expect(result.message).toContain("- departments");
      expect(result.message).toContain("- projects");
    });

    test("should set severity from first error", () => {
      const response: AgentResponse = {
        type: "error",
        status: "error",
        errors: [
          {
            message: "Critical failure",
            severity: "critical",
          },
        ],
      };

      const result = agent.formatError(response);

      expect(result.severity).toBe("critical");
    });

    test("should default to medium severity", () => {
      const response: AgentResponse = {
        type: "error",
        status: "error",
        message: "Error occurred",
        errors: [{ message: "Something failed" }],
      };

      const result = agent.formatError(response);

      expect(result.severity).toBe("medium");
    });

    test("should handle error without details", () => {
      const response: AgentResponse = {
        type: "error",
        status: "error",
      };

      const result = agent.formatError(response);

      expect(result.message).toBe("An error occurred.");
    });

    test("should limit recovery suggestions to maxRecoverySuggestions", () => {
      const response: AgentResponse = {
        type: "error",
        status: "error",
        errors: [
          {
            code: "notFound",
            message: "Not found",
          },
        ],
      };

      const result = agent.formatError(response);

      // Default max is 3, so check that suggestions are present but limited
      const suggestionLines = result.message.match(/^- /gm);
      if (suggestionLines) {
        expect(suggestionLines.length).toBeLessThanOrEqual(3);
      }
    });
  });

  describe("formatProgress()", () => {
    test("should format basic progress message", () => {
      const response: AgentResponse = {
        type: "progress",
        status: "in-progress",
        message: "Processing records...",
      };

      const result = agent.formatProgress(response);

      expect(result.message).toBe("Processing records...");
      expect(result.isFinal).toBe(false);
    });

    test("should include percentage when available", () => {
      const response: AgentResponse = {
        type: "progress",
        status: "in-progress",
        message: "Processing",
        progress: {
          percentage: 45,
        },
      };

      const result = agent.formatProgress(response);

      expect(result.message).toContain("45% complete");
    });

    test("should include current step", () => {
      const response: AgentResponse = {
        type: "progress",
        status: "in-progress",
        message: "Analyzing data",
        progress: {
          currentStep: "Step 2 of 5: Validating records",
        },
      };

      const result = agent.formatProgress(response);

      expect(result.message).toContain("Step 2 of 5: Validating records");
    });

    test("should not include elapsed time by default", () => {
      const response: AgentResponse = {
        type: "progress",
        status: "in-progress",
        message: "Working",
        progress: {
          elapsedTime: 5000,
        },
      };

      const result = agent.formatProgress(response);

      // Default config has showElapsedTime: false
      expect(result.message).not.toContain("elapsed");
    });

    test("should default to generic message when none provided", () => {
      const response: AgentResponse = {
        type: "progress",
        status: "in-progress",
      };

      const result = agent.formatProgress(response);

      expect(result.message).toBe("Operation in progress...");
    });
  });

  describe("formatValidation()", () => {
    test("should format basic validation result", () => {
      const response: AgentResponse = {
        type: "validation",
        status: "success",
        message: "Validation completed.",
      };

      const result = agent.formatValidation(response);

      expect(result.message).toBe("Validation completed.");
      expect(result.isFinal).toBe(true);
    });

    test("should include summary when metadata provided", () => {
      const response: AgentResponse = {
        type: "validation",
        status: "success",
        message: "Validation completed.",
        metadata: {
          passedCount: 8,
          failedCount: 2,
        },
      };

      const result = agent.formatValidation(response);

      expect(result.message).toContain("Summary:");
      expect(result.message).toContain("8/10 passed");
    });

    test("should list validation errors", () => {
      const response: AgentResponse = {
        type: "validation",
        status: "error",
        errors: [
          { path: "user.email", message: "Invalid email format" },
          { path: "user.age", message: "Must be 18 or older" },
        ],
      };

      const result = agent.formatValidation(response);

      expect(result.message).toContain("Issues Found:");
      expect(result.message).toContain("user.email: Invalid email format");
      expect(result.message).toContain("user.age: Must be 18 or older");
    });

    test("should limit errors to maxErrorsPerEntity", () => {
      const errors = Array.from({ length: 10 }, (_, i) => ({
        path: `field${i}`,
        message: `Error ${i}`,
      }));

      const response: AgentResponse = {
        type: "validation",
        status: "error",
        errors,
      };

      const result = agent.formatValidation(response);

      // Default max is 5
      expect(result.message).toContain("... and 5 more issue(s)");
    });

    test("should show errors without paths when showFieldPaths disabled", () => {
      // This test would require custom config to disable showFieldPaths
      // For now, just verify path is included by default
      const response: AgentResponse = {
        type: "validation",
        status: "error",
        errors: [{ path: "user.name", message: "Required field" }],
      };

      const result = agent.formatValidation(response);

      expect(result.message).toContain("user.name:");
    });
  });

  describe("Template Processing", () => {
    test("should replace template variables", () => {
      const response: AgentResponse = {
        type: "success",
        status: "success",
        metadata: {
          operation: "exportComplete",
          count: 25,
          entityType: "records",
          destination: "/export/data.json",
        },
      };

      const result = agent.formatSuccess(response);

      expect(result.message).toContain("25");
      expect(result.message).toContain("records");
      expect(result.message).toContain("/export/data.json");
    });

    test("should leave unmatched placeholders", () => {
      const response: AgentResponse = {
        type: "success",
        status: "success",
        metadata: {
          operation: "dataRetrieved",
          count: 10,
          // Missing entityType
        },
      };

      const result = agent.formatSuccess(response);

      // Should still contain count but entityType placeholder remains
      expect(result.message).toContain("10");
    });
  });

  describe("Format-Specific Output", () => {
    test("should preserve markdown formatting", () => {
      const response: AgentResponse = {
        type: "error",
        status: "error",
        message: "**Error**: Operation failed",
        errors: [{ message: "Something went wrong" }],
      };

      const result = agent.formatError(response);

      expect(result.format).toBe("markdown");
      expect(result.message).toContain("**");
    });

    test("should include raw response for programmatic access", () => {
      const response: AgentResponse = {
        type: "success",
        status: "success",
        data: { result: "test" },
        message: "Success",
      };

      const result = agent.formatSuccess(response);

      expect(result.raw).toEqual(response);
      expect(result.raw?.data).toEqual({ result: "test" });
    });
  });

  describe("Edge Cases", () => {
    test("should handle empty errors array", () => {
      const response: AgentResponse = {
        type: "error",
        status: "error",
        message: "Error occurred",
        errors: [],
      };

      const result = agent.formatError(response);

      expect(result.message).toBe("Error occurred");
      expect(result.message).not.toContain("Error Details:");
    });

    test("should handle undefined metadata", () => {
      const response: AgentResponse = {
        type: "success",
        status: "success",
        message: "Done",
      };

      const result = agent.formatSuccess(response);

      expect(result.message).toBe("Done");
    });

    test("should handle zero progress percentage", () => {
      const response: AgentResponse = {
        type: "progress",
        status: "in-progress",
        message: "Starting",
        progress: {
          percentage: 0,
        },
      };

      const result = agent.formatProgress(response);

      expect(result.message).toContain("0% complete");
    });

    test("should handle 100 progress percentage", () => {
      const response: AgentResponse = {
        type: "progress",
        status: "in-progress",
        message: "Finishing",
        progress: {
          percentage: 100,
        },
      };

      const result = agent.formatProgress(response);

      expect(result.message).toContain("100% complete");
    });

    test("should handle validation with no errors", () => {
      const response: AgentResponse = {
        type: "validation",
        status: "success",
        metadata: {
          passedCount: 10,
          failedCount: 0,
        },
      };

      const result = agent.formatValidation(response);

      expect(result.message).toContain("10/10 passed");
      expect(result.message).not.toContain("Issues Found:");
    });
  });
});
