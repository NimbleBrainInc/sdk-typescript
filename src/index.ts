// High-level SDK (recommended)
export { NimbleBrain } from './nimblebrain';
export type {
  NimbleBrainConfig,
  Agent,
  Playbook,
  Conversation,
  Message,
  SendMessageResponse,
  ExecutePlaybookResponse,
  Execution,
  StreamEvent,
  WaitForCompletionOptions,
} from './nimblebrain';

// Low-level auto-generated API (advanced use cases)
export type * from './types.gen';
export * from './sdk.gen';
