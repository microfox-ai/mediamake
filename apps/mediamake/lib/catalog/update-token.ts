import { Redis } from '@upstash/redis';
import { createHash, randomBytes } from 'crypto';

/**
 * Update tokens keep installed items up to date without an install code each
 * time. At the end of an install, install.md trades the install code for one
 * (POST /api/catalog/update-token) and saves it in ~/.mediamake/config.json
 * as `updateToken`. Installed MCPs use it to check for new versions on their
 * own, and Claude uses it when someone says "update <item>".
 *
 * A token stands for one person and the items installed with it (plus their
 * dependencies). It is only accepted by GET /api/catalog/versions and
 * GET /api/catalog/install, and only for those items; the person's access is
 * still checked on every call, so revoking a grant stops updates too. Only
 * its hash is stored. It lapses after UPDATE_TOKEN_SECONDS without use.
 */
export const UPDATE_TOKEN_PREFIX = 'mmu_';
export const UPDATE_TOKEN_SECONDS = 365 * 24 * 60 * 60;
/** Using a token renews it, at most this often. */
const RENEW_AFTER_MS = 24 * 60 * 60 * 1000;

export interface UpdateToken {
  clientId: string;
  /** Item ids it may check and install, e.g. `mcp/browse-hack`. */
  items: string[];
  createdAt: string;
  usedAt: string;
}

function redis() {
  return new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL!,
    token: process.env.UPSTASH_REDIS_REST_TOKEN!,
  });
}

const keyFor = (token: string) => `catalog:update-token:${createHash('sha256').update(token).digest('hex')}`;

export function isUpdateToken(value: string | null | undefined): value is string {
  return !!value && value.startsWith(UPDATE_TOKEN_PREFIX);
}

/** A live token's record, renewing it when it was last used over a day ago. */
export async function readUpdateToken(token: string): Promise<UpdateToken | null> {
  if (!isUpdateToken(token)) return null;
  const record = await redis().get<UpdateToken>(keyFor(token));
  if (!record) return null;
  if (Date.now() - Date.parse(record.usedAt) > RENEW_AFTER_MS) {
    const renewed = { ...record, usedAt: new Date().toISOString() };
    await redis().set(keyFor(token), renewed, { ex: UPDATE_TOKEN_SECONDS });
    return renewed;
  }
  return record;
}

/**
 * A token for `clientId` covering `items`. Passing the token saved on the
 * machine adds the items to it (one token per machine); a lapsed one, or one
 * of another person, is replaced by a new token.
 */
export async function issueUpdateToken(clientId: string, items: string[], existing?: string) {
  const now = new Date().toISOString();
  const current = existing ? await readUpdateToken(existing) : null;
  const token = current?.clientId === clientId ? existing! : UPDATE_TOKEN_PREFIX + randomBytes(24).toString('base64url');
  const record: UpdateToken = {
    clientId,
    items: [...new Set([...(current?.clientId === clientId ? current.items : []), ...items])].sort(),
    createdAt: current?.clientId === clientId ? current.createdAt : now,
    usedAt: now,
  };
  await redis().set(keyFor(token), record, { ex: UPDATE_TOKEN_SECONDS });
  return { token, items: record.items };
}
