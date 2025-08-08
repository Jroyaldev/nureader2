import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { spawn } from 'child_process';

export class PlaywrightMCPClient {
  private client: Client | null = null;
  private transport: StdioClientTransport | null = null;

  async connect() {
    try {
      const childProcess = spawn('npx', ['@playwright/mcp'], {
        stdio: ['pipe', 'pipe', 'pipe'],
        env: {
          ...process.env,
          HEADLESS: 'false',
          DEFAULT_TIMEOUT: '30000'
        }
      });

      this.transport = new StdioClientTransport({
        stdin: childProcess.stdin,
        stdout: childProcess.stdout,
        stderr: childProcess.stderr
      });

      this.client = new Client({
        name: 'playwright-mcp-client',
        version: '1.0.0'
      }, {
        capabilities: {}
      });

      await this.client.connect(this.transport);
      console.log('Connected to Playwright MCP server');
      
      return this.client;
    } catch (error) {
      console.error('Failed to connect to Playwright MCP server:', error);
      throw error;
    }
  }

  async disconnect() {
    if (this.client) {
      await this.client.close();
      this.client = null;
    }
    if (this.transport) {
      await this.transport.close();
      this.transport = null;
    }
  }

  async listTools() {
    if (!this.client) {
      throw new Error('Client not connected. Call connect() first.');
    }
    const response = await this.client.listTools();
    return response.tools;
  }

  async callTool(name: string, args: Record<string, any>) {
    if (!this.client) {
      throw new Error('Client not connected. Call connect() first.');
    }
    const response = await this.client.callTool({
      name,
      arguments: args
    });
    return response.content;
  }

  async navigateTo(url: string) {
    return this.callTool('navigate', { url });
  }

  async screenshot(selector?: string) {
    return this.callTool('screenshot', { selector });
  }

  async click(selector: string) {
    return this.callTool('click', { selector });
  }

  async fill(selector: string, value: string) {
    return this.callTool('fill', { selector, value });
  }

  async waitForSelector(selector: string, options?: { timeout?: number }) {
    return this.callTool('wait', { selector, ...options });
  }

  async evaluate(script: string) {
    return this.callTool('evaluate', { script });
  }
}

export default PlaywrightMCPClient;