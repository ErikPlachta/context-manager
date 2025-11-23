import { promises as fs, existsSync } from "fs";
import * as path from "path";
import * as os from "os";
import { pathToFileURL } from "url";

/**
 * Pure Node.js implementation of the MCP registration logic
 * (extracted from src/extension/mcpRegistration.ts for standalone testing)
 */

const FALLBACK_USER_DIR = "Code";

function inferUserDataFolder(candidates) {
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

function resolveMcpConfigPath(options = {}) {
  const platform = options.platform ?? process.platform;
  const homeDir = options.homeDir ?? os.homedir();
  const portableDir = options.portableDir ?? process.env.VSCODE_PORTABLE;
  const pathLib = platform === "win32" ? path.win32 : path.posix;

  if (portableDir) {
    const portableCandidates = [
      pathLib.join(portableDir, "user-data"),
      pathLib.join(portableDir, "data"),
    ];
    const portableUserBase =
      portableCandidates.find((candidate) => existsSync(candidate)) ??
      portableCandidates[0];
    return pathLib.join(portableUserBase, "User", "mcp.json");
  }

  const resolvedAppName = options.appName ?? "Visual Studio Code";
  const resolvedIdentifier =
    options.appIdentifier ?? process.env.VSCODE_APP_NAME;
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

async function readMcpConfig(filePath) {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    const parsed = JSON.parse(raw);
    const servers =
      parsed.servers && typeof parsed.servers === "object"
        ? parsed.servers
        : {};
    return { ...parsed, servers };
  } catch (err) {
    if (err && err.code === "ENOENT") {
      return { servers: {} };
    }
    throw err;
  }
}

async function writeMcpConfig(filePath, config) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  const pretty = JSON.stringify(config, null, 2);
  await fs.writeFile(filePath, pretty + "\n", "utf8");
}

export async function ensureRegistration(opts, pathOptions = {}) {
  const configPath = resolveMcpConfigPath(pathOptions);
  const current = await readMcpConfig(configPath);

  let serverDef;

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

  const nextServers = {
    ...(current.servers ?? {}),
    [opts.id]: serverDef,
  };

  const nextConfig = { ...current, servers: nextServers };
  await writeMcpConfig(configPath, nextConfig);
  return configPath;
}

export async function removeRegistration(id, pathOptions = {}) {
  const configPath = resolveMcpConfigPath(pathOptions);
  const current = await readMcpConfig(configPath);
  const currentServers = current.servers ?? {};

  if (Object.prototype.hasOwnProperty.call(currentServers, id)) {
    const nextServers = { ...currentServers };
    delete nextServers[id];
    const nextConfig = { ...current, servers: nextServers };
    await writeMcpConfig(configPath, nextConfig);
  }
  return configPath;
}

// Demo runner
async function main() {
  const targetAppData =
    process.env.TARGET_APPDATA || "C:\\Users\\plach\\AppData\\Roaming";
  const registrationId =
    process.env.REG_ID || "usercontext-mcp-server-standalone";
  const serverUrl = process.env.SERVER_URL || "http://localhost:39200";
  const includeAuth = process.env.INCLUDE_AUTH === "true";
  const token = process.env.TOKEN || "test-token";

  console.log("Pure Node.js registration test");
  console.log("Using appDataDir:", targetAppData);
  console.log("Registration ID:", registrationId);
  console.log("Server URL:", serverUrl);
  console.log("Include auth:", includeAuth);

  try {
    const written = await ensureRegistration(
      {
        id: registrationId,
        url: serverUrl,
        includeAuthHeader: includeAuth,
        token: includeAuth ? token : undefined,
      },
      { platform: "win32", appDataDir: targetAppData }
    );
    console.log("✅ ensureRegistration wrote to:", written);

    // Demonstrate removal as well
    console.log("Testing removal...");
    await removeRegistration(registrationId, {
      platform: "win32",
      appDataDir: targetAppData,
    });
    console.log("✅ Registration removed successfully");

    // Re-add for persistence
    await ensureRegistration(
      {
        id: registrationId,
        url: serverUrl,
        includeAuthHeader: includeAuth,
        token: includeAuth ? token : undefined,
      },
      { platform: "win32", appDataDir: targetAppData }
    );
    console.log("✅ Re-added registration for persistence");
  } catch (err) {
    console.error("❌ Registration failed:", err);
    process.exit(1);
  }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
