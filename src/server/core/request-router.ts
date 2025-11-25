/**
 * Request Router
 *
 * Routes tool call requests to appropriate skills.
 */

import type { SkillRegistry } from './skill-registry.js';
import type { MCPToolResult } from '../../types/index.js';

/**
 * Route a tool call to the appropriate skill
 *
 * @param registry - Skill registry
 * @param toolName - Name of tool to call
 * @param args - Tool arguments
 * @returns Tool result
 */
export async function routeToolCall(
  registry: SkillRegistry,
  toolName: string,
  args: unknown
): Promise<MCPToolResult> {
  console.error(`[Router] Routing tool call: ${toolName}`);

  try {
    // Find skill that provides this tool
    const skill = registry.findByTool(toolName);

    if (!skill) {
      throw new Error(`Unknown tool: ${toolName}`);
    }

    // Find tool handler
    const toolReg = skill.tools.find(t => t.definition.name === toolName);

    if (!toolReg) {
      throw new Error(`Tool handler not found: ${toolName}`);
    }

    // Validate input against schema
    const validatedInput = toolReg.definition.inputSchema.parse(args);

    // Execute tool handler
    console.error(`[Router] Executing ${toolName} from skill ${skill.id}`);
    const result = await toolReg.handler(validatedInput);

    // Format result
    if (typeof result === 'string') {
      return {
        content: [{ type: 'text', text: result }]
      };
    }

    if (result && typeof result === 'object' && 'content' in result) {
      return result as MCPToolResult;
    }

    // Default: convert to string
    return {
      content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[Router] Error executing ${toolName}:`, errorMessage);

    return {
      content: [{ type: 'text', text: `Error: ${errorMessage}` }],
      isError: true
    };
  }
}

/**
 * Get all tool definitions from registered skills
 *
 * @param registry - Skill registry
 * @returns Array of tool definitions in MCP format
 */
export function getAllTools(registry: SkillRegistry) {
  const skills = registry.getAll();
  const tools: any[] = [];

  for (const skill of skills) {
    for (const toolReg of skill.tools) {
      const { name, description, inputSchema } = toolReg.definition;

      // Convert Zod schema to JSON Schema
      const jsonSchema = zodToJsonSchema(inputSchema);

      tools.push({
        name,
        description,
        inputSchema: jsonSchema
      });
    }
  }

  return tools;
}

/**
 * Convert Zod schema to JSON Schema (basic implementation)
 * For production, consider using zod-to-json-schema package
 */
function zodToJsonSchema(schema: any): any {
  // This is a simplified implementation
  // In production, use a library like zod-to-json-schema
  if (schema._def?.typeName === 'ZodObject') {
    const shape = schema._def.shape();
    const properties: any = {};
    const required: string[] = [];

    for (const [key, value] of Object.entries(shape)) {
      properties[key] = zodToJsonSchema(value);
      if (!(value as any).isOptional()) {
        required.push(key);
      }
    }

    return {
      type: 'object',
      properties,
      required: required.length > 0 ? required : undefined
    };
  }

  if (schema._def?.typeName === 'ZodString') {
    return {
      type: 'string',
      description: schema._def.description
    };
  }

  if (schema._def?.typeName === 'ZodNumber') {
    return {
      type: 'number',
      description: schema._def.description
    };
  }

  if (schema._def?.typeName === 'ZodBoolean') {
    return {
      type: 'boolean',
      description: schema._def.description
    };
  }

  // Fallback
  return { type: 'string' };
}
