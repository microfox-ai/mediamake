import { Redis } from '@upstash/redis';
import { CrudHash } from '@microfox/db-upstash';
import { createHash, randomBytes, timingSafeEqual } from 'crypto';
import { cookies } from 'next/headers';
import type { NextRequest } from 'next/server';
import type { ApiKeyInfo } from '@/app/types/db';

/**
 * OAuth 2.1 for the hosted MCP endpoint (/mcp), so a user can add Mediamake
 * to Claude (or any MCP client) by URL and sign in with their Mediamake
 * account instead of pasting an API key.
 *
 * - Clients register themselves (RFC 7591) at /oauth/register.
 * - /oauth/authorize signs the user in with the normal /login page, asks them
 *   to allow the client, and returns a one-time code (PKCE S256 only).
 * - /oauth/token trades the code, or a refresh token, for an access token.
 *
 * An access token stands for one of the user's API keys: /mcp calls the
 * Mediamake API with that key, so the key's tier and access rules apply
 * unchanged, and disabling the key cuts the connector off too.
 *
 * Tokens are stored by their SHA-256 hash, never in the clear.
 */

export const SCOPE = 'mediamake';
const CODE_TTL_SECONDS = 10 * 60;
const REQUEST_TTL_SECONDS = 15 * 60;
export const ACCESS_TTL_SECONDS = 60 * 60;
const REFRESH_TTL_SECONDS = 60 * 60 * 24 * 30;

export interface OAuthClient {
  id: string;
  clientName: string;
  redirectUris: string[];
  /** SHA-256 of the secret, for clients that asked for client_secret_post or _basic. */
  secretHash?: string;
  authMethod: 'none' | 'client_secret_post' | 'client_secret_basic';
  createdAt: number;
}

/** A pending /oauth/authorize request, waiting for the user to allow or deny it. */
export interface AuthorizeRequest {
  id: string;
  oauthClientId: string;
  redirectUri: string;
  codeChallenge: string;
  state?: string;
  scope: string;
  resource?: string;
  /** The Mediamake user the consent screen was shown to. */
  clientId: string;
  expires: number;
}

interface Grant {
  id: string;
  oauthClientId: string;
  /** The Mediamake user (x-client-id). */
  clientId: string;
  /** The API key requests run with. Undefined only under `next dev` with DEV_API_KEY. */
  apiKey?: string;
  scope: string;
  resource?: string;
  expires: number;
}

interface CodeGrant extends Grant {
  redirectUri: string;
  codeChallenge: string;
}

function redis() {
  return new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL!,
    token: process.env.UPSTASH_REDIS_REST_TOKEN!,
  });
}

const stores = () => {
  const r = redis();
  return {
    clients: new CrudHash<OAuthClient>(r, 'oauthClients'),
    requests: new CrudHash<AuthorizeRequest>(r, 'oauthRequests'),
    codes: new CrudHash<CodeGrant>(r, 'oauthCodes'),
    access: new CrudHash<Grant>(r, 'oauthAccessTokens'),
    refresh: new CrudHash<Grant>(r, 'oauthRefreshTokens'),
    apiKeys: new CrudHash<ApiKeyInfo>(r, 'apiKeys'),
    sessions: new CrudHash<any>(r, 'sessions'),
  };
};

/** The signed-in Mediamake user, from the /login session cookie. */
export async function sessionClientId(): Promise<string | null> {
  const sessionId = (await cookies()).get('session_token')?.value;
  if (!sessionId) return null;
  const session = await stores().sessions.get(sessionId);
  return session && session.expires > Date.now() ? (session.clientId as string) : null;
}

const token = (bytes = 32) => randomBytes(bytes).toString('base64url');
export const sha256 = (value: string) => createHash('sha256').update(value).digest('base64url');

function sameString(a: string, b: string) {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

/**
 * The public origin of this deployment: MEDIAMAKE_PUBLIC_URL when set (use it
 * behind a custom domain), else the host the request came in on.
 */
export function publicOrigin(req: Request | NextRequest) {
  const configured = process.env.MEDIAMAKE_PUBLIC_URL?.trim().replace(/\/+$/, '');
  if (configured) return configured;
  const url = new URL(req.url);
  const host = req.headers.get('x-forwarded-host') ?? req.headers.get('host') ?? url.host;
  const proto = req.headers.get('x-forwarded-proto')?.split(',')[0].trim() ?? url.protocol.replace(':', '');
  return `${proto}://${host}`;
}

export const mcpResourceUrl = (origin: string) => `${origin}/mcp`;

export function authorizationServerMetadata(origin: string) {
  return {
    issuer: origin,
    authorization_endpoint: `${origin}/oauth/authorize`,
    token_endpoint: `${origin}/oauth/token`,
    registration_endpoint: `${origin}/oauth/register`,
    revocation_endpoint: `${origin}/oauth/revoke`,
    scopes_supported: [SCOPE],
    response_types_supported: ['code'],
    grant_types_supported: ['authorization_code', 'refresh_token'],
    code_challenge_methods_supported: ['S256'],
    token_endpoint_auth_methods_supported: ['none', 'client_secret_post', 'client_secret_basic'],
    revocation_endpoint_auth_methods_supported: ['none', 'client_secret_post', 'client_secret_basic'],
    service_documentation: 'https://github.com/microfox-ai/mediamake/tree/main/packages/mediamake-mcp',
  };
}

export function protectedResourceMetadata(origin: string) {
  return {
    resource: mcpResourceUrl(origin),
    authorization_servers: [origin],
    scopes_supported: [SCOPE],
    bearer_methods_supported: ['header'],
    resource_name: 'Mediamake',
    resource_documentation: 'https://github.com/microfox-ai/mediamake/tree/main/packages/mediamake-mcp',
  };
}

// ---- Client registration ----

/** https anywhere, http only for loopback (desktop and CLI clients), or a private-use scheme (app.example:/cb). */
export function isAllowedRedirectUri(uri: string) {
  let url: URL;
  try {
    url = new URL(uri);
  } catch {
    return false;
  }
  if (url.hash) return false;
  if (url.protocol === 'https:') return true;
  if (url.protocol === 'http:') return ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
  // Private-use schemes contain a dot (RFC 8252 7.1); rules out javascript:, data: and friends.
  return /^[a-z][a-z0-9+.-]*\.[a-z0-9+.-]+:$/i.test(url.protocol);
}

export async function registerClient(input: {
  clientName?: string;
  redirectUris: string[];
  authMethod?: string;
}) {
  const authMethod =
    input.authMethod === 'client_secret_post' || input.authMethod === 'client_secret_basic'
      ? input.authMethod
      : 'none';
  const secret = authMethod === 'none' ? undefined : token();
  const client: OAuthClient = {
    id: `mcp_${token(16)}`,
    clientName: (input.clientName || 'MCP client').slice(0, 100),
    redirectUris: input.redirectUris,
    authMethod,
    secretHash: secret ? sha256(secret) : undefined,
    createdAt: Date.now(),
  };
  await stores().clients.set(client.id, client);
  return { client, secret };
}

export const getClient = (id: string) => stores().clients.get(id);

/**
 * Checks the client's credentials at the token and revocation endpoints. A
 * public client (`none`) proves itself with PKCE instead, so it passes here.
 */
export function clientAuthenticates(client: OAuthClient, secret: string | undefined) {
  if (client.authMethod === 'none' || !client.secretHash) return true;
  return !!secret && sameString(sha256(secret), client.secretHash);
}

// ---- Authorization ----

export async function saveAuthorizeRequest(request: Omit<AuthorizeRequest, 'id' | 'expires'>) {
  const pending: AuthorizeRequest = {
    ...request,
    id: token(),
    expires: Date.now() + REQUEST_TTL_SECONDS * 1000,
  };
  await stores().requests.set(pending.id, pending, { ttl: REQUEST_TTL_SECONDS });
  return pending;
}

/** Reads and deletes a pending request, so each consent screen is answered once. */
export async function takeAuthorizeRequest(id: string) {
  const { requests } = stores();
  const pending = await requests.get(id);
  if (!pending) return null;
  await requests.del(id);
  return pending.expires > Date.now() ? pending : null;
}

/** A working API key of the user's, to run their MCP requests with. */
export async function apiKeyForClient(clientId: string): Promise<string | undefined | null> {
  const keys = (await stores().apiKeys.list()).filter(k => k?.clientId === clientId && k.isValid);
  if (keys[0]) return keys[0].apiKey;
  // `next dev` signs in as the dev client and the middleware fills in DEV_API_KEY.
  if (process.env.NODE_ENV === 'development' && process.env.DEV_API_KEY) return undefined;
  return null;
}

export async function issueCode(pending: AuthorizeRequest, apiKey: string | undefined) {
  const code = token();
  const grant: CodeGrant = {
    id: sha256(code),
    oauthClientId: pending.oauthClientId,
    clientId: pending.clientId,
    apiKey,
    scope: pending.scope,
    resource: pending.resource,
    redirectUri: pending.redirectUri,
    codeChallenge: pending.codeChallenge,
    expires: Date.now() + CODE_TTL_SECONDS * 1000,
  };
  await stores().codes.set(grant.id, grant, { ttl: CODE_TTL_SECONDS });
  return code;
}

// ---- Tokens ----

export class OAuthError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly status = 400,
  ) {
    super(message);
  }
}

export function pkceChallenge(verifier: string) {
  return sha256(verifier);
}

async function issueTokens(grant: Omit<Grant, 'id' | 'expires'>) {
  const { access, refresh } = stores();
  const accessToken = token();
  const refreshToken = token();
  const base = {
    oauthClientId: grant.oauthClientId,
    clientId: grant.clientId,
    apiKey: grant.apiKey,
    scope: grant.scope,
    resource: grant.resource,
  };
  await Promise.all([
    access.set(
      sha256(accessToken),
      { ...base, id: sha256(accessToken), expires: Date.now() + ACCESS_TTL_SECONDS * 1000 },
      { ttl: ACCESS_TTL_SECONDS },
    ),
    refresh.set(
      sha256(refreshToken),
      { ...base, id: sha256(refreshToken), expires: Date.now() + REFRESH_TTL_SECONDS * 1000 },
      { ttl: REFRESH_TTL_SECONDS },
    ),
  ]);
  return {
    access_token: accessToken,
    token_type: 'Bearer',
    expires_in: ACCESS_TTL_SECONDS,
    refresh_token: refreshToken,
    scope: grant.scope,
  };
}

export async function exchangeCode(input: {
  code: string;
  client: OAuthClient;
  redirectUri?: string;
  codeVerifier?: string;
}) {
  const { codes } = stores();
  const id = sha256(input.code);
  const grant = await codes.get(id);
  if (grant) await codes.del(id);
  if (!grant || grant.expires < Date.now()) throw new OAuthError('invalid_grant', 'Code is invalid or expired');
  if (grant.oauthClientId !== input.client.id) throw new OAuthError('invalid_grant', 'Code was issued to another client');
  if (input.redirectUri && input.redirectUri !== grant.redirectUri)
    throw new OAuthError('invalid_grant', 'redirect_uri does not match');
  if (!input.codeVerifier || !sameString(pkceChallenge(input.codeVerifier), grant.codeChallenge))
    throw new OAuthError('invalid_grant', 'PKCE verification failed');
  return issueTokens(grant);
}

export async function refreshTokens(input: { refreshToken: string; client: OAuthClient }) {
  const { refresh } = stores();
  const id = sha256(input.refreshToken);
  const grant = await refresh.get(id);
  if (!grant || grant.expires < Date.now() || grant.oauthClientId !== input.client.id)
    throw new OAuthError('invalid_grant', 'Refresh token is invalid or expired');
  // Rotate: the old refresh token stops working.
  await refresh.del(id);
  const apiKey = await currentApiKey(grant);
  if (apiKey === null) throw new OAuthError('invalid_grant', 'Your Mediamake API key was disabled; sign in again');
  return issueTokens({ ...grant, apiKey });
}

export async function revokeToken(value: string, client: OAuthClient) {
  const { access, refresh } = stores();
  const id = sha256(value);
  for (const store of [access, refresh]) {
    const grant = await store.get(id);
    if (grant && grant.oauthClientId === client.id) await store.del(id);
  }
}

/**
 * The key a grant should run with now: its own key while that is valid,
 * otherwise another working key of the same user (keys get rotated), else
 * null when the user has none left.
 */
async function currentApiKey(grant: Pick<Grant, 'clientId' | 'apiKey'>) {
  if (grant.apiKey) {
    const info = await stores().apiKeys.get(grant.apiKey);
    if (info?.isValid && info.clientId === grant.clientId) return grant.apiKey;
  }
  return apiKeyForClient(grant.clientId);
}

export interface McpCaller {
  clientId: string;
  /** Undefined under `next dev` with DEV_API_KEY. */
  apiKey?: string;
  via: 'oauth' | 'api-key';
}

/**
 * Resolves the Bearer token on an /mcp request: an OAuth access token from
 * /oauth/token, or a plain Mediamake API key for clients configured with a
 * header (claude mcp add --header, Cursor, scripts).
 */
export async function resolveMcpCaller(bearer: string | undefined): Promise<McpCaller | null> {
  if (!bearer) return null;
  const { access, apiKeys } = stores();
  const grant = await access.get(sha256(bearer));
  if (grant && grant.expires > Date.now()) {
    const apiKey = await currentApiKey(grant);
    return apiKey === null ? null : { clientId: grant.clientId, apiKey, via: 'oauth' };
  }
  const key = await apiKeys.get(bearer);
  if (key?.isValid) return { clientId: key.clientId, apiKey: key.apiKey, via: 'api-key' };
  return null;
}
