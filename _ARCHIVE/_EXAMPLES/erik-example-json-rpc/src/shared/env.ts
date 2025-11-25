/**
 * @packageDocumentation Environment helpers for extension-wide configuration.
 */

/**
 * Return the extension name for cache scoping, preferring EXTENSION_NAME from env.
 * Falls back to a safe default when not set.
 *
 * @returns {string} Canonical extension name used for cache folder naming.
 */
export function getExtensionName(): string {
  const fromEnv = (process.env.EXTENSION_NAME || "").trim();
  if (fromEnv) return fromEnv;
  // Final fallback to a safe default
  return "usercontext-mcp-extension";
}

/**
 * Compute the cache directory name based on the extension name.
 * This is used for both workspace-local and global cache folder naming.
 *
 * @returns {string} Directory name to use for cache storage.
 */
export function getCacheDirectoryName(): string {
  const name = getExtensionName();
  // Normalize to a hidden directory (leading dot) without duplicating dots
  return name.startsWith(".") ? name : `.${name}`;
}
