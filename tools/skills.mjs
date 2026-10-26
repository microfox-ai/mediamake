#!/usr/bin/env node
/**
 * skills: list, publish and fork this repo's Claude Code skills, and keep SKILLS.md up to date.
 *
 * Where skills live:
 *   private  .claude/skills/<name>/          a real folder, gitignored: stays on this machine
 *   public   .agents/skills/<name>/          committed; .claude/skills/<name> is a symlink to it
 *            (the symlink is committed too, so the skill loads for anyone who opens the repo)
 *
 * Usage: node tools/skills.mjs list [--category=<c>] [--private | --public] [--json]
 *        node tools/skills.mjs publish <name> [--dry-run]     checks, then moves it to .agents/skills
 *        node tools/skills.mjs unpublish <name>               moves it back (git history keeps what was pushed)
 *        node tools/skills.mjs fork <base> <new-name> [--like=<ref>]   a private variant of a skill
 *        node tools/skills.mjs index                          rewrites SKILLS.md
 *        node tools/skills.mjs check [--hook=session|edit]    warns when SKILLS.md is out of date
 *            (exit 1; as a Claude Code hook: a SessionStart note, or exit 2 after a tool changed a skill)
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
      visibility: isDir ? 'private' : 'public',
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
  if (flags.includes('--private')) skills = skills.filter(s => s.visibility === 'private');
  if (flags.includes('--public')) skills = skills.filter(s => s.visibility === 'public');
  if (flags.includes('--json')) return console.log(JSON.stringify(skills.map(({ dir, ...s }) => ({ ...s, dir: rel(dir) })), null, 2));
  for (const c of CATEGORIES) {
    const group = skills.filter(s => s.category === c.id);
    if (!group.length) continue;
    console.log(`\n${c.id} · ${c.about}`);
    for (const s of group) console.log(`  ${s.visibility === 'public' ? '●' : '○'} ${s.name}${s.variantOf ? ` (variant of ${s.variantOf})` : ''}${s.dependsOn.length ? ` (needs ${s.dependsOn.join(', ')})` : ''}${s.linked ? '' : '  [not linked in .claude/skills]'}`);
  }
  console.log('\n● public (committed)  ○ private (this machine only)');
};

/** What would leak or break if this skill went public. */
const checks = skill => {
  const problems = [];
  const notes = [];
  if (skill.frontName !== skill.name) problems.push(`SKILL.md says name: ${skill.frontName}, the folder is ${skill.name}`);
  const privateNames = allSkills().filter(s => s.visibility === 'private' && s.name !== skill.name).map(s => s.name);
  const mentions = new Map();
  const walk = d => fs.readdirSync(d, { withFileTypes: true }).flatMap(e => (e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]));
  for (const file of walk(skill.dir)) {
    const size = fs.statSync(file).size;
    if (size > 1024 * 1024) notes.push(`${rel(file)} is ${(size / 1048576).toFixed(1)} MB: does it belong in a skill?`);
    if (size > 2 * 1024 * 1024 || !/\.(md|mjs|js|ts|tsx|py|json|txt|sh|ya?ml)$/.test(file)) continue;
    const text = fs.readFileSync(file, 'utf8');
    const lines = text.split('\n');
    lines.forEach((line, i) => {
      const at = `${rel(file)}:${i + 1}`;
      if (/\/Users\/[^/\s]+|\/home\/[^/\s]+|C:\\Users\\/.test(line)) problems.push(`${at} has a path on this machine`);
      if (/(sk-[a-zA-Z0-9]{20,}|AKIA[0-9A-Z]{16}|ghp_[a-zA-Z0-9]{30,}|xox[bap]-[a-zA-Z0-9-]{10,}|AIza[0-9A-Za-z_-]{30,})/.test(line)) problems.push(`${at} looks like an API key or token`);
      if (/[\w.+-]+@[\w-]+\.[\w.]+/.test(line) && !/noreply@|example\.(com|org)/.test(line)) notes.push(`${at} has an email address`);
      for (const p of privateNames) if (new RegExp(`(^|[^\\w-])${p}([^\\w-]|$)`).test(line)) mentions.set(p, [...(mentions.get(p) ?? []), at]);
    });
  }
  for (const d of skill.dependsOn) if (privateNames.includes(d)) notes.push(`depends on the private skill ${d}: publish it first, or this skill can't work for anyone else`);
  for (const [p, at] of mentions) if (!skill.dependsOn.includes(p)) notes.push(`mentions the private skill ${p} (${at.join(', ')}): publish it too, or the link is dead for everyone else`);
  return { problems, notes: [...new Set(notes)] };
};

/** SKILLS.md as it should be now. */
const renderIndex = () => {
  const skills = allSkills();
  const out = [
    '# Skills',
    '',
    'Claude Code skills in this repo. **Public** skills are committed: their files are in',
    '`.agents/skills/<name>/` and `.claude/skills/<name>` links to them, so they load for anyone who',
    'opens the repo in Claude Code. **Private** skills are real folders in `.claude/skills/`, which is',
    "gitignored: only their name and summary are listed here, the files stay on the owner's machine.",
    'The `publish-skill` skill makes one public; `fork-skill` makes a variant.',
    '',
    'Regenerate this file with `node tools/skills.mjs index` (publish and fork do it themselves);',
    '`node tools/skills.mjs check` warns when it is out of date. The mediamake app shows it at',
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
      const name = s.visibility === 'public' ? `[\`${s.name}\`](.agents/skills/${s.name}/SKILL.md)` : `\`${s.name}\``;
      out.push(`| ${name}${s.variantOf ? ` (variant of \`${s.variantOf}\`)` : ''} | ${s.visibility} | ${summary(s.description)} |`);
    }
    out.push('');
  }
  return { text: out.join('\n'), skills };
};

const index = () => {
  const { text, skills } = renderIndex();
  fs.writeFileSync(INDEX, text);
  console.log(`✔ ${rel(INDEX)} (${skills.filter(s => s.visibility === 'public').length} public, ${skills.filter(s => s.visibility === 'private').length} private)`);
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

const check = () => {
  const hook = flag('hook');
  if (hook === 'edit' && !touchedSkills()) return;
  const stale = staleness();
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

const publish = () => {
  const skill = find(a1);
  if (skill.visibility === 'public') throw new Error(`${skill.name} is already public (${rel(skill.dir)})`);
  const { problems, notes } = checks(skill);
  for (const p of problems) console.log(`✖ ${p}`);
  for (const n of notes) console.log(`⚠ ${n}`);
  if (problems.length) throw new Error(`Fix the ✖ lines before publishing ${skill.name}`);
  if (flags.includes('--dry-run')) return console.log(`✔ ${skill.name} can be published (dry run: nothing moved)`);
  const to = path.join(AGENTS, skill.name);
  if (fs.existsSync(to)) throw new Error(`${rel(to)} exists already`);
  fs.mkdirSync(AGENTS, { recursive: true });
  fs.renameSync(skill.dir, to);
  fs.symlinkSync(path.relative(CLAUDE, to), path.join(CLAUDE, skill.name));
  console.log(`✔ ${skill.name}: ${rel(to)} (committed) ← ${rel(path.join(CLAUDE, skill.name))} (link)`);
  index();
};

const unpublish = () => {
  const skill = find(a1);
  if (skill.visibility === 'private') throw new Error(`${skill.name} is already private`);
  const link = path.join(CLAUDE, skill.name);
  if (fs.lstatSync(link, { throwIfNoEntry: false })) fs.unlinkSync(link);
  fs.renameSync(skill.dir, link);
  console.log(`✔ ${skill.name} is private again (${rel(link)}); what was already pushed stays in git history`);
  index();
};

const fork = () => {
  const base = find(a1);
  const name = a2;
  if (!name || !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(name)) throw new Error('Usage: fork <base> <new-name> (lowercase words joined by -)');
  if (!name.startsWith(`${base.name}-`)) console.log(`⚠ a variant's name starts with its base's: ${base.name}-like-<ref> or ${base.name}-v<N>`);
  const to = path.join(CLAUDE, name);
  if (fs.existsSync(to) || fs.existsSync(path.join(AGENTS, name))) throw new Error(`${name} exists already`);
  fs.cpSync(base.dir, to, { recursive: true });
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
  console.log(`✔ ${rel(to)} (private) from ${base.name}; now fill in its description and "This variant"`);
  index();
};

const main = () => {
  const commands = { list, publish, unpublish, fork, index, check };
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
