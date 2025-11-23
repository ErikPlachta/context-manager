/**
 * @packageDocumentation Utilities to register/unregister this extension's MCP server in the
 * user's global VS Code mcp.json so Copilot Chat can discover it.
 */
import { promises as fs, existsSync } from "fs";
import * as path from "path";
import * as os from "os";
import * as vscode from "vscode";

/**
 * McpConfig interfaces supporting both legacy and transport formats.
 */

// Legacy format (used by most existing servers)
interface McpServerLegacyStdio {
  command: string;
  args?: string[];
  env?: Record<string, string>;
  type: "stdio";
}

interface McpServerLegacyHttp {
  url: string;
  type: "http";
  headers?: Record<string, string>;
}

// New transport-based format
interface McpServerTransportHttp {
  type: "http";
  url: string;
  headers?: Record<string, string>;
}

interface McpServerTransportStdio {
  type: "stdio";
  command: string;
  args?: string[];
  env?: Record<string, string>;
}

type McpServerTransport = McpServerTransportHttp | McpServerTransportStdio;

interface McpServerWithTransport {
  transport: McpServerTransport;
  metadata?: Record<string, unknown>;
}

// Union type supporting both formats
type McpServerDefinition =
  | McpServerLegacyStdio
  | McpServerLegacyHttp
  | McpServerWithTransport;

interface McpConfig {
  inputs?: unknown[];
  servers?: Record<string, McpServerDefinition>;
  clients?: Record<string, unknown>;
  [key: string]: unknown;
}

/**
 * Options used to resolve the VS Code MCP configuration path (primarily for testing).
 */
export interface McpConfigPathOptions {
  /** Platform override (defaults to {@link process.platform}). */
  platform?: NodeJS.Platform;
  /** Home directory override (defaults to {@link os.homedir}). */
  homeDir?: string;
  /** Explicit APPDATA-style directory for Windows (defaults to {@link process.env.APPDATA}). */
  appDataDir?: string;
  /** Explicit app name to infer user data folder (defaults to VS Code environment heuristics). */
  appName?: string;
  /** Explicit app identifier (e.g. `code-insiders`) to infer user data folder. */
  appIdentifier?: string;
  /** Override for portable installations (defaults to {@link process.env.VSCODE_PORTABLE}). */
  portableDir?: string;
}

const FALLBACK_USER_DIR = "Code";

/**
 * Infer the VS Code user data folder name (e.g. `Code`, `Code - Insiders`, `VSCodium`).
 *
 * @param {Array<string | undefined>} candidates - Potential identifiers to inspect.
 * @returns {string} Resolved folder name.
 */
function inferUserDataFolder(candidates: Array<string | undefined>): string {
  for (const candidate of candidates) {
    if (!candidate) {
      continue;
    }

    const normalized = candidate.trim().toLowerCase();

    if (normalized.includes("codium")) {
      return normalized.includes("insider")
        ? "VSCodium - Insiders"
        : "VSCodium";
    }

    if (normalized.includes("oss")) {
      return "Code - OSS";
    }

    if (normalized.includes("explor")) {
      return "Code - Exploration";
    }

    if (normalized.includes("insider")) {
      return "Code - Insiders";
    }

    if (normalized.includes("code")) {
      return "Code";
    }
  }

  return FALLBACK_USER_DIR;
}

/**
 * Resolve the full path to the MCP configuration file (mcp.json) for the current VS Code build.
 *
 * @param {McpConfigPathOptions} [options] - Optional overrides used primarily for unit testing.
 * @returns {string} Absolute path to the target `mcp.json` file.
 */
export function resolveMcpConfigPath(
  options: McpConfigPathOptions = {}
): string {
  const platform = options.platform ?? process.platform;
  const homeDir = options.homeDir ?? os.homedir();
  const portableDir = options.portableDir ?? process.env.VSCODE_PORTABLE;
  const pathLib = platform === "win32" ? path.win32 : path.posix;

  if (portableDir && portableDir.trim()) {
    const portableCandidates = [
      pathLib.join(portableDir, "user-data"),
      pathLib.join(portableDir, "data"),
    ];
    const portableUserBase =
      portableCandidates.find((candidate) => existsSync(candidate)) ??
      portableCandidates[0];
    return pathLib.join(portableUserBase, "User", "mcp.json");
  }

  const resolvedAppName = options.appName ?? vscode.env?.appName ?? undefined;
  const resolvedIdentifier =
    options.appIdentifier ?? process.env.VSCODE_APP_NAME ?? undefined;
  const userFolder = inferUserDataFolder([
    resolvedAppName,
    resolvedIdentifier,
    process.env.VSCODE_QUALITY,
  ]);

  if (platform === "win32") {
    const appData =
      options.appDataDir ??
      process.env.APPDATA ??
      pathLib.join(homeDir, "AppData", "Roaming");
    return pathLib.join(appData, userFolder, "User", "mcp.json");
  }

  if (platform === "darwin") {
    return pathLib.join(
      homeDir,
      "Library",
      "Application Support",
      userFolder,
      "User",
      "mcp.json"
    );
  }

  return pathLib.join(homeDir, ".config", userFolder, "User", "mcp.json");
}

/**
 * readMcpConfig function.
 *
 * @param {string} filePath - filePath parameter.
 * @returns {Promise<McpConfig>} Parsed MCP configuration ensuring a `servers` map.
 * @throws {Error} Propagates filesystem errors other than a missing file.
 */
async function readMcpConfig(filePath: string): Promise<McpConfig> {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    const parsed = JSON.parse(raw) as McpConfig;
    const servers =
      parsed.servers && typeof parsed.servers === "object"
        ? (parsed.servers as Record<string, McpServerDefinition>)
        : {};
    return { ...parsed, servers };
  } catch (err) {
    const e = err as NodeJS.ErrnoException;
    if (e && e.code === "ENOENT") {
      return { servers: {} };
    }
    throw e;
  }
}

/**
 * writeMcpConfig function.
 *
 * @param {string} filePath - filePath parameter.
 * @param {McpConfig} config - config parameter.
 * @returns {Promise<void>} Resolves once the configuration has been written.
 */
async function writeMcpConfig(
  filePath: string,
  config: McpConfig
): Promise<void> {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  const pretty = JSON.stringify(config, null, 2);
  await fs.writeFile(filePath, pretty + "\n", "utf8");
}

/**
 * Registration options supporting both stdio and HTTP servers.
 */
export interface RegistrationOptions {
  id: string; // key under servers
  // For HTTP servers
  url?: string;
  includeAuthHeader?: boolean;
  token?: string;
  // For stdio servers
  command?: string;
  args?: string[];
  env?: Record<string, string>;
  // Required: transport type
  type: "http" | "stdio";
}

/**
 * Ensure an MCP server entry exists in mcp.json for Copilot Chat.
 * Supports both stdio and HTTP transports using the legacy format.
 *
 * @param {RegistrationOptions} opts - Registration parameters describing the server.
 * @param {McpConfigPathOptions} [pathOptions] - Optional overrides used to resolve the configuration path.
 * @returns {Promise<string>} Absolute path to the written `mcp.json` file.
 */
export async function ensureRegistration(
  opts: RegistrationOptions,
  pathOptions: McpConfigPathOptions = {}
): Promise<string> {
  const configPath = resolveMcpConfigPath(pathOptions);
  const current = await readMcpConfig(configPath);

  let serverDef: McpServerDefinition;

  if (opts.type === "stdio") {
    if (!opts.command) {
      throw new Error("command is required for stdio servers");
    }
    // Use legacy stdio format to match existing servers
    serverDef = {
      command: opts.command,
      args: opts.args,
      env: opts.env,
      type: "stdio",
    };
  } else if (opts.type === "http") {
    if (!opts.url) {
      throw new Error("url is required for HTTP servers");
    }
    // Use legacy HTTP format to match existing servers
    const headers =
      opts.includeAuthHeader && opts.token
        ? { Authorization: `Bearer ${opts.token}` }
        : undefined;

    serverDef = headers
      ? { url: opts.url, type: "http", headers }
      : { url: opts.url, type: "http" };
  } else {
    throw new Error(`Unsupported transport type: ${opts.type}`);
  }

  const nextServers: Record<string, McpServerDefinition> = {
    ...(current.servers ?? {}),
    [opts.id]: serverDef,
  };

  const nextConfig: McpConfig = { ...current, servers: nextServers };
  await writeMcpConfig(configPath, nextConfig);
  return configPath;
}

/**
 * Remove our server entry from mcp.json if present.
 *
 * @param {string} id - id parameter.
 * @param {McpConfigPathOptions} [pathOptions] - Optional overrides used to resolve the configuration path.
 * @returns {Promise<string>} Absolute path to the updated `mcp.json` file.
 */
export async function removeRegistration(
  id: string,
  pathOptions: McpConfigPathOptions = {}
): Promise<string> {
  const configPath = resolveMcpConfigPath(pathOptions);
  const current = await readMcpConfig(configPath);
  const currentServers = current.servers ?? {};

  if (Object.prototype.hasOwnProperty.call(currentServers, id)) {
    const nextServers = { ...currentServers };
    delete nextServers[id];
    const nextConfig: McpConfig = { ...current, servers: nextServers };
    await writeMcpConfig(configPath, nextConfig);
  }
  return configPath;
}
