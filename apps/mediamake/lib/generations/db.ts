import { ObjectId, type Filter, type UpdateFilter } from 'mongodb';
import {
  GENERATION_KINDS,
  GENERATION_RATINGS,
  GENERATION_STATUSES,
  looksLikeRef,
  refFromInput,
  takeUrl,
  type Generation,
  type GenerationKind,
  type GenerationNote,
  type GenerationPreset,
  type GenerationRating,
  type GenerationSettings,
  type GenerationStatus,
} from './index';

/**
 * How generations are stored: the documents in the `generations` and
 * `generationPresets` collections, what the routes accept into them and the
 * queries they run. No database connection here (app/api/generations/model.ts
 * opens the collections), so it can be tested on its own.
 */

export interface GenerationDoc {
  _id?: ObjectId;
  projectId: string;
  clientId: string;
  tool: string;
  ref: string;
  kind: GenerationKind;
  parentRef?: string;
  sourceItem?: string;
  batchId?: string;
  title?: string;
  styles?: string;
  excludeStyles?: string;
  lyrics?: string;
  instrumental?: boolean;
  model?: string;
  settings?: GenerationSettings;
  workspace?: { id?: string; name?: string };
  status: GenerationStatus;
  audioUrl?: string;
  imageUrl?: string;
  duration?: number;
  credits?: number;
  rating: GenerationRating | null;
  notes: GenerationNote[];
  usedIn: string[];
  libraryItem: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface GenerationPresetDoc {
  _id?: ObjectId;
  projectId: string;
  name: string;
  tool: string;
  styles: string;
  excludeStyles: string;
  settings: GenerationSettings;
  createdBy: string;
  updatedAt: string;
}

/** Most takes one POST may carry. */
export const MAX_TAKES = 200;

type Parsed<T> = { ok: true; value: T } | { ok: false; error: string };

const TOOL = /^[a-z0-9][a-z0-9_-]{0,31}$/;
const SHA256 = /^[a-f0-9]{64}$/;
const SETTING_KEY = /^[A-Za-z][A-Za-z0-9_]{0,39}$/;
/** A production slug is a folder name: no spaces or slashes. */
const SLUG = /^[^\s/\\]{1,120}$/;
const STATUS_RANK: Record<GenerationStatus, number> = { queued: 0, generating: 1, complete: 2, failed: 2 };

/** A trimmed string cut to `max`, or undefined when empty or not a string. */
function text(value: unknown, max: number): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, max) : undefined;
}

function httpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:';
  } catch {
    return false;
  }
}

/** Known and tool-specific settings: short keys, string, number or boolean values. Anything else is dropped. */
export function cleanSettings(raw: unknown): GenerationSettings {
  const settings: GenerationSettings = {};
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return settings;
  for (const [key, value] of Object.entries(raw).slice(0, 30)) {
    if (!SETTING_KEY.test(key)) continue;
    if (typeof value === 'string' && value.trim()) settings[key] = value.trim().slice(0, 200);
    else if ((typeof value === 'number' && Number.isFinite(value)) || typeof value === 'boolean') settings[key] = value;
  }
  return settings;
}

/** One take from POST /api/generations, checked: the fields it carries, ready to $set. */
export interface TakeInput {
  tool: string;
  ref: string;
  /** Top-level fields plus `settings.<key>` and `workspace.<key>` paths, so a later save merges into an earlier one. */
  set: Record<string, unknown>;
  status?: GenerationStatus;
  createdAt?: string;
}

/**
 * Checks one take. Only the fields it carries are kept, so a later save (the
 * finished audio, say) adds to what an earlier one recorded instead of
 * clearing it. Rating, notes, usedIn and libraryItem are not accepted here:
 * they belong to the people rating the takes (PATCH /api/generations/[id]).
 */
export function parseTake(raw: unknown): Parsed<TakeInput> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return { ok: false, error: 'each item must be an object' };
  const item = raw as Record<string, unknown>;
  const tool = item.tool === undefined ? 'suno' : text(item.tool, 32)?.toLowerCase();
  if (!tool || !TOOL.test(tool)) return { ok: false, error: 'tool must be a short lowercase name such as "suno"' };
  const ref = text(item.ref, 200);
  if (!ref) return { ok: false, error: 'ref is required' };

  const set: Record<string, unknown> = {};
  const fail = (error: string): Parsed<TakeInput> => ({ ok: false, error });

  if (item.kind !== undefined && item.kind !== null) {
    if (!GENERATION_KINDS.includes(item.kind as GenerationKind)) return fail(`kind must be one of ${GENERATION_KINDS.join(', ')}`);
    set.kind = item.kind;
  }
  let status: GenerationStatus | undefined;
  if (item.status !== undefined && item.status !== null) {
    if (!GENERATION_STATUSES.includes(item.status as GenerationStatus)) return fail(`status must be one of ${GENERATION_STATUSES.join(', ')}`);
    status = item.status as GenerationStatus;
  }

  const strings: [string, number][] = [
    ['parentRef', 200],
    ['batchId', 200],
    ['title', 300],
    ['styles', 3000],
    ['excludeStyles', 1000],
    ['lyrics', 20000],
    ['model', 100],
  ];
  for (const [key, max] of strings) {
    const value = text(item[key], max);
    if (value !== undefined) set[key] = value;
  }
  for (const key of ['audioUrl', 'imageUrl']) {
    const value = text(item[key], 2000);
    if (value === undefined) continue;
    if (!httpUrl(value)) return fail(`${key} must be an http(s) URL`);
    set[key] = value;
  }
  const sourceItem = text(item.sourceItem, 64)?.toLowerCase();
  if (sourceItem !== undefined) {
    if (!SHA256.test(sourceItem)) return fail('sourceItem must be a SHA-256 hex digest');
    set.sourceItem = sourceItem;
  }
  if (item.instrumental !== undefined && item.instrumental !== null) {
    if (typeof item.instrumental !== 'boolean') return fail('instrumental must be true or false');
    set.instrumental = item.instrumental;
  }
  for (const key of ['duration', 'credits']) {
    const value = item[key];
    if (value === undefined || value === null) continue;
    if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) return fail(`${key} must be a number, 0 or more`);
    // A duration of 0 is a take still generating: unknown, not empty.
    if (key === 'duration' && value === 0) continue;
    set[key] = value;
  }
  for (const [key, value] of Object.entries(cleanSettings(item.settings))) set[`settings.${key}`] = value;
  if (item.workspace && typeof item.workspace === 'object') {
    const workspace = item.workspace as Record<string, unknown>;
    for (const key of ['id', 'name']) {
      const value = text(workspace[key], 200);
      if (value !== undefined) set[`workspace.${key}`] = value;
    }
  }

  let createdAt: string | undefined;
  if (typeof item.createdAt === 'string' || typeof item.createdAt === 'number') {
    const date = new Date(item.createdAt);
    if (!Number.isNaN(date.getTime())) createdAt = date.toISOString();
  }
  return { ok: true, value: { tool, ref, set, status, createdAt } };
}

/** Takes repeated in one POST become one: later fields win. */
export function mergeTakes(takes: TakeInput[]): TakeInput[] {
  const byKey = new Map<string, TakeInput>();
  for (const take of takes) {
    const key = `${take.tool}\u0000${take.ref}`;
    const prev = byKey.get(key);
    byKey.set(
      key,
      prev
        ? { ...prev, set: { ...prev.set, ...take.set }, status: take.status ?? prev.status, createdAt: prev.createdAt ?? take.createdAt }
        : take,
    );
  }
  return [...byKey.values()];
}

/**
 * The upsert for one take. A new take starts unrated with no notes; an
 * existing one keeps its rating, notes, usedIn, libraryItem, project and
 * creator, and its status never goes back (a late "generating" after
 * "complete" is ignored).
 */
export function takeUpdate(
  take: TakeInput,
  { projectId, clientId, now, existingStatus }: { projectId: string; clientId: string; now: string; existingStatus?: GenerationStatus },
): UpdateFilter<GenerationDoc> {
  const $set: Record<string, unknown> = { ...take.set, clientId, updatedAt: now };
  if (take.status && (!existingStatus || STATUS_RANK[take.status] >= STATUS_RANK[existingStatus])) $set.status = take.status;
  const $setOnInsert: Record<string, unknown> = {
    projectId,
    createdBy: clientId,
    createdAt: take.createdAt ?? now,
    rating: null,
    notes: [],
    usedIn: [],
    libraryItem: null,
  };
  if (!('kind' in $set)) $setOnInsert.kind = 'create';
  if (!('status' in $set)) $setOnInsert.status = take.set.audioUrl ? 'complete' : 'queued';
  return { $set, $setOnInsert } as UpdateFilter<GenerationDoc>;
}

/**
 * Checks a PATCH body: rating replaces (null clears it), note is appended,
 * usedIn slugs are added, libraryItem replaces (null clears it).
 */
export function parsePatch(raw: unknown, clientId: string, now: string): Parsed<UpdateFilter<GenerationDoc>> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return { ok: false, error: 'Send a JSON object' };
  const body = raw as Record<string, unknown>;
  const $set: Record<string, unknown> = {};
  const update: Record<string, unknown> = {};

  if (body.rating !== undefined) {
    if (body.rating !== null && !GENERATION_RATINGS.includes(body.rating as GenerationRating))
      return { ok: false, error: `rating must be one of ${GENERATION_RATINGS.join(', ')} or null` };
    $set.rating = body.rating;
  }
  if (body.note !== undefined && body.note !== null) {
    const note = text(body.note, 2000);
    if (!note) return { ok: false, error: 'note must be some text' };
    update.$push = { notes: { at: now, by: clientId, text: note } };
  }
  if (body.usedIn !== undefined && body.usedIn !== null) {
    const slugs = (Array.isArray(body.usedIn) ? body.usedIn : [body.usedIn]).map(s => (typeof s === 'string' ? s.trim() : s));
    if (!slugs.length || slugs.length > 50 || slugs.some(s => typeof s !== 'string' || !SLUG.test(s)))
      return { ok: false, error: 'usedIn must be a production slug or a list of them' };
    update.$addToSet = { usedIn: { $each: slugs } };
  }
  if (body.libraryItem !== undefined) {
    const item = typeof body.libraryItem === 'string' ? body.libraryItem.trim().toLowerCase() : body.libraryItem;
    if (item !== null && (typeof item !== 'string' || !SHA256.test(item)))
      return { ok: false, error: 'libraryItem must be a SHA-256 hex digest or null' };
    $set.libraryItem = item;
  }
  if (!Object.keys($set).length && !Object.keys(update).length)
    return { ok: false, error: 'Nothing to change: pass rating, note, usedIn or libraryItem' };
  return { ok: true, value: { ...update, $set: { ...$set, updatedAt: now } } as UpdateFilter<GenerationDoc> };
}

/** The page after a take, newest first: its createdAt and id. */
export function encodeCursor(doc: Pick<GenerationDoc, 'createdAt' | '_id'>): string {
  return Buffer.from(JSON.stringify([doc.createdAt, doc._id?.toString()])).toString('base64url');
}

export function decodeCursor(cursor: string): { createdAt: string; id: ObjectId } | null {
  try {
    const [createdAt, id] = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8'));
    if (typeof createdAt !== 'string' || typeof id !== 'string' || !ObjectId.isValid(id)) return null;
    return { createdAt, id: new ObjectId(id) };
  } catch {
    return null;
  }
}

/** `a,b` → ['a', 'b'] */
const list = (value: string | null) =>
  (value ?? '')
    .split(',')
    .map(v => v.trim())
    .filter(Boolean);

/**
 * The query for GET /api/generations. rating, kind and model take one value
 * or a comma-separated list (rating `unrated` is the takes nobody rated); q
 * is a word search over title, styles and lyrics, or a take's id or
 * suno.com/song link, which finds it and the takes made from it.
 */
export function listFilter(projectId: string, params: URLSearchParams): Parsed<Filter<GenerationDoc>> {
  const filter: Filter<GenerationDoc> = { projectId };
  const and: Filter<GenerationDoc>[] = [];

  const tool = params.get('tool')?.trim().toLowerCase();
  if (tool) filter.tool = tool;

  const ratings = list(params.get('rating'));
  if (ratings.length) {
    const bad = ratings.find(r => r !== 'unrated' && !GENERATION_RATINGS.includes(r as GenerationRating));
    if (bad) return { ok: false, error: `rating must be ${GENERATION_RATINGS.join(', ')} or unrated` };
    filter.rating = { $in: ratings.map(r => (r === 'unrated' ? null : (r as GenerationRating))) };
  }
  const kinds = list(params.get('kind'));
  if (kinds.length) {
    if (kinds.some(k => !GENERATION_KINDS.includes(k as GenerationKind)))
      return { ok: false, error: `kind must be one of ${GENERATION_KINDS.join(', ')}` };
    filter.kind = { $in: kinds as GenerationKind[] };
  }
  const models = list(params.get('model'));
  if (models.length) filter.model = { $in: models };

  const parentRef = params.get('parentRef')?.trim();
  if (parentRef) filter.parentRef = refFromInput(parentRef);

  const q = params.get('q')?.trim();
  if (q && looksLikeRef(q)) {
    const ref = refFromInput(q);
    and.push({ $or: [{ ref }, { parentRef: ref }] });
  } else if (q) {
    filter.$text = { $search: q.slice(0, 200) };
  }

  const cursor = params.get('cursor');
  if (cursor) {
    const after = decodeCursor(cursor);
    if (!after) return { ok: false, error: 'cursor is not one this API returned' };
    and.push({ $or: [{ createdAt: { $lt: after.createdAt } }, { createdAt: after.createdAt, _id: { $lt: after.id } }] });
  }
  if (and.length) filter.$and = and;
  return { ok: true, value: filter };
}

export function toGeneration(doc: GenerationDoc): Generation {
  return {
    id: doc._id?.toString() ?? '',
    projectId: doc.projectId,
    clientId: doc.clientId,
    tool: doc.tool,
    ref: doc.ref,
    kind: doc.kind ?? 'create',
    parentRef: doc.parentRef ?? null,
    sourceItem: doc.sourceItem ?? null,
    batchId: doc.batchId ?? null,
    title: doc.title ?? '',
    styles: doc.styles ?? '',
    excludeStyles: doc.excludeStyles ?? '',
    lyrics: doc.lyrics ?? '',
    instrumental: doc.instrumental ?? false,
    model: doc.model ?? '',
    settings: doc.settings ?? {},
    workspace: doc.workspace ?? null,
    status: doc.status ?? 'queued',
    audioUrl: doc.audioUrl ?? null,
    imageUrl: doc.imageUrl ?? null,
    duration: doc.duration ?? null,
    credits: doc.credits ?? null,
    rating: doc.rating ?? null,
    notes: doc.notes ?? [],
    usedIn: doc.usedIn ?? [],
    libraryItem: doc.libraryItem ?? null,
    createdBy: doc.createdBy,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
    url: takeUrl(doc.tool, doc.ref),
    parentUrl: takeUrl(doc.tool, doc.parentRef),
  };
}

export interface PresetInput {
  id?: string;
  name: string;
  tool: string;
  styles: string;
  excludeStyles: string;
  settings: GenerationSettings;
}

/** Checks a preset from POST /api/generations/presets. With an id it replaces that preset (a rename); without, the one with that name. */
export function parsePreset(raw: unknown): Parsed<PresetInput> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return { ok: false, error: 'Send a JSON object' };
  const body = raw as Record<string, unknown>;
  const name = text(body.name, 100);
  if (!name) return { ok: false, error: 'name is required' };
  const tool = body.tool === undefined ? 'suno' : text(body.tool, 32)?.toLowerCase();
  if (!tool || !TOOL.test(tool)) return { ok: false, error: 'tool must be a short lowercase name such as "suno"' };
  const id = text(body.id, 24);
  if (id !== undefined && !/^[a-f0-9]{24}$/i.test(id)) return { ok: false, error: 'id is not a preset id' };
  return {
    ok: true,
    value: {
      id,
      name,
      tool,
      styles: text(body.styles, 3000) ?? '',
      excludeStyles: text(body.excludeStyles, 1000) ?? '',
      settings: cleanSettings(body.settings),
    },
  };
}

export function toPreset(doc: GenerationPresetDoc): GenerationPreset {
  return {
    id: doc._id?.toString() ?? '',
    projectId: doc.projectId,
    name: doc.name,
    tool: doc.tool,
    styles: doc.styles ?? '',
    excludeStyles: doc.excludeStyles ?? '',
    settings: doc.settings ?? {},
    createdBy: doc.createdBy,
    updatedAt: doc.updatedAt,
  };
}
