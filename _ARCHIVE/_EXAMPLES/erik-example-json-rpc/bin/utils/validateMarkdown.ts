/**
 * @packageDocumentation Enforced documentation and metadata compliance.
 *
 * Developer utility: validates Markdown metadata & required sections.
 */

import process from "node:process";
import { RepositoryHealthAgent } from "@tools/repositoryHealth";

/**
 * Validate Markdown metadata and structural requirements.
 *
 * @returns {Promise<void>} Resolves when validation completes.
 */
async function runMarkdownValidation(): Promise<void> {
  const agent: RepositoryHealthAgent =
    await RepositoryHealthAgent.createFromDisk();
  const result = await agent.validateMarkdownDocuments();
  if (!result.passed) {
    for (const message of result.messages) {
      console.error(message);
    }
    process.exitCode = 1;
  }
}

void runMarkdownValidation().catch((error: unknown) => {
  console.error(
    "Markdown validation encountered an unrecoverable error.",
    error
  );
  process.exitCode = 1;
});
