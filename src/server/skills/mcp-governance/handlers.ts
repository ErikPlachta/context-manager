/**
 * MCP Governance Tool Handlers
 */

import { join } from 'path';
import { safeReadFile, safeWriteFile } from '../../../shared/file-system-tool/index.js';
import type { ReadTodoInput, UpdateTodoInput, ReadContextInput, UpdateContextInput } from './tools.js';

// Use WORKSPACE_DIR env var if available, fallback to cwd
const PROJECT_ROOT = process.env.WORKSPACE_DIR || process.cwd();

/**
 * Read TODO file
 */
export async function handleReadTodo(input: ReadTodoInput): Promise<string> {
  const fileName = input.file || 'TODO.md';
  const filePath = join(PROJECT_ROOT, fileName);

  console.error(`[mcp-governance] Reading ${fileName}`);

  const content = await safeReadFile(filePath, { throwIfNotExists: false });

  if (content === null) {
    return `File ${fileName} does not exist.`;
  }

  return `# ${fileName}\n\n${content}`;
}

/**
 * Update TODO file
 */
export async function handleUpdateTodo(input: UpdateTodoInput): Promise<string> {
  const { file, content } = input;
  const filePath = join(PROJECT_ROOT, file);

  console.error(`[mcp-governance] Updating ${file}`);

  await safeWriteFile(filePath, content);

  return `Successfully updated ${file}`;
}

/**
 * Read CONTEXT-SESSION file
 */
export async function handleReadContext(_input: ReadContextInput): Promise<string> {
  const fileName = 'CONTEXT-SESSION.md';
  const filePath = join(PROJECT_ROOT, fileName);

  console.error(`[mcp-governance] Reading ${fileName}`);

  const content = await safeReadFile(filePath, { throwIfNotExists: false });

  if (content === null) {
    return `File ${fileName} does not exist.`;
  }

  return `# ${fileName}\n\n${content}`;
}

/**
 * Update CONTEXT-SESSION file
 */
export async function handleUpdateContext(input: UpdateContextInput): Promise<string> {
  const { content } = input;
  const fileName = 'CONTEXT-SESSION.md';
  const filePath = join(PROJECT_ROOT, fileName);

  console.error(`[mcp-governance] Updating ${fileName}`);

  await safeWriteFile(filePath, content);

  return `Successfully updated ${fileName}`;
}
