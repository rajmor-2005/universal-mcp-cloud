#!/usr/bin/env node
/**
 * MCP Stdio-to-HTTP Bridge for Claude Desktop
 * 
 * This script bridges Claude Desktop (stdio transport) to the
 * Universal MCP Cloud HTTP JSON-RPC endpoint.
 * 
 * Claude Desktop sends JSON-RPC messages via stdin →
 * this bridge forwards them to the HTTP MCP endpoint →
 * and returns the response via stdout.
 * 
 * Usage in claude_desktop_config.json:
 * {
 *   "mcpServers": {
 *     "universal-mcp": {
 *       "command": "node",
 *       "args": ["D:/automcp_project/mcp-bridge.js"],
 *       "env": {
 *         "MCP_SERVER_URL": "http://localhost:4000/api/v1/mcp/u/default",
 *         "MCP_API_KEY": "umcp_dev_key"
 *       }
 *     }
 *   }
 * }
 */

const http = require('http');
const readline = require('readline');

// Configuration
const MCP_SERVER_URL = process.env.MCP_SERVER_URL || 'http://localhost:4000/api/v1/mcp/u/default';
const MCP_API_KEY = process.env.MCP_API_KEY || 'umcp_dev_key';

const url = new URL(MCP_SERVER_URL);

// Log to stderr (not stdout — stdout is reserved for MCP protocol)
function log(msg) {
  process.stderr.write(`[mcp-bridge] ${msg}\n`);
}

/**
 * Send a JSON-RPC request to the HTTP MCP server
 */
function sendHttpRequest(jsonRpcMessage) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(jsonRpcMessage);
    
    const options = {
      hostname: url.hostname,
      port: url.port || 4000,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
        'X-API-Key': MCP_API_KEY,
      },
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          let parsed = JSON.parse(data);
          
          // Handle legacy wrapped responses: {success: true, data: {...}}
          if (parsed.success !== undefined && parsed.data && parsed.data.jsonrpc) {
            parsed = parsed.data;
          }
          
          resolve(parsed);
        } catch (e) {
          reject(new Error(`Failed to parse response: ${data}`));
        }
      });
    });

    req.on('error', (e) => {
      reject(e);
    });

    req.setTimeout(30000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    req.write(postData);
    req.end();
  });
}

/**
 * Write a JSON-RPC response to stdout
 */
function writeResponse(response) {
  const json = JSON.stringify(response);
  process.stdout.write(json + '\n');
}

/**
 * Handle incoming JSON-RPC messages from stdin
 */
async function handleMessage(line) {
  const trimmed = line.trim();
  if (!trimmed) return;

  let message;
  try {
    message = JSON.parse(trimmed);
  } catch (e) {
    return; // Not valid JSON
  }

  // Notifications (no id) — forward without expecting response
  if (message.id === undefined || message.id === null) {
    try { await sendHttpRequest(message); } catch (e) { /* ignore */ }
    return;
  }

  log(`→ ${message.method} (id: ${message.id})`);

  try {
    const response = await sendHttpRequest(message);
    log(`← ${message.method} OK`);
    writeResponse(response);
  } catch (error) {
    log(`✗ ${message.method} error: ${error.message}`);
    writeResponse({
      jsonrpc: '2.0',
      id: message.id,
      error: {
        code: -32603,
        message: error.message || 'Bridge connection error',
      },
    });
  }
}

// ─── Main ────────────────────────────────────────────

log(`Connecting to ${MCP_SERVER_URL}`);

const rl = readline.createInterface({
  input: process.stdin,
  terminal: false,
});

rl.on('line', (line) => {
  handleMessage(line).catch((err) => {
    log(`Fatal: ${err.message}`);
  });
});

rl.on('close', () => {
  log('stdin closed, exiting');
  process.exit(0);
});

process.stdin.resume();
