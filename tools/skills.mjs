#!/usr/bin/env node
/**
 * skills: list, add and fork this repo's Claude Code skills, and keep SKILLS.md up to date.
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
 * Usage: node tools/skills.mjs list [--category=<c>] [--json]
 *        node tools/skills.mjs add <name> | --all [--dry-run]   checks, then moves a .claude/skills
 *                                                               folder to .agents/skills and links it
 *        node tools/skills.mjs fork <base> <new-name> [--like=<ref>]   a variant of a skill
 *        node tools/skills.mjs index                          rewrites SKILLS.md
 *        node tools/skills.mjs check [--hook=session|edit]    fails when SKILLS.md is out of date or a
 *            skill holds a key, a token or a path on this machine (exit 1; as a Claude Code hook: a
 *            SessionStart note, or exit 2 after a tool changed a skill). CI runs it on every PR.
 *
 * Names are <verb>-<thing>, the verb is the category (see CATEGORIES); a variant is
 * <base>-like-<ref> (or <base>-v<N> for a frozen older version) and says `variant-of` in its
 * frontmatter metadata. `metadata.category` overrides the verb. A skill that needs another skill's
 * output says so in `metadata.depends-on` (comma-separated names); the dependency is one-way.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CLAUDE = path.join(ROOT, '.claude', 'skills');
const AGENTS = path.join(ROOT, '.agents', 'skills');
const INDEX = path.join(ROOT, 'SKILLS.md');

/** Category by name prefix: what each verb means. Order is the order in SKILLS.md. */
export const CATEGORIES = [
  { id: 'make', prefix: 'make-', about: 'Media making: videos (the only skills that start with make-)' },
  { id: 'create', prefix: 'create-', about: 'Images and artwork' },
  { id: 'pack', prefix: 'pack-', about: 'Kits and packs that bundle several outputs' },
  { id: 'revise', prefix: 'revise-', about: 'Review loops with the user' },
  { id: 'analyze', prefix: 'analyze-', about: 'Breaking media down for later edits' },
  { id: 'write', prefix: 'write-', about: 'Text: titles, descriptions, metadata' },
  { id: 'skill', suffix: '-skill', about: 'Managing skills themselves' },
  { id: 'remotion', prefix: 'remotion-', about: 'Remotion reference (installed from remotion-dev/skills)' },
  { id: 'other', about: 'Everything else' },
];

const args = process.argv.slice(2);
const flags = args.filter(a => a.startsWith('--'));
const [cmd, a1, a2] = args.filter(a => !a.startsWith('--'));
const flag = k => flags.find(f => f.startsWith(`--${k}=`))?.slice(k.length + 3);
const rel = p => path.relative(ROOT, p);

/** name, description and metadata from a SKILL.md's frontmatter (single-line values, one level of metadata). */
const frontmatter = file => {
  const text = fs.readFileSync(file, 'utf8');
  const m = text.match(/^---\n([\s\S]*?)\n---/);
  const out = { metadata: {} };
  if (!m) return out;
  let inMeta = false;
  for (const line of m[1].split('\n')) {
    const top = line.match(/^([a-zA-Z_-]+):\s*(.*)$/);
    const sub = line.match(/^\s+([a-zA-Z_-]+):\s*(.*)$/);
    if (top) {
      inMeta = top[1] === 'metadata' && !top[2];
      if (!inMeta) out[top[1]] = unquote(top[2]);
    } else if (sub && inMeta) out.metadata[sub[1]] = unquote(sub[2]);
  }
  return out;
};
const unquote = v => v.trim().replace(/^(['"])(.*)\1$/, '$2');

const categoryOf = (name, meta) =>
  meta.category ?? CATEGORIES.find(c => (c.prefix && name.startsWith(c.prefix)) || (c.suffix && name.endsWith(c.suffix)))?.id ?? 'other';

/** Every skill in .claude/skills (and public ones not linked yet). */
export const allSkills = () => {
  const names = new Set([...(fs.existsSync(CLAUDE) ? fs.readdirSync(CLAUDE) : []), ...(fs.existsSync(AGENTS) ? fs.readdirSync(AGENTS) : [])]);
  const skills = [];
  for (const name of [...names].sort()) {
    const link = path.join(CLAUDE, name);
    const pub = path.join(AGENTS, name);
    const isLink = fs.existsSync(link) && fs.lstatSync(link).isSymbolicLink();
    const isDir = fs.existsSync(link) && !isLink && fs.statSync(link).isDirectory();
    if (!isLink && !isDir && !fs.existsSync(path.join(pub, 'SKILL.md'))) continue;
    const dir = isDir ? link : pub;
    if (!fs.existsSync(path.join(dir, 'SKILL.md'))) continue;
    const fm = frontmatter(path.join(dir, 'SKILL.md'));
    skills.push({
      name,
      dir,
      /** false: a real folder in .claude/skills, not moved to .agents/skills yet */
      moved: !isDir,
      linked: isLink || isDir,
      category: categoryOf(name, fm.metadata),
      variantOf: fm.metadata['variant-of'],
      dependsOn: (fm.metadata['depends-on'] ?? '').split(',').map(d => d.trim()).filter(Boolean),
      description: fm.description ?? '',
      frontName: fm.name,
    });
  }
  return skills;
};

/** The description's first sentence, short enough for a table cell. */
const summary = d => {
  const first = d.split(/(?<!\b(?:e\.g|i\.e|etc)\.)(?<=[.!?])\s+(?=[A-Z])/)[0].replace(/\|/g, '/').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
  return first.length > 170 ? `${first.slice(0, 167).trimEnd()}…` : first;
};

const list = () => {
  let skills = allSkills();
  const cat = flag('category');
  if (cat) skills = skills.filter(s => s.category === cat);
  if (flags.includes('--json')) return console.log(JSON.stringify(skills.map(({ dir, ...s }) => ({ ...s, dir: rel(dir) })), null, 2));
  for (const c of CATEGORIES) {
    const group = skills.filter(s => s.category === c.id);
    if (!group.length) continue;
    console.log(`\n${c.id} · ${c.about}`);
    for (const s of group) console.log(`  ${s.moved ? '●' : '○'} ${s.name}${s.variantOf ? ` (variant of ${s.variantOf})` : ''}${s.dependsOn.length ? ` (needs ${s.dependsOn.join(', ')})` : ''}${s.linked ? '' : '  [not linked in .claude/skills]'}`);
  }
  console.log('\n● in .agents/skills  ○ a folder in .claude/skills, not moved yet (run: node tools/skills.mjs add --all)');
};

/** What must not be committed (problems) or deserves a look (notes): every skill is public on GitHub. */
const checks = skill => {
  const problems = [];
  const notes = [];
  if (skill.frontName !== skill.name) problems.push(`SKILL.md says name: ${skill.frontName}, the folder is ${skill.name}`);
  const names = new Set(allSkills().map(s => s.name));
  for (const d of skill.dependsOn) if (!names.has(d)) notes.push(`depends on ${d}, which isn't a skill in this repo`);
  const walk = d => fs.readdirSync(d, { withFileTypes: true }).flatMap(e => (e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]));
  for (const file of walk(skill.dir)) {
    const size = fs.statSync(file).size;
    if (size > 1024 * 1024) notes.push(`${rel(file)} is ${(size / 1048576).toFixed(1)} MB: does it belong in a skill?`);
    if (size > 2 * 1024 * 1024 || !/\.(md|mjs|js|ts|tsx|py|json|txt|sh|ya?ml|env)$/.test(file)) continue;
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
const renderIndex = () => {
  const skills = allSkills();
  const out = [
    '# Skills',
    '',
    'Claude Code skills in this repo. **Every skill is public**: its files are committed in',
    '`.agents/skills/<name>/` and `.claude/skills/<name>` links to them, so they load for anyone who',
    'opens the repo in Claude Code. Apps and MCPs are the ones that go through gated releases',
    '(see [catalog-releases.md](apps/mediamake/docs/catalog-releases.md)). The `publish-skill` skill',
    'adds a new skill and checks it for keys and private paths; `fork-skill` makes a variant.',
    '',
    'Regenerate this file with `node tools/skills.mjs index` (add and fork do it themselves);',
    '`node tools/skills.mjs check` fails when it is out of date or a skill holds a key or a path on',
    'this machine, in CI too. The mediamake app shows it at',
    '[`/skills`](https://mediamake.microfox.app/skills), rebuilt on every deploy.',
    '',
    '## Naming',
    '',
    'A skill is named `<verb>-<thing>`; the verb is its category:',
    '',
    ...CATEGORIES.filter(c => c.prefix || c.suffix).map(c => `- \`${c.prefix ?? `*${c.suffix}`}${c.prefix ? '*' : ''}\`: ${c.about}`),
    '',
    'A **variant** keeps its base skill\'s name and adds what it is modelled on: `<base>-like-<ref>`',
    '(e.g. `make-video-music-remix-like-f1xhitit`, the style of one finished edit), or `<base>-v<N>` for',
    'an older version kept as it was. Its frontmatter says `metadata: variant-of: <base>`.',
    '',
  ];
  for (const c of CATEGORIES) {
    const group = skills.filter(s => s.category === c.id);
    if (!group.length) continue;
    out.push(`## ${c.id}`, '', c.about, '', '| Skill | Visibility | What it does |', '|---|---|---|');
    for (const s of group) {
      const name = `[\`${s.name}\`](${rel(s.dir)}/SKILL.md)`;
      out.push(`| ${name}${s.variantOf ? ` (variant of \`${s.variantOf}\`)` : ''} | public | ${summary(s.description)} |`);
    }
    out.push('');
  }
  return { text: out.join('\n'), skills };
};

const index = () => {
  const { text, skills } = renderIndex();
  fs.writeFileSync(INDEX, text);
  console.log(`✔ ${rel(INDEX)} (${skills.length} skills)`);
};

/** What changed since SKILLS.md was written, or null when it is up to date. */
const staleness = () => {
  const { text, skills } = renderIndex();
  const old = fs.existsSync(INDEX) ? fs.readFileSync(INDEX, 'utf8') : '';
  if (old === text) return null;
  const listed = new Set([...old.matchAll(/^\| \[?`([a-z0-9-]+)`/gm)].map(m => m[1]));
  const now = new Set(skills.map(s => s.name));
  const added = [...now].filter(n => !listed.has(n));
  const gone = [...listed].filter(n => !now.has(n));
  const parts = [added.length && `not listed: ${added.join(', ')}`, gone.length && `listed but gone: ${gone.join(', ')}`].filter(Boolean);
  return `SKILLS.md is out of date with the skills folder (${parts.join('; ') || 'a summary, visibility or variant changed'}). Run: node tools/skills.mjs index`;
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

const check = () => {
  const hook = flag('hook');
  if (hook === 'edit' && !touchedSkills()) return;
  const stale = [staleness(), leaks()].filter(Boolean).join('\n') || null;
  if (!stale) return hook ? undefined : console.log(`✔ ${rel(INDEX)} is up to date`);
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
    const { problems, notes } = checks(skill);
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

const fork = () => {
  const base = find(a1);
  const name = a2;
  if (!name || !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(name)) throw new Error('Usage: fork <base> <new-name> (lowercase words joined by -)');
  if (!name.startsWith(`${base.name}-`)) console.log(`⚠ a variant's name starts with its base's: ${base.name}-like-<ref> or ${base.name}-v<N>`);
  const to = path.join(AGENTS, name);
  if (fs.existsSync(to) || fs.lstatSync(path.join(CLAUDE, name), { throwIfNoEntry: false })) throw new Error(`${name} exists already`);
  fs.cpSync(base.dir, to, { recursive: true });
  fs.symlinkSync(path.relative(CLAUDE, to), path.join(CLAUDE, name));
  const file = path.join(to, 'SKILL.md');
  const ref = flag('like') ?? name.replace(`${base.name}-`, '').replace(/^like-/, '');
  const today = new Date().toISOString().slice(0, 10);
  let text = fs.readFileSync(file, 'utf8');
  const [, fm, body] = text.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/) ?? [null, '', text];
  let front = fm.replace(/^name:.*$/m, `name: ${name}`);
  // keep what the base does, drop its triggers ("Use when…"), so the variant never competes with it
  front = front.replace(/^description:\s*(.*)$/m, (_, d) => {
    const what = unquote(d).split(/\s+Use (?:when|this)\b/)[0].trim();
    const log = /Append new user feedback/.test(d) ? ' Append new user feedback to the log at the bottom.' : '';
    return `description: Variant of ${base.name} in the style of ${ref}: <what is different, one sentence>. ${what} Use only when the user names this variant or asks for the ${ref} style; otherwise ${base.name}.${log}`;
  });
  const meta = `  variant-of: ${base.name}\n  forked: ${today}`;
  front = /^metadata:\s*$/m.test(front) ? front.replace(/^metadata:\s*$/m, `metadata:\n${meta}`) : `${front}\nmetadata:\n${meta}`;
  const h1 = body.match(/^# .*$/m);
  const note = `\n\n> **Variant of \`${base.name}\`** (forked ${today}), modelled on **${ref}**. Everything below is ${base.name} as it was that day, plus what this variant changes. Improvements to ${base.name} don't flow in by themselves: port the ones that fit.\n\n## This variant\n\n<What is different from ${base.name} and why: pacing, devices, type, sound, the reference project's prefs.md rules that define the look.>\n`;
  const newBody = h1 ? body.replace(h1[0], `# ${name}${note}`) : `# ${name}${note}\n${body}`;
  fs.writeFileSync(file, `---\n${front}\n---\n${newBody}`);
  console.log(`✔ ${rel(to)} from ${base.name}; now fill in its description and "This variant"`);
  index();
};

const main = () => {
  const commands = { list, add, publish: add, fork, index, check };
  const run = commands[cmd];
  if (!run) {
    console.log(fs.readFileSync(fileURLToPath(import.meta.url), 'utf8').match(/\/\*\*([\s\S]*?)\*\//)[1].replace(/^ \* ?/gm, ''));
    process.exit(cmd ? 1 : 0);
  }
  run();
};

try {
  main();
} catch (err) {
  console.error(`✖ ${err.message}`);
  process.exit(1);
}
