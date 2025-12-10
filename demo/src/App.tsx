import { useState, useEffect, useRef, useCallback } from 'react';
import { Streamdown } from 'streamdown';
import { NimbleBrain } from '@nimblebrain/sdk';
import type { Agent, Playbook, Conversation } from '@nimblebrain/sdk';

// Extended message type for UI state
interface UIMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  isStreaming?: boolean;
  toolActivity?: string;
}

function App() {
  // Connection state
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('nb_api_key') || '');
  const [apiBase, setApiBase] = useState(() => localStorage.getItem('nb_api_base') || 'https://api.nimblebrain.ai');
  const [isConnected, setIsConnected] = useState(false);
  const [sdk, setSdk] = useState<NimbleBrain | null>(null);

  // Data state
  const [agents, setAgents] = useState<Agent[]>([]);
  const [playbooks, setPlaybooks] = useState<Playbook[]>([]);
  const [currentAgent, setCurrentAgent] = useState<Agent | null>(null);
  const [currentPlaybook, setCurrentPlaybook] = useState<Playbook | null>(null);
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<UIMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);

  // UI state
  const [activeTab, setActiveTab] = useState<'agents' | 'playbooks'>('agents');
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('dark-mode') === 'true');
  const [input, setInput] = useState('');
  const [executionResult, setExecutionResult] = useState<{ status: string; result: string } | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Dark mode effect
  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
    localStorage.setItem('dark-mode', String(darkMode));
  }, [darkMode]);

  // Auto-scroll messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Connect to API using SDK
  const connect = useCallback(async (silent = false) => {
    if (!apiKey) return;

    const client = new NimbleBrain({ apiKey, baseUrl: apiBase });

    try {
      const [agentList, playbookList] = await Promise.all([
        client.agents.list(),
        client.playbooks.list(),
      ]);

      setAgents(agentList);
      setPlaybooks(playbookList);
      setSdk(client);
      setIsConnected(true);

      localStorage.setItem('nb_api_key', apiKey);
      localStorage.setItem('nb_api_base', apiBase);
    } catch (error) {
      if (!silent) {
        alert(`Connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
  }, [apiKey, apiBase]);

  // Auto-connect on mount
  useEffect(() => {
    if (apiKey) {
      connect(true);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const disconnect = () => {
    setIsConnected(false);
    setSdk(null);
    setAgents([]);
    setPlaybooks([]);
    setCurrentAgent(null);
    setCurrentPlaybook(null);
    setConversation(null);
    setMessages([]);
    localStorage.removeItem('nb_api_key');
  };

  // Select agent and create conversation
  const selectAgent = async (agent: Agent) => {
    if (!sdk) return;

    setCurrentAgent(agent);
    setCurrentPlaybook(null);
    setMessages([]);
    setConversation(null);

    try {
      const conv = await sdk.conversations.create(agent.id, 'SDK Demo Chat');
      setConversation(conv);
    } catch (error) {
      setMessages([{ id: 'error', role: 'system', content: `Failed to create conversation: ${error instanceof Error ? error.message : 'Unknown error'}` }]);
    }
  };

  const selectPlaybook = (playbook: Playbook) => {
    setCurrentPlaybook(playbook);
    setCurrentAgent(null);
    setExecutionResult(null);
  };

  // Send message with streaming using SDK
  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !sdk || !currentAgent || !conversation || isStreaming) return;

    const userContent = input.trim();
    setInput('');

    // Add user message
    const userMessage: UIMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: userContent,
    };
    setMessages(prev => [...prev, userMessage]);

    // Add streaming placeholder
    const assistantId = `assistant-${Date.now()}`;
    setMessages(prev => [...prev, {
      id: assistantId,
      role: 'assistant',
      content: '',
      isStreaming: true,
    }]);

    setIsStreaming(true);

    try {
      // Use SDK's streaming method
      for await (const event of sdk.messages.stream(currentAgent.id, conversation.id, userContent)) {
        switch (event.type) {
          case 'content':
            setMessages(prev => prev.map(m =>
              m.id === assistantId
                ? { ...m, content: m.content + (event.data.text as string) }
                : m
            ));
            break;

          case 'tool.start':
            setMessages(prev => prev.map(m =>
              m.id === assistantId
                ? { ...m, toolActivity: (event.data.display as string) || (event.data.tool as string) }
                : m
            ));
            break;

          case 'tool.complete':
            setMessages(prev => prev.map(m =>
              m.id === assistantId
                ? { ...m, toolActivity: undefined }
                : m
            ));
            break;

          case 'message.complete':
          case 'done':
            setMessages(prev => prev.map(m =>
              m.id === assistantId
                ? { ...m, isStreaming: false, toolActivity: undefined }
                : m
            ));
            break;

          case 'error':
            setMessages(prev => prev.map(m =>
              m.id === assistantId
                ? { ...m, content: (event.data.error as string) || 'An error occurred', isStreaming: false }
                : m
            ));
            break;
        }
      }
    } catch (error) {
      setMessages(prev => prev.map(m =>
        m.id === assistantId
          ? { ...m, content: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`, isStreaming: false }
          : m
      ));
    } finally {
      setIsStreaming(false);
    }
  };

  // Execute playbook using SDK
  const executePlaybook = async () => {
    if (!sdk || !currentPlaybook || isExecuting) return;

    setIsExecuting(true);
    setExecutionResult({ status: 'running', result: 'Waiting for results...' });

    try {
      const { id } = await sdk.playbooks.execute(currentPlaybook.id);

      // Use SDK's waitForCompletion helper
      const execution = await sdk.executions.waitForCompletion(id, {
        timeoutMs: 60000,
        pollIntervalMs: 1000,
      });

      let resultText = 'No output';
      if (execution.result) {
        if (typeof execution.result === 'string') {
          resultText = execution.result;
        } else if (typeof execution.result === 'object') {
          const result = execution.result as Record<string, unknown>;
          if (result.error) {
            resultText = `Error: ${result.error}`;
          } else if (result.content) {
            resultText = result.content as string;
          } else {
            resultText = JSON.stringify(result, null, 2);
          }
        }
      }
      setExecutionResult({
        status: execution.status,
        result: resultText + (execution.durationMs ? ` (${execution.durationMs}ms)` : ''),
      });
    } catch (error) {
      setExecutionResult({
        status: 'failed',
        result: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setIsExecuting(false);
    }
  };

  // Render setup panel (not connected)
  if (!isConnected) {
    return (
      <div className="h-full bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
            <div className="text-center mb-8">
              <img src="/nimblebrain_logo_512.png" alt="NimbleBrain" className="w-16 h-16 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Connect to NimbleBrain</h2>
              <p className="text-gray-500 dark:text-gray-400 mt-2">Enter your API key to get started</p>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); connect(); }} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">API Key</label>
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="nb_live_..."
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none transition"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">API Base URL</label>
                <input
                  type="url"
                  value={apiBase}
                  onChange={(e) => setApiBase(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none transition"
                />
              </div>
              <button
                type="submit"
                className="w-full py-3 px-4 bg-brand-600 hover:bg-brand-700 text-white font-medium rounded-xl transition"
              >
                Connect
              </button>
            </form>

            <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-6">
              Get your API key from{' '}
              <a href="https://app.nimblebrain.ai/settings/api-keys" target="_blank" rel="noopener noreferrer" className="text-brand-600 hover:underline">
                NimbleBrain Studio
              </a>
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Render main app
  return (
    <div className="h-full bg-gray-50 dark:bg-gray-900 flex flex-col">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex-shrink-0">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/nimblebrain_logo_512.png" alt="NimbleBrain" className="w-8 h-8" />
            <h1 className="text-xl font-semibold text-gray-900 dark:text-white">NimbleBrain SDK Demo</h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm text-green-600">
              <span className="w-2 h-2 rounded-full bg-green-500" />
              Connected
            </div>
            <button onClick={() => setDarkMode(!darkMode)} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
              <svg className="w-5 h-5 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 overflow-hidden min-h-0">
        <div className="h-full max-w-6xl mx-auto flex overflow-hidden">
          {/* Sidebar */}
          <div className="w-80 flex-shrink-0 border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex flex-col min-h-0">
            {/* Tabs */}
            <div className="flex border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
              <button
                onClick={() => setActiveTab('agents')}
                className={`flex-1 px-4 py-3 text-sm font-medium ${activeTab === 'agents' ? 'text-brand-600 border-b-2 border-brand-600' : 'text-gray-500 dark:text-gray-400'}`}
              >
                Agents
              </button>
              <button
                onClick={() => setActiveTab('playbooks')}
                className={`flex-1 px-4 py-3 text-sm font-medium ${activeTab === 'playbooks' ? 'text-brand-600 border-b-2 border-brand-600' : 'text-gray-500 dark:text-gray-400'}`}
              >
                Playbooks
              </button>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2 min-h-0">
              {activeTab === 'agents' ? (
                agents.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">No agents found</div>
                ) : (
                  agents.map((agent) => (
                    <button
                      key={agent.id}
                      onClick={() => selectAgent(agent)}
                      className={`w-full text-left p-3 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition ${currentAgent?.id === agent.id ? 'bg-brand-50 dark:bg-brand-900/20 border border-brand-200 dark:border-brand-800' : ''}`}
                    >
                      <div className="font-medium text-gray-900 dark:text-white">{agent.name}</div>
                      <div className="text-sm text-gray-500 dark:text-gray-400 truncate">{agent.description || 'No description'}</div>
                    </button>
                  ))
                )
              ) : (
                playbooks.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">No playbooks found</div>
                ) : (
                  playbooks.map((playbook) => (
                    <button
                      key={playbook.id}
                      onClick={() => selectPlaybook(playbook)}
                      className={`w-full text-left p-3 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition ${currentPlaybook?.id === playbook.id ? 'bg-brand-50 dark:bg-brand-900/20 border border-brand-200 dark:border-brand-800' : ''}`}
                    >
                      <div className="font-medium text-gray-900 dark:text-white">{playbook.name}</div>
                      <div className="text-sm text-gray-500 dark:text-gray-400 truncate">{playbook.description || 'No description'}</div>
                    </button>
                  ))
                )
              )}
            </div>

            {/* Disconnect */}
            <div className="flex-shrink-0 p-4 border-t border-gray-200 dark:border-gray-700">
              <button onClick={disconnect} className="w-full py-2 px-4 text-sm text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition">
                Disconnect
              </button>
            </div>
          </div>

          {/* Content area */}
          <div className="flex-1 flex flex-col bg-gray-50 dark:bg-gray-900 min-h-0 overflow-hidden">
            {/* Empty state */}
            {!currentAgent && !currentPlaybook && (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <div className="w-16 h-16 bg-gray-200 dark:bg-gray-700 rounded-full mx-auto mb-4 flex items-center justify-center">
                    <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white">Select an agent or playbook</h3>
                  <p className="text-gray-500 dark:text-gray-400 mt-1">Choose from the sidebar to get started</p>
                </div>
              </div>
            )}

            {/* Chat interface */}
            {currentAgent && (
              <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
                {/* Header */}
                <div className="flex-shrink-0 px-6 py-4 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                  <h2 className="font-semibold text-gray-900 dark:text-white">{currentAgent.name}</h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{currentAgent.description || 'Type a message to start chatting'}</p>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex message-enter ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      {msg.role === 'user' ? (
                        <div className="max-w-[70%] bg-brand-600 text-white rounded-2xl rounded-br-md px-4 py-3">
                          {msg.content}
                        </div>
                      ) : msg.role === 'assistant' ? (
                        <div className="max-w-[70%] bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl rounded-bl-md px-4 py-3 text-gray-900 dark:text-white">
                          {msg.toolActivity && (
                            <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 mb-2">
                              <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                              </svg>
                              {msg.toolActivity}...
                            </div>
                          )}
                          {msg.content ? (
                            <Streamdown isAnimating={msg.isStreaming}>
                              {msg.content}
                            </Streamdown>
                          ) : (
                            <div className="typing-indicator flex gap-1">
                              <span className="w-2 h-2 bg-gray-400 rounded-full" />
                              <span className="w-2 h-2 bg-gray-400 rounded-full" />
                              <span className="w-2 h-2 bg-gray-400 rounded-full" />
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="text-center text-sm text-gray-500 dark:text-gray-400">
                          {msg.content}
                        </div>
                      )}
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>

                {/* Input */}
                <div className="flex-shrink-0 p-4 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
                  <form onSubmit={sendMessage} className="flex gap-3">
                    <input
                      type="text"
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      placeholder="Type your message..."
                      disabled={isStreaming || !conversation}
                      className="flex-1 px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none transition disabled:opacity-50"
                    />
                    <button
                      type="submit"
                      disabled={isStreaming || !conversation || !input.trim()}
                      className="px-6 py-3 bg-brand-600 hover:bg-brand-700 text-white font-medium rounded-xl transition flex items-center gap-2 disabled:opacity-50"
                    >
                      <span>Send</span>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                      </svg>
                    </button>
                  </form>
                </div>
              </div>
            )}

            {/* Playbook interface */}
            {currentPlaybook && (
              <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
                {/* Header */}
                <div className="flex-shrink-0 px-6 py-4 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                  <h2 className="font-semibold text-gray-900 dark:text-white">{currentPlaybook.name}</h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{currentPlaybook.description || 'No description'}</p>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                  <button
                    onClick={executePlaybook}
                    disabled={isExecuting}
                    className="w-full py-3 px-4 bg-brand-600 hover:bg-brand-700 text-white font-medium rounded-xl transition flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {isExecuting ? (
                      <>
                        <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        Executing...
                      </>
                    ) : (
                      <>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Execute Playbook
                      </>
                    )}
                  </button>

                  {executionResult && (
                    <div className="mt-6">
                      <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Result</h3>
                      <div className="mb-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                          executionResult.status === 'completed' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' :
                          executionResult.status === 'running' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' :
                          'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                        }`}>
                          {executionResult.status}
                        </span>
                      </div>
                      <pre className="bg-gray-100 dark:bg-gray-800 rounded-xl p-4 text-sm overflow-x-auto text-gray-800 dark:text-gray-200 whitespace-pre-wrap">
                        {executionResult.result}
                      </pre>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
