import { NextRequest } from 'next/server';
import { corsJson, preflight } from '@/lib/mcp/http';
import { SCOPE, isAllowedRedirectUri, registerClient } from '@/lib/mcp/oauth';

// Dynamic client registration (RFC 7591). MCP clients such as Claude register
// themselves here the first time a user adds the Mediamake connector.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const redirectUris: unknown = body?.redirect_uris;
  if (
    !Array.isArray(redirectUris) ||
    !redirectUris.length ||
    redirectUris.length > 10 ||
    !redirectUris.every(u => typeof u === 'string' && isAllowedRedirectUri(u))
  ) {
    return corsJson(
      {
        error: 'invalid_redirect_uri',
        error_description: 'redirect_uris must be https URLs, or http on localhost',
      },
      { status: 400 },
    );
  }

  const { client, secret } = await registerClient({
    clientName: typeof body.client_name === 'string' ? body.client_name : undefined,
    redirectUris,
    authMethod: body.token_endpoint_auth_method,
  });

  return corsJson(
    {
      client_id: client.id,
      client_id_issued_at: Math.floor(client.createdAt / 1000),
      ...(secret ? { client_secret: secret, client_secret_expires_at: 0 } : {}),
      client_name: client.clientName,
      redirect_uris: client.redirectUris,
      token_endpoint_auth_method: client.authMethod,
      grant_types: ['authorization_code', 'refresh_token'],
      response_types: ['code'],
      scope: SCOPE,
    },
    { status: 201 },
  );
}

export const OPTIONS = preflight;
