import {
  COMMUNITY_GROUP,
  PRIVATE_GROUP,
  itemTier,
  type AccessGrant,
  type AccessGroup,
  type AccessRequest,
  type ArchiveMark,
  type CatalogItemRecord,
  type CatalogVideo,
  type HealthMark,
  type ItemTier,
  type ReadinessMark,
} from '@/lib/catalog/types';
import { currentMembership, type Membership } from '@/lib/memberships/membership';
import { GRANTABLE_TIERS, LEGACY_PERSON_TIER, higherTier, tierOpens, type GrantableTier, type MemberTier } from '@/lib/memberships/tiers';
import type { InstallPlan } from '@/lib/catalog/plan';
import type { UsedBy } from '@/lib/catalog/summary';

export { COMMUNITY_GROUP, PRIVATE_GROUP };

export interface Person {
  clientId: string;
  name: string;
  activeKeys: number;
}

/** GET /api/admin/catalog */
export interface AdminCatalog {
  items: CatalogItemRecord[];
  /** The repo's skills (skills.json) not stored as items: always public, nothing to release. */
  skills: CatalogItemRecord[];
  /** MCPs and skills made by others (lib/catalog/third-party.json) not stored as items: always public too. */
  thirdParty: CatalogItemRecord[];
  /** Cards defined in code (lib/catalog/items.ts: the apps, the MediaMake MCP): shown, but moved only by editing that file. */
  cards: CatalogItemRecord[];
  grants: AccessGrant[];
  groups: AccessGroup[];
  requests: AccessRequest[];
  people: Person[];
  /** Every membership record, ended ones too (see lib/memberships). */
  memberships: Membership[];
  publicReleasesOpen: boolean;
  defaultGateDays: number;
}

export async function adminCall<T = unknown>(body?: Record<string, unknown>): Promise<T> {
  const res = await fetch('/api/admin/catalog', {
    method: body ? 'POST' : 'GET',
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(json.error || `Request failed (${res.status})`), { status: res.status });
  return json as T;
}

/** GET /api/admin/catalog/item?id=<id>: one item as its release page shows it. */
export interface ItemDetail {
  item: CatalogItemRecord;
  /** Where the item is defined: stored in the catalog database, or a file in the repo. */
  definedIn: 'database' | 'third-party.json' | 'skills.json' | 'items.ts' | null;
  /** Live grants that reach it: its own, its kind's and everything's. */
  grants: AccessGrant[];
  /** How many people hold each membership. */
  members: Record<GrantableTier, number>;
  publicReleasesOpen: boolean;
  /** What installing it does, as an admin would get it. */
  plan: InstallPlan;
  /** Items that need it installed first (`requires`) or offer it as a choice (`uses`). */
  usedBy: UsedBy[];
  /** Set when it is archived: when, by whom, and why. */
  archive: ArchiveMark | null;
  /** An admin's health mark (item.health is the result, the repo's default without one). */
  healthMark: HealthMark | null;
  /** The Ready mark with its proof; none while it is Beta. */
  readinessMark: ReadinessMark | null;
  /** Titles by id, for everything in the catalog. */
  names: Record<string, string>;
  installPrompt?: string;
  /** The public site the item's page is on (its link: site + itemPagePath). */
  site?: string;
  /** A skill's, MCP's or app's launch video prompt: runs make-cwc-tutorial for it on an admin's computer (lib/catalog/launch-video). */
  launchVideoPrompt?: string;
  /** The titles of its open known issues (lib/feedback/known-issues). */
  openKnownIssues?: string[];
  /** Its code on GitHub, when known. */
  code?: string;
  /** A skill's whole description (its card's summary is the first sentence). */
  description?: string;
  /** Its video as stored: a skill's intro, a tutorial, a course and its lessons. */
  video: CatalogVideo | null;
  /** A course: every tutorial it can play. */
  tutorials?: LessonOption[];
  /** A tutorial: the courses that play it. */
  inCourses?: { id: string; title: string }[];
}

/** A tutorial as a course's lesson picker shows it. */
export interface LessonOption {
  id: string;
  title: string;
  tier: ItemTier;
  thumbnail?: string;
  archivedAt?: string;
}

export async function fetchItemDetail(id: string): Promise<ItemDetail> {
  const res = await fetch(`/api/admin/catalog/item?id=${encodeURIComponent(id)}`);
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(json.error || `Request failed (${res.status})`), { status: res.status });
  return json as ItemDetail;
}

export { itemPath, originOf } from '@/lib/catalog/summary';

/** How the admin pages show each tier of an item: the lowest membership that opens it. */
export const TIER_META: Record<ItemTier, { label: string; who: string; dot: string; soft: string; ring: string }> = {
  admin: {
    label: 'Vault',
    who: 'Admins only. Never published.',
    dot: 'bg-zinc-500',
    soft: 'bg-zinc-500/10 text-zinc-600 dark:text-zinc-300',
    ring: 'ring-zinc-500/30',
  },
  cohort: {
    label: 'Cohort',
    who: 'The cohort and admins. Hidden from the rest.',
    dot: 'bg-amber-500',
    soft: 'bg-amber-500/10 text-amber-700 dark:text-amber-300',
    ring: 'ring-amber-500/30',
  },
  pro: {
    label: 'Pro',
    who: 'Pro members and above',
    dot: 'bg-violet-500',
    soft: 'bg-violet-500/10 text-violet-700 dark:text-violet-300',
    ring: 'ring-violet-500/30',
  },
  plus: {
    label: 'Plus',
    who: 'Plus members and above',
    dot: 'bg-sky-500',
    soft: 'bg-sky-500/10 text-sky-700 dark:text-sky-300',
    ring: 'ring-sky-500/30',
  },
  public: {
    label: 'Public',
    who: 'Everyone',
    dot: 'bg-emerald-500',
    soft: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
    ring: 'ring-emerald-500/30',
  },
};

/** The tiers as the board lays them out: most restricted first. */
export const TIER_ORDER: ItemTier[] = ['admin', 'cohort', 'pro', 'plus', 'public'];

export function tierOf(item: CatalogItemRecord, now = Date.now()): ItemTier {
  return itemTier(item, now);
}

/**
 * A person's tier as the access check sees it: the highest of their live
 * memberships, or the earlier groups until the migration clears them
 * (private testers are the cohort, the community is Pro).
 */
export function personTier(data: AdminCatalog, clientId: string, now = Date.now()): MemberTier {
  let tier: MemberTier = currentMembership(data.memberships.filter(m => m.clientId === clientId), now)?.tier ?? 'public';
  if (groupMembers(data, PRIVATE_GROUP).includes(clientId)) tier = higherTier(tier, LEGACY_PERSON_TIER.private);
  if (groupMembers(data, COMMUNITY_GROUP).includes(clientId)) tier = higherTier(tier, LEGACY_PERSON_TIER.community);
  return tier;
}

/** The record that gives a person their tier now; none for Public, or a tier still held through an earlier group. */
export function personMembership(data: AdminCatalog, clientId: string, now = Date.now()): Membership | null {
  return currentMembership(data.memberships.filter(m => m.clientId === clientId), now);
}

/** The people at each membership: everyone who holds an API key or a membership. */
export function membersByTier(data: AdminCatalog, now = Date.now()): Record<GrantableTier, string[]> {
  const everyone = new Set([...data.people.map(p => p.clientId), ...data.memberships.map(m => m.clientId), ...data.groups.flatMap(g => g.members)]);
  const result = Object.fromEntries(GRANTABLE_TIERS.map(tier => [tier, [] as string[]])) as Record<GrantableTier, string[]>;
  for (const clientId of everyone) {
    const tier = personTier(data, clientId, now);
    if (tier !== 'public' && tier !== 'admin') result[tier].push(clientId);
  }
  return result;
}

/** How many people a tier of item opens to through their membership alone (admins aside). */
export function reachOf(counts: Record<GrantableTier, number>, tier: ItemTier): { tier: GrantableTier; count: number; on: boolean }[] {
  return [...GRANTABLE_TIERS].reverse().map(held => ({ tier: held, count: counts[held], on: tier !== 'admin' && tierOpens(held, tier) }));
}

const DAY = 86_400_000;

/** Time left on a gated release, and how far through the gate it is (0..1). */
export function gateOf(item: CatalogItemRecord, now = Date.now()) {
  if (!item.publicAt || item.neverPublish) return null;
  const end = Date.parse(item.publicAt);
  if (end <= now) return null;
  const start = item.gateStartedAt ? Date.parse(item.gateStartedAt) : end - 30 * DAY;
  const progress = Math.min(1, Math.max(0, (now - start) / Math.max(1, end - start)));
  return { end, msLeft: end - now, progress };
}

export function formatLeft(ms: number) {
  const days = Math.floor(ms / DAY);
  if (days >= 2) return `${days} days`;
  const hours = Math.floor(ms / 3_600_000);
  if (hours >= 2) return `${hours} hours`;
  return `${Math.max(1, Math.round(ms / 60_000))} min`;
}

export function formatDate(iso: string | number) {
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

export function personName(people: Person[], clientId: string) {
  return people.find(p => p.clientId === clientId)?.name ?? clientId;
}

export function groupMembers(data: AdminCatalog, groupId: string) {
  return data.groups.find(g => g.groupId === groupId)?.members ?? [];
}

/** Live grants that name this item, its kind, or everything. */
export function grantsFor(data: AdminCatalog, item: CatalogItemRecord) {
  const kindWildcard = `${item.kind}/*`;
  const now = new Date().toISOString();
  return data.grants.filter(
    g => (!g.expiresAt || g.expiresAt > now) && (g.itemId === item.id || (!item.neverPublish && (g.itemId === '*' || g.itemId === kindWildcard))),
  );
}
