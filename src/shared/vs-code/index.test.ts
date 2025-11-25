/**
 * Unit tests for VS Code Manager
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  VSCodeManager,
  getVSCodeManager,
  resetVSCodeManager,
  DEFAULT_VSCODE_CONFIG
} from './index.js';
import type { VSCodeCommand } from './types.js';

describe('VS Code Manager', () => {
  let manager: VSCodeManager;

  beforeEach(() => {
    manager = new VSCodeManager();
  });

  afterEach(() => {
    resetVSCodeManager();
  });

  describe('constructor', () => {
    it('should initialize with default config', () => {
      const config = manager.getConfig();

      expect(config.extensionId).toBe('context-manager');
      expect(config.version).toBe('0.0.1');
      expect(config.debug).toBe(false);
    });

    it('should accept custom config', () => {
      const customManager = new VSCodeManager({
        extensionId: 'my-extension',
        version: '1.0.0',
        debug: true
      });

      const config = customManager.getConfig();
      expect(config.extensionId).toBe('my-extension');
      expect(config.version).toBe('1.0.0');
      expect(config.debug).toBe(true);
    });
  });

  describe('registerCommand', () => {
    it('should register a command', () => {
      const command: VSCodeCommand = {
        id: 'test.command',
        title: 'Test Command',
        handler: () => 'test'
      };

      manager.registerCommand(command);

      expect(manager.getCommand('test.command')).toBe(command);
    });

    it('should throw error if command already registered', () => {
      const command: VSCodeCommand = {
        id: 'test.command',
        title: 'Test Command',
        handler: () => 'test'
      };

      manager.registerCommand(command);

      expect(() => manager.registerCommand(command)).toThrow(
        'Command already registered: test.command'
      );
    });
  });

  describe('unregisterCommand', () => {
    it('should unregister a command', () => {
      const command: VSCodeCommand = {
        id: 'test.command',
        title: 'Test Command',
        handler: () => 'test'
      };

      manager.registerCommand(command);
      const removed = manager.unregisterCommand('test.command');

      expect(removed).toBe(true);
      expect(manager.getCommand('test.command')).toBeUndefined();
    });

    it('should return false if command does not exist', () => {
      const removed = manager.unregisterCommand('nonexistent');
      expect(removed).toBe(false);
    });
  });

  describe('getCommands', () => {
    it('should return all registered commands', () => {
      const command1: VSCodeCommand = {
        id: 'test.command1',
        title: 'Test Command 1',
        handler: () => 'test1'
      };

      const command2: VSCodeCommand = {
        id: 'test.command2',
        title: 'Test Command 2',
        handler: () => 'test2'
      };

      manager.registerCommand(command1);
      manager.registerCommand(command2);

      const commands = manager.getCommands();
      expect(commands).toHaveLength(2);
      expect(commands).toContain(command1);
      expect(commands).toContain(command2);
    });
  });

  describe('getCommand', () => {
    it('should return command by ID', () => {
      const command: VSCodeCommand = {
        id: 'test.command',
        title: 'Test Command',
        handler: () => 'test'
      };

      manager.registerCommand(command);

      expect(manager.getCommand('test.command')).toBe(command);
    });

    it('should return undefined for non-existent command', () => {
      expect(manager.getCommand('nonexistent')).toBeUndefined();
    });
  });

  describe('executeCommand', () => {
    it('should execute a registered command', async () => {
      const command: VSCodeCommand = {
        id: 'test.command',
        title: 'Test Command',
        handler: (arg: string) => `Hello ${arg}`
      };

      manager.registerCommand(command);

      const result = await manager.executeCommand('test.command', 'World');
      expect(result).toBe('Hello World');
    });

    it('should throw error if command not found', async () => {
      await expect(manager.executeCommand('nonexistent')).rejects.toThrow(
        'Command not found: nonexistent'
      );
    });

    it('should pass multiple arguments to handler', async () => {
      const command: VSCodeCommand = {
        id: 'test.command',
        title: 'Test Command',
        handler: (a: number, b: number) => a + b
      };

      manager.registerCommand(command);

      const result = await manager.executeCommand('test.command', 5, 3);
      expect(result).toBe(8);
    });
  });

  describe('showNotification', () => {
    it('should show notification', () => {
      // This just logs, so we're testing that it doesn't throw
      expect(() =>
        manager.showNotification({
          type: 'info',
          message: 'Test message'
        })
      ).not.toThrow();
    });

    it('should show notification with actions', () => {
      expect(() =>
        manager.showNotification({
          type: 'warning',
          message: 'Test warning',
          actions: [
            { title: 'OK', action: () => {} },
            { title: 'Cancel', action: () => {} }
          ]
        })
      ).not.toThrow();
    });
  });

  describe('getWorkspaceInfo', () => {
    it('should return workspace info', () => {
      const info = manager.getWorkspaceInfo();

      expect(info.name).toBe('context-manager');
      expect(info.rootPath).toBeDefined();
      expect(info.folders).toHaveLength(1);
      expect(info.folders[0].name).toBe('context-manager');
    });
  });

  describe('setConfig', () => {
    it('should update configuration', () => {
      manager.setConfig({ debug: true, version: '2.0.0' });

      const config = manager.getConfig();
      expect(config.debug).toBe(true);
      expect(config.version).toBe('2.0.0');
      expect(config.extensionId).toBe('context-manager'); // Unchanged
    });
  });

  describe('enableDebug / disableDebug', () => {
    it('should enable debug mode', () => {
      manager.enableDebug();
      expect(manager.getConfig().debug).toBe(true);
    });

    it('should disable debug mode', () => {
      manager.enableDebug();
      manager.disableDebug();
      expect(manager.getConfig().debug).toBe(false);
    });
  });

  describe('clear', () => {
    it('should clear all commands', () => {
      const command: VSCodeCommand = {
        id: 'test.command',
        title: 'Test Command',
        handler: () => 'test'
      };

      manager.registerCommand(command);
      manager.clear();

      expect(manager.getCommands()).toHaveLength(0);
    });
  });

  describe('getVSCodeManager', () => {
    it('should return singleton instance', () => {
      const manager1 = getVSCodeManager();
      const manager2 = getVSCodeManager();

      expect(manager1).toBe(manager2);
    });

    it('should use config on first call', () => {
      const manager = getVSCodeManager({ debug: true });

      expect(manager.getConfig().debug).toBe(true);
    });
  });

  describe('DEFAULT_VSCODE_CONFIG', () => {
    it('should have correct default values', () => {
      expect(DEFAULT_VSCODE_CONFIG.extensionId).toBe('context-manager');
      expect(DEFAULT_VSCODE_CONFIG.version).toBe('0.0.1');
      expect(DEFAULT_VSCODE_CONFIG.debug).toBe(false);
    });
  });
});
