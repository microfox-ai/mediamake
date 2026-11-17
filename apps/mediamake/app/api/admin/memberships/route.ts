import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdmin } from '@/lib/admin-utils';
import { listAccounts } from '@/lib/auth/accounts';
import { catalogIndex } from '@/lib/catalog/admin-index';
import { accessGroupsDB, accessRequestsDB } from '@/lib/catalog/store';
import { NETWORK_GROUP, PRIVATE_GROUP } from '@/lib/catalog/types';
import { mailConfigured } from '@/lib/mail/send';
import { adminsAmong, changeTier, grantContribution, listKeyHolders, makePermanent, resolveRequest } from '@/lib/memberships/admin';
import { auditLog } from '@/lib/memberships/audit';
import { buildPeople } from '@/lib/memberships/people';
import { membershipsDB } from '@/lib/memberships/store';
import { pullKey, suggestGrants, SUGGESTED_TIER } from '@/lib/memberships/suggestions';
import { recentMergedPulls, suggestionsDB } from '@/lib/memberships/suggestions-store';
import { GRANTABLE_TIERS } from '@/lib/memberships/tiers';
import { publicOrigin } from '@/lib/mcp/oauth';

/**
 * Manage Memberships, for admins (behind the middleware, so x-client-id is
 * the caller).
 *
 * GET   everyone with their tier and how they got it, pending requests and the
 *       audit log (lib/memberships/people and /audit). There are no invites: a
 *       membership is applied for (a contribution, reviewed) or given by an admin.
 * POST  { type: 'set_tier', clientId, tier, reason, source?, ref?, days?, permanent?, notify? }
 *         puts a person at one tier. A reason is required here: it is what the audit log shows.
 *       { type: 'make_permanent', membershipId, notify? }
 *       { type: 'resolve_request', requestId, approve, note?, days?, notify? }
 *       { type: 'confirm_suggestion', clientId, pull, notify? }
 *         gives Plus for 3 months for a merged pull request (`pull` is owner/name#12, from `suggestions`).
 *       { type: 'dismiss_suggestion', pulls }
 *         stops suggesting those pull requests.
 *
 * `suggestions` in the GET: merged pull requests on the public repositories by people whose account
 * has that GitHub account linked, which no membership counts yet (lib/memberships/suggestions).
 *
 * The changes themselves are lib/memberships/admin, shared with
 * /api/admin/catalog (Releases, mm-release, `npm run catalog`). Linking an
 * old account stays on /api/admin/users.
 */
async function admin(req: NextRequest) {
  try {
    return await requireAdmin(req);
  } catch {
    return null;
  }
}

const forbidden = () => NextResponse.json({ error: 'Admin access required' }, { status: 403 });
const bad = (error: string) => NextResponse.json({ error }, { status: 400 });

/** Nothing here is worth losing the page for: a store that fails gives an empty list. */
async function safely<T>(what: string, load: Promise<T>, fallback: T): Promise<T> {
  try {
    return await load;
  } catch (error) {
    console.error(`[admin/memberships] Could not load ${what}:`, error);
    return fallback;
  }
}

export async function GET(req: NextRequest) {
  if (!(await admin(req))) return forbidden();

  const [accounts, keyHolders, memberships, groups, requests, titles, merged, dismissed] = await Promise.all([
    safely('accounts', listAccounts(), []),
    listKeyHolders(),
    safely('memberships', membershipsDB.list({ includeEnded: true }), []),
    safely('groups', accessGroupsDB.list(), []),
    safely('requests', accessRequestsDB.list(), []),
    safely(
      'item titles',
      catalogIndex().then(index => Object.fromEntries([...index.byId].map(([id, item]) => [id, item.title]))),
      {} as Record<string, string>,
    ),
    safely('merged pull requests', recentMergedPulls({ fresh: req.nextUrl.searchParams.get('fresh') === 'true' }), { pulls: [], problems: ['Merged pull requests could not be read'] }),
    safely('dismissed suggestions', suggestionsDB.dismissed(), []),
  ]);
  const members = (groupId: string) => groups.find(group => group.groupId === groupId)?.members ?? [];
  const everyone = [...new Set([...accounts.map(a => a.clientId), ...keyHolders.map(k => k.clientId), ...memberships.map(m => m.clientId)])];
  const people = buildPeople({
    accounts,
    keyHolders,
    memberships,
    legacy: { private: members(PRIVATE_GROUP), community: members(NETWORK_GROUP) },
    admins: await adminsAmong(everyone),
  });

  return NextResponse.json({
    people,
    requests: requests.filter(request => request.status === 'pending'),
    audit: auditLog({ memberships, requests }),
    suggestions: suggestGrants({ pulls: merged.pulls, people, dismissed }),
    suggestionProblems: merged.problems,
    titles,
    mail: mailConfigured(),
  });
}

const text = (max: number) => z.string().trim().max(max);
const days = z.coerce.number().int().min(1).max(3650);
const tier = z.enum(GRANTABLE_TIERS as [string, ...string[]]);

const actions = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('set_tier'),
    clientId: text(200).min(1),
    tier: z.union([tier, z.literal('public')]),
    reason: text(500).min(1, 'Say why: the audit log keeps it'),
    source: z.enum(['admin', 'contribution']).default('admin'),
    ref: text(500).optional(),
    days: days.optional(),
    permanent: z.boolean().optional(),
    notify: z.boolean().optional(),
  }),
  z.object({ type: z.literal('make_permanent'), membershipId: text(100).min(1), notify: z.boolean().optional() }),
  z.object({
    type: z.literal('resolve_request'),
    requestId: text(100).min(1),
    approve: z.boolean(),
    note: text(500).optional(),
    days: days.optional(),
    notify: z.boolean().optional(),
  }),
  z.object({ type: z.literal('confirm_suggestion'), clientId: text(200).min(1), pull: text(200).regex(/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+#\d+$/, 'pull must be owner/name#12'), notify: z.boolean().optional() }),
  z.object({ type: z.literal('dismiss_suggestion'), pulls: z.array(text(200).regex(/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+#\d+$/)).min(1).max(50) }),
]);

export async function POST(req: NextRequest) {
  const adminId = await admin(req);
  if (!adminId) return forbidden();

  const parsed = actions.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return bad(parsed.error.issues[0]?.message ?? 'Bad request');
  const body = parsed.data;
  const origin = publicOrigin(req);

  try {
    switch (body.type) {
      case 'set_tier': {
        const changed = await changeTier({
          clientId: body.clientId,
          tier: body.tier as (typeof GRANTABLE_TIERS)[number] | 'public',
          source: body.source,
          ref: body.ref || undefined,
          note: body.reason,
          days: body.permanent ? undefined : body.days,
          permanent: body.permanent,
          by: adminId,
          origin,
          notify: body.notify,
        });
        return NextResponse.json(changed);
      }

      case 'make_permanent': {
        const made = await makePermanent({ membershipId: body.membershipId, by: adminId, origin, notify: body.notify });
        return made ? NextResponse.json(made) : NextResponse.json({ error: 'No live membership with that id' }, { status: 404 });
      }

      case 'resolve_request': {
        const resolved = await resolveRequest({ ...body, note: body.note || undefined, by: adminId, origin });
        return resolved ? NextResponse.json(resolved) : NextResponse.json({ error: 'No pending request with that id' }, { status: 404 });
      }

      case 'confirm_suggestion': {
        // only a pull request GitHub says that person merged: the page's list is not trusted
        const [{ pulls }, account] = await Promise.all([recentMergedPulls(), listAccounts().then(accounts => accounts.find(entry => entry.clientId === body.clientId))]);
        const pull = pulls.find(entry => pullKey(entry) === body.pull);
        if (!pull || !account?.githubLogin || pull.login.toLowerCase() !== account.githubLogin.toLowerCase()) {
          return NextResponse.json({ error: 'That pull request is not a merged one by this person' }, { status: 404 });
        }
        const granted = await grantContribution({ clientId: body.clientId, tier: SUGGESTED_TIER, ref: pull.url, note: `Merged ${pullKey(pull)}: ${pull.title}`.slice(0, 500), by: adminId, origin, notify: body.notify });
        if (!granted.membership) return bad(granted.why ?? 'Nothing to give');
        return NextResponse.json(granted);
      }

      case 'dismiss_suggestion': {
        await suggestionsDB.dismiss(body.pulls, adminId);
        return NextResponse.json({ success: true });
      }
    }
  } catch (error) {
    console.error('[admin/memberships]', error);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}
