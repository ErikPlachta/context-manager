/**
 * MCP Client for VS Code Extension
 *
 * Manages STDIO connection to MCP server process.
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import type { StdioServerParameters } from '@modelcontextprotocol/sdk/client/stdio.js';

export interface MCPClientConfig {
  /** Path to server executable */
  serverPath: string;
  /** Server arguments */
  serverArgs?: string[];
  /** Environment variables to ADD to defaults (not replace) */
  env?: Record<string, string>;
  /** Callback for server stderr output */
  onStderr?: (data: string) => void;
  /** Callback for client log output */
  onLog?: (msg: string) => void;
}

export interface MCPToolCall {
  name: string;
  arguments?: Record<string, unknown>;
}

/**
 * MCP Client Manager
 */
export class MCPClient {
  private client: Client | null = null;
  private transport: StdioClientTransport | null = null;
  private config: MCPClientConfig;
  private connected = false;

  constructor(config: MCPClientConfig) {
    this.config = config;
  }

  /**
   * Start server and connect
   */
  async connect(): Promise<void> {
    const log = (msg: string) => {
      console.log(msg);
      this.config.onLog?.(msg);
    };

    log('[MCP Client] === CONNECT START ===');

    if (this.connected) {
      log('[MCP Client] Already connected, returning');
      return;
    }

    try {
      const args = this.config.serverArgs || [];
      log('[MCP Client] Step 4.1: Creating transport');
      log(`[MCP Client]   Command: ${this.config.serverPath}`);
      log(`[MCP Client]   Args: ${JSON.stringify(args)}`);
      log(`[MCP Client]   Env overrides: ${JSON.stringify(this.config.env || {})}`);

      // Build transport params matching SDK's approach
      // SDK uses getDefaultEnvironment() + custom env, NOT full process.env
      const transportParams: StdioServerParameters = {
        command: this.config.serverPath,
        args: args,
        stderr: this.config.onStderr ? 'pipe' : 'inherit'
      };

      // Only add env if we have overrides (SDK merges with defaults internally)
      if (this.config.env) {
        transportParams.env = this.config.env;
      }

      log('[MCP Client] Step 4.2: Instantiating StdioClientTransport');
      this.transport = new StdioClientTransport(transportParams);
      log('[MCP Client]   Transport instantiated (SDK handles env defaults)');

      // Use SDK's stderr PassThrough stream (available immediately)
      if (this.config.onStderr && this.transport.stderr) {
        log('[MCP Client] Step 4.3: Attaching to stderr stream');
        this.transport.stderr.on('data', (data: Buffer) => {
          this.config.onStderr?.(data.toString());
        });
        log('[MCP Client]   Stderr listener attached');
      }

      // Create MCP client
      log('[MCP Client] Step 4.4: Creating Client instance');
      this.client = new Client(
        {
          name: 'context-manager-vscode',
          version: '0.0.1'
        },
        {
          capabilities: {}
        }
      );
      log('[MCP Client]   Client instance created');

      log('[MCP Client] Step 4.5: Calling client.connect() (spawns server)');
      await this.client.connect(this.transport);
      log('[MCP Client]   client.connect() completed');

      this.connected = true;
      log('[MCP Client] === CONNECT SUCCESS ===');
    } catch (error) {
      log('[MCP Client] === CONNECT FAILED ===');
      log(`[MCP Client] Error: ${error}`);
      if (error instanceof Error) {
        log(`[MCP Client] Message: ${error.message}`);
        log(`[MCP Client] Stack: ${error.stack}`);
      }
      throw error;
    }
  }

  /**
   * Disconnect from server
   */
  async disconnect(): Promise<void> {
    if (!this.connected) {
      return;
    }

    try {
      console.log('[MCP Client] Disconnecting...');

      // Close client connection
      if (this.client) {
        await this.client.close();
        this.client = null;
      }

      // Close transport (also terminates server process)
      if (this.transport) {
        await this.transport.close();
        this.transport = null;
      }

      this.connected = false;
      console.log('[MCP Client] Disconnected');
    } catch (error) {
      console.error('[MCP Client] Error during disconnect:', error);
    }
  }

  /**
   * List available tools
   */
  async listTools(): Promise<any[]> {
    if (!this.client || !this.connected) {
      throw new Error('Not connected to server');
    }

    try {
      const response = await this.client.listTools();
      return response.tools || [];
    } catch (error) {
      console.error('[MCP Client] Failed to list tools:', error);
      throw error;
    }
  }

  /**
   * Call a tool
   */
  async callTool(call: MCPToolCall): Promise<any> {
    if (!this.client || !this.connected) {
      throw new Error('Not connected to server');
    }

    try {
      console.log('[MCP Client] Calling tool:', call.name);

      const response = await this.client.callTool({
        name: call.name,
        arguments: call.arguments || {}
      });

      return response;
    } catch (error) {
      console.error('[MCP Client] Tool call failed:', error);
      throw error;
    }
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.connected;
  }

  /**
   * Get client instance
   */
  getClient(): Client | null {
    return this.client;
  }
}
