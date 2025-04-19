import express, { Request, Response, NextFunction } from 'express';
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { v4 as uuidv4 } from 'uuid';
import { Buffer } from 'buffer';

interface TunnelRequest {
  id: string;
  method: string;
  path: string;
  headers: Record<string, string>;
  body: string; // base64 encoded
}

interface TunnelResponse {
  id: string;
  status: number;
  headers: Record<string, string>;
  body: string; // base64 encoded
}

const pendingRequests = new Map<string, { res: express.Response, timestamp: number }>();


const tunnels  = new Map<string, WebSocket>();

// create express app for HTTP server
const app = express();
const server = http.createServer(app);

// Creating web socket server
const wss = new WebSocketServer({ server });

wss.on('connection', (ws: WebSocket) => {
  const tunnelId = uuidv4();
  tunnels.set(tunnelId, ws);

  console.log("Set TunnelID: ", tunnelId);

  // Sending tunnel Id to client
  ws.send(JSON.stringify({ type:'connected', tunnelId }));

  // Handle incoming messages from the client
  ws.on('message', (data: Buffer) => {
    try {
      const message = JSON.parse(data.toString());
      console.log('Received message:', message);
      // Handle tunnel responses
      if (message.type === 'response') {
        const pendingResponse = pendingRequests.get(message.id);
        console.log('Pending Response:', pendingResponse);
        if (pendingResponse) {
          const { res } = pendingResponse;
          
          // Set status code
          res.status(message.status);
          
          // Set headers
          Object.entries(message.headers).forEach(([key, value]) => {
            if (key.toLowerCase() !== 'content-length' && key.toLowerCase() !== 'connection') {
              res.setHeader(key, value as string | number | readonly string[]);
            }
          });
          
          // Send response body
          const responseBody = Buffer.from(message.body, 'base64');
          res.end(responseBody);
          
          // Clean up
          pendingRequests.delete(message.id);
        }
      }
    } catch (error) {
      console.error('Error processing tunnel message:', error);
    }
  });

  // Handle client disconnection
  ws.on('close', () => {
    console.log(`Tunnel client disconnected: ${tunnelId}`);
    tunnels.delete(tunnelId);
  });  
});

// Clean up stale pending requests periodically
setInterval(() => {
  const now = Date.now();
  for (const [id, request] of pendingRequests.entries()) {
    // Timeout after 30 seconds
    if (now - request.timestamp > 30000) {
      request.res.status(504).send('Gateway Timeout');
      pendingRequests.delete(id);
    }
  }
}, 5000);


app.all('/test', (req, res) => {
  res.send('Test route works');
});
// Handle HTTP requests to be forwarded through the tunnel
app.all(['/:tunnelId', '/:tunnelId/*splat'], (req: Request, res: Response): void | Promise<void> => {
  console.log("Request received for tunnel:", req.params.tunnelId, "Path:", req.params.splat || '/');
  const tunnelId = req.params.tunnelId;
  const ws = tunnels.get(tunnelId);


  if (!ws) {
    res.status(404).send('Tunnel not found');
    return;
  }
  
  // Create a buffer to collect request body chunks
  const chunks: Buffer[] = [];
  
  // Set up event handlers for collecting the request body
  req.on('data', (chunk: Buffer) => {
    chunks.push(chunk);
  });
  
  req.on('end', () => {
    try {
      const body = Buffer.concat(chunks);
      
      // Create a request ID
      const requestId = uuidv4();
      
      // Store the pending request
      pendingRequests.set(requestId, {
        res,
        timestamp: Date.now(),
      });
      
      // Forward the request to the tunnel client
      const tunnelRequest: TunnelRequest = {
        id: requestId,
        method: req.method || 'GET',
        path: req.params.splat || '',
        headers: req.headers as Record<string, string>,
        body: body.toString('base64'),
      };
      
      ws.send(JSON.stringify({
        type: 'request',
        ...tunnelRequest,
      }));
    } catch (error) {
      console.error('Error forwarding request:', error);
      if (!res.headersSent) {
        res.status(500).send('Internal Server Error');
      }
    }
  });
  
  req.on('error', (error) => {
    console.error('Error reading request:', error);
    if (!res.headersSent) {
      res.status(500).send('Internal Server Error');
    }
  });
});




// Serve home page with active tunnels
app.get('/', (req, res) => {
  let html = '<h1>Simple ngrok</h1>';
  html += '<h2>Active tunnels:</h2>';
  html += '<ul>';
  
  if (tunnels.size === 0) {
    html += '<li>No active tunnels</li>';
  } else {
    for (const tunnelId of tunnels.keys()) {
      html += `<li><a href="/${tunnelId}/">${req.headers.host}/${tunnelId}/</a></li>`;
    }
  }
  
  html += '</ul>';
  res.send(html);
});

// Start the server
const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
  console.log('Waiting for tunnel clients to connect...');
});

