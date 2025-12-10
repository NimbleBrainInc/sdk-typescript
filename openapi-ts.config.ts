import { defineConfig } from '@hey-api/openapi-ts';

export default defineConfig({
  input: process.env.OPENAPI_URL || 'http://localhost:3000/v1/docs/json',
  output: {
    path: './src',
    format: 'prettier',
  },
  plugins: [
    '@hey-api/typescript',
    '@hey-api/client-fetch',
    '@hey-api/sdk',
  ],
});
