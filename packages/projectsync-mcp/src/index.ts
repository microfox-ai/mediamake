import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { MediamakeClient } from '../../mediamake-mcp/src/client.js';
import { DEFAULT_API_URL, apiConfig, createServer } from './server.js';

async function main() {
  const config = apiConfig();
  if (!config.apiKey) {
    console.error(`[projectsync] MEDIAMAKE_API_KEY is not set: ${config.baseUrl} will answer 401. Add your key from ${DEFAULT_API_URL}/core/api-keys.`);
  }
  const server = createServer(new MediamakeClient(config));
  await server.connect(new StdioServerTransport());
  console.error(`[projectsync] ready, API ${config.baseUrl}`);
}

main().catch(error => {
  console.error('[projectsync] fatal:', error);
  process.exit(1);
});
