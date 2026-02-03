# NimbleBrain SDK for TypeScript

Official TypeScript SDK for the [NimbleBrain Studio API](https://www.nimblebrain.ai).

![npm version](https://img.shields.io/npm/v/@nimblebrain/sdk)
![CI](https://github.com/NimbleBrainInc/sdk-typescript/actions/workflows/ci.yml/badge.svg)
![GitHub License](https://img.shields.io/github/license/NimbleBrainInc/sdk-typescript)
[![Discord](https://img.shields.io/badge/Discord-%235865F2.svg?logo=discord&logoColor=white)](https://www.nimblebrain.ai/discord?utm_source=github&utm_medium=readme&utm_campaign=sdk-typescript&utm_content=header-badge)

## Features

- **High-level API** - Clean, intuitive interface for Nira conversations and playbooks
- **Streaming support** - Real-time SSE streaming with typewriter effect
- **TypeScript first** - Full type definitions for all API responses
- **Auto-generated types** - OpenAPI-generated types ensure API compatibility

## Requirements

- Node.js >= 18.0.0

## Installation

```bash
npm install @nimblebrain/sdk
```

## Quick Start

```typescript
import { NimbleBrain } from '@nimblebrain/sdk';

const nb = new NimbleBrain({ apiKey: 'nb_live_...' });

// Create a conversation with Nira
const conversation = await nb.nira.createConversation('My Chat');

// Stream the response in real-time
for await (const event of nb.nira.stream(conversation.id, 'Hello!')) {
  if (event.type === 'message.content') {
    process.stdout.write(event.data.content as string);
  } else if (event.type === 'message.done') {
    console.log('\nDone!');
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

The SDK provides real-time streaming for Nira responses via Server-Sent Events (SSE):

```typescript
const conversation = await nb.nira.createConversation('My Chat');

for await (const event of nb.nira.stream(conversation.id, 'Tell me a joke')) {
  switch (event.type) {
    case 'message.meta':
      console.log('Message ID:', event.data.messageId);
      break;
    case 'message.content':
      // Text chunk - display with typewriter effect
      process.stdout.write(event.data.content as string);
      break;
    case 'message.tool':
      // Tool execution status
      console.log(`Tool: ${event.data.toolName} - ${event.data.status}`);
      break;
    case 'message.actionCards':
      // Action cards (e.g., OAuth prompts)
      console.log('Action cards:', event.data.actionCards);
      break;
    case 'message.done':
      console.log('\nResponse complete!');
      break;
    case 'error':
      console.error('Error:', event.data.error);
      break;
  }
}
```

## API Reference

### Nira (Conversations)

```typescript
// Create a new conversation
const conversation = await nb.nira.createConversation('My Chat');

// Get conversation details
const conv = await nb.nira.getConversation(conversationId);

// List messages in a conversation (paginated)
const { messages, total } = await nb.nira.listMessages(conversationId, {
  limit: 50,
  offset: 0,
});

// Send a message (non-streaming, blocks until complete)
const response = await nb.nira.sendMessage(conversationId, 'Hello!');

// Send with streaming (recommended for UI)
for await (const event of nb.nira.stream(conversationId, 'Hello!')) {
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
import { postV1NiraConversations, getV1NiraConversationsById } from '@nimblebrain/sdk';
import { createClient, createConfig } from '@nimblebrain/sdk/client';

const client = createClient(createConfig({
  baseUrl: 'https://api.nimblebrain.ai',
  headers: { Authorization: 'Bearer nb_live_...' },
}));

const { data, error } = await postV1NiraConversations({
  client,
  body: { title: 'My Chat' },
});
```

## Error Handling

```typescript
try {
  const conversation = await nb.nira.createConversation('My Chat');
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

# Run tests
npm run test
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
