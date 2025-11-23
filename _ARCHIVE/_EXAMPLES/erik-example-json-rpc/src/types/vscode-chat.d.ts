/**
 * @packageDocumentation vscode-chat.d declaration augmentations for VS Code chat API.
 */

import type { Disposable, MarkdownString } from "vscode";

declare module "vscode" {
  export namespace chat {
    function createChatParticipantExtensionApi(
      participantId: string
    ): ChatParticipantExtensionApi;
  }

  /**
   * Represents the API surface exposed to chat participants from VS Code.
   */
  export interface ChatParticipantExtensionApi {
    /**
     * Registers a chat command that can be invoked by users.
     *
     * @param {string} command - Command identifier.
     * @param {{ title: string; description?: string; handler: () => MarkdownString | string | Promise<MarkdownString | string | void> | void }} options - Command metadata and handler.
     * @returns {Disposable} - Disposable to unregister the command.
     */
    registerChatCommand(
      command: string,
      options: {
        title: string;
        description?: string;
        handler: () =>
          | MarkdownString
          | string
          | Promise<MarkdownString | string | void>
          | void;
      }
    ): Disposable;
    /**
     * Registers a chat mention that triggers a handler when referenced.
     *
     * @param {string} mention - Mention identifier (e.g., `@usercontext`).
     * @param {{ title: string; description?: string; handler: (message: string) => MarkdownString | string | Promise<MarkdownString | string | void> | void }} options - Mention metadata and handler.
     * @returns {Disposable} Disposable to unregister the mention.
     */
    registerChatMention(
      mention: string,
      options: {
        title: string;
        description?: string;
        handler: (
          message: string
        ) =>
          | MarkdownString
          | string
          | Promise<MarkdownString | string | void>
          | void;
      }
    ): Disposable;
  }
}
