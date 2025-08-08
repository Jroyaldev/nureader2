# Claude Code MCP Setup Instructions

## Configuration Complete ✅

The Playwright MCP server has been configured in Claude Code. To activate it:

### 1. Restart Claude Code
You need to restart Claude Code for the MCP server configuration to take effect.

### 2. Verify Connection
After restarting, run the `/mcp` command to see connected servers. You should see:
- **playwright** - Browser automation server

### 3. Configuration Location
The MCP configuration has been added to:
```
~/.claude/settings.json
```

With the following configuration:
```json
{
  "model": "claude-opus-4-1-20250805",
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

### 4. Using Playwright MCP in Claude Code

Once connected, Claude will have access to browser automation tools including:
- Navigate to URLs
- Click elements
- Fill forms
- Take screenshots
- Execute JavaScript
- Wait for elements
- And more browser automation capabilities

### 5. Troubleshooting

If the server doesn't appear after restart:

1. **Check npm installation**:
   ```bash
   npm list @playwright/mcp
   ```

2. **Test the server manually**:
   ```bash
   npx @playwright/mcp --help
   ```

3. **Check Claude Code logs**:
   Look for any MCP-related errors in the Claude Code output

4. **Verify settings.json syntax**:
   Make sure the JSON in `~/.claude/settings.json` is valid

### 6. Alternative Configuration

If you prefer to run the MCP server from the project directory, update the settings to:
```json
{
  "mcpServers": {
    "playwright": {
      "command": "node",
      "args": ["/Users/software/NEW FOLDER/node_modules/@playwright/mcp/cli.js"],
      "env": {
        "HEADLESS": "false",
        "DEFAULT_TIMEOUT": "30000"
      }
    }
  }
}
```

This uses the locally installed version instead of npx.