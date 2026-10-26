import { NextRequest } from 'next/server';
import { clientCredentials, corsJson, preflight, readParams } from '@/lib/mcp/http';
import { clientAuthenticates, getClient, revokeToken } from '@/lib/mcp/oauth';

// RFC 7009: a client signs the user out by revoking its access or refresh token.
export async function POST(req: NextRequest) {
  const params = await readParams(req);
  const { clientId, clientSecret } = clientCredentials(req, params);
  const client = clientId ? await getClient(clientId) : null;
  if (!client || !clientAuthenticates(client, clientSecret))
    return corsJson({ error: 'invalid_client' }, { status: 401 });
  if (params.token) await revokeToken(params.token, client);
  // Unknown tokens are not an error (RFC 7009 2.2).
  return corsJson({});
}

export const OPTIONS = preflight;
