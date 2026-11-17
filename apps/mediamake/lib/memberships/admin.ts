import { CrudHash } from '@microfox/db-upstash';
import { Redis } from '@upstash/redis';
import type { ApiKeyInfo } from '@/app/types/db';
import { getEntitlements, viewerTier } from '@/lib/access';
import { isAdmin } from '@/lib/admin-utils';
import { getUserByClientId, getUserByEmail, normalizeEmail } from '@/lib/auth/users';
import { accessGrantsDB, accessGroupsDB, accessInvitesDB, accessRequestsDB } from '@/lib/catalog/store';
import { NETWORK_GROUP, PRIVATE_GROUP, type AccessGrant, type AccessInvite, type AccessRequest } from '@/lib/catalog/types';
import { MailNotConfiguredError, sendMail, type Mail } from '@/lib/mail/send';
import { inviteMail, membershipChangedMail } from '@/lib/mail/templates';
import type { Membership, MembershipSource } from './membership';
import { requestedTier } from './requests';
import { membershipsDB } from './store';
import { tierLabel, tierRank, type GrantableTier, type MemberTier } from './tiers';

/**
 * What an admin does to memberships, in one place, so the page
 * (/api/admin/memberships), Releases, mm-release and `npm run catalog`
 * (/api/admin/catalog) all do the same thing and the person hears about it
 * the same way: a change, then its mail.
 *
 * Mail never fails a change. When it can't be sent (no address on the
 * account, no RESEND_API_KEY, Resend refused it) the change still holds and
 * the answer says why the mail did not go.
 */

/** Whether the person was told, and when not, why. */
export interface Mailed {
  sent: boolean;
  /** The address it went to. */
  to?: string;
  /** Why no mail went, in words an admin can act on. */
  why?: string;
}

/** Sends one mail and says whether it went. Never throws. */
export async function deliver(mail: Mail): Promise<Mailed> {
  try {
    const { sent } = await sendMail(mail);
    return sent ? { sent: true, to: mail.to } : { sent: false, to: mail.to, why: 'Mail is not set up here (RESEND_API_KEY), so it was printed to the server log' };
  } catch (error) {
    if (!(error instanceof MailNotConfiguredError)) console.error('[memberships] Could not send mail:', error);
    return { sent: false, to: mail.to, why: error instanceof MailNotConfiguredError ? 'Mail is not set up yet (RESEND_API_KEY)' : 'The mail could not be sent' };
  }
}

const day = (iso: string) => new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });

/** How long a membership lasts, as the mail says it. */
export function lastsInWords(membership: Pick<Membership, 'expiresAt' | 'permanent' | 'source'>): string {
  if (membership.expiresAt) {
    return `until ${day(membership.expiresAt)}${membership.source === 'contribution' ? ' (contributing again renews it)' : ''}`;
  }
  return 'with no end date';
}

/** The tier a person holds right now, as the access check sees it. */
export async function tierOf(clientId: string): Promise<MemberTier> {
  return viewerTier(await getEntitlements({ clientId }));
}

/** Tells a person their membership changed. Admins are not mailed: their access does not change. */
async function tellPerson(input: {
  clientId: string;
  from: MemberTier;
  to: MemberTier;
  membership: Membership | null;
  reason?: string;
  origin: string;
}): Promise<Mailed> {
  if (input.from === 'admin') return { sent: false, why: 'They are an admin, so nothing changes for them' };
  const user = await getUserByClientId(input.clientId).catch(() => null);
  if (!user?.email) return { sent: false, why: 'The account has no email yet' };
  return deliver(
    membershipChangedMail(user.email, {
      from: tierLabel(input.from),
      to: tierLabel(input.to),
      lasts: input.membership ? lastsInWords(input.membership) : undefined,
      reason: input.reason,
      url: `${input.origin}/app/subscription`,
    }),
  );
}

export interface ChangeTierInput {
  clientId: string;
  tier: GrantableTier | 'public';
  source?: MembershipSource;
  ref?: string;
  /** Why: kept on the record, shown in the audit log and in the mail. */
  note?: string;
  days?: number;
  expiresAt?: string;
  permanent?: boolean;
  /** The admin doing it. */
  by?: string;
  /** The site's address, for the link in the mail. */
  origin: string;
  /** False to change it without mailing the person. */
  notify?: boolean;
}

/**
 * Puts a person at one tier: their live records end (kept, with who and why)
 * and one new record gives the tier, unless it is Public. The earlier tiers
 * go too (both groups, a grant of everything), so the new one holds.
 */
export async function changeTier(input: ChangeTierInput): Promise<{ tier: GrantableTier | 'public'; membership: Membership | null; mailed: Mailed }> {
  const { clientId, tier, by, origin, notify, source = 'admin', ...rest } = input;
  const from = await tierOf(clientId);
  const membership = await membershipsDB.setTier({ ...rest, clientId, tier, source, grantedBy: by });
  await accessGroupsDB.removeMembers(PRIVATE_GROUP, [clientId]);
  await accessGroupsDB.removeMembers(NETWORK_GROUP, [clientId]);
  await accessGrantsDB.revokeFor('*', { kind: 'client', id: clientId }, by);
  const mailed =
    notify === false
      ? { sent: false, why: 'You chose not to mail them' }
      : await tellPerson({ clientId, from, to: tier, membership, reason: input.note, origin });
  return { tier, membership, mailed };
}

/** An admin makes a live membership permanent: no expiry, until an admin removes it. */
export async function makePermanent(input: { membershipId: string; by?: string; origin: string; notify?: boolean }): Promise<{ membership: Membership; mailed: Mailed } | null> {
  const membership = await membershipsDB.makePermanent(input.membershipId, input.by);
  if (!membership) return null;
  const mailed =
    input.notify === false
      ? { sent: false, why: 'You chose not to mail them' }
      : await tellPerson({ clientId: membership.clientId, from: membership.tier, to: membership.tier, membership, origin: input.origin });
  return { membership, mailed };
}

/**
 * A contribution earns a membership: an accepted store submission, or a
 * merged pull request an admin confirmed. It adds one record (source
 * `contribution`, `ref` naming what earned it) that lasts CONTRIBUTION_MONTHS,
 * and nothing the person already holds ends, so contributing again renews it
 * and a contribution never lowers anyone. Nothing is added for an admin, or
 * for someone who already holds as much with no end date.
 */
export async function grantContribution(input: {
  clientId: string;
  tier: GrantableTier;
  /** What earned it: a catalog item id or a pull request's link. */
  ref: string;
  note?: string;
  by?: string;
  origin: string;
  /** False to leave the mail to the caller (a submission says it in its own mail). */
  notify?: boolean;
}): Promise<{ membership: Membership | null; why?: string; renewed: boolean; mailed?: Mailed }> {
  if (await isAdmin(input.clientId).catch(() => false)) return { membership: null, why: 'They are an admin, so there is nothing to give', renewed: false };
  const live = await membershipsDB.liveFor(input.clientId);
  const lasting = live.find(held => !held.expiresAt && tierRank(held.tier) >= tierRank(input.tier));
  if (lasting) return { membership: null, why: `They already hold ${tierLabel(lasting.tier)} with no end date`, renewed: false };
  const from = await tierOf(input.clientId);
  const membership = await membershipsDB.grant({ clientId: input.clientId, tier: input.tier, source: 'contribution', ref: input.ref, note: input.note, grantedBy: input.by });
  const renewed = tierRank(from) >= tierRank(input.tier);
  const mailed =
    input.notify === false
      ? undefined
      : await tellPerson({ clientId: input.clientId, from, to: renewed ? from : input.tier, membership, reason: input.note, origin: input.origin });
  return { membership, renewed, mailed };
}

/** A membership a person got by themselves (an invite they opened): told like any other change. */
export async function tellAboutNewMembership(input: { clientId: string; from: MemberTier; membership: Membership; origin: string }): Promise<Mailed> {
  // an invite never moves anyone down: say nothing when they already hold as much
  if (tierRank(input.from) >= tierRank(input.membership.tier)) return { sent: false, why: 'Their membership did not change' };
  return tellPerson({ clientId: input.clientId, from: input.from, to: input.membership.tier, membership: input.membership, origin: input.origin });
}

/** How long a mailed invite's link works. */
export const INVITE_LINK_DAYS = 30;

export const inviteLink = (origin: string, code: string) => `${origin}/access?code=${encodeURIComponent(code)}`;

/**
 * Invites one person into a tier by mail: a link that works once, for
 * INVITE_LINK_DAYS. Opening it, signed in or after making an account, gives
 * the membership (source `invite`), for `grantDays` when set.
 */
export async function inviteByMail(input: {
  email: string;
  tier: GrantableTier;
  note?: string;
  grantDays?: number;
  by?: string;
  origin: string;
}): Promise<{ invite: AccessInvite; url: string; mailed: Mailed; existing?: string }> {
  const email = normalizeEmail(input.email);
  const invite = await accessInvitesDB.create({
    itemIds: [],
    tier: input.tier,
    email,
    maxUses: 1,
    grantDays: input.grantDays,
    expiresAt: new Date(Date.now() + INVITE_LINK_DAYS * 86_400_000).toISOString(),
    createdBy: input.by,
    note: input.note,
  });
  const url = inviteLink(input.origin, invite.code);
  const mailed = await deliver(inviteMail(email, { tier: tierLabel(input.tier), url, note: input.note, days: INVITE_LINK_DAYS }));
  const existing = (await getUserByEmail(email).catch(() => null))?.clientId;
  return { invite, url, mailed, existing };
}

/**
 * Decides a pending request. One that asks for a tier (`tier/pro`, from the
 * Subscription page) gives the membership when approved, unless the person
 * already holds as much; one that asks for an item gives a grant of it.
 */
export async function resolveRequest(input: {
  requestId: string;
  approve: boolean;
  by?: string;
  /** How long the membership or grant lasts. None: until an admin removes it. */
  days?: number;
  note?: string;
  origin: string;
  notify?: boolean;
}): Promise<{ request: AccessRequest; grant?: AccessGrant; membership?: Membership | null; mailed?: Mailed } | null> {
  const request = await accessRequestsDB.resolve(input.requestId, input.approve ? 'approved' : 'rejected', input.by);
  if (!request) return null;
  if (!input.approve) return { request };

  const tier = requestedTier(request.itemId);
  if (tier) {
    if (tierRank(await tierOf(request.clientId)) >= tierRank(tier)) return { request, membership: null };
    const { membership, mailed } = await changeTier({
      clientId: request.clientId,
      tier,
      note: input.note || 'Asked for it on the Subscription page',
      ref: request.requestId,
      days: input.days,
      by: input.by,
      origin: input.origin,
      notify: input.notify,
    });
    return { request, membership, mailed };
  }

  const grant = await accessGrantsDB.create({
    itemId: request.itemId,
    subject: { kind: 'client', id: request.clientId },
    grantedBy: input.by,
    expiresAt: input.days && input.days > 0 ? new Date(Date.now() + input.days * 86_400_000).toISOString() : undefined,
    note: `Approved request ${request.requestId}`,
  });
  return { request, grant };
}

export interface KeyHolder {
  clientId: string;
  name: string;
  activeKeys: number;
}

/** Everyone with an API key, by client, without the keys themselves. */
export async function listKeyHolders(): Promise<KeyHolder[]> {
  try {
    const redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    });
    const keys = await new CrudHash<ApiKeyInfo>(redis, 'apiKeys').list();
    const byClient = new Map<string, KeyHolder>();
    for (const key of keys.filter(Boolean)) {
      const person = byClient.get(key.clientId) ?? { clientId: key.clientId, name: key.clientName || key.clientId, activeKeys: 0 };
      if (key.isValid) person.activeKeys += 1;
      byClient.set(key.clientId, person);
    }
    return [...byClient.values()].sort((a, b) => a.name.localeCompare(b.name));
  } catch (error) {
    console.error('[memberships] Could not list API key holders:', error);
    return [];
  }
}

/** Which of these accounts are admins (the `isAdmin` flag on each Redis user profile). */
export async function adminsAmong(clientIds: string[]): Promise<string[]> {
  const flags = await Promise.all(clientIds.map(clientId => isAdmin(clientId).catch(() => false)));
  return clientIds.filter((_, index) => flags[index]);
}
