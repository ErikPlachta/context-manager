/**
 * @packageDocumentation Repository Health Agent
 *
 * Evaluates repository quality and surfaces actionable insights.
 *
 * ## Capabilities
 * - JSON schema validation for configuration and data files.
 * - Markdown linting and metadata enforcement.
 * - Aggregated health report generation (docs/reports/health-report.md).
 *
 * ## Scripts
 * - npm run lint:json — JSON schema validation.
 * - npm run lint:docs — Markdown validation.
 * - npm run health:report — Full health check.
 *
 * ## Configuration
 * Health behavior is driven by src/config/application.config.ts. Extend checks by editing src/tools/repositoryHealth.ts.
 *
 * ## Migration Notes
 * Utilities relocated to bin/utils and executed with tsx for source-first workflows.
 */
export {};
