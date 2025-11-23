/**
 * @packageDocumentation Automated JSDoc fixer for common violations.
 */

import * as fs from "fs";
import * as path from "path";

interface JSDocFix {
  pattern: RegExp;
  replacement: string;
  description: string;
}

const jsdocFixes: JSDocFix[] = [
  {
    pattern: /(@param\s+\{[^}]+\}\s*\[[^\]]+\]\s*)([^-\n])/g,
    replacement: "$1- $2",
    description: "Add hyphen to @param with brackets",
  },
  {
    pattern: /(@param\s+\{[^}]+\}\s+\w+\s*)([^-\n])/g,
    replacement: "$1- $2",
    description: "Add hyphen to @param with type",
  },
  {
    pattern: /(@param\s+\w+\s*)([^-\n])/g,
    replacement: "$1- $2",
    description: "Add hyphen to simple @param",
  },
  {
    pattern: /@param\s+(\{[^}]+\}\s+)?([A-Za-z_$][\w.$]*)-(\s*)/g,
    replacement: "@param $1$2 - ",
    description: "Normalize @param name with stray hyphen",
  },
  {
    pattern: /(@returns\s+(?:\{[^}]+\}\s*)?)([^-\s\n])/g,
    replacement: "$1- $2",
    description: "Ensure @returns description prefixed by hyphen",
  },
  {
    pattern: /(@throws\s+(?:\{[^}]+\}\s*)?)([^-\s\n])/g,
    replacement: "$1- $2",
    description: "Ensure @throws description prefixed by hyphen",
  },
  {
    pattern: /@fileoverview/g,
    replacement: "@packageDocumentation",
    description: "Replace @fileoverview with @packageDocumentation",
  },
  {
    pattern: /@file(\b)/g,
    replacement: "@packageDocumentation",
    description: "Replace @file with @packageDocumentation",
  },
];

function findTSFiles(dir: string): string[] {
  const files: string[] = [];
  const entries = fs.readdirSync(dir);
  for (const entry of entries) {
    const fullPath = path.join(dir, entry);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory() && !entry.startsWith(".")) {
      files.push(...findTSFiles(fullPath));
    } else if (entry.endsWith(".ts") && !entry.endsWith(".d.ts")) {
      files.push(fullPath);
    }
  }
  return files;
}

function fixJSDoc(content: string): { content: string; fixes: string[] } {
  let fixedContent = content;
  const appliedFixes: string[] = [];
  for (const fix of jsdocFixes) {
    const before = fixedContent;
    fixedContent = fixedContent.replace(fix.pattern, fix.replacement);
    if (before !== fixedContent) appliedFixes.push(fix.description);
  }
  return { content: fixedContent, fixes: appliedFixes };
}

function addFileTag(content: string, filePath: string): string {
  if (content.includes("@packageDocumentation")) return content;
  if (content.includes("@file") || content.includes("@fileoverview"))
    return content;
  const fileName = path.basename(filePath, ".ts");
  const dirName = path.dirname(filePath).split(path.sep).pop();
  const description = `${fileName} implementation for ${dirName} module`;
  const fileTag = `/**\n * @packageDocumentation ${description}\n */\n\n`;
  if (content.trim().startsWith("import")) return fileTag + content;
  const commentMatch = content.match(/^(\/\*\*[\s\S]*?\*\/\s*)/);
  if (commentMatch)
    return content.replace(commentMatch[1], commentMatch[1] + fileTag);
  return fileTag + content;
}

async function main(): Promise<void> {
  const srcDir = path.resolve(__dirname, "../../src");
  const tsFiles = findTSFiles(srcDir);
  let totalFixes = 0;
  let filesModified = 0;
  for (const filePath of tsFiles) {
    const content = fs.readFileSync(filePath, "utf8");
    let fixedContent = addFileTag(content, filePath);
    const { content: finalContent, fixes } = fixJSDoc(fixedContent);
    if (finalContent !== content) {
      fs.writeFileSync(filePath, finalContent, "utf8");
      filesModified++;
      totalFixes += fixes.length;
      console.log(
        `✅ Fixed ${path.relative(srcDir, filePath)}: ${fixes.length} issues`
      );
      if (fixes.length > 0) fixes.forEach((fix) => console.log(`   - ${fix}`));
    }
  }
  console.log(`\n✅ Fixed ${totalFixes} issues across ${filesModified} files`);
}

if (require.main === module) {
  // eslint-disable-next-line @typescript-eslint/no-floating-promises
  main().catch(console.error);
}
