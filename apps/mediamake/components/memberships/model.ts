import type { AccessRequest } from '@/lib/catalog/types';
import type { AuditEvent } from '@/lib/memberships/audit';
import type { Membership } from '@/lib/memberships/membership';
import type { PersonRow } from '@/lib/memberships/people';
import type { Suggestion } from '@/lib/memberships/suggestions';
import { tierLabel } from '@/lib/memberships/tiers';

/** GET /api/admin/memberships */
export interface MembershipsData {
  people: PersonRow[];
  /** Pending: for a tier (`tier/pro`, from Subscription) or for one item. */
  requests: AccessRequest[];
  audit: AuditEvent[];
  /** Item titles by id, for requests that ask for an item. */
  titles: Record<string, string>;
  /** Merged pull requests by people with a linked GitHub account that no membership counts yet. */
  suggestions: Suggestion[];
  /** Repositories whose pull requests could not be read. */
  suggestionProblems: string[];
  /** Whether mail can be sent (RESEND_API_KEY). */
  mail: boolean;
}

/** Whether the person was told by mail; `why` says why not. */
export interface Mailed {
  sent: boolean;
  to?: string;
  why?: string;
}

async function request<T>(url: string, body?: Record<string, unknown>): Promise<T> {
  const res = await fetch(url, {
    method: body ? 'POST' : 'GET',
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || `Request failed (${res.status})`);
  return json as T;
}

export const membershipsCall = <T = { mailed?: Mailed }>(body?: Record<string, unknown>) => request<T>('/api/admin/memberships', body);
/** Linking an old account (lib/auth/accounts): an email the admin vouches for, or a one-time link to send. */
export const usersCall = <T>(body: Record<string, unknown>) => request<T>('/api/admin/users', body);

/** What to tell the admin after a change: the person was mailed, or why not. */
export function mailedLine(mailed?: Mailed): string | undefined {
  if (!mailed) return undefined;
  return mailed.sent ? `Mailed to ${mailed.to}` : `No mail sent: ${mailed.why ?? 'unknown reason'}`;
}

const SOURCE_WORDS: Record<Membership['source'], string> = {
  signup: 'Signed up',
  admin: 'Given by an admin',
  contribution: 'Earned by contributing',
  invite: 'Joined with an invite (before invites were retired)',
  migration: 'Carried over from the earlier tiers',
  paid: 'Paid',
};

/** How a person got their tier, in a few words. */
export function howGot(person: PersonRow): string {
  if (person.isAdmin) return 'The admin flag on the account';
  if (person.legacy) return 'From the earlier tiers, with no record yet';
  if (person.membership) return SOURCE_WORDS[person.membership.source];
  // a membership that ended says so: the newest record is the one they held last
  const last = person.records[0];
  if (last) return `Was ${tierLabel(last.tier)} until ${formatDay(last.revokedAt ?? last.expiresAt ?? last.grantedAt)}`;
  return person.linked ? 'Signed up' : 'An old account with a key only';
}

export const sourceWords = (source: Membership['source']) => SOURCE_WORDS[source];

export function formatDay(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

export function formatMoment(iso: string) {
  return new Date(iso).toLocaleString(undefined, { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

/** A PR link or an item id reads as a link when it is one. */
export const isLink = (value?: string) => !!value && /^https:\/\/\S+$/.test(value);

/** How long a membership lasts, in a few words. */
export function lastsWords(membership: Pick<Membership, 'expiresAt' | 'permanent'>): string {
  return membership.expiresAt ? `until ${formatDay(membership.expiresAt)}` : membership.permanent ? 'permanent' : 'until an admin removes it';
}
