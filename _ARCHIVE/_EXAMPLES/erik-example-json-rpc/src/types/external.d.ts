/**
 * @packageDocumentation external.d implementation for types module
 */

declare module "gray-matter" {
  import type { Buffer } from "node:buffer";

  interface GrayMatterFile<T = Record<string, unknown>> {
    data: T;
    content: string;
    excerpt?: string;
    orig: {
      data: string;
      content: string;
    };
    language?: string;
    matter?: string;
  }

  type GrayMatterInput = string | Buffer;

  interface GrayMatterOptions<T = Record<string, unknown>> {
    excerpt?: boolean | ((file: GrayMatterFile<T>) => unknown);
    engines?: Record<string, unknown>;
    language?: string;
  }

  export default function matter<T = Record<string, unknown>>(
    input: GrayMatterInput,
    options?: GrayMatterOptions<T>
  ): GrayMatterFile<T>;
}
