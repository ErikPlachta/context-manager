/**
 * @fileoverview Utility script to fix import paths when project structure changes.
 *
 * This script helps update import statements throughout the project when files
 * are moved or when switching from relative to absolute imports.
 *
 * @author vscode-extension-mcp-server project
 * @since 1.0.0
 */

import { promises as fs } from "fs";
import { join, extname } from "path";

/**
 * Central configuration object for default import path rewrites.
 *
 * Adjust this object rather than editing logic in `runImportFixer`.
 */
const DEFAULT_IMPORT_REWRITE: ImportFixConfig = {
  targetDirectory: join(process.cwd(), "src"),
  transformations: [
    { find: "../agents/", replace: "@agents/" },
    { find: "../extension/", replace: "@extension/" },
    { find: "../mcp/", replace: "@mcp/" },
    { find: "../server/", replace: "@server/" },
    { find: "../shared/", replace: "@shared/" },
    { find: "../types/", replace: "@internal-types/" },
    { find: "../tools/", replace: "@tools/" },
    { find: "../agent/", replace: "@agent/" },
  ],
  extensions: [".ts"],
  dryRun: false,
};

/**
 * Configuration interface for import path transformations.
 */
interface ImportFixConfig {
  /** Directory to search for TypeScript files */
  readonly targetDirectory: string;
  /** Array of find/replace patterns for import transformations */
  readonly transformations: ReadonlyArray<{
    /** Pattern to find in import statements (can be regex string) */
    readonly find: string;
    /** Replacement string for the pattern */
    readonly replace: string;
    /** Whether the find pattern is a regular expression */
    readonly isRegex?: boolean;
  }>;
  /** File extensions to process (defaults to ['.ts', '.tsx']) */
  readonly extensions?: readonly string[];
  /** Whether to perform a dry run (log changes without applying them) */
  readonly dryRun?: boolean;
}

/**
 * Statistics about the import fixing operation.
 */
interface ImportFixStats {
  /** Number of files processed */
  filesProcessed: number;
  /** Number of files that had imports modified */
  filesModified: number;
  /** Number of individual import statements changed */
  importsChanged: number;
  /** List of files that were modified */
  modifiedFiles: string[];
}

/**
 * Recursively finds TypeScript files in a directory.
 *
 * @param dir - Directory to search in
 * @param extensions - File extensions to include
 * @returns Promise resolving to array of file paths
 */
async function findTypeScriptFiles(
  dir: string,
  extensions: readonly string[] = [".ts", ".tsx"]
): Promise<string[]> {
  const files: string[] = [];

  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = join(dir, entry.name);

      if (entry.isDirectory()) {
        const subFiles = await findTypeScriptFiles(fullPath, extensions);
        files.push(...subFiles);
      } else if (entry.isFile() && extensions.includes(extname(entry.name))) {
        files.push(fullPath);
      }
    }
  } catch (error) {
    console.error(`Error reading directory ${dir}:`, error);
  }

  return files;
}

/**
 * Applies import transformations to file content.
 *
 * @param content - Original file content
 * @param transformations - Array of find/replace transformations
 * @returns Object with modified content and change count
 */
function transformImports(
  content: string,
  transformations: ImportFixConfig["transformations"]
): { content: string; changesCount: number } {
  let modifiedContent = content;
  let totalChanges = 0;

  for (const transformation of transformations) {
    const { find, replace, isRegex = false } = transformation;

    if (isRegex) {
      const regex = new RegExp(find, "g");
      const matches = modifiedContent.match(regex);
      if (matches) {
        totalChanges += matches.length;
        modifiedContent = modifiedContent.replace(regex, replace);
      }
    } else {
      const regex = new RegExp(
        find.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
        "g"
      );
      const matches = modifiedContent.match(regex);
      if (matches) {
        totalChanges += matches.length;
        modifiedContent = modifiedContent.replace(regex, replace);
      }
    }
  }

  return { content: modifiedContent, changesCount: totalChanges };
}

/**
 * Fixes import paths in TypeScript files according to the provided configuration.
 *
 * This function processes all TypeScript files in the specified directory,
 * applying the configured transformations to import statements.
 *
 * @param config - Configuration object specifying transformations and options
 * @returns Promise resolving to statistics about the operation
 *
 * @example
 * ```typescript
 * // Fix relative imports to absolute imports
 * const stats = await fixImports({
 *   targetDirectory: './src',
 *   transformations: [
 *     { find: '../agents/', replace: '@agents/' },
 *     { find: '../extension/', replace: '@extension/' }
 *   ]
 * });
 * console.log(`Modified ${stats.filesModified} files`);
 * ```
 *
 * @example
 * ```typescript
 * // Convert ../ to ../../ in test files (regex example)
 * const stats = await fixImports({
 *   targetDirectory: './tests',
 *   transformations: [
 *     { find: '\\.\\./(?!\\.\\.)', replace: '../../', isRegex: true }
 *   ]
 * });
 * ```
 */
export async function fixImports(
  config: ImportFixConfig
): Promise<ImportFixStats> {
  const {
    targetDirectory,
    transformations,
    extensions = [".ts", ".tsx"],
    dryRun = false,
  } = config;

  const stats: ImportFixStats = {
    filesProcessed: 0,
    filesModified: 0,
    importsChanged: 0,
    modifiedFiles: [],
  };

  console.log(`🔍 Finding TypeScript files in ${targetDirectory}...`);
  const files = await findTypeScriptFiles(targetDirectory, extensions);
  console.log(`📁 Found ${files.length} TypeScript files`);

  if (transformations.length === 0) {
    console.log("⚠️  No transformations specified");
    return stats;
  }

  console.log("🔄 Transformations to apply:");
  transformations.forEach((t, i) => {
    console.log(
      `  ${i + 1}. "${t.find}" → "${t.replace}"${t.isRegex ? " (regex)" : ""}`
    );
  });

  if (dryRun) {
    console.log("🏃 Dry run mode - no files will be modified");
  }

  for (const filePath of files) {
    stats.filesProcessed++;

    try {
      const originalContent = await fs.readFile(filePath, "utf-8");
      const { content: modifiedContent, changesCount } = transformImports(
        originalContent,
        transformations
      );

      if (changesCount > 0) {
        stats.filesModified++;
        stats.importsChanged += changesCount;
        stats.modifiedFiles.push(filePath);

        console.log(`✏️  ${filePath}: ${changesCount} imports modified`);

        if (!dryRun) {
          await fs.writeFile(filePath, modifiedContent, "utf-8");
        }
      }
    } catch (error) {
      console.error(`❌ Error processing ${filePath}:`, error);
    }
  }

  console.log("📊 Summary:");
  console.log(`  Files processed: ${stats.filesProcessed}`);
  console.log(`  Files modified: ${stats.filesModified}`);
  console.log(`  Import statements changed: ${stats.importsChanged}`);

  return stats;
}

/**
 * Command-line interface for the import fixing utility.
 *
 * Runs predefined import transformations commonly needed in this project.
 */
export async function runImportFixer(): Promise<void> {
  console.log(
    "🚀 Starting import path fixes using DEFAULT_IMPORT_REWRITE...\n"
  );
  await fixImports(DEFAULT_IMPORT_REWRITE);
  console.log("\n✅ Import fixing completed!");
}

// Run the fixer if this script is executed directly
if (require.main === module) {
  runImportFixer().catch(console.error);
}
