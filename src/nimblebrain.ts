/**
 * NimbleBrain SDK - High-level wrapper for the NimbleBrain Studio API
 *
 * This file provides a clean, intuitive interface on top of the auto-generated
 * OpenAPI client functions.
 */

import { createClient, createConfig, type Client } from './client';
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
// Types
// ============================================================================

export interface NimbleBrainConfig {
  /** Your NimbleBrain API key (e.g., 'nb_live_...') */
  apiKey: string;
  /** Base URL for the API. Defaults to 'https://api.nimblebrain.ai' */
  baseUrl?: string;
}

export interface Agent {
  id: string;
  name: string;
  type?: 'custom' | 'nira' | 'system';
  description?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Playbook {
  id: string;
  name: string;
  description?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Conversation {
  id: string;
  title?: string;
  context?: string;
  status?: string;
  messageCount?: number;
  lastMessageAt?: string;
  createdAt?: string;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  createdAt?: string;
}

export interface SendMessageResponse {
  messageId?: string;
  content?: string;
  role?: string;
  executionId?: string;
  tokensUsed?: number;
}

export interface ExecutePlaybookResponse {
  id: string;
  status: 'queued';
  message?: string;
}

export interface Execution {
  id: string;
  status: 'queued' | 'pending' | 'running' | 'completed' | 'completed_with_errors' | 'failed' | 'cancelled';
  targetType?: 'playbook' | 'agent';
  targetId?: string;
  targetName?: string;
  result?: string | Record<string, unknown> | null;
  startedAt?: string;
  completedAt?: string;
  durationMs?: number;
}

export interface StreamEvent {
  type: 'message.start' | 'content' | 'tool.start' | 'tool.complete' | 'message.complete' | 'error' | 'done';
  data: Record<string, unknown>;
}

export interface WaitForCompletionOptions {
  /** Maximum time to wait in milliseconds. Defaults to 60000 (1 minute) */
  timeoutMs?: number;
  /** Interval between polling requests in milliseconds. Defaults to 1000 */
  pollIntervalMs?: number;
}

// ============================================================================
// NimbleBrain SDK Class
// ============================================================================

export class NimbleBrain {
  private client: Client;
  private baseUrl: string;
  private apiKey: string;

  public readonly agents: AgentsAPI;
  public readonly conversations: ConversationsAPI;
  public readonly messages: MessagesAPI;
  public readonly playbooks: PlaybooksAPI;
  public readonly executions: ExecutionsAPI;

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

    // Initialize API namespaces
    this.agents = new AgentsAPI(this.client);
    this.conversations = new ConversationsAPI(this.client);
    this.messages = new MessagesAPI(this.client, this.baseUrl, this.apiKey);
    this.playbooks = new PlaybooksAPI(this.client);
    this.executions = new ExecutionsAPI(this.client);
  }
}

// ============================================================================
// API Namespace Classes
// ============================================================================

class AgentsAPI {
  constructor(private client: Client) {}

  /**
   * List all agents in your workspace
   */
  async list(): Promise<Agent[]> {
    const response = await getV1Agents({ client: this.client, throwOnError: true });
    return ((response.data as any)?.agents || []) as Agent[];
  }
}

class ConversationsAPI {
  constructor(private client: Client) {}

  /**
   * Create a new conversation with an agent
   */
  async create(agentId: string, title?: string): Promise<Conversation> {
    const response = await postV1AgentsByAgentIdConversations({
      client: this.client,
      path: { agentId },
      body: { title },
      throwOnError: true,
    });
    return response.data as Conversation;
  }

  /**
   * Get details of a conversation
   */
  async get(agentId: string, conversationId: string): Promise<Conversation> {
    const response = await getV1AgentsByAgentIdConversationsByConversationId({
      client: this.client,
      path: { agentId, conversationId },
      throwOnError: true,
    });
    return response.data as Conversation;
  }
}

class MessagesAPI {
  constructor(
    private client: Client,
    private baseUrl: string,
    private apiKey: string
  ) {}

  /**
   * List messages in a conversation
   */
  async list(agentId: string, conversationId: string): Promise<Message[]> {
    const response = await getV1AgentsByAgentIdConversationsByConversationIdMessages({
      client: this.client,
      path: { agentId, conversationId },
      throwOnError: true,
    });
    return ((response.data as any)?.messages || []) as Message[];
  }

  /**
   * Send a message and wait for the complete response (non-streaming)
   */
  async send(agentId: string, conversationId: string, content: string): Promise<SendMessageResponse> {
    const response = await postV1AgentsByAgentIdConversationsByConversationIdMessages({
      client: this.client,
      path: { agentId, conversationId },
      body: { content },
      throwOnError: true,
    });
    return response.data as SendMessageResponse;
  }

  /**
   * Send a message with streaming response (SSE)
   * Returns an async generator that yields streaming events
   */
  async *stream(agentId: string, conversationId: string, content: string): AsyncGenerator<StreamEvent> {
    const url = `${this.baseUrl}/v1/agents/${agentId}/conversations/${conversationId}/messages`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'text/event-stream',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({ content, stream: true }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Stream request failed: ${response.status} ${errorText}`);
    }

    if (!response.body) {
      throw new Error('No response body for streaming');
    }

    const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += value;
        const chunks = buffer.split('\n\n');
        buffer = chunks.pop() ?? '';

        for (const chunk of chunks) {
          const lines = chunk.split('\n');
          let eventType: string | undefined;
          const dataLines: string[] = [];

          for (const line of lines) {
            if (line.startsWith('event:')) {
              eventType = line.replace(/^event:\s*/, '');
            } else if (line.startsWith('data:')) {
              dataLines.push(line.replace(/^data:\s*/, ''));
            }
          }

          if (dataLines.length > 0) {
            const rawData = dataLines.join('\n');
            let data: Record<string, unknown> = {};

            try {
              data = JSON.parse(rawData);
            } catch {
              data = { raw: rawData };
            }

            yield {
              type: (eventType || 'content') as StreamEvent['type'],
              data,
            };

            // Stop on done event
            if (eventType === 'done') {
              return;
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }
}

class PlaybooksAPI {
  constructor(private client: Client) {}

  /**
   * List all playbooks in your workspace
   */
  async list(): Promise<Playbook[]> {
    const response = await getV1Playbooks({ client: this.client, throwOnError: true });
    return ((response.data as any)?.playbooks || []) as Playbook[];
  }

  /**
   * Execute a playbook with optional parameters
   */
  async execute(playbookId: string, parameters?: Record<string, unknown>): Promise<ExecutePlaybookResponse> {
    const response = await postV1PlaybooksByPlaybookIdExecute({
      client: this.client,
      path: { playbookId },
      body: parameters ? { parameters } : {},
      throwOnError: true,
    });
    return response.data as ExecutePlaybookResponse;
  }
}

class ExecutionsAPI {
  constructor(private client: Client) {}

  /**
   * Get the status of an execution
   */
  async get(id: string): Promise<Execution> {
    const response = await getV1ExecutionsById({
      client: this.client,
      path: { id },
      throwOnError: true,
    });
    return response.data as Execution;
  }

  /**
   * Wait for an execution to complete, polling at regular intervals
   */
  async waitForCompletion(id: string, options?: WaitForCompletionOptions): Promise<Execution> {
    const timeoutMs = options?.timeoutMs ?? 60000;
    const pollIntervalMs = options?.pollIntervalMs ?? 1000;
    const startTime = Date.now();

    while (true) {
      const execution = await this.get(id);

      // Check if execution is complete (success or failure)
      if (['completed', 'completed_with_errors', 'failed', 'cancelled'].includes(execution.status)) {
        return execution;
      }

      // Check for timeout
      if (Date.now() - startTime > timeoutMs) {
        throw new Error(`Execution ${id} timed out after ${timeoutMs}ms (status: ${execution.status})`);
      }

      // Wait before next poll
      await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
    }
  }
}
