/**
 * Skill Registry
 *
 * Manages registration and lookup of skills.
 */

import type { Skill, SkillRegistry as ISkillRegistry } from '../../types/index.js';

/**
 * Skill Registry Implementation
 */
export class SkillRegistry implements ISkillRegistry {
  private skills: Map<string, Skill> = new Map();
  private toolToSkillMap: Map<string, string> = new Map();

  /**
   * Register a skill
   */
  register(skill: Skill): void {
    if (this.skills.has(skill.id)) {
      throw new Error(`Skill already registered: ${skill.id}`);
    }

    // Validate unique tool names
    for (const tool of skill.tools) {
      const toolName = tool.definition.name;
      if (this.toolToSkillMap.has(toolName)) {
        const existingSkill = this.toolToSkillMap.get(toolName);
        throw new Error(`Tool "${toolName}" already registered by skill "${existingSkill}"`);
      }
    }

    // Register skill
    this.skills.set(skill.id, skill);

    // Map tools to skill
    for (const tool of skill.tools) {
      this.toolToSkillMap.set(tool.definition.name, skill.id);
    }

    console.error(`[Registry] Registered skill: ${skill.id} (${skill.tools.length} tools)`);
  }

  /**
   * Unregister a skill
   */
  unregister(skillId: string): void {
    const skill = this.skills.get(skillId);
    if (!skill) {
      throw new Error(`Skill not found: ${skillId}`);
    }

    // Remove tool mappings
    for (const tool of skill.tools) {
      this.toolToSkillMap.delete(tool.definition.name);
    }

    // Remove skill
    this.skills.delete(skillId);

    console.error(`[Registry] Unregistered skill: ${skillId}`);
  }

  /**
   * Get all registered skills
   */
  getAll(): Skill[] {
    return Array.from(this.skills.values());
  }

  /**
   * Get skill by ID
   */
  get(skillId: string): Skill | undefined {
    return this.skills.get(skillId);
  }

  /**
   * Find skill that provides a tool
   */
  findByTool(toolName: string): Skill | undefined {
    const skillId = this.toolToSkillMap.get(toolName);
    return skillId ? this.skills.get(skillId) : undefined;
  }

  /**
   * Get total number of registered skills
   */
  get size(): number {
    return this.skills.size;
  }

  /**
   * Get total number of registered tools across all skills
   */
  get toolCount(): number {
    return this.toolToSkillMap.size;
  }
}
