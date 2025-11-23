# Repo-ops Next

Next-generation repo-ops CLI, built cleanly alongside the legacy
`bin/repo-ops` implementation. This tree is the future home for
governance automation around `TODO.md`, `CONTEXT-SESSION.md`, and
`CHANGELOG.md`.

The legacy CLI remains in place as a reference and fallback until the
next-gen implementation is feature-complete and battle-tested.

## Goals

- **Single, typed CLI entry** with clear subcommands and predictable
  exit codes.
- **Shared, testable primitives** for flag parsing and file IO.
- **Governance-aware operations** that respect markers, backups, and
  repo rules defined in `.github/copilot-instructions.md`,
  `TODO.md`, `CONTEXT-SESSION.md`, and `CHANGELOG.md`.

## Command Surface (Planned)

Top-level command (subject to refinement):

```text
repo-ops-next <command> [subcommand] [flags]
```

Planned commands:

- `help` – Show general help.
- `version` – Show CLI version and build info.
- `status` – High-level health summary (lint/docs/JSON + governance files).
- `session` – Operations for `CONTEXT-SESSION.md`.
  - `session rotate [--write]` – Archive current session and create a
    new one from the configured template.
  - `session lint` – Validate structure, markers, and related links.
- `todo` – Operations for `TODO.md`.
  - `todo add --title <text> [--priority P1|P2|P3] [--parent <id>]` –
    Add a new task under the correct section with proper markers.
  - `todo complete --match <substring>` – Mark a task done and move it
    into Completed.
  - `todo move --match <substring> --to P1|P2|P3` – Rehome a task to a
    different priority section.
- `changelog` – Operations for `CHANGELOG.md`.
  - `changelog scaffold --type <type> --summary <text> [--context <md>]`
    – Print a logs-only entry block (no file writes).
  - `changelog write --type <type> --summary <text> [flags...]` – Insert
    a logs-only entry with backups and optional auto-verify.
  - `changelog map [--fast] [--pretty] [--filter-day YYYY-MM-DD]` – Emit
    JSON map/index for tooling.
  - `changelog verify` – Structural validation only (no writes).
  - `changelog verify-only [--force]` – Update Verification block for the
    latest entry.
  - `changelog diff [--pretty]` – Compare current changelog vs last
    saved index.

## Flag Semantics (Planned)

- **Dry-run by default**: commands that mutate files operate in
  read-only mode unless `--write` is present.
- **`--write`**: apply the planned changes and create a timestamped
  backup before mutating any governance file.
- **`--validate`** (for changelog): run structural validation only,
  without applying writes.
- **`--auto-verify` / `--no-auto-verify`**: control whether tests/docs/
  health gates are run and a Verification block is updated after
  writes.
- **Exit codes**:
  - `0` for success and dry-run with no structural errors.
  - Non-zero for validation failures, IO/parse errors, or invalid
    usage.

## Architecture

- `bin/repo-ops-next/index.ts` – minimal router, responsible for:
  - Parsing the top-level command and subcommand.
  - Delegating to command modules (session/todo/changelog/status).
  - Setting `process.exitCode` based on results.
- `bin/repo-ops-next/flags.ts` – shared flag parser that walks argv
  left-to-right and produces a typed flag map.
- `bin/repo-ops-next/fs.ts` (planned) – shared IO helpers for reading
  and writing governance files, including backup creation.
- Future command modules under `bin/repo-ops-next/commands/**`.

## Testing Strategy

- Unit tests for `flags.ts` and other helpers to ensure deterministic,
  shell-agnostic parsing.
- CLI-surface tests that call `main()` with argv slices and assert on
  stdout/stderr and exit codes.
- End-to-end smoke tests (later) that exercise a full flow:
  add TODO → rotate session → write changelog entry → verify.

Implementation will proceed incrementally. Until the new CLI reaches
parity, the existing `bin/repo-ops` code remains the operational
implementation for repo-ops tasks.

