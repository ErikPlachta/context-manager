/**
 * @packageDocumentation Data-agnostic database agent for structured data retrieval.
 * @packageDocumentation Generic database agent that can work with any data structure
 * without hard-coded knowledge of specific categories or fields.
 *
 * @module agent/databaseAgent
 */

import * as crypto from "crypto";
import {
  deleteSharedCacheEntry,
  readSharedCacheEntry,
  SharedCacheEntry,
  storeSharedCacheEntry,
} from "@extension/mcpCache";
import { createInvocationLogger } from "@mcp/telemetry";
import { DatabaseAgentProfile } from "@mcp/config/agentProfiles";
import { BaseAgentConfig } from "@shared/config/baseAgentConfig";
import type {
  AgentConfigDefinition,
  DatabaseConfig,
  CategoryId,
  CategoryRecord,
  DataSource,
  QueryOptions,
  ConfigDescriptor,
} from "@internal-types/agentConfig";
import { createDescriptorMap } from "@shared/config/descriptors";
import { databaseAgentConfig } from "@agent/databaseAgent/agent.config";

// Re-export DataSource type for test suites expecting it from this module
export type { DataSource };

// Generic types that work with any data structure

/**
 * Generic database agent that can query any structured data without hard-coded assumptions.
 *
 * The agent is completely data-agnostic and receives all necessary context from the orchestrator:
 * - Data sources with their records and schemas
 * - Field aliases for flexible querying
 * - Query criteria as generic key-value pairs
 *
 * @example
 * ```typescript
 * const dataSources = [
 *   {
 *     id: "employees",
 *     name: "Employee Directory",
 *     records: employeeData,
 *     fieldAliases: { "skill": "skills", "dept": "departmentId" }
 *   }
 * ];
 *
 * const agent = new DatabaseAgent(dataSources, cacheDirectory);
 * const results = await agent.executeQuery("employees", { skill: "javascript" });
 * ```
 */
export class DatabaseAgent extends BaseAgentConfig {
  private readonly dataSources: Map<CategoryId, DataSource>;
  private readonly cacheDirectory: Promise<string>;
  private readonly telemetry: ReturnType<typeof createInvocationLogger>;
  private readonly profile: typeof DatabaseAgentProfile;
  // Snapshot of database-specific configuration block for convenience
  private readonly databaseConfig: DatabaseConfig;

  /**
   * Creates a new DatabaseAgent instance.
   *
   * @param {DataSource[]} dataSources - One or more data sources to query.
   * @param {Promise<string>} cacheDirectory - Directory where shared cache entries are stored.
   * @param {Partial<AgentConfigDefinition>} config - Optional overrides for agent behavior.
   */
  constructor(
    dataSources: DataSource[],
    cacheDirectory: Promise<string>,
    config?: Partial<AgentConfigDefinition>
  ) {
    // Merge partial overrides with defaults while preserving mandatory identity fields
    const merged: AgentConfigDefinition = {
      ...databaseAgentConfig,
      ...(config || {}),
      agent: { ...databaseAgentConfig.agent, ...(config?.agent || {}) },
      $configId: databaseAgentConfig.$configId,
    } as AgentConfigDefinition;
    super(merged);
    this.dataSources = new Map(dataSources.map((ds) => [ds.id, ds]));
    this.cacheDirectory = cacheDirectory;
    this.profile = DatabaseAgentProfile;
    this.telemetry = createInvocationLogger(this.profile.id);
    this.databaseConfig =
      (this.getConfigItem<DatabaseConfig>("database") as DatabaseConfig) ||
      ({} as DatabaseConfig);
    this._validateRequiredSections();
  }

  /**
   * Validate required configuration sections exist down to leaf paths.
   * Mirrors previous wrapper validation but uses unified BaseAgentConfig access.
   *
   * @throws {Error} When any required path is missing.
   */
  private _validateRequiredSections(): void {
    const requiredPaths: readonly string[] = [
      "database.fieldAliases",
      "database.performance.caching.enabledByDefault",
      "database.performance.caching.defaultKeyPrefix",
      "database.performance.caching.maxCacheEntries",
      "database.performance.caching.cacheTTL",
      "database.performance.limits.queryTimeout",
      "database.performance.limits.maxResultSize",
      "database.performance.limits.maxJoinDepth",
      "database.validation.schemaValidation.enableStrictValidation",
      "database.validation.schemaValidation.allowUnknownFields",
      "database.validation.schemaValidation.autoTransformAliases",
      "database.validation.integrityChecks.validateRelationships",
      "database.validation.integrityChecks.checkMissingReferences",
      "database.validation.integrityChecks.warnOnSchemaIssues",
      "database.operations.filtering.operators",
      "database.operations.filtering.caseInsensitiveStrings",
      "database.operations.filtering.enableFuzzyMatching",
      "database.operations.joins.supportedJoinTypes",
      "database.operations.joins.autoDiscoverRelationships",
      "database.operations.joins.maxJoinRecords",
      "database.operations.aggregation.functions",
      "database.operations.aggregation.enableGroupBy",
      "database.operations.aggregation.maxGroups",
    ];
    const { passed, missing } = this.confirmConfigItems(requiredPaths);
    if (!passed) {
      throw new Error(
        `Database agent config missing required paths: ${missing.join(", ")}`
      );
    }
  }

  /**
   * Descriptor map for dynamic configuration surfaces.
   *
   * @returns {Record<string, ConfigDescriptor>} Descriptor definitions with deep verifyPaths for strict validation.
   */
  public getConfigDescriptors(): Record<string, ConfigDescriptor> {
    return createDescriptorMap([
      [
        "fieldAliases",
        {
          name: "Field Aliases",
          path: "database.fieldAliases",
          type: "Record<string, Record<string,string>>",
          visibility: "public",
          verifyPaths: ["database.fieldAliases"],
        },
      ],
      [
        "caching",
        {
          name: "Caching",
          path: "database.performance.caching",
          type: "DatabaseConfig['performance']['caching']",
          visibility: "public",
          verifyPaths: [
            "database.performance.caching.enabledByDefault",
            "database.performance.caching.defaultKeyPrefix",
            "database.performance.caching.maxCacheEntries",
            "database.performance.caching.cacheTTL",
          ],
        },
      ],
      [
        "limits",
        {
          name: "Limits",
          path: "database.performance.limits",
          type: "DatabaseConfig['performance']['limits']",
          visibility: "public",
          verifyPaths: [
            "database.performance.limits.queryTimeout",
            "database.performance.limits.maxResultSize",
            "database.performance.limits.maxJoinDepth",
          ],
        },
      ],
      [
        "schemaValidation",
        {
          name: "Schema Validation",
          path: "database.validation.schemaValidation",
          type: "DatabaseConfig['validation']['schemaValidation']",
          visibility: "public",
          verifyPaths: [
            "database.validation.schemaValidation.enableStrictValidation",
            "database.validation.schemaValidation.allowUnknownFields",
            "database.validation.schemaValidation.autoTransformAliases",
          ],
        },
      ],
      [
        "integrityChecks",
        {
          name: "Integrity Checks",
          path: "database.validation.integrityChecks",
          type: "DatabaseConfig['validation']['integrityChecks']",
          visibility: "public",
          verifyPaths: [
            "database.validation.integrityChecks.validateRelationships",
            "database.validation.integrityChecks.checkMissingReferences",
            "database.validation.integrityChecks.warnOnSchemaIssues",
          ],
        },
      ],
      [
        "filtering",
        {
          name: "Filtering",
          path: "database.operations.filtering",
          type: "DatabaseConfig['operations']['filtering']",
          visibility: "public",
          verifyPaths: [
            "database.operations.filtering.operators",
            "database.operations.filtering.caseInsensitiveStrings",
            "database.operations.filtering.enableFuzzyMatching",
          ],
        },
      ],
      [
        "joins",
        {
          name: "Joins",
          path: "database.operations.joins",
          type: "DatabaseConfig['operations']['joins']",
          visibility: "public",
          verifyPaths: [
            "database.operations.joins.supportedJoinTypes",
            "database.operations.joins.autoDiscoverRelationships",
            "database.operations.joins.maxJoinRecords",
          ],
        },
      ],
      [
        "aggregation",
        {
          name: "Aggregation",
          path: "database.operations.aggregation",
          type: "DatabaseConfig['operations']['aggregation']",
          visibility: "public",
          verifyPaths: [
            "database.operations.aggregation.functions",
            "database.operations.aggregation.enableGroupBy",
            "database.operations.aggregation.maxGroups",
          ],
        },
      ],
    ]);
  }

  /**
   * Executes a generic query against any data source.
   *
   * @param {CategoryId} categoryId - Identifier of the data source to query.
   * @param {Record<string, unknown>} criteria - Key-value filters; supports operators like $eq, $in, $regex, etc.
   * @param {QueryOptions} options - Execution options (cache behavior, key prefix).
   * @returns {Promise<CategoryRecord[]>} Matching records (possibly retrieved from cache when enabled).
   * @throws {Error} When the categoryId does not exist.
   */
  async executeQuery(
    categoryId: CategoryId,
    criteria: Record<string, unknown> = {},
    options: QueryOptions = {}
  ): Promise<CategoryRecord[]> {
    const startTime = Date.now();
    const { useCache = true, cacheKeyPrefix } = options;

    try {
      // Check if data source exists
      const dataSource = this.dataSources.get(categoryId);
      if (!dataSource) {
        throw new Error(`Data source not found: ${categoryId}`);
      }

      // Try cache first if enabled. If cached exists, validate staleness by comparing record id sets.
      if (useCache) {
        const cacheKey = this.buildCacheKey(
          categoryId,
          criteria,
          cacheKeyPrefix
        );
        const cached = await this.getCachedResult(cacheKey);
        if (cached) {
          // Compute current results to detect catalogue changes
          const current = this.filterRecords(dataSource, criteria);
          const cachedIds = cached.map((r) => r.id).sort();
          const currentIds = current.map((r) => r.id).sort();
          const same =
            cachedIds.length === currentIds.length &&
            cachedIds.every((v, i) => v === currentIds[i]);
          if (same) {
            // Emit telemetry for cache hit and return cached value
            await this.telemetry("cacheHit", async () => cached, {
              categoryId,
              criteria,
              cacheKey,
            });
            return cached;
          }
          // Results changed – refresh cache entry and return fresh results
          await this.cacheResult(cacheKey, current);
          return current;
        }
      }

      // Execute the query when no cache available or caching is disabled
      const results = this.filterRecords(dataSource, criteria);
      const duration = Date.now() - startTime;

      await this.telemetry("queryExecuted", async () => results.length, {
        categoryId,
        criteria,
        resultCount: results.length,
        duration,
        cached: false,
      });

      // Cache result if enabled
      if (useCache) {
        const cacheKey = this.buildCacheKey(
          categoryId,
          criteria,
          cacheKeyPrefix
        );
        await this.cacheResult(cacheKey, results);
      }

      return results;
    } catch (error) {
      const duration = Date.now() - startTime;
      await this.telemetry("queryFailed", async () => Promise.reject(error), {
        categoryId,
        criteria,
        error: error instanceof Error ? error.message : String(error),
        duration,
      });
      throw error;
    }
  }

  /**
   * Gets available data sources.
   *
   * @returns {CategoryId[]} Array of known category identifiers.
   */
  getAvailableCategories(): CategoryId[] {
    return Array.from(this.dataSources.keys());
  }

  /**
   * Gets metadata for a specific data source.
   *
   * @param {CategoryId} categoryId - Category identifier to look up.
   * @returns {DataSource | undefined} Data source details or undefined when not found.
   */
  getCategoryInfo(categoryId: CategoryId): DataSource | undefined {
    return this.dataSources.get(categoryId);
  }

  /**
   * Clears cached results for a specific category.
   *
   * @param {CategoryId} categoryId - Category identifier for which to clear cached results.
   * @returns {Promise<void>} Resolves when deletion attempts complete.
   */
  async clearCache(categoryId: CategoryId): Promise<void> {
    const cacheDir = await this.cacheDirectory;
    const pattern = this.buildCacheKey(categoryId, {});
    // Note: This is a simplified implementation - in practice you'd want more sophisticated cache management
    await deleteSharedCacheEntry(cacheDir, pattern);
    await this.telemetry("cacheCleared", async () => true, { categoryId });
  }

  /**
   * Filters records based on generic criteria.
   *
   * @param {DataSource} dataSource - Data source to scan.
   * @param {Record<string, unknown>} criteria - Key-value filters to apply.
   * @returns {CategoryRecord[]} Records that satisfy all provided criteria.
   */
  private filterRecords(
    dataSource: DataSource,
    criteria: Record<string, unknown>
  ): CategoryRecord[] {
    if (Object.keys(criteria).length === 0) {
      return [...dataSource.records];
    }

    const fieldAliases = dataSource.fieldAliases ?? {};

    return dataSource.records.filter((record: CategoryRecord) => {
      return Object.entries(criteria).every(([field, value]) => {
        // Support field aliases for flexible querying
        const actualField = fieldAliases[field] ?? field;
        return this.matchesCriteria(record, actualField, value);
      });
    });
  }

  /**
   * Checks if a record matches specific criteria.
   *
   * @param {CategoryRecord} record - Candidate record to test.
   * @param {string} field - Field to evaluate.
   * @param {unknown} value - Expected value or operator object.
   * @returns {boolean} True when the record satisfies the condition.
   */
  private matchesCriteria(
    record: CategoryRecord,
    field: string,
    value: unknown
  ): boolean {
    const recordValue = record[field];

    if (value === null || value === undefined) {
      return recordValue === value;
    }

    // Support complex query operators
    if (typeof value === "object" && value !== null && !Array.isArray(value)) {
      const operators = value as Record<string, unknown>;

      for (const [op, opValue] of Object.entries(operators)) {
        switch (op) {
          case "$eq":
            if (recordValue !== opValue) return false;
            break;
          case "$ne":
            if (recordValue === opValue) return false;
            break;
          case "$gt":
            if (
              typeof recordValue !== "number" ||
              typeof opValue !== "number" ||
              !(recordValue > opValue)
            )
              return false;
            break;
          case "$gte":
            if (
              typeof recordValue !== "number" ||
              typeof opValue !== "number" ||
              !(recordValue >= opValue)
            )
              return false;
            break;
          case "$lt":
            if (
              typeof recordValue !== "number" ||
              typeof opValue !== "number" ||
              !(recordValue < opValue)
            )
              return false;
            break;
          case "$lte":
            if (
              typeof recordValue !== "number" ||
              typeof opValue !== "number" ||
              !(recordValue <= opValue)
            )
              return false;
            break;
          case "$in":
            if (!Array.isArray(opValue) || !opValue.includes(recordValue))
              return false;
            break;
          case "$nin":
            if (!Array.isArray(opValue) || opValue.includes(recordValue))
              return false;
            break;
          case "$regex": {
            if (typeof recordValue !== "string") return false;
            if (typeof opValue !== "string") return false;
            const regex = new RegExp(opValue, "i");
            if (!regex.test(recordValue)) return false;
            break;
          }
          case "$exists": {
            const exists = recordValue !== undefined;
            if (typeof opValue !== "boolean" || exists !== opValue)
              return false;
            break;
          }
        }
      }
      return true;
    }

    // Simple equality check
    if (typeof recordValue === "string" && typeof value === "string") {
      return recordValue.toLowerCase().includes(value.toLowerCase());
    }

    // Array contains check
    if (Array.isArray(recordValue)) {
      return recordValue.includes(value);
    }

    return recordValue === value;
  }

  /**
   * Builds a stable cache key for a query.
   *
   * @param {CategoryId} categoryId - Category identifier.
   * @param {Record<string, unknown>} criteria - Query criteria used to derive a hash.
   * @param {string} prefix - Optional namespace prefix to avoid collisions.
   * @returns {string} Stable cache key.
   */
  private buildCacheKey(
    categoryId: CategoryId,
    criteria: Record<string, unknown>,
    prefix?: string
  ): string {
    // Sort criteria keys for stable cache keys
    const sortedCriteria = Object.keys(criteria)
      .sort()
      .reduce((acc, key) => {
        acc[key] = criteria[key];
        return acc;
      }, {} as Record<string, unknown>);

    const criteriaStr = JSON.stringify(sortedCriteria);
    const hash = crypto
      .createHash("md5")
      .update(criteriaStr)
      .digest("hex")
      .substring(0, 8);

    const parts = [prefix, "db-query", categoryId, hash].filter(Boolean);
    return parts.join(".");
  }

  /**
   * Retrieves cached query result.
   *
   * @param {string} cacheKey - Cache key previously generated via {@link buildCacheKey}.
   * @returns {Promise<CategoryRecord[] | null>} Cached records or null when not found.
   */
  private async getCachedResult(
    cacheKey: string
  ): Promise<CategoryRecord[] | null> {
    try {
      const cacheDir = await this.cacheDirectory;
      const entry = await readSharedCacheEntry<CategoryRecord[]>(
        cacheDir,
        cacheKey
      );
      return entry?.value ?? null;
    } catch {
      return null;
    }
  }

  /**
   * Stores query result in cache.
   *
   * @param {string} cacheKey - Cache key where the results will be stored.
   * @param {CategoryRecord[]} results - Records to persist.
   * @returns {Promise<void>} Resolves when the cache entry is written (errors are swallowed and logged).
   */
  private async cacheResult(
    cacheKey: string,
    results: CategoryRecord[]
  ): Promise<void> {
    try {
      const cacheDir = await this.cacheDirectory;
      const recordHash = crypto
        .createHash("md5")
        .update(JSON.stringify(results.map((r) => r.id).sort()))
        .digest("hex");
      const entry: SharedCacheEntry<CategoryRecord[]> = {
        key: cacheKey,
        toolName: this.profile.id,
        timestamp: new Date().toISOString(),
        value: results,
        metadata: { version: "1.0", recordHash },
      };
      await storeSharedCacheEntry(cacheDir, entry);
    } catch (error) {
      await this.telemetry("cacheWriteFailed", async () => false, {
        cacheKey,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
}
/**
 * Creates a new DatabaseAgent instance with the provided data sources.
 *
 * @param {DataSource[]} dataSources - dataSources parameter.
 * @param {Promise<string>} cacheDirectory - cacheDirectory parameter.
 * @param {Partial<AgentConfigDefinition>} config - config parameter.
 * @returns {DatabaseAgent} A configured database agent.
 */
export function createDatabaseAgent(
  dataSources: DataSource[],
  cacheDirectory: Promise<string>,
  config?: Partial<AgentConfigDefinition>
): DatabaseAgent {
  return new DatabaseAgent(dataSources, cacheDirectory, config);
}
