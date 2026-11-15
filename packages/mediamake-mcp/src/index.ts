import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { MediamakeClient, configFromEnv } from './client.js';
import { SERVER_KINDS, createServer, type ServerKind } from './server.js';

/**
 * The stdio entry. One package, three servers: `mediamake-mcp release`
 * (mm-release, admins: the catalog), `mediamake-mcp use` (mm-use, every
 * member) and `mediamake-mcp legacy` (the old video tools, deprecated). The
 * name comes from the first argument, else MEDIAMAKE_MCP_SERVER, else legacy:
 * that is what an install from before the split runs, the .mcpb included.
 */
function serverKind(): ServerKind {
  const asked = (process.argv[2] ?? process.env.MEDIAMAKE_MCP_SERVER ?? '').trim().replace(/^mm-/, '');
  if (!asked || asked.startsWith('${')) return 'legacy';
  if ((SERVER_KINDS as readonly string[]).includes(asked)) return asked as ServerKind;
  throw new Error(`Unknown server "${asked}": pick one of ${SERVER_KINDS.join(', ')}`);
}

async function main() {
  const kind = serverKind();
  const config = configFromEnv();
  if (!config.apiKey) {
    // Fine against a dev server with DEV_API_KEY set; anything else answers 401.
    console.error(
      `[mediamake-mcp] MEDIAMAKE_API_KEY is not set; calling ${config.baseUrl} without a key.`,
    );
  }
  const server = createServer(kind, new MediamakeClient(config));
  await server.connect(new StdioServerTransport());
  console.error(`[mediamake-mcp] ${kind} ready, API ${config.baseUrl}`);
}

main().catch(error => {
  console.error('[mediamake-mcp] fatal:', error);
  process.exit(1);
});
