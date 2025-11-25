/**
 * VS Code Integration Types
 */

/**
 * VS Code command
 */
export interface VSCodeCommand {
  /** Command ID */
  id: string;
  /** Command title */
  title: string;
  /** Command category */
  category?: string;
  /** Command handler */
  handler: (...args: any[]) => any;
}

/**
 * VS Code configuration
 */
export interface VSCodeConfig {
  /** Extension ID */
  extensionId: string;
  /** Extension version */
  version: string;
  /** Enable debug mode */
  debug?: boolean;
}

/**
 * VS Code notification options
 */
export interface NotificationOptions {
  /** Notification type */
  type: 'info' | 'warning' | 'error';
  /** Message */
  message: string;
  /** Show modal */
  modal?: boolean;
  /** Action buttons */
  actions?: Array<{
    title: string;
    action: () => void;
  }>;
}

/**
 * VS Code workspace info
 */
export interface WorkspaceInfo {
  /** Workspace name */
  name?: string;
  /** Workspace root path */
  rootPath?: string;
  /** Workspace folders */
  folders: Array<{
    name: string;
    uri: string;
  }>;
}
