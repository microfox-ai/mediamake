import { MEMBER_TIERS, tierLabel, type MemberTier } from '@/lib/memberships/tiers';

/**
 * How much a member may keep in cloud projects (productions, releases,
 * project media and brand kit files): a cap per membership, which an admin
 * can raise for one person. Storage is the one thing here that costs money
 * per person, so it is counted against the owner of each project, whoever
 * uploaded the file. Pure: ./storage-store counts what is stored.
 */

export const GB = 1_000_000_000;

/**
 * The cap of each membership, in bytes. Public has none to use (cloud
 * projects open at Plus); null is no cap. To change a tier's cap, change it
 * here; to give one person more, an admin raises theirs (StorageRaise).
 */
export const STORAGE_CAP_BYTES: Record<MemberTier, number | null> = {
  public: 0,
  plus: 5 * GB,
  pro: 25 * GB,
  cohort: 100 * GB,
  admin: null,
};

/** One person's cap, raised by an admin, in MongoDB `storage_caps`. */
export interface StorageRaise {
  clientId: string;
  bytes: number;
  note?: string;
  by?: string;
  at: string;
}

/** The largest raise an admin can type by mistake and still have taken. */
export const MAX_RAISE_BYTES = 10_000 * GB;

/**
 * A person's cap: their membership's, or what an admin raised it to when
 * that is more. A raise never lowers a cap, so moving up a tier is never a
 * step down. null is no cap.
 */
export function storageCap(tier: MemberTier, raise?: Pick<StorageRaise, 'bytes'> | null): number | null {
  const base = STORAGE_CAP_BYTES[tier];
  if (base === null) return null;
  return raise && raise.bytes > base ? raise.bytes : base;
}

export interface StorageState {
  used: number;
  /** null: no cap. */
  cap: number | null;
  left: number | null;
  /** 0 to 100, of the cap; 0 without one. */
  percent: number;
  /** 90% or more is used. */
  near: boolean;
  full: boolean;
}

export function storageState(used: number, cap: number | null): StorageState {
  if (cap === null) return { used, cap, left: null, percent: 0, near: false, full: false };
  const percent = cap > 0 ? Math.min(100, Math.round((used / cap) * 100)) : 100;
  return { used, cap, left: Math.max(0, cap - used), percent, near: used >= cap * 0.9, full: used >= cap };
}

/** What stops `adding` more bytes from being stored, in words; null when there is room. */
export function noRoomFor(adding: number, used: number, cap: number | null): string | null {
  if (cap === null || adding <= 0 || used + adding <= cap) return null;
  return (
    `Not enough cloud storage: this needs ${formatBytes(adding)}, and the project's owner has ${formatBytes(Math.max(0, cap - used))} left of ${formatBytes(cap)}. ` +
    'Delete productions, releases or media the project no longer needs, or ask a MediaMake admin to raise the cap.'
  );
}

/** `1.2 GB`, `340 MB`, `12 KB`: decimal, like the upload limits. */
export function formatBytes(bytes: number): string {
  if (bytes >= GB) return `${trim(bytes / GB)} GB`;
  if (bytes >= 1_000_000) return `${trim(bytes / 1_000_000)} MB`;
  if (bytes >= 1000) return `${Math.round(bytes / 1000)} KB`;
  return `${Math.max(0, Math.round(bytes))} B`;
}

const trim = (value: number) => (value >= 100 ? String(Math.round(value)) : value.toFixed(1).replace(/\.0$/, ''));

/** Each membership's cap, lowest first, for the pages that explain them. */
export function capsByTier(): { tier: MemberTier; label: string; cap: number | null }[] {
  return MEMBER_TIERS.filter(tier => STORAGE_CAP_BYTES[tier] !== 0).map(tier => ({ tier, label: tierLabel(tier), cap: STORAGE_CAP_BYTES[tier] }));
}

/** A raise as an admin sends it: `{ clientId, gb, note? }`. */
export function parseRaise(body: unknown): { clientId: string; bytes: number; note?: string } | { error: string } {
  const { clientId, gb, note } = (body ?? {}) as { clientId?: unknown; gb?: unknown; note?: unknown };
  if (typeof clientId !== 'string' || !clientId.trim()) return { error: 'clientId is required: whose cap to raise' };
  const size = Number(gb);
  if (!Number.isFinite(size) || size <= 0) return { error: 'gb is required: the new cap in GB, e.g. 50' };
  const bytes = Math.round(size * GB);
  if (bytes > MAX_RAISE_BYTES) return { error: `A cap can be raised to ${MAX_RAISE_BYTES / GB} GB at most` };
  const why = typeof note === 'string' ? note.trim().slice(0, 300) : '';
  return { clientId: clientId.trim(), bytes, ...(why && { note: why }) };
}
