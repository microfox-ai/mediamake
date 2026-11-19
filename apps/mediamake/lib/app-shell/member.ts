import { updatePromptFor } from '@/lib/catalog/install-prompt';
import { itemPagePath } from '@/lib/catalog/paths';
import { shownOn } from '@/lib/catalog/shown';
import { isFailed, slugOf, type CatalogEntry, type ItemTier, type Readiness } from '@/lib/catalog/types';
import type { RegistrySkill } from '@/lib/library/types';
import { tierLabel } from '@/lib/memberships/tiers';
import type { LocalSkill, SkillUsage } from '@/lib/usage/usage';

/**
 * What the app's Home, Explore and Mine show, worked out from the catalog
 * as one member sees it (listCatalog with the locked items), what they ran
 * (lib/usage), what they installed (the catalog's install records) and the
 * skills their computers reported. Pure, so it can be tested; ./member-data
 * loads what goes in.
 */

export const MEMBER_KINDS = ['skill', 'mcp', 'app'] as const;
export type MemberKind = (typeof MEMBER_KINDS)[number];

export const KIND_LABEL: Record<MemberKind, { one: string; many: string }> = {
  skill: { one: 'Skill', many: 'Skills' },
  mcp: { one: 'MCP', many: 'MCPs' },
  app: { one: 'App', many: 'Apps' },
};

/** Tags that say nothing about what an item is for: left out of the categories. */
const NOT_A_CATEGORY = new Set(['variant', 'internal', 'mcp', 'claude', 'admin', 'deprecated']);

/** An item as the app's pages show it: the catalog's entry, with what the pages filter and link by. */
export type AppItem = CatalogEntry & {
  kind: MemberKind;
  tier: ItemTier;
  /** What it is for: a skill's registry category (make, create, pack…) and its listing's tags, an MCP's or app's tags. */
  categories: string[];
  /** A sub-skill or housekeeping skill: behind Explore's Internal filter. */
  internal?: boolean;
  variantOf?: string;
  /** Its own page. */
  page: string;
  /** Where Open goes: an app opens itself, a skill or an MCP its page. Its page when it is locked. */
  open: string;
  /** Lower case, what the search looks in. */
  text: string;
  /** Its level: Alpha, Beta or Production (`ready`). */
  level: Readiness;
  /** Beta: published, not yet proven (Alpha is `alpha`). */
  beta: boolean;
  /** Alpha: behind Explore's Alpha filter. */
  alpha: boolean;
  /** Deprecated on its listing: behind Explore's Deprecated filter. */
  deprecated: boolean;
  /** In the vault (tier admin): behind Explore's Admin only filter. */
  adminOnly: boolean;
  failed: boolean;
  locked: boolean;
  /** The membership that opens a locked item, e.g. `Pro`. */
  opensWith?: string;
};

function isMemberKind(kind: string): kind is MemberKind {
  return (MEMBER_KINDS as readonly string[]).includes(kind);
}

/**
 * The skills, MCPs and apps the app lists for one member, from their catalog
 * entries (locked ones included). The cohort's and the vault's stay out for
 * everyone below them (lib/catalog/shown).
 */
export function appItems(entries: CatalogEntry[], skills: RegistrySkill[] = [], internalCategories: string[] = []): AppItem[] {
  const registry = new Map(skills.map(skill => [`skill/${skill.name}`, skill]));
  const internal = new Set(internalCategories);
  const items: AppItem[] = [];
  for (const entry of entries) {
    if (!isMemberKind(entry.kind)) continue;
    const tier = entry.tier ?? 'public';
    const shown = shownOn('explore', { tier, readiness: entry.readiness, health: entry.health, archivedAt: entry.archivedAt, access: entry.access });
    if (!shown.show) continue;
    const skill = registry.get(entry.id);
    // a skill's category first, then the tags its listing adds
    const tags = (entry.tags ?? []).filter(tag => !NOT_A_CATEGORY.has(tag));
    const categories = skill ? [...new Set([skill.category, ...tags])] : tags;
    const page = itemPagePath(entry.id);
    const locked = !!shown.locked;
    const isInternal = skill ? (skill.internal ?? internal.has(skill.category)) : false;
    items.push({
      ...entry,
      kind: entry.kind,
      tier,
      categories,
      ...(isInternal && { internal: true }),
      ...(skill?.variantOf && { variantOf: skill.variantOf }),
      // anything that installs can be brought up to date the same way (install.md, Update an installed item)
      ...(!locked && entry.installPrompt && { updatePrompt: entry.updatePrompt ?? updatePromptFor(entry.id) }),
      page,
      open: !locked && entry.kind === 'app' && entry.href ? entry.href : page,
      text: [slugOf(entry.id), entry.title, entry.summary, skill?.description, skill?.variantOf, entry.madeBy?.name, ...(entry.tags ?? []), ...(entry.uses ?? []).map(use => use.id)]
        .filter(Boolean)
        .join(' ')
        .toLowerCase(),
      level: entry.readiness ?? 'beta',
      beta: shown.badge === 'beta',
      alpha: shown.badge === 'alpha',
      deprecated: entry.advice === 'deprecated',
      adminOnly: tier === 'admin',
      failed: isFailed(entry),
      locked,
      ...(locked && { opensWith: tierLabel(tier) }),
    });
  }
  return items;
}

/* ---------- Explore ---------- */

export interface ExploreFilters {
  q: string;
  kind: MemberKind | null;
  category: string | null;
  /** Failed items stay out until this is on. */
  failed: boolean;
  internal: boolean;
  archived: boolean;
  /** Alpha items stay out until this is on. */
  alpha: boolean;
  /** Deprecated items stay out until this is on. */
  deprecated: boolean;
  /** The vault's items (admin only) stay out until this is on: only admins have any. */
  admin: boolean;
  /** Off hides what the member's membership doesn't open. */
  locked: boolean;
  /** The store front (editors' picks, new, rows by tag) or the list. A search, a kind or a category is always the list. */
  view: 'store' | 'list';
}

export const EXPLORE_PARAMS = ['q', 'kind', 'category', 'show', 'locked', 'view'] as const;

export function exploreFiltersFrom(params: Record<string, string | string[] | undefined>): ExploreFilters {
  const one = (key: string) => {
    const value = params[key];
    return (Array.isArray(value) ? value[0] : value) || null;
  };
  const show = new Set((one('show') ?? '').split(','));
  const kind = one('kind');
  const filters = {
    q: one('q') ?? '',
    kind: kind && isMemberKind(kind) ? kind : null,
    category: one('category'),
    failed: show.has('failed'),
    internal: show.has('internal'),
    archived: show.has('archived'),
    alpha: show.has('alpha'),
    deprecated: show.has('deprecated'),
    admin: show.has('admin'),
    locked: one('locked') !== '0',
  };
  const asked = !!(
    filters.q.trim() ||
    filters.kind ||
    filters.category ||
    filters.failed ||
    filters.internal ||
    filters.archived ||
    filters.alpha ||
    filters.deprecated ||
    filters.admin ||
    !filters.locked
  );
  return { ...filters, view: asked || one('view') === 'all' ? 'list' : 'store' };
}

export interface ExploreResult {
  shown: AppItem[];
  /** How many match the search and the kind in each category. */
  categories: { id: string; count: number }[];
  /** How many match per kind, whatever kind is picked. */
  kinds: Record<MemberKind, number>;
  /** Matches a toggle keeps out, so a search never comes up empty without saying why. */
  hidden: { failed: number; internal: number; archived: number; alpha: number; deprecated: number; admin: number };
}

/** Production first, then Beta, then Alpha. */
const LEVEL_RANK: Record<Readiness, number> = { ready: 0, beta: 1, alpha: 2 };
const levelRank = (item: Pick<AppItem, 'level'>) => LEVEL_RANK[item.level] ?? 1;

/**
 * Explore's list: what matches the search, the kind and the category. Failed
 * items are only shown behind their filter; internal skills, archived, Alpha,
 * deprecated and admin-only items behind theirs. Best match first, then
 * Production before Beta before Alpha, then newest.
 */
export function explore(items: AppItem[], filters: ExploreFilters, categoryOrder: string[] = []): ExploreResult {
  const q = filters.q.trim().toLowerCase();
  const words = q.split(/\s+/).filter(Boolean);
  const score = (item: AppItem) => {
    if (!words.length) return 1;
    if (!words.every(word => item.text.includes(word))) return 0;
    const name = slugOf(item.id);
    return name === q ? 4 : name.includes(q) ? 3 : item.title.toLowerCase().includes(q) ? 2 : 1;
  };
  // why a matching item is kept out, if it is
  const keptOut = (item: AppItem): keyof ExploreResult['hidden'] | null =>
    item.failed && !filters.failed
      ? 'failed'
      : item.deprecated && !filters.deprecated
        ? 'deprecated'
        : item.adminOnly && !filters.admin
          ? 'admin'
          : item.alpha && !filters.alpha
            ? 'alpha'
            : item.internal && !filters.internal
              ? 'internal'
              : item.archivedAt && !filters.archived
                ? 'archived'
                : null;

  const matching = items.map(item => ({ item, score: score(item) })).filter(match => match.score > 0 && (filters.locked || !match.item.locked));
  const kinds: Record<MemberKind, number> = { skill: 0, mcp: 0, app: 0 };
  const counts = new Map<string, number>();
  const hidden = { failed: 0, internal: 0, archived: 0, alpha: 0, deprecated: 0, admin: 0 };
  const shown: { item: AppItem; score: number }[] = [];
  for (const match of matching) {
    const { item } = match;
    const inKind = !filters.kind || item.kind === filters.kind;
    const inCategory = !filters.category || item.categories.includes(filters.category);
    const out = keptOut(item);
    if (out) {
      if (inKind && inCategory) hidden[out]++;
      continue;
    }
    if (inCategory) kinds[item.kind]++;
    if (!inKind) continue;
    for (const category of item.categories) counts.set(category, (counts.get(category) ?? 0) + 1);
    if (inCategory) shown.push(match);
  }

  const order = new Map(categoryOrder.map((id, index) => [id, index]));
  return {
    shown: shown
      .sort(
        (a, b) =>
          b.score - a.score ||
          Number(a.item.locked) - Number(b.item.locked) ||
          levelRank(a.item) - levelRank(b.item) ||
          b.item.releasedAt.localeCompare(a.item.releasedAt) ||
          a.item.id.localeCompare(b.item.id),
      )
      .map(match => match.item),
    categories: [...counts.entries()]
      .map(([id, count]) => ({ id, count }))
      .sort((a, b) => (order.get(a.id) ?? 999) - (order.get(b.id) ?? 999) || b.count - a.count || a.id.localeCompare(b.id)),
    kinds,
    hidden,
  };
}

/* ---------- Explore's store front ---------- */

/** One row of the store front: a title, a few items, and how many there are behind See all. */
export interface StoreRow {
  /** The tag, for a row by tag: See all opens the list on it. */
  tag: string;
  title: string;
  /** What the tag is, in a line (the skill registry's words). */
  about?: string;
  items: AppItem[];
  total: number;
}

export interface Storefront {
  /** The editors' pick shown large at the top; none when nothing is picked. */
  hero: AppItem | null;
  /** The other editors' picks. */
  picks: AppItem[];
  /** The newest, by the day each first came out. */
  fresh: AppItem[];
  /** A row a tag, the registry's categories first, then the tags with the most items. */
  tags: StoreRow[];
}

/** The day an item first came out: what New goes by. */
export const launchedAt = (item: Pick<AppItem, 'launchedAt' | 'releasedAt'>) => item.launchedAt ?? item.releasedAt;

/** `lyric-video` as a row's title: `Lyric video`. */
export function tagTitle(tag: string): string {
  const words = tag.replace(/-/g, ' ');
  return words.charAt(0).toUpperCase() + words.slice(1);
}

/**
 * Explore's store front, like an app store's: the editors' picks (an
 * admin's flag on the item's listing), what is new, and a row a tag. Failed,
 * internal, archived, Alpha, deprecated and admin-only items stay out, as they
 * do in the list; a locked one shows, after the ones the member can open.
 */
export function storefront(
  items: AppItem[],
  categories: { id: string; about?: string }[] = [],
  { rowSize = 10, maxTagRows = 6, minTagItems = 3 }: { rowSize?: number; maxTagRows?: number; minTagItems?: number } = {},
): Storefront {
  const shown = items.filter(item => !item.failed && !item.internal && !item.archivedAt && !item.alpha && !item.deprecated && !item.adminOnly);
  const newest = (a: AppItem, b: AppItem) => launchedAt(b).localeCompare(launchedAt(a)) || a.id.localeCompare(b.id);
  // what the member can open first, then Production before Beta, then the newest
  const best = (a: AppItem, b: AppItem) => Number(a.locked) - Number(b.locked) || levelRank(a) - levelRank(b) || newest(a, b);

  const picked = shown.filter(item => item.editorsPick).sort(best);
  // the large one needs a picture of its own, when any pick has one
  const hero = picked.find(item => !item.locked && (item.headshot || item.video?.thumbnail)) ?? picked[0] ?? null;

  const order = new Map(categories.map((category, index) => [category.id, index]));
  const about = new Map(categories.map(category => [category.id, category.about]));
  const byTag = new Map<string, AppItem[]>();
  for (const item of shown) for (const tag of item.categories) byTag.set(tag, [...(byTag.get(tag) ?? []), item]);
  const tags = [...byTag.entries()]
    .filter(([, tagged]) => tagged.length >= minTagItems)
    .sort(([a, ofA], [b, ofB]) => (order.get(a) ?? 999) - (order.get(b) ?? 999) || ofB.length - ofA.length || a.localeCompare(b))
    .slice(0, maxTagRows)
    .map(([tag, tagged]) => ({ tag, title: tagTitle(tag), ...(about.get(tag) && { about: about.get(tag) }), items: [...tagged].sort(best).slice(0, rowSize), total: tagged.length }));

  return {
    hero,
    picks: picked.filter(item => item !== hero).slice(0, rowSize),
    fresh: [...shown].sort(newest).slice(0, rowSize),
    tags,
  };
}

/* ---------- What the member did ---------- */

/** The last time the member installed an item, from the catalog's install records. */
export interface InstallRecord {
  itemId: string;
  version?: string;
  at: string;
}

/** How often the member opened an app from the app, and when last. */
export interface AppOpens {
  app: string;
  opens: number;
  lastAt: string;
}

/** What one of the member's computers last reported (lib/usage). */
export interface DeviceSkills {
  device: string;
  skills: LocalSkill[];
  reportedAt: string;
}

/**
 * How much each MCP was used, from the skills that ran: a run of a skill
 * counts once for every MCP that skill works with. MCPs report nothing
 * themselves, so this is what "most used" means for them.
 */
export function mcpUsage(usage: SkillUsage[], skills: RegistrySkill[]): { mcp: string; runs: number; lastAt: string; skills: string[] }[] {
  const registry = new Map(skills.map(skill => [skill.name, skill]));
  const byMcp = new Map<string, { mcp: string; runs: number; lastAt: string; skills: string[] }>();
  for (const run of usage) {
    for (const use of registry.get(run.skill)?.mcps ?? []) {
      const entry = byMcp.get(use.id) ?? { mcp: use.id, runs: 0, lastAt: run.lastAt, skills: [] };
      entry.runs += run.runs;
      if (run.lastAt > entry.lastAt) entry.lastAt = run.lastAt;
      entry.skills.push(run.skill);
      byMcp.set(use.id, entry);
    }
  }
  return [...byMcp.values()].sort((a, b) => b.runs - a.runs || b.lastAt.localeCompare(a.lastAt) || a.mcp.localeCompare(b.mcp));
}

/** A skill whose name says it is a variant of `base`: `<base>-like-<ref>` or `<base>-v<N>` (fork-skill's names). */
export function variantBase(name: string, known: (base: string) => boolean): string | null {
  const like = name.indexOf('-like-');
  if (like > 0 && known(name.slice(0, like))) return name.slice(0, like);
  const version = /^(.+)-v\d+$/.exec(name);
  return version && known(version[1]) ? version[1] : null;
}

/** The version of a skill each computer has, and whether any differs from the catalog's. */
function onComputers(name: string, devices: DeviceSkills[]): { device: string; version?: string }[] {
  return devices.flatMap(device => {
    const skill = device.skills.find(local => local.name === name);
    return skill ? [{ device: device.device, ...(skill.version && { version: skill.version }) }] : [];
  });
}

/* ---------- Home ---------- */

export interface HomeRow {
  /** The catalog item, or none for a skill of the member's own (not in the catalog). */
  item?: AppItem;
  /** Its name when there is no item. */
  name: string;
  /** Why it is in the list, e.g. `12 runs` or `Installed 3 Nov`. */
  why: { type: 'runs' | 'opens' | 'installed'; count?: number; at: string; via?: string[] };
  /** The version installed differs from the catalog's latest. */
  updateAvailable?: boolean;
}

export interface HomeColumn {
  kind: MemberKind;
  mostUsed: HomeRow[];
  recent: HomeRow[];
}

export interface MemberActivity {
  usage: SkillUsage[];
  opens: AppOpens[];
  installs: InstallRecord[];
  devices: DeviceSkills[];
}

/** True when what the member has of an item is older than (or other than) the catalog's latest. */
function isBehind(item: AppItem, install: InstallRecord | undefined, devices: DeviceSkills[]): boolean {
  if (!item.version) return false;
  const local = item.kind === 'skill' ? onComputers(slugOf(item.id), devices).filter(on => on.version) : [];
  // a version a computer reports wins over the install record: it is what is there now
  if (local.length) return local.some(on => looksLikeVersion(on.version!) && on.version !== item.version);
  return !!install?.version && install.version !== item.version;
}

/** A SKILL.md version (1.2.0), not the short hash a skill without one reports. */
const looksLikeVersion = (value: string) => /^v?\d+(\.\d+)+/.test(value);

/**
 * Home's three columns: in each, what the member uses most (skills by their
 * runs, MCPs by the runs of the skills that work with them, apps by how
 * often they were opened from the app), then what they installed lately
 * that isn't listed already.
 */
export function homeColumns(items: AppItem[], activity: MemberActivity, skills: RegistrySkill[], limit = 5): HomeColumn[] {
  const byId = new Map(items.map(item => [item.id, item]));
  const installOf = new Map(activity.installs.map(install => [install.itemId, install]));
  const row = (id: string, name: string, why: HomeRow['why']): HomeRow => {
    const item = byId.get(id);
    return { ...(item && { item }), name: item?.title ?? name, why, ...(item && isBehind(item, installOf.get(id), activity.devices) && { updateAvailable: true }) };
  };

  const used: Record<MemberKind, HomeRow[]> = {
    skill: activity.usage.map(run => row(`skill/${run.skill}`, run.skill, { type: 'runs', count: run.runs, at: run.lastAt })),
    mcp: mcpUsage(activity.usage, skills)
      .filter(use => byId.has(use.mcp))
      .map(use => row(use.mcp, slugOf(use.mcp), { type: 'runs', count: use.runs, at: use.lastAt, via: use.skills })),
    app: activity.opens.filter(open => byId.has(open.app)).map(open => row(open.app, slugOf(open.app), { type: 'opens', count: open.opens, at: open.lastAt })),
  };

  return MEMBER_KINDS.map(kind => {
    const mostUsed = used[kind].slice(0, limit);
    const listed = new Set(mostUsed.map(entry => entry.item?.id));
    const recent = activity.installs
      .filter(install => byId.get(install.itemId)?.kind === kind && !listed.has(install.itemId))
      .sort((a, b) => b.at.localeCompare(a.at))
      .slice(0, limit)
      .map(install => row(install.itemId, slugOf(install.itemId), { type: 'installed', at: install.at }));
    return { kind, mostUsed, recent };
  });
}

/* ---------- Mine ---------- */

/** When the member last used something, and how much, in the days usage looks back. */
export interface Used {
  at: string;
  count: number;
  /** Skills and MCPs count runs (an MCP's are its skills'); apps count opens from the app. */
  type: 'runs' | 'opens';
}

/**
 * The last use of everything the member used, by item id (`skill/<name>`,
 * `mcp/<name>`, `app/<name>`). A skill of their own, not in the catalog, is
 * there under `skill/<name>` too.
 */
export function lastUsed(activity: Partial<Pick<MemberActivity, 'usage' | 'opens'>>, skills: RegistrySkill[] = []): Map<string, Used> {
  const used = new Map<string, Used>();
  for (const run of activity.usage ?? []) used.set(`skill/${run.skill}`, { at: run.lastAt, count: run.runs, type: 'runs' });
  for (const use of mcpUsage(activity.usage ?? [], skills)) used.set(use.mcp, { at: use.lastAt, count: use.runs, type: 'runs' });
  for (const open of activity.opens ?? []) used.set(open.app, { at: open.lastAt, count: open.opens, type: 'opens' });
  return used;
}

export interface MineItem {
  item: AppItem;
  installedAt?: string;
  installedVersion?: string;
  /** The computers that have it (skills only), with the version each reported. */
  on: { device: string; version?: string }[];
  updateAvailable?: boolean;
  /** None when it wasn't used in the days usage looks back. */
  used?: Used;
}

export interface LocalOnly {
  name: string;
  /** The catalog skill it is a variant of, when its name says so. */
  variantOf?: string;
  on: { device: string; version?: string }[];
}

export interface Mine {
  /** Catalog items the member installed, or has on a computer: the last used first, then the last installed. */
  installed: MineItem[];
  /** Their own variants of catalog skills, on their computers. */
  variants: LocalOnly[];
  /** The other skills their computers reported: their own, or from elsewhere. */
  local: LocalOnly[];
  devices: { device: string; skills: number; reportedAt: string }[];
}

export function mine(items: AppItem[], activity: Pick<MemberActivity, 'installs' | 'devices'> & Partial<Pick<MemberActivity, 'usage' | 'opens'>>, skills: RegistrySkill[] = []): Mine {
  const byId = new Map(items.map(item => [item.id, item]));
  const installOf = new Map(activity.installs.map(install => [install.itemId, install]));
  const localNames = [...new Set(activity.devices.flatMap(device => device.skills.map(skill => skill.name)))].sort();
  const usedOf = lastUsed(activity, skills);

  const ids = new Set<string>([...installOf.keys(), ...localNames.map(name => `skill/${name}`)]);
  const installed: MineItem[] = [];
  for (const id of ids) {
    const item = byId.get(id);
    if (!item) continue;
    const install = installOf.get(id);
    const used = usedOf.get(id);
    const on = item.kind === 'skill' ? onComputers(slugOf(id), activity.devices) : [];
    installed.push({
      item,
      ...(install && { installedAt: install.at }),
      ...(install?.version && { installedVersion: install.version }),
      on,
      ...(isBehind(item, install, activity.devices) && { updateAvailable: true }),
      ...(used && { used }),
    });
  }
  installed.sort((a, b) => (b.used?.at ?? '').localeCompare(a.used?.at ?? '') || (b.installedAt ?? '').localeCompare(a.installedAt ?? '') || a.item.title.localeCompare(b.item.title));

  const isCatalogSkill = (name: string) => byId.has(`skill/${name}`);
  const variants: LocalOnly[] = [];
  const local: LocalOnly[] = [];
  for (const name of localNames) {
    if (isCatalogSkill(name)) continue;
    const base = variantBase(name, isCatalogSkill);
    const entry = { name, on: onComputers(name, activity.devices) };
    if (base) variants.push({ ...entry, variantOf: base });
    else local.push(entry);
  }

  return {
    installed,
    variants,
    local,
    devices: activity.devices.map(device => ({ device: device.device, skills: device.skills.length, reportedAt: device.reportedAt })),
  };
}
