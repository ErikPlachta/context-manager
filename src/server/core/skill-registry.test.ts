/**
 * Unit tests for Skill Registry
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { SkillRegistry } from './skill-registry.js';
import type { Skill } from '../../types/index.js';
import { z } from 'zod';

describe('SkillRegistry', () => {
  let registry: SkillRegistry;

  const mockSkill1: Skill = {
    id: 'test-skill-1',
    name: 'Test Skill 1',
    description: 'A test skill',
    version: '1.0.0',
    tools: [
      {
        definition: {
          name: 'tool1',
          description: 'Tool 1',
          inputSchema: z.object({})
        },
        handler: async () => ({ result: 'tool1' })
      }
    ]
  };

  const mockSkill2: Skill = {
    id: 'test-skill-2',
    name: 'Test Skill 2',
    description: 'Another test skill',
    version: '1.0.0',
    tools: [
      {
        definition: {
          name: 'tool2',
          description: 'Tool 2',
          inputSchema: z.object({})
        },
        handler: async () => ({ result: 'tool2' })
      },
      {
        definition: {
          name: 'tool3',
          description: 'Tool 3',
          inputSchema: z.object({})
        },
        handler: async () => ({ result: 'tool3' })
      }
    ]
  };

  beforeEach(() => {
    registry = new SkillRegistry();
  });

  describe('register', () => {
    it('should register a skill successfully', () => {
      registry.register(mockSkill1);
      expect(registry.size).toBe(1);
      expect(registry.toolCount).toBe(1);
    });

    it('should register multiple skills', () => {
      registry.register(mockSkill1);
      registry.register(mockSkill2);
      expect(registry.size).toBe(2);
      expect(registry.toolCount).toBe(3);
    });

    it('should throw error if skill ID already registered', () => {
      registry.register(mockSkill1);
      expect(() => registry.register(mockSkill1)).toThrow('Skill already registered');
    });

    it('should throw error if tool name conflicts', () => {
      registry.register(mockSkill1);
      const conflictingSkill: Skill = {
        ...mockSkill2,
        id: 'conflicting-skill',
        tools: [
          {
            definition: {
              name: 'tool1', // Conflicts with mockSkill1
              description: 'Conflicting tool',
              inputSchema: z.object({})
            },
            handler: async () => ({})
          }
        ]
      };

      expect(() => registry.register(conflictingSkill)).toThrow('Tool "tool1" already registered');
    });
  });

  describe('unregister', () => {
    it('should unregister a skill successfully', () => {
      registry.register(mockSkill1);
      registry.unregister('test-skill-1');
      expect(registry.size).toBe(0);
      expect(registry.toolCount).toBe(0);
    });

    it('should throw error if skill not found', () => {
      expect(() => registry.unregister('nonexistent')).toThrow('Skill not found');
    });
  });

  describe('getAll', () => {
    it('should return all registered skills', () => {
      registry.register(mockSkill1);
      registry.register(mockSkill2);
      const skills = registry.getAll();
      expect(skills).toHaveLength(2);
      expect(skills).toContain(mockSkill1);
      expect(skills).toContain(mockSkill2);
    });

    it('should return empty array if no skills registered', () => {
      const skills = registry.getAll();
      expect(skills).toEqual([]);
    });
  });

  describe('get', () => {
    it('should get skill by ID', () => {
      registry.register(mockSkill1);
      const skill = registry.get('test-skill-1');
      expect(skill).toBe(mockSkill1);
    });

    it('should return undefined for non-existent skill', () => {
      const skill = registry.get('nonexistent');
      expect(skill).toBeUndefined();
    });
  });

  describe('findByTool', () => {
    it('should find skill by tool name', () => {
      registry.register(mockSkill1);
      registry.register(mockSkill2);
      const skill = registry.findByTool('tool2');
      expect(skill).toBe(mockSkill2);
    });

    it('should return undefined for non-existent tool', () => {
      const skill = registry.findByTool('nonexistent');
      expect(skill).toBeUndefined();
    });
  });
});
