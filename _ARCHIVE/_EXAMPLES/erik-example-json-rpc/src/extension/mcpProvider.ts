/**
 * @packageDocumentation MCP server definition provider integration.
 */
import * as vscode from "vscode";
import * as path from "path";

/**
 * Register a McpServerDefinitionProvider to let VS Code discover the embedded MCP server.
 *
 * @param {string} serverUrl - MCP server URL (ignored for stdio definition but kept for future expansion).
 * @param {string} token - Authentication token to use when contacting the server.
 * @param {boolean} includeAuthHeader - Whether to include the auth token as an HTTP header.
 * @param {vscode.ExtensionContext} context - Extension context for managing disposables.
 * @returns {void} Nothing is returned; disposables are pushed to the provided context.
 */
export function registerMcpProvider(
  serverUrl: string,
  token: string,
  includeAuthHeader: boolean,
  context: vscode.ExtensionContext
): void {
  // Derive provider id from contributed chat participant (keeps build/runtime aligned)
  interface PackageJsonLike {
    contributes?: { chatParticipants?: Array<{ id?: string; name?: string }> };
  }
  const pkg =
    (context.extension as unknown as { packageJSON?: PackageJsonLike })
      .packageJSON || {};
  const contributedChat = (pkg.contributes?.chatParticipants || [])[0] || {};
  const contributedName: string = contributedChat.name || "usercontext";
  const providerId = `${contributedName}-local`;
  console.log(`🔌 Registering MCP provider "${providerId}"...`);
  const emitter = new vscode.EventEmitter<void>();
  const provider = vscode.lm.registerMcpServerDefinitionProvider(providerId, {
    onDidChangeMcpServerDefinitions: emitter.event,
    /**
     * Provide MCP server definitions to VS Code LM API for discovery.
     *
     * @param {vscode.CancellationToken} _token - Cancellation token.
     * @returns {Promise<vscode.McpStdioServerDefinition[]>} List of server definitions.
     */
    provideMcpServerDefinitions: async (_token: vscode.CancellationToken) => {
      console.log(
        `📋 provideMcpServerDefinitions called - returning server definition...`
      );
      // Provide a stdio server definition that runs our Node.js server
      const extensionPath = context.extensionPath;
      // Prefer compiled src path layout (out/src/server/index.js) for alignment with tsconfig include
      const serverScript = path.join(
        extensionPath,
        "out",
        "src",
        "server",
        "index.js"
      );

      console.log(`📂 Extension path: ${extensionPath}`);
      console.log(`📜 Server script: ${serverScript}`);

      const def = new vscode.McpStdioServerDefinition(
        "My Business Embedded Server",
        "node",
        [serverScript, "--stdio"],
        {},
        "1.0.0"
      );

      console.log(`✅ MCP server definition created:`, {
        label: "My Business Embedded Server",
        command: "node",
        args: [serverScript, "--stdio"],
        version: "1.0.0",
      });
      return [def];
    },
    /**
     * Resolve MCP server definition before starting.
     *
     * @param {vscode.McpStdioServerDefinition} server - Server definition to resolve.
     * @param {vscode.CancellationToken} _token - Cancellation token.
     * @returns {Promise<vscode.McpStdioServerDefinition>} Resolved server definition.
     */
    resolveMcpServerDefinition: async (
      server: vscode.McpStdioServerDefinition,
      _token: vscode.CancellationToken
    ) => {
      console.log(`🔍 resolveMcpServerDefinition called for:`, server.label);
      // No additional resolution needed - return as-is
      return server;
    },
  });
  context.subscriptions.push(provider, emitter);
  console.log(`✅ MCP provider "${providerId}" registered successfully`);

  // Trigger the event to notify VS Code that servers are available
  console.log(`🔔 Firing onDidChangeMcpServerDefinitions event...`);
  emitter.fire();
}
