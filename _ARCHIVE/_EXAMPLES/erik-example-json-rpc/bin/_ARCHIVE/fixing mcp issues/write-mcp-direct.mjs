import fs from "fs/promises";
import path from "path";

async function main() {
  const appData =
    process.env.TARGET_APPDATA || "C:\\Users\\plach\\AppData\\Roaming";
  const userFolder = "Code"; // assume stable Code folder; adjust if needed
  const mcpPath = path.join(appData, userFolder, "User", "mcp.json");

  console.log("Target mcp.json:", mcpPath);

  let config = {};
  try {
    const raw = await fs.readFile(mcpPath, "utf8");
    config = JSON.parse(raw);
    if (typeof config !== "object" || config === null) config = {};
  } catch (err) {
    // file may not exist - that's fine
    console.log("Existing mcp.json not found, will create new one");
    config = {};
  }

  config.servers = config.servers || {};
  config.servers["usercontext-mcp-server"] = {
    transport: { type: "http", url: "http://localhost:39200" },
    metadata: { addedBy: "manual-test", timestamp: new Date().toISOString() },
  };

  const pretty = JSON.stringify(config, null, 2) + "\n";
  await fs.mkdir(path.dirname(mcpPath), { recursive: true });
  await fs.writeFile(mcpPath, pretty, "utf8");
  console.log("Wrote mcp.json successfully");
}

main().catch((e) => {
  console.error("Failed to write mcp.json:", e);
  process.exit(1);
});
