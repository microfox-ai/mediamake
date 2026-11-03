#!/usr/bin/env node
/**
 * skills: list, add and fork this repo's Claude Code skills, and keep SKILLS.md and skills.json up to date.
 *
 * Every skill is public and committed: nothing about a skill is hidden. (Apps and MCPs are the
 * gated ones; they go through private/ and the catalog releases, see docs/catalog-releases.md.)
 *
 * Where skills live:
 *   .agents/skills/<name>/     the skill's files, committed
 *   .claude/skills/<name>      a committed symlink to them, so the skill loads for anyone who
 *                              opens the repo in Claude Code
 * A new skill made as a real folder in .claude/skills is public too (it gets committed as it is);
 * `add` moves it to .agents/skills and links it, like the others.
 *
 * skills.json (mediamake.skills/v1) is the registry: every skill's name, category, summary, where it
 * is and what it is a variant of. The site (homepage Skills tab, /skills/<name>) and the Library page read it, and the media CLI
 * puts it in the library's export; nothing else parses SKILL.md.
 *
 * Usage: node tools/skills.mjs list [--category=<c>] [--json]
 *        node tools/skills.mjs add <name> | --all [--dry-run]   checks, then moves a .claude/skills
 *                                                               folder to .agents/skills and links it
 *        node tools/skills.mjs fork <base> <new-name> [--like=<ref>]   a variant of a skill
 *        node tools/skills.mjs diff <variant> [--stat] [--json]   what the variant changed against its
 *            base at the fork commit, and what the base changed since
 *        node tools/skills.mjs diff --all --json              the same numbers for every variant
 *        node tools/skills.mjs index                          rewrites SKILLS.md and skills.json
 *        node tools/skills.mjs check [--hook=session|edit]    fails when SKILLS.md or skills.json is out
 *            of date or a skill holds a key, a token or a path on this machine (exit 1; as a Claude
 *            Code hook: a SessionStart note, or exit 2 after a tool changed a skill). CI runs it on every PR.
 *
 * Names are <verb>-<thing>, the verb is the category (see CATEGORIES); a variant is
 * <base>-like-<ref> (or <base>-v<N> for a frozen older version) and says `variant-of` in its
 * frontmatter metadata, plus `forked-from: <base>@<commit>` when `fork` made it. `metadata.category`
 * overrides the verb. A skill that needs another skill's output says so in `metadata.depends-on`
 * (comma-separated names); the dependency is one-way.
 *
 * The MCPs a skill works with go in one table in its SKILL.md (by convention under
 * `## First: check the MCPs`), which the skill reads when it runs and the catalog offers when it is
 * installed (as choices, saying what each one is for and what the skill loses without it):
 *
 *   | MCP | Need | Used for | Without it |
 *   |---|---|---|---|
 *   | `mcp/elevenlabs` | required | sound effects for intros and end screens | no sound at all |
 *
 * Need is required (its main job needs it), recommended or optional; no `|` inside a cell. The
 * MCPs are catalog items: ours, or ones made by others listed in
 * apps/mediamake/lib/catalog/third-party.json. `check` fails on a malformed table.
 */
import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CLAUDE = path.join(ROOT, '.claude', 'skills');
const AGENTS = path.join(ROOT, '.agents', 'skills');
const INDEX = path.join(ROOT, 'SKILLS.md');
const REGISTRY = path.join(ROOT, 'skills.json');
const LOCK = path.join(ROOT, 'skills-lock.json');
const THIRD_PARTY = path.join(ROOT, 'apps', 'mediamake', 'lib', 'catalog', 'third-party.json');
export const REGISTRY_SCHEMA = 'mediamake.skills/v1';

/** How much a skill gets out of an MCP it uses (UseNeed in apps/mediamake/lib/catalog/types.ts). */
export const NEEDS = ['required', 'recommended', 'optional'];
/** Our own MCPs, released through the catalog rather than listed in third-party.json. */
const OUR_MCPS = new Set(['mcp/browse-hack', 'mcp/mediamake', 'mcp/projectsync']);
const MCP_HEADER = /^\|\s*MCP\s*\|\s*Need\s*\|\s*Used for\s*\|\s*Without it\s*\|$/i;

/**
 * Category by name prefix: what each verb means. Order is the order in SKILLS.md. `internal`
 * categories hold sub-skills and housekeeping (other skills call them, or they look after the
 * machine or the skills): the site lists them only when its "Internal" filter is on. A skill
 * overrides its category with `metadata.internal: true|false` in its SKILL.md.
 */
export const CATEGORIES = [
  { id: 'make', prefix: 'make-', about: 'Media making: videos and audio (the only skills that start with make-)' },
  { id: 'create', prefix: 'create-', about: 'Images and artwork' },
  { id: 'pack', prefix: 'pack-', about: 'Kits and packs that bundle several outputs' },
  { id: 'revise', prefix: 'revise-', about: 'Review loops with the user' },
  { id: 'analyze', prefix: 'analyze-', about: 'Breaking media down for later edits', internal: true },
  { id: 'write', prefix: 'write-', about: 'Text: titles, descriptions, metadata' },
  { id: 'cleanup', prefix: 'cleanup-', about: 'Housekeeping: disk space, archives and backups', internal: true },
  { id: 'update', prefix: 'update-', about: 'Keeping what MediaMake installed up to date', internal: true },
  { id: 'skill', suffix: '-skill', about: 'Managing skills themselves', internal: true },
  { id: 'remotion', prefix: 'remotion-', about: 'Remotion reference (installed from remotion-dev/skills)', internal: true },
  { id: 'other', about: 'Everything else' },
];

const args = process.argv.slice(2);
const flags = args.filter(a => a.startsWith('--'));
const [cmd, a1, a2] = args.filter(a => !a.startsWith('--'));
const flag = k => flags.find(f => f.startsWith(`--${k}=`))?.slice(k.length + 3);
const rel = p => path.relative(ROOT, p);

/**
 * name, description, version and one level of metadata from a SKILL.md's frontmatter. Values are
 * single lines, or folded/literal blocks (`>` / `|`).
 */
export const frontmatter = file => {
  const text = fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
  const m = text.match(/^---\n([\s\S]*?)\n---/);
  const out = { metadata: {} };
  if (!m) return out;
  const lines = m[1].split('\n');
  let inMeta = false;
  for (let i = 0; i < lines.length; i++) {
    const top = lines[i].match(/^([a-zA-Z_-]+):\s*(.*)$/);
    const sub = lines[i].match(/^\s+([a-zA-Z_-]+):\s*(.*)$/);
    let key;
    let value;
    let meta = false;
    if (top) {
      inMeta = top[1] === 'metadata' && !top[2].trim();
      if (inMeta) continue;
      [key, value] = [top[1], top[2]];
    } else if (sub && inMeta) [key, value, meta] = [sub[1], sub[2], true];
    else continue;
    if (/^[>|][+-]?$/.test(value.trim())) {
      const block = [];
      const indent = meta ? 4 : 2;
      while (i + 1 < lines.length && (lines[i + 1].startsWith(' '.repeat(indent)) || !lines[i + 1].trim())) block.push(lines[++i].trim());
      value = value.trim().startsWith('>') ? block.join(' ').replace(/\s+/g, ' ') : block.join('\n');
    }
    if (meta) out.metadata[key] = unquote(value);
    else out[key] = unquote(value);
  }
  return out;
};
const unquote = v => v.trim().replace(/^(['"])([\s\S]*)\1$/, '$2');
/** SKILL.md descriptions escape angle brackets for the markdown around them. */
const decode = s => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');

const categoryOf = (name, meta) =>
  meta.category ?? CATEGORIES.find(c => (c.prefix && name.startsWith(c.prefix)) || (c.suffix && name.endsWith(c.suffix)))?.id ?? 'other';

/** Listed only behind the site's "Internal" filter: the category's default, or the SKILL.md's own say. */
const internalOf = (category, meta) =>
  meta.internal === 'true' ? true : meta.internal === 'false' ? false : !!CATEGORIES.find(c => c.id === category)?.internal;

/** "make-video-music-remix" → "Make video music remix". */
const humanize = name => {
  const words = name.replace(/[-_]+/g, ' ').trim();
  return words ? words[0].toUpperCase() + words.slice(1) : name;
};

/** What a variant is modelled on: `metadata.variant-ref`, else its name past the base's (`-like-<ref>`, `-v<N>`). */
const variantRefOf = (name, base, meta) => {
  if (meta['variant-ref']) return meta['variant-ref'];
  if (!base || !name.startsWith(`${base}-`)) return undefined;
  return name.slice(base.length + 1).replace(/^like-/, '') || undefined;
};

/** Markdown emphasis and code marks off a table cell: the catalog shows it as plain text. */
const plainCell = s => s.replace(/\*\*|__|`/g, '').trim();

/**
 * The MCPs a skill works with, from the `| MCP | Need | Used for | Without it |` table in its
 * SKILL.md (see the header comment), and what is wrong with the table, by line.
 */
const mcpTable = file => {
  const lines = fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n').split('\n');
  // a table shown as an example, inside a code block, is not the skill's own
  let fenced = false;
  const start = lines.findIndex(line => {
    if (/^\s*(```|~~~)/.test(line)) fenced = !fenced;
    return !fenced && MCP_HEADER.test(line.trim());
  });
  const mcps = [];
  const errors = [];
  if (start < 0) return { mcps, errors };
  if (!/^\|[\s:|-]+\|$/.test(lines[start + 1]?.trim() ?? '')) errors.push(`SKILL.md:${start + 2}: the MCP table needs its |---| row under the header`);
  for (let i = start + 2; i < lines.length && lines[i].trim().startsWith('|'); i++) {
    const at = `SKILL.md:${i + 1}`;
    const cells = lines[i].trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map(c => c.trim());
    if (cells.length !== 4) {
      errors.push(`${at}: an MCP row has 4 cells (MCP | Need | Used for | Without it), this one ${cells.length}; no | inside a cell`);
      continue;
    }
    const [rawId, rawNeed, usedFor, without] = cells;
    const id = plainCell(rawId);
    const need = plainCell(rawNeed).toLowerCase();
    if (!/^mcp\/[a-z0-9][a-z0-9-]{0,63}$/.test(id)) errors.push(`${at}: "${rawId}" isn't a catalog MCP id like \`mcp/elevenlabs\``);
    else if (!NEEDS.includes(need)) errors.push(`${at}: need "${rawNeed}" isn't one of ${NEEDS.join(', ')}`);
    else if (!plainCell(usedFor) || !plainCell(without)) errors.push(`${at}: say what ${id} is used for and what the skill loses without it`);
    else if (mcps.some(m => m.id === id)) errors.push(`${at}: ${id} is in the table twice`);
    else mcps.push({ id, need, for: plainCell(usedFor), without: plainCell(without) });
  }
  return { mcps, errors };
};

/** skills-lock.json: skills vendored from other repos (`npx skills add`), by name → `owner/repo`. */
const vendored = () => {
  try {
    const lock = JSON.parse(fs.readFileSync(LOCK, 'utf8'));
    return new Map(Object.entries(lock.skills ?? {}).filter(([, s]) => s.sourceType === 'github' && s.source).map(([name, s]) => [name, s.source]));
  } catch {
    return new Map();
  }
};

/** The MCP ids listed in third-party.json. */
const thirdPartyIds = () => {
  try {
    return new Set(JSON.parse(fs.readFileSync(THIRD_PARTY, 'utf8')).items.map(item => item.id));
  } catch {
    return new Set();
  }
};

/**
 * A skill folder as its SKILL.md describes it, the shape `checks` takes. `where` is what only the
 * skills folders say (allSkills knows it); the media CLI reads the variants it shares this way.
 */
export const skillAt = (name, dir, where = {}) => {
  const fm = frontmatter(path.join(dir, 'SKILL.md'));
  const variantOf = fm.metadata['variant-of'];
  const { mcps, errors: mcpErrors } = mcpTable(path.join(dir, 'SKILL.md'));
  return {
    name,
    dir,
    /** false: a real folder in .claude/skills, not moved to .agents/skills yet */
    moved: where.moved,
    linked: where.linked,
    category: categoryOf(name, fm.metadata),
    internal: internalOf(categoryOf(name, fm.metadata), fm.metadata),
    title: fm.metadata.title,
    variantOf,
    variantRef: variantOf ? variantRefOf(name, variantOf, fm.metadata) : undefined,
    forkedFrom: fm.metadata['forked-from'],
    forked: fm.metadata.forked,
    dependsOn: (fm.metadata['depends-on'] ?? '').split(',').map(d => d.trim()).filter(Boolean),
    mcps,
    mcpErrors,
    upstream: where.upstream,
    version: fm.version ?? fm.metadata.version,
    description: fm.description ?? '',
    frontName: fm.name,
  };
};

/** Every skill in .claude/skills (and public ones not linked yet). */
export const allSkills = () => {
  const names = new Set([...(fs.existsSync(CLAUDE) ? fs.readdirSync(CLAUDE) : []), ...(fs.existsSync(AGENTS) ? fs.readdirSync(AGENTS) : [])]);
  const upstreams = vendored();
  const skills = [];
  for (const name of [...names].sort()) {
    const link = path.join(CLAUDE, name);
    const pub = path.join(AGENTS, name);
    const isLink = fs.existsSync(link) && fs.lstatSync(link).isSymbolicLink();
    const isDir = fs.existsSync(link) && !isLink && fs.statSync(link).isDirectory();
    if (!isLink && !isDir && !fs.existsSync(path.join(pub, 'SKILL.md'))) continue;
    const dir = isDir ? link : pub;
    if (!fs.existsSync(path.join(dir, 'SKILL.md'))) continue;
    skills.push(skillAt(name, dir, { moved: !isDir, linked: isLink || isDir, upstream: upstreams.get(name) }));
  }
  return skills;
};

/** The description's first sentence, short enough for a table cell or a card. */
const summary = d => {
  const first = decode(d.split(/(?<!\b(?:e\.g|i\.e|etc)\.)(?<=[.!?])\s+(?=[A-Z])/)[0]);
  return first.length > 170 ? `${first.slice(0, 167).trimEnd()}…` : first;
};

/** "elevenlabs (required), browse-hack (recommended)". */
const mcpList = mcps => mcps.map(m => `${m.id.slice('mcp/'.length)} (${m.need})`).join(', ');

const list = () => {
  let skills = allSkills();
  const cat = flag('category');
  if (cat) skills = skills.filter(s => s.category === cat);
  if (flags.includes('--json')) return console.log(JSON.stringify(skills.map(({ dir, ...s }) => ({ ...s, dir: rel(dir) })), null, 2));
  for (const c of CATEGORIES) {
    const group = skills.filter(s => s.category === c.id);
    if (!group.length) continue;
    console.log(`\n${c.id} · ${c.about}`);
    for (const s of group) console.log(`  ${s.moved ? '●' : '○'} ${s.name}${s.variantOf ? ` (variant of ${s.variantOf})` : ''}${s.dependsOn.length ? ` (needs ${s.dependsOn.join(', ')})` : ''}${s.mcps.length ? ` (MCPs: ${mcpList(s.mcps)})` : ''}${s.linked ? '' : '  [not linked in .claude/skills]'}`);
  }
  console.log('\n● in .agents/skills  ○ a folder in .claude/skills, not moved yet (run: node tools/skills.mjs add --all)');
};

/** The files a skill's checks read, and the only ones `media sync` shares: text, never binaries. */
export const TEXT_FILE = /\.(md|mjs|js|ts|tsx|py|json|txt|sh|ya?ml|env)$/;

/** What must not be committed (problems) or deserves a look (notes): every skill is public on GitHub. */
export const checks = skill => {
  const problems = [];
  const notes = [];
  if (skill.frontName !== skill.name) problems.push(`SKILL.md says name: ${skill.frontName}, the folder is ${skill.name}`);
  const names = new Set(allSkills().map(s => s.name));
  for (const d of skill.dependsOn) if (!names.has(d)) notes.push(`depends on ${d}, which isn't a skill in this repo`);
  const listed = thirdPartyIds();
  for (const m of skill.mcps) {
    if (!listed.has(m.id) && !OUR_MCPS.has(m.id)) notes.push(`uses ${m.id}, which isn't one of ours or in ${rel(THIRD_PARTY)}: list it there so installs can offer it`);
  }
  const walk = d => fs.readdirSync(d, { withFileTypes: true }).flatMap(e => (e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]));
  for (const file of walk(skill.dir)) {
    const size = fs.statSync(file).size;
    if (size > 1024 * 1024) notes.push(`${rel(file)} is ${(size / 1048576).toFixed(1)} MB: does it belong in a skill?`);
    if (size > 2 * 1024 * 1024 || !TEXT_FILE.test(file)) continue;
    const lines = fs.readFileSync(file, 'utf8').split('\n');
    lines.forEach((line, i) => {
      const at = `${rel(file)}:${i + 1}`;
      if (/\/Users\/[^/\s…]+|\/home\/[^/\s…]+|C:\\Users\\/.test(line)) problems.push(`${at} has a path on this machine`);
      if (/(sk-[a-zA-Z0-9_-]{20,}|AKIA[0-9A-Z]{16}|gh[pousr]_[a-zA-Z0-9]{30,}|xox[bap]-[a-zA-Z0-9-]{10,}|AIza[0-9A-Za-z_-]{30,}|-----BEGIN [A-Z ]*PRIVATE KEY|eyJ[a-zA-Z0-9_-]{30,}\.)/.test(line)) problems.push(`${at} looks like an API key or token`);
      if (/[\w.+-]+@[\w-]+\.[\w.]+/.test(line) && !/noreply@|example\.(com|org)/.test(line)) notes.push(`${at} has an email address`);
    });
  }
  return { problems, notes: [...new Set(notes)] };
};

/** SKILLS.md as it should be now. */
const renderIndex = skills => {
  const out = [
    '# Skills',
    '',
    'Claude Code skills in this repo. **Every skill is public**: its files are committed in',
    '`.agents/skills/<name>/` and `.claude/skills/<name>` links to them, so they load for anyone who',
    'opens the repo in Claude Code. Apps and MCPs are the ones that go through gated releases',
    '(see [catalog-releases.md](apps/mediamake/docs/catalog-releases.md)). The `publish-skill` skill',
    'adds a new skill and checks it for keys and private paths; `fork-skill` makes a variant.',
    '',
    'Regenerate this file and the registry, [`skills.json`](skills.json), with `node tools/skills.mjs index`',
    '(add and fork do it themselves); `node tools/skills.mjs check` fails when either is out of date or',
    'a skill holds a key or a path on this machine, in CI too. The mediamake app shows the registry at',
    '[`/skills`](https://mediamake.microfox.app/skills), rebuilt on every deploy, and in the Library',
    '(`/library`) with each skill\'s runs and outputs.',
    '',
    'A skill names the MCPs it works with in a `| MCP | Need | Used for | Without it |` table in its',
    'SKILL.md (see `publish-skill`): it checks them when it runs, and installing it from MediaMake offers',
    'each one, saying what it is for and what the skill loses without it.',
    '',
    '## Naming',
    '',
    'A skill is named `<verb>-<thing>`; the verb is its category:',
    '',
    ...CATEGORIES.filter(c => c.prefix || c.suffix).map(c => `- \`${c.prefix ?? `*${c.suffix}`}${c.prefix ? '*' : ''}\`: ${c.about}`),
    '',
    'A **variant** keeps its base skill\'s name and adds what it is modelled on: `<base>-like-<ref>`',
    '(e.g. `make-video-music-remix-like-f1xhitit`, the style of one finished edit), or `<base>-v<N>` for',
    'an older version kept as it was. Its frontmatter says `metadata: variant-of: <base>`, and',
    '`forked-from: <base>@<commit>` when `fork` made it: `node tools/skills.mjs diff <variant>` shows',
    'what the variant changed and what the base changed since.',
    '',
  ];
  for (const c of CATEGORIES) {
    const group = skills.filter(s => s.category === c.id);
    if (!group.length) continue;
    out.push(`## ${c.id}`, '', c.about, '', '| Skill | Visibility | What it does |', '|---|---|---|');
    for (const s of group) {
      const name = `[\`${s.name}\`](${rel(s.dir)}/SKILL.md)`;
      const mcps = s.mcps.length ? ` MCPs: ${mcpList(s.mcps)}.` : '';
      out.push(`| ${name}${s.variantOf ? ` (variant of \`${s.variantOf}\`)` : ''} | public | ${summary(s.description).replace(/\|/g, '/')}${mcps} |`);
    }
    out.push('');
  }
  return out.join('\n');
};

/** skills.json as it should be now: one entry per skill, keys left out when they have no value. */
const renderRegistry = skills => {
  const entry = s => {
    const e = {
      name: s.name,
      title: s.title ?? humanize(s.name),
      summary: summary(s.description),
      description: decode(s.description),
      category: s.category,
      internal: s.internal || undefined,
      location: s.moved ? 'committed' : 'local',
      path: rel(s.dir),
      variantOf: s.variantOf,
      variantRef: s.variantRef,
      forkedFrom: s.forkedFrom,
      dependsOn: s.dependsOn.length ? s.dependsOn : undefined,
      mcps: s.mcps.length ? s.mcps : undefined,
      upstream: s.upstream,
      version: s.version,
    };
    return Object.fromEntries(Object.entries(e).filter(([, v]) => v !== undefined && v !== ''));
  };
  const registry = {
    schema: REGISTRY_SCHEMA,
    categories: CATEGORIES.map(({ id, prefix, suffix, about, internal }) => ({ id, ...(prefix && { prefix }), ...(suffix && { suffix }), about, ...(internal && { internal }) })),
    skills: skills.map(entry),
  };
  return `${JSON.stringify(registry, null, 2)}\n`;
};

const index = () => {
  const skills = allSkills();
  fs.writeFileSync(INDEX, renderIndex(skills));
  fs.writeFileSync(REGISTRY, renderRegistry(skills));
  console.log(`✔ ${rel(INDEX)} and ${rel(REGISTRY)} (${skills.length} skills)`);
};

/** What changed since SKILLS.md and skills.json were written, or null when both are up to date. */
const staleness = () => {
  const skills = allSkills();
  const old = fs.existsSync(INDEX) ? fs.readFileSync(INDEX, 'utf8') : '';
  const oldRegistry = fs.existsSync(REGISTRY) ? fs.readFileSync(REGISTRY, 'utf8') : '';
  const indexStale = old !== renderIndex(skills);
  const registryStale = oldRegistry !== renderRegistry(skills);
  if (!indexStale && !registryStale) return null;
  let listed = new Set([...old.matchAll(/^\| \[?`([a-z0-9-]+)`/gm)].map(m => m[1]));
  if (!indexStale) {
    try {
      listed = new Set(JSON.parse(oldRegistry).skills.map(s => s.name));
    } catch {
      listed = new Set();
    }
  }
  const now = new Set(skills.map(s => s.name));
  const added = [...now].filter(n => !listed.has(n));
  const gone = [...listed].filter(n => !now.has(n));
  const parts = [added.length && `not listed: ${added.join(', ')}`, gone.length && `listed but gone: ${gone.join(', ')}`].filter(Boolean);
  const which = indexStale && registryStale ? 'SKILLS.md and skills.json are' : indexStale ? 'SKILLS.md is' : 'skills.json is';
  return `${which} out of date with the skills folder (${parts.join('; ') || 'a summary, category, visibility or variant changed'}). Run: node tools/skills.mjs index`;
};

/** Hook input from Claude Code: did this tool call touch a skill? */
const touchedSkills = () => {
  let input = {};
  try {
    input = JSON.parse(fs.readFileSync(0, 'utf8') || '{}');
  } catch {
    return false;
  }
  const t = input.tool_input ?? {};
  const where = `${t.file_path ?? ''} ${t.command ?? ''}`;
  return /\.claude\/skills|\.agents\/skills/.test(where);
};

/** Problems in any skill, as one message, or null. */
const leaks = () => {
  const found = allSkills().flatMap(s => checks(s).problems.map(p => `${s.name}: ${p}`));
  return found.length ? `Every skill is public, and these must not be committed:\n${found.map(f => `  ✖ ${f}`).join('\n')}\nUse a repo-relative path or an env var name instead.` : null;
};

/** Malformed MCP tables in any skill, as one message, or null. */
const mcpTables = () => {
  const found = allSkills().flatMap(s => s.mcpErrors.map(e => `${s.name}/${e}`));
  return found.length ? `These MCP tables can't be read (| MCP | Need | Used for | Without it |, need: ${NEEDS.join(' / ')}):\n${found.map(f => `  ✖ ${f}`).join('\n')}` : null;
};

const check = () => {
  const hook = flag('hook');
  if (hook === 'edit' && !touchedSkills()) return;
  const stale = [staleness(), leaks(), mcpTables()].filter(Boolean).join('\n') || null;
  if (!stale) return hook ? undefined : console.log(`✔ ${rel(INDEX)} and ${rel(REGISTRY)} are up to date`);
  if (hook === 'session') {
    // a note for Claude at the start of the session, and a line for the user
    return console.log(JSON.stringify({ systemMessage: `⚠ ${stale}`, hookSpecificOutput: { hookEventName: 'SessionStart', additionalContext: stale } }));
  }
  console.error(`⚠ ${stale}`);
  process.exit(hook === 'edit' ? 2 : 1);
};

const find = name => {
  const skill = allSkills().find(s => s.name === name);
  if (!skill) throw new Error(`No skill "${name}". Have: ${allSkills().map(s => s.name).join(', ')}`);
  return skill;
};

/** Moves skills made as real folders in .claude/skills to .agents/skills and links them. */
const add = () => {
  const skills = flags.includes('--all') ? allSkills().filter(s => !s.moved) : [find(a1)];
  if (!skills.length) return console.log('✔ every skill is in .agents/skills already');
  let failed = false;
  for (const skill of skills) {
    if (skill.moved) throw new Error(`${skill.name} is in .agents/skills already`);
    const { problems: leaked, notes } = checks(skill);
    const problems = [...leaked, ...skill.mcpErrors];
    for (const p of problems) console.log(`✖ ${skill.name}: ${p}`);
    for (const n of notes) console.log(`⚠ ${skill.name}: ${n}`);
    if (problems.length) {
      failed = true;
      continue;
    }
    if (flags.includes('--dry-run')) {
      console.log(`✔ ${skill.name} can be added (dry run: nothing moved)`);
      continue;
    }
    const to = path.join(AGENTS, skill.name);
    if (fs.existsSync(to)) throw new Error(`${rel(to)} exists already`);
    fs.mkdirSync(AGENTS, { recursive: true });
    fs.renameSync(skill.dir, to);
    fs.symlinkSync(path.relative(CLAUDE, to), path.join(CLAUDE, skill.name));
    console.log(`✔ ${skill.name}: ${rel(to)} ← ${rel(path.join(CLAUDE, skill.name))} (link)`);
  }
  if (!flags.includes('--dry-run')) index();
  if (failed) throw new Error('Fix the ✖ lines, then run add again');
};

const git = (...a) => execFileSync('git', a, { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], maxBuffer: 1 << 28 }).trim();

const fork = () => {
  const base = find(a1);
  const name = a2;
  if (!name || !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(name)) throw new Error('Usage: fork <base> <new-name> (lowercase words joined by -)');
  if (!name.startsWith(`${base.name}-`)) console.log(`⚠ a variant's name starts with its base's: ${base.name}-like-<ref> or ${base.name}-v<N>`);
  const to = path.join(AGENTS, name);
  if (fs.existsSync(to) || fs.lstatSync(path.join(CLAUDE, name), { throwIfNoEntry: false })) throw new Error(`${name} exists already`);
  let sha = null;
  try {
    sha = git('rev-parse', 'HEAD');
    if (git('status', '--porcelain', '--', rel(base.dir))) console.log(`⚠ ${base.name} has changes that aren't committed: diff counts them as the variant's own until they are`);
  } catch {
    console.log('⚠ not a git checkout: no forked-from commit, so diff will have to guess the fork point');
  }
  fs.cpSync(base.dir, to, { recursive: true });
  fs.symlinkSync(path.relative(CLAUDE, to), path.join(CLAUDE, name));
  const file = path.join(to, 'SKILL.md');
  const ref = flag('like') ?? name.replace(`${base.name}-`, '').replace(/^like-/, '');
  const today = new Date().toISOString().slice(0, 10);
  let text = fs.readFileSync(file, 'utf8');
  const [, fm, body] = text.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/) ?? [null, '', text];
  // a variant of a variant: its own lineage replaces the copied one
  let front = fm.replace(/^name:.*$/m, `name: ${name}`).replace(/^[ \t]+(variant-of|variant-ref|forked|forked-from):.*\n?/gm, '');
  // keep what the base does, drop its triggers ("Use when…"), so the variant never competes with it
  front = front.replace(/^description:\s*(.*)$/m, (_, d) => {
    const what = unquote(d).split(/\s+Use (?:when|this)\b/)[0].trim();
    const log = /Append new user feedback/.test(d) ? ' Append new user feedback to the log at the bottom.' : '';
    return `description: Variant of ${base.name} in the style of ${ref}: <what is different, one sentence>. ${what} Use only when the user names this variant or asks for the ${ref} style; otherwise ${base.name}.${log}`;
  });
  const meta = `  variant-of: ${base.name}\n  forked: ${today}${sha ? `\n  forked-from: ${base.name}@${sha.slice(0, 12)}` : ''}`;
  front = /^metadata:\s*$/m.test(front) ? front.replace(/^metadata:\s*$/m, `metadata:\n${meta}`) : `${front}\nmetadata:\n${meta}`;
  const h1 = body.match(/^# .*$/m);
  const note = `\n\n> **Variant of \`${base.name}\`** (forked ${today}), modelled on **${ref}**. Everything below is ${base.name} as it was that day, plus what this variant changes. Improvements to ${base.name} don't flow in by themselves: port the ones that fit (\`node tools/skills.mjs diff ${name}\` shows them).\n\n## This variant\n\n<What is different from ${base.name} and why: pacing, devices, type, sound, the reference project's prefs.md rules that define the look.>\n`;
  const newBody = h1 ? body.replace(h1[0], `# ${name}${note}`) : `# ${name}${note}\n${body}`;
  fs.writeFileSync(file, `---\n${front}\n---\n${newBody}`);
  console.log(`✔ ${rel(to)} from ${base.name}${sha ? `@${sha.slice(0, 12)}` : ''}; now fill in its description and "This variant"`);
  index();
};

/**
 * Where a variant was forked: `forked-from: <base>@<commit>`, else the commit that first added it
 * (a variant made before forked-from existed), else HEAD for one not committed yet.
 */
const forkPoint = variant => {
  const [, sha] = variant.forkedFrom?.match(/@([0-9a-f]{7,40})$/i) ?? [];
  if (sha) return { sha: git('rev-parse', `${sha}^{commit}`), guessed: false };
  const added = git('log', '--diff-filter=A', '--format=%H', '--', `.agents/skills/${variant.name}/SKILL.md`, `.claude/skills/${variant.name}/SKILL.md`).split('\n').filter(Boolean);
  return { sha: added.at(-1) ?? git('rev-parse', 'HEAD'), guessed: true };
};

/** `git diff --no-index` between two folders: numstat totals and the patch (labelled a/<left>, b/<right>). */
const diffDirs = (cwd, left, right, patch) => {
  const run = extra => spawnSync('git', ['diff', '--no-index', ...extra, left, right], { cwd, encoding: 'utf8', maxBuffer: 1 << 28 }).stdout ?? '';
  let files = 0;
  let added = 0;
  let removed = 0;
  for (const line of run(['--numstat']).split('\n').filter(Boolean)) {
    const [a, r] = line.split('\t');
    files++;
    added += Number(a) || 0;
    removed += Number(r) || 0;
  }
  return { files, added, removed, stat: files ? run(['--stat=100']) : '', patch: patch && files ? run([]) : '' };
};

/** What a variant changed against its base at the fork, and what the base changed since. */
const drift = (variant, { patch = false } = {}) => {
  if (!variant.variantOf) throw new Error(`${variant.name} isn't a variant (no metadata.variant-of)`);
  const base = find(variant.variantOf);
  const { sha, guessed } = forkPoint(variant);
  const short = sha.slice(0, 12);
  const at = [`.agents/skills/${base.name}`, `.claude/skills/${base.name}`].find(p => spawnSync('git', ['cat-file', '-e', `${sha}:${p}/SKILL.md`], { cwd: ROOT }).status === 0);
  if (!at) throw new Error(`${base.name} isn't in git at ${short}, the fork point of ${variant.name}`);
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'skills-diff-'));
  try {
    // the base as it was at the fork, and both skills as they are now, side by side
    const then = `${base.name}@${short}`;
    fs.mkdirSync(path.join(tmp, 'x'));
    execFileSync('tar', ['-x', '-C', path.join(tmp, 'x')], { input: execFileSync('git', ['archive', '--format=tar', sha, at], { cwd: ROOT, maxBuffer: 1 << 28 }) });
    fs.renameSync(path.join(tmp, 'x', at), path.join(tmp, then));
    fs.cpSync(variant.dir, path.join(tmp, variant.name), { recursive: true });
    fs.cpSync(base.dir, path.join(tmp, base.name), { recursive: true });
    const own = diffDirs(tmp, then, variant.name, patch);
    const upstream = diffDirs(tmp, then, base.name, patch);
    const commits = Number(git('rev-list', '--count', `${sha}..HEAD`, '--', `.agents/skills/${base.name}`, `.claude/skills/${base.name}`)) || 0;
    const date = git('show', '-s', '--format=%cs', sha);
    return { skill: variant.name, base: base.name, from: `${base.name}@${short}`, date, guessed, own, upstream: { commits, ...upstream } };
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
};

const diff = () => {
  const json = flags.includes('--json');
  const numbers = d => ({ ...d, own: { files: d.own.files, added: d.own.added, removed: d.own.removed }, upstream: { commits: d.upstream.commits, files: d.upstream.files, added: d.upstream.added, removed: d.upstream.removed } });
  if (flags.includes('--all')) {
    const skills = allSkills();
    const all = skills.filter(s => s.variantOf && skills.some(b => b.name === s.variantOf)).map(s => numbers(drift(s)));
    if (json) return console.log(JSON.stringify(all, null, 2));
    for (const d of all) console.log(`${d.skill}: its own changes ${d.own.files} files (+${d.own.added} −${d.own.removed}); ${d.base} since ${d.from}${d.guessed ? ' (guessed)' : ''}: ${d.upstream.commits} commits, ${d.upstream.files} files (+${d.upstream.added} −${d.upstream.removed})`);
    return;
  }
  if (!a1) throw new Error('Usage: diff <variant> [--stat] [--json], or diff --all [--json]');
  const d = drift(find(a1), { patch: !json && !flags.includes('--stat') });
  if (json) return console.log(JSON.stringify(numbers(d), null, 2));
  const counts = c => `${c.files} file${c.files === 1 ? '' : 's'}, +${c.added} −${c.removed}`;
  console.log(`${d.skill} · variant of ${d.base}, forked at ${d.from} (${d.date})${d.guessed ? ', guessed from the commit that added it (no forked-from)' : ''}\n`);
  console.log(`What ${d.skill} changed against ${d.from}: ${d.own.files ? counts(d.own) : 'nothing'}`);
  if (d.own.stat) console.log(d.own.stat);
  console.log(`What ${d.base} changed since: ${d.upstream.files ? `${d.upstream.commits} commit${d.upstream.commits === 1 ? '' : 's'}, ${counts(d.upstream)}` : 'nothing'}${d.upstream.files ? ' (port the ones that fit)' : ''}`);
  if (d.upstream.stat) console.log(d.upstream.stat);
  if (d.own.patch) console.log(`\n── ${d.skill} against ${d.from} ──\n\n${d.own.patch}`);
  if (d.upstream.patch) console.log(`\n── ${d.base} since ${d.from} ──\n\n${d.upstream.patch}`);
};

const main = () => {
  const commands = { list, add, publish: add, fork, diff, index, check };
  const run = commands[cmd];
  if (!run) {
    console.log(fs.readFileSync(fileURLToPath(import.meta.url), 'utf8').match(/\/\*\*([\s\S]*?)\*\//)[1].replace(/^ \* ?/gm, ''));
    process.exit(cmd ? 1 : 0);
  }
  run();
};

// a command (node tools/skills.mjs …); the media CLI imports frontmatter and checks without running one
if (process.argv[1] && fs.realpathSync(path.resolve(process.argv[1])) === fs.realpathSync(fileURLToPath(import.meta.url))) {
  try {
    main();
  } catch (err) {
    console.error(`✖ ${err.message}`);
    process.exit(1);
  }
}
