import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  beforeAll,
  afterAll,
  jest,
} from "@jest/globals";

jest.mock("vscode", () => ({ env: {} }), { virtual: true });

import { promises as fs } from "fs";
import * as os from "os";
import * as path from "path";
import {
  ensureRegistration,
  removeRegistration,
  resolveMcpConfigPath,
} from "@extension/mcpRegistration";

describe("resolveMcpConfigPath", () => {
  const originalQuality = process.env.VSCODE_QUALITY;
  const originalAppName = process.env.VSCODE_APP_NAME;
  const originalPortable = process.env.VSCODE_PORTABLE;

  beforeEach(() => {
    // Ensure VSCODE_PORTABLE is not set for these tests
    delete process.env.VSCODE_PORTABLE;
  });

  afterEach(() => {
    process.env.VSCODE_QUALITY = originalQuality;
    process.env.VSCODE_APP_NAME = originalAppName;
    process.env.VSCODE_PORTABLE = originalPortable;
  });

  it("uses the stable VS Code path on Windows by default", () => {
    const result = resolveMcpConfigPath({
      platform: "win32",
      homeDir: "C:\\tester",
      appDataDir: "C:\\tester\\AppData\\Roaming",
      appName: "Visual Studio Code",
    });

    expect(result).toBe(
      path.win32.join(
        "C:\\tester\\AppData\\Roaming",
        "Code",
        "User",
        "mcp.json"
      )
    );
  });

  it("points to the Insiders folder when the app name indicates an Insiders build", () => {
    const result = resolveMcpConfigPath({
      platform: "win32",
      homeDir: "C:\\tester",
      appDataDir: "C:\\tester\\AppData\\Roaming",
      appName: "Visual Studio Code - Insiders",
    });

    expect(result).toBe(
      path.win32.join(
        "C:\\tester\\AppData\\Roaming",
        "Code - Insiders",
        "User",
        "mcp.json"
      )
    );
  });

  it("resolves macOS support directory for Insiders builds", () => {
    const result = resolveMcpConfigPath({
      platform: "darwin",
      homeDir: "/Users/tester",
      appName: "Visual Studio Code - Insiders",
    });

    expect(result).toBe(
      path.posix.join(
        "/Users/tester",
        "Library",
        "Application Support",
        "Code - Insiders",
        "User",
        "mcp.json"
      )
    );
  });

  it("falls back to the OSS distribution directory when the app identifier indicates OSS", () => {
    const result = resolveMcpConfigPath({
      platform: "linux",
      homeDir: "/home/tester",
      appIdentifier: "code-oss",
    });

    expect(result).toBe(
      path.posix.join(
        "/home/tester",
        ".config",
        "Code - OSS",
        "User",
        "mcp.json"
      )
    );
  });

  it("honors portable installations by targeting the portable data directory", () => {
    const result = resolveMcpConfigPath({
      platform: "win32",
      portableDir: "D:\\VSCodePortable",
    });

    expect(result).toBe(
      path.win32.join("D:\\VSCodePortable", "user-data", "User", "mcp.json")
    );
  });

  it("can infer Insiders via VSCODE_QUALITY when no appName override is present", () => {
    process.env.VSCODE_QUALITY = "insider";
    process.env.VSCODE_APP_NAME = undefined;
    const result = resolveMcpConfigPath({
      platform: "linux",
      homeDir: "/home/tester",
    });

    expect(result).toBe(
      path.posix.join(
        "/home/tester",
        ".config",
        "Code - Insiders",
        "User",
        "mcp.json"
      )
    );
  });
});

describe("ensureRegistration", () => {
  const toPosix = (input: string): string => input.replace(/\\/g, "/");

  const createTempHome = async (): Promise<string> => {
    const prefix = path.posix.join(toPosix(os.tmpdir()), "mcp-reg-");
    const dir = await fs.mkdtemp(prefix);
    return dir;
  };

  const cleanTempHome = async (dir: string): Promise<void> => {
    await fs.rm(dir, { recursive: true, force: true });
  };

  it("writes an http transport entry and preserves existing keys", async () => {
    const tempHome = await createTempHome();
    const configPath = path.posix.join(
      tempHome,
      ".config",
      "Code",
      "User",
      "mcp.json"
    );
    await fs.mkdir(path.posix.dirname(configPath), { recursive: true });
    const existingConfig = {
      clients: { existingClient: { command: "node" } },
      servers: {
        legacy: {
          transport: {
            type: "stdio",
            command: "node",
            args: ["server.js"],
          },
        },
      },
      custom: true,
    };
    await fs.writeFile(
      configPath,
      `${JSON.stringify(existingConfig, null, 2)}\n`,
      "utf8"
    );

    const options = {
      platform: "linux" as const,
      homeDir: tempHome,
      portableDir: "",
    };
    await ensureRegistration(
      { id: "usercontext", url: "http://localhost:39200", type: "http" },
      options
    );

    const updated = JSON.parse(await fs.readFile(configPath, "utf8"));
    expect(updated.custom).toBe(true);
    expect(updated.clients).toEqual(existingConfig.clients);
    expect(updated.servers.legacy).toEqual(existingConfig.servers.legacy);
    expect(updated.servers.usercontext).toEqual({
      type: "http",
      url: "http://localhost:39200",
    });

    await cleanTempHome(tempHome);
  });

  it("includes authorization header metadata when requested", async () => {
    const tempHome = await createTempHome();
    const options = {
      platform: "linux" as const,
      homeDir: tempHome,
      portableDir: "",
    };

    await ensureRegistration(
      {
        id: "auth",
        url: "http://localhost:5555",
        includeAuthHeader: true,
        token: "secret",
        type: "http",
      },
      options
    );

    const configPath = path.posix.join(
      tempHome,
      ".config",
      "Code",
      "User",
      "mcp.json"
    );
    const updated = JSON.parse(await fs.readFile(configPath, "utf8"));
    expect(updated.servers.auth).toEqual({
      type: "http",
      url: "http://localhost:5555",
      headers: { Authorization: "Bearer secret" },
    });

    await cleanTempHome(tempHome);
  });

  it("removes a registration entry without disturbing other data", async () => {
    const tempHome = await createTempHome();
    const options = {
      platform: "linux" as const,
      homeDir: tempHome,
      portableDir: "",
    };
    const configPath = path.posix.join(
      tempHome,
      ".config",
      "Code",
      "User",
      "mcp.json"
    );

    await ensureRegistration(
      { id: "remove-me", url: "http://localhost:6000", type: "http" },
      options
    );
    await ensureRegistration(
      { id: "keep-me", url: "http://localhost:7000", type: "http" },
      options
    );

    await removeRegistration("remove-me", options);

    const updated = JSON.parse(await fs.readFile(configPath, "utf8"));
    expect(updated.servers["remove-me"]).toBeUndefined();
    expect(updated.servers["keep-me"].url).toBe("http://localhost:7000");

    await cleanTempHome(tempHome);
  });
});
