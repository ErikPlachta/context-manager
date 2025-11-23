/**
 * Mock implementation of vscode module for Jest tests
 *
 * This mock provides minimal vscode API surface required for testing
 * extension code that imports vscode but doesn't actually execute
 * VS Code-specific functionality during tests.
 */

export const workspace = {
  workspaceFolders: undefined,
  getConfiguration: () => ({
    get: () => undefined,
    has: () => false,
    inspect: () => undefined,
    update: () => Promise.resolve(),
  }),
};

export const window = {
  showInformationMessage: () => Promise.resolve(undefined),
  showWarningMessage: () => Promise.resolve(undefined),
  showErrorMessage: () => Promise.resolve(undefined),
  showInputBox: () => Promise.resolve(undefined),
  showQuickPick: () => Promise.resolve(undefined),
  createOutputChannel: () => ({
    append: () => {},
    appendLine: () => {},
    clear: () => {},
    dispose: () => {},
    hide: () => {},
    show: () => {},
  }),
};

export class EventEmitter {
  event = () => ({ dispose: () => {} });
  fire = () => {};
  dispose = () => {};
}

export const chat = {
  createChatParticipant: () => ({
    dispose: () => {},
    iconPath: undefined,
  }),
};

export const lm = {
  registerMcpServerDefinitionProvider: () => ({
    dispose: () => {},
  }),
};

export const McpStdioServerDefinition = class {
  constructor(
    public title: string,
    public command: string,
    public args: string[],
    public options: Record<string, unknown>,
    public version: string
  ) {}
};

export const Uri = {
  file: (path: string) => ({ fsPath: path, path }),
  parse: (uri: string) => ({ fsPath: uri, path: uri }),
};

export const commands = {
  registerCommand: () => ({ dispose: () => {} }),
  executeCommand: () => Promise.resolve(),
};

export const ExtensionContext = {};

export const StatusBarAlignment = {
  Left: 1,
  Right: 2,
};

export const ConfigurationTarget = {
  Global: 1,
  Workspace: 2,
  WorkspaceFolder: 3,
};
