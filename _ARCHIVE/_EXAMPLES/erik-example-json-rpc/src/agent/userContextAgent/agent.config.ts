/**
 * @packageDocumentation User Context Agent Configuration (standalone)
 *
 * Defines the settings for the user context agent (successor to Relevant Data Manager).
 * This configuration is minimal and focused; richer execution/orchestration details live in
 * unifiedAgentConfig. The key structure retains `relevantDataManager` section naming for now
 * to avoid a broader breaking change; this can be renamed in a later refactor.
 */

import type { AgentConfigDefinition } from "@internal-types/agentConfig";
import { CONFIG_IDS } from "@internal-types/configRegistry";

/** User Context Agent configuration. */
export const userContextAgentConfig: AgentConfigDefinition = {
  $configId: CONFIG_IDS.RELEVANT_DATA_MANAGER,
  agent: {
    id: "user-context",
    name: "User Context Agent",
    version: "1.0.0",
    description:
      "Manages user-centric contextual datasets including schemas, relationships, and quality metadata.",
  },
  relevantDataManager: {
    metadata: {
      enableSchemaValidation: true,
      enforceDataQuality: true,
      trackDataLineage: true,
      autoGenerateMetadata: true,
      supportedCategories: [
        "people",
        "departments",
        "applications",
        "companyPolicies",
        "companyResources",
      ],
      requiredCategoryFiles: {
        configFile: "category.json",
        recordsFile: "records.json",
        relationshipsFile: "relationships.json",
      },
      requiredDirectories: {
        schemas: "schemas",
        types: "types",
        examples: "examples",
        queries: "queries",
      },
      validateFolderStructure: true,
    },
    caching: {
      enableSnapshotCaching: true,
      snapshotTTL: 60 * 60 * 1000,
      maxCachedSnapshots: 50,
      cacheValidationResults: true,
      validationCacheTTL: 30 * 60 * 1000,
      enableRecordHashCaching: true,
      cacheCleanupThreshold: 1000,
    },
    validation: {
      strictModeEnabled: true,
      allowPartialValidation: false,
      validationTimeout: 30000,
      enableAjvValidation: true,
      checkDuplicateSchemas: true,
      validateRelationshipIntegrity: true,
      checkOrphanedRecords: true,
      validationWarningThreshold: 0.8,
    },
    schemaManagement: {
      autoDetectSchemaChanges: true,
      enableSchemaVersioning: true,
      validationLibrary: "ajv",
      generateTypescriptTypes: false,
      validateSchemaCompatibility: true,
      maxSchemaFileSize: 1024 * 1024,
      supportedSchemaFormats: ["json-schema", "draft-07"],
    },
    relationships: {
      enableAutoDiscovery: true,
      validateReferences: true,
      detectCircularReferences: true,
      maxTraversalDepth: 5,
      buildRelationshipIndexes: true,
      relationshipTypes: [
        "one-to-one",
        "one-to-many",
        "many-to-many",
        "hierarchical",
        "dependency",
      ],
    },
    dataManagement: {
      enableAutoRefresh: false,
      refreshInterval: 24 * 60 * 60 * 1000,
      enableDataBackups: true,
      backupRetentionDays: 30,
      validateOnLoad: true,
      supportedImportFormats: ["json", "csv", "yaml"],
      maxImportFileSize: 10 * 1024 * 1024,
    },
  },
};

export default userContextAgentConfig;
