/**
 * @packageDocumentation Agent responsible for managing the mock "user context" datasets
 * that MCP servers expose to users. This is the successor to the legacy Relevant Data
 * Manager agent; the full implementation now lives here, and the legacy path is a shim.
 *
 * @module agent/userContextAgent
 */

import * as crypto from "crypto";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";
import {
  ensureCacheDirectory,
  readSharedCacheEntry,
  SharedCacheEntry,
  storeSharedCacheEntry,
} from "@extension/mcpCache";
import { createInvocationLogger } from "@mcp/telemetry";
import { UserContextAgentProfile } from "@mcp/config/agentProfiles";
import { userContextAgentConfig } from "@agent/userContextAgent/agent.config";
import { BaseAgentConfig } from "@shared/config/baseAgentConfig";
import type {
  CategoryId,
  CategoryRecord,
  AgentConfigDefinition,
} from "@internal-types/agentConfig";
import {
  validateAgentConfig,
  generateValidationReport,
} from "@shared/validation/configValidation";
import { IDS } from "@shared/ids";
import * as os from "os";
import {
  FolderBlueprint,
  RelationshipDescription,
  CategoryRequirements,
  CategorySchema,
  PrimitiveTypeName,
  TypeSchema,
  TypedDictField,
  TypeDefinition,
  ExampleDataset,
  DataValidationIssue,
  DataValidationReport,
  RemoteQueryBlueprint,
  CategorySummary,
  AgentOrchestrationGuidance,
  CategoryOrchestrationConfig,
  BusinessCategory,
  EntityConnections,
  CategorySnapshot,
  DatasetCatalogEntry,
  DatasetCatalogueEntry,
  InternalRelationshipDefinition,
  LoadedDataset,
  RelationshipLoadResult,
  RawCategoryMetadata,
  RawAgentOrchestrationGuidance,
  RawOrchestrationConfig,
  RawRelationshipEntry,
  RawSchemaFile,
  RawTypeFile,
  RawExampleFile,
  RawQueryFile,
} from "@internal-types/userContext.types";
import {
  BusinessDataCatalog,
  BusinessDataCatalogue,
  UserContextCatalog,
  UserContextCatalogue,
} from "@internal-types/interfaces";
// Phase 5: use shared category validation implementations (types directory will drop runtime copies after enforcement test).
import {
  validateCategoryRecordImpl as validateCategoryRecord,
  formatValidationErrorsImpl as formatValidationErrors,
} from "@shared/validation/categoryValidation";

// Deprecation warning emission registry (ensures one-time logging per accessor).
const emittedDeprecationWarnings = new Set<string>();
/**
 * Emit a structured deprecation warning for a British English accessor name.
 * Warnings are logged exactly once per process to avoid noisy output.
 *
 * @param name - Deprecated British accessor invoked.
 * @param replacement - Recommended American English replacement.
 */
function emitDeprecatedAccessorWarning(
  name: string,
  replacement: string
): void {
  if (emittedDeprecationWarnings.has(name)) return;
  emittedDeprecationWarnings.add(name);
  // Single standardized format to aid future log parsers / health checks.
  console.warn(
    `[DEPRECATED] Accessor '${name}' will be removed in a future release. Use '${replacement}' instead.`
  );
}

// ES module equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// (All type/interface definitions moved to @internal-types/userContext.types to enforce single source of truth.)
// Default root for user context business data. Previously pointed to a deprecated `bin/data` directory.
// The dataset folders now live under `src/userContext` (applications, departments, people, etc.).
// Tests and runtime may override via VSCODE_TEMPLATE_DATA_ROOT.
// When compiled: out/src/agent/userContextAgent/../../../userContext = out/userContext
const DEFAULT_DATA_ROOT = path.resolve(
  __dirname,
  "..",
  "..",
  "..",
  "userContext"
);
// External user data directory (Phase 3.2): ~/.vscode/extensions/<publisher>.<extensionName>/userData
// Prefer installed extension path; fallback to workspace-local path if not present.
/**
 * Resolve the external user data root where user-managed category folders live.
 * Format: ~/.vscode/extensions/<publisher>.<extensionName>/userData
 *
 * @returns {string} Absolute path to the external user data directory.
 */
function resolveExternalUserDataRoot(): string {
  const extensionFolder = IDS.extensionFullId;
  const base = path.join(
    os.homedir(),
    ".vscode",
    "extensions",
    extensionFolder
  );
  return path.join(base, "userData");
}

/**
 * Determine whether the provided root contains at least one valid user category.
 * A valid category directory has a category.json present.
 *
 * @param {string} root - Candidate external user data root.
 * @returns {boolean} True when at least one category folder is discovered.
 */
function hasUserCategories(root: string): boolean {
  try {
    if (!fs.existsSync(root) || !fs.statSync(root).isDirectory()) return false;
    const entries = fs
      .readdirSync(root, { withFileTypes: true })
      .filter((e) => e.isDirectory());
    for (const entry of entries) {
      const categoryDir = path.join(root, entry.name);
      if (fs.existsSync(path.join(categoryDir, "category.json"))) {
        return true;
      }
    }
    return false;
  } catch {
    return false;
  }
}
function resolveActiveDataRoots(): {
  activeRoot: string;
  externalRoot: string;
  usingExternal: boolean;
} {
  // Highest priority: explicit override via environment variable (used heavily by tests)
  const override = process.env.VSCODE_TEMPLATE_DATA_ROOT;
  if (
    override &&
    fs.existsSync(override) &&
    fs.statSync(override).isDirectory()
  ) {
    return {
      activeRoot: override,
      externalRoot: override,
      usingExternal: false,
    };
  }
  const external = resolveExternalUserDataRoot();
  if (hasUserCategories(external)) {
    return {
      activeRoot: external,
      externalRoot: external,
      usingExternal: true,
    };
  }
  try {
    fs.mkdirSync(external, { recursive: true });
  } catch {
    /* ignore */
  }
  return {
    activeRoot: DEFAULT_DATA_ROOT,
    externalRoot: external,
    usingExternal: false,
  };
}

// Backwards-compatible wrapper preserving legacy name used elsewhere in the agent.
function chooseDataRoot(): {
  activeRoot: string;
  externalRoot: string;
  usingExternal: boolean;
} {
  return resolveActiveDataRoots();
}
const LEGACY_CONSOLIDATED_INDEX_CACHE_KEY = "relevant-data:catalogue";
const CONSOLIDATED_INDEX_CACHE_KEY = "relevant-data:catalog";

/**
 * toPosixPath function.
 *
 * @param {string} filePath - filePath parameter.
 * @returns {string} Normalized path using POSIX separators for stable catalog hashing.
 */
function toPosixPath(filePath: string): string {
  return filePath.split(path.sep).join("/");
}

/**
 * parseTypeSchema function.
 *
 * @param {unknown} value - value parameter.
 * @param {string} context - context parameter.
 * @returns {TypeSchema} Parsed, validated type schema in normalized internal representation.
 * @throws {Error} - May throw an error.
 */
function parseTypeSchema(value: unknown, context: string): TypeSchema {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`Invalid type schema for ${context}.`);
  }
  const base = value as { kind?: string };
  switch (base.kind) {
    case "primitive": {
      if (
        !("name" in base) ||
        typeof (base as { name?: unknown }).name !== "string"
      ) {
        throw new Error(`Primitive type for ${context} must declare a name.`);
      }
      const name = (base as { name: string }).name as PrimitiveTypeName;
      const allowed: PrimitiveTypeName[] = [
        "str",
        "int",
        "float",
        "bool",
        "datetime",
      ];
      if (!allowed.includes(name)) {
        throw new Error(
          `Primitive type for ${context} must be one of ${allowed.join(", ")}.`
        );
      }
      return { kind: "primitive", name };
    }
    case "optional": {
      if (!("value" in base)) {
        throw new Error(
          `Optional type for ${context} must declare an inner value.`
        );
      }
      return {
        kind: "optional",
        value: parseTypeSchema(
          (base as { value: unknown }).value,
          `${context}.value`
        ),
      };
    }
    case "list": {
      if (!("element" in base)) {
        throw new Error(
          `List type for ${context} must declare an element schema.`
        );
      }
      return {
        kind: "list",
        element: parseTypeSchema(
          (base as { element: unknown }).element,
          `${context}.element`
        ),
      };
    }
    case "literal": {
      if (!("value" in base)) {
        throw new Error(`Literal type for ${context} must declare a value.`);
      }
      return {
        kind: "literal",
        value: (base as { value: unknown }).value as
          | string
          | number
          | boolean
          | null,
      };
    }
    case "enum": {
      const rawValues = (base as { values?: unknown }).values;
      if (!Array.isArray(rawValues) || rawValues.length === 0) {
        throw new Error(
          `Enum type for ${context} must declare at least one value.`
        );
      }
      for (const entry of rawValues) {
        if (!["string", "number", "boolean"].includes(typeof entry)) {
          throw new Error(
            `Enum values for ${context} must be strings, numbers, or booleans.`
          );
        }
      }
      return {
        kind: "enum",
        values: rawValues as Array<string | number | boolean>,
      };
    }
    case "typedDict": {
      const rawFields = (base as { fields?: unknown }).fields;
      if (!Array.isArray(rawFields) || rawFields.length === 0) {
        throw new Error(
          `TypedDict for ${context} must include at least one field.`
        );
      }
      const fields: TypedDictField[] = rawFields.map((rawField, index) => {
        if (
          !rawField ||
          typeof rawField !== "object" ||
          Array.isArray(rawField)
        ) {
          throw new Error(`Invalid field at index ${index} for ${context}.`);
        }
        const field = rawField as {
          name?: unknown;
          type?: unknown;
          required?: unknown;
          description?: unknown;
        };
        if (typeof field.name !== "string" || field.name.trim() === "") {
          throw new Error(`Field ${index} for ${context} must include a name.`);
        }
        const fieldType = parseTypeSchema(
          field.type,
          `${context}.${field.name}`
        );
        if (
          field.required !== undefined &&
          typeof field.required !== "boolean"
        ) {
          throw new Error(
            `Field '${field.name}' in ${context} has an invalid required value.`
          );
        }
        if (
          field.description !== undefined &&
          typeof field.description !== "string"
        ) {
          throw new Error(
            `Field '${field.name}' in ${context} has an invalid description.`
          );
        }
        return {
          name: field.name,
          type: fieldType,
          required: field.required as boolean | undefined,
          description: field.description as string | undefined,
        };
      });
      return { kind: "typedDict", fields };
    }
    default:
      throw new Error(
        `Unknown type schema kind '${String(base.kind)}' for ${context}.`
      );
  }
}

/**
 * NormalizeLookupKey function.
 *
 * @param {string} value - value parameter.
 * @returns {string} Lowercased, trimmed key used for category lookup alias resolution.
 */
function NormalizeLookupKey(value: string): string {
  return value.trim().toLowerCase();
}

/** Error thrown when a caller references an unknown category. */
export class UnknownCategoryError extends Error {
  /**
   * constructor function.
   *
   * @param {string} topic - Identifier or alias that failed resolution.
   * @returns {unknown} No explicit return; error conveys failed category lookup.
   */
  constructor(topic: string) {
    super(`Unknown category or topic: ${topic}`);
  }
}

/**
 * Agent that manages the user-context workspace representation.
 */
/**
 * Agent responsible for managing user-centric contextual datasets.
 * Follows the standard agent pattern: extends BaseAgentConfig, validates configuration,
 * and uses getConfigItem<T>() for type-safe configuration access.
 *
 * Manages categories, records, relationships, and provides query capabilities
 * for business context data.
 */
export class UserContextAgent extends BaseAgentConfig {
  private readonly cacheDirPromise: Promise<string>;
  private readonly dataRoot: string;
  private readonly externalRoot: string;
  private usingExternal: boolean;
  private readonly categories: Map<CategoryId, BusinessCategory>;
  private readonly lookupIndex: Map<string, BusinessCategory>;
  private readonly relationshipDefinitions: InternalRelationshipDefinition[];
  private readonly relationshipsBySource: Map<
    CategoryId,
    InternalRelationshipDefinition[]
  >;
  private readonly consolidatedIndex: DatasetCatalogEntry[];
  private readonly datasetFingerprint: string;
  private readonly telemetry = createInvocationLogger(
    UserContextAgentProfile.id
  );

  /**
   * Creates a new UserContextAgent with validated configuration.
   *
   * @param {AgentConfigDefinition} [config] - Optional pre-loaded configuration. Defaults to userContextAgentConfig.
   * @param {Promise<string>} [cacheDirPromise] - Optional cache directory promise for testing/custom cache locations.
   * @throws {Error} When configuration validation fails.
   */
  constructor(
    config?: AgentConfigDefinition,
    cacheDirPromise?: Promise<string>
  ) {
    // Validate and initialize configuration
    const configToUse = config || userContextAgentConfig;
    const validationResult = validateAgentConfig(configToUse);
    if (!validationResult.isValid) {
      const report = generateValidationReport(validationResult);
      throw new Error(`Invalid UserContext agent configuration:\n${report}`);
    }

    super(configToUse);
    this._validateRequiredSections();

    // Initialize cache and data root
    this.cacheDirPromise = cacheDirPromise ?? ensureCacheDirectory();
    const rootChoice = resolveActiveDataRoots();
    this.dataRoot = rootChoice.activeRoot;
    this.externalRoot = rootChoice.externalRoot;
    this.usingExternal = rootChoice.usingExternal;

    // Load dataset
    const dataset = this.loadDataset();
    this.categories = dataset.categories;
    this.lookupIndex = dataset.lookupIndex;
    this.relationshipDefinitions = dataset.relationships;
    this.relationshipsBySource = this.groupRelationshipsBySource(
      dataset.relationships
    );
    this.consolidatedIndex = dataset.consolidatedIndex;
    this.datasetFingerprint = dataset.fingerprint;

    void this.persistConsolidatedIndex();
  }

  /**
   * Validates that required configuration sections are present.
   *
   * @throws {Error} When required sections are missing.
   * @private
   */
  private _validateRequiredSections(): void {
    const metadata = this.getConfigItem<unknown>(
      "relevantDataManager.metadata"
    );
    if (!metadata) {
      throw new Error(
        "UserContext config missing relevantDataManager.metadata section"
      );
    }

    const caching = this.getConfigItem<unknown>("relevantDataManager.caching");
    if (!caching) {
      throw new Error(
        "UserContext config missing relevantDataManager.caching section"
      );
    }

    const validation = this.getConfigItem<unknown>(
      "relevantDataManager.validation"
    );
    if (!validation) {
      throw new Error(
        "UserContext config missing relevantDataManager.validation section"
      );
    }
  }

  /**
   * Enumerate the categories available to the MCP client.
   *
   * @returns {CategorySummary[]} Array of category summaries (id, name, description) for discovery.
   */
  listCategories(): CategorySummary[] {
    return Array.from(this.categories.values()).map((category) => ({
      id: category.id,
      name: category.name,
      description: category.description,
    }));
  }

  /**
   * Resolve a topic or identifier to the underlying category definition.
   *
   * @param {string} topicOrId - topicOrId parameter.
   * @returns {BusinessCategory} Fully hydrated category including records, schemas, and relationships.
   * @throws {Error} - May throw an error.
   */
  getCategory(topicOrId: string): BusinessCategory {
    const key = NormalizeLookupKey(topicOrId);
    const category = this.lookupIndex.get(key);
    if (!category) {
      throw new UnknownCategoryError(topicOrId);
    }
    return category;
  }

  /**
   * Retrieve the folder blueprint for a given topic.
   *
   * @param {string} topicOrId - topicOrId parameter.
   * @returns {FolderBlueprint} Folder blueprint describing expected structure & key files for the category.
   */
  getFolderBlueprint(topicOrId: string): FolderBlueprint {
    return this.getCategory(topicOrId).config.folder;
  }

  /**
   * Access category configuration metadata such as relationships.
   *
   * @param {string} topicOrId - topicOrId parameter.
   * @returns {BusinessCategory["config"]} Configuration metadata (folder, orchestration, relationships, queries).
   */
  getCategoryConfig(topicOrId: string): BusinessCategory["config"] {
    return this.getCategory(topicOrId).config;
  }

  /**
   * Access the JSON schemas associated with a category.
   *
   * @param {string} topicOrId - topicOrId parameter.
   * @returns {CategorySchema[]} Array of JSON schema descriptors associated with the category.
   */
  getCategorySchemas(topicOrId: string): CategorySchema[] {
    return this.getCategory(topicOrId).schemas;
  }

  /**
   * Retrieve structured type definitions provided as guidance for SDK authors.
   *
   * @param {string} topicOrId - topicOrId parameter.
   * @returns {TypeDefinition[]} Parsed and validated structured type definitions for the category.
   */
  getTypeDefinitions(topicOrId: string): TypeDefinition[] {
    return this.getCategory(topicOrId).types;
  }

  /**
   * Fetch example datasets included inside the category folder.
   *
   * @param {string} topicOrId - topicOrId parameter.
   * @returns {ExampleDataset[]} Example dataset artefacts discovered under the examples directory.
   */
  getExamples(topicOrId: string): ExampleDataset[] {
    return this.getCategory(topicOrId).examples;
  }

  /**
   * Retrieve the validation report generated for the category data.
   *
   * @param {string} topicOrId - topicOrId parameter.
   * @returns {DataValidationReport} Aggregated validation status and issues for the category records.
   */
  getValidationReport(topicOrId: string): DataValidationReport {
    return this.getCategory(topicOrId).validation;
  }

  /**
   * Retrieve query blueprints that demonstrate how to call the authoritative upstream system.
   *
   * @param {string} topicOrId - topicOrId parameter.
   * @returns {RemoteQueryBlueprint[]} Remote query blueprint descriptors defined for the category.
   */
  getQueries(topicOrId: string): RemoteQueryBlueprint[] {
    return this.getCategory(topicOrId).queries;
  }

  /**
   * Return all records stored in the local mock dataset for a category.
   *
   * @param {string} topicOrId - topicOrId parameter.
   * @returns {CategoryRecord[]} All records stored for the referenced category.
   */
  getRecords(topicOrId: string): CategoryRecord[] {
    return this.getCategory(topicOrId).records;
  }

  /**
   * Compute a deterministic hash of the records for change detection.
   *
   * @param {string} topicOrId - topicOrId parameter.
   * @returns {string} Stable hash of the records for change detection.
   */
  getCategoryRecordHash(topicOrId: string): string {
    const category = this.getCategory(topicOrId);
    return this.hashRecords(category.records);
  }

  /**
   * Expose the dataset fingerprint used to detect catalogue changes.
   *
   * @returns {string} Dataset fingerprint (sha1 of consolidated index) for cache invalidation.
   */
  getDatasetFingerprint(): string {
    return this.datasetFingerprint;
  }

  /**
   * Expose which data root is currently active. Helpful for tests & diagnostics.
   *
   * @returns {{ active: string; external: string; usingExternal: boolean }} Resolution details.
   */
  getActiveDataRoot(): {
    active: string;
    external: string;
    usingExternal: boolean;
  } {
    return {
      active: this.dataRoot,
      external: this.externalRoot,
      usingExternal: this.usingExternal,
    };
  }

  /**
   * Export current active dataset (category folders) to a target directory.
   *
   * @param {string} destination - Absolute path to export into (will be created).
   * @returns {string[]} List of exported category ids.
   * @throws {Error} When destination cannot be written.
   */
  exportUserData(destination: string): string[] {
    const sourceRoot = this.dataRoot;
    fs.mkdirSync(destination, { recursive: true });
    const exported: string[] = [];
    const entries = fs
      .readdirSync(sourceRoot, { withFileTypes: true })
      .filter((e) => e.isDirectory());
    for (const entry of entries) {
      const categoryDir = path.join(sourceRoot, entry.name);
      if (!fs.existsSync(path.join(categoryDir, "category.json"))) continue; // skip non-category dirs
      const targetDir = path.join(destination, entry.name);
      fs.mkdirSync(targetDir, { recursive: true });
      // Shallow copy: category.json, records.json, relationships.json plus subfolders (schemas/types/examples/queries)
      const copyItems = ["category.json", "records.json", "relationships.json"];
      for (const item of copyItems) {
        const src = path.join(categoryDir, item);
        if (fs.existsSync(src)) {
          fs.copyFileSync(src, path.join(targetDir, item));
        }
      }
      for (const sub of ["schemas", "types", "examples", "queries"]) {
        const subSrc = path.join(categoryDir, sub);
        if (!fs.existsSync(subSrc) || !fs.statSync(subSrc).isDirectory())
          continue;
        const subDest = path.join(targetDir, sub);
        fs.mkdirSync(subDest, { recursive: true });
        for (const file of fs.readdirSync(subSrc)) {
          const srcFile = path.join(subSrc, file);
          if (fs.statSync(srcFile).isFile()) {
            fs.copyFileSync(srcFile, path.join(subDest, file));
          }
        }
      }
      exported.push(entry.name);
    }
    return exported;
  }

  /**
   * Import user data from a directory of category folders into the external user data root.
   * Replaces existing category folder contents. After import, reloads the dataset.
   *
   * @param {string} source - Directory containing category subfolders.
   * @returns {string[]} Imported category ids.
   * @throws {Error} When validation fails or source unreadable.
   */
  importUserData(source: string): string[] {
    if (!fs.existsSync(source) || !fs.statSync(source).isDirectory()) {
      throw new Error(
        `Import source '${source}' does not exist or is not a directory.`
      );
    }
    const entries = fs
      .readdirSync(source, { withFileTypes: true })
      .filter((e) => e.isDirectory());
    if (entries.length === 0) {
      throw new Error(
        `Import source '${source}' contains no category folders.`
      );
    }
    fs.mkdirSync(this.externalRoot, { recursive: true });
    const imported: string[] = [];
    for (const entry of entries) {
      const categoryDir = path.join(source, entry.name);
      const configPath = path.join(categoryDir, "category.json");
      if (!fs.existsSync(configPath)) {
        continue; // skip invalid folder
      }
      // Basic validation: parse category.json for id/name
      const metadata = this.loadJsonFile<RawCategoryMetadata>(
        configPath,
        `import metadata for ${entry.name}`
      );
      if (!metadata.id || !metadata.name) {
        throw new Error(
          `Category '${entry.name}' missing id or name in import source.`
        );
      }
      const targetDir = path.join(this.externalRoot, entry.name);
      // Clear existing contents
      if (fs.existsSync(targetDir)) {
        for (const existing of fs.readdirSync(targetDir)) {
          const existingPath = path.join(targetDir, existing);
          fs.rmSync(existingPath, { recursive: true, force: true });
        }
      } else {
        fs.mkdirSync(targetDir, { recursive: true });
      }
      // Copy
      for (const item of fs.readdirSync(categoryDir)) {
        const srcItem = path.join(categoryDir, item);
        const destItem = path.join(targetDir, item);
        if (fs.statSync(srcItem).isDirectory()) {
          fs.mkdirSync(destItem, { recursive: true });
          for (const sub of fs.readdirSync(srcItem)) {
            const subSrc = path.join(srcItem, sub);
            const subDest = path.join(destItem, sub);
            if (fs.statSync(subSrc).isFile()) {
              fs.copyFileSync(subSrc, subDest);
            }
          }
        } else if (fs.statSync(srcItem).isFile()) {
          fs.copyFileSync(srcItem, destItem);
        }
      }
      imported.push(metadata.id);
    }
    // If we were previously using default root and now imported data, switch to external root.
    if (!this.usingExternal) {
      this.usingExternal = true; // Mark now using external; recommend instantiating new agent for full reload.
    }
    return imported;
  }

  /**
   * Retrieve a single record by identifier.
   *
   * @param {string} topicOrId - topicOrId parameter.
   * @param {string} recordId - recordId parameter.
   * @returns {CategoryRecord | undefined} Record matching the identifier or undefined if not found.
   */
  getRecord(topicOrId: string, recordId: string): CategoryRecord | undefined {
    return this.getRecords(topicOrId).find((record) => record.id === recordId);
  }

  /**
   * Perform a keyword search across every category.
   *
   * @param {string} keyword - Search term to scan across record fields.
   * @returns {Array<{ categoryId: CategoryId; record: CategoryRecord; matchingFields: string[]; }>} Matches including category and fields.
   */
  searchAcrossCategories(keyword: string): Array<{
    categoryId: CategoryId;
    record: CategoryRecord;
    matchingFields: string[];
  }> {
    const needle = keyword.trim().toLowerCase();
    const matches: Array<{
      categoryId: CategoryId;
      record: CategoryRecord;
      matchingFields: string[];
    }> = [];
    if (!needle) {
      return matches;
    }
    for (const category of this.categories.values()) {
      for (const record of category.records) {
        const matchedFields: string[] = [];
        for (const [field, value] of Object.entries(record)) {
          if (value == null) {
            continue;
          }
          if (
            typeof value === "string" &&
            value.toLowerCase().includes(needle)
          ) {
            matchedFields.push(field);
            continue;
          }
          if (
            Array.isArray(value) &&
            value.some(
              (item) =>
                typeof item === "string" && item.toLowerCase().includes(needle)
            )
          ) {
            matchedFields.push(field);
          }
        }
        if (matchedFields.length > 0) {
          matches.push({
            categoryId: category.id,
            record,
            matchingFields: matchedFields,
          });
        }
      }
    }
    return matches;
  }

  /**
   * Build a snapshot view of a category and persist it to the shared cache.
   *
   * @param {string} [topicOrId] - Category identifier or topic. If undefined, uses first available category.
   * @returns {Promise<CategorySnapshot>} Cached or newly generated snapshot summarising the category.
   * @throws {Error} If no categories are available.
   */
  async getOrCreateSnapshot(topicOrId?: string): Promise<CategorySnapshot> {
    return this.telemetry("getOrCreateSnapshot", async () => {
      // Data-driven: If no category specified, use first available category
      let resolvedTopic = topicOrId;
      if (!resolvedTopic) {
        const categories = this.listCategories();
        if (categories.length === 0) {
          throw new Error("No categories available in UserContext");
        }
        resolvedTopic = categories[0].id;
      }
      const category = this.getCategory(resolvedTopic);
      const cacheKey = `relevant-data:${category.id}:snapshot`;
      const cacheDir = await this.cacheDirPromise;
      const currentHash = this.getCategoryRecordHash(category.id);
      const cached = await readSharedCacheEntry<CategorySnapshot>(
        cacheDir,
        cacheKey
      );
      if (cached?.metadata?.recordHash === currentHash) {
        return cached.value;
      }
      const snapshot: CategorySnapshot = {
        id: category.id,
        name: category.name,
        description: category.description,
        recordCount: category.records.length,
        schemaNames: category.schemas.map((schema) => schema.name),
        typeNames: category.types.map((typeDef) => typeDef.name),
        queryNames: category.queries.map((query) => query.name),
        exampleFiles: category.examples.map((example) => example.file),
        folder: category.config.folder,
      };
      const entry: SharedCacheEntry<CategorySnapshot> = {
        key: cacheKey,
        toolName: UserContextAgentProfile.id,
        timestamp: new Date().toISOString(),
        value: snapshot,
        metadata: {
          recordHash: currentHash,
        },
      };
      await storeSharedCacheEntry(cacheDir, entry);
      return snapshot;
    });
  }

  /**
   * Resolve relationships for a given record across categories.
   *
   * @param {string} topicOrId - topicOrId parameter.
   * @param {string} recordId - recordId parameter.
   * @returns {EntityConnections} Relationship resolution result including linked records.
   * @throws {Error} - May throw an error.
   */
  getEntityConnections(topicOrId: string, recordId: string): EntityConnections {
    const category = this.getCategory(topicOrId);
    const record = this.getRecord(category.id, recordId);
    if (!record) {
      throw new Error(
        `Record ${recordId} not found in category ${category.id}`
      );
    }
    const connections: EntityConnections["connections"] = [];
    const relationshipRules = this.relationshipsBySource.get(category.id) ?? [];
    for (const relationship of relationshipRules) {
      const value = record[relationship.sourceField];
      if (value == null) {
        continue;
      }
      const relatedRecords = this.resolveTargets(relationship, value);
      if (relatedRecords.length === 0) {
        continue;
      }
      connections.push({
        relationship: relationship.relationshipName,
        targetCategory: relationship.targetCategory,
        records: relatedRecords,
      });
    }
    return { categoryId: category.id, recordId, connections };
  }

  /**
   * Expose the consolidated dataset catalog built from the data directory (American English).
   * @returns {DatasetCatalogEntry[]} Consolidated dataset catalog entries for every category.
   */
  getDatasetCatalog(): DatasetCatalogEntry[] {
    return this.consolidatedIndex;
  }

  /**
   * Deprecated British English variant retained for compatibility.
   * @deprecated Use {@link getDatasetCatalog} instead.
   */
  getDatasetCatalogue(): DatasetCatalogueEntry[] {
    emitDeprecatedAccessorWarning("getDatasetCatalogue", "getDatasetCatalog");
    return this.consolidatedIndex as DatasetCatalogueEntry[];
  }

  /**
   * Build an aggregate business data catalog snapshot (American English).
   * @returns {BusinessDataCatalog} Catalog containing categories, relationship descriptions, schemas and timestamp.
   */
  getBusinessDataCatalog(): BusinessDataCatalog {
    return {
      categories: Array.from(this.categories.values()).map((cat) => ({
        id: cat.id,
        name: cat.name,
        description: cat.description,
        recordCount: cat.records.length,
        schemaVersion: "1",
        relationships: cat.config.relationships,
      })),
      relationships: this.relationshipDefinitions.map((def) => ({
        name: def.relationshipName,
        description: def.relationshipName,
        targetCategory: def.targetCategory,
        viaField: def.sourceField,
      })),
      schemas: Array.from(this.categories.values()).flatMap((cat) =>
        cat.schemas.map((s) => ({ name: s.name, schema: s.schema }))
      ),
      lastUpdated: new Date().toISOString(),
    };
  }

  /**
   * Deprecated British English variant of business data catalog accessor.
   * @deprecated Use getBusinessDataCatalog instead.
   */
  getBusinessDataCatalogue(): BusinessDataCatalogue {
    emitDeprecatedAccessorWarning(
      "getBusinessDataCatalogue",
      "getBusinessDataCatalog"
    );
    return this.getBusinessDataCatalog();
  }

  /**
   * User context catalog accessor (semantic alias for business catalog).
   * @returns {UserContextCatalog} User context catalog snapshot.
   */
  getUserContextCatalog(): UserContextCatalog {
    return this.getBusinessDataCatalog();
  }

  /**
   * Deprecated British English user context accessor.
   * @deprecated Use getUserContextCatalog instead.
   */
  getUserContextCatalogue(): UserContextCatalogue {
    emitDeprecatedAccessorWarning(
      "getUserContextCatalogue",
      "getUserContextCatalog"
    );
    return this.getUserContextCatalog();
  }

  /**
   * loadDataset function.
   *
   * @returns {LoadedDataset} Fully materialised dataset including categories, lookup indices, relationships and fingerprint.
   * @throws {Error} - May throw an error.
   */
  private loadDataset(): LoadedDataset {
    if (!fs.existsSync(this.dataRoot)) {
      throw new Error(`Data directory '${this.dataRoot}' does not exist.`);
    }
    const categories = new Map<CategoryId, BusinessCategory>();
    const lookupIndex = new Map<string, BusinessCategory>();
    const relationships: InternalRelationshipDefinition[] = [];
    const consolidatedIndex: DatasetCatalogEntry[] = [];
    const loadErrors: Array<{ categoryName: string; error: string }> = [];

    const entries = fs
      .readdirSync(this.dataRoot, { withFileTypes: true })
      .filter((entry) => entry.isDirectory());
    if (entries.length === 0) {
      throw new Error(
        `No category folders were found inside '${this.dataRoot}'.`
      );
    }

    for (const entry of entries) {
      const categoryDir = path.join(this.dataRoot, entry.name);
      try {
        const { category, relationshipDefinitions } = this.loadCategory(
          categoryDir,
          entry.name
        );
        categories.set(category.id, category);
        consolidatedIndex.push(this.createCatalogEntry(category));
        relationships.push(...relationshipDefinitions);
        for (const key of [category.id, category.name, ...category.aliases]) {
          lookupIndex.set(NormalizeLookupKey(key), category);
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        loadErrors.push({ categoryName: entry.name, error: message });
        console.warn(`Skipping category '${entry.name}': ${message}`);
      }
    }

    if (categories.size === 0) {
      throw new Error(
        `No valid categories could be loaded. Errors encountered: ${loadErrors
          .map((e) => `${e.categoryName}: ${e.error}`)
          .join("; ")}`
      );
    }

    if (loadErrors.length > 0) {
      console.warn(
        `Loaded ${categories.size} categories with ${loadErrors.length} failures.`
      );
    }

    this.performRelationshipValidation(categories, relationships);

    const fingerprint = crypto
      .createHash("sha1")
      .update(JSON.stringify(consolidatedIndex))
      .digest("hex");

    return {
      categories,
      lookupIndex,
      relationships,
      consolidatedIndex,
      fingerprint,
    };
  }

  /**
   * loadCategory function.
   *
   * @param {string} categoryDir - Absolute path to category folder containing config and data assets.
   * @param {string} [categoryName] - Optional category folder name for diagnostics.
   * @returns {{ category: BusinessCategory; relationshipDefinitions: InternalRelationshipDefinition[]; source: string }} Loaded category, relationships, and source path.
   * @throws {Error} When required files like category.json are missing or malformed.
   */
  private loadCategory(
    categoryDir: string,
    categoryName?: string
  ): {
    category: BusinessCategory;
    relationshipDefinitions: InternalRelationshipDefinition[];
    source: string;
  } {
    const displayName = categoryName ?? path.basename(categoryDir);

    // Resolve paths with fallback chain: external userData → workspace → examples
    const configPath = this.resolveCategoryFile(
      categoryDir,
      "category.json",
      displayName
    );
    const recordsPath = this.resolveCategoryFile(
      categoryDir,
      "records.json",
      displayName
    );
    const relationshipsPath = this.resolveCategoryFile(
      categoryDir,
      "relationships.json",
      displayName
    );

    const metadata = this.loadJsonFile<RawCategoryMetadata>(
      configPath,
      `metadata for ${displayName}`
    );
    if (!metadata.id || !metadata.name || !metadata.description) {
      throw new Error(
        `Category metadata at '${configPath}' is missing required fields.`
      );
    }
    const folder = this.buildFolderBlueprint(categoryDir, configPath);
    const orchestration = this.NormalizeOrchestrationConfig(
      metadata.config.orchestration,
      configPath
    );
    const schemas = this.loadSchemas(categoryDir);
    const typeDefinitions = this.loadTypeDefinitions(categoryDir);
    const examples = this.loadExamples(categoryDir);
    const queries = this.loadQueries(categoryDir);
    const { descriptions, definitions } = this.loadRelationships(
      relationshipsPath,
      metadata.id
    );
    const records = this.loadRecords(
      recordsPath,
      metadata.id,
      metadata.config.requirements
    );
    const validation = this.validateCategoryRecords(
      schemas,
      records,
      definitions
    );

    const category: BusinessCategory = {
      id: metadata.id,
      name: metadata.name,
      description: metadata.description,
      aliases: metadata.aliases ?? [],
      config: {
        purpose: metadata.config.purpose,
        primaryKeys: metadata.config.primaryKeys,
        updateCadence: metadata.config.updateCadence,
        access: metadata.config.access,
        folder,
        requirements: metadata.config.requirements,
        relationships: descriptions,
        orchestration,
      },
      schemas,
      types: typeDefinitions,
      examples,
      queries,
      records,
      validation,
    };

    if (metadata.config.requirements?.requiredRelationshipFields) {
      this.assertRelationshipCoverage(
        metadata.config.requirements.requiredRelationshipFields,
        definitions,
        `category ${metadata.id}`
      );
    }

    return {
      category,
      relationshipDefinitions: definitions,
      source: configPath,
    };
  }

  /**
   * Resolve a category file path with fallback chain: external userData → workspace (bundled examples).
   * Enables graceful degradation when user customizations are incomplete.
   * The workspace serves as both the default dataset and example data for new users.
   *
   * @param {string} categoryDir - Base category directory path.
   * @param {string} filename - Target file (e.g., 'category.json', 'records.json').
   * @param {string} displayName - Category name for error messages.
   * @returns {string} Resolved absolute file path.
   * @throws {Error} When file cannot be found in any fallback location.
   */
  private resolveCategoryFile(
    categoryDir: string,
    filename: string,
    displayName: string
  ): string {
    // Try primary location (could be external or workspace depending on how agent was initialized)
    const primaryPath = path.join(categoryDir, filename);
    if (fs.existsSync(primaryPath)) {
      return primaryPath;
    }

    // Fallback chain: if external root was selected but file missing, try workspace
    // The workspace (DEFAULT_DATA_ROOT) contains bundled example categories and serves as the fallback
    if (this.usingExternal) {
      const categoryName = path.basename(categoryDir);
      const workspacePath = path.join(
        DEFAULT_DATA_ROOT,
        categoryName,
        filename
      );
      if (fs.existsSync(workspacePath)) {
        console.warn(
          `Category '${displayName}': using workspace fallback for ${filename}`
        );
        return workspacePath;
      }
    }

    throw new Error(
      `Missing required file '${filename}' for category '${displayName}' (checked: ${primaryPath}${
        this.usingExternal
          ? `, ${path.join(
              DEFAULT_DATA_ROOT,
              path.basename(categoryDir),
              filename
            )}`
          : ""
      })`
    );
  }

  /**
   * NormalizeOrchestrationConfig function.
   *
   * @param {RawOrchestrationConfig | undefined} raw - raw parameter.
   * @param {string} context - context parameter.
   * @returns {CategoryOrchestrationConfig} Normalised orchestration configuration.
   * @throws {Error} - May throw an error.
   */
  private NormalizeOrchestrationConfig(
    raw: RawOrchestrationConfig | undefined,
    context: string
  ): CategoryOrchestrationConfig {
    if (!raw) {
      throw new Error(`Missing orchestration guidance inside '${context}'.`);
    }
    const summary = this.ensureString(
      raw.summary,
      `${context} orchestration.summary`
    );
    const signals = this.ensureStringArray(
      raw.signals,
      `${context} orchestration.signals`
    );
    const escalateWhen =
      raw.escalateWhen !== undefined
        ? this.ensureStringArray(
            raw.escalateWhen,
            `${context} orchestration.escalateWhen`
          )
        : undefined;
    const agents = raw.agents;
    if (!agents) {
      throw new Error(`Missing orchestration.agents inside '${context}'.`);
    }
    return {
      summary,
      signals,
      escalateWhen,
      agents: {
        relevantDataManager: this.NormalizeAgentGuidance(
          agents.relevantDataManager,
          "relevantDataManager",
          context
        ),
        databaseAgent: this.NormalizeAgentGuidance(
          agents.databaseAgent,
          "databaseAgent",
          context
        ),
        dataAgent: this.NormalizeAgentGuidance(
          agents.dataAgent,
          "dataAgent",
          context
        ),
      },
    };
  }

  /**
   * NormalizeAgentGuidance function.
   *
   * @param {RawAgentOrchestrationGuidance | undefined} raw - raw parameter.
   * @param {keyof CategoryOrchestrationConfig["agents"]} agentKey - agentKey parameter.
   * @param {string} context - context parameter.
   * @returns {AgentOrchestrationGuidance} Validated agent routing guidance object.
   * @throws {Error} - May throw an error.
   */
  private NormalizeAgentGuidance(
    raw: RawAgentOrchestrationGuidance | undefined,
    agentKey: keyof CategoryOrchestrationConfig["agents"],
    context: string
  ): AgentOrchestrationGuidance {
    if (!raw) {
      throw new Error(
        `Missing orchestration.agents.${String(agentKey)} inside '${context}'.`
      );
    }
    return {
      focus: this.ensureString(
        raw.focus,
        `${context} orchestration.agents.${String(agentKey)}.focus`
      ),
      signals: this.ensureStringArray(
        raw.signals,
        `${context} orchestration.agents.${String(agentKey)}.signals`
      ),
      promptStarters: this.ensureStringArray(
        raw.promptStarters,
        `${context} orchestration.agents.${String(agentKey)}.promptStarters`
      ),
    };
  }

  /**
   * ensureString function.
   *
   * @param {unknown} value - value parameter.
   * @param {string} context - context parameter.
   * @returns {string} Normalised guidance string value or fallback.
   * @throws {Error} - May throw an error.
   */
  private ensureString(value: unknown, context: string): string {
    if (typeof value !== "string") {
      throw new Error(`Expected ${context} to be a string.`);
    }
    const trimmed = value.trim();
    if (!trimmed) {
      throw new Error(`Expected ${context} to be a non-empty string.`);
    }
    return trimmed;
  }

  /**
   * ensureStringArray function.
   *
   * @param {unknown} value - value parameter.
   * @param {string} context - context parameter.
   * @returns {string[]} Normalised array of guidance strings.
   * @throws {Error} - May throw an error.
   */
  private ensureStringArray(value: unknown, context: string): string[] {
    if (!Array.isArray(value) || value.length === 0) {
      throw new Error(`Expected ${context} to be a non-empty string array.`);
    }
    return value.map((entry, index) => {
      if (typeof entry !== "string") {
        throw new Error(`Expected ${context}[${index}] to be a string.`);
      }
      const trimmed = entry.trim();
      if (!trimmed) {
        throw new Error(
          `Expected ${context}[${index}] to be a non-empty string.`
        );
      }
      return trimmed;
    });
  }

  /**
   * buildFolderBlueprint function.
   *
   * @param {string} categoryDir - categoryDir parameter.
   * @param {string} configPath - configPath parameter.
   * @returns {FolderBlueprint} Blueprint describing folder structure (config, schemas, types, examples, queries).
   */
  private buildFolderBlueprint(
    categoryDir: string,
    configPath: string
  ): FolderBlueprint {
    const schemasDir = this.requireDirectory(path.join(categoryDir, "schemas"));
    const typesDir = this.requireDirectory(path.join(categoryDir, "types"));
    const examplesDir = this.requireDirectory(
      path.join(categoryDir, "examples")
    );
    const queriesDir = this.requireDirectory(path.join(categoryDir, "queries"));

    return {
      root: toPosixPath(path.relative(process.cwd(), categoryDir)),
      configFile: toPosixPath(path.relative(process.cwd(), configPath)),
      schemaFiles: this.collectFiles(schemasDir, [".json"]),
      typeFiles: this.collectFiles(typesDir, [".json"]),
      examplesDir: toPosixPath(path.relative(process.cwd(), examplesDir)),
      queriesDir: toPosixPath(path.relative(process.cwd(), queriesDir)),
    };
  }

  /**
   * requireDirectory function.
   *
   * @param {string} target - target parameter.
   * @returns {string} Absolute path to a subdirectory within the category.
   * @throws {Error} - May throw an error.
   */
  private requireDirectory(target: string): string {
    if (!fs.existsSync(target) || !fs.statSync(target).isDirectory()) {
      throw new Error(`Expected directory '${target}' to exist.`);
    }
    return target;
  }

  /**
   * collectFiles function.
   *
   * @param {string} targetDir - targetDir parameter.
   * @param {string[]} extensions - extensions parameter.
   * @returns {string[]} File paths matching the provided extension under the directory.
   */
  private collectFiles(targetDir: string, extensions: string[]): string[] {
    return fs
      .readdirSync(targetDir, { withFileTypes: true })
      .filter(
        (entry) =>
          entry.isFile() && extensions.includes(path.extname(entry.name))
      )
      .map((entry) =>
        toPosixPath(
          path.relative(process.cwd(), path.join(targetDir, entry.name))
        )
      );
  }

  /**
   * loadSchemas function.
   *
   * @param {string} categoryDir - categoryDir parameter.
   * @returns {CategorySchema[]} Parsed schema descriptors.
   * @throws {Error} - May throw an error.
   */
  private loadSchemas(categoryDir: string): CategorySchema[] {
    const target = path.join(categoryDir, "schemas");
    return this.collectFiles(target, [".json"]).map((file) => {
      const schema = this.loadJsonFile<RawSchemaFile>(
        path.join(process.cwd(), file),
        `schema '${file}'`
      );
      if (!schema.name || !schema.description || !schema.schema) {
        throw new Error(`Schema file '${file}' is missing required fields.`);
      }
      return schema;
    });
  }

  /**
   * loadTypeDefinitions function.
   *
   * @param {string} categoryDir - categoryDir parameter.
   * @returns {TypeDefinition[]} Parsed type definition descriptors.
   * @throws {Error} - May throw an error.
   */
  private loadTypeDefinitions(categoryDir: string): TypeDefinition[] {
    const target = path.join(categoryDir, "types");
    return this.collectFiles(target, [".json"]).map((file) => {
      const typeFile = this.loadJsonFile<RawTypeFile>(
        path.join(process.cwd(), file),
        `type definition '${file}'`
      );
      if (!typeFile.name || !typeFile.description) {
        throw new Error(
          `Type definition file '${file}' is missing required fields.`
        );
      }
      const schema = parseTypeSchema(
        typeFile.schema,
        `type definition '${file}'`
      );
      return { name: typeFile.name, description: typeFile.description, schema };
    });
  }

  /**
   * loadExamples function.
   *
   * @param {string} categoryDir - categoryDir parameter.
   * @returns {ExampleDataset[]} - Example dataset descriptors (file path, description, parsed sample payload).
   * @throws {Error} - May throw an error.
   */
  private loadExamples(categoryDir: string): ExampleDataset[] {
    const target = path.join(categoryDir, "examples");
    return this.collectFiles(target, [".json"]).map((file) => {
      const example = this.loadJsonFile<RawExampleFile>(
        path.join(process.cwd(), file),
        `example '${file}'`
      );
      if (!example.description || !example.sample) {
        throw new Error(`Example file '${file}' is missing required fields.`);
      }
      return { file, description: example.description, sample: example.sample };
    });
  }

  /**
   * validateCategoryRecords function.
   *
   * @param {CategorySchema[]} schemas - schemas parameter.
   * @param {CategoryRecord[]} records - records parameter.
   * @param {InternalRelationshipDefinition[]} relationshipDefinitions - relationshipDefinitions parameter.
   * @returns {DataValidationReport} - Aggregated validation status and issues for category records across schemas & relationships.
   */
  private validateCategoryRecords(
    schemas: CategorySchema[],
    records: CategoryRecord[],
    relationshipDefinitions: InternalRelationshipDefinition[]
  ): DataValidationReport {
    const issues: DataValidationIssue[] = [];

    // Validate each record using TypeScript type guards
    for (const record of records) {
      const validationResult = validateCategoryRecord(record);

      if (!validationResult.valid) {
        const errorMessage = formatValidationErrors(validationResult.errors);
        issues.push({
          recordId: record.id || "__unknown__",
          schema: schemas[0]?.name,
          message:
            errorMessage || "Record does not conform to expected structure.",
          type: "schema",
        });
      }
    }

    // Ensure relationship source fields are present when required.
    for (const definition of relationshipDefinitions) {
      for (const record of records) {
        if (!(definition.sourceField in record)) {
          issues.push({
            recordId: record.id,
            field: definition.sourceField,
            message: `Missing relationship field '${definition.sourceField}' for relationship '${definition.relationshipName}'.`,
            type: "relationship",
          });
        }
      }
    }

    return {
      checkedAt: new Date().toISOString(),
      status: issues.length === 0 ? "pass" : "fail",
      issues,
    };
  }

  /**
   * loadQueries function.
   *
   * @param {string} categoryDir - categoryDir parameter.
   * @returns {RemoteQueryBlueprint[]} - Remote query blueprint descriptors (name, description, sample payload).
   * @throws {Error} - May throw an error.
   */
  private loadQueries(categoryDir: string): RemoteQueryBlueprint[] {
    const target = path.join(categoryDir, "queries");
    return this.collectFiles(target, [".json"]).map((file) => {
      const query = this.loadJsonFile<RawQueryFile>(
        path.join(process.cwd(), file),
        `query '${file}'`
      );
      if (!query.name || !query.samplePayload) {
        throw new Error(`Query file '${file}' is missing required fields.`);
      }
      return query;
    });
  }

  /**
   * performRelationshipValidation function.
   *
   * @param {Map<CategoryId, BusinessCategory>} categories - categories parameter.
   * @param {InternalRelationshipDefinition[]} relationships - relationships parameter.
   */
  private performRelationshipValidation(
    categories: Map<CategoryId, BusinessCategory>,
    relationships: InternalRelationshipDefinition[]
  ): void {
    const bySource = this.groupRelationshipsBySource(relationships);
    for (const category of categories.values()) {
      const rules = bySource.get(category.id) ?? [];
      const relationshipIssues: DataValidationIssue[] = [];
      for (const record of category.records) {
        for (const rule of rules) {
          const values = this.NormalizeRelationshipValues(
            record[rule.sourceField]
          );
          if (values.length === 0) {
            continue;
          }
          const targetCategory = categories.get(rule.targetCategory);
          if (!targetCategory) {
            relationshipIssues.push({
              recordId: record.id,
              field: rule.sourceField,
              message: `Relationship '${rule.relationshipName}' references missing category '${rule.targetCategory}'.`,
              type: "relationship",
            });
            continue;
          }
          for (const value of values) {
            const hasMatch = targetCategory.records.some((candidate) =>
              this.hasMatchingRecordValue(candidate, rule.targetField, value)
            );
            if (!hasMatch) {
              relationshipIssues.push({
                recordId: record.id,
                field: rule.sourceField,
                message: `Relationship '${rule.relationshipName}' value '${value}' does not match any '${rule.targetCategory}.${rule.targetField}'.`,
                type: "relationship",
              });
            }
          }
        }
      }
      const mergedIssues = [
        ...category.validation.issues,
        ...relationshipIssues,
      ];
      category.validation = {
        checkedAt: new Date().toISOString(),
        status: mergedIssues.length === 0 ? "pass" : "fail",
        issues: mergedIssues,
      };
    }
  }

  /**
   * Load records from a resolved file path.
   * Supports fallback chain: external userData → workspace → examples.
   *
   * @param {string} recordsPath - Pre-resolved absolute path to records.json.
   * @param {string} categoryId - Category identifier for error context.
   * @param {CategoryRequirements} requirements - Category validation requirements.
   * @returns {CategoryRecord[]} - Parsed and validated record objects loaded from records.json.
   * @throws {Error} - May throw an error.
   */
  private loadRecords(
    recordsPath: string,
    categoryId: string,
    requirements?: CategoryRequirements
  ): CategoryRecord[] {
    const raw = this.loadJsonFile<unknown[]>(
      recordsPath,
      `records for ${categoryId}`
    );
    if (!Array.isArray(raw)) {
      throw new Error(`Records at '${recordsPath}' must be an array.`);
    }
    const records: CategoryRecord[] = [];
    for (const entry of raw) {
      if (!entry || typeof entry !== "object") {
        throw new Error(
          `Invalid record encountered for category '${categoryId}'.`
        );
      }
      const record = entry as CategoryRecord;
      if (typeof record.id !== "string" || record.id.trim() === "") {
        throw new Error(`Record in category '${categoryId}' is missing an id.`);
      }
      if (requirements?.requiredRecordFields) {
        this.assertRequiredFields(
          record,
          requirements.requiredRecordFields,
          `record ${record.id}`
        );
      }
      records.push(record);
    }
    return records;
  }

  /**
   * Load relationship definitions from a resolved file path.
   * Supports fallback chain: external userData → workspace → examples.
   *
   * @param {string} relationshipsPath - Pre-resolved absolute path to relationships.json.
   * @param {string} categoryId - Category identifier for error context.
   * @returns {RelationshipLoadResult} - Relationship descriptions plus internal definitions for resolution.
   * @throws {Error} - May throw an error.
   */
  private loadRelationships(
    relationshipsPath: string,
    categoryId: string
  ): RelationshipLoadResult {
    const raw = this.loadJsonFile<RawRelationshipEntry[]>(
      relationshipsPath,
      `relationships for ${categoryId}`
    );
    if (!Array.isArray(raw) || raw.length === 0) {
      throw new Error(
        `Relationships at '${relationshipsPath}' must be a non-empty array.`
      );
    }
    const descriptions: RelationshipDescription[] = [];
    const definitions: InternalRelationshipDefinition[] = [];
    for (const relationship of raw) {
      if (
        !relationship.key ||
        !relationship.name ||
        !relationship.sourceField ||
        !relationship.targetField
      ) {
        throw new Error(
          `Relationship entry in '${relationshipsPath}' is missing required fields.`
        );
      }
      descriptions.push({
        name: relationship.name,
        targetCategory: relationship.targetCategory,
        viaField: relationship.sourceField,
        cardinality: relationship.cardinality,
        description: relationship.description,
      });
      definitions.push({
        sourceCategory: categoryId,
        targetCategory: relationship.targetCategory,
        relationshipName: relationship.key,
        sourceField: relationship.sourceField,
        targetField: relationship.targetField,
        cardinality: relationship.cardinality,
      });
    }
    return { descriptions, definitions };
  }

  /**
   * assertRequiredFields function.
   *
   * @param {CategoryRecord} record - record parameter.
   * @param {string[]} fields - fields parameter.
   * @param {string} context - context parameter.
   * @throws {Error} - May throw an error.
   */
  private assertRequiredFields(
    record: CategoryRecord,
    fields: string[],
    context: string
  ): void {
    for (const field of fields) {
      if (!(field in record)) {
        throw new Error(`Field '${field}' is required on ${context}.`);
      }
    }
  }

  /**
   * assertRelationshipCoverage function.
   *
   * @param {string[]} fields - fields parameter.
   * @param {InternalRelationshipDefinition[]} relationships - relationships parameter.
   * @param {string} context - context parameter.
   * @throws {Error} - May throw an error.
   */
  private assertRelationshipCoverage(
    fields: string[],
    relationships: InternalRelationshipDefinition[],
    context: string
  ): void {
    const covered = new Set(
      relationships.map((relationship) => relationship.sourceField)
    );
    for (const field of fields) {
      if (!covered.has(field)) {
        throw new Error(
          `Relationship coverage for field '${field}' was not declared in ${context}.`
        );
      }
    }
  }

  /**
   * groupRelationshipsBySource function.
   *
   * @param {InternalRelationshipDefinition[]} relations - relations parameter.
   * @returns {Map<CategoryId, InternalRelationshipDefinition[]>} - Map keyed by source category id listing its relationship definitions.
   */
  private groupRelationshipsBySource(
    relations: InternalRelationshipDefinition[]
  ): Map<CategoryId, InternalRelationshipDefinition[]> {
    const map = new Map<CategoryId, InternalRelationshipDefinition[]>();
    for (const relationship of relations) {
      const existing = map.get(relationship.sourceCategory) ?? [];
      existing.push(relationship);
      map.set(relationship.sourceCategory, existing);
    }
    return map;
  }

  /**
   * persistConsolidatedIndex function.
   *
   * @returns {Promise<void>} Resolves after ensuring the consolidated index is present or refreshed in cache.
   */
  private async persistConsolidatedIndex(): Promise<void> {
    await this.telemetry("persistConsolidatedIndex", async () => {
      try {
        const cacheDir = await this.cacheDirPromise;
        // Attempt to read both new and legacy cache keys for backward compatibility.
        let cached = await readSharedCacheEntry<DatasetCatalogEntry[]>(
          cacheDir,
          CONSOLIDATED_INDEX_CACHE_KEY
        );
        if (!cached) {
          cached = await readSharedCacheEntry<DatasetCatalogEntry[]>(
            cacheDir,
            LEGACY_CONSOLIDATED_INDEX_CACHE_KEY
          );
        }
        if (cached?.metadata?.fingerprint === this.datasetFingerprint) {
          return;
        }
        const entry: SharedCacheEntry<DatasetCatalogEntry[]> = {
          key: CONSOLIDATED_INDEX_CACHE_KEY,
          toolName: UserContextAgentProfile.id,
          timestamp: new Date().toISOString(),
          value: this.consolidatedIndex,
          metadata: { fingerprint: this.datasetFingerprint },
        };
        await storeSharedCacheEntry(cacheDir, entry);
      } catch (error) {
        console.warn("Failed to persist consolidated dataset index", error);
      }
    });
  }

  /**
   * createCatalogEntry function.
   *
   * @param {BusinessCategory} category - Category metadata and records.
   * @returns {DatasetCatalogEntry} Catalog entry summarizing identifiers, relationships and schema names.
   */
  private createCatalogEntry(category: BusinessCategory): DatasetCatalogEntry {
    return {
      id: category.id,
      name: category.name,
      description: category.description,
      primaryKeys: category.config.primaryKeys,
      recordIds: category.records.map((record) => record.id),
      relationships: category.config.relationships.map((relationship) => ({
        name: relationship.name,
        targetCategory: relationship.targetCategory,
        viaField: relationship.viaField,
        cardinality: relationship.cardinality,
      })),
      schemaNames: category.schemas.map((schema) => schema.name),
      requirements: category.config.requirements,
    };
  }

  /**
   * hashRecords function.
   *
   * @param {CategoryRecord[]} records - records parameter.
   * @returns {string} Deterministic hash of the provided record set.
   */
  private hashRecords(records: CategoryRecord[]): string {
    const Normalized = records.map((record) =>
      Object.fromEntries(
        Object.entries(record).sort(([left], [right]) =>
          left.localeCompare(right)
        )
      )
    );
    return crypto
      .createHash("sha1")
      .update(JSON.stringify(Normalized))
      .digest("hex");
  }

  /**
   * resolveTargets function.
   *
   * @param {InternalRelationshipDefinition} relationship - relationship parameter.
   * @param {unknown} value - value parameter.
   * @returns {CategoryRecord[]} - Records in target category matching provided source field value(s).
   */
  private resolveTargets(
    relationship: InternalRelationshipDefinition,
    value: unknown
  ): CategoryRecord[] {
    const targetCategory = this.categories.get(relationship.targetCategory);
    if (!targetCategory) {
      return [];
    }
    const values = this.NormalizeRelationshipValues(value);
    if (values.length === 0) {
      return [];
    }
    return targetCategory.records.filter((record) =>
      values.some((expected) =>
        this.hasMatchingRecordValue(record, relationship.targetField, expected)
      )
    );
  }

  /**
   * NormalizeRelationshipValues function.
   *
   * @param {unknown} value - value parameter.
   * @returns {string[]} - Normalised non-empty string array used for relationship resolution.
   */
  private NormalizeRelationshipValues(value: unknown): string[] {
    if (Array.isArray(value)) {
      return value
        .filter(
          (item): item is string | number =>
            typeof item === "string" || typeof item === "number"
        )
        .map((item) => String(item).trim())
        .filter((item) => item.length > 0);
    }
    if (typeof value === "string" || typeof value === "number") {
      const Normalized = String(value).trim();
      return Normalized ? [Normalized] : [];
    }
    return [];
  }

  /**
   * hasMatchingRecordValue function.
   *
   * @param {CategoryRecord} record - record parameter.
   * @param {string} field - field parameter.
   * @param {string} expected - expected parameter.
   * @returns {boolean} - True when record[field] (array or scalar) matches expected value.
   */
  private hasMatchingRecordValue(
    record: CategoryRecord,
    field: string,
    expected: string
  ): boolean {
    const targetValue = record[field];
    if (targetValue == null) {
      return false;
    }
    if (Array.isArray(targetValue)) {
      return targetValue.some((item) => String(item) === expected);
    }
    return String(targetValue) === expected;
  }

  /**
   * loadJsonFile function.
   *
   * @template T
   *
   * @param {string} filePath - filePath parameter.
   * @param {string} context - context parameter.
   * @returns {T} - Parsed JSON content typed to the requested generic.
   * @throws {Error} - May throw an error.
   */
  private loadJsonFile<T>(filePath: string, context: string): T {
    const raw = fs.readFileSync(filePath, "utf8");
    try {
      return JSON.parse(raw) as T;
    } catch (error) {
      throw new Error(
        `Unable to parse ${context} at '${filePath}': ${
          (error as Error).message
        }`
      );
    }
  }
}

/**
 * createUserContextAgent function.
 *
 * @returns {UserContextAgent} - Instantiated agent with dataset loaded and consolidated index cached.
 */
export function createUserContextAgent(): UserContextAgent {
  return new UserContextAgent();
}

// Export configuration types and instances for external use
export { userContextAgentConfig } from "@agent/userContextAgent/agent.config";

// Re-export key types for external consumers
export type {
  BusinessCategory,
  CategorySummary,
  EntityConnections,
  CategorySnapshot,
  DatasetCatalogueEntry,
} from "@internal-types/userContext.types";
