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

// Mock https module before importing the module under test
const mockHttpsRequest = jest.fn();
jest.unstable_mockModule("https", () => ({
  default: {
    request: mockHttpsRequest,
  },
  request: mockHttpsRequest,
}));

// Dynamic import to ensure mock is applied
const { fetchTools, MCPDiscoveryError } = await import(
  "../src/extension/mcpSync.js"
);

describe("fetchTools", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("Normalizes tool schemas and required metadata", async () => {
    // Mock successful HTTP response
    const mockRequest = {
      on: jest.fn(),
      write: jest.fn(),
      end: jest.fn(),
    };

    const mockResponse = {
      statusCode: 200,
      on: jest.fn((event: string, handler: (chunk: string) => void) => {
        if (event === "data") {
          handler(
            JSON.stringify({
              result: {
                tools: [
                  {
                    name: "t1",
                    title: "Test",
                    description: "desc",
                    input_schema: {
                      properties: {
                        metric: { description: "Metric", type: "string" },
                      },
                      required: ["metric"],
                    },
                  },
                ],
              },
            })
          );
        } else if (event === "end") {
          handler("");
        }
        return mockResponse;
      }),
    };

    mockHttpsRequest.mockImplementation(
      (options: unknown, callback: (res: unknown) => void) => {
        callback(mockResponse);
        return mockRequest;
      }
    );

    const result = await fetchTools("https://example.com");
    expect(result).toHaveLength(1);
    expect(result[0].input_schema?.properties?.metric?.required).toBe(true);
  });

  it("throws a discovery error when the server is unreachable", async () => {
    const mockRequest = {
      on: jest.fn((event: string, handler: (error: Error) => void) => {
        if (event === "error") {
          handler(new Error("boom"));
        }
        return mockRequest;
      }),
      write: jest.fn(),
      end: jest.fn(),
    };

    mockHttpsRequest.mockImplementation(() => mockRequest);

    await expect(fetchTools("https://example.com")).rejects.toBeInstanceOf(
      MCPDiscoveryError
    );
  });
});
