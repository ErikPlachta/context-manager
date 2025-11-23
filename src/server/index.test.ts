/**
 * Unit tests for MCP Server
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { createServer, config, getSkillRegistry } from './index.js';
import type { Server } from '@modelcontextprotocol/sdk/server/index.js';

describe('MCP Server', () => {
  let server: Server;

  // Create server once for all tests
  beforeAll(async () => {
    server = await createServer();
  });

  describe('createServer', () => {
    it('should create Server instance', () => {
      expect(server).toBeDefined();
    });

    it('should load skills on initialization', () => {
      const registry = getSkillRegistry();

      expect(registry.size).toBeGreaterThan(0);
      expect(registry.toolCount).toBeGreaterThan(0);
    });

    it('should have mcp-governance skill', () => {
      const registry = getSkillRegistry();

      const skill = registry.get('mcp-governance');
      expect(skill).toBeDefined();
      expect(skill?.tools.length).toBe(4);
    });
  });

  describe('config', () => {
    it('should have correct configuration', () => {
      expect(config.name).toBe('context-manager');
      expect(config.version).toBe('0.0.1');
      expect(config.description).toBeDefined();
    });
  });

  describe('skill registry', () => {
    it('should find tools by name', () => {
      const registry = getSkillRegistry();

      const skill = registry.findByTool('read_todo');
      expect(skill).toBeDefined();
      expect(skill?.id).toBe('mcp-governance');
    });
  });
});
