/**
 * @packageDocumentation Entry point for UserContext MCP VS Code extension.
 *
 * @module extension
 */
import * as vscode from "vscode";
import * as path from "path";
import { promises as fsPromises, existsSync } from "fs";
import { fileURLToPath } from "url";
import { Orchestrator } from "@agent/orchestrator";
import { fetchTools, fetchLocalTools, MCPTool } from "@extension/mcpSync";
import { registerMcpProvider } from "@extension/mcpProvider";
import { resolveMcpConfigPath } from "@extension/mcpRegistration";

// ES module equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Activate the UserContext MCP extension.
 *
 * Responsibilities:
 * - Optionally start the embedded MCP server (when no external serverUrl is configured).
 * - Register the MCP provider for server discovery.
 * - Register the chat participant that routes user prompts through the orchestrator.
 * - Expose a command for manual tool invocation.
 *
 * @param {vscode.ExtensionContext} context - VS Code extension lifecycle context used for disposables.
 * @returns {Promise<void>} Resolves when activation sequence has completed (server started, participant registered).
 */
export async function activate(
  context: vscode.ExtensionContext
): Promise<void> {
  console.log("🚀 UserContext MCP Extension: Starting activation...");
  console.log(`📋 Extension context: ${context.extensionPath}`);
  console.log(`📋 Extension ID: ${context.extension.id}`);

  // Clean up any orphaned registrations from previous uninstalls
  await cleanupOrphanedRegistrations(context);

  // Establish dynamic IDs and prefixes from package.json contributions
  interface PackageJsonLike {
    name?: string;
    contributes?: { chatParticipants?: Array<{ id?: string; name?: string }> };
    publisher?: string;
  }
  const extObj = context.extension as unknown as
    | { packageJSON?: PackageJsonLike }
    | undefined as { packageJSON?: PackageJsonLike } | undefined;
  const pkg = (extObj?.packageJSON || {}) as PackageJsonLike;
  const contributedChat = (pkg.contributes?.chatParticipants || [])[0] || {};
  const contributedId: string = contributedChat.id || "UserContextMCP";
  const contributedName: string = contributedChat.name || "usercontext";

  console.log(`🆔 Chat Participant ID from package.json: ${contributedId}`);
  console.log(
    `🏷️  Chat Participant Name from package.json: ${contributedName}`
  );

  const commandPrefix: string = ((): string => {
    const id = contributedId || "UserContextMCP";
    const base = id.endsWith("MCP") ? id.slice(0, -3) : id;
    return base.toLowerCase() + "MCP";
  })();

  const cfg = vscode.workspace.getConfiguration(commandPrefix);
  let serverUrl = cfg.get<string>("serverUrl") ?? "";
  const token = cfg.get<string>("token") ?? "";
  const orchestrator = new Orchestrator();
  const includeAuthHeader = cfg.get<boolean>("includeAuthHeader") ?? false;

  console.log(
    `📋 Configuration loaded - serverUrl: ${serverUrl || "(stdio)"}, token: ${
      token ? "***" : "(none)"
    }`
  );

  // MCP server registration is now handled by the provider system
  // Legacy autoRegister setting is deprecated but kept for backwards compatibility

  // Always register provider and chat participant; tool discovery can fail independently
  console.log(
    `🔌 Registering MCP provider with serverUrl: ${
      serverUrl || "(embedded stdio)"
    }`
  );
  let tools: MCPTool[] = [];
  try {
    // Register provider even for stdio (provider may enumerate registrations)
    registerMcpProvider(serverUrl, token, includeAuthHeader, context);
    console.log(`✅ MCP provider registered`);

    if (serverUrl) {
      console.log(`🔍 Fetching tools via HTTP from ${serverUrl}...`);
      tools = await fetchTools(serverUrl, token);
    } else {
      console.log(`🔍 Fetching tools from embedded stdio server module...`);
      tools = await fetchLocalTools();
    }

    console.log(
      `✅ Fetched ${tools.length} tools:`,
      tools.map((t) => t.name).join(", ")
    );
  } catch (toolError) {
    const msg =
      toolError instanceof Error ? toolError.message : String(toolError);
    console.error(`⚠️ Tool fetch failed:`, msg);
    vscode.window.showWarningMessage(
      `⚠️ MCP tools could not be fetched: ${msg}. Chat participant will still activate.`
    );
  }

  // Create a proper chat request handler
  // Derive chat participant id & name dynamically from package.json contributions (allows env-driven build customization)
  console.log(
    `💬 Registering chat participant "${contributedId}" (mention @${contributedName})...`
  );
  /**
   * Process a Copilot Chat request using the orchestrator workflow execution system.
   *
   * Routes requests through the complete workflow lifecycle:
   * - Classification: Determine user intent
   * - Planning: Map intent to agent actions
   * - Execution: Execute agent methods and gather results
   * - Formatting: Build user-friendly response
   *
   * @param {vscode.ChatRequest} request - Incoming chat message payload.
   * @param {vscode.ChatContext} _context - Conversation context (currently unused).
   * @param {vscode.ChatResponseStream} stream - Streaming interface for incremental markdown responses.
   * @param {vscode.CancellationToken} cancellationToken - Cancellation token for long-running operations.
   * @returns {Promise<void>} Resolves when response has been fully streamed.
   */
  const chatHandler: vscode.ChatRequestHandler = async (
    request: vscode.ChatRequest,
    _context: vscode.ChatContext,
    stream: vscode.ChatResponseStream,
    cancellationToken: vscode.CancellationToken
  ) => {
    try {
      // Show initial progress indicator
      stream.progress("Processing your request...");

      // Execute workflow through orchestrator (replaces legacy handle() method)
      const result = await orchestrator.executeWorkflow({
        question: request.prompt,
        topic: "general",
      });

      // Handle cancellation
      if (cancellationToken.isCancellationRequested) {
        stream.markdown(`⚠️ Request cancelled by user.\n`);
        return;
      }

      // Handle different workflow states
      if (result.state === "completed") {
        // Display formatted response
        if (result.formatted?.markdown) {
          stream.markdown(result.formatted.markdown);
        } else if (result.formatted?.message) {
          stream.markdown(result.formatted.message);
        } else {
          stream.markdown(`✅ Request completed successfully.\n`);
        }

        // Show workflow details in collapsible section
        if (result.metrics) {
          const durationSec = (result.metrics.totalDuration / 1000).toFixed(2);
          stream.markdown(
            `\n\n<details>\n<summary>Workflow Details (${durationSec}s)</summary>\n\n`
          );
          stream.markdown(`- **Workflow ID:** \`${result.workflowId}\`\n`);
          stream.markdown(
            `- **Classification:** ${
              result.metrics.classificationDuration || 0
            }ms\n`
          );
          stream.markdown(
            `- **Planning:** ${result.metrics.planningDuration || 0}ms\n`
          );
          stream.markdown(
            `- **Execution:** ${result.metrics.executionDuration || 0}ms\n`
          );
          stream.markdown(
            `- **Formatting:** ${result.metrics.formattingDuration || 0}ms\n`
          );
          stream.markdown(`\n</details>\n`);
        }
      } else if (result.state === "needs-clarification") {
        // User query is ambiguous, request clarification
        stream.markdown(`❓ **Need More Information**\n\n`);
        if (result.formatted?.message) {
          stream.markdown(result.formatted.message);
        } else {
          stream.markdown(
            `Your request needs clarification. Please provide more details about what you're looking for.\n`
          );
        }
      } else if (result.state === "failed") {
        // Workflow failed, show error with diagnostics
        stream.markdown(`❌ **Request Failed**\n\n`);
        if (result.error) {
          stream.markdown(`**Error:** ${result.error.message}\n\n`);
        }
        if (result.formatted?.message) {
          stream.markdown(result.formatted.message);
        }

        // Show diagnostic info in collapsible section
        if (result.metrics) {
          const durationSec = (result.metrics.totalDuration / 1000).toFixed(2);
          stream.markdown(
            `\n\n<details>\n<summary>Diagnostic Details (failed after ${durationSec}s)</summary>\n\n`
          );
          stream.markdown(`- **Workflow ID:** \`${result.workflowId}\`\n`);
          if (result.error) {
            stream.markdown(`- **Error:** ${result.error.message}\n`);
            if (result.error.stack) {
              stream.markdown(`\n\`\`\`\n${result.error.stack}\n\`\`\`\n`);
            }
          }
          stream.markdown(`\n</details>\n`);
        }
      } else {
        // Unexpected state
        stream.markdown(
          `⚠️ Workflow ended in unexpected state: ${result.state}\n`
        );
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      stream.markdown(`❌ **Unexpected Error:** ${message}\n`);
      console.error(`❌ Chat handler error:`, error);
    }
  };

  // Create the chat participant with the new API
  const chatParticipant = vscode.chat.createChatParticipant(
    contributedId,
    chatHandler
  );

  // Set an icon if available
  try {
    chatParticipant.iconPath = vscode.Uri.file(
      path.join(__dirname, "..", "..", "bin", "data", "icon.png")
    );
  } catch {
    // Icon is optional
  }

  context.subscriptions.push(chatParticipant);
  console.log(
    `✅ Chat participant "${contributedId}" registered successfully; mention is @${contributedName}`
  );
  console.log(
    `🔍 Verify activation event in package.json: onChatParticipant:${contributedId}`
  );

  // Register the manual tool invocation command
  const toolCommand = vscode.commands.registerCommand(
    `${commandPrefix}.invokeTool`,
    async () => {
      if (!tools.length) {
        vscode.window.showErrorMessage("No MCP tools are available.");
        return;
      }

      const toolPick = await vscode.window.showQuickPick(
        tools.map((tool) => ({
          label: tool.name,
          description: tool.description,
          tool,
        })),
        {
          title: "Select a tool to invoke",
          placeHolder: "Choose from available MCP tools",
          ignoreFocusOut: true,
        }
      );

      if (!toolPick) {
        return;
      }

      vscode.window.showInformationMessage(
        `Selected tool: ${toolPick.tool.name}`
      );
    }
  );

  context.subscriptions.push(toolCommand);

  // Register MCP server management commands
  const registerServerCommand = vscode.commands.registerCommand(
    `${commandPrefix}.registerServer`,
    async () => {
      console.log(`🔄 Manual MCP server registration triggered...`);
      try {
        vscode.window.showInformationMessage(
          `🔄 Registering UserContext MCP Server...`
        );

        // Register the provider (replaces legacy mcp.json registration)
        registerMcpProvider(serverUrl, token, includeAuthHeader, context);
        console.log(`✅ MCP provider registered`);

        vscode.window.showInformationMessage(
          `✅ UserContext MCP Server registered via provider! Server: ${
            serverUrl || "(embedded stdio)"
          }`
        );
        console.log(`✅ Manual registration complete`);
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        console.error(`❌ Manual registration failed:`, msg);
        vscode.window.showErrorMessage(
          `❌ Failed to register MCP server: ${msg}`
        );
      }
    }
  );

  const unregisterServerCommand = vscode.commands.registerCommand(
    `${commandPrefix}.unregisterServer`,
    async () => {
      console.log(`🔄 Manual MCP server unregistration triggered...`);
      try {
        // The provider system handles registration automatically
        // This command is kept for backwards compatibility but is now a no-op
        console.log(
          `ℹ️ Provider-based servers are managed automatically by VS Code`
        );
        vscode.window.showInformationMessage(
          `ℹ️ MCP Server is managed via provider - no manual unregistration needed`
        );
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        console.error(`❌ Unregistration command failed:`, msg);
        vscode.window.showErrorMessage(
          `❌ Failed to process unregister command: ${msg}`
        );
      }
    }
  );

  /**
   * Diagnostic command to surface actual vs expected ID/mention values.
   * Returns a structured object for programmatic inspection (tests / future UI).
   */
  const diagnoseIdsCommand = vscode.commands.registerCommand(
    `${commandPrefix}.diagnoseIds`,
    async () => {
      const envExtName = (process.env.EXTENSION_NAME || "").trim() || undefined;
      const envChatId =
        (process.env.MCP_CHAT_PARTICIPANT_ID || "").trim() || undefined;
      const envChatName =
        (process.env.MCP_CHAT_PARTICIPANT_NAME || "").trim() || undefined;

      // Expected derivation mirrors build script logic (capitalize first char + 'MCP' suffix for ID)
      const baseId = envChatId || envChatName || "usercontext";
      const expectedId =
        baseId.charAt(0).toUpperCase() + baseId.slice(1) + "MCP";
      const expectedName = envChatName || baseId;

      const actualMention = `@${contributedName}`;
      const expectedMention = `@${expectedName}`;

      const differences = {
        idMismatch: expectedId !== contributedId,
        nameMismatch: expectedName !== contributedName,
        mentionMismatch: expectedMention !== actualMention,
      };

      const diag = {
        env: {
          EXTENSION_NAME: envExtName,
          MCP_CHAT_PARTICIPANT_ID: envChatId,
          MCP_CHAT_PARTICIPANT_NAME: envChatName,
        },
        packageJson: {
          name: pkg.name,
          chatParticipant: {
            id: contributedId,
            name: contributedName,
          },
        },
        runtime: {
          createdChatParticipantId: contributedId,
          mention: actualMention,
        },
        expected: {
          id: expectedId,
          name: expectedName,
          mention: expectedMention,
        },
        differences,
      };

      const summary = `Chat ID: actual=${contributedId} expected=${expectedId}; mention: actual=${actualMention} expected=${expectedMention}`;
      vscode.window.showInformationMessage(summary);
      console.log(`🔍 diagnoseIds`, JSON.stringify(diag, null, 2));
      return diag;
    }
  );

  /**
   * Export user context data command.
   * Prompts user to select destination folder, then exports all categories.
   */
  const exportUserDataCommand = vscode.commands.registerCommand(
    `${commandPrefix}.exportUserData`,
    async () => {
      try {
        const destinationUri = await vscode.window.showOpenDialog({
          canSelectFiles: false,
          canSelectFolders: true,
          canSelectMany: false,
          openLabel: "Select Export Destination",
          title: "Export User Context Data",
        });

        if (!destinationUri || destinationUri.length === 0) {
          vscode.window.showInformationMessage("Export cancelled");
          return;
        }

        const destination = destinationUri[0].fsPath;

        await vscode.window.withProgress(
          {
            location: vscode.ProgressLocation.Notification,
            title: "Exporting User Context Data",
            cancellable: false,
          },
          async (progress) => {
            progress.report({ increment: 0, message: "Initializing..." });

            // Dynamically import UserContextAgent to avoid circular dependencies
            const { UserContextAgent } = await import(
              "@agent/userContextAgent"
            );
            const agent = new UserContextAgent();

            progress.report({
              increment: 30,
              message: "Exporting categories...",
            });

            const exportedCategories = agent.exportUserData(destination);

            progress.report({ increment: 70, message: "Finalizing..." });

            vscode.window.showInformationMessage(
              `✅ Successfully exported ${exportedCategories.length} categories to ${destination}`
            );
            console.log(
              `📤 Exported categories: ${exportedCategories.join(", ")}`
            );

            return exportedCategories;
          }
        );
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        vscode.window.showErrorMessage(
          `❌ Failed to export user data: ${message}`
        );
        console.error(`Export error:`, error);
      }
    }
  );

  /**
   * Import user context data command.
   * Prompts user to select source folder, then imports all categories into external userData root.
   */
  const importUserDataCommand = vscode.commands.registerCommand(
    `${commandPrefix}.importUserData`,
    async () => {
      try {
        const sourceUri = await vscode.window.showOpenDialog({
          canSelectFiles: false,
          canSelectFolders: true,
          canSelectMany: false,
          openLabel: "Select Import Source",
          title: "Import User Context Data",
        });

        if (!sourceUri || sourceUri.length === 0) {
          vscode.window.showInformationMessage("Import cancelled");
          return;
        }

        const source = sourceUri[0].fsPath;

        await vscode.window.withProgress(
          {
            location: vscode.ProgressLocation.Notification,
            title: "Importing User Context Data",
            cancellable: false,
          },
          async (progress) => {
            progress.report({ increment: 0, message: "Initializing..." });

            // Dynamically import UserContextAgent to avoid circular dependencies
            const { UserContextAgent } = await import(
              "@agent/userContextAgent"
            );
            const agent = new UserContextAgent();

            progress.report({
              increment: 30,
              message: "Importing categories...",
            });

            const importedCategories = agent.importUserData(source);

            progress.report({ increment: 70, message: "Finalizing..." });

            const reloadAction = "Reload Window";
            const response = await vscode.window.showInformationMessage(
              `✅ Successfully imported ${importedCategories.length} categories. Reload window to use the new data?`,
              reloadAction,
              "Later"
            );

            if (response === reloadAction) {
              await vscode.commands.executeCommand(
                "workbench.action.reloadWindow"
              );
            }

            console.log(
              `📥 Imported categories: ${importedCategories.join(", ")}`
            );

            return importedCategories;
          }
        );
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        vscode.window.showErrorMessage(
          `❌ Failed to import user data: ${message}`
        );
        console.error(`Import error:`, error);
      }
    }
  );

  context.subscriptions.push(
    toolCommand,
    registerServerCommand,
    unregisterServerCommand,
    diagnoseIdsCommand,
    exportUserDataCommand,
    importUserDataCommand
  );

  if (tools.length) {
    console.log(`✅ Successfully loaded ${tools.length} MCP tools`);
    vscode.window.showInformationMessage(
      `✅ UserContext MCP ready! Loaded ${tools.length} tools. Use @usercontext in Copilot Chat!`
    );
  } else {
    console.warn(`⚠️ No MCP tools were loaded`);
    vscode.window.showWarningMessage(
      `⚠️ UserContext MCP activated but no tools loaded. Check server connection.`
    );
  }

  console.log(`🎉 UserContext MCP Extension activation complete!`);
  console.log(`   📍 Server: ${serverUrl}`);
  console.log(`   🔧 Tools: ${tools.length}`);
  console.log(`   💬 Participant: @${contributedName}`);
}

/**
 * Check for and clean up orphaned MCP registrations from previous extension installations.
 * This helps handle the case where the extension was uninstalled but the mcp.json entry remains.
 *
 * @param {vscode.ExtensionContext} context - VS Code extension context
 * @returns {Promise<void>} Resolves when cleanup check is complete.
 */
async function cleanupOrphanedRegistrations(
  context: vscode.ExtensionContext
): Promise<void> {
  try {
    const lastCleanupKey = "lastUninstallCleanup";
    const currentVersion =
      (
        context.extension as unknown as
          | { packageJSON?: { version?: string } }
          | undefined
      )?.packageJSON?.version || "0.0.0-test";
    const lastCleanup = context.globalState.get<string>(lastCleanupKey);

    // Only run cleanup if we haven't already done it for this version
    if (lastCleanup !== currentVersion) {
      console.log(`🧹 Checking for orphaned registrations...`);

      const extensionPath = context.extensionPath;

      try {
        // Resolve the user's mcp.json path and read the current configuration
        const configPath = resolveMcpConfigPath();
        let raw = "";
        try {
          raw = await fsPromises.readFile(configPath, "utf8");
        } catch {
          // No config file - nothing to do
          console.log(`No global mcp.json found at ${configPath}`);
          await context.globalState.update(lastCleanupKey, currentVersion);
          return;
        }

        const parsed = JSON.parse(raw) as { servers?: Record<string, unknown> };
        const servers: Record<string, unknown> = parsed.servers ?? {};

        // Inspect servers and remove entries that clearly point to missing or non-extension files.
        for (const [id, def] of Object.entries(servers)) {
          try {
            const defAny = def as { type?: unknown; args?: unknown };
            if (
              defAny &&
              defAny.type === "stdio" &&
              Array.isArray(defAny.args)
            ) {
              const scriptArg = (defAny.args as string[]).find((a: string) =>
                a.includes("server/index.js")
              );
              if (scriptArg) {
                const candidatePath = path.isAbsolute(scriptArg)
                  ? scriptArg
                  : path.resolve(scriptArg);

                if (
                  !existsSync(candidatePath) ||
                  !candidatePath.startsWith(extensionPath)
                ) {
                  console.log(
                    `🧹 Found orphaned mcp.json server entry: ${id} -> ${scriptArg} (provider system manages automatically)`
                  );
                  // Note: With provider system, manual cleanup is no longer needed
                  // Legacy entries can be removed manually if needed
                }
              }
            }
          } catch (inner) {
            console.warn(
              `⚠️ Error inspecting server ${id}: ${
                inner instanceof Error ? inner.message : String(inner)
              }`
            );
          }
        }
      } catch (err) {
        console.warn(
          `⚠️ Could not inspect global mcp.json: ${
            err instanceof Error ? err.message : String(err)
          }`
        );
      }

      // Mark cleanup as done for this version
      await context.globalState.update(lastCleanupKey, currentVersion);
    }
  } catch (error) {
    console.warn(
      `⚠️ Could not check for orphaned registrations: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

/**
 * Deactivate the extension.
 * Currently a no-op because embedded server shutdown is handled via subscription dispose.
 */
export function deactivate(): void {
  console.log("👋 UserContext MCP Extension: Deactivating...");
  // Intentionally empty; resources cleaned up by disposables registered on activation.
}
