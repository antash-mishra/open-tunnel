# Open Tunnel: WebSocket Tunneling Server & Client

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![NPM Client Package](https://img.shields.io/npm/v/@antash-mishra/tunnel-client.svg)](https://www.npmjs.com/package/@antash-mishra/tunnel-client)

This project provides a simple implementation of a WebSocket-based tunneling service, similar in concept to tools like ngrok or Cloudflare Tunnel, allowing you to expose a local web server to the internet.

It consists of two main parts:

1.  **Tunnel Server (`./src`)**: A Node.js server built with Express and WebSockets (`ws`) that accepts connections from tunnel clients and routes public HTTP requests to the appropriate client.
2.  **Tunnel Client (`./client`)**: A command-line tool (publishable as an NPM package) that connects to the tunnel server and proxies incoming tunnel requests to a specified local server.

## Features

*   **Expose Local Servers**: Make your local development servers (HTTP/HTTPS) accessible via a public URL.
*   **WebSocket Communication**: Uses WebSockets for persistent connection between client and server.
*   **Simple Protocol**: Custom JSON-based protocol for tunneling requests and responses.
*   **Dynamic Tunnel IDs**: Server assigns unique IDs to connected clients.
*   **Command-Line Client**: Easy-to-use CLI tool for initiating tunnels.
*   **Deployable Server**: Includes Dockerfile and Fly.io configuration for easy deployment.

## Project Structure

```
open-tunnel/
├── src/                # Tunnel Server source code (TypeScript)
│   └── index.ts
├── client/             # Tunnel Client source code (JavaScript)
│   ├── tunnel-client.js  # Client executable
│   ├── package.json      # Client package manifest
│   ├── README.md         # Client-specific README
│   └── ...
├── Dockerfile          # Dockerfile for deploying the server
├── fly.toml            # Fly.io deployment configuration
├── package.json        # Server package manifest
├── tsconfig.json       # TypeScript configuration for the server
└── README.md           # This file (Project overview)
```

## Server Setup & Usage

The server listens for WebSocket connections from clients and handles incoming HTTP requests for established tunnels.

**Prerequisites:**

*   Node.js (Version specified in `Dockerfile`, e.g., v22)
*   npm

**Installation:**

```bash
# Clone the repository (if you haven't already)
git clone https://github.com/antash-mishra/open-tunnel.git
cd open-tunnel

# Install server dependencies
npm install
```

**Running Locally (Development):**

```bash
# Build TypeScript and start with nodemon for auto-reloading
npm run dev
```

This compiles the TypeScript code and uses `nodemon` to watch for changes in the `src` directory. The server will typically start on port 8080 (or the port specified by the `PORT` environment variable).

**Running Locally (Production Mode):**

```bash
# 1. Build the TypeScript code
npm run build

# 2. Start the server
npm start
```

This runs the compiled JavaScript code from the `build` directory.

**Deployment:**

This project includes a `Dockerfile` and `fly.toml` configured for deployment on [Fly.io](https://fly.io/).

1.  **Install Fly CLI**: Follow instructions at [fly.io/docs/hands-on/install-flyctl/](https://fly.io/docs/hands-on/install-flyctl/)
2.  **Login**: `fly auth login`
3.  **Launch (first time)**: `fly launch` (Review and adjust settings if needed)
4.  **Deploy**: `fly deploy`

Your server will be deployed and accessible at `https://<your-app-name>.fly.dev`. The WebSocket endpoint will be `wss://<your-app-name>.fly.dev`.

## Client Setup & Usage

The client is a command-line tool used to connect your local server to the running tunnel server.

**Installation:**

The client is published as an NPM package. Install it globally:

```bash
npm install -g @antash-mishra/tunnel-client
```

**Link:** [npmjs.com/package/@antash-mishra/tunnel-client](https://www.npmjs.com/package/@antash-mishra/tunnel-client?activeTab=readme)

**Usage:**

```bash
tunnel-client <local-server-url> [options]
```

*   **`<local-server-url>`**: (Required) The URL of your local server (e.g., `http://localhost:3000`).
*   **`[options]`**: `-s` or `--server-url` to specify the WebSocket URL of the tunnel server (defaults to `ws://localhost:8080`).

**Examples:**

```bash
# Connect local http://localhost:5000 to a local tunnel server (ws://localhost:8080)
tunnel-client http://localhost:5000

# Connect local http://127.0.0.1:8000 to a deployed tunnel server
tunnel-client http://127.0.0.1:8000 -s wss://your-tunnel-app.fly.dev
```

For more details, see the client's README: [`client/README.md`](./client/README.md)