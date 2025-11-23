/**
 * @packageDocumentation High-level data agent that analyzes data and produces insights.
 * @packageDocumentation Data agent that focuses purely on data analysis and insight generation.
 * This agent does not manage other agents or data sources - it receives data as input
 * and returns analysis results.
 *
 * @module agent/dataAgent
 */

import { createInvocationLogger } from "@mcp/telemetry";
import { DataAgentProfile } from "@mcp/config/agentProfiles";
import { BaseAgentConfig } from "@shared/config/baseAgentConfig";
import type {
  AgentConfigDefinition,
  DataConfig,
  CategoryId,
  CategoryRecord,
  RelationshipDescription,
  AnalysisInput,
  DataInsight,
  ExplorationPlan,
  ExplorationStep,
  TopicSearchResult,
  CrossCategoryConnection,
  ConfigDescriptor,
} from "@internal-types/agentConfig";
import { createDescriptorMap } from "@shared/config/descriptors";
// No external validation helpers needed here; BaseAgentConfig-based checks are used
import { dataAgentConfig } from "@agent/dataAgent/agent.config";

/**
 * Agent that analyzes data and generates insights.
 * Focuses purely on data analysis without managing other agents or data sources.
 *
 * @example
 * ```ts
 * const agent = new DataAgent();
 * const insights = await agent.analyzeData(analysisInput);
 * console.log(insights.map(insight => insight.description));
 * ```
 */
export class DataAgent extends BaseAgentConfig {
  private readonly telemetry = createInvocationLogger(DataAgentProfile.id);
  private readonly dataConfig: DataConfig;

  /**
   * Create a new {@link DataAgent} instance using default configuration merged with optional partial overrides.
   *
   * @param {Partial<AgentConfigDefinition>} [config] - Optional partial configuration overrides (merged atop defaults; identity preserved).
   */
  constructor(config?: Partial<AgentConfigDefinition>) {
    const merged: AgentConfigDefinition = {
      ...dataAgentConfig,
      ...(config || {}),
      agent: { ...dataAgentConfig.agent, ...(config?.agent || {}) },
      $configId: dataAgentConfig.$configId,
    } as AgentConfigDefinition;
    super(merged);
    this.dataConfig =
      (this.getConfigItem<DataConfig>("data") as DataConfig) ||
      ({} as DataConfig);
    this._validateRequiredSections();
  }

  /**
   * Validate required configuration leaf paths.
   *
   * @throws {Error} When mandatory paths missing.
   */
  private _validateRequiredSections(): void {
    const requiredPaths: readonly string[] = [
      "data.analysis.enableInsightGeneration",
      "data.analysis.maxInsightDepth",
      "data.exploration.maxExplorationSteps",
      "data.exploration.enableAutomaticPlanGeneration",
      "data.exploration.planComplexityLimit",
      "data.relationships.enableRelationshipMapping",
      "data.relationships.maxRelationshipDepth",
    ];
    const { passed, missing } = this.confirmConfigItems(requiredPaths);
    if (!passed) {
      throw new Error(
        `Data agent config missing required paths: ${missing.join(", ")}`
      );
    }
  }

  /**
   * Descriptor map for dynamic configuration access.
   *
   * @returns {Record<string, ConfigDescriptor>} Descriptors.
   */
  public getConfigDescriptors(): Record<string, ConfigDescriptor> {
    return createDescriptorMap([
      [
        "analysis",
        {
          name: "Analysis",
          path: "data.analysis",
          type: "DataConfig['analysis']",
          visibility: "public",
          verifyPaths: [
            "data.analysis.enableInsightGeneration",
            "data.analysis.maxInsightDepth",
            "data.analysis.crossCategoryAnalysis",
          ],
        },
      ],
      [
        "exploration",
        {
          name: "Exploration",
          path: "data.exploration",
          type: "DataConfig['exploration']",
          visibility: "public",
          verifyPaths: [
            "data.exploration.maxExplorationSteps",
            "data.exploration.enableAutomaticPlanGeneration",
            "data.exploration.planComplexityLimit",
          ],
        },
      ],
      [
        "relationships",
        {
          name: "Relationships",
          path: "data.relationships",
          type: "DataConfig['relationships']",
          visibility: "public",
          verifyPaths: [
            "data.relationships.enableRelationshipMapping",
            "data.relationships.maxRelationshipDepth",
          ],
        },
      ],
      [
        "search",
        {
          name: "Search",
          path: "data.search",
          type: "NonNullable<DataConfig['search']>",
          visibility: "public",
          verifyPaths: ["data.search.maxResults"],
        },
      ],
      [
        "synthesis",
        {
          name: "Synthesis",
          path: "data.synthesis",
          type: "NonNullable<DataConfig['synthesis']>",
          visibility: "public",
          verifyPaths: ["data.synthesis.enableTopicOverviews"],
        },
      ],
      [
        "performance",
        {
          name: "Performance",
          path: "data.performance",
          type: "NonNullable<DataConfig['performance']>",
          visibility: "public",
          verifyPaths: ["data.performance.analysisTimeout"],
        },
      ],
      [
        "quality",
        {
          name: "Quality",
          path: "data.quality",
          type: "NonNullable<DataConfig['quality']>",
          visibility: "public",
          verifyPaths: ["data.quality.missingFieldThreshold"],
        },
      ],
    ]);
  }

  /**
   * Analyze data and generate insights.
   *
   * @param {AnalysisInput} input - input parameter.
   * @returns {Promise<DataInsight[]>} - TODO: describe return value.
   */
  async analyzeData(input: AnalysisInput): Promise<DataInsight[]> {
    return this.telemetry("analyzeData", async () => {
      const analysisConfig = this.getAnalysisConfig();
      // Quality configuration is used in detectAnomalies; no need to fetch here.
      const insights: DataInsight[] = [];

      if (!analysisConfig.enableInsightGeneration) {
        return insights;
      }

      // Pattern analysis
      const patterns = this.detectPatterns(input.records, input.categoryId);
      insights.push(...patterns);

      // Anomaly detection
      const anomalies = this.detectAnomalies(input.records, input.categoryId);
      insights.push(...anomalies);

      // Relationship analysis if relationships provided
      if (input.relationships && analysisConfig.crossCategoryAnalysis) {
        const relationshipInsights = this.analyzeRelationships(
          input.relationships
        );
        insights.push(...relationshipInsights);
      }

      // Filter by confidence threshold
      const filteredInsights = insights.filter(
        (insight) =>
          insight.confidence >=
          (analysisConfig.insightConfidenceThreshold || 0.7)
      );

      // Limit results
      const maxInsights = analysisConfig.maxInsightsPerAnalysis || 10;
      return filteredInsights.slice(0, maxInsights);
    });
  }

  /**
   * Generate an exploration plan for data analysis.
   *
   * @param {CategoryId} categoryId - categoryId parameter.
   * @param {string} question - question parameter.
   * @param {AnalysisInput} availableData - availableData parameter.
   * @returns {Promise<ExplorationPlan>} - TODO: describe return value.
   */
  async generateExplorationPlan(
    categoryId: CategoryId,
    question: string,
    availableData: AnalysisInput
  ): Promise<ExplorationPlan> {
    return this.telemetry("generateExplorationPlan", async () => {
      const explorationConfig = this.getExplorationConfig();

      const steps: ExplorationStep[] = [];

      // Basic data overview step
      steps.push({
        title: "Data Overview",
        description: `Review ${availableData.records.length} records in ${categoryId} category`,
        recommendedCategory: categoryId,
        hints: [
          `Total records: ${availableData.records.length}`,
          "Look for data completeness and quality patterns",
        ],
      });

      // Relationship analysis steps
      if (availableData.relationships) {
        availableData.relationships.forEach((rel) => {
          steps.push({
            title: `Analyze ${rel.name}`,
            description: rel.description,
            recommendedCategory: rel.targetCategory,
            hints: [`Focus on ${rel.viaField} connections`],
          });
        });
      }

      // Limit steps based on configuration
      const maxSteps = explorationConfig.maxExplorationSteps || 8;
      return {
        topic: categoryId,
        question,
        steps: steps.slice(0, maxSteps),
        recommendedQueries: [], // No saved queries in pure analysis agent
        supportingResources: [
          {
            categoryId,
            ids: availableData.records.slice(0, 3).map((r) => r.id),
          },
        ],
      };
    });
  }

  /**
   * Analyze relationships between categories.
   *
   * @param {AnalysisInput} sourceData - sourceData parameter.
   * @param {AnalysisInput} targetData - targetData parameter.
   * @param {RelationshipDescription} relationship - relationship parameter.
   * @returns {Promise<CrossCategoryConnection>} - TODO: describe return value.
   */
  async analyzeConnection(
    sourceData: AnalysisInput,
    targetData: AnalysisInput,
    relationship: RelationshipDescription
  ): Promise<CrossCategoryConnection> {
    return this.telemetry("analyzeConnection", async () => {
      // Count connections
      const connections = sourceData.records.filter(
        (record) => record[relationship.viaField] !== undefined
      );

      const connectionStrength = connections.length / sourceData.records.length;

      return {
        sourceCategory: sourceData.categoryId,
        targetCategory: targetData.categoryId,
        connectionType: relationship.name,
        strength: connectionStrength,
        description: `${connections.length} out of ${sourceData.records.length} records have ${relationship.name} connections`,
      };
    });
  }

  /**
   * Search for patterns in data records.
   *
   * @param {string} keyword - keyword parameter.
   * @param {AnalysisInput[]} data - data parameter.
   * @returns {TopicSearchResult[]} - TODO: describe return value.
   */
  searchData(keyword: string, data: AnalysisInput[]): TopicSearchResult[] {
    const searchConfig = this.getSearchConfig();
    const results: TopicSearchResult[] = [];

    data.forEach((input) => {
      input.records.forEach((record) => {
        const matchingFields: string[] = [];

        // Search through all record fields
        Object.entries(record).forEach(([field, value]) => {
          if (
            typeof value === "string" &&
            value.toLowerCase().includes(keyword.toLowerCase())
          ) {
            matchingFields.push(field);
          }
        });

        if (matchingFields.length > 0) {
          results.push({
            categoryId: input.categoryId,
            recordId: record.id,
            displayName: this.getRecordDisplayName(record),
            matchingFields,
          });
        }
      });
    });

    return results.slice(0, searchConfig.maxResults || 50);
  }

  /**
   * Detect patterns in data records.
   *
   * @param {CategoryRecord[]} records - records parameter.
   * @param {CategoryId} categoryId - categoryId parameter.
   * @returns {DataInsight[]} - TODO: describe return value.
   */
  private detectPatterns(
    records: CategoryRecord[],
    categoryId: CategoryId
  ): DataInsight[] {
    const insights: DataInsight[] = [];

    // Field frequency analysis
    const fieldFrequency: Record<string, number> = {};
    records.forEach((record) => {
      Object.keys(record).forEach((field) => {
        fieldFrequency[field] = (fieldFrequency[field] || 0) + 1;
      });
    });

    // Find common patterns
    const totalRecords = records.length;
    Object.entries(fieldFrequency).forEach(([field, count]) => {
      if (count / totalRecords > 0.8) {
        // 80% or more have this field
        insights.push({
          type: "pattern",
          description: `Field '${field}' is present in ${Math.round(
            (count / totalRecords) * 100
          )}% of records`,
          confidence: count / totalRecords,
          category: categoryId, // Use the provided category ID
        });
      }
    });

    return insights;
  }

  /**
   * Detect anomalies in data records.
   *
   * @param {CategoryRecord[]} records - records parameter.
   * @param {CategoryId} categoryId - categoryId parameter.
   * @returns {DataInsight[]} - TODO: describe return value.
   */
  private detectAnomalies(
    records: CategoryRecord[],
    categoryId: CategoryId
  ): DataInsight[] {
    const insights: DataInsight[] = [];
    const qualityConfig = this.getQualityConfig();

    // Missing field analysis
    const allFields = new Set<string>();
    records.forEach((record) => {
      Object.keys(record).forEach((field) => allFields.add(field));
    });

    allFields.forEach((field) => {
      const missingCount = records.filter(
        (record) => !(field in record)
      ).length;
      if (
        missingCount > 0 &&
        missingCount / records.length >
          (qualityConfig.missingFieldThreshold ?? 0.1)
      ) {
        // More than configured threshold missing
        insights.push({
          type: "anomaly",
          description: `${missingCount} records missing field '${field}'`,
          confidence: missingCount / records.length,
          category: categoryId,
          affectedRecords: records
            .filter((record) => !(field in record))
            .map((record) => record.id),
        });
      }
    });

    return insights;
  }

  /**
   * Analyze relationships for insights.
   *
   * @param {RelationshipDescription[]} relationships - relationships parameter.
   * @returns {DataInsight[]} - TODO: describe return value.
   */
  private analyzeRelationships(
    relationships: RelationshipDescription[]
  ): DataInsight[] {
    const insights: DataInsight[] = [];

    relationships.forEach((rel) => {
      insights.push({
        type: "correlation",
        description: `Relationship found: ${rel.name} connects to ${rel.targetCategory} via ${rel.viaField}`,
        confidence: 0.8, // Static confidence for relationship existence
        category: rel.targetCategory,
      });
    });

    return insights;
  }

  /**
   * Get display name for a record.
   *
   * @param {CategoryRecord} record - record parameter.
   * @returns {string} - TODO: describe return value.
   */
  private getRecordDisplayName(record: CategoryRecord): string {
    return (
      (typeof record.name === "string" && record.name) ||
      (typeof record.title === "string" && record.title) ||
      String(record.id)
    );
  }
  // -------------------------
  // Configuration accessors migrated from legacy wrapper
  // -------------------------
  /**
   * Get analysis configuration block.
   *
   * @returns {DataConfig['analysis']} Insight generation and depth settings.
   */
  public getAnalysisConfig(): DataConfig["analysis"] {
    return this.dataConfig.analysis || ({} as DataConfig["analysis"]);
  }
  /**
   * Get quality configuration block.
   *
   * @returns {NonNullable<DataConfig['quality']>} Data quality thresholds and flags.
   */
  public getQualityConfig(): NonNullable<DataConfig["quality"]> {
    return (
      this.dataConfig.quality || ({} as NonNullable<DataConfig["quality"]>)
    );
  }
  /**
   * Get exploration configuration block.
   *
   * @returns {DataConfig['exploration']} Exploration plan and complexity settings.
   */
  public getExplorationConfig(): DataConfig["exploration"] {
    return this.dataConfig.exploration || ({} as DataConfig["exploration"]);
  }
  /**
   * Get relationships configuration block.
   *
   * @returns {DataConfig['relationships']} Relationship mapping settings.
   */
  public getRelationshipsConfig(): DataConfig["relationships"] {
    return this.dataConfig.relationships || ({} as DataConfig["relationships"]);
  }
  /**
   * Get synthesis configuration block.
   *
   * @returns {NonNullable<DataConfig['synthesis']>} Topic overview & synthesis settings.
   */
  public getSynthesisConfig(): NonNullable<DataConfig["synthesis"]> {
    return (
      this.dataConfig.synthesis || ({} as NonNullable<DataConfig["synthesis"]>)
    );
  }
  /**
   * Get performance configuration block.
   *
   * @returns {NonNullable<DataConfig['performance']>} Performance and concurrency settings.
   */
  public getPerformanceConfig(): NonNullable<DataConfig["performance"]> {
    return (
      this.dataConfig.performance ||
      ({} as NonNullable<DataConfig["performance"]>)
    );
  }
  /**
   * Get search configuration block.
   *
   * @returns {NonNullable<DataConfig['search']>} Search behavior (fuzzy matching, limits).
   */
  public getSearchConfig(): NonNullable<DataConfig["search"]> {
    return this.dataConfig.search || ({} as NonNullable<DataConfig["search"]>);
  }
  /**
   * Determine if insight generation is enabled.
   *
   * @returns {boolean} True when insights will be produced.
   */
  public isInsightGenerationEnabled(): boolean {
    return this.getAnalysisConfig().enableInsightGeneration;
  }
  /**
   * Determine if cross-category analysis is enabled.
   *
   * @returns {boolean} True when relationships across categories are considered.
   */
  public isCrossCategoryAnalysisEnabled(): boolean {
    return this.getAnalysisConfig().crossCategoryAnalysis;
  }
  /**
   * Determine if relationship mapping is enabled.
   *
   * @returns {boolean} True when mapping across category relationships.
   */
  public isRelationshipMappingEnabled(): boolean {
    return this.getRelationshipsConfig().enableRelationshipMapping;
  }
  /**
   * Determine if automatic exploration plan generation is enabled.
   *
   * @returns {boolean} True when plans auto-generate.
   */
  public isAutomaticPlanGenerationEnabled(): boolean {
    return this.getExplorationConfig().enableAutomaticPlanGeneration;
  }
  /**
   * Maximum insight reasoning depth.
   *
   * @returns {number} Depth limit.
   */
  public getMaxInsightDepth(): number {
    return this.getAnalysisConfig().maxInsightDepth;
  }
  /**
   * Maximum exploration steps allowed.
   *
   * @returns {number} Step limit.
   */
  public getMaxExplorationSteps(): number {
    return this.getExplorationConfig().maxExplorationSteps;
  }
  /**
   * Maximum relationship traversal depth.
   *
   * @returns {number} Depth limit.
   */
  public getMaxRelationshipDepth(): number {
    return this.getRelationshipsConfig().maxRelationshipDepth;
  }
  /**
   * Exploration plan complexity cap.
   *
   * @returns {"low"|"medium"|"high"} Complexity limit.
   */
  public getPlanComplexityLimit(): "low" | "medium" | "high" {
    return this.getExplorationConfig().planComplexityLimit;
  }
  /**
   * Minimum insight confidence threshold.
   *
   * @returns {number} Confidence threshold.
   */
  public getInsightConfidenceThreshold(): number {
    return this.getAnalysisConfig().insightConfidenceThreshold ?? 0.7;
  }
  /**
   * Minimum relationship strength threshold.
   *
   * @returns {number} Strength threshold.
   */
  public getRelationshipStrengthThreshold(): number {
    return this.getRelationshipsConfig().relationshipStrengthThreshold ?? 0.3;
  }
  /**
   * Maximum insights per analysis.
   *
   * @returns {number} Cap for insights returned per run.
   */
  public getMaxInsightsPerAnalysis(): number {
    return this.getAnalysisConfig().maxInsightsPerAnalysis ?? 10;
  }
  /**
   * Maximum relationships per analysis.
   *
   * @returns {number} Cap for relationships evaluated per run.
   */
  public getMaxRelationshipsPerAnalysis(): number {
    return this.getRelationshipsConfig().maxRelationshipsPerAnalysis ?? 25;
  }
  /**
   * Insight categories focus order.
   *
   * @returns {string[]} Category order for insight classification.
   */
  public getInsightCategories(): string[] {
    return this.getAnalysisConfig().insightCategories ?? [];
  }
  /**
   * Ordered exploration priorities for categories.
   *
   * @returns {string[]} Category priority list (may be empty).
   */
  public getExplorationPriorities(): string[] {
    const priorities = this.getExplorationConfig().explorationPriorities;
    return Array.isArray(priorities) ? priorities : [];
  }
}

/**
 * Factory function that creates a {@link DataAgent} with default (or partially overridden) configuration.
 *
 * @param {Partial<AgentConfigDefinition>} [config] - Optional partial configuration overrides.
 * @returns {DataAgent} DataAgent instance.
 */
export function createDataAgent(
  config?: Partial<AgentConfigDefinition>
): DataAgent {
  return new DataAgent(config);
}

// Export configuration types and instances for external use
export { dataAgentConfig } from "@agent/dataAgent/agent.config";
