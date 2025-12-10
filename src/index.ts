// High-level SDK with streaming support
export { NimbleBrain } from './nimblebrain';
export type {
  NimbleBrainConfig,
  Agent,
  Playbook,
  Conversation,
  Message,
  Execution,
  StreamEvent,
  SendMessageOptions,
} from './nimblebrain';

// Re-export low-level generated SDK for advanced usage
export * from './sdk.gen';
export type * from './types.gen';
