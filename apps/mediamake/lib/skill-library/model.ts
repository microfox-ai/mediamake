import type {
  Family,
  FileRef,
  Library,
  Production,
  ScannedProduction,
  ScannedSet,
  ScannedSkill,
  Skill,
  SkillLocation,
  SourceScan,
  VariantKind,
} from './types';
import { VARIANT_KINDS } from './types';

/** Category by name: the verb a skill's name starts with (same verbs as SKILLS.md). */
export const CATEGORIES: { id: string; prefix?: string; suffix?: string; about: string }[] = [
  { id: 'make', prefix: 'make-', about: 'Videos' },
  { id: 'create', prefix: 'create-', about: 'Images and artwork' },
  { id: 'pack', prefix: 'pack-', about: 'Kits that bundle several outputs' },
  { id: 'revise', prefix: 'revise-', about: 'Review loops' },
  { id: 'analyze', prefix: 'analyze-', about: 'Breaking media down' },
  { id: 'write', prefix: 'write-', about: 'Titles, descriptions, metadata' },
  { id: 'skill', suffix: '-skill', about: 'Managing skills' },
  { id: 'remotion', prefix: 'remotion-', about: 'Remotion reference' },
  { id: 'other', about: 'Everything else' },
];

export function categoryOf(name: string, override?: string): string {
  if (override) return override;
  return CATEGORIES.find(c => (c.prefix && name.startsWith(c.prefix)) || (c.suffix && name.endsWith(c.suffix)))?.id ?? 'other';
}

export const categoryAbout = (id: string) => CATEGORIES.find(c => c.id === id)?.about;

/** "make-video-music-remix" → "Make video music remix". */
export function humanize(name: string): string {
  const rest = name.replace(/[-_]+/g, ' ').trim();
  return rest ? rest[0].toUpperCase() + rest.slice(1) : name;
}

/** The description's first sentence, short enough for a card. */
export function firstSentence(d: string, max = 180): string {
  const first = d.split(/(?<!\b(?:e\.g|i\.e|etc|vs)\.)(?<=[.!?])\s+(?=[A-Z])/)[0]?.trim() ?? '';
  return first.length > max ? `${first.slice(0, max - 1).trimEnd()}…` : first;
}

const VARIANT_NAME = /^(.+?)-(?:like-(.+)|v(\d+))$/;
const PRODUCTION_MENTION = /projects\/([a-z0-9][a-z0-9_-]*)/gi;
const LOCATION_RANK: Record<SkillLocation, number> = { committed: 0, local: 1, folder: 2 };

const fileRef = (sourceId: string, path: string, dir: FileSystemDirectoryHandle, file: string): FileRef => ({
  key: `${sourceId}:${path ? `${path}/` : ''}${file}`,
  dir,
  file,
  path: path ? `${path}/${file}` : file,
});

const uniq = <T,>(xs: T[]) => [...new Set(xs)];
const strings = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string' && !!x.trim()) : []);
const byName = (a: string, b: string) => a.localeCompare(b, undefined, { numeric: true });

/** Merges every source's scan into one library: dedupes, finds variants and links skills to productions. */
export function buildLibrary(scans: { sourceId: string; scan: SourceScan }[]): Library {
  // ---- productions (first source wins on a slug clash)
  const rawProductions = new Map<string, ScannedProduction>();
  for (const { scan } of scans) for (const p of scan.productions) if (!rawProductions.has(p.slug)) rawProductions.set(p.slug, p);

  const sets: ScannedSet[] = scans.flatMap(s => s.scan.sets);
  const productionOfSet = (set: ScannedSet): string | undefined => {
    if (rawProductions.has(set.job)) return set.job;
    const hay = `${set.source ?? ''} ${set.path}`;
    for (const slug of rawProductions.keys()) if (new RegExp(`(^|/)${slug.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(/|$)`).test(hay)) return slug;
    return undefined;
  };
  const setRefs = (set: ScannedSet) => set.images.map(f => fileRef(set.sourceId, set.path, set.dir, f));

  const productions: Record<string, Production> = {};
  for (const [slug, p] of rawProductions) {
    const m = p.manifest;
    const own = m?.thumbnail ? fileRef(p.sourceId, p.path, p.dir, m.thumbnail) : p.thumbFile ? fileRef(p.sourceId, p.path, p.dir, p.thumbFile) : null;
    const gallery = sets.filter(s => productionOfSet(s) === slug).sort((a, b) => (a.kind === 'thumbnail' ? -1 : 0) - (b.kind === 'thumbnail' ? -1 : 0)).flatMap(setRefs);
    productions[slug] = {
      slug,
      title: m?.title ?? p.info?.title ?? humanize(slug),
      artist: m?.artist ?? p.info?.artist,
      project: typeof m?.project === 'string' ? m.project : undefined,
      summary: m?.summary,
      owner: m?.owner,
      tags: strings(m?.tags),
      sourceId: p.sourceId,
      path: p.path,
      dir: p.dir,
      manifest: m,
      lastModified: p.lastModified,
      skills: [],
      bornVariants: [],
      thumbnail: own ?? gallery[0] ?? null,
      gallery: gallery.slice(0, 12),
    };
  }

  // ---- skills (a name found twice: the committed copy, then the first source, wins)
  const found = new Map<string, ScannedSkill[]>();
  for (const { scan } of scans) for (const s of scan.skills) found.set(s.folder, [...(found.get(s.folder) ?? []), s]);

  const skills: Record<string, Skill> = {};
  for (const [name, copies] of found) {
    const s = [...copies].sort((a, b) => LOCATION_RANK[a.location] - LOCATION_RANK[b.location])[0];
    const m = s.manifest;
    const meta = s.frontmatter.metadata;
    const description = s.frontmatter.description ?? '';
    skills[name] = {
      name,
      title: m?.title ?? humanize(name),
      summary: m?.summary ?? firstSentence(description),
      description,
      category: categoryOf(name, m?.category ?? meta.category),
      tags: uniq([...strings(m?.tags), ...(meta.tags ? meta.tags.split(',').map(t => t.trim()).filter(Boolean) : [])]),
      owner: m?.owner ?? meta.owner ?? meta.author,
      location: s.location,
      copies: copies.map(c => ({ sourceId: c.sourceId, path: c.path, location: c.location })),
      sourceId: s.sourceId,
      path: s.path,
      dir: s.dir,
      manifest: m,
      version: s.frontmatter.version ?? meta.version,
      forked: meta.forked,
      lastModified: s.lastModified,
      variant: null,
      family: name,
      variants: [],
      productions: [],
      thumbnail: m?.thumbnail ? fileRef(s.sourceId, s.path, s.dir, m.thumbnail) : s.thumbFile ? fileRef(s.sourceId, s.path, s.dir, s.thumbFile) : null,
      preview: m?.preview ? fileRef(s.sourceId, s.path, s.dir, m.preview) : null,
      gallery: strings(m?.gallery).map(f => fileRef(s.sourceId, s.path, s.dir, f)),
    };
  }

  const mentions = (text: string) => uniq([...text.matchAll(PRODUCTION_MENTION)].map(x => x[1]).filter(slug => slug in productions));

  // ---- variants
  for (const s of Object.values(skills)) {
    const scanned = found.get(s.name)!.find(c => c.sourceId === s.sourceId && c.path === s.path)!;
    const mv = s.manifest?.variant;
    const meta = scanned.frontmatter.metadata;
    const named = s.name.match(VARIANT_NAME);
    const of = mv?.of ?? meta['variant-of'] ?? (named && named[1] in skills ? named[1] : undefined);
    if (!of || of === s.name) continue;
    const suffix = s.name.startsWith(`${of}-`) ? s.name.slice(of.length + 1) : '';
    const version = suffix.match(/^v(\d+)$/)?.[1];
    const ref = mv?.ref ?? meta['variant-ref'] ?? (version ? `v${version}` : suffix.replace(/^like-/, '')) ?? s.name;
    const production =
      (mv?.production && mv.production in productions ? mv.production : undefined) ??
      (ref in productions ? ref : undefined) ??
      mentions(`${s.description}\n${scanned.body.slice(0, 1500)}`)[0];
    const declared = (mv?.kind ?? meta['variant-kind']) as VariantKind | undefined;
    const kind: VariantKind = declared && VARIANT_KINDS.includes(declared) ? declared : version ? 'version' : production ? 'production' : 'style';
    const label = mv?.label ?? (kind === 'production' && production ? productions[production].title : kind === 'version' ? `${skills[of]?.title ?? humanize(of)} ${ref}` : ref.replace(/[-_]+/g, ' '));
    s.variant = { of, kind, ref, label, production };
    if (skills[of]) skills[of].variants.push(s.name);
    if (production) productions[production].bornVariants.push(s.name);
  }

  // ---- skill ↔ production links: manifests, mentions in SKILL.md, image sets a skill made
  const link = (skill: string, slug: string) => {
    if (!skills[skill] || !productions[slug] || skills[skill].variant?.production === slug) return;
    if (!skills[skill].productions.includes(slug)) skills[skill].productions.push(slug);
    if (!productions[slug].skills.includes(skill)) productions[slug].skills.push(skill);
  };
  for (const s of Object.values(skills)) {
    for (const slug of strings(s.manifest?.productions)) link(s.name, slug);
    const scanned = found.get(s.name)!.find(c => c.sourceId === s.sourceId && c.path === s.path)!;
    for (const slug of mentions(scanned.body)) link(s.name, slug);
  }
  for (const p of Object.values(productions)) for (const name of strings(p.manifest?.skills)) link(name, p.slug);
  for (const set of sets) {
    if (!set.workflow || !skills[set.workflow]) continue;
    const s = skills[set.workflow];
    const slug = productionOfSet(set);
    if (slug) link(s.name, slug);
    if (s.gallery.length < 12) s.gallery.push(...setRefs(set).slice(0, 12 - s.gallery.length));
  }

  // ---- families
  const rootOf = (name: string): string => {
    const seen = new Set<string>();
    let at = name;
    while (skills[at]?.variant && !seen.has(at)) {
      seen.add(at);
      at = skills[at].variant!.of;
    }
    return at;
  };
  for (const s of Object.values(skills)) s.family = rootOf(s.name);
  const families: Family[] = [];
  const roots = uniq(Object.values(skills).map(s => s.family)).sort(byName);
  for (const base of roots) {
    const variants: string[] = [];
    const walk = (name: string) => {
      const kids = Object.values(skills)
        .filter(k => k.variant?.of === name && k.name !== base)
        .sort((a, b) => (a.forked ?? '').localeCompare(b.forked ?? '') || byName(a.name, b.name));
      for (const k of kids) if (!variants.includes(k.name)) {
        variants.push(k.name);
        walk(k.name);
      }
    };
    walk(base);
    const members = [base, ...variants].filter(n => skills[n]);
    families.push({
      base,
      baseInstalled: !!skills[base],
      variants,
      productions: uniq(members.flatMap(n => [...skills[n].productions, ...(skills[n].variant?.production ? [skills[n].variant!.production!] : [])])),
    });
  }

  // ---- thumbnails: own file, then what it made, then where it came from
  for (const s of Object.values(skills)) {
    if (s.thumbnail) continue;
    const origin = s.variant?.production ? productions[s.variant.production]?.thumbnail : null;
    s.thumbnail = s.gallery[0] ?? origin ?? s.productions.map(p => productions[p]?.thumbnail).find(Boolean) ?? null;
  }
  for (const s of Object.values(skills)) {
    if (s.thumbnail || s.variant) continue;
    s.thumbnail = s.variants.map(v => skills[v].thumbnail).find(Boolean) ?? null;
  }
  for (const s of Object.values(skills)) s.variants.sort(byName);

  const counts = new Map<string, number>();
  for (const s of Object.values(skills)) counts.set(s.category, (counts.get(s.category) ?? 0) + 1);
  const order = CATEGORIES.map(c => c.id);
  const categories = [...counts]
    .map(([id, count]) => ({ id, count }))
    .sort((a, b) => (order.indexOf(a.id) + 1 || 99) - (order.indexOf(b.id) + 1 || 99) || byName(a.id, b.id));

  const owners = uniq([...Object.values(skills).map(s => s.owner), ...Object.values(productions).map(p => p.owner)].filter((o): o is string => !!o)).sort(byName);

  return { skills, productions, families, categories, owners };
}
