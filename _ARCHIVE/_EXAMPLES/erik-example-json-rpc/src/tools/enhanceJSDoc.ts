/**
 * @packageDocumentation Enhanced JSDoc coverage generator.
 *
 * Scans TypeScript source files and ensures every function, method and exported arrow
 * function has a complete JSDoc block with `@param` / `@returns` tags. Existing blocks
 * are regenerated (preserving the first summary line when present) to guarantee
 * consistent formatting required by strict ESLint JSDoc rules.
 *
 * This is intentionally conservative: it only touches `.ts` source under `src/**` and
 * skips `.d.ts` declaration files. It relies on the TypeScript compiler API for
 * accurate parameter and return type detection.
 */

import * as fs from "fs";
import * as path from "path";
import ts from "typescript";
import { fileURLToPath } from "url";

// ES module equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Represents a generated or replacement JSDoc block to apply to a source file.
 */
interface GeneratedDoc {
  /** Insertion position (or start of replacement range). */
  pos: number;
  /** Optional end of replacement range (exclusive). */
  end?: number;
  /** JSDoc block text including trailing newline. */
  text: string;
}

/**
 * Determines whether a function-like declaration has a void/undefined return type.
 *
 * @param {ts.FunctionLikeDeclarationBase} node - node parameter.
 * @returns {boolean} True when the declared return type is void or undefined.
 */
function isVoidLike(node: ts.FunctionLikeDeclarationBase): boolean {
  if (!node.type) return false; // assume return value if unspecified (to force @returns - tag)
  const t = node.type.getText();
  return t === "void" || t === "undefined";
}

/**
 * Collects simple parameter names from a function-like declaration.
 *
 * @param {ts.FunctionLikeDeclarationBase} node - node parameter.
 * @returns {string[]} Ordered list of parameter names.
 */
function collectParamNames(node: ts.FunctionLikeDeclarationBase): string[] {
  return node.parameters.map((p) => p.name.getText());
}

/**
 * Collect parameter type strings; falls back to 'unknown' when not annotated.
 *
 * @param {ts.FunctionLikeDeclarationBase} node - node parameter.
 * @returns {string[]} Ordered list of parameter type strings ("unknown" when unannotated).
 */
function collectParamTypes(node: ts.FunctionLikeDeclarationBase): string[] {
  return node.parameters.map((p) => (p.type ? p.type.getText() : "unknown"));
}

/**
 * Infer a return type textual representation for a function-like node.
 *
 * @param {ts.FunctionLikeDeclarationBase} node - node parameter.
 * @returns {string} Explicit or inferred return type text ("unknown" fallback).
 */
function getReturnTypeText(node: ts.FunctionLikeDeclarationBase): string {
  if (node.type) return node.type.getText();
  const body = node.body && ts.isBlock(node.body) ? node.body : undefined;
  if (body) {
    const returns = body.statements.filter(ts.isReturnStatement);
    if (returns.length === 1 && returns[0].expression) {
      const expr = returns[0].expression;
      if (ts.isStringLiteral(expr)) return "string";
      if (ts.isNumericLiteral(expr)) return "number";
      if (
        expr.kind === ts.SyntaxKind.TrueKeyword ||
        expr.kind === ts.SyntaxKind.FalseKeyword
      )
        return "boolean";
      if (ts.isArrayLiteralExpression(expr)) return "unknown[]";
      if (ts.isObjectLiteralExpression(expr)) return "Record<string, unknown>";
    }
  }
  return "unknown";
}

/**
 * Detect if the function body contains a throw statement.
 *
 * @param {ts.FunctionLikeDeclarationBase} node - node parameter.
 * @returns {boolean} True if any throw statement is present within the body.
 */
function hasThrow(node: ts.FunctionLikeDeclarationBase): boolean {
  const body = node.body && ts.isBlock(node.body) ? node.body : undefined;
  if (!body) return false;
  let found = false;

  /**
   * Recursive helper to detect any ThrowStatement within the function body.
   *
   * @param {ts.Node} n - Node to inspect.
   * @returns {void} No return value.
   */
  const scan = (n: ts.Node): void => {
    if (found) return; // short‑circuit if already located
    if (ts.isThrowStatement(n)) {
      found = true;
      return;
    }
    ts.forEachChild(n, scan);
  };
  ts.forEachChild(body, scan);
  return found;
}

/**
 * Extracts the first summary line from an existing JSDoc block.
 *
 * @param {string} fullText - fullText parameter.
 * @returns {string | undefined} First summary line, or undefined when absent.
 */
function extractSummaryFromExisting(fullText: string): string | undefined {
  // Match first JSDoc block summary portion (lines between /** and first @ tag)
  const match = /\/\*\*([\s\S]*?)\*\//.exec(fullText);
  if (!match) return undefined;
  const body = match[1]
    .split("\n")
    .map((l) => l.replace(/^\s*\* ?/, "").trim())
    .filter((l) => !!l);
  const beforeTag: string[] = [];
  for (const line of body) {
    if (line.startsWith("@")) break;
    beforeTag.push(line);
  }
  if (beforeTag.length === 0) return undefined;
  // Use first line only to keep concise summary
  return beforeTag[0];
}

/**
 * Builds a canonical JSDoc block for a function.
 *
 * @param {string | undefined} summary - summary parameter.
 * @param {string | undefined} fnName - fnName parameter.
 * @param {string[]} params - params parameter.
 * @param {string[]} paramTypes - paramTypes parameter.
 * @param {boolean} includeReturns - includeReturns parameter.
 * @param {string} returnType - returnType parameter.
 * @param {boolean} includeThrows - includeThrows parameter.
 * @param {string[]} typeParams - typeParams parameter.
 * @param {unknown} indent - indent parameter.
 * @returns {string} Complete JSDoc block text including trailing newline.
 */
function buildDocBlock(
  summary: string | undefined,
  fnName: string | undefined,
  params: string[],
  paramTypes: string[],
  includeReturns: boolean,
  returnType: string,
  includeThrows: boolean,
  typeParams: string[] = [],
  indent = ""
): string {
  const lines: string[] = ["/**"];
  const effectiveSummary =
    summary || (fnName ? `${fnName} function.` : "Function.");
  lines.push(` * ${effectiveSummary}`);
  lines.push(" *");
  // Add @template tags for generics if any
  for (const t of typeParams) {
    lines.push(` * @template ${t}`);
  }
  if (typeParams.length > 0) {
    lines.push(" *");
  }
  for (let i = 0; i < params.length; i++) {
    const p = params[i];
    const t = paramTypes[i] || "unknown";
    lines.push(` * @param {${t}} ${p} - ${p} parameter.`);
  }
  if (includeReturns) {
    lines.push(` * @returns {${returnType}} Return value.`);
  }
  if (includeThrows) {
    lines.push(" * @throws {Error} - May throw an error.");
  }
  lines.push(" */");
  // Apply indentation to each line of the block
  return lines.map((l) => (l.length ? indent + l : l)).join("\n") + "\n";
}

/**
 * Determines whether a file should be processed (non-declaration TS source).
 *
 * @param {string} filePath - filePath parameter.
 * @returns {boolean} True if file is a non-declaration TypeScript source.
 */
function shouldProcessFile(filePath: string): boolean {
  return filePath.endsWith(".ts") && !filePath.endsWith(".d.ts");
}

/**
 * Ensures a file-level `@packageDocumentation` block is present; returns updated content.
 *
 * @param {string} content - content parameter.
 * @param {string} filePath - filePath parameter.
 * @returns {{ content: string; added: boolean }} Updated content and flag indicating insertion.
 */
function ensureFilePackageDocumentation(
  content: string,
  filePath: string
): { content: string; added: boolean } {
  if (content.includes("@packageDocumentation"))
    return { content, added: false };
  const name = path.basename(filePath, ".ts");
  const dir = path.basename(path.dirname(filePath));
  const block = `/**\n * @packageDocumentation ${name} implementation for ${dir} module.\n */\n\n`;
  return { content: block + content, added: true };
}

/**
 * Generates JSDoc edits for all function-like declarations in a source file.
 *
 * @param {ts.SourceFile} sourceFile - sourceFile parameter.
 * @returns {GeneratedDoc[]} Generated doc block edits sorted by position.
 */
function generateEditsForSource(sourceFile: ts.SourceFile): GeneratedDoc[] {
  const edits: GeneratedDoc[] = [];

  /**
   * Visits AST nodes recursively and creates or replaces JSDoc blocks where needed.
   *
   * @param {ts.Node} node - node parameter.
   */
  function visit(node: ts.Node): void {
    // Interface declarations: ensure a basic block (summary + @template if generics)
    if (ts.isInterfaceDeclaration(node)) {
      const fullText = sourceFile.getFullText();
      const nodeStart = node.getStart();
      const lineStart = fullText.lastIndexOf("\n", nodeStart - 1) + 1;
      const linePrefix = fullText.slice(lineStart, nodeStart);
      const indentMatch = /(\s*)$/.exec(linePrefix);
      const indent = indentMatch ? indentMatch[1] : "";
      const jsDocs: ts.JSDoc[] | undefined = (
        node as unknown as { jsDoc?: ts.JSDoc[] }
      ).jsDoc;
      const typeParams = node.typeParameters
        ? node.typeParameters.map((tp) => tp.name.getText())
        : [];
      if (jsDocs && jsDocs.length > 0) {
        const first = jsDocs[0];
        const start = first.getFullStart();
        const end = nodeStart;
        edits.push({
          pos: start,
          end,
          text: buildDocBlock(
            extractSummaryFromExisting(fullText.slice(start, end)) ||
              `${node.name.getText()} interface.`,
            undefined,
            [],
            [],
            false,
            "void",
            false,
            typeParams,
            indent
          ),
        });
      } else {
        edits.push({
          pos: lineStart,
          end: nodeStart,
          text: buildDocBlock(
            `${node.name.getText()} interface.`,
            undefined,
            [],
            [],
            false,
            "void",
            false,
            typeParams,
            indent
          ),
        });
      }
    }
    if (ts.isFunctionDeclaration(node) && node.name) {
      createOrReplace(node, node.name.getText());
    } else if (
      ts.isMethodDeclaration(node) &&
      node.parent &&
      ts.isClassDeclaration(node.parent)
    ) {
      const name = node.name.getText();
      createOrReplace(node, name);
    } else if (ts.isConstructorDeclaration(node)) {
      // Ensure constructors have proper JSDoc (no return type changes)
      createOrReplace(
        node as unknown as ts.FunctionLikeDeclarationBase,
        "constructor"
      );
    } else if (
      ts.isArrowFunction(node) &&
      node.parent &&
      ts.isVariableDeclaration(node.parent)
    ) {
      // Arrow function assigned to a variable (exported or internal)
      const varDecl = node.parent;
      const name = varDecl.name.getText();
      createOrReplace(node, name);
    } else if (
      ts.isFunctionExpression(node) &&
      node.parent &&
      ts.isVariableDeclaration(node.parent)
    ) {
      const varDecl = node.parent;
      createOrReplace(node, varDecl.name.getText());
    }
    ts.forEachChild(node, visit);
  }

  /**
   * Creates or replaces a JSDoc block for a function-like node.
   *
   * @param {ts.FunctionLikeDeclarationBase} node - node parameter.
   * @param {string | undefined} fnName - fnName parameter.
   */
  function createOrReplace(
    node: ts.FunctionLikeDeclarationBase,
    fnName: string | undefined
  ): void {
    const fullText = sourceFile.getFullText();
    const nodeStart = node.getStart();
    // Compute indentation for the node's line
    const lineStart = fullText.lastIndexOf("\n", nodeStart - 1) + 1;
    const linePrefix = fullText.slice(lineStart, nodeStart);
    const indentMatch = /(\s*)$/.exec(linePrefix);
    const indent = indentMatch ? indentMatch[1] : "";
    // Access jsDoc via structural type rather than any.
    const jsDocs: ts.JSDoc[] | undefined = (
      node as unknown as { jsDoc?: ts.JSDoc[] }
    ).jsDoc;
    let summary: string | undefined;
    const typeParams: string[] = (
      node as unknown as {
        typeParameters?: ts.NodeArray<ts.TypeParameterDeclaration>;
      }
    ).typeParameters
      ? (
          (
            node as unknown as {
              typeParameters?: ts.NodeArray<ts.TypeParameterDeclaration>;
            }
          ).typeParameters as ts.NodeArray<ts.TypeParameterDeclaration>
        ).map((tp) => tp.name.getText())
      : [];
    if (jsDocs && jsDocs.length > 0) {
      const first = jsDocs[0];
      // Replace from the beginning of the first JSDoc (including any preceding trivia)
      const start = first.getFullStart();
      // Up to the node start (remove any extra blank lines and alignment issues)
      const end = nodeStart;
      summary = extractSummaryFromExisting(fullText.slice(start, end));
      // Replace existing block entirely
      edits.push({
        pos: start,
        end,
        text: buildDocBlock(
          summary,
          fnName,
          collectParamNames(node),
          collectParamTypes(node),
          !isVoidLike(node),
          getReturnTypeText(node),
          hasThrow(node),
          typeParams,
          indent
        ),
      });
    } else {
      // Insert/replace the leading whitespace of the node's line with the doc block
      const insertPos = lineStart;
      edits.push({
        pos: insertPos,
        end: nodeStart, // replace leading trivia before the node to keep adjacency and alignment
        text: buildDocBlock(
          undefined,
          fnName,
          collectParamNames(node),
          collectParamTypes(node),
          !isVoidLike(node),
          getReturnTypeText(node),
          hasThrow(node),
          typeParams,
          indent
        ),
      });
    }

    // Apply explicit return type annotation when safe and applicable (skip constructors)
    const isConstructor = (node as ts.Node).kind === ts.SyntaxKind.Constructor;
    if (!isConstructor && !node.type) {
      const inferred = getReturnTypeText(node);
      if (inferred && inferred !== "unknown") {
        // Find insertion point after closing paren of parameters
        const headerEnd = node.body ? node.body.getFullStart() : node.getEnd();
        const headerText = fullText.slice(node.getStart(), headerEnd);
        // Find last ')' before body
        const closeIndex = headerText.lastIndexOf(")");
        const colonAlready = headerText.indexOf(":", closeIndex) !== -1;
        if (closeIndex !== -1 && !colonAlready) {
          const insertPos = node.getStart() + closeIndex + 1; // after ')'
          edits.push({
            pos: insertPos,
            text: `: ${inferred} `,
          });
        }
      }
    }
  }

  visit(sourceFile);
  return edits.sort((a, b) => a.pos - b.pos);
}

/**
 * Applies generated edits to the original file content.
 *
 * @param {string} original - original parameter.
 * @param {GeneratedDoc[]} edits - edits parameter.
 * @returns {string} Updated file content with all edits applied.
 */
function applyEdits(original: string, edits: GeneratedDoc[]): string {
  if (edits.length === 0) return original;
  let result = original;
  // Apply from last to first to keep positions stable
  for (const edit of [...edits].sort((a, b) => b.pos - a.pos)) {
    const before = result.slice(0, edit.pos);
    const after =
      edit.end !== undefined ? result.slice(edit.end) : result.slice(edit.pos);
    result = before + edit.text + after;
  }
  return result;
}

/**
 * Processes a file: ensures package doc and generates per-function JSDoc blocks.
 *
 * @param {string} filePath - filePath parameter.
 * @returns {{
  modified: boolean;
  addedFileTag: boolean;
}} Process result flags indicating modifications and package doc insertion.
 */
function processFile(filePath: string): {
  modified: boolean;
  addedFileTag: boolean;
} {
  const original = fs.readFileSync(filePath, "utf8");
  const { content: withFileTag, added } = ensureFilePackageDocumentation(
    original,
    filePath
  );
  const source = ts.createSourceFile(
    filePath,
    withFileTag,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS
  );
  const edits = generateEditsForSource(source);
  if (edits.length === 0 && !added)
    return { modified: false, addedFileTag: added };
  const updated = applyEdits(withFileTag, edits);
  if (updated !== original) {
    fs.writeFileSync(filePath, updated, "utf8");
    return { modified: true, addedFileTag: added };
  }
  return { modified: false, addedFileTag: added };
}

/**
 * Recursively walks a directory collecting processable source files.
 *
 * @param {string} dir - dir parameter.
 * @param {string[]} results - results parameter.
 * @returns {string[]} Recursive listing of processable .ts file paths.
 */
function walk(dir: string, results: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir)) {
    const full = path.join(dir, entry);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      if (entry === "node_modules" || entry.startsWith(".")) continue;
      walk(full, results);
    } else if (shouldProcessFile(full)) {
      results.push(full);
    }
  }
  return results;
}

/**
 * CLI entrypoint: enumerates files and applies enhancements.
 *
 */
function main(): void {
  // Resolve project root generically whether script runs from src/tools (ts-node) or out/src/tools (compiled).
  const projectRoot = path.resolve(__dirname, "../../..");
  const srcRoot = path.join(projectRoot, "src");
  if (!fs.existsSync(srcRoot)) {
    console.error(`src directory not found at ${srcRoot}`);
    return;
  }
  const files = walk(srcRoot);
  let modifiedCount = 0;
  let fileTagCount = 0;
  for (const f of files) {
    const { modified, addedFileTag } = processFile(f);
    if (modified) modifiedCount++;
    if (addedFileTag) fileTagCount++;
  }
  console.log(
    `enhanceJSDoc: processed ${files.length} files; modified ${modifiedCount}; added package doc to ${fileTagCount}.`
  );
}

if (require.main === module) {
  main();
}

export {};
