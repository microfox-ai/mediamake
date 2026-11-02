import { ratingOf } from './model';
import type { Library, MediaItem, Production, Skill } from './types';

const words = (q: string) => q.toLowerCase().split(/\s+/).filter(Boolean);
const byName = (a: string, b: string) => a.localeCompare(b, undefined, { numeric: true });

/* ---------- media ---------- */

export type MediaMode = 'all' | 'inbox' | 'dupes';

export interface MediaFacets {
  kind: string[];
  /** A subject or a subject's first part (`one-piece` matches `one-piece/zoro`). */
  subject: string | null;
  /** Every one of them. */
  tags: string[];
  quality: string[];
  source: string[];
  /** '5', '4' (4 and up), '3', 'unrated'. */
  rating: string | null;
  /** A production slug, or 'none'. */
  usedIn: string | null;
  status: string[];
}

export const NO_FACETS: MediaFacets = { kind: [], subject: null, tags: [], quality: [], source: [], rating: null, usedIn: null, status: [] };

export const QUALITIES = ['4K', '1440p', '1080p', '720p', 'SD', 'Audio'] as const;

/** By the picture's height (vertical by its width); audio-only items are 'Audio'. */
export function qualityOf(m: MediaItem): string | null {
  const side = m.height && m.width ? Math.min(m.height, m.width) : m.height;
  if (side) return side >= 2000 ? '4K' : side >= 1400 ? '1440p' : side >= 1000 ? '1080p' : side >= 700 ? '720p' : 'SD';
  if (m.kind === 'music' || m.kind === 'sfx' || (m.duration && m.hasAudio)) return 'Audio';
  return null;
}

const subjectMatches = (subject: string | undefined, want: string) => !!subject && (subject === want || subject.startsWith(`${want}/`));

function ratingMatches(m: MediaItem, want: string) {
  const r = ratingOf(m);
  if (want === 'unrated') return r === null;
  return r !== null && r >= Number(want);
}

function itemText(lib: Library, m: MediaItem): string {
  // a Suno take's prompt is its styles; its lyrics are searched too
  return [m.title, m.path, m.kind, m.subject, ...m.tags, m.source?.tool, m.source?.title, m.source?.ref, m.source?.prompt, m.lyrics, ...m.uses.map(u => lib.production[u]?.title ?? u), ...(m.notes ?? []).map(n => (typeof n === 'string' ? n : n.text))]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

export function inMode(m: MediaItem, mode: MediaMode) {
  if (mode === 'inbox') return m.kind === 'unsorted';
  if (mode === 'dupes') return !!m.dupes?.length;
  return true;
}

/** Whether an item passes the search and every facet but `skip` (for that facet's own counts). */
function passes(lib: Library, m: MediaItem, terms: string[], f: MediaFacets, skip?: keyof MediaFacets): boolean {
  if (skip !== 'kind' && f.kind.length && !f.kind.includes(m.kind)) return false;
  if (skip !== 'subject' && f.subject && !subjectMatches(m.subject, f.subject)) return false;
  if (skip !== 'tags' && f.tags.length && !f.tags.every(t => m.tags.includes(t))) return false;
  if (skip !== 'quality' && f.quality.length && !f.quality.includes(qualityOf(m) ?? '')) return false;
  if (skip !== 'source' && f.source.length && !f.source.includes(m.source?.tool ?? 'unknown')) return false;
  if (skip !== 'rating' && f.rating && !ratingMatches(m, f.rating)) return false;
  if (skip !== 'usedIn' && f.usedIn && (f.usedIn === 'none' ? m.uses.length > 0 : !m.uses.includes(f.usedIn))) return false;
  if (skip !== 'status' && f.status.length && !f.status.includes(m.status)) return false;
  if (!terms.length) return true;
  const text = itemText(lib, m);
  return terms.every(t => text.includes(t));
}

export type MediaSort = 'recent' | 'title' | 'rating' | 'size';

export function filterMedia(lib: Library, items: MediaItem[], query: string, f: MediaFacets, sort: MediaSort = 'recent'): MediaItem[] {
  const terms = words(query);
  const out = items.filter(m => passes(lib, m, terms, f));
  if (sort === 'title') return out.sort((a, b) => byName(a.title, b.title));
  if (sort === 'rating') return out.sort((a, b) => (ratingOf(b) ?? 0) - (ratingOf(a) ?? 0) || byName(a.title, b.title));
  if (sort === 'size') return out.sort((a, b) => b.bytes - a.bytes);
  return out; // the export's order: the CLI writes newest first
}

export interface FacetCounts {
  kind: Map<string, number>;
  /** Both `one-piece` and `one-piece/zoro`. */
  subject: Map<string, number>;
  tags: Map<string, number>;
  quality: Map<string, number>;
  source: Map<string, number>;
  rating: Map<string, number>;
  usedIn: Map<string, number>;
  status: Map<string, number>;
}

const bump = (map: Map<string, number>, key: string) => map.set(key, (map.get(key) ?? 0) + 1);

/** Each facet's values with how many items they'd show, given the search and the other facets. */
export function facetCounts(lib: Library, items: MediaItem[], query: string, f: MediaFacets): FacetCounts {
  const terms = words(query);
  const c: FacetCounts = { kind: new Map(), subject: new Map(), tags: new Map(), quality: new Map(), source: new Map(), rating: new Map(), usedIn: new Map(), status: new Map() };
  for (const m of items) {
    if (passes(lib, m, terms, f, 'kind')) bump(c.kind, m.kind);
    if (passes(lib, m, terms, f, 'subject') && m.subject) {
      const parts = m.subject.split('/');
      parts.forEach((_, i) => bump(c.subject, parts.slice(0, i + 1).join('/')));
    }
    if (passes(lib, m, terms, f, 'tags')) for (const t of m.tags) bump(c.tags, t);
    if (passes(lib, m, terms, f, 'quality')) {
      const q = qualityOf(m);
      if (q) bump(c.quality, q);
    }
    if (passes(lib, m, terms, f, 'source')) bump(c.source, m.source?.tool ?? 'unknown');
    if (passes(lib, m, terms, f, 'rating')) {
      const r = ratingOf(m);
      if (r === null) bump(c.rating, 'unrated');
      else for (const want of ['5', '4', '3']) if (r >= Number(want)) bump(c.rating, want);
    }
    if (passes(lib, m, terms, f, 'usedIn')) {
      if (!m.uses.length) bump(c.usedIn, 'none');
      for (const u of m.uses) bump(c.usedIn, u);
    }
    if (passes(lib, m, terms, f, 'status')) bump(c.status, m.status);
  }
  return c;
}

/* ---------- skills ---------- */

export interface SkillFilters {
  category: string | null;
  /** variant-drift: variants whose base changed since the fork. */
  type: 'all' | 'base' | 'variant' | 'drift';
  usage: 'all' | 'used' | 'unused';
}

export const NO_SKILL_FILTERS: SkillFilters = { category: null, type: 'all', usage: 'all' };

/** A variant whose base moved on after the fork. */
export const drifted = (s: Skill) => !!s.drift && s.drift.upstream.files > 0;

export function filterSkills(lib: Library, query: string, f: SkillFilters): Skill[] {
  const terms = words(query);
  return lib.skills.filter(s => {
    if (f.category && s.category !== f.category) return false;
    if (f.type === 'base' && s.variantOf) return false;
    if (f.type === 'variant' && !s.variantOf) return false;
    if (f.type === 'drift' && !drifted(s)) return false;
    if (f.usage === 'used' && !s.runs) return false;
    if (f.usage === 'unused' && s.runs) return false;
    if (!terms.length) return true;
    const text = [s.name, s.title, s.summary, s.description, s.category, s.variantOf, s.variantRef, ...s.productions.map(p => lib.production[p]?.title)].filter(Boolean).join(' ').toLowerCase();
    return terms.every(t => text.includes(t));
  });
}

/* ---------- productions ---------- */

export interface ProductionFilters {
  /** A channel id, or 'none'. */
  channel: string | null;
  status: string | null;
}

export const NO_PRODUCTION_FILTERS: ProductionFilters = { channel: null, status: null };

export function filterProductions(lib: Library, query: string, f: ProductionFilters): Production[] {
  const terms = words(query);
  return lib.productions.filter(p => {
    if (f.channel === 'none' ? !!p.channel && !!lib.channel[p.channel] : f.channel && p.channel !== f.channel) return false;
    if (f.status && p.status !== f.status) return false;
    if (!terms.length) return true;
    const text = [p.slug, p.title, p.artist, p.song, p.channel && lib.channel[p.channel]?.name, ...p.skills].filter(Boolean).join(' ').toLowerCase();
    return terms.every(t => text.includes(t));
  });
}
