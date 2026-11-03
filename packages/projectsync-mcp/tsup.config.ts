import { defineConfig } from 'tsup';

// The stdio CLI (`projectsync-mcp`). The MediaMake MCP's client and brand kit tools it reuses
// (../mediamake-mcp/src) are bundled in.
export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  platform: 'node',
  target: 'node20',
  sourcemap: true,
  banner: { js: '#!/usr/bin/env node' },
});
