/**
 * @fileoverview Template processor for replacing placeholders in category.json files during build.
 */

import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import fg from "fast-glob";

interface AgentTemplateDefinition {
  name: string;
  description: string;
  label: string;
  displayName: string;
  className: string;
  capabilities: string[];
  responsibility: string;
}

interface TemplateConfig {
  agents: {
    definitions?: Record<string, AgentTemplateDefinition>;
    templateReplacements: Record<string, string>;
    configurationSource?: string;
  };
}

type UnifiedAgentConfigLike = {
  metadata?: {
    name?: string;
    label?: string;
    displayName?: string;
    className?: string;
    capabilities?: string[];
    responsibility?: string;
    userFacing?: {
      friendlyDescription?: string;
      helpText?: string;
    };
    applicationFacing?: {
      technicalDescription?: string;
    };
  };
};

export class TemplateProcessor {
  private static readonly AGENT_ALIASES: Record<string, string[]> = {
    "relevant-data-manager": [
      "relevantDataManager",
      "userContext",
      "user-context",
    ],
    "database-agent": ["databaseAgent"],
    "data-agent": ["dataAgent"],
    "clarification-agent": ["clarificationAgent"],
  };

  private config: TemplateConfig;
  private agentDefinitions: Record<string, AgentTemplateDefinition>;

  private constructor(
    config: TemplateConfig,
    agentDefinitions: Record<string, AgentTemplateDefinition>
  ) {
    this.config = config;
    this.agentDefinitions = agentDefinitions;
    this.config.agents.definitions =
      this.withAliasDefinitions(agentDefinitions);
  }

  static async create(
    configPath: string = "out/mcp.config.json"
  ): Promise<TemplateProcessor> {
    const config = await this.loadConfig(configPath);
    const agentDefinitions = await this.loadAgentDefinitions(
      config,
      configPath
    );
    return new TemplateProcessor(config, agentDefinitions);
  }

  async processTemplates(
    dataDirectory: string = "src/userContext"
  ): Promise<void> {
    const categoryFiles = await fg("*/category.json", {
      cwd: dataDirectory,
      absolute: true,
    });
    for (const filePath of categoryFiles) {
      await this.processFile(filePath);
    }
    console.log(`✅ Processed ${categoryFiles.length} category templates`);
  }

  private async processFile(filePath: string): Promise<void> {
    const content = await fs.promises.readFile(filePath, "utf-8");
    let processedContent = content;
    const replacements = this.config.agents?.templateReplacements || {};
    for (const [placeholder, templatePath] of Object.entries(replacements)) {
      const replacement = this.resolveTemplateValue(templatePath);
      processedContent = processedContent.replace(
        new RegExp(placeholder, "g"),
        replacement
      );
    }
    if (processedContent !== content) {
      await fs.promises.writeFile(filePath, processedContent, "utf-8");
      console.log(
        `📝 Updated templates in: ${path.relative(process.cwd(), filePath)}`
      );
    }
  }

  private resolveTemplateValue(templatePath: string): string {
    const hasBraces =
      templatePath.startsWith("{{") && templatePath.endsWith("}}");
    if (!hasBraces) {
      return templatePath;
    }

    const normalizedPath = templatePath.replace(/^\{\{|\}\}$/g, "");
    const parts = normalizedPath.split(".");
    let value: unknown = this.config as unknown;
    for (let index = 0; index < parts.length; index += 1) {
      const part = parts[index];
      if (!value || typeof value !== "object") {
        console.warn(`⚠️  Template path not found: ${normalizedPath}`);
        return templatePath;
      }

      if (
        index >= 2 &&
        parts[index - 1] === "definitions" &&
        typeof part === "string"
      ) {
        const canonical = this.findCanonicalAgentKey(part);
        if (canonical && canonical in (value as Record<string, unknown>)) {
          value = (value as Record<string, unknown>)[canonical];
          continue;
        }
      }

      if (part in (value as Record<string, unknown>)) {
        value = (value as Record<string, unknown>)[part];
      } else {
        console.warn(`⚠️  Template path not found: ${normalizedPath}`);
        return templatePath;
      }
    }

    return typeof value === "string" ? value : templatePath;
  }

  private findCanonicalAgentKey(alias: string): string | undefined {
    if (this.agentDefinitions[alias]) {
      return alias;
    }

    for (const [canonical, aliases] of Object.entries(
      TemplateProcessor.AGENT_ALIASES
    )) {
      if (aliases.includes(alias)) return canonical;
    }

    return undefined;
  }

  private withAliasDefinitions(
    definitions: Record<string, AgentTemplateDefinition>
  ): Record<string, AgentTemplateDefinition> {
    const augmented: Record<string, AgentTemplateDefinition> = {
      ...definitions,
    };

    for (const [canonical, aliases] of Object.entries(
      TemplateProcessor.AGENT_ALIASES
    )) {
      const definition = definitions[canonical];
      if (!definition) continue;
      for (const alias of aliases) {
        augmented[alias] = definition;
      }
    }

    return augmented;
  }

  private static async loadConfig(configPath: string): Promise<TemplateConfig> {
    const configContent = await fs.promises.readFile(
      path.resolve(configPath),
      "utf-8"
    );
    return JSON.parse(configContent) as TemplateConfig;
  }

  private static async loadAgentDefinitions(
    config: TemplateConfig,
    configPath: string
  ): Promise<Record<string, AgentTemplateDefinition>> {
    if (config.agents?.definitions) {
      return config.agents.definitions;
    }

    const configurationSource =
      config.agents?.configurationSource ||
      "src/mcp/config/unifiedAgentConfig.ts";
    if (!configurationSource) {
      console.warn(
        "⚠️  No configurationSource provided; agent definitions unavailable."
      );
      return {};
    }

    const absoluteConfigPath = path.resolve(configPath);
    const candidateSources = [
      path.resolve(configurationSource),
      path.resolve(path.dirname(absoluteConfigPath), configurationSource),
    ];

    const resolvedSource = candidateSources.find((candidate) =>
      fs.existsSync(candidate)
    );

    if (!resolvedSource) {
      console.warn(
        `⚠️  Configuration source ${configurationSource} could not be resolved.`
      );
      return {};
    }

    try {
      const moduleUrl = pathToFileURL(resolvedSource).href;
      const importedModule = await import(moduleUrl);
      const agentConfigurations:
        | Record<string, UnifiedAgentConfigLike>
        | undefined =
        importedModule.agentConfigurations ??
        importedModule.default?.agentConfigurations;

      if (!agentConfigurations) {
        console.warn(
          `⚠️  Unable to locate agentConfigurations export in ${configurationSource}`
        );
        return {};
      }

      const definitions: Record<string, AgentTemplateDefinition> = {};
      for (const [agentKey, configEntry] of Object.entries(
        agentConfigurations
      )) {
        if (!configEntry || typeof configEntry !== "object") continue;
        const metadata = (configEntry as UnifiedAgentConfigLike).metadata;
        if (!metadata) continue;

        definitions[agentKey] = {
          name: metadata.name ?? agentKey,
          label: metadata.label ?? metadata.name ?? agentKey,
          displayName:
            metadata.displayName ?? metadata.label ?? metadata.name ?? agentKey,
          className: metadata.className ?? agentKey,
          capabilities: metadata.capabilities ?? [],
          responsibility: metadata.responsibility ?? "",
          description:
            metadata.responsibility ??
            metadata.userFacing?.friendlyDescription ??
            metadata.applicationFacing?.technicalDescription ??
            metadata.userFacing?.helpText ??
            metadata.className ??
            agentKey,
        };
      }

      return definitions;
    } catch (error) {
      console.error(
        `❌ Failed to load agent definitions from ${configurationSource}:`,
        error
      );
      return {};
    }
  }

  validateConfig(): boolean {
    const canonicalAgents = [
      "orchestrator",
      "relevant-data-manager",
      "database-agent",
      "data-agent",
      "clarification-agent",
    ];

    if (Object.keys(this.agentDefinitions).length === 0) {
      console.error(
        "❌ No agent definitions available for template processing."
      );
      return false;
    }

    for (const agent of canonicalAgents) {
      const definition = this.agentDefinitions[agent];
      if (!definition) {
        console.error(`❌ Missing agent definition: ${agent}`);
        return false;
      }

      const requiredFields = [
        "name",
        "description",
        "label",
        "displayName",
        "className",
      ] as const;

      for (const field of requiredFields) {
        if (!definition[field]) {
          console.error(
            `❌ Missing field '${field}' in agent definition: ${agent}`
          );
          return false;
        }
      }
    }

    console.log("✅ Template configuration is valid");
    return true;
  }

  generateTemplateReport(): string {
    const lines: string[] = [];
    lines.push(
      "# Template Variables Report",
      "",
      "## Agent Definitions",
      "",
      "| Agent | Label | Display Name | Description |",
      "|-------|-------|--------------|-------------|"
    );

    for (const [key, definition] of Object.entries(this.agentDefinitions)) {
      lines.push(
        `| ${key} | ${definition.label} | ${definition.displayName} | ${definition.description} |`
      );
    }

    lines.push(
      "",
      "## Template Replacements",
      "",
      "| Placeholder | Resolves To | Current Value |",
      "|-------------|-------------|---------------|"
    );

    const replacements = this.config.agents?.templateReplacements || {};
    for (const [placeholder, templatePath] of Object.entries(replacements)) {
      const resolvedValue = this.resolveTemplateValue(templatePath);
      lines.push(
        `| \`${placeholder}\` | \`${templatePath}\` | ${resolvedValue} |`
      );
    }

    return lines.join("\n");
  }
}

async function main(): Promise<void> {
  const processor = await TemplateProcessor.create();
  if (!processor.validateConfig()) process.exit(1);
  await processor.processTemplates();
  const report = processor.generateTemplateReport();
  await fs.promises.writeFile("docs/template-variables.md", report, "utf-8");
  console.log(
    "📊 Generated template variables report: docs/template-variables.md"
  );
}

main().catch((error) => {
  console.error("Failed to process templates:", error);
  process.exit(1);
});
