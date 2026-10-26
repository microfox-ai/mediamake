import { defineConfig } from 'tsup';

export default defineConfig([
  // The stdio CLI (`mediamake-mcp`, `.mcp.json`).
  {
    entry: ['src/index.ts'],
    format: ['esm'],
    platform: 'node',
    target: 'node20',
    sourcemap: true,
    banner: { js: '#!/usr/bin/env node' },
  },
  // `@microfox/mediamake-mcp/server`: createServer without the stdio main(),
  // for the hosted /mcp route in apps/mediamake.
  {
    entry: ['src/server.ts'],
    format: ['esm'],
    platform: 'node',
    target: 'node20',
    sourcemap: true,
    dts: true,
  },
]);
