import { test, expect } from '@playwright/test';
import PlaywrightMCPClient from '../src/lib/mcp-playwright';

test.describe('Playwright MCP Example', () => {
  let mcpClient: PlaywrightMCPClient;

  test.beforeAll(async () => {
    mcpClient = new PlaywrightMCPClient();
    await mcpClient.connect();
  });

  test.afterAll(async () => {
    await mcpClient.disconnect();
  });

  test('should navigate to homepage using MCP', async () => {
    // Navigate to the application
    await mcpClient.navigateTo('http://localhost:3000');
    
    // Wait for the main content to load
    await mcpClient.waitForSelector('h1');
    
    // Take a screenshot
    const screenshot = await mcpClient.screenshot();
    console.log('Screenshot taken:', screenshot);
    
    // Check if the page title is correct
    const title = await mcpClient.evaluate('document.title');
    expect(title).toContain('Arcadia Reader');
  });

  test('should interact with login form using MCP', async () => {
    // Navigate to login page
    await mcpClient.navigateTo('http://localhost:3000/login');
    
    // Fill in the email field
    await mcpClient.fill('input[type="email"]', 'test@example.com');
    
    // Fill in the password field
    await mcpClient.fill('input[type="password"]', 'testpassword');
    
    // Click the submit button
    await mcpClient.click('button[type="submit"]');
    
    // Wait for navigation or error message
    await mcpClient.waitForSelector('.error-message, .dashboard', {
      timeout: 5000
    });
  });

  test('should list available MCP tools', async () => {
    const tools = await mcpClient.listTools();
    console.log('Available Playwright MCP tools:');
    tools.forEach(tool => {
      console.log(`- ${tool.name}: ${tool.description}`);
    });
    expect(tools.length).toBeGreaterThan(0);
  });
});