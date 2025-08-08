# Playwright MCP Integration

This project has been configured with Playwright MCP (Model Context Protocol) for browser automation and testing.

## Installation

The following packages have been installed:
- `@playwright/mcp` - Official Playwright MCP server
- `@modelcontextprotocol/sdk` - MCP SDK for client implementation

## Configuration

### MCP Configuration File
The MCP configuration is stored in `mcp-config.json`:
```json
{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": ["@playwright/mcp"],
      "env": {
        "HEADLESS": "false",
        "DEFAULT_TIMEOUT": "30000"
      }
    }
  }
}
```

### Client Implementation
A TypeScript client wrapper is available at `src/lib/mcp-playwright.ts` that provides:
- Connection management
- Tool discovery
- Common browser automation methods (navigate, click, fill, screenshot, etc.)

## Usage

### Starting the MCP Server

Run the Playwright MCP server with various options:

```bash
# Basic usage (headed mode)
npx @playwright/mcp

# Headless mode
npx @playwright/mcp --headless

# With specific browser
npx @playwright/mcp --browser chrome

# With device emulation
npx @playwright/mcp --device "iPhone 15"

# Save session and trace
npx @playwright/mcp --save-session --save-trace --output-dir ./playwright-output
```

### Using in Tests

Example test using the MCP client:

```typescript
import PlaywrightMCPClient from '../src/lib/mcp-playwright';

const mcpClient = new PlaywrightMCPClient();
await mcpClient.connect();

// Navigate to a page
await mcpClient.navigateTo('http://localhost:3000');

// Interact with elements
await mcpClient.fill('input[type="email"]', 'user@example.com');
await mcpClient.click('button[type="submit"]');

// Take screenshots
await mcpClient.screenshot();

// Disconnect when done
await mcpClient.disconnect();
```

### Available MCP Tools

The Playwright MCP server provides these tools:
- `navigate` - Navigate to a URL
- `screenshot` - Take a screenshot
- `click` - Click an element
- `fill` - Fill an input field
- `wait` - Wait for a selector
- `evaluate` - Execute JavaScript in the browser
- And many more browser automation capabilities

## Testing

Run the example MCP test:
```bash
npm run test:e2e -- e2e/mcp-example.spec.ts
```

Test the MCP server connection:
```bash
node test-mcp.js
```

## Advanced Features

### Vision Capabilities
Enable vision capabilities for AI-powered visual understanding:
```bash
npx @playwright/mcp --caps vision
```

### PDF Support
Enable PDF capabilities:
```bash
npx @playwright/mcp --caps pdf
```

### Proxy Configuration
Use with a proxy server:
```bash
npx @playwright/mcp --proxy-server "http://myproxy:3128"
```

## Integration with AI Models

The MCP protocol allows AI models to control browser automation through a standardized interface. This enables:
- Automated testing with natural language instructions
- Web scraping and data extraction
- UI testing with visual verification
- End-to-end workflow automation

## Troubleshooting

### Port Already in Use
If the default port is in use, specify a different port:
```bash
npx @playwright/mcp --port 8080
```

### Browser Not Found
Specify the browser executable path:
```bash
npx @playwright/mcp --executable-path /path/to/browser
```

### Connection Issues
Check that the MCP server is running and accessible at the configured endpoint.