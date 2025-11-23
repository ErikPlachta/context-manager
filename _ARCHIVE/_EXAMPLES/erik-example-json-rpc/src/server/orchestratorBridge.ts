/**
 * @packageDocumentation Orchestrator bridge for MCP tool calls.
 *
 * Coordinates Orchestrator and agents for the MCP server. Resolves categories
 * via UserContextAgent, runs queries via DatabaseAgent, and delegates
 * user-facing formatting to CommunicationAgent to keep the server thin.
 */
// Use dynamic imports inside createAgents to avoid extension-only dependencies at module load time
import * as os from "os";
import * as path from "path";

async function resolveCacheDirectory(): Promise<string> {
  try {
    const mod = (await import("@extension/mcpCache")) as unknown as {
      ensureCacheDirectory: () => string;
    };
    return mod.ensureCacheDirectory();
  } catch {
    // Fallback for non-extension environments (e.g., Node harness): hidden cache dir under home
    const home = os.homedir();
    const dir = path.join(home, ".usercontext-mcp-extension", "cache");
    return dir;
  }
}

/** Result returned to the MCP server after CommunicationAgent formatting. */
export interface BridgeResult {
  message: string;
}

interface CategorySummary {
  id: string;
  name: string;
}

interface CategoryInfo {
  id: string;
  name: string;
  description?: string;
  config?: { relationships?: unknown[] };
  schemas?: unknown;
  examples?: unknown;
  queries?: unknown;
  records?: unknown;
}

/**
 * Create core agent instances used to fulfill MCP tool requests.
 *
 * Returns orchestrator (coordination), userContext (category metadata/content),
 * and database (record queries). Cache directory derives from extension utilities.
 */
/**
 * Create fully initialized agent instances used for bridge operations.
 * Exported for server dynamic tool registry assembly to avoid duplicating
 * agent instantiation logic in transport layer.
 *
 * @returns Initialized orchestrator, userContext, and database agents.
 */
export async function createAgents(): Promise<{
  orchestrator: any;
  userContext: any;
  database: any;
}> {
  const { Orchestrator } = (await import("@agent/orchestrator")) as unknown as {
    Orchestrator: new () => any;
  };
  const { UserContextAgent } = (await import(
    "@agent/userContextAgent"
  )) as unknown as {
    UserContextAgent: new (a?: unknown, b?: string) => any;
  };
  const { DatabaseAgent } = (await import(
    "@agent/databaseAgent"
  )) as unknown as {
    DatabaseAgent: new (sources: any, cacheDir?: string) => any;
  };
  const { CommunicationAgent } = (await import(
    "@agent/communicationAgent"
  )) as unknown as {
    CommunicationAgent: new () => any;
    createErrorResponse: (msg: string, meta?: any) => any;
  };
  const orchestrator = new Orchestrator();
  const cacheDir = await resolveCacheDirectory();
  let userContext: any;
  try {
    userContext = new UserContextAgent(undefined, cacheDir);
  } catch (e) {
    throw new Error(
      `UserContextAgent initialization failed: ${
        e instanceof Error ? e.message : String(e)
      }`
    );
  }

  // Build DatabaseAgent data sources from UserContextAgent (data-driven)
  const summaries = userContext.listCategories() as CategorySummary[];
  const dataSources = summaries.map((s: CategorySummary) => {
    const c = userContext.getCategory(s.id) as CategoryInfo;
    return {
      id: c.id,
      name: c.name,
      records: c.records,
      schema: c.schemas,
      fieldAliases: {},
    };
  });
  const database = new DatabaseAgent(dataSources, cacheDir);
  return { orchestrator, userContext, database };
}

/**
 * Describe a category by id, name, or alias and return a formatted message.
 * Enumerates available categories in error metadata for clarification.
 *
 * @param topicOrId - Category identifier, name, or alias.
 * @returns A formatted message suitable for MCP tool content.
 */
export async function describeCategoryBridge(
  topicOrId: string
): Promise<BridgeResult> {
  const { orchestrator, userContext } = await createAgents();
  const { CommunicationAgent } = await import("@agent/communicationAgent");
  const comms = new CommunicationAgent();

  try {
    const category = userContext.getCategory(topicOrId);
    const payload = {
      category: {
        id: category.id,
        name: category.name,
        description: category.description,
      },
      relationships: category.config.relationships ?? [],
      schemas: category.schemas,
      examples: category.examples,
      queries: category.queries,
    };

    const response = await orchestrator.callAgentWithResponse(
      "user-context-agent",
      "describeCategory",
      async () => payload,
      { metadata: { categoryId: category.id, entityType: category.id } }
    );
    const formatted = comms.formatSuccess(response);
    const lower = formatted.message.toLowerCase();
    if (
      !lower.includes(category.id.toLowerCase()) &&
      !lower.includes(category.name.toLowerCase())
    ) {
      formatted.message = `${formatted.message}\nCategory: ${category.id} (${category.name})`;
    }
    return { message: formatted.message };
  } catch (error) {
    // Enumerate available categories for helpful guidance
    try {
      const available = (userContext.listCategories() as CategorySummary[]).map(
        (c: CategorySummary) => c.id
      );
      const err = CommunicationAgent.createErrorResponse(
        error instanceof Error ? error.message : String(error),
        {
          metadata: { availableCategories: available },
        }
      );
      const formatted = comms.formatError(err);
      return { message: formatted.message };
    } catch {
      const err = CommunicationAgent.createErrorResponse(
        error instanceof Error ? error.message : String(error)
      );
      const formatted = comms.formatError(err);
      return { message: formatted.message };
    }
  }
}

/**
 * Search records within a category resolved by id, name, or alias.
 * Returns a formatted result and includes available categories on error.
 *
 * @param topicOrId - Category identifier, name, or alias.
 * @param filters - Equality filters applied to structured fields.
 * @returns A formatted message suitable for MCP tool content.
 */
export async function searchCategoryRecordsBridge(
  topicOrId: string,
  filters: Record<string, unknown> = {}
): Promise<BridgeResult> {
  const { orchestrator, userContext, database } = await createAgents();
  const { CommunicationAgent } = await import("@agent/communicationAgent");
  const comms = new CommunicationAgent();

  try {
    const category = userContext.getCategory(topicOrId);
    const response = await orchestrator.callAgentWithResponse(
      "database-agent",
      "executeQuery",
      () => database.executeQuery(category.id, filters, {}),
      { metadata: { categoryId: category.id, entityType: category.id } }
    );
    const formatted = comms.formatSuccess(response);
    const lower = formatted.message.toLowerCase();
    if (!lower.includes(category.id.toLowerCase())) {
      formatted.message = `${formatted.message}\nCategory: ${category.id}`;
    }
    return { message: formatted.message };
  } catch (error) {
    try {
      const available = (userContext.listCategories() as CategorySummary[]).map(
        (c: CategorySummary) => c.id
      );
      const err = CommunicationAgent.createErrorResponse(
        error instanceof Error ? error.message : String(error),
        {
          metadata: { availableCategories: available },
        }
      );
      const formatted = comms.formatError(err);
      return { message: formatted.message };
    } catch {
      const err = CommunicationAgent.createErrorResponse(
        error instanceof Error ? error.message : String(error)
      );
      const formatted = comms.formatError(err);
      return { message: formatted.message };
    }
  }
}

/**
 * List available business categories (id + name) without formatting.
 * Used by server to derive dynamic tool descriptor metadata.
 *
 * @returns Array of category summary objects.
 */
export async function listCategorySummariesBridge(): Promise<
  Array<{ id: string; name: string }>
> {
  const { userContext } = await createAgents();
  return (userContext.listCategories() as CategorySummary[]).map(
    (c: CategorySummary) => ({ id: c.id, name: c.name })
  );
}
