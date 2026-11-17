import { createHmac, timingSafeEqual } from 'crypto';
import { repoName } from './space';

/**
 * What GitHub tells MediaMake's GitHub App (./github), so a space stays true
 * when something changes on GitHub instead of in MediaMake:
 *
 * - an owner revoked the App's authorization, or removed the App from their
 *   account: their connection here is forgotten, so the page offers Connect
 *   GitHub again instead of failing on the next invitation;
 * - a space's repo was renamed or moved to another account: the space
 *   follows it, and computers still on the old name keep reporting;
 * - a space's repo was deleted: the space is forgotten, so the next share
 *   makes a new one.
 *
 * GitHub signs each delivery with the App's webhook secret; nothing is read
 * from one whose signature does not match. Only ids and names are taken from
 * a delivery, never a token.
 *
 *   GITHUB_APP_WEBHOOK_SECRET   the App's webhook secret
 */

export const webhookSecret = (env: NodeJS.ProcessEnv = process.env) => env.GITHUB_APP_WEBHOOK_SECRET?.trim() || null;

/** GitHub's `X-Hub-Signature-256` for a body: `sha256=<hex HMAC-SHA-256 of the raw body>`. */
export const signatureOf = (body: string, secret: string) => `sha256=${createHmac('sha256', secret).update(body, 'utf8').digest('hex')}`;

/** Whether a delivery's signature is the one this secret gives its raw body. */
export function signatureOk(body: string, header: string | null | undefined, secret: string): boolean {
  if (!header || !secret) return false;
  const shown = Buffer.from(header.trim());
  const expected = Buffer.from(signatureOf(body, secret));
  return shown.length === expected.length && timingSafeEqual(shown, expected);
}

/** What a delivery asks for. */
export type HookAct =
  /** Forget the connection of that GitHub account. `revoke`: also take the authorization back at GitHub (it still stands when only the App was removed). */
  | { do: 'forget-grant'; githubId: string; revoke: boolean }
  /** The same repo under a new name or a new owner. */
  | { do: 'rename-repo'; from: string; to: string }
  | { do: 'forget-repo'; repo: string };

const record = (value: unknown): Record<string, unknown> => (value && typeof value === 'object' ? (value as Record<string, unknown>) : {});
const id = (value: unknown): string | null => (typeof value === 'number' && Number.isSafeInteger(value) && value > 0 ? String(value) : null);
const text = (value: unknown): string | null => (typeof value === 'string' && value ? value : null);

/** Reads one delivery: the event (GitHub's `X-GitHub-Event`) and its parsed body. Null: nothing to do. */
export function readHook(event: string | null | undefined, payload: unknown): HookAct | null {
  const body = record(payload);
  const action = text(body.action);

  if (event === 'github_app_authorization' && action === 'revoked') {
    const githubId = id(record(body.sender).id);
    return githubId ? { do: 'forget-grant', githubId, revoke: false } : null;
  }

  if (event === 'installation' && action === 'deleted') {
    const githubId = id(record(record(body.installation).account).id);
    return githubId ? { do: 'forget-grant', githubId, revoke: true } : null;
  }

  if (event === 'repository') {
    const repository = record(body.repository);
    const now = repoName(repository.full_name);
    const name = text(repository.name);
    const owner = text(record(repository.owner).login);
    if (!now) return null;
    if (action === 'deleted') return { do: 'forget-repo', repo: now };
    const changes = record(body.changes);
    if (action === 'renamed') {
      const was = text(record(record(changes.repository).name).from);
      const from = was && owner ? repoName(`${owner}/${was}`) : null;
      return from && from !== now ? { do: 'rename-repo', from, to: now } : null;
    }
    if (action === 'transferred') {
      const before = record(record(changes.owner).from);
      const was = text(record(before.user).login) ?? text(record(before.organization).login);
      const from = was && name ? repoName(`${was}/${name}`) : null;
      return from && from !== now ? { do: 'rename-repo', from, to: now } : null;
    }
  }

  return null;
}
