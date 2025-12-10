# NimbleBrain SDK for TypeScript

Official TypeScript SDK for the [NimbleBrain Studio API](https://www.nimblebrain.ai).

![npm version](https://img.shields.io/npm/v/@nimblebrain/sdk)
![GitHub License](https://img.shields.io/github/license/NimbleBrainInc/sdk-typescript)
[![Discord](https://img.shields.io/badge/Discord-%235865F2.svg?logo=discord&logoColor=white)](https://www.nimblebrain.ai/discord?utm_source=github&utm_medium=readme&utm_campaign=sdk-typescript&utm_content=header-badge)

## Features

- **High-level API** - Clean, intuitive interface for agents, playbooks, and conversations
- **Streaming support** - Real-time SSE streaming for agent responses with typewriter effect
- **TypeScript first** - Full type definitions for all API responses
- **Auto-generated types** - OpenAPI-generated types ensure API compatibility

## Installation

```bash
npm install @nimblebrain/sdk
```

## Quick Start

```typescript
import { NimbleBrain } from '@nimblebrain/sdk';

const nb = new NimbleBrain({ apiKey: 'nb_live_...' });

// List agents in your workspace
const agents = await nb.agents.list();
console.log('Available agents:', agents);

// Create a conversation and chat with an agent
const conversation = await nb.conversations.create(agents[0].id);

// Stream the response in real-time
for await (const event of nb.messages.stream(agents[0].id, conversation.id, 'Hello!')) {
  if (event.type === 'content') {
    process.stdout.write(event.data.text as string);
  }
}
```

## Authentication

Get your API key from NimbleBrain Studio at **Settings > API Keys**.

```typescript
import { NimbleBrain } from '@nimblebrain/sdk';

const nb = new NimbleBrain({
  apiKey: 'nb_live_xxxxxxxxxxxxx',
  baseUrl: 'https://api.nimblebrain.ai', // Optional, this is the default
});
```

## Streaming Messages

The SDK provides real-time streaming for agent responses via Server-Sent Events (SSE):

```typescript
const conversation = await nb.conversations.create(agentId);

for await (const event of nb.messages.stream(agentId, conversation.id, 'Tell me a joke')) {
  switch (event.type) {
    case 'message.start':
      console.log('Agent is responding...');
      break;
    case 'content':
      // Text chunk - display with typewriter effect
      process.stdout.write(event.data.text as string);
      break;
    case 'tool.start':
      console.log(`Using tool: ${event.data.display}`);
      break;
    case 'tool.complete':
      console.log('Tool completed');
      break;
    case 'done':
      console.log('\nResponse complete!');
      break;
    case 'error':
      console.error('Error:', event.data.error);
      break;
  }
}
```

## API Reference

### Agents

```typescript
// List all agents
const agents = await nb.agents.list();
```

### Conversations

```typescript
// Create a new conversation
const conversation = await nb.conversations.create(agentId, 'My Chat');

// Get conversation details
const conv = await nb.conversations.get(agentId, conversationId);
```

### Messages

```typescript
// List messages in a conversation
const messages = await nb.messages.list(agentId, conversationId);

// Send a message (non-streaming, blocks until complete)
const response = await nb.messages.send(agentId, conversationId, 'Hello!');

// Send with streaming (recommended for UI)
for await (const event of nb.messages.stream(agentId, conversationId, 'Hello!')) {
  // Handle streaming events
}
```

### Playbooks

```typescript
// List all playbooks
const playbooks = await nb.playbooks.list();

// Execute a playbook
const { id } = await nb.playbooks.execute(playbookId, { param1: 'value' });

// Poll for results
const execution = await nb.executions.get(id);

// Or use the helper that waits for completion
const result = await nb.executions.waitForCompletion(id, {
  timeoutMs: 60000,
  pollIntervalMs: 1000,
});
```

## Low-Level API

For advanced use cases, you can use the auto-generated OpenAPI functions directly:

```typescript
import { getV1Agents, postV1AgentsByAgentIdConversations } from '@nimblebrain/sdk';
import { createClient, createConfig } from '@nimblebrain/sdk/client';

const client = createClient(createConfig({
  baseUrl: 'https://api.nimblebrain.ai',
  headers: { Authorization: 'Bearer nb_live_...' },
}));

const { data, error } = await getV1Agents({ client });
```

## Error Handling

```typescript
try {
  const agents = await nb.agents.list();
} catch (error) {
  if (error instanceof Error) {
    console.error('API error:', error.message);
  }
}
```

## Demo Application

See the `/demo` folder for a complete React application demonstrating:
- Streaming chat with Streamdown typewriter effect
- Playbook execution with polling
- Dark mode support

```bash
cd demo
npm install
npm run dev
```

## Development

```bash
# Install dependencies
npm install

# Generate SDK from OpenAPI spec (requires API server running)
npm run generate

# Build
npm run build

# Type check
npm run typecheck
```

## Publishing

```bash
# Publish to npm (runs prepublishOnly automatically)
npm publish
```

## Links

- [NimbleBrain Studio](https://www.nimblebrain.ai)
- [API Documentation](https://api.nimblebrain.ai/v1/docs)
- [GitHub Issues](https://github.com/NimbleBrainInc/sdk-typescript/issues)

## License

Apache-2.0
