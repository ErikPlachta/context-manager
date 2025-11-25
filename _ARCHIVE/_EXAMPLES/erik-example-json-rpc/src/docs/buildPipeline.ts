/**
 * @packageDocumentation Build Pipeline
 *
 * Describes the build pipeline stages and strict modes executed in CI/CD.
 *
 * ## Stages
 * 1. Compile: TypeScript compilation (npm run compile).
 * 2. Test: Jest test suite (npm run test).
 * 3. Docs: TypeDoc generation + post-processing (npm run docs).
 * 4. Lint: ESLint source checks (npm run lint).
 * 5. Health: Repository health report (npm run health:report).
 *
 * ## Combined Scripts
 * - npm run build:pipeline — POSIX full pipeline (bin/build.sh)
 * - npm run build:pipeline:win — Windows variant.
 * - npm run build:full — Full pipeline with strict lint & health gating.
 * - npm run build:quick — Fast path (compile + test only) without coverage.
 *
 * ## Strict Modes
 * Passing --strict-lint or --strict-health enforces zero-tolerance and aborts on first failing gate.
 *
 * ## Artifacts
 * - out/ compiled output
 * - coverage/ coverage reports
 * - docs/ generated markdown
 *
 * ## Verification Checklist
 * For every non-trivial change, add a Verification block to the corresponding CHANGELOG log entry recording PASS/FAIL for: Build, Tests, Lint, Docs, Health, Coverage, and JSDoc. Do not use an Unreleased section.
 */
export {};
