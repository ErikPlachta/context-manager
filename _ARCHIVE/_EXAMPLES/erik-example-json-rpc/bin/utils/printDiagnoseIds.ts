import fs from "node:fs";
import path from "node:path";

async function main() {
  const repoRoot = process.cwd();
  const pkgPath = path.join(repoRoot, "package.json");
  const pkg = JSON.parse(await fs.promises.readFile(pkgPath, "utf8"));

  const chat = (pkg.contributes?.chatParticipants || [])[0] || {};
  const contributedId: string = chat.id || "UserContextMCP";
  const contributedName: string = chat.name || "usercontext";

  const envExtName = (process.env.EXTENSION_NAME || "").trim() || undefined;
  const envChatId =
    (process.env.MCP_CHAT_PARTICIPANT_ID || "").trim() || undefined;
  const envChatName =
    (process.env.MCP_CHAT_PARTICIPANT_NAME || "").trim() || undefined;

  const baseId = envChatId || envChatName || "usercontext";
  const expectedId = baseId.charAt(0).toUpperCase() + baseId.slice(1) + "MCP";
  const expectedName = envChatName || baseId;

  const actualMention = `@${contributedName}`;
  const expectedMention = `@${expectedName}`;

  const differences = {
    idMismatch: expectedId !== contributedId,
    nameMismatch: expectedName !== contributedName,
    mentionMismatch: expectedMention !== actualMention,
  };

  const diag = {
    env: {
      EXTENSION_NAME: envExtName,
      MCP_CHAT_PARTICIPANT_ID: envChatId,
      MCP_CHAT_PARTICIPANT_NAME: envChatName,
    },
    packageJson: {
      name: pkg.name,
      chatParticipant: { id: contributedId, name: contributedName },
    },
    runtime: {
      createdChatParticipantId: contributedId,
      mention: actualMention,
    },
    expected: { id: expectedId, name: expectedName, mention: expectedMention },
    differences,
  };

  console.log(JSON.stringify(diag, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
