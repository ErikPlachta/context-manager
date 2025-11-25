import { describe, it, expect, jest } from "@jest/globals";

// Mock https before importing module under test (dynamic import pattern)
const mockHttpsRequest = jest.fn();
jest.unstable_mockModule("https", () => ({
  default: { request: mockHttpsRequest },
  request: mockHttpsRequest,
}));

// Helper to set https.request implementation
function setHttpsImpl(impl: (...args: any[]) => any) {
  mockHttpsRequest.mockImplementation(impl);
}

// Dynamically import after mocks so ESM uses them
const { fetchTools, MCPDiscoveryError } = await import(
  "../src/extension/mcpSync.js"
);

describe("fetchTools edge cases", () => {
  it("returns empty array when result.tools missing", async () => {
    const mockReq = {
      on: jest.fn(),
      write: jest.fn(),
      end: jest.fn(),
    };
    const mockRes = {
      statusCode: 200,
      on: jest.fn((event: string, handler: (chunk?: string) => void) => {
        if (event === "data") {
          handler(JSON.stringify({ result: {} }));
        } else if (event === "end") {
          handler();
        }
        return mockRes;
      }),
    };
    setHttpsImpl((_opts, cb) => {
      cb(mockRes);
      return mockReq;
    });
    const tools = await fetchTools("https://example.com");
    expect(Array.isArray(tools)).toBe(true);
    expect(tools).toHaveLength(0);
  });

  it("throws MCPDiscoveryError on non-200 status", async () => {
    const mockReq = { on: jest.fn(), write: jest.fn(), end: jest.fn() };
    const mockRes = {
      statusCode: 500,
      on: jest.fn((event: string, handler: (chunk?: string) => void) => {
        if (event === "data") handler("{}\n");
        else if (event === "end") handler();
        return mockRes;
      }),
    };
    setHttpsImpl((_opts, cb) => {
      cb(mockRes);
      return mockReq;
    });
    await expect(fetchTools("https://example.com")).rejects.toBeInstanceOf(
      MCPDiscoveryError
    );
  });

  it("throws MCPDiscoveryError when JSON has error field", async () => {
    const mockReq = { on: jest.fn(), write: jest.fn(), end: jest.fn() };
    const mockRes = {
      statusCode: 200,
      on: jest.fn((event: string, handler: (chunk?: string) => void) => {
        if (event === "data") {
          handler(JSON.stringify({ error: { message: "fail", code: -32603 } }));
        } else if (event === "end") handler();
        return mockRes;
      }),
    };
    setHttpsImpl((_opts, cb) => {
      cb(mockRes);
      return mockReq;
    });
    await expect(fetchTools("https://example.com")).rejects.toBeInstanceOf(
      MCPDiscoveryError
    );
  });

  it("throws MCPDiscoveryError on invalid JSON", async () => {
    const mockReq = { on: jest.fn(), write: jest.fn(), end: jest.fn() };
    const mockRes = {
      statusCode: 200,
      on: jest.fn((event: string, handler: (chunk?: string) => void) => {
        if (event === "data") handler("{not-json");
        else if (event === "end") handler();
        return mockRes;
      }),
    };
    setHttpsImpl((_opts, cb) => {
      cb(mockRes);
      return mockReq;
    });
    await expect(fetchTools("https://example.com")).rejects.toBeInstanceOf(
      MCPDiscoveryError
    );
  });

  it("throws MCPDiscoveryError on timeout", async () => {
    const mockReq = {
      on: jest.fn((event: string, handler: () => void) => {
        if (event === "timeout") {
          // simulate timeout immediately
          handler();
        }
        return mockReq;
      }),
      write: jest.fn(),
      end: jest.fn(),
      destroy: jest.fn(),
    };
    // callback never invoked because timeout triggers rejection first
    setHttpsImpl((_opts, _cb) => mockReq);
    await expect(fetchTools("https://example.com")).rejects.toBeInstanceOf(
      MCPDiscoveryError
    );
  });
});

// fetchLocalTools tests (mock @server/index)
describe("fetchLocalTools", () => {
  it("normalizes local tools", async () => {
    jest.unstable_mockModule("@server/index", () => ({
      tools: [
        {
          name: "loc",
          title: "Local",
          description: "Local tool",
          input_schema: {
            required: ["param"],
            properties: { param: { description: "P", type: "string" } },
          },
        },
      ],
    }));
    const { fetchLocalTools } = await import("../src/extension/mcpSync.js");
    const tools = await fetchLocalTools();
    expect(tools[0].input_schema?.properties?.param?.required).toBe(true);
  });
});
