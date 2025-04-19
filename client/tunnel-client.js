#!/usr/bin/env node

const WebSocket = require('ws');
const http = require('http');
const https = require('https');
const { Buffer } = require('buffer');
const yargs = require('yargs/yargs');
const { hideBin } = require('yargs/helpers');

// Parse command line arguments
const argv = yargs(hideBin(process.argv))
  .usage('Usage: $0 <local-server-url> [options]')
  .command('$0 <localServerUrl>', 'Start the tunnel client', (yargs) => {
    yargs.positional('localServerUrl', {
      describe: 'The URL of the local server to forward requests to (e.g., http://localhost:3000)',
      type: 'string'
    })
  })
  .option('s', {
    alias: 'server-url',
    describe: 'The WebSocket URL of the tunnel server',
    type: 'string',
    default: 'ws://localhost:8080' // Default tunnel server URL
  })
  .demandCommand(1, 'You must provide the local server URL')
  .help()
  .alias('h', 'help')
  .argv;

// Configuration from arguments
const LOCAL_SERVER = argv.localServerUrl;
const SERVER_URL = argv.serverUrl;

// Validate LOCAL_SERVER URL format (basic check)
try {
  new URL(LOCAL_SERVER);
} catch (e) {
  console.error(`Invalid local server URL format: ${LOCAL_SERVER}`);
  process.exit(1);
}

// Connect to the WebSocket tunnel server
console.log(`Connecting to tunnel server at ${SERVER_URL}...`);
const ws = new WebSocket(SERVER_URL);

// Handle connection open
ws.on('open', () => {
  console.log('Connected to tunnel server!');
});

// Handle connection errors
ws.on('error', (error) => {
  console.error('WebSocket error:', error);
});

// Handle connection close
ws.on('close', (code, reason) => {
  console.log(`Connection closed: ${code} - ${String(reason)}`);
  console.log('Attempting to reconnect in 5 seconds...');
  setTimeout(() => {
    // In a real CLI, you might implement more robust reconnection
    // For now, just exit to allow process managers to restart
    process.exit(1); 
  }, 5000);
});

// Handle incoming messages from the tunnel server
ws.on('message', (data) => {
  try {
    const message = JSON.parse(data.toString());
    
    if (message.type === 'connected') {
      console.log(`Tunnel established! Your tunnel ID is: ${message.tunnelId}`);
      const publicUrl = SERVER_URL.replace(/^ws/, 'http') + '/' + message.tunnelId;
      console.log(`Your public URL is: ${publicUrl}`);
    } else if (message.type === 'request') {
      handleTunnelRequest(message);
    } else {
      console.log('Received unknown message type:', message.type);
    }
  } catch (error) {
    console.error('Error processing message:', error, 'Raw data:', data.toString());
  }
});

/**
 * Handle incoming tunnel requests from the server
 * @param {Object} tunnelRequest - The incoming request
 */
function handleTunnelRequest(tunnelRequest) {
  const path = tunnelRequest.path ? `/${tunnelRequest.path}` : '/';
  console.log(`Received request: ${tunnelRequest.method} ${path}`);

  // Parse local server URL
  const localUrl = new URL(LOCAL_SERVER);

  // Prepare the options for the HTTP request to the local server
  const options = {
    hostname: localUrl.hostname,
    port: localUrl.port || (localUrl.protocol === 'https:' ? 443 : 80),
    path: path,
    method: tunnelRequest.method,
    headers: { ...tunnelRequest.headers } // Copy headers
  };

  // Remove headers that might cause issues when proxying
  delete options.headers.host; // Use the host from the local server URL
  delete options.headers.connection;
  delete options.headers['content-length']; // Let the http module calculate this

  // Choose http or https based on the LOCAL_SERVER
  const requester = localUrl.protocol === 'https:' ? https : http;

  // Create the request to the local server
  const req = requester.request(options, (res) => {
    const chunks = [];
    
    res.on('data', (chunk) => {
      chunks.push(chunk);
    });
    
    res.on('end', () => {
      const body = Buffer.concat(chunks);
      
      // Send the response back through the tunnel
      const tunnelResponse = {
        type: 'response',
        id: tunnelRequest.id,
        status: res.statusCode || 500,
        headers: res.headers,
        body: body.toString('base64')
      };
      
      ws.send(JSON.stringify(tunnelResponse));
      console.log(`Responded to request: ${tunnelRequest.method} ${path} with status ${res.statusCode}`);
    });
  });
  
  req.on('error', (error) => {
    console.error('Error forwarding request to local server:', error);
    
    // Send an error response back through the tunnel
    const tunnelResponse = {
      type: 'response',
      id: tunnelRequest.id,
      status: 502, // Bad Gateway
      headers: { 'content-type': 'text/plain' },
      body: Buffer.from(`Bad Gateway - Could not connect to local server at ${LOCAL_SERVER}: ${error.message}`).toString('base64')
    };
    
    if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(tunnelResponse));
    }
  });
  
  // Write the request body if it exists
  if (tunnelRequest.body) {
    try {
      const requestBody = Buffer.from(tunnelRequest.body, 'base64');
      req.write(requestBody);
    } catch (e) {
        console.error("Error decoding request body:", e)
        // Handle potential base64 decoding error - perhaps send a 400 back?
    }
  }
  
  req.end();
}

// Handle process termination gracefully
function cleanup() {
    console.log('\nClosing connection to tunnel server...');
    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.close();
    }
    process.exit(0);
}

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);

console.log(`Forwarding requests to local server at ${LOCAL_SERVER}`); 