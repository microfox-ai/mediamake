import {
  COMMUNITY_GROUP,
  PRIVATE_GROUP,
  releaseTier,
  type AccessGrant,
  type AccessGroup,
  type AccessInvite,
  type AccessRequest,
  type CatalogItemRecord,
  type ReleaseTier,
} from '@/lib/catalog/types';

export { COMMUNITY_GROUP, PRIVATE_GROUP };

export interface Person {
  clientId: string;
  name: string;
  activeKeys: number;
}

/** GET /api/admin/catalog */
export interface AdminCatalog {
  items: CatalogItemRecord[];
  grants: AccessGrant[];
  groups: AccessGroup[];
  invites: AccessInvite[];
  requests: AccessRequest[];
  people: Person[];
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

export const TIER_META: Record<
  ReleaseTier,
  { label: string; who: string; dot: string; soft: string; ring: string }
> = {
  vault: {
    label: 'Vault',
    who: 'Only you. Never published.',
    dot: 'bg-zinc-500',
    soft: 'bg-zinc-500/10 text-zinc-600 dark:text-zinc-300',
    ring: 'ring-zinc-500/30',
  },
  development: {
    label: 'In development',
    who: 'You and private testers',
    dot: 'bg-amber-500',
    soft: 'bg-amber-500/10 text-amber-700 dark:text-amber-300',
    ring: 'ring-amber-500/30',
  },
  community: {
    label: 'Community',
    who: 'Production ready, before release',
    dot: 'bg-violet-500',
    soft: 'bg-violet-500/10 text-violet-700 dark:text-violet-300',
    ring: 'ring-violet-500/30',
  },
  public: {
    label: 'Public',
    who: 'Released to everyone',
    dot: 'bg-emerald-500',
    soft: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
    ring: 'ring-emerald-500/30',
  },
};

export const TIER_ORDER: ReleaseTier[] = ['vault', 'development', 'community', 'public'];

export function tierOf(item: CatalogItemRecord, now = Date.now()): ReleaseTier {
  return releaseTier(item, now);
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
