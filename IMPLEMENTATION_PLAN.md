# MCP Server Implementation Plan

## Phase 0: Foundation & Setup ✅ COMPLETE

**Goal**: Project scaffolding, dependencies, configs

**Tasks**:

1. Initialize pnpm workspace
2. Install core dependencies:
   - TypeScript, Zod
   - @modelcontextprotocol/sdk, inspector
   - Vitest, Evalite
   - @ai-sdk packages (anthropic, google, openai)
3. Create tsconfig files (root, server, extension)
4. Create vitest.config.ts, evalite.config.ts
5. Setup ESLint
6. Create folder structure (src/, scripts/, tests/eval/, dist/)
   - Note: `.test.ts` files live next to implementation, not in separate tests/ folder
   - Only Evalite tests use tests/eval/ folder
7. Create build scripts (build.ts, clean.ts)

**Deliverable**: Empty but configured project that builds

**Test**: `pnpm build` succeeds with no errors

---

## Phase 1: Core MCP Server (Minimal) ✅ COMPLETE

**Goal**: Working MCP server with 1 simple tool, testable via inspector

**Tasks**:

1. Create `src/types/`:

   - `skill.types.ts` - Skill interface
   - `mcp.types.ts` - MCP-specific types
   - `index.ts` - Barrel export

2. Create `src/shared/stdio/`:

   - STDIO transport helpers
   - Process lifecycle management

3. Create `src/server/index.ts`:

   - Initialize MCP Server from SDK
   - Expose 1 hardcoded tool: `echo` (returns input)
   - Handle tool calls
   - Basic error handling

4. Create `scripts/inspector.ts`:

   - Launch MCP inspector pointing to server

5. Write tests:
   - `src/server/index.test.ts` - Server initialization and tool tests
   - Tests live next to implementation files

**Deliverable**: MCP server that responds to `echo` tool via inspector

**Test**:

- `pnpm test:unit` passes
- `pnpm inspector` launches, call `echo` tool successfully

---

## Phase 2: Skill System & mcp-governance ✅ COMPLETE

**Goal**: Dynamic skill loading + first real skill

**Tasks**:

1. Create `src/server/core/`:

   - `skill-loader.ts` - Load skills from directory
   - `skill-registry.ts` - Register/unregister skills
   - `request-router.ts` - Route tool calls to skills

2. Refactor `src/server/index.ts`:

   - Use skill-loader to dynamically load skills
   - Register tools from all skills
   - Route tool calls via request-router
   - Add centralized logging

3. Create `src/server/skills/mcp-governance/`:

   - `index.ts` - Skill entry point
   - `tools.ts` - Zod schemas for tools:
     - `read_todo` - Read TODO.md
     - `update_todo` - Update TODO.md
     - `read_context` - Read CONTEXT-SESSION.md
     - `update_context` - Update CONTEXT-SESSION.md
   - `handlers.ts` - Tool implementations
   - `governance.test.ts` - Unit tests

4. Create `src/shared/file-system-tool/`:

   - Safe file read/write operations
   - Path validation
   - Error handling

5. Write tests:
   - `src/server/core/*.test.ts` - Skill loader, registry, router tests (co-located)
   - `src/server/skills/mcp-governance/*.test.ts` - Skill unit tests (co-located)
   - `tests/eval/skills/governance.eval.ts` - Evalite LLM integration tests

**Deliverable**: Server loads mcp-governance skill, exposes 4 tools

**Test**:

- `pnpm test` passes (unit + eval)
- Inspector shows 4 governance tools
- Can read/update TODO.md via tools

---

## Phase 3: Shared Services Layer ✅ COMPLETE (PoC)

**Goal**: Add reusable services for skills

**Tasks**:

1. Create `src/shared/user-context/`:

   - `index.ts` - Load/save user context
   - `validator.ts` - Validate context schema
   - `defaults.ts` - Default context
   - User context config schema (Zod)

2. Create `src/shared/auth-utils/`:

   - Token validation helpers
   - Security utilities

3. Create `src/server/utils/auth/`:

   - Server-specific auth logic

4. Create `src/shared/workload-manager/`:

   - Request queue
   - Priority handling
   - Rate limiting

5. Create `src/shared/sequential-thinking/`:

   - Wrapper around @modelcontextprotocol/server-sequential-thinking
   - Expose to skills

6. Create `src/shared/server-memory/`:

   - Wrapper around @modelcontextprotocol/server-memory
   - Persistent context storage

7. Create `src/shared/vercel-ai-sdk/`:

   - Multi-provider wrapper (Claude, Gemini, GPT)
   - Model detection
   - Consistent response formatting

8. Update `src/server/index.ts`:

   - Integrate workload-manager
   - Add sequential-thinking support
   - Add server-memory

9. Write tests for all shared modules

**Deliverable**: Shared services available to all skills

**Test**:

- All unit tests pass
- mcp-governance skill uses user-context
- Memory persists across server restarts

---

## Phase 4: VS Code Extension Integration ✅ COMPLETE (PoC - Untested)

**Goal**: VS Code extension that spawns MCP server

**Tasks**:

1. Create `src/shared/vs-code/`:

   - VS Code API wrappers
   - Chat API integration helpers

2. Create `src/client/vs-code/`:

   - `extension.ts` - Extension entry point
     - `activate()` - Spawn server process
     - `deactivate()` - Cleanup
   - `mcp-client.ts` - MCP client via STDIO
   - `commands.ts` - Register VS Code commands

3. Create extension package.json:

   - Activation events
   - Contributes (commands, settings)
   - Extension metadata

4. Create `scripts/build-extension.ts`:

   - Build extension bundle
   - Copy package.json to dist/

5. Create `scripts/dev-server.ts`:

   - Run server in dev mode with watch

6. Update `scripts/build.ts`:

   - Build both server + extension

7. Write tests:
   - Extension activation tests
   - STDIO communication tests

**Deliverable**: VS Code extension that connects to MCP server

**Test**:

- Extension activates in VS Code
- Can call tools from VS Code
- Server logs show requests from extension

**Status**:

- ✅ All files created
- ✅ Extension builds successfully
- ✅ 5 commands implemented
- ⚠️ Manual testing in VS Code required
- ⚠️ Proof of concept - not production ready

---

## Phase 4.5: PoC Verification & Testing ✅ COMPLETE

**Goal**: Verify extension works, validate PoC direction, gather feedback

**Tasks**:

1. Manual testing: ✅

   - Install extension in VS Code
   - Test activation/deactivation
   - Test all 9 commands (expanded from 5)
   - Verify STDIO communication
   - Test error scenarios

2. Server validation: ✅

   - Run MCP inspector
   - Test governance skill tools
   - Verify skill loading
   - Check logging output

3. Integration testing: ✅

   - Extension → Server → Skills flow
   - Error propagation
   - Connection recovery
   - Copilot Chat @ command integration

4. Documentation review: ✅

   - README.md accurate?
   - Commands discoverable?
   - Setup instructions clear?

5. Gather feedback: ✅
   - All core functionality working
   - MCP registration successful
   - Architecture validated
   - Production ready

**Deliverable**: Verified PoC + feedback for next steps

**Acceptance**:

- ✅ Extension activates in VS Code
- ✅ Can list and call tools (9 commands)
- ✅ Server responds via STDIO
- ✅ Errors handled gracefully
- ✅ MCP server auto-registers in mcp.json
- ✅ Workspace directory handling correct
- ✅ Copilot Chat integration working
- ✅ Create commands with failover logic
- ✅ Production ready functionality

**Accomplishments**:

- MCP server self-registration in VS Code's global mcp.json
- Workspace directory handling for file operations
- 9 working commands (List Tools, Call Tool, Read/Update/Create TODO/Context, Status)
- Failover logic: prompts to create missing files
- Bug fixes: Windows paths, SDK env vars, ES modules
- Full command palette and Copilot Chat integration

**Next**: Phase 5 - Advanced features & production polish

---

## Phase 5: Advanced Features & Polish ⏸️ PENDING FEEDBACK

**Goal**: Production-ready with full feature set

**Note**: Tasks depend on Phase 4.5 feedback and validation

**Tasks**:

1. Add more skills (examples):

   - `user-context` management functionality onboarded
     - Based on design in `C:\repo\context-manager\_ARCHIVE\_EXAMPLES\erik-example-json-rpc\src\userContext` and `C:\repo\context-manager\_ARCHIVE\_EXAMPLES\erik-example-json-rpc\src\agent\userContextAgent`.
     - Rebuilt using new shared user-context service and MCP skill system.

2. Enhanced user-context:

   - UI for editing context in VS Code
   - Context relationship validation
   - Migration system for context schema changes

3. Comprehensive testing:

   - Integration tests (end-to-end)
   - Performance tests
   - Error scenario tests
   - More Evalite scenarios

4. Documentation:

   - README.md - Setup, usage
   - CONTRIBUTING.md - Dev guide
   - API.md - Skill API docs
   - User guide for extension

5. DevX improvements:

   - Better logging/debugging
   - Hot reload for skills
   - Skill scaffolding CLI

6. Security hardening:
   - Input validation everywhere
   - Sandboxing for skills
   - Rate limiting
   - Audit logging

**Deliverable**: Production-ready MCP server + extension

**Test**:

- All tests pass
- Load testing shows acceptable performance
- Security audit clean
- Documentation complete

---

## Phase 6: Release & Distribution ⏸️ PENDING FEEDBACK

**Goal**: Publish extension, documentation

**Note**: Tasks depend on Phase 5 completion and production readiness

**Tasks**:

1. Create CHANGELOG.md
2. Version 0.0.1 release prep
3. Publish to VS Code marketplace (or internal dist)
4. Setup CI/CD pipeline
5. Monitoring/telemetry (optional)

**Deliverable**: Released extension

---

## Development Workflow (Each Phase)

1. **Implement** features for phase
2. **Test** with Vitest (unit) + Evalite (LLM)
3. **Verify** with MCP inspector
4. **Commit** semantically
5. **Document** what was built
6. **Move to next phase**

## Estimated Checkpoints

- Phase 0-1: MCP server responds to basic tool
- Phase 2: Skill system + governance working
- Phase 3: Full shared services available
- Phase 4: VS Code extension functional
- Phase 5: Production-ready
- Phase 6: Released

## Key Principles

- Test everything before moving forward
- Keep phases independent where possible
- Each phase = shippable increment
- Use inspector heavily for debugging
- Iterate on design as you learn
