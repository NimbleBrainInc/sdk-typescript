# NimbleBrain SDK Demo

A simple interactive demo for the NimbleBrain SDK. Chat with agents, execute playbooks, and explore the API.

## Quick Start

```bash
cd demo
npm install
npm start
```

Then open http://localhost:3333 in your browser.

## Features

- **API Key Authentication** - Securely connect with your NimbleBrain API key
- **Agent Chat** - Select an agent and have a conversation
- **Playbook Execution** - Run playbooks and see results in real-time
- **Dark Mode** - Toggle between light and dark themes
- **Persistent Sessions** - API key is saved in localStorage

## Configuration

Set environment variables to customize:

```bash
# Use a different port
PORT=8080 npm start

# Point to a different API (e.g., local development)
API_BASE=http://localhost:3000 npm start
```

## Screenshot

```
┌─────────────────────────────────────────────────────────────┐
│  NimbleBrain SDK Demo                        [●] Connected  │
├──────────────────────┬──────────────────────────────────────┤
│  [Agents] [Playbooks]│                                      │
│                      │    Agent: Research Assistant         │
│  ▸ Research Assistant│                                      │
│    Playbook Runner   │    ┌─────────────────────────┐      │
│    Content Writer    │    │ Hello! How can I help   │      │
│                      │    │ you today?              │      │
│                      │    └─────────────────────────┘      │
│                      │                                      │
│                      │         ┌──────────────────────────┐│
│                      │         │ What's the weather like? ││
│                      │         └──────────────────────────┘│
│                      │                                      │
│                      │  [Type your message...    ] [Send]   │
│  [Disconnect]        │                                      │
└──────────────────────┴──────────────────────────────────────┘
```

## How It Works

1. The demo runs a lightweight Node.js server that proxies requests to the NimbleBrain API
2. Your API key is sent via `X-API-Key` header to the proxy, never exposed to the browser's network tab
3. The proxy forwards requests to the configured API base URL with proper authentication

## Development

```bash
# Run with auto-reload
npm run dev
```
