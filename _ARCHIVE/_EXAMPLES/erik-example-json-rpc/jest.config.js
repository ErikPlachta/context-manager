export default {
  preset: "ts-jest/presets/default-esm",
  testEnvironment: "node",
  roots: ["<rootDir>/tests"],
  // Enable ESM for tests directly (NodeNext modules)
  extensionsToTreatAsEsm: [".ts"],
  moduleFileExtensions: ["ts", "js", "json"],
  testMatch: ["**/*.test.ts"],
  verbose: true,
  collectCoverage: true,
  coverageDirectory: "coverage",
  coverageReporters: ["text", "lcov", "html"],
  testTimeout: 30000,
  // Module name mapping for absolute imports
  moduleNameMapper: {
    "^@agent/(.*)$": "<rootDir>/src/agent/$1",
    "^@extension/(.*)$": "<rootDir>/src/extension/$1",
    "^@mcp/(.*)$": "<rootDir>/src/mcp/$1",
    "^@server/(.*)$": "<rootDir>/src/server/$1",
    "^@shared/(.*)$": "<rootDir>/src/shared/$1",
    "^@config/(.*)$": "<rootDir>/src/config/$1",
    "^@internal-types/(.*)$": "<rootDir>/src/types/$1",
    "^@types/(.*)$": "<rootDir>/src/types/$1",
    // Mock vscode module for tests that import extension code
    "^vscode$": "<rootDir>/tests/__mocks__/vscode.ts",
    // Add .js extensions to imports for ESM compatibility
    "^(\\.{1,2}/.*)\\.js$": "$1",
  },
  // Explicitly set transform for TypeScript files
  transform: {
    "^.+\\.ts$": [
      "ts-jest",
      {
        tsconfig: "tsconfig.test.json",
        useESM: true,
      },
    ],
  },
  // Clear mocks between tests
  clearMocks: true,
};
