# context-manager-0.0.4

## Purpose

- Provide a minimal template that keeps Copilot Chat aligned to a deterministic workflow with low token usage.
- Maintain shared context through small, purpose-built files without project-specific data.

## Core files and roles

- `.github/copilot-instructions.md`: top-level guardrails consumed by Copilot Chat before every step.
- `CONTEXT-SESSION.md`: current session facts the assistant must read and update as work progresses.
- `TODO.md`: single-source list of outstanding work; keep synchronized with session state.
- `TODO-NEXT.md`: immediate, actionable items to pull from `TODO.md`.
- `TODO-BACKLOG.md`: parked tasks to review and promote into `TODO.md` when relevant.
- `.github/.templates/`: canonical templates that define the **structure and minimum shape** for TODO and context files; templates stay generic, while working files may add slightly richer, still-terse guidance. Never store project data here.
- `.github/.instructions/decision-tree.md`: routing map that tells Copilot Chat which branch playbook to follow.
- `.github/instructions/branch/*`: branch-specific playbooks (plan, execute, verify, commit, reconcile, etc.) referenced by the decision tree.
- `.github/.docs/*`: optional reference notes you can extend with project material without changing the template flow.

## Deterministic workflow

- Read `TODO.md` and `CONTEXT-SESSION.md`.
- Update `CONTEXT-SESSION.md` with new facts or decisions.
- Route via `.github/.instructions/decision-tree.md` to select the branch playbook.
- Execute tasks following `.github/instructions/branch/*` steps.
- Verify changes and compare against expectations.
- Commit using semantic format and reconcile TODO/context files.

## Using Copilot Chat

- Start sessions by asking Copilot Chat to load `.github/copilot-instructions.md`, `CONTEXT-SESSION.md`, and the TODO files.
- Copilot follows the decision tree to choose the correct branch playbook.
- Path-based routing relies solely on file locations and names; no repository-specific metadata is stored.

## Managing TODOs and context

- Keep `TODO.md` authoritative; move near-term actions into `TODO-NEXT.md` and archive future ideas in `TODO-BACKLOG.md`.
- After each step, capture outcomes in `CONTEXT-SESSION.md` to prevent drift.
- Regenerate TODO or context files from `.github/.templates/` when **structural drift** appears; it is acceptable for working files to include more specific, concise prompts (for example, clarifying what belongs in `focus` or `done-when`) as long as the core sections and low-token shape remain intact.

## Semantic commits

- Use the format `type: short summary` where `type` reflects intent (e.g., `docs`, `feat`, `fix`, `chore`, `refactor`).
- Commit only after verifying work and aligning TODO/context updates.

## Extending documentation

- Add project-specific guides under `.github/.docs/` without changing template mechanics.
- Link new docs from `CONTEXT-SESSION.md` or TODO items when relevant.

## Keeping token usage low

- Rely on small, focused files; avoid adding large narratives to core template files.
- Summarize decisions succinctly in `CONTEXT-SESSION.md` and keep TODOs terse.

## Bootstrapping a new developer

- Share this README and point to `.github/copilot-instructions.md`.
- Instruct them to read `CONTEXT-SESSION.md` and `TODO.md`, then follow the deterministic workflow loop.
- Encourage regeneration from templates to ensure fresh, drift-free starting points.
