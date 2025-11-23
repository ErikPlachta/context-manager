/**
 * MCP Governance Tool Definitions
 */

import { z } from 'zod';

/**
 * read_todo tool schema
 */
export const ReadTodoSchema = z.object({
  file: z.enum(['TODO.md', 'TODO-NEXT.md', 'TODO-BACKLOG.md']).optional().describe('Which TODO file to read (defaults to TODO.md)')
});

export type ReadTodoInput = z.infer<typeof ReadTodoSchema>;

/**
 * update_todo tool schema
 */
export const UpdateTodoSchema = z.object({
  file: z.enum(['TODO.md', 'TODO-NEXT.md', 'TODO-BACKLOG.md']).describe('Which TODO file to update'),
  content: z.string().describe('New content for the TODO file')
});

export type UpdateTodoInput = z.infer<typeof UpdateTodoSchema>;

/**
 * read_context tool schema
 */
export const ReadContextSchema = z.object({});

export type ReadContextInput = z.infer<typeof ReadContextSchema>;

/**
 * update_context tool schema
 */
export const UpdateContextSchema = z.object({
  content: z.string().describe('New content for CONTEXT-SESSION.md')
});

export type UpdateContextInput = z.infer<typeof UpdateContextSchema>;
