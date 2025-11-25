/**
 * @packageDocumentation Configuration descriptor types and helpers.
 * Runtime helpers reside outside `src/types/**` to preserve types-only purity.
 */

export interface ConfigDescriptor {
  name: string;
  path: string;
  type: string;
  visibility: "public" | "private";
  verifyPaths?: string[];
  group?: string;
  description?: string;
  validate?: (value: unknown) => boolean | string;
}

export function createDescriptorMap(
  entries: Array<[string, ConfigDescriptor]>
): Record<string, ConfigDescriptor> {
  return Object.fromEntries(entries);
}
