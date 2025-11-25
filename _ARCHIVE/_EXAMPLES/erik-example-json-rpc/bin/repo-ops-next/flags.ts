/**
 * @packageDocumentation
 * Shared flag parsing utilities for the next-gen repo-ops CLI.
 */

export type FlagValue = string | boolean;

export interface ParsedFlags {
  /**
   * Positional arguments (command, subcommand, etc.).
   */
  positionals: string[];
  /**
   * Map of flag name -> value.
   * Boolean flags are `true` when present (or `false` when negated with a `--no-` prefix).
   */
  flags: Record<string, FlagValue>;
}

/**
 * Parse argv into positionals and a typed flag map.
 *
 * Rules (initial):
 * - `--flag` → boolean `true`.
 * - `--no-flag` → boolean `false` (stored under `flag`).
 * - `--key value` → string value.
 * - `--key=value` → string value.
 * - Short flags (e.g., `-v`) are treated as boolean `true`.
 * - Parsing is left-to-right and shell-agnostic.
 */
export function parseFlags(argv: string[]): ParsedFlags {
  const positionals: string[] = [];
  const flags: Record<string, FlagValue> = {};

  let i = 0;
  while (i < argv.length) {
    const token = argv[i];

    if (!token.startsWith("-")) {
      positionals.push(token);
      i += 1;
      continue;
    }

    if (token.startsWith("--")) {
      const raw = token.slice(2);

      if (raw.startsWith("no-")) {
        const name = raw.slice(3);
        flags[name] = false;
        i += 1;
        continue;
      }

      const eqIndex = raw.indexOf("=");
      if (eqIndex !== -1) {
        const name = raw.slice(0, eqIndex);
        const value = raw.slice(eqIndex + 1);
        flags[name] = value;
        i += 1;
        continue;
      }

      const name = raw;
      const next = argv[i + 1];
      if (next !== undefined && !next.startsWith("-")) {
        flags[name] = next;
        i += 2;
        continue;
      }

      flags[name] = true;
      i += 1;
      continue;
    }

    if (token.startsWith("-")) {
      const name = token.slice(1);
      if (name.length > 0) {
        flags[name] = true;
      }
      i += 1;
      continue;
    }

    i += 1;
  }

  return { positionals, flags };
}

export interface DerivedBooleanFlags {
  write: boolean;
  validate: boolean;
}

/**
 * Derive normalized boolean flags (write/validate) purely from the presence
 * of corresponding CLI flags.
 */
export function deriveBooleanFlags(
  flags: Record<string, FlagValue>
): DerivedBooleanFlags {
  const write = flags.write === true;
  const validate = flags.validate === true;
  return { write, validate };
}
