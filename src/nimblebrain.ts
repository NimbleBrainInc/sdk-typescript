/**
 * NimbleBrain SDK - High-level client with streaming support
 *
 * This provides a cleaner API on top of the auto-generated OpenAPI client,
 * including SSE streaming for real-time agent responses.
 */

import { createClient, createConfig } from './client';
import type { Client } from './client';
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

// ============================================================================
// Public Types
// ============================================================================

export interface NimbleBrainConfig {
  /** Your NimbleBrain API key (starts with nb_live_ or nb_test_) */
  apiKey: string;
  /** API base URL. Defaults to https://api.nimblebrain.ai */
  baseUrl?: string;
}

export interface Agent {
  id: string;
  name: string;
  type: 'custom' | 'nira' | 'system';
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Playbook {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Conversation {
  id: string;
  title: string;
  context: string;
  status: string;
  createdAt: string;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  createdAt: string;
}

export interface Execution {
  id: string;
  status: 'queued' | 'pending' | 'running' | 'completed' | 'completed_with_errors' | 'failed' | 'cancelled';
  targetType: 'playbook' | 'agent';
  targetId: string;
  targetName: string;
  result: unknown;
  startedAt: string | null;
  completedAt: string | null;
  durationMs: number | null;
}

export interface StreamEvent {
  type: 'message.start' | 'content' | 'tool.start' | 'tool.complete' | 'message.complete' | 'error' | 'done';
  data: Record<string, unknown>;
}

export interface SendMessageOptions {
  /** Enable async mode - returns immediately, poll for result */
  async?: boolean;
}

// ============================================================================
// NimbleBrain Client
// ============================================================================

/**
 * NimbleBrain SDK Client
 *
 * @example
 * ```typescript
 * import { NimbleBrain } from '@nimblebrain/sdk';
 *
 * const nb = new NimbleBrain({ apiKey: 'nb_live_...' });
 *
 * // List agents
 * const agents = await nb.agents.list();
 *
 * // Create conversation and stream response
 * const conversation = await nb.conversations.create(agents[0].id);
 * for await (const event of nb.messages.stream(agents[0].id, conversation.id, 'Hello!')) {
 *   if (event.type === 'content') {
 *     process.stdout.write(event.data.text as string);
 *   }
 * }
 * ```
 */
export class NimbleBrain {
  private client: Client;
  private baseUrl: string;
  private apiKey: string;

  constructor(config: NimbleBrainConfig) {
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || 'https://api.nimblebrain.ai';

    this.client = createClient(
      createConfig({
        baseUrl: this.baseUrl,
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
        },
      })
    );
  }

  /** Agent operations */
  readonly agents = {
    /**
     * List all agents in your workspace
     */
    list: async (): Promise<Agent[]> => {
      const response = await getV1Agents({ client: this.client });
      if (response.error) {
        throw new Error((response.error as { error?: string }).error || 'Failed to list agents');
      }
      return (response.data?.agents || []) as Agent[];
    },
  };

  /** Playbook operations */
  readonly playbooks = {
    /**
     * List all playbooks in your workspace
     */
    list: async (): Promise<Playbook[]> => {
      const response = await getV1Playbooks({ client: this.client });
      if (response.error) {
        throw new Error('Failed to list playbooks');
      }
      return (response.data?.playbooks || []) as Playbook[];
    },

    /**
     * Execute a playbook
     * @param playbookId - The playbook ID
     * @param parameters - Optional parameters for the playbook
     * @returns Execution ID for polling status
     */
    execute: async (
      playbookId: string,
      parameters?: Record<string, unknown>
    ): Promise<{ id: string }> => {
      const response = await postV1PlaybooksByPlaybookIdExecute({
        client: this.client,
        path: { playbookId },
        body: { parameters },
      });
      if (response.error) {
        throw new Error('Failed to execute playbook');
      }
      return { id: response.data?.id || '' };
    },
  };

  /** Conversation operations */
  readonly conversations = {
    /**
     * Create a new conversation with an agent
     * @param agentId - The agent ID
     * @param title - Optional conversation title
     */
    create: async (agentId: string, title?: string): Promise<Conversation> => {
      const response = await postV1AgentsByAgentIdConversations({
        client: this.client,
        path: { agentId },
        body: { title: title || 'SDK Conversation' },
      });
      if (response.error) {
        throw new Error('Failed to create conversation');
      }
      return response.data as Conversation;
    },

    /**
     * Get a conversation by ID
     */
    get: async (agentId: string, conversationId: string): Promise<Conversation> => {
      const response = await getV1AgentsByAgentIdConversationsByConversationId({
        client: this.client,
        path: { agentId, conversationId },
      });
      if (response.error) {
        throw new Error('Failed to get conversation');
      }
      return response.data as Conversation;
    },
  };

  /** Message operations */
  readonly messages = {
    /**
     * List messages in a conversation
     */
    list: async (agentId: string, conversationId: string): Promise<Message[]> => {
      const response = await getV1AgentsByAgentIdConversationsByConversationIdMessages({
        client: this.client,
        path: { agentId, conversationId },
      });
      if (response.error) {
        throw new Error('Failed to list messages');
      }
      return (response.data?.messages || []) as Message[];
    },

    /**
     * Send a message (non-streaming, waits for complete response)
     */
    send: async (
      agentId: string,
      conversationId: string,
      content: string,
      options?: SendMessageOptions
    ): Promise<Message> => {
      const response = await postV1AgentsByAgentIdConversationsByConversationIdMessages({
        client: this.client,
        path: { agentId, conversationId },
        body: {
          content,
          role: 'user',
          // Note: stream/async are handled at fetch level, not in generated types
        } as { content: string; role: 'user' | 'assistant' },
      });
      if (response.error) {
        throw new Error('Failed to send message');
      }
      return response.data as unknown as Message;
    },

    /**
     * Send a message with SSE streaming response
     * Returns an async generator that yields events as they arrive
     *
     * @example
     * ```typescript
     * for await (const event of nb.messages.stream(agentId, conversationId, 'Hello!')) {
     *   switch (event.type) {
     *     case 'content':
     *       process.stdout.write(event.data.text as string);
     *       break;
     *     case 'tool.start':
     *       console.log(`Using tool: ${event.data.display}`);
     *       break;
     *     case 'done':
     *       console.log('\nComplete!');
     *       break;
     *   }
     * }
     * ```
     */
    stream: (
      agentId: string,
      conversationId: string,
      content: string
    ): AsyncGenerator<StreamEvent> => {
      return this.streamMessage(agentId, conversationId, content);
    },
  };

  /**
   * Internal streaming implementation
   */
  private async *streamMessage(
    agentId: string,
    conversationId: string,
    content: string
  ): AsyncGenerator<StreamEvent> {
    const response = await fetch(
      `${this.baseUrl}/v1/agents/${agentId}/conversations/${conversationId}/messages`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
          Accept: 'text/event-stream',
        },
        body: JSON.stringify({ content, role: 'user', stream: true }),
      }
    );

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(error.error || error.message || `HTTP ${response.status}`);
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error('No response body');

    const decoder = new TextDecoder();
    let buffer = '';
    let currentEventType = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('event: ')) {
          currentEventType = line.slice(7);
        } else if (line.startsWith('data: ') && currentEventType) {
          try {
            const data = JSON.parse(line.slice(6));
            yield { type: currentEventType as StreamEvent['type'], data };
          } catch {
            // Ignore parse errors
          }
        }
      }
    }
  }

  /** Execution operations (for polling playbook results) */
  readonly executions = {
    /**
     * Get execution status and result
     * @param executionId - The execution ID from playbook.execute()
     */
    get: async (executionId: string): Promise<Execution> => {
      const response = await getV1ExecutionsById({
        client: this.client,
        path: { id: executionId },
      });
      if (response.error) {
        throw new Error('Failed to get execution');
      }
      return response.data as unknown as Execution;
    },

    /**
     * Wait for execution to complete (polls until done)
     * @param executionId - The execution ID
     * @param options - Polling options
     */
    waitForCompletion: async (
      executionId: string,
      options?: { timeoutMs?: number; pollIntervalMs?: number }
    ): Promise<Execution> => {
      const timeout = options?.timeoutMs ?? 60000;
      const interval = options?.pollIntervalMs ?? 1000;
      const startTime = Date.now();

      while (Date.now() - startTime < timeout) {
        const execution = await this.executions.get(executionId);
        if (['completed', 'completed_with_errors', 'failed', 'cancelled'].includes(execution.status)) {
          return execution;
        }
        await new Promise((resolve) => setTimeout(resolve, interval));
      }

      throw new Error(`Execution timed out after ${timeout}ms`);
    },
  };
}
