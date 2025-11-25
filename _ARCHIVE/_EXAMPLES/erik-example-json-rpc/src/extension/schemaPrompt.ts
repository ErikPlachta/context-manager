/**
 * @packageDocumentation Generates VS Code input prompts for MCP tool schemas.
 *
 * @module schemaPrompt
 */
import * as vscode from "vscode";
import { MCPProperty, MCPTool } from "@extension/mcpSync";

/**
 * Resolve the declared JSON schema type into a singular primitive string.
 *
 * @param {MCPProperty} property - property parameter.
 * @returns {string} - TODO: describe return value.
 */
function resolvePropertyType(property: MCPProperty): string {
  if (!property.type) {
    return "string";
  }
  return Array.isArray(property.type) ? property.type[0] : property.type;
}

/**
 * Convert user input to the correct JavaScript type based on the schema.
 *
 * @param {string} rawValue - rawValue parameter.
 * @param {MCPProperty} property - property parameter.
 * @returns {unknown} - TODO: describe return value.
 * @throws {Error} - May throw an error.
 */
function coerceValue(rawValue: string, property: MCPProperty): unknown {
  const type = resolvePropertyType(property);
  switch (type) {
    case "number":
    case "integer": {
      const parsed = Number(rawValue);
      if (Number.isNaN(parsed)) {
        throw new Error("Please enter a valid number.");
      }
      return parsed;
    }
    case "boolean":
      return rawValue === "true";
    case "array": {
      if (!rawValue.trim()) {
        return [];
      }
      const items = rawValue
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
      if (property.items) {
        return items.map((value) =>
          coerceValue(value, property.items as MCPProperty)
        );
      }
      return items;
    }
    default:
      return rawValue;
  }
}

/**
 * Prompts the user for all required tool arguments.
 *
 * @param {MCPTool} tool - tool parameter.
 * @returns {Promise<Record<string, unknown> | undefined>} - TODO: describe return value.
 * @throws {Error} - May throw an error.
 */
export async function promptForArgs(
  tool: MCPTool
): Promise<Record<string, unknown> | undefined> {
  const args: Record<string, unknown> = {};
  const props = tool.input_schema?.properties ?? {};

  for (const [key, prop] of Object.entries(props)) {
    const property = prop as MCPProperty;
    const promptParts = [property.description ?? key];
    if (property.required) {
      promptParts.push("(required)");
    }
    if (property.default !== undefined) {
      promptParts.push(`Default: ${property.default}`);
    }
    const prompt = promptParts.join(" ").trim();
    const type = resolvePropertyType(property);

    try {
      if (property.enum?.length) {
        const selection = await vscode.window.showQuickPick(property.enum, {
          title: `${tool.title} • ${key}`,
          placeHolder: prompt,
          canPickMany: type === "array",
          ignoreFocusOut: true,
        });
        if (selection === undefined) {
          if (property.required) {
            return undefined;
          }
          continue;
        }
        if (Array.isArray(selection)) {
          args[key] = selection;
        } else {
          args[key] = selection;
        }
        continue;
      }

      if (type === "boolean") {
        const pick = await vscode.window.showQuickPick(["true", "false"], {
          title: `${tool.title} • ${key}`,
          placeHolder: prompt,
          ignoreFocusOut: true,
        });
        if (pick === undefined) {
          if (property.required) {
            return undefined;
          }
          continue;
        }
        args[key] = coerceValue(pick, property);
        continue;
      }

      const value = await vscode.window.showInputBox({
        title: `${tool.title} • ${key}`,
        prompt,
        ignoreFocusOut: true,
        value: String(property.default ?? ""),
      });

      if (value === undefined) {
        if (property.required) {
          return undefined;
        }
        continue;
      }

      if (!value.trim()) {
        if (property.required) {
          throw new Error(`Missing required argument: ${key}`);
        }
        continue;
      }

      args[key] = coerceValue(value, property);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await vscode.window.showErrorMessage(message);
      return undefined;
    }
  }

  return args;
}
