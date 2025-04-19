#!/usr/bin/env node

const http = require('http');

// Create a simple HTTP server
const server = http.createServer((req, res) => {
  console.log(`${req.method} ${req.url}`);
  
  // Log headers
  console.log('Headers:', req.headers);
  
  // Read request body if any
  const chunks = [];
  req.on('data', (chunk) => {
    chunks.push(chunk);
  });
  
  req.on('end', () => {
    const body = Buffer.concat(chunks).toString();
    if (body) {
      console.log('Body:', body);
    }
    
    // Send response based on the path
    if (req.url === '/') {
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Tunnel Example</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              max-width: 800px;
              margin: 0 auto;
              padding: 20px;
            }
            h1 {
              color: #333;
            }
            .path {
              margin: 20px 0;
              padding: 10px;
              background-color: #f5f5f5;
              border-radius: 5px;
            }
          </style>
        </head>
        <body>
          <h1>Tunnel Example Server</h1>
          <p>This server is now accessible through your tunnel!</p>
          
          <div class="path">
            <h2>Try these paths:</h2>
            <ul>
              <li><a href="/hello">/hello</a> - Returns a simple greeting</li>
              <li><a href="/time">/time</a> - Shows the current server time</li>
              <li><a href="/echo?message=Hello">/echo?message=Hello</a> - Echoes back your message</li>
            </ul>
          </div>
          
          <p>Current time: ${new Date().toISOString()}</p>
          <p>Request received from: ${req.headers['x-forwarded-for'] || req.socket.remoteAddress}</p>
        </body>
        </html>
      `);
    } else if (req.url === '/hello') {
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.end('Hello from the tunnel!');
    } else if (req.url === '/time') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        time: new Date().toISOString(),
        timestamp: Date.now()
      }));
    } else if (req.url.startsWith('/echo')) {
      const params = new URLSearchParams(req.url.split('?')[1] || '');
      const message = params.get('message') || 'No message provided';
      
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        message,
        echo: true,
        timestamp: Date.now()
      }));
    } else {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not found');
    }
  });
});

// Start the server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Example server running at http://localhost:${PORT}`);
  console.log('Use this server with the tunnel client');
}); 