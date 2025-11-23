/**
 * VS Code Integration Module
 *
 * Provides utilities for VS Code extension integration.
 * This module helps bridge the MCP server with VS Code extension APIs.
 */

import type {
  VSCodeCommand,
  VSCodeConfig,
  NotificationOptions,
  WorkspaceInfo
} from './types.js';

/**
 * Default VS Code configuration
 */
export const DEFAULT_VSCODE_CONFIG: VSCodeConfig = {
  extensionId: 'context-manager',
  version: '0.0.1',
  debug: false
};

/**
 * VS Code Manager
 */
export class VSCodeManager {
  private config: VSCodeConfig;
  private commands: Map<string, VSCodeCommand> = new Map();

  constructor(config: Partial<VSCodeConfig> = {}) {
    this.config = { ...DEFAULT_VSCODE_CONFIG, ...config };
  }

  /**
   * Register a command
   */
  registerCommand(command: VSCodeCommand): void {
    if (this.commands.has(command.id)) {
      throw new Error(`Command already registered: ${command.id}`);
    }

    this.commands.set(command.id, command);

    if (this.config.debug) {
      console.log(`[VSCode] Registered command: ${command.id}`);
    }
  }

  /**
   * Unregister a command
   */
  unregisterCommand(commandId: string): boolean {
    const removed = this.commands.delete(commandId);

    if (removed && this.config.debug) {
      console.log(`[VSCode] Unregistered command: ${commandId}`);
    }

    return removed;
  }

  /**
   * Get all registered commands
   */
  getCommands(): VSCodeCommand[] {
    return Array.from(this.commands.values());
  }

  /**
   * Get command by ID
   */
  getCommand(commandId: string): VSCodeCommand | undefined {
    return this.commands.get(commandId);
  }

  /**
   * Execute a command
   */
  async executeCommand(commandId: string, ...args: any[]): Promise<any> {
    const command = this.commands.get(commandId);

    if (!command) {
      throw new Error(`Command not found: ${commandId}`);
    }

    if (this.config.debug) {
      console.log(`[VSCode] Executing command: ${commandId}`, args);
    }

    return await command.handler(...args);
  }

  /**
   * Show notification (simulated)
   */
  showNotification(options: NotificationOptions): void {
    const prefix = `[${options.type.toUpperCase()}]`;
    console.log(`${prefix} ${options.message}`);

    if (options.actions) {
      console.log(`Actions: ${options.actions.map(a => a.title).join(', ')}`);
    }
  }

  /**
   * Get workspace info (simulated)
   */
  getWorkspaceInfo(): WorkspaceInfo {
    // In production, this would use actual VS Code API
    // For now, return simulated workspace info
    return {
      name: 'context-manager',
      rootPath: process.cwd(),
      folders: [
        {
          name: 'context-manager',
          uri: process.cwd()
        }
      ]
    };
  }

  /**
   * Update configuration
   */
  setConfig(config: Partial<VSCodeConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration
   */
  getConfig(): VSCodeConfig {
    return { ...this.config };
  }

  /**
   * Enable debug mode
   */
  enableDebug(): void {
    this.config.debug = true;
  }

  /**
   * Disable debug mode
   */
  disableDebug(): void {
    this.config.debug = false;
  }

  /**
   * Clear all commands
   */
  clear(): void {
    this.commands.clear();
  }
}

// Export singleton instance
let globalManager: VSCodeManager | null = null;

/**
 * Get global VS Code manager instance
 */
export function getVSCodeManager(config?: Partial<VSCodeConfig>): VSCodeManager {
  if (!globalManager) {
    globalManager = new VSCodeManager(config);
  }
  return globalManager;
}

/**
 * Reset global instance (useful for testing)
 */
export function resetVSCodeManager(): void {
  globalManager = null;
}

// Re-export types
export type {
  VSCodeCommand,
  VSCodeConfig,
  NotificationOptions,
  WorkspaceInfo
} from './types.js';
