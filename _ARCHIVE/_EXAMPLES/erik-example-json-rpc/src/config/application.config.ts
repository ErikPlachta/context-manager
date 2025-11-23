/**
 * Canonical TypeScript application configuration.
 * Mirrors the current mcp.config.json content to enable typed, single-source config.
 */
/**
 * @packageDocumentation application.config implementation for config module
 */

import type { ApplicationConfig } from "@internal-types/applicationConfig";

// Note: We cast to ApplicationConfig to avoid strict excess property checks while
// we complete the migration away from the JSON-only shape.
export const applicationConfig: ApplicationConfig = {
  application: {
    name: "VSCode MCP Extension Configuration File",
    version: "1.0.0",
    description:
      "Configuration file for building MCP-enabled VS Code extensions with AI agents",
    environments: {
      development: {
        debug: true,
        logLevel: "verbose",
        hotReload: true,
        mockData: true,
      },
      staging: {
        debug: false,
        logLevel: "info",
        hotReload: false,
        mockData: false,
      },
      production: {
        debug: false,
        logLevel: "warn",
        hotReload: false,
        mockData: false,
      },
    },
  },
  mcp: {
    server: {
      protocol: "http",
      defaultPort: 39200,
      timeout: 30000,
      retries: 3,
      embedded: {
        enabled: true,
        autoStart: true,
      },
    },
    client: {
      maxConcurrentRequests: 10,
      requestTimeout: 15000,
      retryDelay: 1000,
    },
  },
  agents: {
    global: {
      maxExecutionTime: 60000,
      enableTelemetry: true,
      cacheEnabled: true,
      cacheTtl: 300000,
    },
    // Transitional fields retained to match current JSON usage
    configurationSource: "src/mcp/config/unifiedAgentConfig.ts",
    note: "Agent definitions have been moved to unifiedAgentConfig.ts for better maintainability and to eliminate duplication. This file now contains only runtime overrides.",
    runtimeOverrides: {
      orchestrator: {
        execution: { priority: "high", timeout: 30000 },
      },
      "relevant-data-manager": {
        execution: { priority: "medium", timeout: 20000, cacheEnabled: true },
      },
      "database-agent": {
        execution: { priority: "medium", timeout: 15000, cacheEnabled: true },
      },
      "data-agent": {
        execution: { priority: "low", timeout: 45000 },
      },
      "clarification-agent": {
        execution: { priority: "high", timeout: 10000 },
      },
    },
    templateReplacements: {
      "<orchestrator-label>": "Orchestrator",
      "<relevant-data-manager-label>": "Relevant data manager",
      "<database-agent-label>": "Database agent",
      "<data-agent-label>": "Data agent",
      "<clarification-agent-label>": "Clarification agent",
    },
  },
  data: {
    categories: [
      "<application>",
      "<department>",
      "<people>",
      "<companyPolicy>",
      "<companyResource>",
    ],
    validation: {
      strictMode: true,
      validateOnLoad: true,
      validateRelationships: true,
    },
    cache: {
      enabled: true,
      directory: ".mcp-cache",
      maxSize: "100MB",
      ttl: 3600000,
    },
  },
  typescript: {
    include: ["src/**/*.ts"],
  },
  // JSON schema validation removed - now using native TypeScript type guards
  // Validation is performed by type guard functions in src/types/userContext.types.ts
  // Users will onboard custom UserContext data through extension utilities (not source code)
  jsonSchemas: [],
  markdown: {
    include: ["docs/**/*.md"],
    exclude: ["docs/**"],
    requiredFrontMatter: [
      "title",
      "summary",
      "roles",
      "associations",
      "hierarchy",
    ],
    requiredSections: [
      "## Summary",
      "## Responsibilities",
      "## Inputs",
      "## Outputs",
      "## Error Handling",
      "## Examples",
      "## Maintenance",
    ],
  },
  report: {
    output: "docs/reports/health-report.md",
  },
  logging: {
    level: "info",
    format: "json",
    outputs: ["console"],
    file: {
      enabled: false,
      path: "logs/application.log",
      maxSize: "10MB",
      maxFiles: 5,
    },
  },
  security: {
    enableCORS: true,
    allowedOrigins: ["vscode-webview://*"],
    rateLimit: {
      enabled: true,
      windowMs: 60000,
      maxRequests: 100,
    },
  },
  performance: {
    monitoring: { enabled: true, sampleRate: 0.1 },
    memory: { maxHeapSize: "512MB", gcThreshold: 0.8 },
  },
  features: {
    experimental: {
      enableAdvancedCaching: false,
      enableParallelProcessing: false,
      enableStreamingResponses: false,
    },
    extensions: { allowThirdParty: false, sandboxMode: true },
  },
} as unknown as ApplicationConfig;

export default applicationConfig;
