/**
 * notes: what a session learns from the user, kept for each skill in your workspace instead of in the
 * skill's SKILL.md, so sessions never edit a committed file and a pull never fights what you learned.
 *
 *   mm notes <skill>                      your notes for a skill (a variant also shows its base's)
 *   mm notes add <skill> "<entry>"        a new lesson, dated for you ("-" reads it from stdin)
 *   mm notes list                         every skill you have notes for
 *   mm notes path [<skill>]               where they are
 *   mm notes promote <skill…> | --all     what would go to each skill's shared log (a dry run)
 *     … --yes [--no-push] [--base=main]   do it: a branch from origin/<base> in a temporary worktree
 *                                         (this checkout is never touched), the notes added to each
 *                                         skill's log, one commit, pushed, and a pull request
 *     … --again                           also the notes sent before in a PR that never merged
 *   mm notes tidy [<skill>] [--yes]       drop notes that the skill's shared log has now
 *
 * Where: <workspace>/notes/<skill>.md. The workspace is MEDIAMAKE_WORKSPACE, else `workspace` in
 * ~/.mediamake/config.json, else ~/MediaMake (the rule of scripts/workspace.ts, which owns it once it
 * lands). One Markdown file per skill: a short header, then one entry per `- ` line (lines wrapped
 * under it indented), newest at the bottom, in the form the skill's log asks for ("<brand> · what
 * they said → the rule"). Edit it by hand as you like.
 *
 * The shared log is each skill's `## Feedback log` or `## Lessons log` in its SKILL.md: everyone who
 * pulls gets it, and it changes only in a pull request. `promote` is how notes get there. A note the
 * shared log already has (its PR merged and you pulled) is left out of `mm notes <skill>`, and `tidy`
 * drops it. Notes sent in a PR that hasn't merged yet are recorded in notes/.sent.json, so they are
 * never sent twice.
 */
import { spawnSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { frontmatter, lineProblems } from '../../../tools/skills.mjs';
import { configFile, expandHome } from './library/config.ts';
import { REPO } from './paths.ts';

// ---------- where ----------

/**
 * The user's workspace, read at call time: MEDIAMAKE_WORKSPACE, else `workspace` at the top of
 * ~/.mediamake/config.json, else ~/MediaMake. Notes have no older home, so they are always
 * <workspace>/notes, even while projects still default to apps/studio.
 */
export const workspaceRoot = () => {
  const env = process.env.MEDIAMAKE_WORKSPACE?.trim();
  if (env) return path.resolve(expandHome(env));
  try {
    const set = (JSON.parse(fs.readFileSync(configFile(), 'utf8')) as { workspace?: unknown }).workspace;
    if (typeof set === 'string' && set.trim()) return path.resolve(expandHome(set.trim()));
  } catch {
    // no config, or not JSON: the default
  }
  return path.join(os.homedir(), 'MediaMake');
};
export const notesDir = () => path.join(workspaceRoot(), 'notes');
export const notesFile = (skill: string) => path.join(notesDir(), `${skill}.md`);
const sentFile = () => path.join(notesDir(), '.sent.json');

/** ~/… for paths in the home folder, for printing. */
const tilde = (p: string) => (p === os.homedir() || p.startsWith(os.homedir() + path.sep) ? `~${p.slice(os.homedir().length)}` : p);

// ---------- skills ----------

const NAME = /^[a-z0-9]+(-[a-z0-9]+)*$/;
export type SkillRef = { name: string; dir: string; file: string; committed: boolean; variantOf?: string };

/** Where a skill can be, first match wins: this checkout's (committed), then the user's own. */
const skillRoots = (repo: string) => [
  { dir: path.join(repo, '.agents', 'skills'), committed: true },
  { dir: path.join(repo, '.claude', 'skills'), committed: false },
  { dir: path.join(workspaceRoot(), 'skills'), committed: false },
  { dir: path.join(os.homedir(), '.claude', 'skills'), committed: false },
];

export const findSkill = (name: string, repo = REPO): SkillRef | undefined => {
  if (!NAME.test(name)) return undefined;
  for (const root of skillRoots(repo)) {
    const file = path.join(root.dir, name, 'SKILL.md');
    if (!fs.existsSync(file)) continue;
    return { name, dir: path.dirname(file), file, committed: root.committed, variantOf: frontmatter(file).metadata['variant-of'] };
  }
  return undefined;
};

const skillNames = (repo: string) =>
  [...new Set(skillRoots(repo).flatMap(r => (fs.existsSync(r.dir) ? fs.readdirSync(r.dir) : [])))]
    .filter(n => NAME.test(n) && findSkill(n, repo))
    .sort();

const mustFind = (name: string | undefined, repo: string) => {
  if (!name) throw new Error('Which skill? mm notes <skill> (mm notes list shows the ones with notes)');
  if (!NAME.test(name)) throw new Error(`"${name}" isn't a skill name (lowercase words joined by -)`);
  const ref = findSkill(name, repo);
  if (ref) return ref;
  const near = skillNames(repo).filter(n => n.includes(name) || name.includes(n));
  throw new Error(`No skill "${name}"${near.length ? `. Did you mean ${near.join(', ')}?` : ' in this checkout or ~/.claude/skills'}`);
};

// ---------- entries ----------

export type Entry = {
  /** the entry as written, every line */
  text: string;
  /** its first line in the file, from 1 */
  line: number;
  /** how many lines it takes */
  lines: number;
  date?: string;
  /** the words after the date */
  body: string;
};

const DATED = /^- (\d{4}-\d{2}-\d{2})(?:\s*[·—–:]\s*|\s+-\s+|\s+)([\s\S]*)$/;

/** The entries of a notes file or a log: each `- ` line and the indented lines under it. */
export const parseEntries = (text: string): Entry[] => {
  const out: Entry[] = [];
  const lines = text.replace(/\r\n/g, '\n').split('\n');
  let cur: string[] | null = null;
  let start = 0;
  const flush = () => {
    if (!cur) return;
    const joined = cur.join('\n');
    const m = joined.match(DATED);
    out.push({ text: joined, line: start, lines: cur.length, date: m?.[1], body: m ? m[2] : joined.slice(2) });
    cur = null;
  };
  lines.forEach((line, i) => {
    if (line.startsWith('- ')) {
      flush();
      cur = [line];
      start = i + 1;
    } else if (cur && /^\s+\S/.test(line)) cur.push(line);
    else flush();
  });
  flush();
  return out;
};

/** An entry's words, for comparing: one space between words, no date. */
export const normal = (s: string) => s.replace(/\s+/g, ' ').trim();
const hashOf = (body: string) => crypto.createHash('sha1').update(normal(body)).digest('hex').slice(0, 16);

const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

/** "- <date> · <words>", wrapped lines indented by two spaces, as the skills' logs are written. */
export const formatEntry = (words: string, date = today()) => {
  const lines = words
    .replace(/\r\n/g, '\n')
    .trim()
    .replace(/^- /, '')
    .split('\n')
    .map(l => l.trim())
    .filter(Boolean);
  if (!lines.length) throw new Error('An empty note: say what the user said and the rule it gives');
  const first = /^\d{4}-\d{2}-\d{2}\b/.test(lines[0]) ? lines[0] : `${date} · ${lines[0]}`;
  return [`- ${first}`, ...lines.slice(1).map(l => `  ${l}`)].join('\n');
};

const header = (skill: string) =>
  [
    `# ${skill}: your notes`,
    '',
    `Lessons from your sessions with \`${skill}\`, newest at the bottom. They stay on this computer,`,
    'outside the repo, so pulls never touch them. Sessions read them with `mm notes ' + skill + '` beside the',
    "skill's own log and add to them with `mm notes add " + skill + ' "…"`; `mm notes promote ' + skill + '`',
    "offers them to the skill's shared log as a pull request. Edit freely: one entry per `- ` line.",
    '',
    '',
  ].join('\n');

/** Lines of an entry that must not go into a public skill: paths on this computer, keys, tokens. */
const leaksIn = (text: string) => [...new Set(text.split('\n').flatMap(l => lineProblems(l)))];

export const addNote = (skill: string, words: string, opts: { date?: string; repo?: string } = {}) => {
  mustFind(skill, opts.repo ?? REPO);
  const entry = formatEntry(words, opts.date);
  const file = notesFile(skill);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  if (!fs.existsSync(file)) fs.writeFileSync(file, header(skill));
  else if (!fs.readFileSync(file, 'utf8').endsWith('\n')) fs.appendFileSync(file, '\n');
  fs.appendFileSync(file, `${entry}\n`);
  return { file, entry, leaks: leaksIn(entry) };
};

// ---------- what each note is now ----------

type Sent = { hash: string; branch: string; pr?: string; at: string };
type SentLedger = { schema: 'mediamake.notes-sent/v1'; sent: Record<string, Sent[]> };

const readSent = (): SentLedger => {
  try {
    const l = JSON.parse(fs.readFileSync(sentFile(), 'utf8')) as SentLedger;
    if (l && typeof l.sent === 'object') return l;
  } catch {
    // none yet
  }
  return { schema: 'mediamake.notes-sent/v1', sent: {} };
};
const writeSent = (l: SentLedger) => {
  fs.mkdirSync(notesDir(), { recursive: true });
  fs.writeFileSync(sentFile(), `${JSON.stringify(l, null, 2)}\n`);
};

/** new: only in your notes; sent: in a PR not merged here yet; shared: the skill's log has it. */
export type Status = 'new' | 'sent' | 'shared';
export type Note = Entry & { status: Status; sent?: Sent };

export const notesOf = (skill: string, repo = REPO): { file: string; exists: boolean; notes: Note[] } => {
  const file = notesFile(skill);
  if (!fs.existsSync(file)) return { file, exists: false, notes: [] };
  const ref = findSkill(skill, repo);
  const shared = ref ? normal(fs.readFileSync(ref.file, 'utf8')) : '';
  const sent = readSent().sent[skill] ?? [];
  const notes = parseEntries(fs.readFileSync(file, 'utf8')).map(e => {
    const body = normal(e.body);
    // a few words could be anywhere in a SKILL.md; a lesson is a sentence or more
    if (body.length >= 20 && shared.includes(body)) return { ...e, status: 'shared' as const };
    const s = sent.find(x => x.hash === hashOf(e.body));
    return s ? { ...e, status: 'sent' as const, sent: s } : { ...e, status: 'new' as const };
  });
  return { file, exists: true, notes };
};

// ---------- the shared log in a SKILL.md ----------

const LOG = /^## (Feedback log|Lessons log|Log)\s*$/;

/** The log section's lines [start, end) in a SKILL.md, or undefined when it has none. */
export const logSection = (lines: string[]) => {
  const start = lines.findIndex(l => LOG.test(l));
  if (start < 0) return undefined;
  const next = lines.findIndex((l, i) => i > start && /^## /.test(l));
  return { start, end: next < 0 ? lines.length : next, heading: lines[start].slice(3).trim() };
};

/** The SKILL.md with the notes added at the end of its log, in the log's own style (· or —). */
export const appendToLog = (skillMd: string, notes: Entry[]) => {
  const lines = skillMd.replace(/\r\n/g, '\n').split('\n');
  const at = logSection(lines);
  if (!at) throw new Error('it has no "## Feedback log" or "## Lessons log" to add them to');
  const logged = parseEntries(lines.slice(at.start, at.end).join('\n')).filter(e => e.date);
  const dash = /^- \d{4}-\d{2}-\d{2} — /.test(logged.at(-1)?.text ?? '');
  const add = notes.map(n => (dash && n.date ? n.text.replace(/^- (\d{4}-\d{2}-\d{2}) · /, '- $1 — ') : n.text));
  let end = at.end;
  while (end > at.start + 1 && !lines[end - 1].trim()) end--;
  const tail = lines.slice(at.end);
  const out = [...lines.slice(0, end), ...(logged.length ? [] : ['']), ...add.flatMap(t => t.split('\n'))];
  // a heading after the log keeps its blank line; the file ends with one newline
  const rest = tail.join('\n').replace(/^\n+/, '');
  return `${out.join('\n')}\n${rest ? `\n${rest}` : ''}`.replace(/\n*$/, '\n');
};

// ---------- promote ----------

const git = (cwd: string, ...a: string[]) => {
  const r = spawnSync('git', a, { cwd, encoding: 'utf8', maxBuffer: 1 << 26 });
  if (r.status !== 0) throw new Error(`git ${a.join(' ')}: ${(r.stderr || r.stdout).trim()}`);
  return r.stdout.trim();
};

export type PromoteItem = { skill: string; heading?: string; notes: Note[]; problems: string[] };

/** What promote would send: each skill's new notes, and why one can't go. */
export const planPromote = (skills: string[], repo = REPO, opts: { again?: boolean } = {}): PromoteItem[] =>
  skills.map(skill => {
    const ref = mustFind(skill, repo);
    const notes = notesOf(skill, repo).notes.filter(n => n.status === 'new' || (opts.again && n.status === 'sent'));
    const problems: string[] = [];
    if (!ref.committed) problems.push("it is your own skill, not in the repo: publish it first (publish-skill), then promote its notes");
    const at = logSection(fs.readFileSync(ref.file, 'utf8').split('\n'));
    if (ref.committed && !at) problems.push('its SKILL.md has no "## Feedback log" or "## Lessons log" to add them to');
    for (const n of notes) for (const p of leaksIn(n.text)) problems.push(`the note on line ${n.line} ${p}: reword it in ${tilde(notesFile(skill))}`);
    return { skill, heading: at?.heading, notes, problems };
  });

/** https://github.com/<owner>/<repo>/compare/<base>...<branch>, when the remote is on GitHub. */
const compareUrl = (remoteUrl: string, base: string, branch: string) => {
  const m = remoteUrl.match(/github\.com[:/]([^/]+)\/(.+?)(?:\.git)?\/?$/);
  return m ? `https://github.com/${m[1]}/${m[2]}/compare/${base}...${encodeURIComponent(branch).replace(/%2F/g, '/')}?expand=1` : undefined;
};

const ghReady = () => spawnSync('gh', ['auth', 'status'], { encoding: 'utf8' }).status === 0;

export type Promoted = { branch: string; commit: string; pushed: boolean; pr?: string; compare?: string; sent: number };

export const promote = (
  items: PromoteItem[],
  opts: { repo?: string; remote?: string; base?: string; push?: boolean; pr?: boolean; now?: Date } = {},
): Promoted => {
  const repo = opts.repo ?? REPO;
  const remote = opts.remote ?? 'origin';
  const base = opts.base ?? 'main';
  const push = opts.push ?? true;
  const go = items.filter(i => i.notes.length && !i.problems.length);
  if (!go.length) throw new Error('Nothing to send: no new notes, or every skill with them has a problem to fix first');
  const now = opts.now ?? new Date();
  const stamp = now.toISOString().slice(0, 16).replace(/[-:]/g, '').replace('T', '-');
  const branch = `notes/${go.length === 1 ? go[0].skill : `${go.length}-skills`}-${stamp}`;
  git(repo, 'fetch', '--quiet', remote, base);
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'mm-notes-'));
  const wt = path.join(tmp, 'wt');
  git(repo, 'worktree', 'add', '--quiet', '-b', branch, wt, `${remote}/${base}`);
  let committed = false;
  let pushed = false;
  try {
    for (const item of go) {
      const file = path.join(wt, '.agents', 'skills', item.skill, 'SKILL.md');
      if (!fs.existsSync(file)) throw new Error(`${item.skill} isn't in ${remote}/${base} yet: its notes can go once it has merged`);
      fs.writeFileSync(file, appendToLog(fs.readFileSync(file, 'utf8'), item.notes));
    }
    const count = go.reduce((n, i) => n + i.notes.length, 0);
    const title =
      go.length === 1
        ? `skill(${go[0].skill}): ${count} ${count === 1 ? 'lesson' : 'lessons'} from notes`
        : `skills: ${count} lessons from notes (${go.map(i => i.skill).join(', ')})`;
    git(wt, 'add', '--', ...go.map(i => path.join('.agents', 'skills', i.skill, 'SKILL.md')));
    git(wt, 'commit', '--quiet', '-m', title, '-m', 'Sent from the workspace notes with `mm notes promote`.');
    const commit = git(wt, 'rev-parse', 'HEAD');
    committed = true;
    let pr: string | undefined;
    let compare: string | undefined;
    if (push) {
      git(wt, 'push', '--quiet', '-u', remote, branch);
      pushed = true;
      const body = [
        'Lessons from the workspace notes (`mm notes promote`), for each skill\'s shared log.',
        '',
        ...go.flatMap(i => [`**${i.skill}** (${i.heading}):`, '', ...i.notes.map(n => n.text), '']),
      ].join('\n');
      if (opts.pr !== false && ghReady()) {
        const r = spawnSync('gh', ['pr', 'create', '--base', base, '--head', branch, '--title', title, '--body', body], { cwd: wt, encoding: 'utf8' });
        if (r.status === 0) pr = r.stdout.trim().split('\n').at(-1);
      }
      if (!pr) {
        try {
          compare = compareUrl(git(repo, 'remote', 'get-url', remote), base, branch);
        } catch {
          // a remote with no URL: no link
        }
      }
    }
    const ledger = readSent();
    for (const item of go) {
      const list = (ledger.sent[item.skill] ??= []);
      for (const n of item.notes) list.push({ hash: hashOf(n.body), branch, pr: pr ?? compare, at: now.toISOString() });
    }
    writeSent(ledger);
    return { branch, commit, pushed, pr, compare, sent: count };
  } finally {
    spawnSync('git', ['worktree', 'remove', '--force', wt], { cwd: repo });
    // a pushed branch lives on the remote, and a failed one is dropped (the notes are all still in
    // your notes); only --no-push keeps its commit here for you to push
    if (push || !committed) spawnSync('git', ['branch', '-D', branch], { cwd: repo });
    fs.rmSync(tmp, { recursive: true, force: true });
  }
};

// ---------- tidy ----------

/** The notes file without the entries the skill's shared log has now; the count removed. */
export const tidy = (skill: string, opts: { yes?: boolean; repo?: string } = {}) => {
  const { file, exists, notes } = notesOf(skill, opts.repo ?? REPO);
  const drop = notes.filter(n => n.status === 'shared');
  if (!exists || !drop.length || !opts.yes) return { file, drop };
  const gone = new Set(drop.flatMap(n => Array.from({ length: n.lines }, (_, k) => n.line - 1 + k)));
  const kept = fs
    .readFileSync(file, 'utf8')
    .split('\n')
    .filter((_, i) => !gone.has(i))
    .join('\n')
    .replace(/\n{3,}/g, '\n\n');
  fs.writeFileSync(file, kept);
  const ledger = readSent();
  if (ledger.sent[skill]) {
    const hashes = new Set(drop.map(n => hashOf(n.body)));
    ledger.sent[skill] = ledger.sent[skill].filter(s => !hashes.has(s.hash));
    if (!ledger.sent[skill].length) delete ledger.sent[skill];
    writeSent(ledger);
  }
  return { file, drop };
};

// ---------- the command ----------

const show = (skill: string, repo: string) => {
  const ref = mustFind(skill, repo);
  const print = (name: string, title: string) => {
    const { file, exists, notes } = notesOf(name, repo);
    const live = notes.filter(n => n.status !== 'shared');
    const shared = notes.length - live.length;
    if (!exists || !notes.length) {
      console.log(`${title}: none yet (${tilde(file)}).`);
      return;
    }
    console.log(`${title} (${tilde(file)}):\n`);
    for (const n of live) console.log(n.status === 'sent' ? `${n.text}\n  (sent for the shared log: ${n.sent?.pr ?? n.sent?.branch})` : n.text);
    if (!live.length) console.log('(every one is in the shared log now)');
    if (shared) console.log(`\n${shared} more ${shared === 1 ? 'is' : 'are'} in the skill's shared log now: mm notes tidy ${name} --yes drops ${shared === 1 ? 'it' : 'them'} here.`);
  };
  print(skill, `Your notes for ${skill}`);
  if (ref.variantOf && findSkill(ref.variantOf, repo)) {
    console.log('');
    print(ref.variantOf, `Your notes for its base, ${ref.variantOf}`);
  }
  if (!fs.existsSync(notesFile(skill))) console.log(`\nAdd one: mm notes add ${skill} "<what the user said> → <the rule>"`);
};

const list = (repo: string) => {
  const dir = notesDir();
  const files = fs.existsSync(dir) ? fs.readdirSync(dir).filter(f => f.endsWith('.md')).sort() : [];
  if (!files.length) return console.log(`No notes yet (${tilde(dir)}). mm notes add <skill> "<what the user said> → <the rule>" starts one.`);
  console.log(`Your notes, in ${tilde(dir)}:\n`);
  const rows = files.map(f => {
    const skill = f.slice(0, -3);
    const { notes } = notesOf(skill, repo);
    const count = (s: Status) => notes.filter(n => n.status === s).length;
    const newest = notes.map(n => n.date).filter(Boolean).sort().at(-1);
    const parts = [`${count('new')} new`, count('sent') && `${count('sent')} sent`, count('shared') && `${count('shared')} in the shared log`].filter(Boolean);
    return { skill: findSkill(skill, repo) ? skill : `${skill} (no such skill here)`, about: `${parts.join(', ')}${newest ? `, newest ${newest}` : ''}` };
  });
  const width = Math.max(...rows.map(r => r.skill.length));
  for (const r of rows) console.log(`  ${r.skill.padEnd(width)}  ${r.about}`);
};

const readStdin = () => {
  try {
    return fs.readFileSync(0, 'utf8');
  } catch {
    return '';
  }
};

const main = () => {
  const args = process.argv.slice(2);
  const flags = args.filter(a => a.startsWith('--'));
  const words = args.filter(a => !a.startsWith('--'));
  const flag = (k: string) => flags.find(f => f.startsWith(`--${k}=`))?.slice(k.length + 3);
  const has = (k: string) => flags.includes(`--${k}`);
  const repo = REPO;
  const [cmd, ...rest] = words;

  if (!cmd || cmd === 'help') {
    console.log(fs.readFileSync(fileURLToPath(import.meta.url), 'utf8').match(/\/\*\*([\s\S]*?)\*\//)![1].replace(/^ \* ?/gm, '').trim());
    return;
  }
  if (cmd === 'list') return list(repo);
  if (cmd === 'path') return console.log(rest[0] ? notesFile(mustFind(rest[0], repo).name) : notesDir());
  if (cmd === 'show') return show(rest[0], repo);
  if (cmd === 'add') {
    const [skill, ...text] = rest;
    const said = text.length === 1 && text[0] === '-' ? readStdin() : text.join(' ');
    const { file, entry, leaks } = addNote(skill, said, { date: flag('date') });
    console.log(`✔ ${tilde(file)}\n${entry}`);
    for (const l of leaks) console.log(`⚠ this note ${l}: fine here, but reword it before it goes to the shared log (promote checks)`);
    return;
  }
  if (cmd === 'tidy') {
    const skills = rest.length ? rest : fs.existsSync(notesDir()) ? fs.readdirSync(notesDir()).filter(f => f.endsWith('.md')).map(f => f.slice(0, -3)) : [];
    let total = 0;
    for (const skill of skills) {
      const { file, drop } = tidy(skill, { yes: has('yes'), repo });
      if (!drop.length) continue;
      total += drop.length;
      console.log(`${has('yes') ? '✔ dropped' : 'would drop'} ${drop.length} from ${tilde(file)} (in the shared log now):`);
      for (const n of drop) console.log(`  ${n.text.split('\n')[0].slice(0, 140)}`);
    }
    if (!total) return console.log('Nothing to tidy: no note is in a shared log yet.');
    if (!has('yes')) console.log('\nA dry run: mm notes tidy … --yes drops them.');
    return;
  }
  if (cmd === 'promote') {
    const skills = has('all')
      ? (fs.existsSync(notesDir()) ? fs.readdirSync(notesDir()).filter(f => f.endsWith('.md')).map(f => f.slice(0, -3)) : []).filter(s => findSkill(s, repo))
      : rest;
    if (!skills.length) throw new Error('Which skills? mm notes promote <skill…>, or --all');
    const items = planPromote(skills, repo, { again: has('again') });
    const base = flag('base') ?? 'main';
    for (const i of items) {
      if (!i.notes.length) {
        console.log(`${i.skill}: no new notes`);
        continue;
      }
      console.log(`${i.skill}: ${i.notes.length} new ${i.notes.length === 1 ? 'note' : 'notes'} → its ${i.heading ?? 'log'}`);
      for (const n of i.notes) console.log(`  ${n.text.split('\n').join('\n  ')}`);
      for (const p of i.problems) console.log(`  ✖ ${p}`);
    }
    const ready = items.filter(i => i.notes.length && !i.problems.length);
    if (!ready.length) return console.log('\nNothing to send.');
    if (!has('yes')) {
      console.log(
        `\nA dry run, nothing changed. With --yes: a branch from origin/${base} in a temporary worktree (this checkout stays as it is), ` +
          `these notes added to the end of each skill's log, one commit${has('no-push') ? ' (kept here, not pushed)' : ', pushed, and a pull request (gh) or its link'}.`,
      );
      return;
    }
    const r = promote(items, { repo, base, push: !has('no-push') });
    console.log(`\n✔ ${r.sent} ${r.sent === 1 ? 'note' : 'notes'} on ${r.branch} (${r.commit.slice(0, 10)})`);
    if (r.pr) console.log(`  pull request: ${r.pr}`);
    else if (r.compare) console.log(`  open the pull request: ${r.compare}`);
    else if (r.pushed) console.log(`  pushed: open a pull request for ${r.branch}`);
    else console.log(`  not pushed: git push -u origin ${r.branch}, then open a pull request`);
    console.log('  They stay in your notes; once the PR merges and you pull, mm notes leaves them out (mm notes tidy drops them).');
    return;
  }
  // mm notes <skill>
  if (words.length === 1) return show(cmd, repo);
  throw new Error(`No notes command "${cmd}". mm notes help lists them.`);
};

if (process.argv[1] && fs.realpathSync(path.resolve(process.argv[1])) === fs.realpathSync(fileURLToPath(import.meta.url))) {
  try {
    main();
  } catch (err) {
    console.error(`✖ ${err instanceof Error ? err.message : err}`);
    process.exit(1);
  }
}
