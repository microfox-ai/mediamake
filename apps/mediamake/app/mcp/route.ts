import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';
import { MediamakeClient, createServer } from '@microfox/mediamake-mcp/server';
import { NextRequest } from 'next/server';
import { CORS_HEADERS, preflight } from '@/lib/mcp/http';
import { SCOPE, publicOrigin, resolveMcpCaller } from '@/lib/mcp/oauth';

/**
 * The hosted Mediamake MCP server (Streamable HTTP). Add `<app>/mcp` as a
 * custom connector in Claude and sign in; the same tools as the local .mcpb,
 * minus the ones that read or write files on the user's computer.
 *
 * Stateless: each request gets a fresh server that calls this app's /api
 * routes with the caller's API key, so the middleware, tiers and access rules
 * apply exactly as they do for the .mcpb.
 *
 * Outside the middleware matcher (/api/*): this route authenticates itself,
 * with an OAuth access token from /oauth/token or a plain API key.
 */

export const dynamic = 'force-dynamic';
// Transcriptions and renders wait on the API for minutes.
export const maxDuration = 300;

function unauthorized(req: NextRequest, description: string) {
  const origin = publicOrigin(req);
  return Response.json(
    { error: 'invalid_token', error_description: description },
    {
      status: 401,
      headers: {
        ...CORS_HEADERS,
        'WWW-Authenticate': `Bearer error="invalid_token", error_description="${description}", scope="${SCOPE}", resource_metadata="${origin}/.well-known/oauth-protected-resource/mcp"`,
      },
    },
  );
}

async function handle(req: NextRequest) {
  const auth = req.headers.get('authorization');
  const bearer = auth?.toLowerCase().startsWith('bearer ') ? auth.slice(7).trim() : undefined;
  if (!bearer) return unauthorized(req, 'Sign in to Mediamake to use this connector');
  const caller = await resolveMcpCaller(bearer);
  if (!caller) return unauthorized(req, 'The token is invalid or expired');

  const client = new MediamakeClient({
    // Self-calls go to the deployment's own URL unless pointed elsewhere.
    baseUrl: (process.env.MCP_API_BASE_URL || publicOrigin(req)).replace(/\/+$/, ''),
    apiKey: caller.apiKey,
    timeoutMs: (maxDuration - 10) * 1000,
  });
  const server = createServer(client, { localFiles: false, maxWaitSeconds: maxDuration - 30 });
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  });
  await server.connect(transport);

  try {
    const res = await transport.handleRequest(req, {
      authInfo: { token: bearer, clientId: caller.clientId, scopes: [SCOPE] },
    });
    const headers = new Headers(res.headers);
    for (const [k, v] of Object.entries(CORS_HEADERS)) headers.set(k, v);
    return new Response(res.body, { status: res.status, statusText: res.statusText, headers });
  } finally {
    // JSON responses are complete once handleRequest resolves.
    void server.close();
  }
}

export const GET = handle;
export const POST = handle;
export const DELETE = handle;
export const OPTIONS = preflight;
