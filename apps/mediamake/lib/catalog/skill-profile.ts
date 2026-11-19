import type { RegistrySkill } from '@/lib/library/types';
import { MAX_LISTING_TAGS, parseTags } from './listing';
import { readmeBody } from './readme';
import { slugOf } from './types';

/**
 * A skill's details: what its page shows beside its README, and what whoever
 * may change the skill edits there (components/catalog/skill-details). Its
 * nature (who it is for), its type (how it sits among other skills), its
 * tags, the files its page lists and what it depends on. Kept in MongoDB
 * `skill_profiles` by the item's details key (./skill-profile-store), so a
 * skill in the store and one in a member's space have them alike. Pure, so
 * the pages, the route and the tests share it.
 */

/* ---------- nature and type ---------- */

/** Who a skill is for. Only a shared-use skill can be listed in the store. */
export const SKILL_NATURES = [
  { id: 'private-use', label: 'Private use', about: 'For you or your team. A loose README is fine, and it needs no production to prove it.' },
  { id: 'shared-use', label: 'Shared use', about: 'For other people, so it can be listed in the store. It needs a full README, and a finished production made with it.' },
] as const;
export type SkillNature = (typeof SKILL_NATURES)[number]['id'];

/** How a skill sits among other skills. Add a line here for a new type: the page, the dialog and the route read this list. */
export const SKILL_TYPES = [
  { id: 'internal', label: 'Internal', about: 'Other skills run it as a step, or it looks after the computer. People rarely start it themselves.' },
  { id: 'superset', label: 'Superset', about: 'The main skill of a family: its subset skills are narrower takes on it.' },
  { id: 'subset', label: 'Subset', about: 'One style or one part of a superset skill. Every subset names its superset.' },
  { id: 'mcp-use', label: 'MCP use', about: 'Mostly drives one MCP or app, and says how to use it well.' },
] as const;
export type SkillType = (typeof SKILL_TYPES)[number]['id'];

export const natureOf = (value: unknown): SkillNature | undefined => SKILL_NATURES.find(nature => nature.id === value)?.id;
export const typeOf = (value: unknown): SkillType | undefined => SKILL_TYPES.find(type => type.id === value)?.id;
export const natureInfo = (id: SkillNature) => SKILL_NATURES.find(nature => nature.id === id)!;
export const typeInfo = (id: SkillType) => SKILL_TYPES.find(type => type.id === id)!;

/** What is kept for one skill. A field left out was never set: the page shows its default. */
export interface SkillProfile {
  /** The item's details key: `catalog:skill/<name>`, `space:<spaceId>:skill/<name>`, `linked:<id>`. */
  key: string;
  nature?: SkillNature;
  type?: SkillType;
  /** A subset skill's superset: that skill's name, e.g. `make-kinetictype`. */
  superset?: string;
  /** A private skill's tags. A store skill's are on its listing (`catalog_listing`). */
  tags?: string[];
  updatedAt: string;
  updatedBy?: string;
}

/** A skill's details as its page shows them: what was set, else the default. */
export interface SkillDetailsView {
  nature: SkillNature;
  /** A store skill is shared use, always: its nature can't be changed. */
  natureFixed: boolean;
  type?: SkillType;
  /** The superset a subset skill belongs to. Only with type `subset`. */
  superset?: string;
  /** The superset's page, when it has one in the store. */
  supersetHref?: string;
  /** The tags that can be changed here. */
  tags: string[];
  /** Tags that come with the skill (its category, its README's): shown, not changed here. */
  ownTags: string[];
}

export const inStore = (key: string) => key.startsWith('catalog:');

/** The type a registry skill most likely is, until someone sets it. */
export function suggestedType(skill: Pick<RegistrySkill, 'internal' | 'variantOf'> | null | undefined, hasSubsets = false): SkillType | undefined {
  if (!skill) return undefined;
  if (skill.internal) return 'internal';
  if (skill.variantOf) return 'subset';
  if (hasSubsets) return 'superset';
  return undefined;
}

/** A skill's name as a superset is named: lower-case words joined by hyphens, or undefined. */
export const skillNameOf = (value: unknown): string | undefined => (typeof value === 'string' && /^[a-z0-9][a-z0-9-]{0,63}$/.test(value.trim()) ? value.trim() : undefined);

/** `nature` and `type` as a README.md's frontmatter states them: the skill's own word, until someone sets them in the app. */
export function readmeProfile(markdown: string | null | undefined): { nature?: SkillNature; type?: SkillType; superset?: string } {
  const front = markdown?.replace(/\r\n/g, '\n').match(/^---\n([\s\S]*?)\n---/)?.[1] ?? '';
  const value = (key: string) => front.match(new RegExp(`^${key}:\\s*["']?([\\w-]+)["']?\\s*$`, 'm'))?.[1];
  const nature = natureOf(value('nature'));
  const type = typeOf(value('type'));
  const superset = skillNameOf(value('superset'));
  return { ...(nature && { nature }), ...(type && { type }), ...(superset && { superset }) };
}

export function skillDetailsView(input: {
  key: string;
  profile?: Pick<SkillProfile, 'nature' | 'type' | 'superset' | 'tags'> | null;
  /** What its README.md's frontmatter says. */
  stated?: { nature?: SkillNature; type?: SkillType; superset?: string };
  suggested?: SkillType;
  /** The skill a registry variant was forked from: its superset, until someone names another. */
  variantOf?: string;
  /** The tags set where they are kept: a store skill's listing tags. */
  tags?: string[];
  ownTags?: string[];
}): SkillDetailsView {
  const store = inStore(input.key);
  const type = input.profile?.type ?? input.stated?.type ?? input.suggested;
  const superset = input.profile?.superset ?? input.stated?.superset ?? input.variantOf;
  const nature = input.profile?.nature ?? input.stated?.nature ?? 'private-use';
  const ownTags = input.ownTags ?? [];
  return {
    nature: store ? 'shared-use' : nature,
    natureFixed: store,
    ...(type && { type }),
    ...(type === 'subset' && superset && { superset }),
    tags: (store ? (input.tags ?? []) : (input.profile?.tags ?? [])).filter(tag => !ownTags.includes(tag)),
    ownTags,
  };
}

/** A change to a skill's details as the route takes it: each field given replaces what was there; `type: null` clears it. */
export interface ProfileChange {
  key: string;
  nature?: SkillNature;
  type?: SkillType | null;
  /** A subset's superset; null clears it. */
  superset?: string | null;
  tags?: string[];
}

const KEY = /^(catalog:skill\/[a-z0-9][a-z0-9-]{0,63}|space:[\w:./@ -]{1,200}:skill\/[\w.-]{1,100}|linked:[\w-]{1,100})$/;

export function parseProfileChange(body: unknown): ProfileChange | { error: string } {
  const { key, nature, type, superset, tags } = (body ?? {}) as Record<string, unknown>;
  if (typeof key !== 'string' || !KEY.test(key)) return { error: 'key names a skill' };
  const change: ProfileChange = { key };
  if (nature !== undefined) {
    const parsed = natureOf(nature);
    if (!parsed) return { error: `nature is one of ${SKILL_NATURES.map(entry => entry.id).join(', ')}` };
    if (inStore(key) && parsed !== 'shared-use') return { error: 'A skill in the store is shared use' };
    change.nature = parsed;
  }
  if (type !== undefined) {
    if (type === null || type === '') change.type = null;
    else {
      const parsed = typeOf(type);
      if (!parsed) return { error: `type is one of ${SKILL_TYPES.map(entry => entry.id).join(', ')}` };
      change.type = parsed;
    }
  }
  if (superset !== undefined) {
    if (superset === null || superset === '') change.superset = null;
    else {
      const parsed = skillNameOf(superset);
      if (!parsed) return { error: "superset is a skill's name, like make-kinetictype" };
      change.superset = parsed;
    }
  }
  if (change.type === 'subset' && !change.superset) return { error: 'A subset skill names its superset skill' };
  // only a subset has a superset
  if (change.type !== undefined && change.type !== 'subset') change.superset = null;
  if (tags !== undefined) {
    if (!Array.isArray(tags)) return { error: 'tags is a list of words' };
    const parsed = parseTags(tags);
    if (parsed.length > MAX_LISTING_TAGS) return { error: `at most ${MAX_LISTING_TAGS} tags` };
    change.tags = parsed;
  }
  if (change.nature === undefined && change.type === undefined && change.superset === undefined && change.tags === undefined) return { error: 'Give nature, type, superset or tags' };
  return change;
}

/* ---------- its files ---------- */

/** One folder (or one file) the browser lists: the skill's own folder first, then the engine and setup it uses. */
export interface SkillFileRoot {
  /** What the row says: the skill's name, `src/amv`, `scripts/amv.ts`. */
  label: string;
  kind: 'skill' | 'engine' | 'setup';
  /** Its files, as paths inside it. Empty with `file`: the root is one file. */
  files: string[];
  /** Where a path inside it opens on GitHub: `<url>/<path>`. None: the files are only named. */
  url?: string;
  /** The root is a single file: where it opens. */
  file?: string;
}

export interface SkillFiles {
  roots: SkillFileRoot[];
  /** More files exist than are listed. */
  truncated?: boolean;
}

const FOLDER = { skill: 'skills', mcp: 'mcps', app: 'apps' } as const;

/**
 * The files of one item out of its space's whole file list (lib/space SpaceCodeView): what is under
 * `skills/<name>/`. A linked item's repo is the item itself, so with nothing under that folder every
 * file is its own.
 */
export function spaceItemFiles(code: { files: string[]; repoUrl?: string; branch: string; truncated?: boolean }, kind: keyof typeof FOLDER, name: string): SkillFiles | null {
  const prefix = `${FOLDER[kind]}/${name}/`;
  const inFolder = code.files.filter(file => file.startsWith(prefix));
  const files = inFolder.length ? inFolder.map(file => file.slice(prefix.length)) : code.files.some(file => /^(skills|mcps|apps)\//.test(file)) ? [] : code.files;
  if (!files.length) return null;
  const base = code.repoUrl ? `${code.repoUrl}/blob/${encodeURIComponent(code.branch)}` : undefined;
  return {
    roots: [{ label: name, kind: 'skill', files, ...(base && { url: inFolder.length ? `${base}/${prefix.slice(0, -1)}` : base }) }],
    ...(code.truncated && { truncated: true }),
  };
}

const SCRIPTS = 'apps/studio/scripts/';

/** A registry skill's files: its folder, then the engine folders and setup scripts its SKILL.md names (tools/skills.mjs lists them). */
export function registrySkillFiles(skill: Pick<RegistrySkill, 'name' | 'path' | 'paths' | 'uses'>, github: string): SkillFiles | null {
  if (!skill.paths?.length) return null;
  const blob = `${github}/blob/main`;
  const uses = skill.uses ?? [];
  const engine = uses.filter(used => used.files);
  const scripts = uses.filter(used => !used.files && used.path.startsWith(SCRIPTS));
  const others = uses.filter(used => !used.files && !used.path.startsWith(SCRIPTS));
  return {
    roots: [
      { label: skill.name, kind: 'skill', files: skill.paths, url: `${blob}/${skill.path}` },
      ...engine.map((used): SkillFileRoot => ({ label: used.label, kind: 'engine', files: used.files ?? [], url: `${blob}/${used.path}` })),
      // its scripts are one folder: opening it lists the ones this skill uses
      ...(scripts.length ? [{ label: 'scripts', kind: 'setup' as const, files: scripts.map(used => used.path.slice(SCRIPTS.length)), url: `${blob}/${SCRIPTS.slice(0, -1)}` }] : []),
      ...others.map((used): SkillFileRoot => ({ label: used.label, kind: 'setup', files: [], file: `${blob}/${used.path}` })),
    ],
  };
}

/* ---------- what it depends on ---------- */

/** One thing a skill depends on: an MCP, an app or another skill. */
export interface SkillDependency {
  kind: 'mcp' | 'app' | 'skill';
  /** Its slug: `browse-hack`, `revise-video`. */
  name: string;
  /** `required`, `recommended` or `optional`, when the skill says. */
  need?: 'required' | 'recommended' | 'optional';
  /** What the skill uses it for, in a line. */
  note?: string;
}

/** How many dependencies show before "+N more". */
export const DEPENDENCIES_SHOWN = 5;

/** A registry skill's dependencies: its MCPs and apps (required first), then the skills it runs. */
export function registryDependencies(skill: Pick<RegistrySkill, 'mcps' | 'dependsOn'>, summaryOf: (name: string) => string | undefined = () => undefined): SkillDependency[] {
  const order = { required: 0, recommended: 1, optional: 2 };
  const uses = [...(skill.mcps ?? [])]
    .sort((a, b) => order[a.need] - order[b.need])
    .map((use): SkillDependency => ({ kind: use.id.startsWith('app/') ? 'app' : 'mcp', name: slugOf(use.id), need: use.need, note: use.for }));
  const skills = (skill.dependsOn ?? []).map((name): SkillDependency => ({ kind: 'skill', name, ...(summaryOf(name) && { note: summaryOf(name) }) }));
  return [...uses, ...skills];
}

/** The dependencies a space's item states in what it needs to run (`mcp:<id>`, `app:<name>`): the run sheet's words. */
export function needDependencies(needs: string[] | undefined): SkillDependency[] {
  const found = new Map<string, SkillDependency>();
  for (const need of needs ?? []) {
    const [kind, ...rest] = need.split(':');
    const name = rest.join(':').replace(/^(mcp|app)\//, '');
    if ((kind === 'mcp' || kind === 'app') && name) found.set(`${kind}/${name}`, { kind, name });
  }
  return [...found.values()];
}

/* ---------- the README guide ---------- */

/** One part a README should have, and whether this one has it. */
export interface ReadmeCheck {
  id: 'title' | 'what' | 'how' | 'uses' | 'outputs';
  label: string;
  /** What to write there. */
  about: string;
  ok: boolean;
  /** A shared-use skill must have it; a private-use one may skip it. */
  required: boolean;
}

/** The heading every shared-use README ends with. */
export const OUTPUTS_HEADING = 'What the skill outputs';

const heading = (line: string) => line.match(/^##\s+(.+?)\s*#*$/)?.[1].trim().toLowerCase();

/**
 * A README against the guide (docs/item-readme.md): its title, what the skill is, how to use it, what
 * it uses (when it depends on anything) and, last, what it outputs with examples. All of it is required
 * of a shared-use skill; a private-use one only gets them as suggestions.
 */
export function readmeChecks(markdown: string | null | undefined, nature: SkillNature, hasDependencies = false): ReadmeCheck[] {
  const body = readmeBody(markdown ?? '').replace(/```[\s\S]*?```/g, '');
  const lines = body.split('\n');
  const sections = lines.map(heading).filter((found): found is string => !!found);
  const titleAt = lines.findIndex(line => /^#\s+\S/.test(line));
  // what it is: a paragraph between the title and the first section
  const firstSection = lines.findIndex(line => /^##\s/.test(line));
  const intro = lines.slice(titleAt + 1, firstSection < 0 ? undefined : firstSection).some(line => /^[^#!<\s|>-]/.test(line.trim()) && !/^https?:\/\/\S+$/.test(line.trim()));
  const last = sections[sections.length - 1];
  const outputsAt = lines.findIndex(line => heading(line) === OUTPUTS_HEADING.toLowerCase());
  // an example is a picture, a video or a link after the heading
  const example = outputsAt >= 0 && lines.slice(outputsAt + 1).some(line => /!\[[^\]]*\]\([^)]+\)|https?:\/\/\S+/.test(line));
  const strict = nature === 'shared-use';
  const checks: ReadmeCheck[] = [
    { id: 'title', label: 'A title', about: 'One `# Heading`: the skill’s name as people say it.', ok: titleAt >= 0, required: strict },
    { id: 'what', label: 'What the skill is', about: 'A line or two under the title, so someone gets it at a glance.', ok: titleAt >= 0 && intro, required: strict },
    { id: 'how', label: 'How to use', about: '`## How to use`: the few steps a person takes, and what to say to Claude.', ok: sections.includes('how to use'), required: strict },
  ];
  if (hasDependencies)
    checks.push({
      id: 'uses',
      label: 'What it uses',
      about: '`## What it uses`: the skills it runs and the MCPs and apps it works with, and the part each one plays.',
      ok: sections.includes('what it uses'),
      required: strict,
    });
  checks.push({
    id: 'outputs',
    label: OUTPUTS_HEADING,
    about: `\`## ${OUTPUTS_HEADING}\`, always the last section: what you end up with, with examples (a picture, a video or a link).`,
    ok: last === OUTPUTS_HEADING.toLowerCase() && example,
    required: strict,
  });
  return checks;
}

/** A README to start from, in the guide's order. */
export function readmeTemplate(title: string, hasDependencies = true): string {
  return [
    `# ${title}`,
    '',
    'What it is, in a line or two.',
    '',
    '## How to use',
    '',
    '1. Say to Claude: **…**',
    '2. …',
    '',
    ...(hasDependencies ? ['## What it uses', '', '- `skill-name`: the part it plays', '- `mcp/name` (required): what it is used for, and what happens without it', ''] : []),
    `## ${OUTPUTS_HEADING}`,
    '',
    'What you end up with, and where it lands.',
    '',
    '![An example](shots/example.png)',
    '',
  ].join('\n');
}
