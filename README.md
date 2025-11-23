# Context Manager - MCP Server

Skill-driven MCP Server with VS Code Extension for intelligent context management.

## Project Status

**Phase 0: Foundation & Setup** ✅ Complete

## Structure

```md
context-manager/
├── src/
│ ├── server/           # MCP Server (Orchestrator + Skills)
│ │ └── *.test.ts       # Unit tests (co-located)
│ ├── client/           # VS Code Extension (MCP Client)
│ ├── shared/           # Reusable utilities and tools
│ └── types/            # TypeScript type definitions
├── scripts/            # Build and development scripts
├── tests/
│ └── eval/             # Evalite LLM evaluation tests
└── dist/               # Build outputs
```

## Commands

```bash
# Build
pnpm build              # Build server + extension
pnpm build:server       # Build MCP server only
pnpm build:extension    # Build VS Code extension only
pnpm clean              # Clean build outputs

# Test
pnpm test               # Run all tests
pnpm test:unit          # Run Vitest tests
pnpm test:eval          # Run Evalite tests
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

**Phase 1**: Core MCP Server with `echo` tool
