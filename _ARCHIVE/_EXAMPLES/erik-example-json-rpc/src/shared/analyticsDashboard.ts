/**
 * @packageDocumentation Analytics dashboard utilities for generating usage reports and visualizations.
 */

import type { UsageAnalyticsSummary } from "@shared/agentAnalytics";

/**
 * Dashboard report section enumeration.
 */
export enum ReportSection {
  OVERVIEW = "overview",
  AGENT_PERFORMANCE = "agent_performance",
  ERROR_ANALYSIS = "error_analysis",
  TRENDS = "trends",
}

/**
 * Report generation options.
 *
 */
export interface ReportOptions {
  /** Sections to include in the report. */
  sections: ReportSection[];
  /** Include detailed statistics. */
  includeDetails: boolean;
  /** Format for the report output. */
  format: "markdown" | "json" | "csv";
  /** Time period for the report. */
  period: {
    start: Date;
    end: Date;
  };
}

/**
 * Analytics dashboard for generating usage reports and insights.
 */
export class AnalyticsDashboard {
  /**
   * Generates a comprehensive analytics report.
   *
   * @param {UsageAnalyticsSummary} summary - Aggregated usage analytics summary.
   * @param {ReportOptions} _options - Report generation options (format & sections).
   * @returns {string} Report content rendered in the requested format.
   * @throws {Error} If an unsupported format is requested.
   */
  generateReport(
    summary: UsageAnalyticsSummary,
    _options: ReportOptions
  ): string {
    switch (_options.format) {
      case "markdown":
        return this.generateMarkdownReport(summary, _options);
      case "json":
        return this.generateJsonReport(summary, _options);
      case "csv":
        return this.generateCsvReport(summary, _options);
      default:
        throw new Error(`Unsupported report format: ${_options.format}`);
    }
  }

  /**
   * Generates performance recommendations based on analytics data.
   *
   * @param {UsageAnalyticsSummary} summary - summary parameter.
   * @returns {string[]} - TODO: describe return value.
   */
  generateRecommendations(summary: UsageAnalyticsSummary): string[] {
    const recommendations: string[] = [];

    // Overall success rate recommendations
    if (summary.overallSuccessRate < 95) {
      recommendations.push(
        `Overall success rate is ${summary.overallSuccessRate.toFixed(
          1
        )}%. Consider investigating error patterns and implementing retry mechanisms.`
      );
    }

    // Performance recommendations
    if (summary.averageResponseTime > 5000) {
      recommendations.push(
        `Average response time is ${summary.averageResponseTime.toFixed(
          0
        )}ms. Consider optimizing agent operations or implementing caching.`
      );
    }

    // Agent-specific recommendations
    for (const agentStats of summary.agentStats) {
      if (agentStats.successRate < 90) {
        recommendations.push(
          `Agent '${
            agentStats.agentName
          }' has a low success rate of ${agentStats.successRate.toFixed(
            1
          )}%. Review error handling and input validation.`
        );
      }

      if (agentStats.averageExecutionTime > 10000) {
        recommendations.push(
          `Agent '${
            agentStats.agentName
          }' has high average execution time (${agentStats.averageExecutionTime.toFixed(
            0
          )}ms). Consider performance optimization.`
        );
      }

      if (agentStats.totalInvocations === 0) {
        recommendations.push(
          `Agent '${agentStats.agentName}' has no recorded invocations. Verify if this agent is needed or properly integrated.`
        );
      }
    }

    // Usage distribution recommendations
    const totalInvocations = summary.agentStats.reduce(
      (sum, agent) => sum + agent.totalInvocations,
      0
    );
    const underutilizedAgents = summary.agentStats.filter(
      (agent) =>
        agent.totalInvocations < totalInvocations * 0.05 &&
        agent.totalInvocations > 0
    );

    if (underutilizedAgents.length > 0) {
      recommendations.push(
        `The following agents are underutilized: ${underutilizedAgents
          .map((a) => a.agentName)
          .join(
            ", "
          )}. Consider reviewing their purpose or improving discoverability.`
      );
    }

    return recommendations;
  }

  /**
   * Generates a Markdown format report.
   *
   * @param {UsageAnalyticsSummary} summary - summary parameter.
   * @param {ReportOptions} options - options parameter.
   * @returns {string} - TODO: describe return value.
   */
  private generateMarkdownReport(
    summary: UsageAnalyticsSummary,
    options: ReportOptions
  ): string {
    const lines: string[] = [];

    // Header
    lines.push("# Agent Usage Analytics Report");
    lines.push("");
    lines.push(`**Generated:** ${summary.timestamp.toISOString()}`);
    lines.push(
      `**Period:** ${options.period.start.toISOString()} to ${options.period.end.toISOString()}`
    );
    lines.push(`**Total Events:** ${summary.totalEvents.toLocaleString()}`);
    lines.push("");

    // Overview section
    if (options.sections.includes(ReportSection.OVERVIEW)) {
      lines.push("## Overview");
      lines.push("");
      lines.push(
        `- **Overall Success Rate:** ${summary.overallSuccessRate.toFixed(1)}%`
      );
      lines.push(
        `- **Average Response Time:** ${summary.averageResponseTime.toFixed(
          0
        )}ms`
      );
      lines.push(`- **Most Used Agent:** ${summary.mostUsedAgent}`);
      lines.push(
        `- **Highest Error Rate Agent:** ${summary.highestErrorRateAgent}`
      );
      lines.push("");
    }

    // Agent performance section
    if (options.sections.includes(ReportSection.AGENT_PERFORMANCE)) {
      lines.push("## Agent Performance");
      lines.push("");

      if (summary.agentStats.length > 0) {
        lines.push(
          "| Agent | Invocations | Success Rate | Avg Time (ms) | Most Used Method |"
        );
        lines.push(
          "|-------|-------------|--------------|---------------|------------------|"
        );

        for (const agent of summary.agentStats) {
          lines.push(
            `| ${
              agent.agentName
            } | ${agent.totalInvocations.toLocaleString()} | ${agent.successRate.toFixed(
              1
            )}% | ${agent.averageExecutionTime.toFixed(0)} | ${
              agent.mostUsedMethod
            } |`
          );
        }
      } else {
        lines.push("*No agent performance data available.*");
      }
      lines.push("");
    }

    // Error analysis section
    if (options.sections.includes(ReportSection.ERROR_ANALYSIS)) {
      lines.push("## Error Analysis");
      lines.push("");

      const errorAgents = summary.agentStats.filter(
        (agent) => agent.failedInvocations > 0
      );

      if (errorAgents.length > 0) {
        lines.push("| Agent | Failed Invocations | Error Rate |");
        lines.push("|-------|-------------------|------------|");

        for (const agent of errorAgents) {
          const errorRate =
            (agent.failedInvocations / agent.totalInvocations) * 100;
          lines.push(
            `| ${
              agent.agentName
            } | ${agent.failedInvocations.toLocaleString()} | ${errorRate.toFixed(
              1
            )}% |`
          );
        }
      } else {
        lines.push("*No errors detected during the analysis period.*");
      }
      lines.push("");
    }

    // Recommendations
    const recommendations = this.generateRecommendations(summary);
    if (recommendations.length > 0) {
      lines.push("## Recommendations");
      lines.push("");
      for (const recommendation of recommendations) {
        lines.push(`- ${recommendation}`);
      }
      lines.push("");
    }

    return lines.join("\n");
  }

  /**
   * Generates a JSON format report.
   *
   * @param {UsageAnalyticsSummary} summary - Aggregated usage analytics summary.
   * @param {ReportOptions} options - Report generation options (sections/time period).
   * @returns {string} JSON string representing the report.
   */
  private generateJsonReport(
    summary: UsageAnalyticsSummary,
    options: ReportOptions
  ): string {
    const report = {
      metadata: {
        generatedAt: summary.timestamp.toISOString(),
        period: {
          start: options.period.start.toISOString(),
          end: options.period.end.toISOString(),
        },
        totalEvents: summary.totalEvents,
        sections: options.sections,
      },
      summary: {
        overallSuccessRate: summary.overallSuccessRate,
        averageResponseTime: summary.averageResponseTime,
        mostUsedAgent: summary.mostUsedAgent,
        highestErrorRateAgent: summary.highestErrorRateAgent,
      },
      agentStats: summary.agentStats,
      recommendations: this.generateRecommendations(summary),
    };

    return JSON.stringify(report, null, 2);
  }

  /**
   * Generates a CSV format report.
   *
   * @param {UsageAnalyticsSummary} summary - Aggregated usage analytics summary.
   * @param {ReportOptions} _options - Report generation options (time period only; sections ignored for CSV).
   * @returns {string} CSV output with agent usage statistics.
   */
  private generateCsvReport(
    summary: UsageAnalyticsSummary,
    _options: ReportOptions
  ): string {
    const lines: string[] = [];

    // Header
    lines.push(
      "Agent,Total Invocations,Successful,Failed,Success Rate %,Avg Execution Time (ms),Min Time,Max Time,Most Used Method,Last Invocation"
    );

    // Data rows
    for (const agent of summary.agentStats) {
      lines.push(
        [
          agent.agentName,
          agent.totalInvocations,
          agent.successfulInvocations,
          agent.failedInvocations,
          agent.successRate.toFixed(1),
          agent.averageExecutionTime.toFixed(0),
          agent.minExecutionTime,
          agent.maxExecutionTime,
          agent.mostUsedMethod,
          agent.lastInvocation.toISOString(),
        ].join(",")
      );
    }

    return lines.join("\n");
  }
}

/**
 * Create a standard markdown analytics report for a given date range.
 *
 * @param {UsageAnalyticsSummary} summary - Aggregated usage analytics summary.
 * @param {Date} startDate - Start of reporting period.
 * @param {Date} endDate - End of reporting period.
 * @returns {string} Markdown report string.
 */
export function createStandardReport(
  summary: UsageAnalyticsSummary,
  startDate: Date,
  endDate: Date
): string {
  const dashboard = new AnalyticsDashboard();

  const options: ReportOptions = {
    sections: [
      ReportSection.OVERVIEW,
      ReportSection.AGENT_PERFORMANCE,
      ReportSection.ERROR_ANALYSIS,
    ],
    includeDetails: true,
    format: "markdown",
    period: {
      start: startDate,
      end: endDate,
    },
  };

  return dashboard.generateReport(summary, options);
}
