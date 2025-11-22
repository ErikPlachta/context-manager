# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a minimal template system for managing Copilot Chat workflows through small, purpose-built context files. The system enforces deterministic workflows with low token usage by routing tasks through a decision tree to branch-specific playbooks.

## Core Concepts

### Authority Hierarchy
1. `CONTEXT-SESSION.md` - Current session facts that must be read and updated as work progresses
2. `TODO.md` - Single-source list of outstanding work (with `TODO-NEXT.md` and `TODO-BACKLOG.md` variants)
3. `.github/.instructions/decision-tree.md` - Routing map to branch playbooks

### Workflow Pattern
Read TODO → Update CONTEXT-SESSION → Route via decision tree → Execute smallest change → Verify → Semantic commit → Update TODO → Purge notes

### Guiding Principles
- Concision over grammar
- Smallest delta always
- Zero drift (regenerate from templates when structure drifts)
- Semantic git commits only
- Ask if unclear, never assume

## Development Commands

### Root Workspace
```bash
# Install all workspace dependencies
npm install --workspaces

# Build the CLI
npm run build:cli

# Clean CLI build outputs
npm run clean:cli

# Run the CLI (builds first)
npm run cli -- <command> [args] [flags]

# Example: Get CLI help
npm run cli -- --help
```

### CLI Workspace (`scripts/context-manager`)
```bash
# Build from CLI directory
npm run build

# Clean build outputs
npm run clean

# Lint (currently placeholder)
npm run lint
```

## Architecture

### Root Structure
- `.github/copilot-instructions.md` - Top-level guardrails consumed by Copilot Chat before every step
- `.github/.instructions/decision-tree.md` - Routing logic (nodes: path, classify, plan, prereq, execute, verify, commit, reconcile, recovery, conflict)
- `.github/instructions/branch/*` - Branch-specific playbooks referenced by decision tree
- `.github/.templates/` - Source templates for TODO and context files (never store project data here)
- `.github/.docs/` - Optional reference documentation

### CLI Structure (`scripts/context-manager`)
The TypeScript CLI scaffolds and manages template files. Built with npm workspaces.

**Entry Points:**
- `cli.ts` - Command dispatcher (init, sync, generate-path, validate, status, reset)
- `index.ts` - Public API exports for programmatic use

**Commands** (`commands/`):
- `init.command.ts` - Bootstrap new project with templates
- `sync-templates.command.ts` - Merge template updates
- `generate-path.command.ts` - Generate path routing docs
- `validate.command.ts` - Validate structure against routing map
- `status.command.ts` - Check for drift between templates and working files
- `reset.command.ts` - Reset templates to pristine state

**Features** (`features/`):
- `template-installer.ts` - Install templates to working directory
- `template-merge.ts` - Merge template updates without overwriting
- `template-reset.ts` - Reset to template defaults
- `path-routing-generator.ts` - Build routing maps from directory structure
- `doc-generator.ts` - Generate documentation from routing
- `structure-validator.ts` - Validate routing structure
- `drift-checker.ts` - Compare templates vs working files
- `context-session-manager.ts` - Manage CONTEXT-SESSION.md state
- `todo-manager.ts` - Manage TODO.md and variants

**Utils** (`utils/`):
- `fs-utils.ts` - Safe file system operations
- `template-loader.ts` - Load templates from directory
- `template-writer.ts` - Write templates with rendering
- `replace-utils.ts` - Apply template variable replacements
- `routing-utils.ts` - Build and validate routing maps
- `path-scanner.ts` - Scan directory structure
- `logger.ts` - Console logging utilities
- `error-utils.ts` - Error handling utilities

**Types** (`types/`):
- `config.types.ts` - Configuration interfaces
- `command.types.ts` - Command handler interfaces
- `feature.types.ts` - Feature result interfaces
- `template.types.ts` - Template file interfaces
- `routing.types.ts` - Routing map interfaces

### TypeScript Configuration
- **Target:** ES2020
- **Module:** CommonJS
- **Output:** `dist/` directory
- **Strict mode:** Enabled
- **Declarations:** Generated (`.d.ts` files)

## Decision Tree Nodes
0. path → Select routing path
1. classify → Categorize task type
2. plan → Create execution plan
3. prereq → Check prerequisites
4. execute → Perform changes
5. verify → Validate results
6. commit → Create semantic commit
7. reconcile → Update TODO/context
8. recovery → Handle failures
9. conflict → Resolve decision ambiguity

**Rules:** Stop at first match, never skip verify, ask if unclear

## Semantic Commit Format
Use format: `type: short summary`

Types: `docs`, `feat`, `fix`, `chore`, `refactor`

## Important Notes
- Templates in `.github/.templates/` are source files - never add project-specific data there
- Path-based routing relies on file locations and names, not repository metadata
- Keep TODO/context files terse to minimize token usage
- Regenerate TODO or context from templates when structure drifts
- The CLI compiles to `scripts/context-manager/dist/cli.js`
