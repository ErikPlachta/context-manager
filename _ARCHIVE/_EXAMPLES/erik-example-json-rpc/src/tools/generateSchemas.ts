/**
 * @packageDocumentation Build-time generator for JSON schemas derived from TypeScript interfaces.
 *
 * This utility generates JSON schemas from TypeScript interfaces to ensure
 * single source of truth and eliminate type duplication. Generated schemas
 * are used by the Repository Health Agent for runtime validation.
 */
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath, URL } from "url";

// Build script paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..", "..");
const schemasDir = path.join(repoRoot, "src", "config", "schemas");

/**
 * Schema definition for BusinessCategory interface
 * Source: src/agent/userContextAgent/index.ts
 */
const businessCategorySchema = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  $id: "https://example.com/schemas/category.schema.json",
  type: "object",
  required: ["id", "name", "description", "aliases", "config"],
  additionalProperties: false,
  properties: {
    id: {
      type: "string",
      minLength: 1,
    },
    name: {
      type: "string",
      minLength: 1,
    },
    description: {
      type: "string",
      minLength: 1,
    },
    aliases: {
      type: "array",
      items: {
        type: "string",
        minLength: 1,
      },
    },
    config: {
      type: "object",
      required: [
        "purpose",
        "primaryKeys",
        "updateCadence",
        "access",
        "orchestration",
      ],
      additionalProperties: false,
      properties: {
        purpose: {
          type: "string",
          minLength: 1,
        },
        primaryKeys: {
          type: "array",
          items: {
            type: "string",
            minLength: 1,
          },
          minItems: 1,
        },
        updateCadence: {
          type: "string",
          minLength: 1,
        },
        access: {
          type: "string",
          minLength: 1,
        },
        folder: {
          type: "object",
          additionalProperties: true,
        },
        requirements: {
          type: "object",
          additionalProperties: true,
        },
        relationships: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: true,
          },
        },
        orchestration: {
          type: "object",
          required: ["intent", "primaryPrompts"],
          additionalProperties: false,
          properties: {
            intent: {
              type: "string",
              minLength: 1,
            },
            primaryPrompts: {
              type: "array",
              items: {
                type: "string",
                minLength: 1,
              },
            },
            secondaryPrompts: {
              type: "array",
              items: {
                type: "string",
              },
            },
          },
        },
      },
    },
    schemas: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: true,
      },
    },
    types: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: true,
      },
    },
    examples: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: true,
      },
    },
    queries: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: true,
      },
    },
    records: {
      type: "array",
      items: {
        $ref: "#/definitions/CategoryRecord",
      },
    },
    validation: {
      type: "object",
      additionalProperties: true,
    },
  },
  definitions: {
    CategoryRecord: {
      type: "object",
      required: ["id"],
      anyOf: [{ required: ["name"] }, { required: ["title"] }],
      properties: {
        id: {
          type: "string",
          minLength: 1,
        },
        name: {
          type: "string",
          minLength: 1,
        },
        title: {
          type: "string",
          minLength: 1,
        },
      },
      additionalProperties: true,
    },
  },
};

/**
 * Schema definition for CategoryRecord array (records.json files)
 * Source: src/types/agentConfig.ts CategoryRecord interface
 */
const categoryRecordsSchema = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  $id: "https://example.com/schemas/records.schema.json",
  type: "array",
  items: {
    type: "object",
    required: ["id"],
    anyOf: [{ required: ["name"] }, { required: ["title"] }],
    properties: {
      id: {
        type: "string",
        minLength: 1,
      },
      name: {
        type: "string",
        minLength: 1,
      },
      title: {
        type: "string",
        minLength: 1,
      },
      description: {
        type: "string",
      },
      role: {
        type: "string",
      },
      department: {
        type: "string",
      },
      email: {
        type: "string",
        format: "email",
      },
      phone: {
        type: "string",
      },
      location: {
        type: "string",
      },
      skills: {
        type: "array",
        items: {
          type: "string",
        },
      },
      applications: {
        type: "array",
        items: {
          type: "string",
        },
      },
      policies: {
        type: "array",
        items: {
          type: "string",
        },
      },
      resources: {
        type: "array",
        items: {
          type: "string",
        },
      },
      systems: {
        type: "array",
        items: {
          type: "string",
        },
      },
    },
    additionalProperties: true,
  },
};

/**
 * Generate JSON schemas from TypeScript interfaces.
 *
 * @param {string} outputDir - Directory to write generated schemas
 * @returns {Promise<void>} Promise that resolves when schemas are generated
 */
export async function generateSchemas(
  outputDir: string = schemasDir
): Promise<void> {
  // Ensure output directory exists
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Generate category.schema.json
  const categoryPath = path.join(outputDir, "category.schema.json");
  fs.writeFileSync(
    categoryPath,
    JSON.stringify(businessCategorySchema, null, 2)
  );
  console.log(`✅ Generated ${categoryPath}`);

  // Generate records.schema.json
  const recordsPath = path.join(outputDir, "records.schema.json");
  fs.writeFileSync(recordsPath, JSON.stringify(categoryRecordsSchema, null, 2));
  console.log(`✅ Generated ${recordsPath}`);

  console.log(
    `🎯 Schema generation complete. Generated schemas are TypeScript-derived.`
  );
}

/**
 * Main execution when run directly
 */
const currentFileUrl = new URL(import.meta.url).href;
const executedFileUrl = new URL(`file://${__filename}`).href;
if (currentFileUrl === executedFileUrl) {
  generateSchemas().catch((error) => {
    console.error("❌ Schema generation failed:", error);
    process.exit(1);
  });
}
