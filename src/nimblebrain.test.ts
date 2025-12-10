import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NimbleBrain } from './nimblebrain';

// Mock the auto-generated SDK functions
vi.mock('./sdk.gen', () => ({
  getV1Agents: vi.fn(),
  getV1Playbooks: vi.fn(),
  postV1AgentsByAgentIdConversations: vi.fn(),
  getV1AgentsByAgentIdConversationsByConversationId: vi.fn(),
  getV1AgentsByAgentIdConversationsByConversationIdMessages: vi.fn(),
  postV1AgentsByAgentIdConversationsByConversationIdMessages: vi.fn(),
  postV1PlaybooksByPlaybookIdExecute: vi.fn(),
  getV1ExecutionsById: vi.fn(),
}));

// Import mocked functions
import {
  getV1Agents,
  getV1Playbooks,
  postV1AgentsByAgentIdConversations,
  getV1AgentsByAgentIdConversationsByConversationId,
  getV1AgentsByAgentIdConversationsByConversationIdMessages,
  postV1AgentsByAgentIdConversationsByConversationIdMessages,
  postV1PlaybooksByPlaybookIdExecute,
  getV1ExecutionsById,
} from './sdk.gen';

describe('NimbleBrain', () => {
  let sdk: NimbleBrain;

  beforeEach(() => {
    vi.clearAllMocks();
    sdk = new NimbleBrain({ apiKey: 'test-api-key' });
  });

  describe('constructor', () => {
    it('should use default baseUrl when not provided', () => {
      const client = new NimbleBrain({ apiKey: 'test-key' });
      expect(client).toBeDefined();
    });

    it('should use custom baseUrl when provided', () => {
      const client = new NimbleBrain({
        apiKey: 'test-key',
        baseUrl: 'https://custom.api.com',
      });
      expect(client).toBeDefined();
    });
  });

  describe('agents', () => {
    it('should list agents', async () => {
      const mockAgents = [
        { id: 'agent-1', name: 'Agent 1', type: 'custom' as const },
        { id: 'agent-2', name: 'Agent 2', type: 'nira' as const },
      ];

      vi.mocked(getV1Agents).mockResolvedValue({
        data: { agents: mockAgents, total: 2 },
        request: new Request('http://test'),
        response: new Response(),
      });

      const agents = await sdk.agents.list();

      expect(agents).toEqual(mockAgents);
      expect(getV1Agents).toHaveBeenCalledWith({
        client: expect.anything(),
        throwOnError: true,
      });
    });

    it('should return empty array when no agents', async () => {
      vi.mocked(getV1Agents).mockResolvedValue({
        data: { agents: undefined, total: 0 },
        request: new Request('http://test'),
        response: new Response(),
      });

      const agents = await sdk.agents.list();

      expect(agents).toEqual([]);
    });
  });

  describe('playbooks', () => {
    it('should list playbooks', async () => {
      const mockPlaybooks = [
        { id: 'pb-1', name: 'Playbook 1' },
        { id: 'pb-2', name: 'Playbook 2' },
      ];

      vi.mocked(getV1Playbooks).mockResolvedValue({
        data: { playbooks: mockPlaybooks, total: 2 },
        request: new Request('http://test'),
        response: new Response(),
      });

      const playbooks = await sdk.playbooks.list();

      expect(playbooks).toEqual(mockPlaybooks);
    });

    it('should execute playbook without parameters', async () => {
      vi.mocked(postV1PlaybooksByPlaybookIdExecute).mockResolvedValue({
        data: { id: 'exec-1', status: 'queued' as const },
        request: new Request('http://test'),
        response: new Response(),
      });

      const result = await sdk.playbooks.execute('pb-1');

      expect(result).toEqual({ id: 'exec-1', status: 'queued' });
      expect(postV1PlaybooksByPlaybookIdExecute).toHaveBeenCalledWith({
        client: expect.anything(),
        path: { playbookId: 'pb-1' },
        body: {},
        throwOnError: true,
      });
    });

    it('should execute playbook with parameters', async () => {
      vi.mocked(postV1PlaybooksByPlaybookIdExecute).mockResolvedValue({
        data: { id: 'exec-2', status: 'queued' as const },
        request: new Request('http://test'),
        response: new Response(),
      });

      const result = await sdk.playbooks.execute('pb-1', { param1: 'value1' });

      expect(result).toEqual({ id: 'exec-2', status: 'queued' });
      expect(postV1PlaybooksByPlaybookIdExecute).toHaveBeenCalledWith({
        client: expect.anything(),
        path: { playbookId: 'pb-1' },
        body: { parameters: { param1: 'value1' } },
        throwOnError: true,
      });
    });
  });

  describe('conversations', () => {
    it('should create a conversation', async () => {
      const mockConversation = {
        id: 'conv-1',
        title: 'Test Chat',
        status: 'active',
      };

      vi.mocked(postV1AgentsByAgentIdConversations).mockResolvedValue({
        data: mockConversation,
        request: new Request('http://test'),
        response: new Response(),
      });

      const conversation = await sdk.conversations.create('agent-1', 'Test Chat');

      expect(conversation).toEqual(mockConversation);
      expect(postV1AgentsByAgentIdConversations).toHaveBeenCalledWith({
        client: expect.anything(),
        path: { agentId: 'agent-1' },
        body: { title: 'Test Chat' },
        throwOnError: true,
      });
    });

    it('should get a conversation', async () => {
      const mockConversation = {
        id: 'conv-1',
        title: 'Test Chat',
        messageCount: 5,
      };

      vi.mocked(getV1AgentsByAgentIdConversationsByConversationId).mockResolvedValue({
        data: mockConversation,
        request: new Request('http://test'),
        response: new Response(),
      });

      const conversation = await sdk.conversations.get('agent-1', 'conv-1');

      expect(conversation).toEqual(mockConversation);
    });
  });

  describe('messages', () => {
    it('should list messages', async () => {
      const mockMessages = [
        { id: 'msg-1', role: 'user' as const, content: 'Hello' },
        { id: 'msg-2', role: 'assistant' as const, content: 'Hi there!' },
      ];

      vi.mocked(getV1AgentsByAgentIdConversationsByConversationIdMessages).mockResolvedValue({
        data: { messages: mockMessages, total: 2 },
        request: new Request('http://test'),
        response: new Response(),
      });

      const messages = await sdk.messages.list('agent-1', 'conv-1');

      expect(messages).toEqual(mockMessages);
    });

    it('should send a message (non-streaming)', async () => {
      const mockResponse = {
        messageId: 'msg-3',
        content: 'Hello! How can I help?',
        role: 'assistant',
      };

      vi.mocked(postV1AgentsByAgentIdConversationsByConversationIdMessages).mockResolvedValue({
        data: mockResponse,
        request: new Request('http://test'),
        response: new Response(),
      });

      const response = await sdk.messages.send('agent-1', 'conv-1', 'Hello!');

      expect(response).toEqual(mockResponse);
      expect(postV1AgentsByAgentIdConversationsByConversationIdMessages).toHaveBeenCalledWith({
        client: expect.anything(),
        path: { agentId: 'agent-1', conversationId: 'conv-1' },
        body: { content: 'Hello!' },
        throwOnError: true,
      });
    });
  });

  describe('executions', () => {
    it('should get execution status', async () => {
      const mockExecution = {
        id: 'exec-1',
        status: 'running' as const,
        targetType: 'playbook' as const,
      };

      vi.mocked(getV1ExecutionsById).mockResolvedValue({
        data: mockExecution,
        request: new Request('http://test'),
        response: new Response(),
      });

      const execution = await sdk.executions.get('exec-1');

      expect(execution).toEqual(mockExecution);
    });

    it('should wait for completion - immediate success', async () => {
      const mockExecution = {
        id: 'exec-1',
        status: 'completed' as const,
        result: 'Success!',
      };

      vi.mocked(getV1ExecutionsById).mockResolvedValue({
        data: mockExecution,
        request: new Request('http://test'),
        response: new Response(),
      });

      const execution = await sdk.executions.waitForCompletion('exec-1');

      expect(execution).toEqual(mockExecution);
      expect(getV1ExecutionsById).toHaveBeenCalledTimes(1);
    });

    it('should wait for completion - polls until complete', async () => {
      vi.mocked(getV1ExecutionsById)
        .mockResolvedValueOnce({
          data: { id: 'exec-1', status: 'running' as const },
          request: new Request('http://test'),
          response: new Response(),
        })
        .mockResolvedValueOnce({
          data: { id: 'exec-1', status: 'running' as const },
          request: new Request('http://test'),
          response: new Response(),
        })
        .mockResolvedValueOnce({
          data: { id: 'exec-1', status: 'completed' as const, result: 'Done!' },
          request: new Request('http://test'),
          response: new Response(),
        });

      const execution = await sdk.executions.waitForCompletion('exec-1', {
        pollIntervalMs: 10,
      });

      expect(execution.status).toBe('completed');
      expect(getV1ExecutionsById).toHaveBeenCalledTimes(3);
    });

    it('should wait for completion - handles failed status', async () => {
      vi.mocked(getV1ExecutionsById).mockResolvedValue({
        data: { id: 'exec-1', status: 'failed' as const },
        request: new Request('http://test'),
        response: new Response(),
      });

      const execution = await sdk.executions.waitForCompletion('exec-1');

      expect(execution.status).toBe('failed');
    });

    it('should wait for completion - times out', async () => {
      vi.mocked(getV1ExecutionsById).mockResolvedValue({
        data: { id: 'exec-1', status: 'running' as const },
        request: new Request('http://test'),
        response: new Response(),
      });

      await expect(
        sdk.executions.waitForCompletion('exec-1', {
          timeoutMs: 50,
          pollIntervalMs: 20,
        })
      ).rejects.toThrow(/timed out/);
    });
  });
});

describe('NimbleBrain.messages.stream', () => {
  let sdk: NimbleBrain;
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
    sdk = new NimbleBrain({
      apiKey: 'test-api-key',
      baseUrl: 'https://api.test.com',
    });
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('should stream SSE events', async () => {
    const sseData = [
      'event: message.start\ndata: {"messageId":"msg-1"}\n\n',
      'event: content\ndata: {"text":"Hello"}\n\n',
      'event: content\ndata: {"text":" world"}\n\n',
      'event: done\ndata: {}\n\n',
    ].join('');

    const mockStream = new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode(sseData));
        controller.close();
      },
    });

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      body: mockStream,
    });

    const events: Array<{ type: string; data: unknown }> = [];
    for await (const event of sdk.messages.stream('agent-1', 'conv-1', 'Hello!')) {
      events.push(event);
    }

    expect(events).toHaveLength(4);
    expect(events[0]).toEqual({ type: 'message.start', data: { messageId: 'msg-1' } });
    expect(events[1]).toEqual({ type: 'content', data: { text: 'Hello' } });
    expect(events[2]).toEqual({ type: 'content', data: { text: ' world' } });
    expect(events[3]).toEqual({ type: 'done', data: {} });

    expect(globalThis.fetch).toHaveBeenCalledWith(
      'https://api.test.com/v1/agents/agent-1/conversations/conv-1/messages',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
          'Accept': 'text/event-stream',
          'Authorization': 'Bearer test-api-key',
        }),
        body: JSON.stringify({ content: 'Hello!', stream: true }),
      })
    );
  });

  it('should handle chunked SSE data', async () => {
    // Simulate data arriving in chunks that split across event boundaries
    const mockStream = new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode('event: content\ndata: {"te'));
        controller.enqueue(new TextEncoder().encode('xt":"chunk1"}\n\nevent: done\ndata: {}\n\n'));
        controller.close();
      },
    });

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      body: mockStream,
    });

    const events: Array<{ type: string; data: unknown }> = [];
    for await (const event of sdk.messages.stream('agent-1', 'conv-1', 'test')) {
      events.push(event);
    }

    expect(events).toHaveLength(2);
    expect(events[0]).toEqual({ type: 'content', data: { text: 'chunk1' } });
    expect(events[1]).toEqual({ type: 'done', data: {} });
  });

  it('should throw on non-ok response', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      text: () => Promise.resolve('Unauthorized'),
    });

    await expect(async () => {
      for await (const _ of sdk.messages.stream('agent-1', 'conv-1', 'test')) {
        // consume
      }
    }).rejects.toThrow(/401/);
  });

  it('should throw when no response body', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      body: null,
    });

    await expect(async () => {
      for await (const _ of sdk.messages.stream('agent-1', 'conv-1', 'test')) {
        // consume
      }
    }).rejects.toThrow(/No response body/);
  });

  it('should handle tool events', async () => {
    const sseData = [
      'event: tool.start\ndata: {"tool":"search","display":"Searching..."}\n\n',
      'event: tool.complete\ndata: {"tool":"search"}\n\n',
      'event: done\ndata: {}\n\n',
    ].join('');

    const mockStream = new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode(sseData));
        controller.close();
      },
    });

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      body: mockStream,
    });

    const events: Array<{ type: string; data: unknown }> = [];
    for await (const event of sdk.messages.stream('agent-1', 'conv-1', 'search something')) {
      events.push(event);
    }

    expect(events).toHaveLength(3);
    expect(events[0].type).toBe('tool.start');
    expect(events[1].type).toBe('tool.complete');
  });
});
