/**
 * @file Script to add missing @file tags to TypeScript files.
 */

import * as fs from "fs";
import * as path from "path";

const fileDescriptions: Record<string, string> = {
  "src/agent/relevantDataManagerAgent.ts":
    "Agent for managing category metadata and data relationships",
  "src/extension/index.ts":
    "VS Code extension entry point and chat participant registration",
  "src/extension/mcpCache.ts":
    "MCP cache management and invocation logging utilities",
  "src/extension/mcpProvider.ts":
    "MCP provider for VS Code extension integration",
  "src/extension/mcpRegistration.ts":
    "MCP server registration and configuration utilities",
  "src/extension/mcpSync.ts":
    "MCP synchronization and data management utilities",
  "src/extension/schemaPrompt.ts": "Schema-based prompt generation utilities",
  "src/server/embedded.ts": "Embedded MCP server startup and configuration",
  "src/shared/agentAnalytics.ts": "Agent usage analytics and tracking system",
  "src/shared/analyticsDashboard.ts":
    "Analytics dashboard generation and reporting",
  "src/shared/analyticsIntegration.ts":
    "Analytics integration decorators and utilities",
  "src/shared/configurationLoader.ts":
    "Application configuration loading and validation",
  "src/types/applicationConfig.ts":
    "Application configuration type definitions",
  "src/types/external.d.ts": "External library type declarations",
  "src/types/vscode-chat.d.ts": "VS Code chat API type declarations",
};

function generateFileDescription(filePath: string): string {
  const relativePath = filePath.replace(/\\/g, "/");
  if (fileDescriptions[relativePath]) return fileDescriptions[relativePath];
  const fileName = path.basename(filePath, ".ts");
  const dirName = path.dirname(filePath).split(path.sep).pop();
  const words = fileName
    .replace(/([A-Z])/g, " $1")
    .trim()
    .toLowerCase();
  return `${words} implementation for ${dirName} module`;
}

function addFileTagIfMissing(filePath: string): boolean {
  const content = fs.readFileSync(filePath, "utf8");
  if (content.includes("@file")) return false;
  const description = generateFileDescription(filePath);
  const fileTag = `/**\n * @file ${description}\n */\n\n`;
  const existingCommentMatch = content.match(/^(\/\*\*[\s\S]*?\*\/)/);
  const newContent = existingCommentMatch
    ? content.replace(
        existingCommentMatch[1],
        existingCommentMatch[1].replace(
          /^(\/\*\*)\s*\n/,
          `$1\n * @file ${description}\n`
        )
      )
    : fileTag + content;
  fs.writeFileSync(filePath, newContent, "utf8");
  return true;
}

async function main(): Promise<void> {
  const filesToFix = [
    "src/agent/relevantDataManagerAgent.ts",
    "src/extension/index.ts",
    "src/extension/mcpCache.ts",
    "src/extension/mcpProvider.ts",
    "src/extension/mcpRegistration.ts",
    "src/extension/mcpSync.ts",
    "src/extension/schemaPrompt.ts",
    "src/server/embedded.ts",
    "src/shared/agentAnalytics.ts",
    "src/shared/analyticsDashboard.ts",
    "src/shared/analyticsIntegration.ts",
    "src/shared/configurationLoader.ts",
    "src/types/applicationConfig.ts",
    "src/types/external.d.ts",
    "src/types/vscode-chat.d.ts",
  ];
  let fixedCount = 0;
  for (const relativePath of filesToFix) {
    const fullPath = path.resolve(__dirname, "../../", relativePath);
    if (!fs.existsSync(fullPath)) {
      console.log(`❌ File not found: ${relativePath}`);
      continue;
    }
    if (addFileTagIfMissing(fullPath)) {
      console.log(`✅ Added @file tag to: ${relativePath}`);
      fixedCount++;
    } else {
      console.log(`⏭️  @file tag already exists: ${relativePath}`);
    }
  }
  console.log(`\n✅ Added @file tags to ${fixedCount} files`);
}

if (require.main === module) {
  // eslint-disable-next-line @typescript-eslint/no-floating-promises
  main().catch(console.error);
}
