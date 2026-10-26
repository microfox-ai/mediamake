import { NextRequest } from 'next/server';
import { clientCredentials, corsJson, preflight, readParams } from '@/lib/mcp/http';
import {
  OAuthError,
  clientAuthenticates,
  exchangeCode,
  getClient,
  refreshTokens,
} from '@/lib/mcp/oauth';

export async function POST(req: NextRequest) {
  const params = await readParams(req);
  try {
    const { clientId, clientSecret } = clientCredentials(req, params);
    const client = clientId ? await getClient(clientId) : null;
    if (!client || !clientAuthenticates(client, clientSecret))
      throw new OAuthError('invalid_client', 'Unknown client or wrong client secret', 401);

    if (params.grant_type === 'authorization_code') {
      if (!params.code) throw new OAuthError('invalid_request', 'code is required');
      return corsJson(
        await exchangeCode({
          code: params.code,
          client,
          redirectUri: params.redirect_uri,
          codeVerifier: params.code_verifier,
        }),
      );
    }
    if (params.grant_type === 'refresh_token') {
      if (!params.refresh_token) throw new OAuthError('invalid_request', 'refresh_token is required');
      return corsJson(await refreshTokens({ refreshToken: params.refresh_token, client }));
    }
    throw new OAuthError('unsupported_grant_type', 'Use authorization_code or refresh_token');
  } catch (error) {
    if (error instanceof OAuthError)
      return corsJson({ error: error.code, error_description: error.message }, { status: error.status });
    console.error('[oauth/token]', error);
    return corsJson({ error: 'server_error' }, { status: 500 });
  }
}

export const OPTIONS = preflight;
