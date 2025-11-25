# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Development Commands

```bash
# Build (uses esbuild via scripts)
pnpm build              # Build both server + extension
pnpm build:server       # Build MCP server only (dist/server/)
pnpm build:extension    # Build VS Code extension only (dist/client/)
pnpm package            # Create VSIX package for extension installation
pnpm clean              # Remove dist/ and build artifacts

# Testing
pnpm test               # Run all tests (unit + evalite)
pnpm test:unit          # Run Vitest tests (*.test.ts files)
pnpm test:eval          # Run Evalite LLM tests (*.eval.ts files)
pnpm test:watch         # Vitest watch mode
pnpm typecheck          # Type check without emitting

# Development
pnpm dev                # Run server in watch mode
pnpm inspector          # Launch MCP inspector for testing tools
pnpm lint               # ESLint check
pnpm lint:fix           # ESLint auto-fix
```

**Running Single Tests:**

```bash
# Vitest - run specific test file
pnpm test:unit src/server/core/skill-registry.test.ts

# Vitest - filter by test name
pnpm test:unit -t "skill registration"
```

## Architecture Overview

### MCP Server + Skill System

This is a **Model Context Protocol (MCP)** server with a modular skill-based architecture:

1. **Server** (`src/server/index.ts`) - MCP server entry point

   - Initializes MCP Server from `@modelcontextprotocol/sdk`
   - Uses STDIO transport for communication
   - Dynamically loads and registers skills at startup

2. **Skill System** (`src/server/core/`) - Dynamic plugin architecture

   - **skill-loader.ts** - Discovers and loads skills from `src/server/skills/`
   - **skill-registry.ts** - Manages skill lifecycle and tool registration
   - **request-router.ts** - Routes MCP tool calls to appropriate skill handlers
   - Skills are **black boxes** - they don't communicate with each other, only through the server

3. **Skill Interface** (`src/types/skill.types.ts`)

   ```typescript
   interface Skill {
     id: string; // Unique identifier
     name: string; // Human-readable name
     description: string; // Capability description
     version: string; // Semver version
     tools: MCPToolRegistration[]; // MCP tools provided
     init?: () => Promise<void>; // Optional setup hook
     cleanup?: () => Promise<void>; // Optional teardown hook
   }
   ```

4. **Skills** (`src/server/skills/`) - Modular tool providers

   - Each skill lives in its own directory: `src/server/skills/<skill-name>/`
   - Must export a default `Skill` object
   - Example structure:
     ```
     mcp-governance/
     ├── index.ts       # Skill entry point (exports Skill object)
     ├── tools.ts       # Zod schemas for tool inputs
     ├── handlers.ts    # Tool implementation logic
     └── governance.eval.ts  # Evalite tests (optional)
     ```

5. **Tool Flow**
   - LLM/Client → MCP Server → skill-loader → skill-registry → request-router → Skill Handler

### VS Code Extension

**Location:** `src/client/vs-code/`

- **extension.ts** - Lifecycle (activate/deactivate), spawns MCP server via STDIO
- **mcp-client.ts** - Wrapper around `StdioClientTransport` from MCP SDK
- **mcp-registration.ts** - Auto-registers server in VS Code's global `mcp.json`
- **commands.ts** - 9 VS Code commands that call MCP tools

**Key Feature:** Extension passes `WORKSPACE_DIR` env var to server so file operations work in correct workspace directory.

### Shared Services

**Location:** `src/shared/`

**Note:** These are **Proof of Concept** implementations with placeholder logic.

- **file-system-tool/** - Safe file read/write with path validation
- **user-context/** - User preferences and project context management
- **workload-manager/** - Request queue, priority handling, rate limiting
- **sequential-thinking/** - Extended thinking wrapper for AI models
- **server-memory/** - In-memory caching with TTL
- **vercel-ai-sdk/** - Multi-provider AI model wrapper (Claude, GPT, Gemini)
- **auth-utils/** - Authentication utilities (API key, OAuth placeholders)
- **stdio/** - STDIO transport helpers for MCP communication

## Project-Specific Patterns

### Test Co-location

- **Unit tests** (`*.test.ts`) live **next to** implementation files, not in separate `tests/` folder
- **Evalite tests** (`*.eval.ts`) live next to the skill/feature being tested
- Example: `src/server/core/skill-registry.ts` → `src/server/core/skill-registry.test.ts`

### ES Modules

- Project uses ES modules (`"type": "module"` in package.json)
- All imports must include `.js` extension: `import { foo } from './bar.js'`
- Use `pathToFileURL()` for dynamic imports on Windows (see `skill-loader.ts`)

### Build System

- Uses custom build scripts (`scripts/build*.ts`) with esbuild
- Server builds to: `dist/server/`
- Extension builds to: `dist/client/`
- Extension packaging creates `context-manager-0.0.3.vsix` at root

### Governance Files

- **TODO.md** - Project tasks and roadmap (managed by mcp-governance skill)
- **CONTEXT-SESSION.md** - Current work context (managed by mcp-governance skill)
- These files are **first-class citizens** - tools can read/write them for context management

### Windows Compatibility

- Skill loader uses `pathToFileURL()` for ES module imports (fixes Windows path issues)
- Server needs `dist/server/package.json` with `{"type": "module"}` for proper ES module handling

## Key Files to Understand

1. **src/types/skill.types.ts** - Core skill interface
2. **src/server/index.ts** - Server initialization and skill loading
3. **src/server/core/skill-loader.ts** - How skills are discovered
4. **src/server/skills/mcp-governance/** - Reference skill implementation
5. **src/client/vs-code/extension.ts** - Extension lifecycle and server spawning
6. **IMPLEMENTATION_PLAN.md** - Full project roadmap (Phases 0-6)

## Current State

- **Status:** Production ready - Phase 4.5 complete
- **Test Coverage:** 149 passing tests
- **Extension:** Fully functional, verified in VS Code, works with Copilot Chat
- **Next:** Phase 5 - Data-driven architecture, enhanced user-context, new skills
