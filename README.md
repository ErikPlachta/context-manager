# Context Manager - MCP Server

Skill-driven MCP Server with VS Code Extension for intelligent context management.

## Project Status

**Phase 0: Foundation & Setup** ✅ Complete
**Phase 1: Core MCP Server** ✅ Complete
**Phase 2: Skill System & mcp-governance** ✅ Complete
**Phase 3: Shared Services Layer** ✅ Complete (Proof of Concept)

**Current**: Phase 4 - VS Code Extension Integration

**Test Coverage**: 149 tests passing across 11 test files

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
│   └── client/                        # (Phase 4 - upcoming)
│       └── vs-code/                   # VS Code extension
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

*Note: Phase 3 services are proof of concept implementations with simulated/placeholder logic where production integrations would occur.*

## Next Steps

See [IMPLEMENTATION_PLAN.md](./IMPLEMENTATION_PLAN.md) for full roadmap.

**Next**: Phase 4 - VS Code Extension Integration
