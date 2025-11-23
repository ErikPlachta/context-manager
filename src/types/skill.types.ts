/**
 * Skill System Type Definitions
 *
 * Defines the interface for modular skill providers that expose tools to the MCP server.
 */

import type { MCPToolRegistration } from './mcp.types.js';

/**
 * Skill Interface
 *
 * A skill is a modular component that provides one or more tools to the MCP server.
 * Skills are black boxes that don't interact with each other - all communication
 * goes through the Orchestrator (server).
 *
 * @example
 * ```ts
 * const mySkill: Skill = {
 *   id: 'my-skill',
 *   name: 'My Skill',
 *   description: 'Does something useful',
 *   version: '1.0.0',
 *   tools: [
 *     {
 *       definition: { name: 'my_tool', description: '...', inputSchema: z.object({...}) },
 *       handler: async (input) => { ... }
 *     }
 *   ]
 * };
 * ```
 */
export interface Skill {
  /** Unique skill identifier (kebab-case) */
  id: string;

  /** Human-readable skill name */
  name: string;

  /** Description of skill capabilities */
  description: string;

  /** Skill version (semver) */
  version: string;

  /** Tools provided by this skill */
  tools: MCPToolRegistration[];

  /**
   * Optional initialization hook
   * Called when skill is loaded by the server
   */
  init?(): Promise<void>;

  /**
   * Optional cleanup hook
   * Called when skill is unloaded or server shuts down
   */
  cleanup?(): Promise<void>;
}

/**
 * Skill Loader Result
 */
export interface SkillLoadResult {
  /** Successfully loaded skills */
  loaded: Skill[];

  /** Failed skill loads with errors */
  failed: Array<{
    path: string;
    error: Error;
  }>;
}

/**
 * Skill Registry
 * Manages registered skills
 */
export interface SkillRegistry {
  /** Register a skill */
  register(skill: Skill): void;

  /** Unregister a skill by ID */
  unregister(skillId: string): void;

  /** Get all registered skills */
  getAll(): Skill[];

  /** Get skill by ID */
  get(skillId: string): Skill | undefined;

  /** Find skill that provides a tool */
  findByTool(toolName: string): Skill | undefined;
}
