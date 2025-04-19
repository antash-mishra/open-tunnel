# Tunnel Client

A simple WebSocket-based tunnel client that allows you to expose your local server to the internet through a tunnel server.

## Installation

```bash
# Install dependencies
npm install

# Make the client executable (Unix/Linux/macOS)
chmod +x tunnel-client.js
```

## Configuration

Edit `tunnel-client.js` to configure:

1. `SERVER_URL`: The WebSocket URL of your tunnel server (e.g., `ws://yourtunnelserver.com`)
2. `LOCAL_SERVER`: The URL of your local server to forward requests to (e.g., `http://localhost:3000`)

## Usage

```bash
# Start the client
npm start

# Or run directly
./tunnel-client.js
```

## How It Works

1. The client connects to the tunnel server via WebSocket
2. Upon successful connection, you'll receive a tunnel ID
3. Any HTTP requests to `http://yourtunnelserver.com/<your-tunnel-id>/...` will be:
   - Forwarded to the client via WebSocket
   - Proxied by the client to your local server
   - Responses are sent back through the tunnel

## Running as a Service

For persistent operation, you can:

1. Use a process manager like PM2:
   ```bash
   npm install -g pm2
   pm2 start tunnel-client.js --name "tunnel"
   ```

2. Or create a systemd service (Linux):
   ```
   [Unit]
   Description=Tunnel Client
   After=network.target

   [Service]
   ExecStart=/path/to/tunnel-client.js
   Restart=always
   User=yourusername
   Environment=PATH=/usr/bin:/usr/local/bin
   WorkingDirectory=/path/to/client/directory

   [Install]
   WantedBy=multi-user.target
   ``` 