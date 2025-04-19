#!/usr/bin/env node

const WebSocket = require('ws');
const http = require('http');
const https = require('https');
const { Buffer } = require('buffer');

// Configuration
const SERVER_URL = 'ws://localhost:8080'; // Change this to your tunnel server URL
const LOCAL_SERVER = 'http://localhost:3000'; // Local server to forward requests to

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
  console.log(`Connection closed: ${code} - ${reason}`);
  console.log('Attempting to reconnect in 5 seconds...');
  setTimeout(() => {
    process.exit(1); // Exit so that the process can be restarted by a process manager
  }, 5000);
});

// Handle incoming messages from the tunnel server
ws.on('message', (data) => {
  try {
    const message = JSON.parse(data.toString());
    
    if (message.type === 'connected') {
      console.log(`Tunnel established! Your tunnel ID is: ${message.tunnelId}`);
      console.log(`Your public URL is: ${SERVER_URL.replace('ws:', 'http:').replace('wss:', 'https:')}/${message.tunnelId}`);
    } else if (message.type === 'request') {
      console.log(" Requested")
      handleTunnelRequest(message);
    } else {
      console.log('Received message:', message);
    }
  } catch (error) {
    console.error('Error processing message:', error);
  }
});

/**
 * Handle incoming tunnel requests from the server
 * @param {Object} tunnelRequest - The incoming request
 */
function handleTunnelRequest(tunnelRequest) {
  console.log(`Received request: ${tunnelRequest.method} ${tunnelRequest.path}`);

  // Prepare the options for the HTTP request to the local server
  const options = {
    hostname: LOCAL_SERVER.replace('http://', '').replace('https://', '').split(':')[0],
    port: LOCAL_SERVER.includes(':') ? LOCAL_SERVER.split(':')[2] : (LOCAL_SERVER.startsWith('https') ? 443 : 80),
    path: tunnelRequest.path ? `/${tunnelRequest.path}` : '/',
    method: tunnelRequest.method,
    headers: { ...tunnelRequest.headers }
  };

  // Remove headers that might cause issues
  delete options.headers.host;
  delete options.headers.connection;
  delete options.headers['content-length'];

  // Choose http or https based on the LOCAL_SERVER
  const requester = LOCAL_SERVER.startsWith('https') ? https : http;

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
        status: res.statusCode,
        headers: res.headers,
        body: body.toString('base64')
      };
      
      ws.send(JSON.stringify(tunnelResponse));
      console.log(`Responded to request: ${tunnelRequest.method} ${tunnelRequest.path} with status ${res.statusCode}`);
    });
  });
  
  req.on('error', (error) => {
    console.error('Error forwarding request to local server:', error);
    
    // Send an error response back through the tunnel
    const tunnelResponse = {
      type: 'response',
      id: tunnelRequest.id,
      status: 502,
      headers: { 'content-type': 'text/plain' },
      body: Buffer.from('Bad Gateway - Could not connect to local server').toString('base64')
    };
    
    ws.send(JSON.stringify(tunnelResponse));
  });
  
  // Write the request body if it exists
  if (tunnelRequest.body) {
    const requestBody = Buffer.from(tunnelRequest.body, 'base64');
    req.write(requestBody);
  }
  
  req.end();
}

// Handle process termination
process.on('SIGINT', () => {
  console.log('Closing connection to tunnel server...');
  ws.close();
  process.exit(0);
});

console.log(`Forwarding requests to local server at ${LOCAL_SERVER}`); 