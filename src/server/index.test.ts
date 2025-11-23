/**
 * Unit tests for MCP Server
 */

import { describe, it, expect } from 'vitest';
import { createServer, config, handleEchoTool } from './index.js';

describe('MCP Server', () => {
  describe('createServer', () => {
    it('should create McpServer instance', () => {
      const server = createServer();

      expect(server).toBeDefined();
      expect(server.server).toBeDefined();
    });

    it('should have correct server info', () => {
      const server = createServer();

      // Access underlying Server instance
      expect(server.server['_serverInfo'].name).toBe(config.name);
      expect(server.server['_serverInfo'].version).toBe(config.version);
    });
  });

  describe('config', () => {
    it('should have correct configuration', () => {
      expect(config.name).toBe('context-manager');
      expect(config.version).toBe('0.0.1');
      expect(config.description).toBeDefined();
    });
  });

  describe('handleEchoTool', () => {
    it('should echo the input message', async () => {
      const input = { message: 'Hello, World!' };
      const result = await handleEchoTool(input);

      expect(result).toBe('Echo: Hello, World!');
    });

    it('should handle empty messages', async () => {
      const input = { message: '' };
      const result = await handleEchoTool(input);

      expect(result).toBe('Echo: ');
    });

    it('should handle special characters', async () => {
      const input = { message: '!@#$%^&*()' };
      const result = await handleEchoTool(input);

      expect(result).toBe('Echo: !@#$%^&*()');
    });
  });
});
