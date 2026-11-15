import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdmin } from '@/lib/admin-utils';
import { listAccounts } from '@/lib/auth/accounts';
import { catalogIndex } from '@/lib/catalog/admin-index';
import { accessGroupsDB, accessInvitesDB, accessRequestsDB } from '@/lib/catalog/store';
import { NETWORK_GROUP, PRIVATE_GROUP } from '@/lib/catalog/types';
import { mailConfigured } from '@/lib/mail/send';
import { adminsAmong, changeTier, inviteByMail, inviteLink, listKeyHolders, makePermanent, resolveRequest } from '@/lib/memberships/admin';
import { auditLog } from '@/lib/memberships/audit';
import { buildPeople } from '@/lib/memberships/people';
import { membershipsDB } from '@/lib/memberships/store';
import { GRANTABLE_TIERS } from '@/lib/memberships/tiers';
import { publicOrigin } from '@/lib/mcp/oauth';

/**
 * Manage Memberships, for admins (behind the middleware, so x-client-id is
 * the caller).
 *
 * GET   everyone with their tier and how they got it, pending requests, live
 *       invites and the audit log (lib/memberships/people and /audit).
 * POST  { type: 'set_tier', clientId, tier, reason, source?, ref?, days?, permanent?, notify? }
 *         puts a person at one tier. A reason is required here: it is what the audit log shows.
 *       { type: 'make_permanent', membershipId, notify? }
 *       { type: 'invite', tier, email?, note?, grantDays? }
 *         with an email, mails a link that works once; without, makes a link for up to `maxUses` people.
 *       { type: 'disable_invite', code }
 *       { type: 'resolve_request', requestId, approve, note?, days?, notify? }
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

  const [accounts, keyHolders, memberships, groups, invites, requests, titles] = await Promise.all([
    safely('accounts', listAccounts(), []),
    listKeyHolders(),
    safely('memberships', membershipsDB.list({ includeEnded: true }), []),
    safely('groups', accessGroupsDB.list(), []),
    safely('invites', accessInvitesDB.list(), []),
    safely('requests', accessRequestsDB.list(), []),
    safely(
      'item titles',
      catalogIndex().then(index => Object.fromEntries([...index.byId].map(([id, item]) => [id, item.title]))),
      {} as Record<string, string>,
    ),
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

  const now = new Date().toISOString();
  const origin = publicOrigin(req);
  return NextResponse.json({
    people,
    requests: requests.filter(request => request.status === 'pending'),
    // invites into a membership; the ones that only open items are on Releases
    invites: invites
      .filter(invite => invite.tier && !invite.disabledAt && invite.uses < invite.maxUses && (!invite.expiresAt || invite.expiresAt > now))
      .map(invite => ({ ...invite, url: inviteLink(origin, invite.code) })),
    audit: auditLog({ memberships, invites, requests }),
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
    type: z.literal('invite'),
    tier,
    email: z.union([z.literal(''), text(254).email('That is not an email address')]).optional(),
    note: text(500).optional(),
    grantDays: days.optional(),
    maxUses: z.coerce.number().int().min(1).max(100).optional(),
  }),
  z.object({ type: z.literal('disable_invite'), code: text(100).min(1) }),
  z.object({
    type: z.literal('resolve_request'),
    requestId: text(100).min(1),
    approve: z.boolean(),
    note: text(500).optional(),
    days: days.optional(),
    notify: z.boolean().optional(),
  }),
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

      case 'invite': {
        const inviteTier = body.tier as (typeof GRANTABLE_TIERS)[number];
        if (body.email) {
          return NextResponse.json(
            await inviteByMail({ email: body.email, tier: inviteTier, note: body.note || undefined, grantDays: body.grantDays, by: adminId, origin }),
          );
        }
        const invite = await accessInvitesDB.create({
          itemIds: [],
          tier: inviteTier,
          maxUses: body.maxUses ?? 10,
          grantDays: body.grantDays,
          expiresAt: new Date(Date.now() + 30 * 86_400_000).toISOString(),
          createdBy: adminId,
          note: body.note || undefined,
        });
        return NextResponse.json({ invite, url: inviteLink(origin, invite.code) });
      }

      case 'disable_invite': {
        await accessInvitesDB.disable(body.code);
        return NextResponse.json({ success: true });
      }

      case 'resolve_request': {
        const resolved = await resolveRequest({ ...body, note: body.note || undefined, by: adminId, origin });
        return resolved ? NextResponse.json(resolved) : NextResponse.json({ error: 'No pending request with that id' }, { status: 404 });
      }
    }
  } catch (error) {
    console.error('[admin/memberships]', error);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}
