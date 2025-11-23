/**
 * @packageDocumentation
 * BaseAgentConfig runtime class for configuration access and overrides.
 *
 * Moves runtime logic out of `src/types/**` to preserve types-only purity.
 * Provides helpers to read config values with local/global overrides, verify
 * required paths, and expose sanitized configuration snapshots.
 */
import type {
  AgentConfigDefinition,
  ExecutionConfig,
  UserFacingConfig,
  ApplicationFacingConfig,
} from "@internal-types/agentConfig";
import type { ConfigDescriptor } from "@shared/config/descriptors";
import {
  setConfigItem as _sharedSetConfigItem,
  getFullConfig as _sharedGetFullConfig,
  getUserFacingConfig as _sharedGetUserFacingConfig,
} from "@shared/config/runtime";

/**
 * Base class for agent configuration management (runtime).
 */
export abstract class BaseAgentConfig {
  protected config: AgentConfigDefinition;
  private overridesLocal: Record<string, unknown> = {};
  private overridesGlobal: Record<string, unknown> = {};

  /**
   * Initialize the base agent configuration wrapper.
   * @param config - Fully typed configuration object for the agent.
   */
  constructor(config: AgentConfigDefinition) {
    this.config = config;
  }

  /**
   * Retrieve a configuration value by a dot-delimited path, with overrides applied.
   */
  public getConfigItem<T = unknown>(path: string): T | undefined {
    const fromLocal = this.deepGet<T>(this.overridesLocal, path);
    if (fromLocal !== undefined) return fromLocal;
    const fromGlobal = this.deepGet<T>(this.overridesGlobal, path);
    if (fromGlobal !== undefined) return fromGlobal;
    return this.deepGet<T>(
      this.config as unknown as Record<string, unknown>,
      path
    );
  }

  /**
   * Set a runtime override for a configuration value.
   */
  public setConfigItem(
    path: string,
    value: unknown,
    env: "local" | "global" = "local"
  ): void {
    _sharedSetConfigItem(
      this.overridesLocal,
      this.overridesGlobal,
      path,
      value,
      env
    );
  }

  /**
   * Verify a list of required configuration paths are present after overrides are applied.
   */
  public confirmConfigItems(requiredPaths: readonly string[]): {
    missing: string[];
    passed: boolean;
  } {
    const missing: string[] = [];
    for (const p of requiredPaths) {
      const v = this.getConfigItem(p);
      if (v === undefined || v === null) missing.push(p);
    }
    return { missing, passed: missing.length === 0 };
  }

  /** Get a config value using a descriptor. */
  public getByDescriptor<T = unknown>(
    descriptor: ConfigDescriptor
  ): T | undefined {
    return this.getConfigItem<T>(descriptor.path);
  }

  /** Set a config value using a descriptor. */
  public setByDescriptor(
    descriptor: ConfigDescriptor,
    value: unknown,
    env: "local" | "global" = "local"
  ): void {
    this.setConfigItem(descriptor.path, value, env);
  }

  /** Verify required paths for a descriptor. */
  public verifyDescriptor(descriptor: ConfigDescriptor): {
    passed: boolean;
    missing: string[];
  } {
    const paths =
      descriptor.verifyPaths && descriptor.verifyPaths.length > 0
        ? descriptor.verifyPaths
        : [descriptor.path];
    const { missing, passed } = this.confirmConfigItems(paths);
    return { missing, passed };
  }

  /**
   * Get a sanitized, public-facing view of the configuration suitable for diagnostics and UI.
   */
  public getConfig(): Partial<AgentConfigDefinition> {
    return {
      $configId: this.config.$configId,
      agent: this.config.agent,
      userFacing: this.config.userFacing,
      applicationFacing: {
        technicalDescription:
          this.config.applicationFacing?.technicalDescription,
        capabilities: this.config.applicationFacing?.capabilities,
        performance: this.config.applicationFacing?.performance,
      },
    };
  }

  /** Get complete configuration (internal). */
  protected _getConfig(): AgentConfigDefinition {
    return _sharedGetFullConfig(this.config);
  }

  /** Get execution configuration. */
  public getExecutionConfig(): ExecutionConfig | undefined {
    return this.config.execution;
  }

  /** Get user-facing configuration. */
  public getUserFacingConfig(): UserFacingConfig | undefined {
    return _sharedGetUserFacingConfig(this.config);
  }

  /** Get application-facing configuration. */
  public getApplicationFacingConfig(): ApplicationFacingConfig | undefined {
    return this.config.applicationFacing;
  }

  /** Get configuration schema ID. */
  public getConfigId(): string {
    return this.config.$configId;
  }

  /** Clear an override for a configuration item. */
  public clearOverride(
    descriptor: ConfigDescriptor,
    env: "local" | "global" = "local"
  ): void {
    const targetOverrides =
      env === "local" ? this.overridesLocal : this.overridesGlobal;
    this.deepDelete(targetOverrides, descriptor.path);
  }

  /** Default descriptor map (agents should override). */
  public getAllDescriptors(): Record<string, ConfigDescriptor> {
    return {};
  }

  // -------------------------
  // Internal helpers
  // -------------------------

  private deepGet<T = unknown>(
    obj: Record<string, unknown>,
    path: string
  ): T | undefined {
    const parts = path.split(".").filter(Boolean);
    let cur: unknown = obj;
    for (const key of parts) {
      if (typeof cur !== "object" || cur === null) return undefined;
      const next = (cur as Record<string, unknown>)[key];
      if (next === undefined) return undefined;
      cur = next;
    }
    return cur as T;
  }

  private deepDelete(obj: Record<string, unknown>, path: string): void {
    const parts = path.split(".").filter(Boolean);
    const stack: Array<[Record<string, unknown>, string]> = [];
    let cur: Record<string, unknown> | undefined = obj;
    for (let i = 0; i < parts.length - 1; i++) {
      const key = parts[i]!;
      const next = cur[key];
      if (typeof next !== "object" || next === null) {
        return;
      }
      stack.push([cur, key]);
      cur = next as Record<string, unknown>;
    }
    if (cur) {
      delete cur[parts[parts.length - 1]!];
    }
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
}
