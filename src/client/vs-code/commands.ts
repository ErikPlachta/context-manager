/**
 * VS Code Commands
 *
 * Registers and implements extension commands.
 */

import * as vscode from 'vscode';
import { MCPClient } from './mcp-client.js';

/**
 * Register all VS Code commands
 */
export function registerCommands(
  _context: vscode.ExtensionContext,
  client: MCPClient,
  outputChannel: vscode.OutputChannel
): vscode.Disposable[] {
  const commands: vscode.Disposable[] = [];

  // List available tools
  commands.push(
    vscode.commands.registerCommand('context-manager.listTools', async () => {
      try {
        const tools = await client.listTools();
        const toolNames = tools.map(t => t.name).join('\n');

        outputChannel.appendLine('Available tools:');
        outputChannel.appendLine(toolNames);

        vscode.window.showInformationMessage(
          `Found ${tools.length} tool(s). Check output panel for details.`
        );
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        outputChannel.appendLine(`Error listing tools: ${errorMessage}`);
        vscode.window.showErrorMessage(`Failed to list tools: ${errorMessage}`);
      }
    })
  );

  // Call a tool (interactive)
  commands.push(
    vscode.commands.registerCommand('context-manager.callTool', async () => {
      try {
        // Get available tools
        const tools = await client.listTools();

        if (tools.length === 0) {
          vscode.window.showWarningMessage('No tools available');
          return;
        }

        // Show tool picker
        const toolNames = tools.map(t => ({
          label: t.name,
          description: t.description || ''
        }));

        const selected = await vscode.window.showQuickPick(toolNames, {
          placeHolder: 'Select a tool to call'
        });

        if (!selected) {
          return;
        }

        // Get tool arguments (simplified - prompt for JSON)
        const argsInput = await vscode.window.showInputBox({
          prompt: 'Enter tool arguments (JSON)',
          placeHolder: '{"arg1": "value1"}',
          value: '{}'
        });

        if (argsInput === undefined) {
          return;
        }

        let args = {};
        try {
          args = JSON.parse(argsInput);
        } catch {
          vscode.window.showErrorMessage('Invalid JSON arguments');
          return;
        }

        // Call tool
        outputChannel.appendLine(`Calling tool: ${selected.label}`);
        outputChannel.appendLine(`Arguments: ${JSON.stringify(args, null, 2)}`);

        const result = await client.callTool({
          name: selected.label,
          arguments: args
        });

        outputChannel.appendLine(`Result: ${JSON.stringify(result, null, 2)}`);
        vscode.window.showInformationMessage('Tool executed. Check output panel for results.');
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        outputChannel.appendLine(`Error calling tool: ${errorMessage}`);
        vscode.window.showErrorMessage(`Tool call failed: ${errorMessage}`);
      }
    })
  );

  // Read TODO
  commands.push(
    vscode.commands.registerCommand('context-manager.readTodo', async () => {
      try {
        const result = await client.callTool({
          name: 'read_todo',
          arguments: {}
        });

        const resultStr = JSON.stringify(result, null, 2);

        // Check if file doesn't exist
        if (resultStr.includes('does not exist')) {
          const create = await vscode.window.showInformationMessage(
            'TODO.md does not exist. Create it?',
            'Create',
            'Cancel'
          );

          if (create === 'Create') {
            await vscode.commands.executeCommand('context-manager.createTodo');
          }
          return;
        }

        outputChannel.appendLine('TODO.md contents:');
        outputChannel.appendLine(resultStr);
        outputChannel.show();
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        vscode.window.showErrorMessage(`Failed to read TODO: ${errorMessage}`);
      }
    })
  );

  // Update TODO
  commands.push(
    vscode.commands.registerCommand('context-manager.updateTodo', async () => {
      try {
        // Check if file exists first
        const checkResult = await client.callTool({
          name: 'read_todo',
          arguments: {}
        });

        const checkStr = JSON.stringify(checkResult, null, 2);

        if (checkStr.includes('does not exist')) {
          const create = await vscode.window.showInformationMessage(
            'TODO.md does not exist. Create it first?',
            'Create',
            'Cancel'
          );

          if (create === 'Create') {
            await vscode.commands.executeCommand('context-manager.createTodo');
          }
          return;
        }

        const content = await vscode.window.showInputBox({
          prompt: 'Enter TODO content',
          placeHolder: 'Task 1\\nTask 2\\nTask 3'
        });

        if (!content) {
          return;
        }

        const result = await client.callTool({
          name: 'update_todo',
          arguments: { file: 'TODO.md', content }
        });

        outputChannel.appendLine('TODO updated:');
        outputChannel.appendLine(JSON.stringify(result, null, 2));
        vscode.window.showInformationMessage('TODO updated successfully');
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        vscode.window.showErrorMessage(`Failed to update TODO: ${errorMessage}`);
      }
    })
  );

  // Read Context
  commands.push(
    vscode.commands.registerCommand('context-manager.readContext', async () => {
      try {
        const result = await client.callTool({
          name: 'read_context',
          arguments: {}
        });

        const resultStr = JSON.stringify(result, null, 2);

        if (resultStr.includes('does not exist')) {
          const create = await vscode.window.showInformationMessage(
            'CONTEXT-SESSION.md does not exist. Create it?',
            'Create',
            'Cancel'
          );

          if (create === 'Create') {
            await vscode.commands.executeCommand('context-manager.createContext');
          }
          return;
        }

        outputChannel.appendLine('CONTEXT-SESSION.md contents:');
        outputChannel.appendLine(resultStr);
        outputChannel.show();
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        vscode.window.showErrorMessage(`Failed to read context: ${errorMessage}`);
      }
    })
  );

  // Update Context
  commands.push(
    vscode.commands.registerCommand('context-manager.updateContext', async () => {
      try {
        // Check if file exists first
        const checkResult = await client.callTool({
          name: 'read_context',
          arguments: {}
        });

        const checkStr = JSON.stringify(checkResult, null, 2);

        if (checkStr.includes('does not exist')) {
          const create = await vscode.window.showInformationMessage(
            'CONTEXT-SESSION.md does not exist. Create it first?',
            'Create',
            'Cancel'
          );

          if (create === 'Create') {
            await vscode.commands.executeCommand('context-manager.createContext');
          }
          return;
        }

        const content = await vscode.window.showInputBox({
          prompt: 'Enter context content',
          placeHolder: 'Current session context...'
        });

        if (!content) {
          return;
        }

        const result = await client.callTool({
          name: 'update_context',
          arguments: { content }
        });

        outputChannel.appendLine('Context updated:');
        outputChannel.appendLine(JSON.stringify(result, null, 2));
        vscode.window.showInformationMessage('Context updated successfully');
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        vscode.window.showErrorMessage(`Failed to update context: ${errorMessage}`);
      }
    })
  );

  // Create TODO file
  commands.push(
    vscode.commands.registerCommand('context-manager.createTodo', async () => {
      try {
        const template = `# TODO

## Current Sprint
- [ ] Task 1
- [ ] Task 2

## Next
- [ ] Future task

## Backlog
- [ ] Backlog item`;

        const result = await client.callTool({
          name: 'update_todo',
          arguments: { file: 'TODO.md', content: template }
        });

        outputChannel.appendLine('TODO.md created:');
        outputChannel.appendLine(JSON.stringify(result, null, 2));
        vscode.window.showInformationMessage('TODO.md created successfully');
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        vscode.window.showErrorMessage(`Failed to create TODO: ${errorMessage}`);
      }
    })
  );

  // Create Context file
  commands.push(
    vscode.commands.registerCommand('context-manager.createContext', async () => {
      try {
        const template = `# Context Session

## Current Work
Describe what you're working on...

## Status
- Status item 1
- Status item 2

## Next Steps
- Next step 1
- Next step 2`;

        const result = await client.callTool({
          name: 'update_context',
          arguments: { content: template }
        });

        outputChannel.appendLine('CONTEXT-SESSION.md created:');
        outputChannel.appendLine(JSON.stringify(result, null, 2));
        vscode.window.showInformationMessage('CONTEXT-SESSION.md created successfully');
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        vscode.window.showErrorMessage(`Failed to create context: ${errorMessage}`);
      }
    })
  );

  // Show server status
  commands.push(
    vscode.commands.registerCommand('context-manager.status', async () => {
      const connected = client.isConnected();
      const status = connected ? '✓ Connected' : '✗ Disconnected';

      outputChannel.appendLine(`Server status: ${status}`);

      if (connected) {
        const tools = await client.listTools();
        vscode.window.showInformationMessage(
          `Context Manager: ${status} (${tools.length} tools available)`
        );
      } else {
        vscode.window.showWarningMessage(`Context Manager: ${status}`);
      }
    })
  );

  return commands;
}
