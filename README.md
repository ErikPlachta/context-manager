# Context Manager - MCP Server

Skill-driven MCP Server with VS Code Extension for intelligent context management.

## Project Status

**Phase 0: Foundation & Setup** ✅ Complete
**Phase 2: Skill System & mcp-governance** ✅ Complete

## Structure

```
context-manager/
├── src/
│   ├── server/
│   │   ├── index.ts
│   │   ├── index.test.ts        # Unit test (co-located)
│   │   ├── core/
│   │   │   ├── skill-registry.ts
│   │   │   └── skill-registry.test.ts
│   │   └── skills/
│   │       └── mcp-governance/
│   │           ├── index.ts
│   │           ├── tools.ts
│   │           ├── handlers.ts
│   │           └── governance.eval.ts  # Evalite test (co-located)
│   ├── shared/
│   │   └── file-system-tool/
│   │       ├── index.ts
│   │       └── index.test.ts    # Unit test (co-located)
│   └── types/
├── scripts/                      # Build scripts
└── dist/                         # Build outputs
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

## Next Steps

See [IMPLEMENTATION_PLAN.md](./IMPLEMENTATION_PLAN.md) for full roadmap.

**Next**: Phase 3 - Shared Services Layer
