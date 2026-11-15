import { createHash, randomBytes } from 'crypto';

/**
 * Continue with Google and Continue with GitHub: the OAuth code flow, with
 * fetch. A provider is on when its client id and secret are set
 * (GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET, GITHUB_CLIENT_ID /
 * GITHUB_CLIENT_SECRET); its callback is /api/auth/<provider>/callback.
 */

export const PROVIDERS = ['google', 'github'] as const;
export type ProviderId = (typeof PROVIDERS)[number];

export const isProvider = (value: string): value is ProviderId => (PROVIDERS as readonly string[]).includes(value);

export const PROVIDER_NAMES: Record<ProviderId, string> = { google: 'Google', github: 'GitHub' };

/** Who the provider says the person is. */
export interface Identity {
  provider: ProviderId;
  /** The provider's own id for the account, never reused. */
  id: string;
  /** Lowercase, and only when the provider has verified it. */
  email?: string;
  name?: string;
  avatarUrl?: string;
  /** GitHub login. */
  login?: string;
}

function credentials(provider: ProviderId) {
  const prefix = provider.toUpperCase();
  const clientId = process.env[`${prefix}_CLIENT_ID`]?.trim();
  const clientSecret = process.env[`${prefix}_CLIENT_SECRET`]?.trim();
  return clientId && clientSecret ? { clientId, clientSecret } : null;
}

export const providerConfigured = (provider: ProviderId) => credentials(provider) !== null;

export const configuredProviders = (): Record<ProviderId, boolean> => ({
  google: providerConfigured('google'),
  github: providerConfigured('github'),
});

export const callbackUrl = (origin: string, provider: ProviderId) => `${origin}/api/auth/${provider}/callback`;

export const newCodeVerifier = () => randomBytes(32).toString('base64url');
const challengeOf = (verifier: string) => createHash('sha256').update(verifier).digest('base64url');

const ENDPOINTS: Record<ProviderId, { authorize: string; token: string; scope: string }> = {
  google: {
    authorize: 'https://accounts.google.com/o/oauth2/v2/auth',
    token: 'https://oauth2.googleapis.com/token',
    scope: 'openid email profile',
  },
  github: {
    authorize: 'https://github.com/login/oauth/authorize',
    token: 'https://github.com/login/oauth/access_token',
    scope: 'read:user user:email',
  },
};

/** Where to send the browser. `state` comes back on the callback. */
export function authorizeUrl(
  provider: ProviderId,
  { origin, state, codeVerifier }: { origin: string; state: string; codeVerifier: string },
): string {
  const creds = credentials(provider);
  if (!creds) throw new Error(`${PROVIDER_NAMES[provider]} sign-in is not set up`);
  const url = new URL(ENDPOINTS[provider].authorize);
  url.searchParams.set('client_id', creds.clientId);
  url.searchParams.set('redirect_uri', callbackUrl(origin, provider));
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', ENDPOINTS[provider].scope);
  url.searchParams.set('state', state);
  url.searchParams.set('code_challenge', challengeOf(codeVerifier));
  url.searchParams.set('code_challenge_method', 'S256');
  // Always let the person pick which Google account.
  if (provider === 'google') url.searchParams.set('prompt', 'select_account');
  return url.toString();
}

async function json(response: Response, what: string) {
  const body = (await response.json().catch(() => null)) as Record<string, unknown> | unknown[] | null;
  if (!response.ok || !body || (!Array.isArray(body) && body.error)) {
    throw new Error(`${what} failed (${response.status})`);
  }
  return body;
}

async function accessToken(provider: ProviderId, origin: string, code: string, codeVerifier: string) {
  const creds = credentials(provider);
  if (!creds) throw new Error(`${PROVIDER_NAMES[provider]} sign-in is not set up`);
  const response = await fetch(ENDPOINTS[provider].token, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded', accept: 'application/json' },
    body: new URLSearchParams({
      client_id: creds.clientId,
      client_secret: creds.clientSecret,
      code,
      code_verifier: codeVerifier,
      redirect_uri: callbackUrl(origin, provider),
      grant_type: 'authorization_code',
    }),
  });
  const body = (await json(response, 'Token exchange')) as { access_token?: string };
  if (!body.access_token) throw new Error('Token exchange returned no access token');
  return body.access_token;
}

const text = (value: unknown) => (typeof value === 'string' && value.trim() ? value.trim() : undefined);

async function googleIdentity(token: string): Promise<Identity> {
  const response = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
    headers: { authorization: `Bearer ${token}` },
  });
  const info = (await json(response, 'Google profile')) as Record<string, unknown>;
  if (!text(info.sub)) throw new Error('Google profile has no id');
  const verified = info.email_verified === true || info.email_verified === 'true';
  return {
    provider: 'google',
    id: text(info.sub)!,
    email: verified ? text(info.email)?.toLowerCase() : undefined,
    name: text(info.name),
    avatarUrl: text(info.picture),
  };
}

async function githubIdentity(token: string): Promise<Identity> {
  const headers = {
    authorization: `Bearer ${token}`,
    accept: 'application/vnd.github+json',
    'user-agent': 'mediamake-sign-in',
  };
  const [profileResponse, emailsResponse] = await Promise.all([
    fetch('https://api.github.com/user', { headers }),
    fetch('https://api.github.com/user/emails', { headers }),
  ]);
  const profile = (await json(profileResponse, 'GitHub profile')) as Record<string, unknown>;
  if (profile.id === undefined || profile.id === null) throw new Error('GitHub profile has no id');
  // The profile's email may be unverified or hidden: take the primary verified one.
  const emails = emailsResponse.ok
    ? (((await emailsResponse.json().catch(() => [])) as { email?: string; primary?: boolean; verified?: boolean }[]) ?? [])
    : [];
  const verified = Array.isArray(emails) ? emails.filter(e => e.verified && e.email) : [];
  const email = (verified.find(e => e.primary) ?? verified[0])?.email?.toLowerCase();
  return {
    provider: 'github',
    id: String(profile.id),
    email,
    name: text(profile.name) ?? text(profile.login),
    avatarUrl: text(profile.avatar_url),
    login: text(profile.login),
  };
}

/** Trades the callback's code for the person's identity. */
export async function identityFromCode(
  provider: ProviderId,
  { origin, code, codeVerifier }: { origin: string; code: string; codeVerifier: string },
): Promise<Identity> {
  const token = await accessToken(provider, origin, code, codeVerifier);
  return provider === 'google' ? googleIdentity(token) : githubIdentity(token);
}
