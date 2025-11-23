/**
 * @packageDocumentation DataLoader Agent - Centralized file I/O and data validation
 *
 * The DataLoader Agent handles all file operations for loading and validating business data.
 * It provides type-safe data loading with comprehensive error handling and flexible path
 * resolution strategies.
 *
 * @module agent/dataLoaderAgent
 */

import * as fs from "fs";
import * as path from "path";
import { BaseAgentConfig } from "@shared/config/baseAgentConfig";
import type {
  AgentConfigDefinition,
  DataLoaderConfig,
} from "@internal-types/agentConfig";
import {
  CategoryConfig,
  BaseRecord,
  CategoryDiscoveryResult,
  isCategoryConfig,
  isRecordArray,
} from "@internal-types/userContext.types";
import { dataLoaderAgentConfig } from "@agent/dataLoaderAgent/agent.config";
import { createInvocationLogger } from "@mcp/telemetry";

/**
 * Agent responsible for centralized file I/O and data validation operations.
 *
 * Provides type-safe loading of JSON data files with runtime validation,
 * comprehensive error handling, and flexible path resolution.
 *
 * @example
 * ```typescript
 * const agent = new DataLoaderAgent();
 * const config = await agent.loadCategoryConfig('/path/to/category.json');
 * const records = await agent.loadRecords('/path/to/records.json');
 * ```
 */
export class DataLoaderAgent extends BaseAgentConfig {
  private readonly telemetry = createInvocationLogger("data-loader-agent");
  private readonly dataLoaderConfig: DataLoaderConfig;
  private readonly fileCache: Map<
    string,
    { data: unknown; timestamp: number }
  > = new Map();

  /**
   * Creates a new DataLoaderAgent instance.
   *
   * @param {Partial<AgentConfigDefinition>} [config] - Optional configuration overrides
   */
  constructor(config?: Partial<AgentConfigDefinition>) {
    const merged: AgentConfigDefinition = {
      ...dataLoaderAgentConfig,
      ...(config || {}),
      agent: { ...dataLoaderAgentConfig.agent, ...(config?.agent || {}) },
      $configId: dataLoaderAgentConfig.$configId,
    } as AgentConfigDefinition;

    super(merged);

    this.dataLoaderConfig =
      (this.getConfigItem<DataLoaderConfig>(
        "dataLoader"
      ) as DataLoaderConfig) || ({} as DataLoaderConfig);
    this._validateRequiredSections();
  }

  /**
   * Validate required configuration sections exist.
   *
   * @throws {Error} When any required path is missing
   */
  private _validateRequiredSections(): void {
    const requiredPaths: readonly string[] = [
      "dataLoader.validation.enableStrictTypeChecking",
      "dataLoader.fileOperations.encoding",
      "dataLoader.fileOperations.maxFileSize",
      "dataLoader.pathResolution.enableExamplesFallback",
      "dataLoader.errorHandling.provideFilePath",
      "dataLoader.performance.maxConcurrentOperations",
      "dataLoader.discovery.enableAutoDiscovery",
    ];

    const { passed, missing } = this.confirmConfigItems(requiredPaths);
    if (!passed) {
      throw new Error(
        `DataLoader agent config missing required paths: ${missing.join(", ")}`
      );
    }
  }

  /**
   * Load and validate category configuration from JSON file.
   *
   * @param {string} filePath - Absolute path to the category JSON file
   * @returns {Promise<CategoryConfig>} Validated CategoryConfig object
   * @throws {Error} If file cannot be read or validation fails
   */
  async loadCategoryConfig(filePath: string): Promise<CategoryConfig> {
    return this.telemetry(
      "loadCategoryConfig",
      async () => {
        try {
          const data = await this._readJsonFile(filePath);

          if (!isCategoryConfig(data)) {
            throw new Error(
              `Invalid category configuration: missing required fields or incorrect types - file: ${filePath}`
            );
          }

          return data;
        } catch (error) {
          throw this._handleError(error, filePath, "category configuration");
        }
      },
      { filePath }
    );
  }

  /**
   * Load and validate records array from JSON file.
   *
   * @param {string} filePath - Absolute path to the records JSON file
   * @returns {Promise<BaseRecord[]>} Array of validated BaseRecord objects
   * @throws {Error} If file cannot be read or validation fails
   */
  async loadRecords(filePath: string): Promise<BaseRecord[]> {
    return this.telemetry(
      "loadRecords",
      async () => {
        try {
          const data = await this._readJsonFile(filePath);

          if (!Array.isArray(data)) {
            throw new Error(
              `Records file must contain an array, got ${typeof data} - file: ${filePath}`
            );
          }

          if (!isRecordArray(data)) {
            throw new Error(
              `Invalid record format: one or more records missing required fields - file: ${filePath}`
            );
          }

          return data;
        } catch (error) {
          throw this._handleError(error, filePath, "records");
        }
      },
      { filePath }
    );
  }

  /**
   * Discover and load all UserContext categories from a directory.
   *
   * @param {string} baseDir - Base directory containing UserContext category folders
   * @returns {Promise<CategoryDiscoveryResult>} Discovery results with loaded categories and any errors
   * @throws {Error} If directory access fails catastrophically
   */
  async discoverCategories(baseDir: string): Promise<CategoryDiscoveryResult> {
    return this.telemetry(
      "discoverCategories",
      async () => {
        const result: CategoryDiscoveryResult = {
          categories: new Map(),
          errors: [],
          warnings: [],
        };

        try {
          if (!fs.existsSync(baseDir)) {
            throw new Error(`Directory does not exist: ${baseDir}`);
          }

          const entries = fs.readdirSync(baseDir, { withFileTypes: true });
          const config = this.dataLoaderConfig.discovery;

          for (const entry of entries) {
            if (config.skipHiddenFiles && entry.name.startsWith(".")) {
              result.warnings.push(`Skipped hidden directory: ${entry.name}`);
              continue;
            }

            if (
              config.skipPatterns.some((pattern) =>
                entry.name.includes(pattern)
              )
            ) {
              result.warnings.push(
                `Skipped directory matching pattern: ${entry.name}`
              );
              continue;
            }

            if (entry.isDirectory()) {
              const categoryDir = path.join(baseDir, entry.name);
              const categoryFile = path.join(categoryDir, "category.json");
              const recordsFile = path.join(categoryDir, "records.json");

              if (fs.existsSync(categoryFile) && fs.existsSync(recordsFile)) {
                try {
                  const categoryConfig = await this.loadCategoryConfig(
                    categoryFile
                  );
                  const records = await this.loadRecords(recordsFile);
                  result.categories.set(categoryConfig.id, {
                    config: categoryConfig,
                    records,
                  });
                } catch (error) {
                  const dataLoaderError =
                    error instanceof Error
                      ? error
                      : new Error(
                          `Failed to load category "${entry.name}": ${
                            error instanceof Error
                              ? error.message
                              : String(error)
                          } - directory: ${categoryDir}`
                        );

                  result.errors.push({
                    categoryName: entry.name,
                    error: dataLoaderError,
                  });

                  if (config.logDiscoveryWarnings) {
                    console.warn(
                      `Failed to load category "${entry.name}":`,
                      dataLoaderError.message
                    );
                  }

                  if (!config.continueOnError) {
                    throw dataLoaderError;
                  }
                }
              } else {
                result.warnings.push(
                  `Skipped directory "${entry.name}": missing required files (category.json and/or records.json)`
                );
              }
            }
          }

          return result;
        } catch (error) {
          throw this._handleError(error, baseDir, "category discovery");
        }
      },
      { baseDir }
    );
  }

  /**
   * Resolve data file path with fallback to examples directory.
   *
   * @param {string} categoryDir - Category directory path
   * @param {string} filename - Data file name (e.g., 'category.json', 'records.json')
   * @param {string} [examplesDir] - Optional examples directory for fallback data
   * @returns {Promise<string>} Absolute path to the resolved data file
   * @throws {Error} If file cannot be found in any location
   */
  async resolveDataPath(
    categoryDir: string,
    filename: string,
    examplesDir?: string
  ): Promise<string> {
    return this.telemetry(
      "resolveDataPath",
      async () => {
        const config = this.dataLoaderConfig.pathResolution;
        const primaryPath = config.normalizePaths
          ? path.normalize(path.join(categoryDir, filename))
          : path.join(categoryDir, filename);

        if (fs.existsSync(primaryPath)) {
          return primaryPath;
        }

        if (config.enableExamplesFallback && examplesDir) {
          const categoryName = path.basename(categoryDir);
          const fallbackPath = path.join(
            examplesDir,
            config.examplesDirectory,
            categoryName,
            filename
          );

          if (fs.existsSync(fallbackPath)) {
            return fallbackPath;
          }
        }

        throw new Error(
          `Data file not found: ${filename} (checked: ${primaryPath}${
            examplesDir
              ? `, ${path.join(
                  examplesDir,
                  config.examplesDirectory,
                  path.basename(categoryDir),
                  filename
                )}`
              : ""
          }) - category dir: ${categoryDir}`
        );
      },
      { categoryDir, filename }
    );
  }

  /**
   * Read and parse JSON file with caching support.
   *
   * @param {string} filePath - Absolute path to JSON file
   * @returns {Promise<unknown>} Parsed JSON data
   * @throws {Error} If file cannot be read or parsed
   */
  private async _readJsonFile(filePath: string): Promise<unknown> {
    const config = this.dataLoaderConfig.fileOperations;

    // Check cache
    if (config.enableCaching) {
      const cached = this.fileCache.get(filePath);
      if (cached && Date.now() - cached.timestamp < config.cacheTTL) {
        return cached.data;
      }
    }

    // Check file size
    const stats = fs.statSync(filePath);
    if (stats.size > config.maxFileSize) {
      throw new Error(
        `File size (${stats.size} bytes) exceeds maximum allowed size (${config.maxFileSize} bytes) - file: ${filePath}`
      );
    }

    // Read and parse
    const content = fs.readFileSync(filePath, config.encoding);

    let data: unknown;
    try {
      data = JSON.parse(content);
    } catch (error) {
      throw new Error(
        `Invalid JSON syntax: ${
          error instanceof Error ? error.message : String(error)
        } - file: ${filePath}`
      );
    }

    // Cache
    if (config.enableCaching) {
      if (this.fileCache.size >= config.maxCacheEntries) {
        const firstKey = this.fileCache.keys().next().value;
        if (firstKey) this.fileCache.delete(firstKey);
      }
      this.fileCache.set(filePath, { data, timestamp: Date.now() });
    }

    return data;
  }

  /**
   * Handle and wrap errors with Error context.
   *
   * @param {unknown} error - Original error
   * @param {string} filePath - File path where error occurred
   * @param {string} context - Description of operation that failed
   * @returns {Error} Wrapped error with context
   */
  private _handleError(
    error: unknown,
    filePath: string,
    context: string
  ): Error {
    if (error instanceof Error) return error;

    const config = this.dataLoaderConfig.errorHandling;
    const originalError = error instanceof Error ? error : undefined;

    let message: string;
    if (error instanceof SyntaxError) {
      message = `Invalid JSON syntax in ${context}: ${error.message}`;
    } else if (originalError?.message.includes("ENOENT")) {
      message = `File not found for ${context}: ${filePath}`;
    } else if (originalError?.message.includes("EACCES")) {
      message = `Permission denied reading ${context}: ${filePath}`;
    } else {
      message = `Failed to load ${context}: ${
        originalError ? originalError.message : String(error)
      }`;
    }

    if (config.suggestRecovery) {
      if (message.includes("not found")) {
        message +=
          ". Suggestion: Verify the file path exists and is accessible.";
      } else if (message.includes("Permission denied")) {
        message +=
          ". Suggestion: Check file permissions and ensure read access.";
      } else if (message.includes("Invalid JSON")) {
        message += ". Suggestion: Validate JSON syntax using a JSON linter.";
      }
    }

    return new Error(
      config.provideFilePath ? `${message} - file: ${filePath}` : message
    );
  }

  /**
   * Clear the file cache.
   */
  clearCache(): void {
    this.fileCache.clear();
  }

  /**
   * Get cache statistics.
   *
   * @returns {{size: number; maxSize: number}} Cache statistics
   */
  getCacheStats(): { size: number; maxSize: number } {
    return {
      size: this.fileCache.size,
      maxSize: this.dataLoaderConfig.fileOperations.maxCacheEntries,
    };
  }
}

// Export configuration for external use
export { dataLoaderAgentConfig } from "@agent/dataLoaderAgent/agent.config";
