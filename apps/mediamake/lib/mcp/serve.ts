import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';
import { MediamakeClient, createServer } from '@microfox/mediamake-mcp/server';
import type { NextRequest } from 'next/server';
import { MCP_CONNECTORS, canUseConnector, type McpConnector } from './access';
import { CORS_HEADERS } from './http';
import { SCOPE, protectedResourceMetadataUrl, publicOrigin, resolveMcpCaller } from './oauth';

/**
 * One hosted MCP connector over Streamable HTTP: /mcp/release (mm-release),
 * /mcp/use (mm-use) and /mcp (the old one) all answer through here.
 *
 * Stateless: each request gets a fresh server that calls this app's /api
 * routes with the caller's API key, so the middleware, tiers and access rules
 * apply exactly as they do for any other caller of the API.
 *
 * Outside the middleware matcher (/api/*): the route authenticates itself,
 * with an OAuth access token from /oauth/token or a plain API key. A token is
 * the account's, not one connector's, so who may use each connector is
 * checked here on every request (lib/mcp/access), never at sign-in alone.
 */
export function mcpHandler(kind: McpConnector, maxDuration: number) {
  const connector = MCP_CONNECTORS[kind];

  function unauthorized(req: NextRequest, description: string) {
    return Response.json(
      { error: 'invalid_token', error_description: description },
      {
        status: 401,
        headers: {
          ...CORS_HEADERS,
          'WWW-Authenticate': `Bearer error="invalid_token", error_description="${description}", scope="${SCOPE}", resource_metadata="${protectedResourceMetadataUrl(publicOrigin(req), connector.path)}"`,
        },
      },
    );
  }

  return async function handle(req: NextRequest) {
    const auth = req.headers.get('authorization');
    const bearer = auth?.toLowerCase().startsWith('bearer ') ? auth.slice(7).trim() : undefined;
    if (!bearer) return unauthorized(req, 'Sign in to Mediamake to use this connector');
    const caller = await resolveMcpCaller(bearer);
    if (!caller) return unauthorized(req, 'The token is invalid or expired');
    if (!(await canUseConnector(kind, caller.clientId))) {
      return Response.json({ error: 'access_denied', error_description: connector.locked }, { status: 403, headers: CORS_HEADERS });
    }

    const origin = publicOrigin(req);
    const client = new MediamakeClient({
      // Self-calls go to the deployment's own URL unless pointed elsewhere.
      baseUrl: (process.env.MCP_API_BASE_URL || origin).replace(/\/+$/, ''),
      apiKey: caller.apiKey,
      timeoutMs: (maxDuration - 10) * 1000,
    });
    const server = createServer(kind, client, {
      localFiles: false,
      maxWaitSeconds: maxDuration - 30,
      websiteUrl: origin,
      icons: [
        { src: `${origin}/brand/favicon.svg`, mimeType: 'image/svg+xml', sizes: ['any'] },
        { src: `${origin}/brand/icon-512.png`, mimeType: 'image/png', sizes: ['512x512'] },
        { src: `${origin}/brand/icon-192.png`, mimeType: 'image/png', sizes: ['192x192'] },
      ],
    });
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
  };
}
