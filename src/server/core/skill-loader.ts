/**
 * Skill Loader
 *
 * Dynamically loads skills from the skills directory.
 */

import { readdir } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import type { Skill, SkillLoadResult } from '../../types/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Load all skills from the skills directory
 *
 * @param skillsDir - Path to skills directory (defaults to ../skills)
 * @returns Load result with loaded and failed skills
 */
export async function loadSkills(skillsDir?: string): Promise<SkillLoadResult> {
  const dir = skillsDir || join(__dirname, '../skills');
  const loaded: Skill[] = [];
  const failed: Array<{ path: string; error: Error }> = [];

  console.error(`[Loader] Skills directory: ${dir}`);
  console.error(`[Loader] __dirname: ${__dirname}`);

  try {
    const entries = await readdir(dir, { withFileTypes: true });
    console.error(`[Loader] Found ${entries.length} entries in skills directory`);

    for (const entry of entries) {
      if (!entry.isDirectory()) {
        console.error(`[Loader] Skipping non-directory: ${entry.name}`);
        continue;
      }

      const skillPath = join(dir, entry.name, 'index.js');
      console.error(`[Loader] Loading skill from: ${skillPath}`);

      try {
        // Convert Windows path to file:// URL for ES module import
        const skillUrl = pathToFileURL(skillPath).href;
        const module = await import(skillUrl);
        const skill: Skill = module.default || module.skill;

        if (!isValidSkill(skill)) {
          throw new Error('Invalid skill export: must export default or named "skill"');
        }

        // Initialize skill if it has init hook
        if (skill.init) {
          await skill.init();
        }

        loaded.push(skill);
        console.error(`[Loader] Loaded skill: ${skill.id} v${skill.version}`);
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        failed.push({ path: skillPath, error: err });
        console.error(`[Loader] Failed to load skill from ${skillPath}:`, err.message);
      }
    }
  } catch (error) {
    console.error(`[Loader] Failed to read skills directory:`, error);
  }

  return { loaded, failed };
}

/**
 * Validate skill object
 */
function isValidSkill(obj: any): obj is Skill {
  return (
    obj &&
    typeof obj === 'object' &&
    typeof obj.id === 'string' &&
    typeof obj.name === 'string' &&
    typeof obj.description === 'string' &&
    typeof obj.version === 'string' &&
    Array.isArray(obj.tools)
  );
}

/**
 * Unload skill (call cleanup hook)
 */
export async function unloadSkill(skill: Skill): Promise<void> {
  if (skill.cleanup) {
    try {
      await skill.cleanup();
      console.error(`[Loader] Cleaned up skill: ${skill.id}`);
    } catch (error) {
      console.error(`[Loader] Failed to cleanup skill ${skill.id}:`, error);
    }
  }
}
