import type { Device } from '@/lib/auth/device';
import { SESSION_TTL_SECONDS, deleteWebSessions, listWebSessions } from '@/lib/auth/session';
import {
  REFRESH_TTL_SECONDS,
  getClient,
  listOAuthSessions,
  revokeGrants,
  sha256,
  type Grant,
} from '@/lib/mcp/oauth';

/**
 * Everywhere an account is signed in, for the devices page (/api/devices):
 *
 * - apps signed in with OAuth (the Browse Hack extension, one per Chrome
 *   profile; the Claude connector; any other client), one per OAuthSession;
 * - apps signed in before sessions were tracked, from their refresh tokens,
 *   until their next refresh gives them a session;
 * - website logins (the session_token cookie).
 *
 * Revoking signs the device out on its next request.
 */
export interface SignedInDevice {
  /** Opaque, never a token or cookie. */
  id: string;
  kind: 'app' | 'website';
  /** The Mediamake user. */
  clientId: string;
  /** The app's registered name, or "MediaMake website". */
  name: string;
  oauthClientId?: string;
  device: Device;
  createdAt?: number;
  /** Apps: sign-in or last refresh (about hourly while in use). Unknown for website logins. */
  lastUsedAt?: number;
  /** When it signs out by itself: apps after 30 days unused, website logins 7 days after signing in. */
  expires: number;
  /** Signed in before devices were tracked, so there's less to show. */
  untracked?: boolean;
  /** The website login making this request. */
  current?: boolean;
}

interface Entry {
  device: SignedInDevice;
  sessionId?: string;
  webToken?: string;
}

const pair = (g: Pick<Grant, 'oauthClientId' | 'clientId'>) => `${g.oauthClientId} ${g.clientId}`;

async function entries(currentWebToken?: string): Promise<Entry[]> {
  const [{ sessions, untracked }, web] = await Promise.all([listOAuthSessions(), listWebSessions()]);
  const out: Entry[] = [];

  for (const s of sessions) {
    out.push({
      sessionId: s.id,
      device: {
        id: `app:${s.id}`,
        kind: 'app',
        clientId: s.clientId,
        name: s.clientName,
        oauthClientId: s.oauthClientId,
        device: s.device ?? {},
        createdAt: s.createdAt,
        lastUsedAt: s.lastUsedAt,
        expires: s.lastUsedAt + REFRESH_TTL_SECONDS * 1000,
      },
    });
  }

  // One row per app install and user: its latest refresh token.
  const latest = new Map<string, Grant>();
  for (const g of untracked) {
    const seen = latest.get(pair(g));
    if (!seen || g.expires > seen.expires) latest.set(pair(g), g);
  }
  const clients = await Promise.all([...latest.values()].map(g => getClient(g.oauthClientId)));
  [...latest.values()].forEach((g, i) => {
    out.push({
      device: {
        id: `app-old:${sha256(pair(g)).slice(0, 22)}`,
        kind: 'app',
        clientId: g.clientId,
        name: clients[i]?.clientName ?? 'Removed app',
        oauthClientId: g.oauthClientId,
        device: {},
        // A refresh token is issued for 30 days, at sign-in or the last refresh.
        lastUsedAt: g.expires - REFRESH_TTL_SECONDS * 1000,
        expires: g.expires,
        untracked: true,
      },
    });
  });

  const current = currentWebToken ? sha256(currentWebToken) : undefined;
  for (const { token, session } of web) {
    const id = sha256(token);
    out.push({
      webToken: token,
      device: {
        id: `web:${id}`,
        kind: 'website',
        clientId: session.clientId,
        name: 'MediaMake website',
        device: session.device ?? {},
        createdAt: session.createdAt ?? session.expires - SESSION_TTL_SECONDS * 1000,
        expires: session.expires,
        untracked: !session.device,
        current: id === current || undefined,
      },
    });
  }

  const recent = (d: SignedInDevice) => d.lastUsedAt ?? d.createdAt ?? 0;
  return out.sort(
    (a, b) => Number(!!b.device.current) - Number(!!a.device.current) || recent(b.device) - recent(a.device),
  );
}

export async function findDevices(
  filter: (device: SignedInDevice) => boolean,
  currentWebToken?: string,
): Promise<{ devices: SignedInDevice[]; revoke: () => Promise<void> }> {
  const found = (await entries(currentWebToken)).filter(e => filter(e.device));
  return { devices: found.map(e => e.device), revoke: () => revokeEntries(found) };
}

async function revokeEntries(found: Entry[]) {
  const sessionIds = new Set(found.flatMap(e => (e.sessionId ? [e.sessionId] : [])));
  // Tokens from before sessions were tracked carry no sessionId; they go with
  // their app install and user, whether listed as their own row or already
  // moved to a session by a refresh (access tokens issued before it last an hour).
  const pairs = new Set(
    found.flatMap(e => (e.device.kind === 'app' ? [pair({ oauthClientId: e.device.oauthClientId!, clientId: e.device.clientId })] : [])),
  );
  const webTokens = found.flatMap(e => (e.webToken ? [e.webToken] : []));
  await Promise.all([
    pairs.size > 0 &&
      revokeGrants([...sessionIds], g => (g.sessionId ? sessionIds.has(g.sessionId) : pairs.has(pair(g)))),
    webTokens.length > 0 && deleteWebSessions(webTokens),
  ]);
}
