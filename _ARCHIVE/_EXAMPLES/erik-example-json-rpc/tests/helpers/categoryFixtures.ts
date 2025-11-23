/**
 * Test fixtures for creating valid category structures
 */

export interface MinimalCategoryConfig {
  id: string;
  name: string;
  description?: string;
}

/**
 * Creates a valid category.json structure with proper orchestration
 */
export function createValidCategoryJson(config: MinimalCategoryConfig): object {
  return {
    id: config.id,
    name: config.name,
    description: config.description || `Test category ${config.id}`,
    aliases: [config.id],
    config: {
      purpose: "Test category",
      primaryKeys: ["id"],
      updateCadence: "Test",
      access: "Test access",
      orchestration: {
        summary: `Test orchestration for ${config.name}`,
        signals: ["test signal"],
        agents: {
          relevantDataManager: {
            focus: "Test focus for relevant data manager",
            signals: ["test signal 1", "test signal 2"],
            promptStarters: ["Test prompt 1", "Test prompt 2"],
          },
          databaseAgent: {
            focus: "Test focus for database agent",
            signals: ["test signal 1", "test signal 2"],
            promptStarters: ["Test prompt 1", "Test prompt 2"],
          },
          dataAgent: {
            focus: "Test focus for data agent",
            signals: ["test signal 1", "test signal 2"],
            promptStarters: ["Test prompt 1", "Test prompt 2"],
          },
        },
      },
    },
  };
}

/**
 * Creates a minimal valid records.json array
 */
export function createValidRecordsJson(
  categoryId: string,
  count: number = 1
): object[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `${categoryId}-${i + 1}`,
    name: `Test Record ${i + 1}`,
  }));
}

/**
 * Creates a minimal valid relationships.json array with one dummy relationship
 */
export function createValidRelationshipsJson(): object[] {
  return [
    {
      key: "testRelation",
      name: "Test Relationship",
      sourceField: "id",
      targetField: "id",
      targetCategory: "test",
      description: "Test relationship for fixtures",
    },
  ];
}
