import { createHash } from 'crypto';
import { MAX_LISTING_DESCRIPTION, MAX_LISTING_README, MAX_LISTING_TAGS, isPictureLink, parseTags, withAuthorListing, type AuthorListing, type ListingFields } from '../catalog/listing';
import { readmeBody } from '../catalog/readme';
import { SKILL_TYPES, skillNameOf, typeOf, type SkillType } from '../catalog/skill-profile';
import { frontMatter, type SubmissionFile, type SubmissionKind } from './submission';

/**
 * A store release fills the item's listing from its package. A skill released to Plus, Pro or Cohort
 * is a package in storage, not a folder in the repo, so its page reads its listing
 * (lib/catalog/listing) and its details (lib/catalog/skill-profile), never a README.md. This takes
 * them from the package as it is released: the README.md's frontmatter (`description`, `tags`,
 * `headshot`, `type`, `superset`), its text, and the pictures it shows from its own folder, which go
 * to MediaMake's storage with their links rewritten.
 *
 * The rule for what was set by hand: **a field is the package's until someone changes it.** Each
 * release writes down a fingerprint of what it put in each field (`PackageMark`). The next release
 * sets a field when it is empty or still holds what the last release put there, and leaves it when
 * it holds anything else: an admin's or an author's own words or picture, set on the item's page.
 * Clearing a field hands it back to the package. A release fills and refreshes; it never clears.
 * A headshot given as a link to another site is taken only from an admin's release.
 *
 * Only skills: an MCP's or an app's README.md is often its code's, so theirs stay on the release
 * page. Pure but for the store passed in, so the rules are tested without a database or storage
 * (./package-listing.test.ts); ./actions gives it the real ones.
 */

/** The fields a package fills, in the order they are named. `type` carries a subset's superset with it. */
export const PACKAGE_FIELDS = ['description', 'headshot', 'readme', 'tags', 'type'] as const;
export type PackageField = (typeof PACKAGE_FIELDS)[number];

/** What a skill's package says its listing is. */
export interface PackageListing {
  description?: string;
  tags?: string[];
  /** Its 16:9 picture: an https link, or a picture in the package by its path. */
  headshot?: { link: string } | { file: string };
  /** The README's Markdown without its frontmatter, as written. */
  readme?: string;
  /** The pictures in the package that the README shows, by path, in order. */
  pictures: string[];
  type?: SkillType;
  /** A subset's superset. Only with type `subset`. */
  superset?: string;
  /** What could not be taken, and why: for whoever released it. */
  notes: string[];
}

/** A skill's type as its details keep it; only a subset names a superset. */
export interface PackageDetails {
  type: SkillType;
  superset?: string;
}

/** What the last release put in each field, as a fingerprint: how the next one tells its own words from a person's. */
export interface PackageMark {
  /** The item, e.g. `skill/make-thing`. */
  id: string;
  /** The version that last wrote it. */
  version: string;
  fields: Partial<Record<PackageField, string>>;
}

/** What one release did to the listing. */
export interface ListingFill {
  /** The fields it set: empty before, or the last release's. */
  filled: PackageField[];
  /** The fields the package names that were set by hand, so they were left. */
  kept: PackageField[];
  notes: string[];
}

export interface PackageListingStore {
  listing(itemId: string): Promise<ListingFields | null>;
  saveListing(itemId: string, listing: ListingFields, by: string): Promise<unknown>;
  /** The skill's type as set on its page, or null when nobody set it. */
  details(itemId: string): Promise<PackageDetails | null>;
  saveDetails(itemId: string, details: PackageDetails, by: string): Promise<unknown>;
  mark(itemId: string): Promise<PackageMark | null>;
  saveMark(mark: PackageMark, by: string): Promise<unknown>;
  /** Puts one picture of the item in MediaMake's storage, where a listing's pictures are kept, and answers with its https link. */
  upload(input: { itemId: string; by: string; name: string; contentType: string; bytes: Buffer }): Promise<string>;
}

/* ---------- reading the package ---------- */

/** The pictures a listing shows, by extension (lib/catalog/listing LISTING_PICTURE_TYPE). */
const PICTURE_TYPES: Record<string, string> = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', webp: 'image/webp', avif: 'image/avif' };
const pictureType = (path: string): string | undefined => PICTURE_TYPES[path.split('.').pop()?.toLowerCase() ?? ''];

/** How many of a README's pictures one release uploads (a space's README shows as many: lib/space/space). */
export const MAX_PACKAGE_PICTURES = 16;

/** A link as a path inside the item's folder (`./shots/a.png` → `shots/a.png`), or null: a web link, an anchor, a path out of the folder. */
function localPath(link: string): string | null {
  const raw = link.trim().replace(/[?#].*$/, '');
  if (!raw || /^[a-z][a-z0-9+.-]*:/i.test(raw) || raw.startsWith('/')) return null;
  let decoded: string;
  try {
    decoded = decodeURI(raw);
  } catch {
    return null;
  }
  const parts: string[] = [];
  for (const part of decoded.replace(/\\/g, '/').split('/')) {
    if (!part || part === '.') continue;
    if (part === '..') return null;
    parts.push(part);
  }
  return parts.length ? parts.join('/') : null;
}

// the same pictures a space's report names (tools/space.mjs readmePictureLinks): keep the two alike
const FENCE = /^(```|~~~)[^\n]*\n[\s\S]*?^\1[^\n]*$/gm;
const MD_IMAGE = /(!\[[^\]]*\]\(\s*)(?:<([^>\n]+)>|([^)\s]+))((?:\s+(?:"[^"]*"|'[^']*'|\([^)]*\)))?\s*\))/g;
const MD_REFERENCE = /^(\s{0,3}\[[^\]]+\]:\s*)<?(\S+?)>?(?=\s|$)/gm;

/** The pictures a README's text shows from its own folder: every Markdown picture with a relative link, each once, in order. Nothing in a code block. */
export function readmePictureLinks(body: string): string[] {
  const found: string[] = [];
  const add = (link: string) => {
    const at = localPath(link);
    if (at && pictureType(at) && !found.includes(at)) found.push(at);
  };
  const prose = body.replace(/\r\n/g, '\n').replace(FENCE, '');
  for (const match of prose.matchAll(MD_IMAGE)) add(match[2] ?? match[3]);
  for (const match of prose.matchAll(MD_REFERENCE)) add(match[2]);
  return found;
}

/** The README with those pictures at their links (`shots/a.png` → its https address). A picture with no link, and everything in a code block, stays as written. */
export function rewritePictures(body: string, links: Record<string, string>): string {
  const linkOf = (link: string) => links[localPath(link) ?? ''];
  const change = (text: string) =>
    text
      .replace(MD_IMAGE, (whole, open: string, angled: string | undefined, bare: string | undefined, close: string) => {
        const url = linkOf(angled ?? bare ?? '');
        return url ? `${open}${url}${close}` : whole;
      })
      .replace(MD_REFERENCE, (whole, open: string, link: string) => {
        const url = pictureType(localPath(link) ?? '') ? linkOf(link) : undefined;
        return url ? `${open}${url}` : whole;
      });
  let out = '';
  let at = 0;
  for (const fence of body.matchAll(FENCE)) {
    out += change(body.slice(at, fence.index)) + fence[0];
    at = fence.index + fence[0].length;
  }
  return out + change(body.slice(at));
}

/** A picture's name in storage: what is in it, then its path, so the same picture keeps the same link from release to release. */
export function pictureName(path: string, bytes: Buffer): string {
  return `${createHash('sha256').update(bytes).digest('hex').slice(0, 16)}-${path.replace(/[^a-zA-Z0-9.-]/g, '_').slice(-80)}`;
}

const decode = (text: string) => text.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');

/** A description as a listing keeps it: at most MAX_LISTING_DESCRIPTION characters, cut at a word. */
function shortDescription(text: string): string {
  const whole = decode(text).replace(/\s+/g, ' ').trim();
  if (whole.length <= MAX_LISTING_DESCRIPTION) return whole;
  const cut = whole.slice(0, MAX_LISTING_DESCRIPTION - 1);
  const at = cut.lastIndexOf(' ');
  return `${(at > MAX_LISTING_DESCRIPTION / 2 ? cut.slice(0, at) : cut).replace(/[\s.,;:!?-]+$/, '')}…`;
}

/**
 * What a skill's package says its listing is, from the README.md at the top of its folder
 * (docs/item-readme.md has the format). Null when it has none, or it was sent as bytes.
 */
export function readPackageListing(files: SubmissionFile[]): PackageListing | null {
  const text = files.find(file => file.path === 'README.md' && file.encoding === 'utf8')?.content;
  if (!text?.trim()) return null;
  const front = frontMatter(text.replace(/^﻿/, ''));
  const has = (path: string) => files.some(file => file.path === path);
  const notes: string[] = [];
  const read: PackageListing = { pictures: [], notes };

  if (front.description) read.description = shortDescription(front.description);

  const tags = parseTags((front.tags ?? '').replace(/^\[|\]$/g, '').split(',').map(tag => tag.trim().replace(/^(['"])(.*)\1$/, '$2')));
  if (tags.length) read.tags = tags.slice(0, MAX_LISTING_TAGS);

  if (front.headshot) {
    const at = localPath(front.headshot);
    if (isPictureLink(front.headshot)) read.headshot = { link: front.headshot };
    else if (!at || !pictureType(at)) notes.push(`The headshot (${front.headshot}) is not an https link or a PNG, JPEG, WebP, GIF or AVIF in the item's folder, so it was not taken`);
    else if (!has(at)) notes.push(`The headshot ${at} is not in the package, so it was not taken`);
    else read.headshot = { file: at };
  }

  // a store skill is shared use, always: its nature is not kept, only checked
  if (front.nature === 'private-use') notes.push('Its README.md says nature: private-use, but a skill in the store is shared use');

  if (front.type) {
    const type = typeOf(front.type);
    const superset = skillNameOf(front.superset);
    if (!type) notes.push(`Its README.md says type: ${front.type}, which is not one of ${SKILL_TYPES.map(entry => entry.id).join(', ')}`);
    else if (type === 'subset' && !superset) notes.push('Its README.md says type: subset but names no superset, so its type was not taken');
    else {
      read.type = type;
      if (type === 'subset') read.superset = superset;
    }
  }

  let body = readmeBody(text.replace(/^﻿/, '')).trim();
  if (body.length > MAX_LISTING_README) {
    body = body.slice(0, MAX_LISTING_README);
    notes.push(`Its README.md is over ${Math.round(MAX_LISTING_README / 1024)} KB: the listing shows it cut there`);
  }
  if (body) {
    read.readme = body;
    const shown = readmePictureLinks(body);
    const missing = shown.filter(path => !has(path));
    read.pictures = shown.filter(has).slice(0, MAX_PACKAGE_PICTURES);
    if (missing.length) notes.push(`Its README.md shows ${missing.join(', ')}, which ${missing.length === 1 ? 'is' : 'are'} not in the package: ${missing.length === 1 ? 'it shows' : 'they show'} as written`);
    if (shown.filter(has).length > MAX_PACKAGE_PICTURES) notes.push(`Its README.md shows more than ${MAX_PACKAGE_PICTURES} pictures from its folder: the rest show as written`);
  }
  return read;
}

/* ---------- the rule ---------- */

type Value = string | string[] | undefined;

const isEmpty = (value: Value) => value === undefined || value.length === 0;

/** What a field holds, in 16 characters: tags whatever their order, text whatever the space around it. */
export function fingerprint(value: string | string[]): string {
  return createHash('sha256')
    .update(Array.isArray(value) ? [...value].sort().join('\n') : value.trim())
    .digest('hex')
    .slice(0, 16);
}

/** Whether a field is still the package's to set: nothing is there, or what is there is what the last release put there. */
export const packageOwns = (current: Value, marked: string | undefined) => isEmpty(current) || fingerprint(current!) === marked;

/** A skill's type as one word a fingerprint is taken of: a subset with its superset. */
const detailsWord = (details: PackageDetails) => (details.type === 'subset' ? `subset:${details.superset ?? ''}` : details.type);

/** Stands for a picture that was not uploaded because its field is someone's own: no link is ever this. */
const NOT_UPLOADED = 'package:not-uploaded';

/**
 * Fills a skill's listing and details from the package being released, by the rule at the top of
 * this file. Null when there is nothing to read (not a skill, no README.md). A picture that cannot
 * be stored is a note, never a failure: the release it belongs to is already out.
 */
export async function fillListingFromPackage(
  store: PackageListingStore,
  input: {
    itemId: string;
    kind: SubmissionKind;
    version: string;
    files: SubmissionFile[];
    by: string;
    /**
     * Whether an admin released it (their own, or a submission they read and approved). An author's
     * own release takes its headshot only from the package: a listing never loads a picture from
     * somewhere else on a member's word (lib/catalog/author-listing).
     */
    byAdmin: boolean;
    /** The tags the item has without its listing: not kept again. */
    ownTags?: string[];
  },
): Promise<ListingFill | null> {
  if (input.kind !== 'skill') return null;
  const pkg = readPackageListing(input.files);
  if (!pkg) return null;
  const { itemId, by } = input;
  const [listing, details, mark] = await Promise.all([store.listing(itemId), store.details(itemId), store.mark(itemId)]);
  const marked = mark?.fields ?? {};
  const notes = [...pkg.notes];

  const put = async (path: string, what: string): Promise<string | undefined> => {
    const sent = input.files.find(file => file.path === path)!;
    const bytes = Buffer.from(sent.content, sent.encoding);
    try {
      return await store.upload({ itemId, by, name: pictureName(path, bytes), contentType: pictureType(path)!, bytes });
    } catch (error) {
      console.error(`[submissions] Could not store ${path} of ${itemId}:`, error);
      notes.push(`${path} could not be uploaded, so ${what}`);
      return undefined;
    }
  };

  const current: Record<PackageField, Value> = {
    description: listing?.description,
    headshot: listing?.headshot,
    readme: listing?.readme,
    tags: listing?.tags,
    type: details ? detailsWord(details) : undefined,
  };

  // what the package gives. A picture goes up only for a field the package may still set.
  const gives: Record<PackageField, Value> = {
    description: pkg.description,
    headshot: undefined,
    readme: pkg.readme,
    tags: pkg.tags?.filter(tag => !input.ownTags?.includes(tag)),
    type: pkg.type ? detailsWord({ type: pkg.type, superset: pkg.superset }) : undefined,
  };
  if (pkg.headshot) {
    if ('file' in pkg.headshot) gives.headshot = packageOwns(current.headshot, marked.headshot) ? await put(pkg.headshot.file, 'the listing has no new headshot') : NOT_UPLOADED;
    else if (input.byAdmin) gives.headshot = pkg.headshot.link;
    else notes.push('Its headshot is a link to another site, and an author’s own release takes only a picture in the item’s folder, so it was not taken');
  }
  if (pkg.readme && pkg.pictures.length && packageOwns(current.readme, marked.readme)) {
    const links: Record<string, string> = {};
    for (const path of pkg.pictures) {
      const link = await put(path, 'the README shows it as written');
      if (link) links[path] = link;
    }
    gives.readme = rewritePictures(pkg.readme, links);
  }

  const next = { ...current };
  const fields: PackageMark['fields'] = {};
  const filled: PackageField[] = [];
  const kept: PackageField[] = [];
  for (const field of PACKAGE_FIELDS) {
    const has = current[field];
    const given = gives[field];
    // the package doesn't name it: what is there stays, and stays the package's when it was
    if (isEmpty(given)) {
      if (marked[field]) fields[field] = marked[field];
      continue;
    }
    const print = fingerprint(given!);
    if (!isEmpty(has) && fingerprint(has!) === print) fields[field] = print;
    else if (packageOwns(has, marked[field])) {
      next[field] = given;
      fields[field] = print;
      filled.push(field);
    } else kept.push(field);
  }

  const change: AuthorListing = {};
  if (filled.includes('description')) change.description = next.description as string;
  if (filled.includes('headshot')) change.headshot = next.headshot as string;
  if (filled.includes('readme')) change.readme = next.readme as string;
  if (filled.includes('tags')) change.tags = next.tags as string[];
  if (Object.keys(change).length) await store.saveListing(itemId, withAuthorListing(listing, change), by);
  if (filled.includes('type')) await store.saveDetails(itemId, { type: pkg.type!, ...(pkg.superset && { superset: pkg.superset }) }, by);
  await store.saveMark({ id: itemId, version: input.version, fields }, by);
  return { filled, kept, notes };
}

/* ---------- what the sender is told ---------- */

const FIELD_WORDS: Record<PackageField, string> = { description: 'description', headshot: 'headshot', readme: 'README', tags: 'tags', type: 'type' };

const listed = (fields: PackageField[]) => {
  const words = fields.map(field => FIELD_WORDS[field]);
  return words.length > 1 ? `${words.slice(0, -1).join(', ')} and ${words.at(-1)}` : words[0];
};

/** One line on what the listing took from the package, or null when it took nothing. */
export function listingLine(fill: ListingFill): string | null {
  return fill.filled.length ? `Its listing took its ${listed(fill.filled)} from the package’s README.md.` : null;
}

/** What the sender should know: what was left because it was set by hand, then what could not be taken. */
export function listingNotes(fill: ListingFill): string[] {
  if (!fill.kept.length) return fill.notes;
  // "its tags were", "its headshot was"
  const one = fill.kept.length === 1 && fill.kept[0] !== 'tags';
  const left = `Its ${listed(fill.kept)} ${one ? 'was' : 'were'} set by hand on its page, so the package’s ${one ? 'was' : 'were'} not taken. Clear ${fill.kept.length > 1 ? 'one' : one ? 'it' : 'them'} there and the next release fills it`;
  return [left, ...fill.notes];
}
