/**
 * @packageDocumentation Enforced documentation and metadata compliance.
 *
 * Developer utility: executes JSON schema validation via RepositoryHealthAgent.
 */

import process from "node:process";
import { RepositoryHealthAgent } from "@tools/repositoryHealth";

/**
 * Execute JSON schema validation using the repository health agent.
 *
 * @returns {Promise<void>} - Resolves when validation completes.
 */
async function runJsonValidation(): Promise<void> {
  const agent: RepositoryHealthAgent =
    await RepositoryHealthAgent.createFromDisk();
  const result = await agent.validateJsonSchemas();
  if (!result.passed) {
    for (const message of result.messages) {
      console.error(message);
    }
    process.exitCode = 1;
  }
}

void runJsonValidation().catch((error: unknown) => {
  console.error("JSON validation encountered an unrecoverable error.", error);
  process.exitCode = 1;
});
