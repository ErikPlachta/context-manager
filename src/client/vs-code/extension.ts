/**
 * VS Code Extension Entry Point
 *
 * Manages MCP server lifecycle and VS Code integration.
 */

import * as vscode from 'vscode';
import { MCPClient } from './mcp-client.js';
import { registerCommands } from './commands.js';
import { ensureRegistration, removeRegistration } from './mcp-registration.js';
import { join } from 'path';
import { existsSync } from 'fs';

let mcpClient: MCPClient | null = null;
let outputChannel: vscode.OutputChannel;

const MCP_SERVER_ID = 'context-manager';

/**
 * Activate extension
 */
export async function activate(context: vscode.ExtensionContext): Promise<void> {
  const log = (msg: string) => {
    console.log(`[Extension] ${msg}`);
    if (outputChannel) outputChannel.appendLine(msg);
  };

  console.log('[Extension] === ACTIVATION START ===');

  try {
    // Create output channel
    outputChannel = vscode.window.createOutputChannel('Context Manager');
    log('='.repeat(60));
    log('Context Manager Extension Activating');
    log('='.repeat(60));

    // Get server path
    log('Step 1: Getting server path...');
    const serverPath = getServerPath(context);
    log(`  Extension mode: ${context.extensionMode === vscode.ExtensionMode.Development ? 'Development' : 'Production'}`);
    log(`  Extension path: ${context.extensionPath}`);
    log(`  Server script: ${serverPath}`);

    // Verify server exists
    log('Step 2: Verifying server file...');
    const exists = existsSync(serverPath);
    log(`  File exists: ${exists}`);
    if (!exists) {
      throw new Error(`Server script not found at: ${serverPath}`);
    }

    // Get workspace directory
    const workspaceDir = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || process.cwd();
    log(`Step 2.5: Workspace directory: ${workspaceDir}`);

    // Create MCP client
    log('Step 3: Creating MCP client...');
    log(`  Command: node`);
    log(`  Args: ${JSON.stringify([serverPath])}`);

    mcpClient = new MCPClient({
      serverPath: 'node',
      serverArgs: [serverPath],
      env: {
        NODE_ENV: 'production',
        WORKSPACE_DIR: workspaceDir
      },
      onStderr: (data) => {
        data.split('\n').forEach(line => {
          if (line.trim()) log(`  [Server] ${line}`);
        });
      },
      onLog: (msg) => log(msg)
    });
    log('  Client created successfully');

    // Connect to server
    log('Step 4: Connecting to MCP server...');
    await mcpClient.connect();
    log('  Connected successfully!');

    // Register MCP server in VS Code's global mcp.json
    log('Step 5: Registering MCP server globally...');
    try {
      const mcpConfigPath = await ensureRegistration({
        id: MCP_SERVER_ID,
        command: 'node',
        args: [serverPath],
        env: {
          NODE_ENV: 'production',
          WORKSPACE_DIR: workspaceDir
        }
      });
      log(`  Registered in: ${mcpConfigPath}`);
    } catch (error) {
      log(`  Warning: Failed to register MCP server: ${error instanceof Error ? error.message : String(error)}`);
    }

    // Register VS Code commands
    const commands = registerCommands(context, mcpClient, outputChannel);
    context.subscriptions.push(...commands);

    outputChannel.appendLine('Commands registered');

    // Show success notification
    vscode.window.showInformationMessage('Context Manager: MCP server started & registered');
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

  // Unregister from global mcp.json
  try {
    await removeRegistration(MCP_SERVER_ID);
    console.log('[Extension] Unregistered from mcp.json');
  } catch (error) {
    console.error('[Extension] Failed to unregister:', error);
  }

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
  const devServerPath = join(context.extensionPath, '..', '..', 'dist', 'server', 'server', 'index.js');

  // In production, use bundled server
  const prodServerPath = join(context.extensionPath, 'dist', 'server', 'server', 'index.js');

  // Check if running in development
  const isDev = context.extensionMode === vscode.ExtensionMode.Development;

  const serverPath = isDev ? devServerPath : prodServerPath;

  console.log('[Extension] Extension mode:', isDev ? 'Development' : 'Production');
  console.log('[Extension] Development server path would be:', devServerPath);
  console.log('[Extension] Production server path would be:', prodServerPath);
  console.log('[Extension] Selected server path:', serverPath);

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
