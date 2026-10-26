import type { Family, Library, Production, Skill, VariantKind } from './types';

export interface SkillQuery {
  query: string;
  category: string | null;
  type: 'all' | 'base' | 'variant';
  variantKind: VariantKind | null;
  owner: string | null;
  /** Only these keys (`skill:<name>`), when set. */
  pinned: Set<string> | null;
  sort: 'name' | 'recent';
}

const words = (q: string) => q.toLowerCase().split(/\s+/).filter(Boolean);

function skillText(lib: Library, s: Skill): string {
  return [
    s.name,
    s.title,
    s.description,
    s.category,
    s.owner,
    ...s.tags,
    s.variant?.label,
    s.variant?.ref,
    s.variant?.kind,
    ...s.productions.map(p => lib.productions[p]?.title),
    s.variant?.production && lib.productions[s.variant.production]?.title,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

function productionText(lib: Library, p: Production): string {
  return [p.slug, p.title, p.artist, p.project, p.summary, p.owner, ...p.tags, ...p.skills, ...p.bornVariants.map(v => lib.skills[v]?.variant?.label)]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

const byName = (a: string, b: string) => a.localeCompare(b, undefined, { numeric: true });

/** The skills matching the query and filters, sorted. */
export function filterSkills(lib: Library, q: SkillQuery): Skill[] {
  const terms = words(q.query);
  const out = Object.values(lib.skills).filter(s => {
    if (q.category && s.category !== q.category) return false;
    if (q.type === 'base' && s.variant) return false;
    if (q.type === 'variant' && !s.variant) return false;
    if (q.variantKind && s.variant?.kind !== q.variantKind) return false;
    if (q.owner && s.owner !== q.owner) return false;
    if (q.pinned && !q.pinned.has(`skill:${s.name}`)) return false;
    if (!terms.length) return true;
    const text = skillText(lib, s);
    return terms.every(t => text.includes(t));
  });
  return out.sort((a, b) => (q.sort === 'recent' ? b.lastModified - a.lastModified : 0) || byName(a.name, b.name));
}

/** Families with at least one member matching; `members` are the matching names. */
export function filterFamilies(lib: Library, matching: Skill[]): (Family & { members: Set<string> })[] {
  const hit = new Set(matching.map(s => s.name));
  return lib.families
    .map(f => ({ ...f, members: new Set([f.base, ...f.variants].filter(n => hit.has(n))) }))
    .filter(f => f.members.size)
    .sort((a, b) => b.variants.length - a.variants.length || byName(a.base, b.base));
}

export function filterProductions(lib: Library, q: Pick<SkillQuery, 'query' | 'owner' | 'pinned' | 'sort'>): Production[] {
  const terms = words(q.query);
  const out = Object.values(lib.productions).filter(p => {
    if (q.owner && p.owner !== q.owner) return false;
    if (q.pinned && !q.pinned.has(`production:${p.slug}`)) return false;
    if (!terms.length) return true;
    const text = productionText(lib, p);
    return terms.every(t => text.includes(t));
  });
  return out.sort((a, b) => (q.sort === 'recent' ? b.lastModified - a.lastModified : 0) || byName(a.title, b.title));
}
