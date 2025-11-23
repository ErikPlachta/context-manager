# Context Manager - MCP Server using STDIO for VS Code Extension

I need your help creating an MCP Server using STDIO as the communication protocol within a VS Code Extension. I'll be providing you resources below for context on the plan, along with additional resources to help you understand my vision.

## Request

1. Considering the context of this article, [Code execution with MCP: building more efficient AI agents \ Anthropic](https://www.anthropic.com/engineering/code-execution-with-mcp). (Creating a plan for a VS Code Extension that is a MCP Server using STDIO. `tool` driven design that only exposes need-to-know resources and tools to `Agent`, allowing more actionable and concise context to improve user experience.)
2. Review [PLAN_0.0.1](#plan-001) for context on my vision. It includes a detailed plan for the MCP Server starting point.
3. Create a detailed implementation plan for building the MCP Server using STDIO for the VS Code Extension based on the provided context and my vision in PLAN_0.0.1.md.

## PLAN 0.0.1

I need your help building out custom MCP solution. Review the below, and help me create a phased plan to build this out fully.

### Goal

Build a `Skill` driven design that only exposes need-to-know resources and tools to `Agent`, allowing more actionable and concise context to improve user experience. At it's core, the MCP Server is designed to take advantage of `User-Context` and provide solutions. Data driven design. Modular. Scalable. Extensible.

### Features

- `src`
  - **Overview**
    - contains all VSCode Extension, MCP Server, Client logic, and shared resources.
    - All files have a `.test.ts` version next to it to ensure complete coverage.
  - **Content**:
    - `src/vs-code-extension`
      - **Overview**
        - VS Code Extension entry point and lifecycle management
        - Handles activation, deactivation, and works with `utils/vs-code`.
        - Used to register `@` commands, settings, and other extension-specific features. (Right now, it's limited to registering server. In the future, we may want UIs to work with different tools and features accordingly)
    - `src/client`
      - **Overview**
        - MCP Client that communicates with the MCP Server via STDIO.
        - Responsible for sending requests from VS Code Extension to MCP Server and receiving responses.
      - **Content**:
        - `index.ts`
          - **Overview**
            - client side `Orchestrator`
            - Manages communication with the MCP Server.
            - Works directly with server's
    - `src/server`
      - `index.ts`
        - **Overview**
          - server side `Orchestrator`
          - Entry point for the VS Code Extension.
          - Initializes MCP Server and manages lifecycle events.
          - The core component of the MCP Server that manages `Skills` and coordinates their interactions with the `Agent`.
          - Responsible for routing requests from the `Agent` to the appropriate `Skill` based on the task at hand.
          - Manages the overall workflow and ensures that `Skills` work together effectively to deliver solutions.
        - **Responsibilities**:
          - Load and initialize `Skills` based on configuration.
          - Route requests from the `Agent` to the appropriate `Skill`.
          - Coordinate multi-step workflows that may involve multiple `Skills`.
          - Handle errors and exceptions, ensuring robust communication with the `Agent`.
        - **Key Methods**:
          - `handleRequest(request: AgentRequest): Promise<AgentResponse>`: Main entry point for handling requests from the `Agent`.
          - `registerSkill(skill: Skill): void`: Registers a new `Skill` with the `Orchestrator`.
          - `unregisterSkill(skillId: string): void`: Unregisters a `Skill` from the `Orchestrator`.
      - `utils/`
        - **Overview**
          - Server side specific utilities
        - **Content**
          - `auth`
            - For working with `../../shared/auth-utils` and server-side auth needs.
      - `skills/`
        - **Overview**
          - A collection of unique capabilities or functionalities that the `Agent` can leverage through the `Orchestrator`
          - Each `Skill` encapsulates specific functionality and exposes only necessary methods to the `Orchestrator` to be used by the agent.
          - `Skills` can be dynamically loaded/unloaded based on the `Agent`'s needs
          - `Skills` behave as microservices, communicating with the `Orchestrator` via defined interfaces
          - `Skills` are a black box, and do not interact with each other directly. All communication is routed through the `Orchestrator`.
          - See `_EXAMPLES\erik-example-json-rpc\src\agent` folder where I've created some example `Skills` to demonstrate how they can be structured and used. (Note that this is a rough draft and not complete, just use it for concepts and ideas)
        - **Content**
          - `mcp-governance`:
            - **Overview**
              - Essentially copying what's happening right now within the `.github` and `scripts\context-manager.ts` folders.
              - Manages governance files like `TODO.md`, `CONTEXT-SESSION.md`, and `CHANGELOG.md` using shared helpers and config.
              - Manages session-specific context and data for the `Agent`.
    - `src/shared/`
      - **Overview**
        - A set of private utilities and helper functions that support the `Orchestrator` and `Skills`.
        - `Tools` will be a collection of custom and third-party solutions that can be used by this MCP Server.
        - `Tools` can be used by both `Skills` and the `Orchestrator` to perform common tasks.
        - `Tools` are designed to be reusable and modular, allowing for easy integration into different parts of the MCP Server architecture.
        - auth, config, logging, error handling, common data models, stdio, metadata, validation, transport, etc.
      - **Content**:
        - **auth-utils**: shared helper functions used by server and client
        - **workload-manager**: Manages and prioritizes tasks to src, ensuring efficient handling of requests.
        - **sequential-thinking**: Uses `@modelcontextprotocol/server-sequential-thinking` to enable `Skills` and `Orchestrator` to perform step-by-step reasoning and problem-solving.
        - **server-memory**: Uses `@modelcontextprotocol/server-memory` to provide persistent and context-aware memory capabilities for `Skills` and `Orchestrator`.
        - **file-system-tool**: Provides file system access and operations, allowing `Skills` to read and write files as needed.
        - **vercel-ai-sdk**: Wrapper around `ai-sdk` (https://github.com/vercel/ai), that can be used to identify the model making the request and provide consistent and easy-to-digest responses. (For example, should have accces to `@ai-sdk/anthropic`, `@ai-sdk/google`, and `@ai-sdk/openai`, and be able to switch between them based on the `Agent`'s needs.)
        - **vs-code**: Facilitates communication with the VS Code, including the Chat API, enabling `Skills` to take advantage of specific features based on skill needs. (Using built-in features to take advantage of the extension if it's being used)
        - etc.
    - `src/types/`
      - Shared types and interfaces for MCP Server, Orchestrator, Skills, and Tools.
      - Keep types organized and modular for easy maintenance and scalability.
      - On build time will compile into single.
      - Strongly documented like this example: `.\_EXAMPLES\typescript-sd-main\src\types.ts`
    - `src/user-context`
      - **Overview**
        - Provides user-specific context and preferences solutions.
        - This is a CORE feature for MCP Servers to deliver personalized experiences.
        - Being able to customize the context should modify the way different features can be used within the ap.
        - Review `_EXAMPLES\erik-example-json-rpc\src\userContext` for examples of the configuration structure.
        - Review `_EXAMPLES\erik-example-json-rpc\src\agent\userContextAgent` for examples of how a `skill` I've created can use the user context data.
      - **Content**
        - Functions to retrieve and manage user context data.
        - Modify existing context.
        - Make connections between existing context by establishing.
        - Ability to load defaults
        - Validate context relationships, content, etc.

### Framework

Packages should include but not be limited to:

- `Typescript`
- `Zod` for schemas
- `Evalite` for testing (https://www.npmjs.com/package/evalite)
- `Vitest` for TypeScript testing (https://github.com/vitest-dev/vitest)
- `pnpm` for package management
- `@modelcontextprotocol/inspector` for MCP Testing (https://modelcontextprotocol.io/docs/tools/inspector)
- `@ai-sdk/anthropic`, `@ai-sdk/google`, and `@ai-sdk/openai`. (Plus any more we may need for AI model interactions via Vercel's AI-SDK)

### Concerns

- As a note, I am concerned about using `@modelcontextprotocol/sdk` directly because it will affect the depth of my education.
  - `@modelcontextprotocol/sdk` (modelcontextprotocol/typescript-sdk: The official TypeScript SDK for Model Context Protocol servers and clients)
- I'd rather build a solution based around it's design, and use it as a reference. ( ex: reviewing `\` to understand design and then refactoring to fit my needs.)
