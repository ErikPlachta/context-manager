import path from "path";
import { pathToFileURL } from "url";

// Mock vscode module to avoid import errors
const vscodeMock = {
  env: {
    appName: "Visual Studio Code",
  },
};

// Inject the mock into globalThis before importing
globalThis.vscode = vscodeMock;

async function main() {
  // Adjust these values as needed
  const targetAppData =
    process.env.TARGET_APPDATA || "C:\\Users\\plach\\AppData\\Roaming";
  const registrationId = process.env.REG_ID || "usercontext-mcp-server-test";
  const serverUrl = process.env.SERVER_URL || "http://localhost:39200";

  const modulePath = path.resolve("./out/src/extension/mcpRegistration.js");
  const mod = await import(pathToFileURL(modulePath).href);

  if (typeof mod.ensureRegistration !== "function") {
    console.error("ensureRegistration not found in module:", Object.keys(mod));
    process.exit(2);
  }

  console.log("Using appDataDir:", targetAppData);
  try {
    const written = await mod.ensureRegistration(
      {
        id: registrationId,
        url: serverUrl,
        includeAuthHeader: false,
      },
      { platform: "win32", appDataDir: targetAppData }
    );
    console.log("ensureRegistration wrote to:", written);
  } catch (err) {
    console.error("Registration failed:", err);
    process.exit(1);
  }
}

main();
