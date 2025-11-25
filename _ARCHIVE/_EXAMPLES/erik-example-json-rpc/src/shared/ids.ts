/**
 * @packageDocumentation Centralized ID derivation for the extension to eliminate
 * runtime vs build misalignment. All consumers (build script + activation) should import from here.
 */

interface RawEnv {
  EXTENSION_NAME?: string;
  MCP_CHAT_PARTICIPANT_ID?: string;
  MCP_CHAT_PARTICIPANT_NAME?: string;
  EXTENSION_PUBLISHER?: string;
}

/**
 * Sanitize a string to an identifier-safe, lowercase segment.
 *
 * @param {string} value - Input value to sanitize.
 * @returns {string} Sanitized lowercase segment containing only [a-z0-9_-].
 */
function sanitizeSegment(value: string): string {
  return value
    .trim()
    .replace(/[^a-zA-Z0-9_-]/g, "")
    .toLowerCase();
}

/** Derived identifiers used across the extension and packaging. */
export interface DerivedIds {
  baseId: string; // raw participant logical id (lowercase)
  participantId: string; // capitalized + MCP suffix (VS Code chatParticipant id)
  mention: string; // @<name>
  commandPrefix: string; // lowercase + MCP suffix used for commands/settings
  settingsPrefix: string; // same as commandPrefix
  extensionName: string; // npm/package name (used in installed path identification)
  extensionPublisher: string; // publisher segment
  extensionFullId: string; // publisher.name
}

/**
 * Compute IDs given environment variables. If no env provided, uses process.env.
 *
 * @param {RawEnv} env - Raw environment object containing optional overrides.
 * @returns {DerivedIds} Fully derived ids.
 */
export function deriveIds(env: RawEnv = process.env as RawEnv): DerivedIds {
  const publisher = sanitizeSegment(env.EXTENSION_PUBLISHER || "ErikPlachta");
  const extensionName = sanitizeSegment(
    env.EXTENSION_NAME || "usercontext-mcp-extension"
  );

  const rawBase =
    env.MCP_CHAT_PARTICIPANT_ID ||
    env.MCP_CHAT_PARTICIPANT_NAME ||
    "usercontext";
  const baseId = sanitizeSegment(rawBase || "usercontext");
  const participantId =
    baseId.charAt(0).toUpperCase() + baseId.slice(1) + "MCP";
  const mention = `@${baseId}`;
  const commandPrefix = baseId + "MCP"; // matches activationEvents style
  const settingsPrefix = commandPrefix;
  const extensionFullId = `${publisher}.${extensionName}`;

  return {
    baseId,
    participantId,
    mention,
    commandPrefix,
    settingsPrefix,
    extensionName,
    extensionPublisher: publisher,
    extensionFullId,
  };
}

export const IDS = deriveIds();
