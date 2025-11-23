/**
 * Evalite tests for MCP Governance Skill
 *
 * These are LLM evaluation tests that verify the governance tools
 * work correctly in realistic scenarios.
 */

import { describe, it } from 'evalite';
import { handleReadTodo, handleUpdateTodo, handleReadContext, handleUpdateContext } from '../../../src/server/skills/mcp-governance/handlers.js';
import { safeWriteFile, safeReadFile } from '../../../src/shared/file-system-tool/index.js';
import { join } from 'path';
import { unlink } from 'fs/promises';

const TEST_DIR = process.cwd();

describe('MCP Governance Skill - Integration', () => {
  describe('TODO file operations', () => {
    it('should read TODO.md file', async () => {
      // Create a test TODO file
      const testContent = '# TODO\n\n- [ ] Task 1\n- [ ] Task 2';
      await safeWriteFile(join(TEST_DIR, 'TODO.md'), testContent);

      // Test reading
      const result = await handleReadTodo({});

      // Verify result contains the content
      if (!result.includes('Task 1') || !result.includes('Task 2')) {
        throw new Error('TODO content not properly read');
      }

      // Cleanup
      await unlink(join(TEST_DIR, 'TODO.md')).catch(() => {});
    });

    it('should update TODO.md file', async () => {
      const newContent = '# TODO\n\n- [x] Completed task\n- [ ] New task';

      // Update TODO file
      const updateResult = await handleUpdateTodo({
        file: 'TODO.md',
        content: newContent
      });

      // Verify update succeeded
      if (!updateResult.includes('Successfully updated')) {
        throw new Error('TODO update failed');
      }

      // Read back and verify
      const content = await safeReadFile(join(TEST_DIR, 'TODO.md'), { throwIfNotExists: false });

      if (content !== newContent) {
        throw new Error('TODO content does not match what was written');
      }

      // Cleanup
      await unlink(join(TEST_DIR, 'TODO.md')).catch(() => {});
    });

    it('should handle TODO-NEXT.md and TODO-BACKLOG.md', async () => {
      // Test TODO-NEXT.md
      await handleUpdateTodo({
        file: 'TODO-NEXT.md',
        content: '# Next Tasks\n\n- [ ] Urgent task'
      });

      const nextResult = await handleReadTodo({ file: 'TODO-NEXT.md' });

      if (!nextResult.includes('Urgent task')) {
        throw new Error('TODO-NEXT.md not handled correctly');
      }

      // Test TODO-BACKLOG.md
      await handleUpdateTodo({
        file: 'TODO-BACKLOG.md',
        content: '# Backlog\n\n- [ ] Future task'
      });

      const backlogResult = await handleReadTodo({ file: 'TODO-BACKLOG.md' });

      if (!backlogResult.includes('Future task')) {
        throw new Error('TODO-BACKLOG.md not handled correctly');
      }

      // Cleanup
      await unlink(join(TEST_DIR, 'TODO-NEXT.md')).catch(() => {});
      await unlink(join(TEST_DIR, 'TODO-BACKLOG.md')).catch(() => {});
    });
  });

  describe('Context file operations', () => {
    it('should read CONTEXT-SESSION.md file', async () => {
      // Create a test context file
      const testContent = '# Context\n\nSession information here';
      await safeWriteFile(join(TEST_DIR, 'CONTEXT-SESSION.md'), testContent);

      // Test reading
      const result = await handleReadContext({});

      // Verify result contains the content
      if (!result.includes('Session information')) {
        throw new Error('Context content not properly read');
      }

      // Cleanup
      await unlink(join(TEST_DIR, 'CONTEXT-SESSION.md')).catch(() => {});
    });

    it('should update CONTEXT-SESSION.md file', async () => {
      const newContent = '# Session Context\n\n## Current Work\n\nImplementing MCP server';

      // Update context file
      const updateResult = await handleUpdateContext({
        content: newContent
      });

      // Verify update succeeded
      if (!updateResult.includes('Successfully updated')) {
        throw new Error('Context update failed');
      }

      // Read back and verify
      const content = await safeReadFile(join(TEST_DIR, 'CONTEXT-SESSION.md'), { throwIfNotExists: false });

      if (content !== newContent) {
        throw new Error('Context content does not match what was written');
      }

      // Cleanup
      await unlink(join(TEST_DIR, 'CONTEXT-SESSION.md')).catch(() => {});
    });
  });

  describe('Error handling', () => {
    it('should handle reading non-existent TODO file gracefully', async () => {
      // Ensure file doesn't exist
      await unlink(join(TEST_DIR, 'TODO.md')).catch(() => {});

      // Should not throw, should return message
      const result = await handleReadTodo({});

      if (!result.includes('does not exist')) {
        throw new Error('Should indicate file does not exist');
      }
    });

    it('should handle reading non-existent CONTEXT file gracefully', async () => {
      // Ensure file doesn't exist
      await unlink(join(TEST_DIR, 'CONTEXT-SESSION.md')).catch(() => {});

      // Should not throw, should return message
      const result = await handleReadContext({});

      if (!result.includes('does not exist')) {
        throw new Error('Should indicate file does not exist');
      }
    });
  });

  describe('Round-trip operations', () => {
    it('should maintain content integrity through write-read cycle', async () => {
      const originalContent = `# TODO

## High Priority
- [ ] Fix critical bug
- [ ] Update documentation

## Low Priority
- [ ] Refactor code
- [ ] Add more tests`;

      // Write content
      await handleUpdateTodo({
        file: 'TODO.md',
        content: originalContent
      });

      // Read it back
      const readResult = await handleReadTodo({});

      // Verify content is preserved
      if (!readResult.includes('Fix critical bug') ||
          !readResult.includes('High Priority') ||
          !readResult.includes('Add more tests')) {
        throw new Error('Content not preserved through write-read cycle');
      }

      // Cleanup
      await unlink(join(TEST_DIR, 'TODO.md')).catch(() => {});
    });
  });
});
