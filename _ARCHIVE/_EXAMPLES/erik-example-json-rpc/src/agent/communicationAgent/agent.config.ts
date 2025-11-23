/**
 * @packageDocumentation Communication Agent Configuration
 *
 * Defines all settings for the communication agent, which handles unified response
 * formatting across all agents. This agent transforms structured data from specialized
 * agents into consistent, user-friendly messages with proper error handling, progress
 * tracking, and tone management.
 */

import type { AgentConfigDefinition } from "@internal-types/agentConfig";
import { CONFIG_IDS } from "@internal-types/configRegistry";

/**
 * Complete configuration for the Communication Agent
 *
 * The communication agent specializes in formatting responses from all other agents
 * into consistent, user-friendly messages. It handles success messages, error reporting,
 * progress updates, and maintains consistent tone and style across all interactions.
 */
export const communicationAgentConfig: AgentConfigDefinition = {
  /**
   * Unique configuration schema identifier from central registry
   */
  $configId: CONFIG_IDS.COMMUNICATION_AGENT,

  /**
   * Basic agent identity and metadata
   */
  agent: {
    /** Unique agent identifier used in routing and logging */
    id: "communication-agent",

    /** Human-readable name displayed in UI */
    name: "Communication Agent",

    /** Semantic version for tracking configuration changes */
    version: "1.0.0",

    /** Comprehensive description of agent purpose and capabilities */
    description:
      "Formats agent responses into consistent, user-friendly messages with proper error handling and progress tracking",
  },

  /**
   * Communication agent-specific configuration section
   */
  communication: {
    /**
     * Response formatting settings
     */
    formatting: {
      /** Default output format for responses */
      defaultFormat: "markdown" as "markdown" | "plaintext" | "html",

      /** Tone for success messages */
      tone: {
        success: "friendly",
        error: "helpful",
        progress: "informative",
        validation: "constructive",
      },

      /** Verbosity level for responses */
      verbosity: "balanced" as "minimal" | "balanced" | "detailed",

      /** Maximum length for response messages */
      maxMessageLength: 1000,

      /** Whether to include emoji in formatted responses */
      includeEmoji: false,

      /** Whether to include section headers in formatted output */
      includeSectionHeaders: true,

      /** Whether to format lists with bullet points */
      formatLists: true,

      /** Whether to highlight key information (bold, italic) */
      highlightKeyInfo: true,
    },

    /**
     * Success display options
     */
    successDisplay: {
      /** Disabled by default to avoid unsolicited noise */
      includeAvailableCategories: false,
      /** Reasonable default cap */
      maxCategoriesInSuccess: 6,
      /** Optional: fallback header if clarification header not set */
      availableCategoriesHeader: "Available Categories:",
    },

    /**
     * Success message templates
     */
    successTemplates: {
      /** Template for data retrieval success */
      dataRetrieved:
        "Successfully retrieved {{count}} {{entityType}}{{#if filters}} matching your criteria{{/if}}.",

      /** Template for data analysis success */
      analysisComplete:
        "Analysis complete. {{summary}}{{#if recommendations}} See recommendations below.{{/if}}",

      /** Template for metadata retrieval */
      metadataRetrieved:
        "Found {{count}} categories{{#if details}} with detailed schema information{{/if}}.",

      /** Template for export operations */
      exportComplete:
        "Successfully exported {{count}} {{entityType}} to {{destination}}.",

      /** Template for import operations */
      importComplete:
        "Successfully imported {{count}} {{entityType}} from {{source}}.",

      /** Template for validation success */
      validationPassed:
        "Validation complete. All {{count}} {{entityType}} conform to schema requirements.",
    },

    /**
     * Error message configuration
     */
    errorHandling: {
      /** Whether to include stack traces in error messages (development only) */
      includeStackTrace: false,

      /** Whether to include error codes in messages */
      includeErrorCodes: true,

      /** Whether to suggest recovery actions for common errors */
      suggestRecoveryActions: true,

      /** Maximum number of recovery suggestions to provide */
      maxRecoverySuggestions: 3,

      /** Error message templates by category */
      errorTemplates: {
        /** Data not found errors */
        notFound:
          "Could not find {{entityType}}{{#if identifier}} '{{identifier}}'{{/if}}.{{#if suggestion}} {{suggestion}}{{/if}}",

        /** Validation errors */
        validationFailed:
          "Validation failed for {{entityType}}.{{#if errorCount}} Found {{errorCount}} issue(s).{{/if}}{{#if details}} {{details}}{{/if}}",

        /** Permission errors */
        permissionDenied:
          "You don't have permission to {{action}} {{entityType}}.{{#if suggestion}} {{suggestion}}{{/if}}",

        /** Configuration errors */
        configurationError:
          "Configuration error: {{message}}{{#if suggestion}} {{suggestion}}{{/if}}",

        /** Network/external errors */
        externalError:
          "Unable to complete request due to external error.{{#if retryable}} Please try again.{{/if}}",

        /** Unexpected errors */
        unexpected:
          "An unexpected error occurred.{{#if contactSupport}} Please contact support if this persists.{{/if}}",
      },

      /** Common recovery actions by error type */
      recoveryActions: {
        notFound: [
          "Check spelling and try again",
          "Use search to find similar items",
          "View available categories with metadata command",
        ],
        validationFailed: [
          "Review validation errors above",
          "Check field requirements in schema",
          "Use examples as reference",
        ],
        permissionDenied: [
          "Contact administrator for access",
          "Check your role permissions",
          "Try a different operation",
        ],
        configurationError: [
          "Review configuration documentation",
          "Check for typos in settings",
          "Reset to defaults if needed",
        ],
      },
    },

    /**
     * Progress tracking configuration
     */
    progressTracking: {
      /** Whether to show progress for long-running operations */
      enabled: true,

      /** Minimum operation duration (ms) before showing progress */
      minimumDuration: 1000,

      /** Whether to show percentage complete */
      showPercentage: true,

      /** Whether to show elapsed time */
      showElapsedTime: false,

      /** Whether to show estimated time remaining */
      showEstimatedTimeRemaining: false,

      /** Update interval for progress messages (ms) */
      updateInterval: 500,

      /** Progress message templates */
      progressTemplates: {
        /** Template for initial progress message */
        started: "{{operation}} in progress...",

        /** Template for progress updates */
        inProgress:
          "{{operation}}{{#if percentage}} ({{percentage}}% complete){{/if}}...",

        /** Template for completion */
        completed:
          "{{operation}} complete{{#if duration}} in {{duration}}{{/if}}.",
      },
    },

    /**
     * Validation result formatting
     */
    validation: {
      /** Whether to group validation errors by category */
      groupByCategory: true,

      /** Maximum number of validation errors to show per entity */
      maxErrorsPerEntity: 5,

      /** Whether to show field paths in validation errors */
      showFieldPaths: true,

      /** Whether to include expected vs actual values */
      showExpectedActual: true,

      /** Validation summary template */
      summaryTemplate:
        "Validation summary: {{passedCount}} passed, {{failedCount}} failed{{#if skippedCount}}, {{skippedCount}} skipped{{/if}}.",
    },

    /**
     * Clarification message configuration (data-driven, no hardcoded business values)
     */
    clarification: {
      /** Maximum number of categories to include when generating examples */
      maxCategoriesInExamples: 4,

      /** Heading shown before example prompts */
      examplesHeader: "Here are some examples of what you can ask me:",

      /** Heading shown before the category list */
      availableCategoriesHeader: "Available Categories:",

      /** Closing guidance after examples */
      closingPrompt:
        "Please provide more specific details about what you'd like to know!",

      /** Template for the opening sentence when the request is unclear */
      unknownRequestTemplate:
        "I'm not sure what you're looking for with \"{{question}}\".",

      /** Optional note when a likely intent was detected */
      matchedIntentTemplate:
        "Your question seems related to {{intent}}, but needs more specific details.",

      /** Example groups and sample templates. When usesCategories=true, {{category}} is substituted. */
      groups: [
        {
          title: "**Category Information**",
          usesCategories: true,
          sampleTemplates: [
            "What's in the {{category}} category?",
            "Describe the {{category}} data model",
          ],
        },
        {
          title: "**Query Records**",
          usesCategories: true,
          sampleTemplates: [
            "List recent items in {{category}}",
            "Find items matching specific keywords in {{category}}",
          ],
        },
        {
          title: "**Data Analysis**",
          usesCategories: false,
          sampleTemplates: [
            "What insights can you provide for my dataset?",
            "Analyze trends across categories",
            "Show connections between related entities",
          ],
        },
      ],
    },
  },
};
