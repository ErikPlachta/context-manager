/**
 * VS Code Extension Entry Point
 *
 * Manages MCP server lifecycle and VS Code integration.
 */

import * as vscode from 'vscode';
import { MCPClient } from './mcp-client.js';
import { registerCommands } from './commands.js';
import { join } from 'path';

let mcpClient: MCPClient | null = null;
let outputChannel: vscode.OutputChannel;

/**
 * Activate extension
 */
export async function activate(context: vscode.ExtensionContext): Promise<void> {
  console.log('[Extension] Activating Context Manager...');

  // Create output channel
  outputChannel = vscode.window.createOutputChannel('Context Manager');
  outputChannel.appendLine('Context Manager extension activated');

  try {
    // Get server path from extension
    const serverPath = getServerPath(context);

    // Create MCP client
    mcpClient = new MCPClient({
      serverPath,
      serverArgs: [],
      env: {
        NODE_ENV: 'production'
      }
    });

    // Connect to server
    await mcpClient.connect();
    outputChannel.appendLine('Connected to MCP server');

    // Register VS Code commands
    const commands = registerCommands(context, mcpClient, outputChannel);
    context.subscriptions.push(...commands);

    outputChannel.appendLine('Commands registered');

    // Show success notification
    vscode.window.showInformationMessage('Context Manager: MCP server started');
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    outputChannel.appendLine(`Failed to start: ${errorMessage}`);
    vscode.window.showErrorMessage(`Context Manager failed to start: ${errorMessage}`);
  }
}

/**
 * Deactivate extension
 */
export async function deactivate(): Promise<void> {
  console.log('[Extension] Deactivating Context Manager...');

  if (mcpClient) {
    try {
      await mcpClient.disconnect();
      outputChannel.appendLine('Disconnected from MCP server');
    } catch (error) {
      console.error('[Extension] Error during deactivation:', error);
    }
  }

  if (outputChannel) {
    outputChannel.dispose();
  }
}

/**
 * Get server executable path
 */
function getServerPath(context: vscode.ExtensionContext): string {
  // In development, use built server from workspace
  const devServerPath = join(context.extensionPath, '..', '..', 'dist', 'server', 'index.js');

  // In production, use bundled server
  const prodServerPath = join(context.extensionPath, 'dist', 'server', 'index.js');

  // Check if running in development
  const isDev = context.extensionMode === vscode.ExtensionMode.Development;

  const serverPath = isDev ? devServerPath : prodServerPath;

  console.log('[Extension] Server path:', serverPath);
  return serverPath;
}

/**
 * Get MCP client instance
 */
export function getMCPClient(): MCPClient | null {
  return mcpClient;
}

/**
 * Get output channel
 */
export function getOutputChannel(): vscode.OutputChannel {
  return outputChannel;
}
