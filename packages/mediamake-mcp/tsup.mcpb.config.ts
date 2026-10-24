import { defineConfig } from 'tsup';

// One self-contained file for the .mcpb bundle: dependencies are inlined so
// the bundle needs no node_modules.
export default defineConfig({
  entry: { index: 'src/index.ts' },
  outDir: 'mcpb/server',
  format: ['esm'],
  platform: 'node',
  target: 'node20',
  noExternal: [/.*/],
  splitting: false,
  clean: true,
  banner: {
    // Bundled CommonJS dependencies call require(); give ESM output one.
    js: "import { createRequire } from 'node:module'; const require = createRequire(import.meta.url);",
  },
});
