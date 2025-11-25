/**
 * MCP Governance Skill
 *
 * Manages governance files like TODO.md and CONTEXT-SESSION.md
 */

import type { Skill } from '../../../types/index.js';
import {
  ReadTodoSchema,
  UpdateTodoSchema,
  ReadContextSchema,
  UpdateContextSchema
} from './tools.js';
import {
  handleReadTodo,
  handleUpdateTodo,
  handleReadContext,
  handleUpdateContext
} from './handlers.js';

/**
 * MCP Governance Skill
 */
const mcpGovernanceSkill: Skill = {
  id: 'mcp-governance',
  name: 'MCP Governance',
  description: 'Manages project governance files (TODO.md, CONTEXT-SESSION.md) for session tracking and task management',
  version: '1.0.0',

  tools: [
    {
      definition: {
        name: 'read_todo',
        description: 'Read TODO file contents (TODO.md, TODO-NEXT.md, or TODO-BACKLOG.md)',
        inputSchema: ReadTodoSchema
      },
      handler: handleReadTodo
    },
    {
      definition: {
        name: 'update_todo',
        description: 'Update TODO file with new content',
        inputSchema: UpdateTodoSchema
      },
      handler: handleUpdateTodo
    },
    {
      definition: {
        name: 'read_context',
        description: 'Read CONTEXT-SESSION.md file contents',
        inputSchema: ReadContextSchema
      },
      handler: handleReadContext
    },
    {
      definition: {
        name: 'update_context',
        description: 'Update CONTEXT-SESSION.md file with new content',
        inputSchema: UpdateContextSchema
      },
      handler: handleUpdateContext
    }
  ]
};

export default mcpGovernanceSkill;
