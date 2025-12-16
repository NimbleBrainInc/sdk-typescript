# NimbleBrain TypeScript SDK

Official TypeScript SDK for the NimbleBrain Studio API.

**npm package:** `@nimblebrain/sdk`

## Verification

```bash
npm run typecheck && npm run test
```

## Tech Stack

- **Language:** TypeScript (ES modules)
- **Build:** tsc
- **Testing:** Vitest
- **API Generation:** @hey-api/openapi-ts
- **Node:** >=18.0.0

## Directory Structure

```
src/
├── index.ts           # Main entry point, NimbleBrain class (edit this)
├── client.gen.ts      # Auto-generated OpenAPI client (DO NOT EDIT)
├── types.gen.ts       # Auto-generated types (DO NOT EDIT)
├── sdk.gen.ts         # Auto-generated SDK functions (DO NOT EDIT)
└── __tests__/         # Tests (Vitest)
demo/                  # Demo React application
```

## Constraints

- **Never modify `*.gen.ts` files directly.** They are auto-generated from OpenAPI.
- To fix type issues, update the OpenAPI spec in `apps/studio` and regenerate.
- Keep the `NimbleBrain` wrapper class in `src/index.ts` thin; delegate to generated SDK functions.
- All exports go through `src/index.ts` (main) and `src/client.ts` (low-level client).

## Common Tasks

### Adding a new high-level API method

1. Add the method to the appropriate namespace class in `src/index.ts`
2. Import and use generated functions from `sdk.gen.ts`
3. Add tests in `src/__tests__/`
4. Run `npm run typecheck && npm run test`

### Updating generated types (when API changes)

1. Ensure the API server is running (`apps/studio/server`)
2. Run `npm run generate`
3. Verify with `npm run typecheck`

### Writing tests

Tests use Vitest. Place test files in `src/__tests__/` with `.test.ts` extension.

```bash
npm run test           # Run all tests
npm run test -- --watch  # Watch mode
```

## Development Commands

```bash
npm install            # Install dependencies
npm run generate       # Generate SDK from OpenAPI (requires API server)
npm run build          # Build for production
npm run typecheck      # Type check only
npm run test           # Run tests
npm publish            # Publish to npm (runs build automatically)
```

## Streaming Events

The SDK handles SSE streaming for real-time agent responses:

| Event Type | Description |
|------------|-------------|
| `message.start` | Agent began responding |
| `content` | Text chunk (for typewriter effect) |
| `tool.start` | Tool execution started |
| `tool.complete` | Tool execution finished |
| `done` | Response complete |
| `error` | Error occurred |

## Cross-Repository References

- **apps/studio** - Backend API that this SDK calls
- **docs/** - SDK documentation at docs.nimblebrain.ai
- API endpoint: https://api.nimblebrain.ai

## API Key Format

- Live keys: `nb_live_xxxxx`
- Test keys: `nb_test_xxxxx`
