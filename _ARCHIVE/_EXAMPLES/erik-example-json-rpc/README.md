# My Business MCP Extension

Customizable MCP server experience inside VS Code Copilot Chat — with User Context as the core feature.

## Overview

This extension embeds (or connects to) an MCP server and a small set of agents (orchestrator, data, database, clarification, and user-context). It focuses on:

- User Context: local and global domain knowledge that the agents use to answer questions and take actions.
- Customization: settings via VS Code Settings UI first, and via chat as a secondary path.
- Quality gates: 100% test coverage, strict JSDoc, generated docs.
- Migration safety: backwards-compatible aliases when we rename concepts (e.g., businessData → userContext).

## Installation and first-run

1. Install the VSIX (or from Marketplace when available).

2. Open Settings → Extensions → “My Business MCP Extension” and review:

- Server URL (leave blank to use the embedded server)
- Token (optional bearer token)
- Auto-register (adds/removes an entry in your global `mcp.json`)

3. First-run setup (performed automatically):

- Creates a hidden cache directory (e.g., `.usercontext-mcp-extension`) in two places:
  - Workspace-local: `<your workspace>/.usercontext-mcp-extension`
  - Global: `%USERPROFILE%/.vscode/extensions/.usercontext-mcp-extension` (Windows example: `C:\Users\plach\.vscode\extensions\.usercontext-mcp-extension`)
- Processes your User Context datasets and builds an index (catalog) used by the agents.
- Starts the embedded MCP server (if no external Server URL is configured) and registers the chat participant `@userContext`.

4. Try it:

- In Copilot Chat, type `@UserContext` and ask a question.
- Or run the command palette action: “My Business MCP: Invoke Tool”.

## Core concepts

- Orchestrator: classifies intent and routes to the right agent(s). Falls back to Clarification when requests are vague.
- User Context (primary feature): structured, user-specific domain data. Can be global or workspace-local.
- Data / Database Agents: query records, analyze relationships, and generate insights or exploration plans.
- Clarification Agent: asks for missing details when a request is ambiguous or incomplete.

## Configuration model (source of truth)

All configuration now originates in TypeScript for transparency, version control, and type safety:

- Application configuration: `src/config/application.config.ts`
- Agent definitions & profiles: `src/mcp/config/unifiedAgentConfig.ts`
- Build‑generated JSON (for external tools expecting a flat file): `out/mcp.config.json` (NOT committed)

The legacy `src/mcp.config.json` will be fully removed after one migration cycle. During the transition:

- The generator script `src/tools/generateMcpConfig.ts` materializes `out/mcp.config.json` during `npm run prebuild`.
- Consumers and internal loaders already default to the generated JSON or the TS sources directly.
- If you previously imported `src/mcp.config.json`, switch to the TS source modules or read the generated file after build.

Template processing, test fixtures, and docs generation all use the TS sources as the single source of truth to prevent drift.

### Configuration & IntelliSense

- Types-as-docs: Core configuration types live in type definitions, for example `src/types/agentConfig.ts`, and will include rich JSDoc (purpose, defaults, and examples) to power IntelliSense across the repo and prevent duplication and drift.
- Agent configs: Keep inline comments in `agent.config.ts` minimal; rely on type JSDoc for canonical docs to avoid duplication and drift.
- CommunicationAgent clarification: The `communication.clarification` block drives all clarification copy (headers, templates, limits). Avoid hardcoded business values in code; update config instead.
- Available categories: When a caller includes `metadata.availableCategories` in a response, `CommunicationAgent` appends an “Available Categories” section (markdown/plaintext) using the configured header.

## Settings: UI first, chat second

You can configure the extension in two ways:

1. VS Code Settings UI (preferred): “My Business MCP Extension”

   - Server URL, Token, Auto-register, Port, etc.
   - Future: agent-level knobs (timeouts, keywords, priorities) exposed in organized sections with help links.

2. Chat commands (secondary):
   - Planned commands to list, get, and set settings with validation and safe fallback.

Settings validation will prevent invalid values from taking effect; invalid overrides will be rejected with a helpful warning.

## User Context: global and local

User Context now replaces the legacy “Relevant Data Manager” terminology. Backwards‑compatible aliases (e.g. agent id `relevant-data-manager` alongside `user-context`) remain for one release cycle and then will emit warnings before removal.

- Global context cache: `%USERPROFILE%/.vscode/extensions/<extensionName>/.usercontext-mcp-extension`
- Local context cache: `<workspace>/.usercontext-mcp-extension`
- The indexing process builds:
  - Category snapshots (structure/record counts)
  - A consolidated catalog (schemas, relationships, primary keys)
  - Validation reports (schema + relationship integrity)

You can evolve User Context by editing the folders under `src/userContext/` (applications, departments, people, companyPolicies, companyResources). Placeholders have been fully replaced with canonical IDs for stability.

## Development

Requirements:

- Node 18+
- VS Code 1.95+

Useful scripts (all run through a deterministic prebuild):

- Prebuild (config + JSON generation + templates): `npm run prebuild`
- Build: `npm run compile`
- Test (100% coverage target, templates preprocessed): `npm test`
- Lint (strict JSDoc, zero warnings policy): `npm run lint`
- Docs (TypeDoc → markdown + post‑processing + health report): `npm run docs`

Quality gates (must all PASS before merge):

1. Build (TypeScript compile) – no errors.
2. Tests – 100% line/branch/function coverage; explicit remediation plan required for any temporary dip.
3. Lint – zero errors/warnings with strict JSDoc (no placeholder @returns, no undocumented public APIs).
4. Docs – regenerated, no manual edits to generated markdown, no orphan pages.
5. Health – repository governance checks (naming, front matter, schema alignment) all pass.
6. Config drift – generated `out/mcp.config.json` matches TS sources (checked implicitly by tests).

## Troubleshooting

| Issue                               | Check                                               | Resolution                                                                              |
| ----------------------------------- | --------------------------------------------------- | --------------------------------------------------------------------------------------- |
| Embedded server not reachable       | Port conflict / `mcp.json` registration             | Change port in Settings or disable auto‑register and retry                              |
| Missing User Context data           | Folder names / canonical IDs in `src/userContext/*` | Ensure category `id` fields are canonical (e.g. `applications`, not placeholder tokens) |
| Template placeholders still visible | Prebuild execution                                  | Run `npm run prebuild` or `npm test` (auto‑runs templates)                              |
| Generated config absent             | Build directory contents                            | Run `npm run mcp:gen` (invokes generator)                                               |
| Coverage below 100%                 | Jest coverage summary                               | Add tests for uncovered branches then re‑run `npm test`                                 |
| Lint failures (JSDoc)               | ESLint output                                       | Replace placeholder text, add missing tags, ensure param descriptions                   |

More diagnostics: `docs/template-variables.md` (resolved template values), shared cache contents under `.mcp-cache` for snapshot & catalog verification.

## Contributing

Follow the CHANGELOG “Unreleased” sections (Planned / Added / Changed / Fixed / Docs / Verification / Next Focus) for active work. Every non‑trivial PR must:

1. Update CHANGELOG (at least one section).
2. Preserve migration aliases until scheduled removal (e.g. keep `relevant-data-manager` alongside `user-context`).
3. Maintain 100% coverage – add tests first for new logic.
4. Avoid manual edits to generated docs; regenerate via scripts.
5. Include precise JSDoc (no placeholders, hyphenated param descriptions, concrete @returns).

After the alias deprecation window, remove legacy agent folders and update tests to only reference the canonical name.

---

Made with ❤️ to streamline customizable MCP tooling in Copilot Chat.
