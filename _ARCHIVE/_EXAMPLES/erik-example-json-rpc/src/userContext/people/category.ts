/**
 * @packageDocumentation People category configuration
 *
 * Employee directory complete with capabilities and system access.
 */
import type { CategoryId } from "@internal-types/agentConfig";

/**
 * Category orchestration configuration for agents
 */
interface CategoryOrchestrationConfig {
  summary: string;
  signals: string[];
  escalateWhen: string[];
  agents: {
    [agentName: string]: {
      focus: string;
      signals: string[];
      promptStarters: string[];
    };
  };
}

/**
 * Category requirements and constraints
 */
interface CategoryRequirements {
  requiredRecordFields: string[];
  requiredRelationshipFields: string[];
  notes: string[];
}

/**
 * Category configuration (JSON-serializable subset of BusinessCategory)
 */
interface CategoryConfig {
  id: CategoryId;
  name: string;
  description: string;
  aliases: string[];
  config: {
    purpose: string;
    primaryKeys: string[];
    updateCadence: string;
    access: string;
    requirements?: CategoryRequirements;
    orchestration: CategoryOrchestrationConfig;
  };
}

/**
 * People category configuration
 * Employee directory complete with capabilities and system access.
 */
export const peopleCategory: CategoryConfig = {
  id: "people",
  name: "People",
  description:
    "Employee directory complete with capabilities and system access.",
  aliases: ["employees", "teammates", "staff"],
  config: {
    purpose: "Surface who can help, their skills, and reporting structure.",
    primaryKeys: ["id", "email"],
    updateCadence: "Nightly sync from HRIS with manual enrichment allowed.",
    access: "All employees can view contact and role data.",
    requirements: {
      requiredRecordFields: ["id", "name", "departmentId", "skills"],
      requiredRelationshipFields: [
        "departmentId",
        "applicationIds",
        "policyAcks",
        "resourceIds",
      ],
      notes: [
        "<People> must link to a department and at least one policy acknowledgement.",
      ],
    },
    orchestration: {
      summary:
        "<People> data links employees to their departments, skills, and system responsibilities.",
      signals: [
        "Requests mention individuals, roles, capabilities, or contact information.",
        "The user needs to know who supports an application, resource, or policy.",
        "The task involves matching skills to departments or initiatives.",
      ],
      escalateWhen: [
        "A person or role is referenced that does not exist in the directory records.",
        "The user requests private HR data such as compensation or performance history.",
      ],
      agents: {
        relevantDataManager: {
          focus:
            "Explain required profile metadata, acknowledgements, and access relationships for people records.",
          signals: [
            "We must capture mandatory fields before adding or updating a person entry.",
            "The orchestrator needs to understand how people link to policies, applications, or resources prior to querying.",
            "The workflow involves reviewing schemas, examples, or the folder layout for people data.",
          ],
          promptStarters: [
            "Relevant data manager, list the required metadata and relationship fields for a people record.",
            "Relevant data manager, outline the policies and applications acknowledged by `<person>`.",
            "Relevant data manager, show the folder blueprint for the people dataset.",
          ],
        },
        databaseAgent: {
          focus:
            "Query employees by skills, access, acknowledgements, or departmental alignment.",
          signals: [
            "We are filtering for staff who can support a system based on skills or access.",
            "Compliance teams need to verify who acknowledged specific policies.",
            "We must identify point people for a department or initiative.",
          ],
          promptStarters: [
            "Database agent, list people with `<skill>` who support `<application>`.",
            "Database agent, show staff who acknowledged `<policy>` along with their departments.",
            "Database agent, retrieve contact details for the people assigned to `<resource>`.",
          ],
        },
        dataAgent: {
          focus:
            "Create staffing narratives, onboarding briefs, and coverage analyses based on people data.",
          signals: [
            "Leaders need a skills summary for a department or project team.",
            "The orchestrator is planning rotations or incident coverage that combine people and system data.",
            "A new hire needs an introduction to the experts supporting an initiative.",
          ],
          promptStarters: [
            "Data agent, summarize the skills coverage for `<department>` and highlight gaps.",
            "Data agent, draft an introduction to the team supporting `<application>`.",
            "Data agent, recommend staffing for `<initiative>` based on people and department data.",
          ],
        },
      },
    },
  },
};
