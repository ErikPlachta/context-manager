/**
 * MCP Registration
 *
 * Utilities to register/unregister this extension's MCP server in VS Code's
 * global mcp.json so Copilot Chat can discover it.
 */

import { promises as fs, existsSync } from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as vscode from 'vscode';

interface McpServerStdio {
  command: string;
  args?: string[];
  env?: Record<string, string>;
  type: 'stdio';
}

interface McpConfig {
  inputs?: unknown[];
  servers?: Record<string, McpServerStdio>;
  clients?: Record<string, unknown>;
  [key: string]: unknown;
}

interface McpConfigPathOptions {
  platform?: NodeJS.Platform;
  homeDir?: string;
  appDataDir?: string;
  appName?: string;
  portableDir?: string;
}

const FALLBACK_USER_DIR = 'Code';

function inferUserDataFolder(candidates: Array<string | undefined>): string {
  for (const candidate of candidates) {
    if (!candidate) continue;

    const normalized = candidate.trim().toLowerCase();

    if (normalized.includes('codium')) {
      return normalized.includes('insider') ? 'VSCodium - Insiders' : 'VSCodium';
    }
    if (normalized.includes('oss')) return 'Code - OSS';
    if (normalized.includes('explor')) return 'Code - Exploration';
    if (normalized.includes('insider')) return 'Code - Insiders';
    if (normalized.includes('code')) return 'Code';
  }

  return FALLBACK_USER_DIR;
}

export function resolveMcpConfigPath(options: McpConfigPathOptions = {}): string {
  const platform = options.platform ?? process.platform;
  const homeDir = options.homeDir ?? os.homedir();
  const portableDir = options.portableDir ?? process.env.VSCODE_PORTABLE;
  const pathLib = platform === 'win32' ? path.win32 : path.posix;

  if (portableDir?.trim()) {
    const portableCandidates = [
      pathLib.join(portableDir, 'user-data'),
      pathLib.join(portableDir, 'data')
    ];
    const portableUserBase = portableCandidates.find(c => existsSync(c)) ?? portableCandidates[0];
    return pathLib.join(portableUserBase, 'User', 'mcp.json');
  }

  const resolvedAppName = options.appName ?? vscode.env?.appName;
  const userFolder = inferUserDataFolder([
    resolvedAppName,
    process.env.VSCODE_APP_NAME,
    process.env.VSCODE_QUALITY
  ]);

  if (platform === 'win32') {
    const appData = options.appDataDir ?? process.env.APPDATA ?? pathLib.join(homeDir, 'AppData', 'Roaming');
    return pathLib.join(appData, userFolder, 'User', 'mcp.json');
  }

  if (platform === 'darwin') {
    return pathLib.join(homeDir, 'Library', 'Application Support', userFolder, 'User', 'mcp.json');
  }

  return pathLib.join(homeDir, '.config', userFolder, 'User', 'mcp.json');
}

async function readMcpConfig(filePath: string): Promise<McpConfig> {
  try {
    const raw = await fs.readFile(filePath, 'utf8');
    const parsed = JSON.parse(raw) as McpConfig;
    return { ...parsed, servers: parsed.servers ?? {} };
  } catch (err) {
    const e = err as NodeJS.ErrnoException;
    if (e?.code === 'ENOENT') {
      return { servers: {} };
    }
    throw e;
  }
}

async function writeMcpConfig(filePath: string, config: McpConfig): Promise<void> {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  const pretty = JSON.stringify(config, null, 2);
  await fs.writeFile(filePath, pretty + '\n', 'utf8');
}

export interface RegistrationOptions {
  id: string;
  command: string;
  args?: string[];
  env?: Record<string, string>;
}

export async function ensureRegistration(
  opts: RegistrationOptions,
  pathOptions: McpConfigPathOptions = {}
): Promise<string> {
  const configPath = resolveMcpConfigPath(pathOptions);
  const current = await readMcpConfig(configPath);

  const serverDef: McpServerStdio = {
    command: opts.command,
    args: opts.args,
    env: opts.env,
    type: 'stdio'
  };

  const nextServers = {
    ...(current.servers ?? {}),
    [opts.id]: serverDef
  };

  const nextConfig: McpConfig = { ...current, servers: nextServers };
  await writeMcpConfig(configPath, nextConfig);
  return configPath;
}

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
