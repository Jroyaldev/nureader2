#!/usr/bin/env node

const { spawn } = require('child_process');

// Test the Playwright MCP server
console.log('Testing Playwright MCP server...');

const mcpProcess = spawn('npx', ['@playwright/mcp', '--help'], {
  stdio: 'inherit'
});

mcpProcess.on('error', (error) => {
  console.error('Failed to start MCP server:', error);
  process.exit(1);
});

mcpProcess.on('exit', (code) => {
  if (code === 0) {
    console.log('✅ Playwright MCP server is working correctly');
  } else {
    console.error(`MCP server exited with code ${code}`);
    process.exit(code);
  }
});