/**
 * A song's link to its release on DistroKid (docs/library.md › The DistroKid link).
 *
 * DistroKid's own details sit in the song's `distrokid` group under the keys of DISTROKID_KEYS. Its
 * `link`, the release page (https://distrokid.com/dashboard/album/?albumuuid=<UUID>), is what links a
 * song to its release: Browse Hack's Sync links finds the songs to fill with
 * `where=distrokid=<album UUID>`.
 *
 * A pack's info.json carries those details once Browse Hack's `distrokid_record_packs` has written
 * them under "distrokid", after the release was submitted. Putting the pack in a song's
 * `distrokid-pack` slot copies them in: the form does it when the file is dropped, the save does it
 * for every other caller (a script, an MCP).
 *
 * Pure: the form, the routes and the tests share it.
 */
import type { FieldValue, GroupKey } from './index';

export const DISTROKID_FIELD = 'distrokid';
export const DISTROKID_PACK_SLOT = 'distrokid-pack';

/** The keys of DistroKid's own release details in a song's `distrokid` group, as the Songs template documents them. */
export const DISTROKID_KEYS: GroupKey[] = [
  { key: 'link', label: 'DistroKid link', kind: 'link', hint: 'The release page, …/dashboard/album/?albumuuid=…: it links the song to its release' },
  { key: 'albumUuid', label: 'Album UUID', hint: 'The albumuuid in the link' },
  { key: 'upc', label: 'UPC', hint: 'The release’s barcode, from DistroKid' },
  { key: 'uploadDate', label: 'Uploaded to DistroKid', kind: 'date' },
  { key: 'releaseDate', label: 'Release date on DistroKid', kind: 'date' },
  { key: 'recordLabel', label: 'Record label on DistroKid' },
];

const RELEASE_PAGE = /^https:\/\/(?:www\.)?distrokid\.com\/dashboard\/album\/?\?(?:[^#\s]*&)?albumuuid=([0-9a-z-]{8,64})/i;
const DAY = /^\d{4}-\d{2}-\d{2}$/;

/** The album UUID a DistroKid release link holds, or ''. */
export function albumUuidOf(link: unknown): string {
  return typeof link === 'string' ? (RELEASE_PAGE.exec(link.trim())?.[1] ?? '') : '';
}

/** A web link a page may open: http(s) only, so a typed `javascript:` never becomes one. */
export const openable = (value: unknown): value is string => typeof value === 'string' && /^https?:\/\/[^\s"'<>]+$/i.test(value.trim());

/** The release page a song's DistroKid details hold, when it is a link that opens. */
export function releaseLinkOf(fields: Record<string, unknown> | undefined): string {
  const group = fields?.[DISTROKID_FIELD];
  const link = group && typeof group === 'object' && !Array.isArray(group) ? (group as Record<string, unknown>).link : undefined;
  return openable(link) ? link.trim() : '';
}

const isEmpty = (value: unknown) => value == null || (typeof value === 'string' && !value.trim()) || (Array.isArray(value) && !value.length) || (typeof value === 'object' && !Array.isArray(value) && !Object.keys(value as object).length);

/** A pack's info.json, as text or parsed: its object, or null when it is none. */
function infoOf(info: unknown): Record<string, unknown> | null {
  let value = info;
  if (typeof value === 'string') {
    try {
      value = JSON.parse(value.replace(/^﻿/, ''));
    } catch {
      return null;
    }
  }
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

/**
 * Whether a JSON file is a DistroKid pack's info.json, so a page puts it in its slot whatever it is
 * called: it records a release, or it holds the upload form's own keys (songTitle with a genre,
 * songwriters or the Apple switch).
 */
export function isDistrokidPack(info: unknown): boolean {
  const pack = infoOf(info);
  if (!pack) return false;
  const block = pack[DISTROKID_FIELD];
  if (block && typeof block === 'object' && !Array.isArray(block)) return true;
  return typeof pack.songTitle === 'string' && ['primaryGenre', 'songWriters', 'isApplePublish'].some(key => key in pack);
}

const word = (value: unknown) => (typeof value === 'string' || typeof value === 'number' ? String(value).trim().slice(0, 2000) : '');

/**
 * The release as a pack's `distrokid` block records it: the group's keys, and the ISRC when the
 * release is a single. Empty when the pack has no block (packed, not yet submitted and recorded).
 */
export function packRelease(info: unknown): { group: Record<string, string>; isrc?: string } {
  const block = infoOf(info)?.[DISTROKID_FIELD];
  if (!block || typeof block !== 'object' || Array.isArray(block)) return { group: {} };
  const from = block as Record<string, unknown>;
  const group: Record<string, string> = {};
  for (const { key } of DISTROKID_KEYS) {
    const value = word(from[key]);
    if (value) group[key] = value;
  }
  // the UUID is part of the link itself: reading it out is not a guess
  if (!group.albumUuid && albumUuidOf(group.link)) group.albumUuid = albumUuidOf(group.link);
  const tracks = Array.isArray(from.tracks) ? (from.tracks as { isrc?: unknown }[]) : [];
  const isrc = tracks.length > 1 ? '' : word(from.isrc) || word(tracks[0]?.isrc);
  return { group, ...(isrc && { isrc }) };
}

/**
 * What putting a DistroKid pack in a song adds to it, measured against what the song holds (`have`):
 * the release's keys merged into its `distrokid` group (the pack's values win), and the ISRC of a
 * single and the release date (a day) only when the song has none. Only what would change is in the
 * answer, so an empty answer means the pack brings nothing new.
 */
export function fromDistrokidPack(info: unknown, have: Record<string, unknown> = {}): Record<string, FieldValue> {
  const { group, isrc } = packRelease(info);
  if (!Object.keys(group).length && !isrc) return {};
  const out: Record<string, FieldValue> = {};
  const held = have[DISTROKID_FIELD] && typeof have[DISTROKID_FIELD] === 'object' && !Array.isArray(have[DISTROKID_FIELD]) ? (have[DISTROKID_FIELD] as Record<string, string | string[]>) : {};
  if (Object.entries(group).some(([key, value]) => held[key] !== value)) out[DISTROKID_FIELD] = { ...held, ...group };
  if (isrc && isEmpty(have.isrc)) out.isrc = isrc;
  if (group.releaseDate && DAY.test(group.releaseDate) && isEmpty(have.releaseDate)) out.releaseDate = group.releaseDate;
  return out;
}

/**
 * A save's fields with what a pack brings. What the save sends wins; a DistroKid group it sends is
 * laid over the pack's, so a form that already copied the pack sends the same values again.
 */
export function withPack(fields: unknown, fromPack: Record<string, FieldValue>): unknown {
  if (!Object.keys(fromPack).length) return fields;
  const sent = fields && typeof fields === 'object' && !Array.isArray(fields) ? (fields as Record<string, unknown>) : {};
  const out: Record<string, unknown> = { ...fromPack, ...sent };
  const group = sent[DISTROKID_FIELD];
  if (fromPack[DISTROKID_FIELD] && group && typeof group === 'object' && !Array.isArray(group)) out[DISTROKID_FIELD] = { ...(fromPack[DISTROKID_FIELD] as object), ...(group as object) };
  return out;
}
