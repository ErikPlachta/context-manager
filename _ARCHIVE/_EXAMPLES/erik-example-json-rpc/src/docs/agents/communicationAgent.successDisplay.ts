/**
 * @packageDocumentation CommunicationAgent successDisplay Settings
 *
 * Documents configuration options for success-path category enumeration in the
 * CommunicationAgent. These settings control whether and how a list of
 * available categories is appended to success messages. The defaults are
 * conservative (disabled) to avoid unsolicited noise; enable explicitly when it
 * improves discoverability for your users.
 *
 * ## Settings
 *
 * - `communication.successDisplay.includeAvailableCategories`: When `true`, and
 *   when `metadata.availableCategories` is provided by the caller, append an
 *   "Available Categories" section to success messages. Default: `false`.
 * - `communication.successDisplay.maxCategoriesInSuccess`: Maximum number of
 *   categories to include in the success message list. Default: `6`.
 * - `communication.successDisplay.availableCategoriesHeader`: Optional header
 *   text for the category list when shown on success. If omitted, the
 *   CommunicationAgent reuses the clarification header or falls back to
 *   "Available Categories:".
 *
 * The list respects the configured output format:
 * - `markdown`: renders with a bolded header and `- item` bullets
 * - `plaintext` / `html`: renders without bolding and uses `• item` bullets
 *
 * ## Example
 *
 * ```ts
 * import { communicationAgentConfig } from "@agent/communicationAgent/agent.config";
 *
 * const cfg = {
 *   ...communicationAgentConfig,
 *   communication: {
 *     ...communicationAgentConfig.communication,
 *     successDisplay: {
 *       includeAvailableCategories: true,
 *       maxCategoriesInSuccess: 5,
 *       availableCategoriesHeader: "Available Categories:",
 *     },
 *   },
 * };
 * ```
 *
 * When enabled, ensure you pass `metadata.availableCategories` on success
 * responses so the list can be rendered.
 */
export {}; // Module-only documentation
