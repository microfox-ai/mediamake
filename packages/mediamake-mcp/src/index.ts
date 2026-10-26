import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { MediamakeClient, configFromEnv } from './client.js';
import { createServer } from './server.js';

async function main() {
  const config = configFromEnv();
  if (!config.apiKey) {
    // Fine against a dev server with DEV_API_KEY set; anything else answers 401.
    console.error(
      `[mediamake-mcp] MEDIAMAKE_API_KEY is not set; calling ${config.baseUrl} without a key.`,
    );
  }
  const server = createServer(new MediamakeClient(config));
  await server.connect(new StdioServerTransport());
  console.error(`[mediamake-mcp] ready, API ${config.baseUrl}`);
}

main().catch(error => {
  console.error('[mediamake-mcp] fatal:', error);
  process.exit(1);
});
