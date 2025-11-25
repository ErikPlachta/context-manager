# Context Manager CLI

This workspace contains the TypeScript-based CLI used to scaffold and manage the context-manager template files.

## Prerequisites
- Node.js 18+ and npm.

## Install dependencies
From the repository root, install the workspace packages so the CLI can build:

```bash
npm install --workspaces
```

Alternatively, target just this workspace:

```bash
npm install --workspace scripts/context-manager
```

## Common commands
Run these from the repository root:

- Build the CLI: `npm run build:cli`
- Clean build outputs: `npm run clean:cli`
- Run the CLI (builds first): `npm run cli -- <args>`

Example usage:

```bash
npm run cli -- --help
```

The compiled entry point lives at `scripts/context-manager/dist/cli.js`.
