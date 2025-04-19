# WebSocket Tunnel Client

A simple WebSocket-based tunnel client that allows you to expose your local server to the internet through a tunnel server.

## Installation

Install the client globally using npm:

```bash
npm install -g .
# or if publishing to npm: npm install -g websocket-tunnel-client
```

This will make the `tunnel-client` command available in your terminal.

## Usage

```bash
tunnel-client <local-server-url> [options]
```

**Arguments:**

*   `<local-server-url>`: **Required**. The full URL of your local server (e.g., `http://localhost:3000`, `https://127.0.0.1:8443`).

**Options:**

*   `-s, --server-url <url>`: The WebSocket URL of the tunnel server to connect to. Defaults to `ws://localhost:8080`.
*   `-h, --help`: Show help information.

**Example:**

```bash
# Expose local server running on http://localhost:5000 using the default tunnel server
tunnel-client http://localhost:5000

# Expose local server using a specific tunnel server
tunnel-client http://127.0.0.1:8080 -s wss://my-tunnel-server.com
```

## How It Works

1.  The client connects to the specified tunnel server via WebSocket.
2.  Upon successful connection, the server assigns a unique tunnel ID.
3.  The client prints the public URL (e.g., `https://my-tunnel-server.com/<tunnel-id>`).
4.  Any HTTP requests made to the public URL are:
    *   Forwarded by the tunnel server to the client via WebSocket.
    *   Proxied by the client to your specified local server URL.
    *   The local server's response is sent back through the tunnel to the original requester.

## Development

1.  Clone the repository.
2.  Navigate to the `client` directory: `cd client`
3.  Install dependencies: `npm install`
4.  Run the client directly:
    ```bash
    node tunnel-client.js http://localhost:3000 -s ws://localhost:8080
    ```

## Running as a Service (Optional)

For persistent operation after global installation, you can use a process manager like PM2:

```bash
pm2 start $(which tunnel-client) --name "my-tunnel" -- <local-server-url> [options]
# Example:
pm2 start $(which tunnel-client) --name "api-tunnel" -- http://localhost:3001 -s wss://my-tunnel-server.com
``` 