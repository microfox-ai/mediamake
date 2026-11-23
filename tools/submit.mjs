#!/usr/bin/env node
/**
 * submit: send something you built to the MediaMake store, privately, for an admin to review; an
 * admin's own item is published at once.
 *
 *   mm submit <name>                        the checks only (a dry run): where the item is, what would be
 *                                           sent, and what must be fixed first
 *   mm submit <name> --yes [--made="<production>"] [--made-url=<link>] [--note="<for the reviewers>"]
 *                                           sends it. Members below Cohort name the finished work made
 *                                           with it (--made); Cohort members and admins may leave it out
 *   mm submit <name> --yes --tier=public|plus|pro|cohort
 *                                           an admin publishes it directly at that membership: no review
 *   An update (a new version of an item already in the store) sent by an admin, or by a Cohort
 *   member who is one of its authors, is published directly at the membership it has, with no review
 *   and no --tier; any other author's update goes to review
 *   mm submit status                        your submissions and where each stands
 *   mm submit withdraw <id>                 takes one back before it is decided
 *   mm submit authors <name>                the item's authors (its authors and admins see them)
 *   mm submit authors <name> --add=<email> | --remove=<email or name> [--yes]
 *                                           adds or removes an author, by their MediaMake account's
 *                                           email (or, to remove, the name the list shows). Its
 *                                           authors and admins may; an item always keeps one author.
 *                                           Without --yes it only says what would change
 *   --kind=skill|mcp|app                    when two of your items share a name
 *   --json                                  the same as JSON, for Claude
 *
 * <name> is a skill, MCP or app of your own: in your space or a project's (mm space), or a skill in
 * your workspace (a variant from mm-fork-skill). The rule is "We publish nothing we don't use.": a member
 * below Cohort names a finished production (the server refuses one without it, and a test render or a
 * demo is not one); Cohort members and admins need not.
 *
 * What is sent, to your MediaMake account over its sign-in (mm login): the item's files (text as it
 * is, anything else as bytes), its name, title, one-line summary and version, the production and your
 * note. Never .git, node_modules, .env files or anything over 1 MB: builds and media stay out (media
 * goes through the media library, named under "media" in item.json). Nothing is public yet: an admin
 * reads it, picks the membership that opens it (Public, Plus, Pro or Cohort) and approves, asks for
 * changes or declines, and you are mailed. Accepted, it enters as Beta and earns you a membership for
 * 3 months, renewed by contributing again. An admin's --tier skips all of that: the item is released
 * at that membership, in Beta, the moment it arrives (a version already released is refused).
 *
 * The same item sent again before a decision replaces what you sent.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { frontmatter, lineProblems, NO_RUN_SHEET, ownSkillsDir, RULE, runSheet } from './skills.mjs';
import { KINDS, localSpaces } from './space.mjs';
import { apiKey, call, site } from './usage.mjs';

const SELF = fileURLToPath(import.meta.url);
export const NAME = /^[a-z0-9]+(-[a-z0-9]+)*$/;
/** The server's limits (apps/mediamake/lib/submissions/submission.ts): keep the two alike. */
export const MAX_FILES = 400;
export const MAX_BYTES = 3 * 1024 * 1024;
export const MAX_FILE_BYTES = 1024 * 1024;
const LEFT_OUT = /(^|\/)(\.git|node_modules|\.DS_Store|\.env[^/]*|__pycache__|\.venv)(\/|$)/;
const TEXT = /\.(md|mdx|mjs|cjs|js|jsx|ts|tsx|py|json|txt|sh|ya?ml|toml|css|html|svg|csv)$/i;
const NOT_A_PRODUCTION = /^(test|a test|testing|demo|a demo|none|n\/?a|tbd|todo|nothing|\?+|-+)$/i;

const tilde = p => (p === os.homedir() || p.startsWith(os.homedir() + path.sep) ? `~${p.slice(os.homedir().length)}` : p);
const readJson = file => {
  try {
    const value = JSON.parse(fs.readFileSync(file, 'utf8'));
    return value && typeof value === 'object' ? value : {};
  } catch {
    return {};
  }
};

/** Every place an item of the user's own can be: each space on this computer, then the workspace's skills. */
export function candidates(name, { spaces = localSpaces(), skillsDir = ownSkillsDir() } = {}) {
  const found = [];
  const seen = new Set();
  const add = (kind, dir, where) => {
    let real;
    try {
      real = fs.realpathSync(dir);
    } catch {
      return;
    }
    if (seen.has(real) || !fs.statSync(real).isDirectory()) return;
    if (kind === 'skill' && !fs.existsSync(path.join(real, 'SKILL.md'))) return;
    seen.add(real);
    found.push({ kind, name, dir: real, where });
  };
  for (const space of spaces) {
    for (const [kind, folder] of Object.entries(KINDS)) add(kind, path.join(space.dir, folder, name), space.project ? `the ${space.project.name} project's space` : 'your space');
  }
  add('skill', path.join(skillsDir, name), 'your workspace');
  return found;
}

/** The item's files, relative to its folder: what would be sent, and what is left out and why. */
export function collect(dir) {
  const files = [];
  const skipped = [];
  const walk = (at, rel) => {
    for (const entry of fs.readdirSync(at, { withFileTypes: true }).sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0))) {
      const relPath = rel ? `${rel}/${entry.name}` : entry.name;
      const abs = path.join(at, entry.name);
      if (LEFT_OUT.test(relPath)) continue;
      if (entry.isSymbolicLink()) {
        skipped.push(`${relPath} is a link: links are not sent`);
        continue;
      }
      if (entry.isDirectory()) {
        walk(abs, relPath);
        continue;
      }
      if (!entry.isFile()) continue;
      const bytes = fs.statSync(abs).size;
      if (bytes > MAX_FILE_BYTES) {
        skipped.push(`${relPath} is ${(bytes / 1048576).toFixed(1)} MB, over 1 MB: builds and media stay out (media goes in the media library, named under "media" in item.json)`);
        continue;
      }
      const data = fs.readFileSync(abs);
      // text travels as text so it can be read and checked; anything with a NUL byte is binary
      const text = TEXT.test(relPath) && !data.includes(0);
      files.push({ path: relPath, bytes, ...(text ? { content: data.toString('utf8'), encoding: 'utf8' } : { content: data.toString('base64'), encoding: 'base64' }) });
    }
  };
  walk(dir, '');
  return { files, skipped };
}

/** What stops a submission (problems) and what deserves a look (notes): the same lines the server checks. */
export function check(item, files) {
  const problems = [];
  const notes = [];
  const total = files.reduce((sum, file) => sum + file.bytes, 0);
  if (files.length === 0) problems.push('the folder has nothing to send');
  if (files.length > MAX_FILES) problems.push(`${files.length} files: an item holds at most ${MAX_FILES}`);
  if (total > MAX_BYTES) problems.push(`${(total / 1048576).toFixed(1)} MB in all: a submission holds at most ${MAX_BYTES / 1048576} MB`);
  if (item.kind === 'skill') {
    const front = frontmatter(path.join(item.dir, 'SKILL.md'));
    if (front.name !== item.name) problems.push(`SKILL.md says name: ${front.name ?? '(none)'}, the folder is ${item.name}`);
    if (!front.description) problems.push('SKILL.md has no description in its front matter');
    // a skill is made with its run sheet: what each step needs, so a run can be split between the cloud and a device
    const sheet = runSheet(path.join(item.dir, 'SKILL.md'));
    if (!sheet.found) problems.push(NO_RUN_SHEET);
    problems.push(...sheet.errors);
  }
  for (const file of files) {
    if (file.encoding !== 'utf8') continue;
    file.content.split('\n').forEach((line, i) => {
      const at = `${file.path}:${i + 1}`;
      for (const p of lineProblems(line)) problems.push(`${at} ${p}`);
      if (/[\w.+-]+@[\w-]+\.[\w.]+/.test(line) && !/noreply@|example\.(com|org)/.test(line)) notes.push(`${at} has an email address`);
    });
  }
  return { problems, notes: [...new Set(notes)], total };
}

/** The item's title, summary and version as its files state them. */
export function describe(item) {
  const meta = readJson(path.join(item.dir, 'item.json'));
  const front = item.kind === 'skill' ? frontmatter(path.join(item.dir, 'SKILL.md')) : {};
  const text = value => (typeof value === 'string' && value.trim() ? value.trim() : undefined);
  return {
    title: text(meta.title),
    summary: text(meta.summary) ?? text(front.description)?.slice(0, 500),
    version: text(meta.version) ?? text(front.metadata?.version) ?? text(front.version),
  };
}

/** What a named production must be (members below Cohort name one; the server says when it is missing). */
export function madeProblem(made) {
  const title = made?.trim();
  if (title && (title.length < 3 || NOT_A_PRODUCTION.test(title))) {
    return `${RULE} --made names the finished production made with it (its title; --made-url=<link> when it is online). A test render or a demo is not one.`;
  }
  return null;
}

/**
 * The item an authors command means: --kind, else the kind of the user's own copy, else a skill. Null
 * when their copies are of more than one kind.
 */
export function authorsItemId(name, kind, found = []) {
  if (kind) return `${kind}/${name}`;
  const kinds = [...new Set(found.map(item => item.kind))];
  return kinds.length > 1 ? null : `${kinds[0] ?? 'skill'}/${name}`;
}

/** One author as the list shows them: a GitHub login or a display name, never an email. */
export const authorLine = a => `  ${a.name}${a.github ? `  (github.com/${a.github})` : ''}${a.you ? '  · you' : ''}  · since ${String(a.addedAt).slice(0, 10)}`;

/** The memberships an admin publishes at. */
export const PUBLISH_TIERS = ['public', 'plus', 'pro', 'cohort'];

/**
 * How long sending may take, from the size of the body: a minute for the server (the route's maxDuration,
 * apps/mediamake/app/api/submissions/route.ts) plus a second for every 64 KB on the way up (a slow
 * 0.5 Mbit/s uplink). A 1.3 MB skill gets about a minute and a half, the largest item about two minutes.
 * Usage reports keep call()'s 8 s.
 */
export const uploadTimeout = bytes => 60_000 + Math.ceil(bytes / 65_536) * 1000;

/** What to say when the upload got no answer in time: it may have arrived all the same. */
export function uploadTimedOut(name, bytes, timeoutMs) {
  return `Sending ${name} (${(bytes / 1048576).toFixed(1)} MB) got no answer within ${Math.round(timeoutMs / 1000)} s. It may still have arrived: mm submit status shows whether it did. Sending it again is safe, since the same item sent again before a decision replaces what you sent.`;
}

/** The body POST /api/submissions takes. */
export function payload(item, files, { made, madeUrl, note, tier }) {
  const about = describe(item);
  return {
    kind: item.kind,
    name: item.name,
    ...(about.title && { title: about.title }),
    ...(about.summary && { summary: about.summary }),
    ...(about.version && { version: about.version }),
    ...(made?.trim() && { made: { title: made.trim(), ...(madeUrl && { url: madeUrl.trim() }) } }),
    ...(note?.trim() && { note: note.trim() }),
    ...(tier && { publish: tier }),
    source: 'mm-submit',
    files: files.map(({ path: p, content, encoding }) => ({ path: p, content, encoding })),
  };
}

const flagsOf = argv => {
  const flags = {};
  const rest = [];
  for (const arg of argv) {
    const m = arg.match(/^--([a-z-]+)(?:=(.*))?$/s);
    if (m) flags[m[1]] = m[2] ?? true;
    else rest.push(arg);
  }
  return { flags, rest };
};

const fail = message => {
  console.error(`✖ ${message}`);
  process.exit(1);
};

function signedIn() {
  const url = site();
  const key = apiKey(url);
  if (!key) fail(`This computer is not signed in to MediaMake. Run mm login (it opens the browser; click Allow), then try again.`);
  return { url, key: key.key };
}

const line = s => `  ${s.itemId}@${s.version}  ${s.submissionId}  ${s.standing}${s.pullRequest ? `  ${s.pullRequest}` : ''}`;

async function status(json) {
  const { url, key } = signedIn();
  const { submissions = [] } = (await call('GET', `${url}/api/submissions`, key)) ?? {};
  if (json) return console.log(JSON.stringify({ submissions }, null, 2));
  if (submissions.length === 0) return console.log('You have sent nothing to the store yet. mm submit <name> checks one of your items.');
  console.log('Your submissions, newest first:\n');
  for (const s of submissions) console.log(line(s));
}

async function withdraw(id, json) {
  if (!id) fail('withdraw needs the submission id (mm submit status lists them)');
  const { url, key } = signedIn();
  const { submission } = await call('DELETE', `${url}/api/submissions?id=${encodeURIComponent(id)}`, key);
  if (json) return console.log(JSON.stringify({ submission }, null, 2));
  console.log(`Withdrawn: ${submission.itemId}. It stays yours and works as before.`);
}

async function authors(name, flags) {
  const json = !!flags.json;
  if (!name || !NAME.test(name)) fail('Name the item: mm submit authors <name> [--add=<email>] [--remove=<email or name>]');
  if (flags.kind && !Object.keys(KINDS).includes(flags.kind)) fail('--kind is skill, mcp or app');
  if (flags.add === true || flags.remove === true) fail('--add takes their email (--add=<email>), --remove their email or the name the list shows');
  const add = typeof flags.add === 'string' ? flags.add.trim() : '';
  const remove = typeof flags.remove === 'string' ? flags.remove.trim() : '';
  if (add && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(add)) fail('--add is the email of their MediaMake account');
  const id = authorsItemId(name, typeof flags.kind === 'string' ? flags.kind : '', flags.kind ? [] : candidates(name));
  if (!id) fail(`You have more than one item named ${name}: say which with --kind=skill|mcp|app`);
  const { url, key } = signedIn();
  const change = add || remove;
  const view = change && flags.yes === true ? await call('POST', `${url}/api/submissions/authors`, key, { id, ...(add && { add }), ...(remove && { remove }) }) : await call('GET', `${url}/api/submissions/authors?id=${encodeURIComponent(id)}`, key);
  const asked = [add && `add ${add}`, remove && `remove ${remove}`].filter(Boolean).join(' and ');
  if (json) return console.log(JSON.stringify({ ...view, ...(change && flags.yes !== true && { wouldChange: asked, changed: false }) }, null, 2));
  if (view.changed) console.log(`${view.itemId}: ${view.changed}.`);
  console.log(`Authors of ${view.itemId}:`);
  for (const a of view.authors) console.log(authorLine(a));
  if (change && flags.yes !== true) console.log(`\nNothing changed. To ${asked}: mm submit authors ${name} ${[add && `--add=${add}`, remove && `--remove="${remove}"`].filter(Boolean).join(' ')}${flags.kind ? ` --kind=${flags.kind}` : ''} --yes`);
  else if (!change) console.log(`\nIts authors and admins add or remove one: mm submit authors ${name} --add=<email> | --remove=<email or name>. A Cohort author's updates are published directly.`);
}

async function submit(name, flags) {
  const json = !!flags.json;
  if (!name || !NAME.test(name)) fail('Name the item: mm submit <name> (lowercase letters, digits and dashes). mm space lists what is in your spaces.');
  let found = candidates(name);
  if (flags.kind) found = found.filter(item => item.kind === flags.kind);
  if (found.length === 0) fail(`No ${flags.kind ?? 'skill, MCP or app'} named ${name} in your spaces or your workspace's skills. mm space lists what you have; a skill that is already in the repo is public already.`);
  if (found.length > 1) fail(`${name} is in more than one place: ${found.map(item => `${item.kind} in ${item.where}`).join(', ')}. Say which with --kind=skill|mcp|app, or submit from the space that should own it.`);
  const item = found[0];
  const { files, skipped } = collect(item.dir);
  const { problems, notes, total } = check(item, files);
  const about = describe(item);
  const send = flags.yes === true;
  const made = typeof flags.made === 'string' ? flags.made : '';
  const madeUrl = typeof flags['made-url'] === 'string' ? flags['made-url'] : '';
  const tier = typeof flags.tier === 'string' ? flags.tier : '';
  if (madeProblem(made)) problems.push(madeProblem(made));
  if (madeUrl && !made) problems.push('--made-url goes with --made (the production it links to)');
  if (madeUrl && !/^https:\/\//.test(madeUrl)) problems.push('--made-url must be an https link');
  if (tier && !PUBLISH_TIERS.includes(tier)) problems.push(`--tier is the membership an admin publishes it at: ${PUBLISH_TIERS.join(', ')}`);

  const report = { item: { kind: item.kind, name, where: item.where, ...about }, files: files.map(file => ({ path: file.path, bytes: file.bytes })), bytes: total, skipped, problems, notes };
  if (!send || problems.length > 0) {
    if (json) console.log(JSON.stringify({ ...report, sent: false }, null, 2));
    else {
      console.log(`${item.kind} ${name}, in ${item.where} (${tilde(item.dir)})`);
      console.log(`  ${about.title ?? name}${about.version ? `, version ${about.version}` : ''}: ${about.summary ?? '(no summary: add one to its item.json or SKILL.md)'}`);
      console.log(`  ${files.length} files, ${(total / 1024).toFixed(1)} KB would be sent`);
      for (const s of skipped) console.log(`  – left out: ${s}`);
      for (const n of notes) console.log(`  ⚠ ${n}`);
      for (const p of problems) console.log(`  ✖ ${p}`);
      if (problems.length > 0) console.log('\nFix what ✖ marks, then check again. Nothing was sent.');
      else console.log(`\nNothing was sent. ${RULE}\nTo send it for review: mm submit ${name} --yes [--made="<the finished production made with it>"] (members below Cohort name one)\nAn admin publishes it directly: mm submit ${name} --yes --tier=<public|plus|pro|cohort>`);
    }
    process.exit(problems.length > 0 ? 1 : 0);
  }

  const { url, key } = signedIn();
  const body = payload(item, files, { made, madeUrl, note: typeof flags.note === 'string' ? flags.note : '', tier });
  // the whole item travels in one request, often 1–4 MB with a README's pictures: give it time to go up
  const bytes = Buffer.byteLength(JSON.stringify(body));
  const timeoutMs = uploadTimeout(bytes);
  let submission;
  let serverNotes = [];
  try {
    ({ submission, notes: serverNotes = [] } = await call('POST', `${url}/api/submissions`, key, body, { timeoutMs }));
  } catch (error) {
    if (error?.name === 'TimeoutError') fail(uploadTimedOut(name, bytes, timeoutMs));
    throw error;
  }
  if (json) return console.log(JSON.stringify({ ...report, sent: true, submission, notes: serverNotes }, null, 2));
  if (submission.decision) {
    const live = submission.status === 'live';
    console.log(`Published ${submission.itemId}@${submission.version} at ${submission.decision.tier}, in Beta (${submission.submissionId}). ${live ? 'It is live now.' : submission.pullRequest ? `It goes live when its pull request merges: ${submission.pullRequest}` : 'Its package is being released.'}`);
    for (const n of serverNotes) console.log(`  ⚠ ${n}`);
    console.log(`Its page: ${url}/app/releases/${submission.kind}/${submission.slug}`);
    return;
  }
  console.log(`Sent ${submission.itemId}@${submission.version} for review (${submission.submissionId}). Nothing is public yet.`);
  if (submission.problems?.length) {
    console.log('The checks on the server stop on these. Fix them and send it again:');
    for (const p of submission.problems) console.log(`  ✖ ${p}`);
  }
  console.log(`An admin reads it and picks the membership that opens it. You are mailed when they decide; mm submit status shows where it stands.`);
}

async function main(argv) {
  const { flags, rest } = flagsOf(argv);
  const [first, second] = rest;
  if (!first || first === 'help' || flags.help) {
    const text = fs.readFileSync(SELF, 'utf8');
    return console.log(text.slice(text.indexOf('/**') + 3, text.indexOf('*/')).replace(/^ \* ?/gm, '').trim());
  }
  if (first === 'status') return status(!!flags.json);
  if (first === 'withdraw') return withdraw(second, !!flags.json);
  if (first === 'authors') return authors(second, flags);
  return submit(first, flags);
}

if (process.argv[1] && path.resolve(process.argv[1]) === SELF) {
  main(process.argv.slice(2)).catch(error => fail(error.message));
}
