# Context Manager - MCP Server

Skill-driven MCP Server with VS Code Extension for intelligent context management.

## Project Status

**Phase 0: Foundation & Setup** ✅ Complete
**Phase 1: Core MCP Server** ✅ Complete
**Phase 2: Skill System & mcp-governance** ✅ Complete
**Phase 3: Shared Services Layer** ✅ Complete (Proof of Concept)
**Phase 4: VS Code Extension Integration** ✅ Complete (Proof of Concept, Untested)

**Current**: Phase 4.5 - PoC Verification & Testing

**Test Coverage**: 149 tests passing across 11 test files
**Extension Build**: ✅ Builds successfully (manual testing required)

## Structure

```
context-manager/
├── src/
│   ├── server/
│   │   ├── index.ts                    # MCP Server entry point
│   │   ├── index.test.ts
│   │   ├── core/
│   │   │   ├── skill-loader.ts         # Dynamic skill loading
│   │   │   ├── skill-registry.ts       # Skill registration
│   │   │   ├── skill-registry.test.ts
│   │   │   └── request-router.ts       # Tool call routing
│   │   ├── skills/
│   │   │   └── mcp-governance/         # Governance skill (4 tools)
│   │   │       ├── index.ts
│   │   │       ├── tools.ts
│   │   │       ├── handlers.ts
│   │   │       └── governance.eval.ts
│   │   └── utils/
│   │       └── auth/                   # Server-side auth
│   │           ├── index.ts
│   │           └── index.test.ts
│   ├── shared/                         # Shared services (PoC)
│   │   ├── file-system-tool/           # Safe file operations
│   │   ├── user-context/               # User preferences & context
│   │   ├── workload-manager/           # Request queue & rate limiting
│   │   ├── sequential-thinking/        # Extended thinking wrapper
│   │   ├── server-memory/              # In-memory cache with TTL
│   │   ├── vercel-ai-sdk/              # AI model wrapper
│   │   ├── auth-utils/                 # Auth utilities (API key, OAuth)
│   │   ├── vs-code/                    # VS Code integration helpers
│   │   └── stdio/                      # STDIO transport
│   ├── types/
│   │   ├── mcp.types.ts               # MCP protocol types
│   │   └── skill.types.ts             # Skill interface
│   └── client/                        # VS Code Extension
│       └── vs-code/
│           ├── extension.ts           # Extension entry point
│           ├── mcp-client.ts          # MCP STDIO client
│           └── commands.ts            # VS Code commands (5 total)
├── scripts/                           # Build & dev scripts
└── dist/                              # Build outputs
```

**Testing Structure:**

- **Unit tests** (`*.test.ts`) - Live next to implementation
- **Evalite tests** (`*.eval.ts`) - Live next to skill/feature tested
- All tests co-located with code they test
- No separate test directories

## Commands

```bash
# Build
pnpm build              # Build server + extension
pnpm build:server       # Build MCP server only
pnpm build:extension    # Build VS Code extension only
pnpm clean              # Clean build outputs

# Test
pnpm test               # Run all tests (unit + eval)
pnpm test:unit          # Run Vitest tests (src/**/*.test.ts)
pnpm test:eval          # Run Evalite tests (src/**/*.eval.ts)
pnpm test:watch         # Watch mode

# Development
pnpm dev                # Run server in dev mode with watch
pnpm inspector          # Launch MCP inspector
pnpm typecheck          # Type check without build
pnpm lint               # Lint code
pnpm lint:fix           # Lint and fix
```

## Tech Stack

- **TypeScript** - Type-safe development
- **Zod** - Schema validation
- **Vitest** - Unit testing
- **Evalite** - LLM evaluation testing
- **pnpm** - Package management
- **@modelcontextprotocol/sdk** - MCP protocol implementation
- **Vercel AI SDK** - Multi-provider AI model support
  - @ai-sdk/anthropic (Claude)
  - @ai-sdk/google (Gemini)
  - @ai-sdk/openai (GPT)

## Shared Services (Phase 3 - PoC)

All shared services include TypeScript types, singleton patterns, and comprehensive tests:

- **user-context** - User preferences, project context, session management
- **workload-manager** - Request queuing, priority handling, rate limiting
- **sequential-thinking** - Extended reasoning wrapper for AI models
- **server-memory** - In-memory caching with TTL expiration
- **vercel-ai-sdk** - Multi-provider AI model interaction wrapper
- **auth-utils** - Authentication utilities (API key, OAuth)
- **vs-code** - VS Code extension integration utilities

_Note: Phase 3 services are proof of concept implementations with simulated/placeholder logic where production integrations would occur._

## VS Code Extension (Phase 4 - PoC, Untested)

Extension integrates MCP server with VS Code via STDIO communication:

**Components:**

- **extension.ts** - Lifecycle management (activate/deactivate)
- **mcp-client.ts** - STDIO client for server communication
- **commands.ts** - VS Code command palette integration

**Available Commands:**

1. `List Available Tools` - Show all MCP tools from server
2. `Call Tool` - Interactive tool execution
3. `Read TODO` - Read TODO.md via governance skill
4. `Update TODO` - Update TODO.md via governance skill
5. `Show Server Status` - Display connection status

**Status:** ✅ Builds successfully | ⚠️ Requires manual testing in VS Code

## Next Steps

See [IMPLEMENTATION_PLAN.md](./IMPLEMENTATION_PLAN.md) for full roadmap.

**Next Steps:**

**Phase 4.5 - Verification (Current):**

1. Manual extension testing in VS Code
2. Validate server ↔ extension communication
3. Test all 5 commands end-to-end
4. Gather feedback and questions
5. Identify gaps/issues

**After Verification:**

- **Phase 5**: Advanced features based on feedback
- **Production**: Remove PoC placeholders, real integrations
- **Pivot**: Architecture changes if needed
