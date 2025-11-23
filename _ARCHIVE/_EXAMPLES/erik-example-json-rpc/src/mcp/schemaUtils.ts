/**
 * @packageDocumentation schemaUtils implementation for mcp module
 */

import { CategoryId } from "@internal-types/agentConfig";
import type {
  BusinessCategory,
  RelationshipDescription,
  CategorySchema,
} from "@internal-types/userContext.types";

/**
 * RelationshipIntegrityIssue interface.
 *
 */
export interface RelationshipIntegrityIssue {
  categoryId: CategoryId;
  relationship: RelationshipDescription;
  reason: string;
}

/**
 * SchemaValidationSummary interface.
 *
 */
export interface SchemaValidationSummary {
  missingRelationships: RelationshipIntegrityIssue[];
  duplicateSchemaNames: string[];
}

/**
 * Normalize a schema name by trimming whitespace and lowercasing.
 *
 * @param {string} name - Raw schema name.
 * @returns {string} Normalized lowercase name suitable for duplicate detection.
 */
export function NormalizeSchemaName(name: string): string {
  return name.trim().toLowerCase();
}

/**
 * Detect duplicate schema names (case-insensitive) within a category.
 *
 * @param {CategorySchema[]} schemas - List of schema descriptors.
 * @returns {string[]} Array of original schema names that appear more than once when normalized.
 */
export function detectDuplicateSchemas(schemas: CategorySchema[]): string[] {
  const seen = new Map<string, number>();
  const duplicates: string[] = [];
  schemas.forEach((schema) => {
    const Normalized = NormalizeSchemaName(schema.name);
    const count = (seen.get(Normalized) ?? 0) + 1;
    seen.set(Normalized, count);
    if (count > 1) {
      duplicates.push(schema.name);
    }
  });
  return duplicates;
}

/**
 * Validate that all declared relationships target existing categories.
 *
 * @param {BusinessCategory[]} categories - All business categories loaded.
 * @returns {RelationshipIntegrityIssue[]} Issues for each relationship referencing a missing target category.
 */
export function validateRelationships(
  categories: BusinessCategory[]
): RelationshipIntegrityIssue[] {
  const index = new Map<CategoryId, BusinessCategory>();
  categories.forEach((category) => index.set(category.id, category));
  const issues: RelationshipIntegrityIssue[] = [];
  categories.forEach((category) => {
    category.config.relationships.forEach((relationship) => {
      if (!index.has(relationship.targetCategory)) {
        issues.push({
          categoryId: category.id,
          relationship,
          reason: `Missing target category '${relationship.targetCategory}'`,
        });
      }
    });
  });
  return issues;
}

/**
 * Aggregate schema validation results for provided categories.
 *
 * @param {BusinessCategory[]} categories - All business categories loaded.
 * @returns {SchemaValidationSummary} Summary containing missing relationship issues and duplicate schema names.
 */
export function validateCategorySchemas(
  categories: BusinessCategory[]
): SchemaValidationSummary {
  const missingRelationships = validateRelationships(categories);
  const duplicateSchemaNames = categories
    .flatMap((category) => detectDuplicateSchemas(category.schemas))
    .filter((value, index, array) => array.indexOf(value) === index);
  return { missingRelationships, duplicateSchemaNames };
}
