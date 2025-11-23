/**
 * @packageDocumentation
 *
 * Server Transport & Local Verification
 *
 * This module documents the server transport policy and shows how to run the
 * fast, deterministic transport verifier locally.
 *
 * Policy
 * - Default transport is stdio.
 * - HTTP transport is available for local debugging and verification only when the
 *   environment variable `MCP_HTTP_ENABLED=true` is set. CI and local checks can
 *   use this to exercise JSON-RPC 2.0 request/response over HTTP.
 * - A single JSON-RPC handler path is reused across transports (initialize,
 *   tools/list, tools/call) to prevent drift.
 *
 * Local Quick Check
 *
 * ```bash
 * npm run test:http
 * ```
 *
 * What it does
 * - Compiles the project, rewrites alias imports in `out/` to relative paths,
 *   then runs a small Node harness that:
 *   1) starts the compiled server with `MCP_HTTP_ENABLED=true` and ephemeral port,
 *   2) posts JSON-RPC `initialize` and `tools/list`,
 *   3) asserts protocol invariants and exits non‑zero on failure.
 *
 * CI Hook
 * - The workflow runs the same verifier via `npm run test:http:ci` to provide a
 *   quick protocol guard independent of Jest.
 *
 * Notes
 * - The verifier is intentionally outside Jest to avoid ESM + stdio framing
 *   pitfalls and VS Code dependency coupling in tests.
 */
export {};
