import type {
  BestOutput,
  Channel,
  ExportMeta,
  ExportSkill,
  Library,
  MediaItem,
  MediaKind,
  Production,
  RegistrySkill,
  Run,
  Skill,
  SkillCategory,
  SkillsRegistry,
} from './types';
import { MEDIA_KINDS, PRODUCTION_STATUSES } from './types';

/** The export as read from disk: every file is optional except meta.json, and anything may be malformed. */
export interface RawExport {
  meta: ExportMeta | null;
  channels: unknown;
  productions: unknown;
  skills: unknown;
  runs: unknown;
  media: Partial<Record<MediaKind, unknown>>;
  problems: string[];
}

export const EMPTY_LIBRARY: Library = {
  meta: null,
  categories: [],
  channels: [],
  productions: [],
  skills: [],
  media: [],
  runs: [],
  channel: {},
  production: {},
  skill: {},
  item: {},
  usedIn: {},
  runsOfSkill: {},
  runsOfProduction: {},
  problems: [],
};

const list = (v: unknown): Record<string, unknown>[] => (Array.isArray(v) ? v.filter((x): x is Record<string, unknown> => !!x && typeof x === 'object') : []);
const str = (v: unknown): string | undefined => (typeof v === 'string' && v.trim() ? v : undefined);
const num = (v: unknown): number | undefined => (typeof v === 'number' && Number.isFinite(v) ? v : typeof v === 'string' && v.trim() && Number.isFinite(Number(v)) ? Number(v) : undefined);
const strings = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string' && !!x.trim()) : []);
const byName = (a: string, b: string) => a.localeCompare(b, undefined, { numeric: true });

/** "make-video-music-remix" → "Make video music remix". */
export function humanize(name: string): string {
  const words = name.replace(/[-_]+/g, ' ').trim();
  return words ? words[0].toUpperCase() + words.slice(1) : name;
}

/** The CLI keeps unsorted items under `_unsorted`; the export calls the kind `unsorted`. */
export function kindOf(v: unknown): MediaKind {
  const k = typeof v === 'string' ? v.replace(/^_/, '') : '';
  return (MEDIA_KINDS as readonly string[]).includes(k) ? (k as MediaKind) : 'unsorted';
}

/** 1–5, or null when unrated (or rated in words). */
export function ratingOf(item: Pick<MediaItem, 'rating'>): number | null {
  const n = num(item.rating);
  return n !== undefined && n >= 1 && n <= 5 ? Math.round(n) : null;
}

function normalizeItem(raw: Record<string, unknown>, fileKind: MediaKind): MediaItem | null {
  const id = str(raw.id);
  const path = str(raw.path);
  if (!id || !path) return null;
  const source = raw.source && typeof raw.source === 'object' ? (raw.source as MediaItem['source']) : undefined;
  const status = raw.status === 'cold' || raw.status === 'missing' ? raw.status : 'online';
  return {
    id,
    path,
    kind: raw.kind ? kindOf(raw.kind) : fileKind,
    subject: str(raw.subject),
    title: str(raw.title) ?? path.split('/').pop()!.replace(/\.[^.]+$/, ''),
    tags: strings(raw.tags),
    bytes: num(raw.bytes) ?? 0,
    width: num(raw.width),
    height: num(raw.height),
    duration: num(raw.duration),
    fps: num(raw.fps),
    hasAudio: typeof raw.hasAudio === 'boolean' ? raw.hasAudio : undefined,
    rating: typeof raw.rating === 'string' || typeof raw.rating === 'number' ? raw.rating : undefined,
    notes: Array.isArray(raw.notes) ? (raw.notes as MediaItem['notes']) : undefined,
    source,
    uses: strings(raw.uses),
    thumb: str(raw.thumb),
    preview: str(raw.preview),
    guess: str(raw.guess),
    status,
    dupes: strings(raw.dupes),
  };
}

function normalizeProduction(raw: Record<string, unknown>): Production | null {
  const slug = str(raw.slug);
  if (!slug) return null;
  const status = PRODUCTION_STATUSES.includes(raw.status as Production['status']) ? (raw.status as Production['status']) : 'active';
  return {
    slug,
    title: str(raw.title) ?? humanize(slug),
    artist: str(raw.artist),
    channel: str(raw.channel),
    song: str(raw.song),
    status,
    skills: strings(raw.skills),
    deliverFolder: str(raw.deliverFolder),
    thumbnail: str(raw.thumbnail),
    updatedAt: str(raw.updatedAt) ?? '',
    uses: num(raw.uses) ?? 0,
    deliveries: list(raw.deliveries).map(d => ({ what: str(d.what) ?? 'file', path: str(d.path) ?? '', at: str(d.at) ?? '', status: str(d.status) ?? '' })),
  };
}

function normalizeChannel(raw: Record<string, unknown>): Channel | null {
  const id = str(raw.id);
  if (!id) return null;
  return { id, name: str(raw.name) ?? id, folder: str(raw.folder) ?? '', logo: str(raw.logo), productions: strings(raw.productions) };
}

const bestOf = (v: unknown): BestOutput | undefined => {
  if (typeof v === 'string' && v.trim()) return { thumb: v };
  if (v && typeof v === 'object' && str((v as BestOutput).thumb)) return v as BestOutput;
  return undefined;
};

/** The registry (from the build) and the export's skills, merged: the export's entry wins, the registry fills in skills the export doesn't have yet. */
function mergeSkills(registry: SkillsRegistry | null, exported: Record<string, unknown>[]): Skill[] {
  const byNameMap = new Map<string, Skill>();
  const base = (r: RegistrySkill): Skill => ({ ...r, runs: 0, productions: [], variants: [], family: r.name });
  for (const r of registry?.skills ?? []) byNameMap.set(r.name, base(r));
  for (const raw of exported) {
    const e = raw as unknown as ExportSkill;
    if (!str(e.name)) continue;
    const had = byNameMap.get(e.name);
    byNameMap.set(e.name, {
      ...(had ?? base({ name: e.name, title: humanize(e.name), summary: '', description: '', category: 'other', location: 'committed', path: '' })),
      ...Object.fromEntries(Object.entries(e).filter(([, v]) => v !== undefined && v !== null)),
      runs: num(e.runs) ?? 0,
      lastRun: str(e.lastRun),
      productions: strings(e.productions),
      best: bestOf(e.bestOutput),
      drift: e.drift && typeof e.drift === 'object' && e.drift.upstream && e.drift.own ? e.drift : undefined,
      variants: [],
      family: e.name,
    } as Skill);
  }
  const skills = [...byNameMap.values()];
  const named = new Map(skills.map(s => [s.name, s]));
  for (const s of skills) if (s.variantOf && named.has(s.variantOf) && s.variantOf !== s.name) named.get(s.variantOf)!.variants.push(s.name);
  const rootOf = (name: string) => {
    const seen = new Set<string>();
    let at = name;
    while (named.get(at)?.variantOf && named.has(named.get(at)!.variantOf!) && !seen.has(at)) {
      seen.add(at);
      at = named.get(at)!.variantOf!;
    }
    return at;
  };
  for (const s of skills) {
    s.family = rootOf(s.name);
    s.variants.sort(byName);
  }
  return skills.sort((a, b) => byName(a.name, b.name));
}

/** The page's library from the registry and an export (either may be missing). */
export function buildLibrary(registry: SkillsRegistry | null, raw: RawExport | null): Library {
  const problems = [...(raw?.problems ?? [])];
  const channels = list(raw?.channels).map(normalizeChannel).filter((c): c is Channel => !!c);
  const productions = list(raw?.productions).map(normalizeProduction).filter((p): p is Production => !!p);
  const media: MediaItem[] = [];
  const seen = new Set<string>();
  for (const kind of MEDIA_KINDS) {
    for (const r of list(raw?.media[kind])) {
      const item = normalizeItem(r, kind);
      if (item && !seen.has(item.id)) {
        seen.add(item.id);
        media.push(item);
      }
    }
  }
  const runs: Run[] = list(raw?.runs)
    .map(r => ({ skill: str(r.skill) ?? '', session: str(r.session) ?? '', at: str(r.at) ?? '', production: str(r.production), verdict: str(r.verdict) }))
    .filter(r => r.skill && r.at)
    .sort((a, b) => b.at.localeCompare(a.at));
  const skills = mergeSkills(registry, list(raw?.skills));

  const channel = Object.fromEntries(channels.map(c => [c.id, c]));
  const production = Object.fromEntries(productions.map(p => [p.slug, p]));
  // a channel lists its productions, and a production names its channel: either side is enough
  for (const p of productions) if (p.channel && channel[p.channel] && !channel[p.channel].productions.includes(p.slug)) channel[p.channel].productions.push(p.slug);
  for (const c of channels) for (const slug of c.productions) if (production[slug] && !production[slug].channel) production[slug].channel = c.id;

  const usedIn: Record<string, MediaItem[]> = {};
  for (const m of media) for (const slug of m.uses) (usedIn[slug] ??= []).push(m);
  const runsOfSkill: Record<string, Run[]> = {};
  const runsOfProduction: Record<string, Run[]> = {};
  for (const r of runs) {
    (runsOfSkill[r.skill] ??= []).push(r);
    if (r.production) (runsOfProduction[r.production] ??= []).push(r);
  }

  return {
    meta: raw?.meta ?? null,
    categories: (registry?.categories ?? []) as SkillCategory[],
    channels: channels.sort((a, b) => byName(a.name, b.name)),
    productions: productions.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt) || byName(a.title, b.title)),
    skills,
    media,
    runs,
    channel,
    production,
    skill: Object.fromEntries(skills.map(s => [s.name, s])),
    item: Object.fromEntries(media.map(m => [m.id, m])),
    usedIn,
    runsOfSkill,
    runsOfProduction,
    problems,
  };
}

/** A skill's picture: its best output, else (a variant) the production it was modelled on, else one it was used in. */
export function skillThumb(lib: Library, s: Skill): string | undefined {
  if (s.best?.thumb) return s.best.thumb;
  const origin = s.variantRef ? lib.production[s.variantRef]?.thumbnail : undefined;
  if (origin) return origin;
  for (const slug of s.productions) if (lib.production[slug]?.thumbnail) return lib.production[slug].thumbnail;
  for (const v of s.variants) if (lib.skill[v]?.best?.thumb) return lib.skill[v].best!.thumb;
  return undefined;
}

/** A production's picture: its own, else an item it uses. */
export function productionThumb(lib: Library, p: Production): string | undefined {
  return p.thumbnail ?? lib.usedIn[p.slug]?.find(m => m.thumb && m.kind !== 'fonts')?.thumb;
}
