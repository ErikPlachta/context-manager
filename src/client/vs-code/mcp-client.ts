/**
 * MCP Client for VS Code Extension
 *
 * Manages STDIO connection to MCP server process.
 */

import { spawn, ChildProcess } from 'child_process';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

export interface MCPClientConfig {
  /** Path to server executable */
  serverPath: string;
  /** Server arguments */
  serverArgs?: string[];
  /** Environment variables */
  env?: Record<string, string>;
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
  private serverProcess: ChildProcess | null = null;
  private config: MCPClientConfig;
  private connected = false;

  constructor(config: MCPClientConfig) {
    this.config = config;
  }

  /**
   * Start server and connect
   */
  async connect(): Promise<void> {
    if (this.connected) {
      console.log('[MCP Client] Already connected');
      return;
    }

    try {
      console.log('[MCP Client] Starting server:', this.config.serverPath);

      // Spawn server process
      const env = this.config.env
        ? { ...process.env, ...this.config.env }
        : process.env;

      this.serverProcess = spawn(this.config.serverPath, this.config.serverArgs || [], {
        env: env as NodeJS.ProcessEnv,
        stdio: ['pipe', 'pipe', 'pipe']
      });

      // Handle process errors
      this.serverProcess.on('error', (error) => {
        console.error('[MCP Client] Server process error:', error);
      });

      this.serverProcess.on('exit', (code) => {
        console.log('[MCP Client] Server process exited with code:', code);
        this.connected = false;
      });

      // Log stderr for debugging
      this.serverProcess.stderr?.on('data', (data) => {
        console.error('[MCP Server]', data.toString());
      });

      // Create STDIO transport
      this.transport = new StdioClientTransport({
        command: this.config.serverPath,
        args: this.config.serverArgs || [],
        env: env as Record<string, string>
      });

      // Create MCP client
      this.client = new Client(
        {
          name: 'context-manager-vscode',
          version: '0.0.1'
        },
        {
          capabilities: {}
        }
      );

      // Connect to server
      await this.client.connect(this.transport);

      this.connected = true;
      console.log('[MCP Client] Connected to server');
    } catch (error) {
      console.error('[MCP Client] Failed to connect:', error);
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

      // Close transport
      if (this.transport) {
        await this.transport.close();
        this.transport = null;
      }

      // Kill server process
      if (this.serverProcess) {
        this.serverProcess.kill();
        this.serverProcess = null;
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
