/**
 * @packageDocumentation Runtime helpers for working with agent configuration.
 * These helpers live under `src/shared/**` to keep `src/types/**` free of runtime logic.
 */

import type {
  AgentConfigDefinition,
  UserFacingConfig,
} from "@internal-types/agentConfig";

function deepSet(obj: Record<string, unknown>, path: string, value: unknown) {
  const parts = path.split(".").filter(Boolean);
  let cur: Record<string, unknown> = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    const key = parts[i]!;
    if (typeof cur[key] !== "object" || cur[key] === null) {
      cur[key] = {} as unknown as Record<string, unknown>;
    }
    cur = cur[key] as Record<string, unknown>;
  }
  cur[parts[parts.length - 1]!] = value as unknown;
}

function deepDelete(obj: Record<string, unknown>, path: string) {
  const parts = path.split(".").filter(Boolean);
  const stack: Array<[Record<string, unknown>, string]> = [];
  let cur: Record<string, unknown> | undefined = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    const key = parts[i]!;
    const next = cur[key];
    if (typeof next !== "object" || next === null) {
      return; // nothing to delete
    }
    stack.push([cur, key]);
    cur = next as Record<string, unknown>;
  }
  if (cur) delete cur[parts[parts.length - 1]!];
  for (let i = stack.length - 1; i >= 0; i--) {
    const [parent, key] = stack[i]!;
    const child = parent[key];
    if (
      typeof child === "object" &&
      child !== null &&
      Object.keys(child as Record<string, unknown>).length === 0
    ) {
      delete parent[key];
    }
  }
}

export function setConfigItem(
  overridesLocal: Record<string, unknown>,
  overridesGlobal: Record<string, unknown>,
  path: string,
  value: unknown,
  env: "local" | "global" = "local"
): void {
  const target = env === "local" ? overridesLocal : overridesGlobal;
  if (value === undefined || value === null) {
    deepDelete(target, path);
    return;
  }
  deepSet(target, path, value);
}

export function getFullConfig(
  config: AgentConfigDefinition
): AgentConfigDefinition {
  return config;
}

export function getUserFacingConfig(
  config: AgentConfigDefinition
): UserFacingConfig | undefined {
  return config.userFacing;
}
