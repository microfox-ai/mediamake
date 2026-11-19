#!/usr/bin/env node
/**
 * library: the Cloud Library (apps/mediamake/docs/library.md). One structured, searchable home for the
 * files a space reuses: a collection (Songs) holds entries (one song), and an entry holds fields and
 * files in named slots. The same on every computer and in a cloud session. Open to Cohort members for now.
 *
 * Read first, fetch last: a search answers with cards, `get` and `read` give fields and text without a
 * download, and only `fetch` moves a file.
 *
 *   mm library [--project=<name or id>]      overview: the space's collections, their fields and slots,
 *                                            what their lists have learned. No project: your personal Library.
 *   mm library templates                     the templates a new collection starts from
 *   mm library new <template> [--name="…"] [--yes]
 *                                            a collection from a template (a dry run, then --yes)
 *   mm library guide <collection>            how to fill it: the template's guide and the owner's preferences.
 *                                            Read it before the first save of a session.
 *   mm library search ["<words>"] [--collection=songs] [--where=use=released]… [--has=transcript]
 *        [--lacks=stems] [--limit=10] [--all]
 *                                            cards of the entries that fit. --all: every space you can open.
 *   mm library get <collection>/<entry>      one entry: fields, files by slot, latest numbers
 *   mm library read <collection>/<entry> <field or slot> [--lines=1-40] [--from=60 --to=90]
 *                                            a field's text, or a text or JSON file's content, whole or a
 *                                            part (lines, or seconds of a timed transcript). No download.
 *   mm library preview <collection>/<entry> [<slot>]
 *                                            what a file is (name, size, type, what it was made from)
 *                                            without taking it
 *   mm library fetch <collection>/<entry> [<slot>…] [--to=<folder>] [--replace]
 *                                            the files, checked against their SHA-256. A file this computer
 *                                            fetched before comes from its cache, not the network.
 *   mm library save <collection> [<entry>] [--set <field>=<value>]… [--json=<fields.json>]
 *        [--file <slot>=<path>]… [--made-from=<slot>=<source slot>[:<tool>]] [--rev=<n>] [--private-ok] [--yes]
 *                                            adds an entry (no <entry>: a new one, named by its title) or
 *                                            changes one. Without --yes nothing is saved: it prints the one
 *                                            sentence to ask the person. Add --yes after they agree.
 *   mm library stats <collection>/<entry> --platform=<name> [--day=2026-11-19] --set <number>=<value>…
 *                                            a platform's numbers for a day
 *   mm library trash <collection>/<entry> [--yes]
 *   mm library prefs <collection> --file=<prefs.md> [--yes]    the owner's preferences for whoever fills it
 *   mm library usage [--days=30] [--all]     what you used and its estimated cost (--all: admins, everyone's)
 *
 * --json prints the server's answer as JSON. A value for --set that starts with [ or { is read as JSON:
 *   --set 'storeLinks=[{"platform":"Spotify","url":"https://…"}]'
 * Never a key or a password in a field or a file: everyone on the space reads them.
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { Readable } from 'node:stream';
import { fileURLToPath } from 'node:url';
import { apiKey, call, configFile, deviceLabel, site } from './usage.mjs';

const SELF = fileURLToPath(import.meta.url);
const REF = /^[a-z0-9][a-z0-9-]{0,79}\/[a-z0-9][a-z0-9-]{0,79}$/;
const SLUG = /^[a-z0-9][a-z0-9-]{0,79}$/;
const TEXT_EXT = new Set(['json', 'txt', 'md', 'srt', 'vtt', 'lrc', 'csv']);
/** The largest text or JSON file that is looked through for private details before it goes up. */
const SCAN_BYTES = 5_000_000;

/* ---------- pure parts (tested) ---------- */

/** `["save", "songs", "--set", "title=Nakama", "--yes"]` → positionals, flags by name (repeated ones as lists) and switches. */
export function parseArgs(argv) {
  const args = [];
  const flags = {};
  const add = (name, value) => (flags[name] = flags[name] === undefined ? value : [...[flags[name]].flat(), value]);
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (!arg.startsWith('--')) args.push(arg);
    else if (arg.includes('=') && !['--set', '--file'].includes(arg)) add(arg.slice(2, arg.indexOf('=')), arg.slice(arg.indexOf('=') + 1));
    else if (['--set', '--file'].includes(arg)) add(arg.slice(2), argv[++i] ?? '');
    else add(arg.slice(2), true);
  }
  return { args, flags };
}
export const listOf = value => (value === undefined || value === true ? [] : [value].flat().map(String));

/** `--set` pairs as the fields a save sends. `key=` clears a field; a value that starts with [ or { is JSON. */
export function fieldsFrom(pairs) {
  const fields = {};
  for (const pair of pairs) {
    const at = pair.indexOf('=');
    if (at < 1) throw new Error(`--set takes <field>=<value>, not "${pair}"`);
    const key = pair.slice(0, at).trim();
    const raw = pair.slice(at + 1);
    if (raw === '') fields[key] = null;
    else if (/^\s*[[{]/.test(raw)) {
      try {
        fields[key] = JSON.parse(raw);
      } catch {
        throw new Error(`--set ${key}= looks like JSON but isn't valid JSON`);
      }
    } else fields[key] = raw;
  }
  return fields;
}

/** `--file` pairs as { slot, path }. */
export function filesFrom(pairs) {
  return pairs.map(pair => {
    const at = pair.indexOf('=');
    const slot = pair.slice(0, at).trim().toLowerCase();
    if (at < 1 || !SLUG.test(slot)) throw new Error(`--file takes <slot>=<path>, not "${pair}"`);
    return { slot, path: path.resolve(pair.slice(at + 1)) };
  });
}

/** `--made-from=transcript=master:scribe` → which slot's file was made from which, and with what. */
export function madeFromOf(value) {
  return listOf(value).map(spec => {
    const [slot, rest = ''] = spec.split('=');
    const [source, tool] = rest.split(':');
    if (!SLUG.test(slot ?? '') || !SLUG.test(source ?? '')) throw new Error(`--made-from takes <slot>=<source slot>[:<tool>], not "${spec}"`);
    return { slot, source, ...(tool && { tool }) };
  });
}

/** Private details a text or JSON file should not carry into a shared place: what was found, never the value. */
export function privateDetails(content) {
  const found = [];
  const count = pattern => (content.match(pattern) ?? []).length;
  const say = (n, one, many) => n && found.push(`${n} ${n === 1 ? one : many}`);
  say(count(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi), 'email address', 'email addresses');
  say(count(/\b(sk-[A-Za-z0-9_-]{16,}|gh[pousr]_[A-Za-z0-9]{20,}|AKIA[0-9A-Z]{16}|xox[baprs]-[A-Za-z0-9-]{10,})\b/g) + count(/-----BEGIN [A-Z ]*PRIVATE KEY-----/g), 'thing that looks like a key or a token', 'things that look like keys or tokens');
  say(count(/"(password|passwd|secret|api[_-]?key|access[_-]?token)"\s*:\s*"[^"]{4,}"/gi), 'password or key field', 'password or key fields');
  say(count(/(\/Users\/|\/home\/|[A-Z]:\\Users\\)[^\s"']+/g), 'path on a computer', 'paths on a computer');
  say(count(/(?<![\d.])\+\d[\d\s().-]{8,16}\d(?![\d.])/g), 'phone number', 'phone numbers');
  return found;
}

export const sizeOf = bytes => (bytes >= 1e9 ? `${(bytes / 1e9).toFixed(1)} GB` : bytes >= 1e6 ? `${Math.round(bytes / 1e6)} MB` : `${Math.max(1, Math.round(bytes / 1e3))} KB`);

/** Where this computer keeps the files it fetched, by content: beside its MediaMake config. */
export const cacheDir = (env = process.env) => env.MEDIAMAKE_LIBRARY_CACHE ?? path.join(path.dirname(configFile(env)), 'library-cache');
export const cachePath = (sha256, env = process.env) => path.join(cacheDir(env), sha256.slice(0, 2), sha256);

/** The space a command means, of the ones the account can open: by id or name, else the personal one. */
export function pickSpace(spaces, wanted) {
  const list = spaces.map(s => s.space);
  if (!wanted || ['mine', 'personal'].includes(String(wanted).toLowerCase())) {
    const personal = list.find(s => s.personal);
    if (!personal) throw new Error('Your personal space has no files side yet: open Spaces in the app once, or name a project with --project=<name>.');
    return personal;
  }
  const q = String(wanted).trim().toLowerCase();
  const slug = text => text.toLowerCase().replace(/[^a-z0-9]+/g, '');
  const hits = list.filter(s => s.id === wanted || s.name.toLowerCase() === q || slug(s.name) === slug(q));
  if (hits.length === 1) return hits[0];
  const names = list.map(s => `${s.name} (${s.id})`).join(', ') || 'none';
  throw new Error(hits.length ? `Several spaces are called "${wanted}": use the id. ${names}` : `No space "${wanted}" of yours. Yours: ${names}`);
}

/** An overview as lines. */
export function overviewLines(view) {
  const lines = [`${view.space.name} Library${view.space.role === 'viewer' ? ' (you can read it)' : ''}`];
  if (!view.collections.length) lines.push('  No collections yet. Start one from a template: mm library templates');
  for (const c of view.collections) {
    lines.push(`  ${c.name} (${c.slug}) · ${c.entries} ${c.entries === 1 ? c.noun : `${c.noun}s`}`);
    lines.push(`      fields: ${c.fields.map(f => f.key).join(', ')}`);
    lines.push(`      files:  ${c.slots.map(s => (s.many ? `${s.key} (many)` : s.key)).join(', ')}`);
    for (const [list, values] of Object.entries(c.learned ?? {})) if (values.length) lines.push(`      known ${list}s: ${values.slice(0, 12).join(', ')}${values.length > 12 ? ', …' : ''}`);
  }
  return lines;
}

/** An entry as lines: its card, then every field and file. */
export function entryLines(entry, statistics = []) {
  const lines = [entry.card, ''];
  for (const [key, value] of Object.entries({ ...entry.fields, ...entry.extra })) {
    const text = typeof value === 'string' ? value : JSON.stringify(value);
    lines.push(`  ${key}: ${text.length > 160 ? `${text.slice(0, 157).replace(/\n/g, ' ')}… (mm library read ${entry.collection}/${entry.slug} ${key})` : text.replace(/\n/g, ' ')}`);
  }
  for (const [slot, files] of Object.entries(entry.slots)) for (const file of files) lines.push(`  file ${slot}: ${file.name} · ${sizeOf(file.size)} · ${file.type} · ${file.sha256.slice(0, 12)}${file.madeFrom ? ` · made from ${file.madeFrom.sha256.slice(0, 12)}${file.madeFrom.tool ? ` with ${file.madeFrom.tool}` : ''}` : ''}`);
  for (const stat of statistics) lines.push(`  numbers ${stat.platform} (${stat.day}): ${Object.entries(stat.numbers).map(([key, value]) => `${key} ${value}`).join(', ')}`);
  lines.push(`  revision ${entry.rev}${entry.agent ? ' · first saved by an AI session' : ''}`);
  return lines;
}

/* ---------- the network ---------- */

const signedIn = env => {
  const url = site(env);
  const key = apiKey(url, env);
  if (!key) throw new Error(`This computer isn't signed in to ${url}: mm login.`);
  return { url, key: key.key };
};
/** This place's name for the usage lines: the cloud environment's, else the computer's random label. */
const placeName = env => env.MEDIAMAKE_PLACE || deviceLabel(env);
const api = (env, method, route, body) => {
  const at = signedIn(env);
  return call(method, `${at.url}/api/library${route}`, at.key, body, { timeoutMs: 30_000 });
};
const query = params => {
  const q = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) for (const v of [value].flat()) if (v !== undefined && v !== '' && v !== false) q.append(key, String(v));
  return `?${q}`;
};

async function spaceFor(env, flags) {
  const { spaces } = await api(env, 'GET', '');
  return pickSpace(spaces, typeof flags.project === 'string' ? flags.project : undefined);
}
const refOf = raw => {
  const ref = String(raw ?? '').toLowerCase();
  if (!REF.test(ref)) throw new Error('Which entry? <collection>/<entry>, e.g. songs/nakama (mm library search lists them).');
  return ref;
};

export function sha256Of(file) {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    fs.createReadStream(file).on('data', chunk => hash.update(chunk)).on('error', reject).on('end', () => resolve(hash.digest('hex')));
  });
}

async function download(url, to) {
  const res = await fetch(url, { signal: AbortSignal.timeout(60 * 60 * 1000) });
  if (!res.ok || !res.body) throw new Error(`Storage answered ${res.status}`);
  fs.mkdirSync(path.dirname(to), { recursive: true });
  const part = `${to}.part`;
  const hash = crypto.createHash('sha256');
  const out = fs.createWriteStream(part);
  for await (const chunk of Readable.fromWeb(res.body)) {
    hash.update(chunk);
    if (!out.write(chunk)) await new Promise(done => out.once('drain', done));
  }
  await new Promise((done, bad) => out.end(error => (error ? bad(error) : done())));
  return { part, sha256: hash.digest('hex') };
}

/** Puts `from` at `to` as a clone where the disk can (no second copy of the bytes), else a copy. */
const place = (from, to) => {
  fs.mkdirSync(path.dirname(to), { recursive: true });
  fs.copyFileSync(from, to, fs.constants.COPYFILE_FICLONE);
};

/* ---------- commands ---------- */

async function overview(env, flags) {
  const space = await spaceFor(env, flags);
  const view = await api(env, 'GET', query({ space: space.id }));
  if (flags.json) return console.log(JSON.stringify(view, null, 2)), 0;
  for (const line of overviewLines(view)) console.log(line);
  if (view.collections.length) console.log('\nHow to fill one: mm library guide <collection>');
  return 0;
}

async function templates(env, flags) {
  const { templates: list } = await api(env, 'GET', '');
  if (flags.json) return console.log(JSON.stringify(list, null, 2)), 0;
  for (const t of list) console.log(`  ${t.id}   ${t.name}: ${t.about} (${t.fields} fields, ${t.slots} file slots)\n      mm library new ${t.id}`);
  return 0;
}

async function newCollection(env, [template], flags) {
  if (!template) throw new Error('Which template? mm library templates lists them.');
  const space = await spaceFor(env, flags);
  const name = typeof flags.name === 'string' ? flags.name : undefined;
  if (!flags.yes) {
    console.log(`Make a new collection${name ? ` "${name}"` : ''} from the ${template} template in the ${space.name} space (cloud)?\nNothing was made. After the person agrees: add --yes.`);
    return 0;
  }
  const made = await api(env, 'POST', '', { action: 'new-collection', space: space.id, template, ...(name && { name }) });
  console.log(`✔ ${made.collection.name} (${made.collection.slug}) is in the ${space.name} space.\n  How to fill it: mm library guide ${made.collection.slug}`);
  return 0;
}

async function guide(env, [collection], flags) {
  const space = await spaceFor(env, flags);
  const view = await api(env, 'GET', query({ space: space.id }));
  const found = view.collections.find(c => c.slug === String(collection ?? '').toLowerCase());
  if (!found) throw new Error(`Which collection? The ${space.name} space has: ${view.collections.map(c => c.slug).join(', ') || 'none yet'}.`);
  if (flags.json) return console.log(JSON.stringify(found, null, 2)), 0;
  console.log(found.guide.trim());
  console.log('\n## Fields\n');
  for (const f of found.fields) console.log(`- ${f.key} (${f.kind}${f.learns ? `, learns ${f.learns}` : ''}${f.neverGuess ? ', never guessed' : ''})${f.options ? `: ${f.options.join(' | ')}` : ''}${f.hint ? `. ${f.hint}` : ''}`);
  console.log('\n## File slots\n');
  for (const s of found.slots) console.log(`- ${s.key} (${s.accepts.join(' or ')}, ${s.many ? 'many' : 'one'})${s.hint ? `. ${s.hint}` : ''}`);
  for (const [list, values] of Object.entries(found.learned ?? {})) if (values.length) console.log(`\n## Known ${list}s, most used first\n\n${values.join(', ')}`);
  console.log(`\n## The owner's preferences\n\n${found.prefs?.trim() || 'None written yet.'}`);
  return 0;
}

async function search(env, args, flags) {
  const space = flags.all ? null : await spaceFor(env, flags);
  const found = await api(env, 'GET', `/entries${query({ q: args.join(' '), space: space?.id, collection: flags.collection, where: listOf(flags.where), has: listOf(flags.has), lacks: listOf(flags.lacks), limit: flags.limit, device: placeName(env) })}`);
  if (flags.json) return console.log(JSON.stringify(found, null, 2)), 0;
  if (!found.results.length) return console.log(`Nothing fits in ${space ? `the ${space.name} Library` : 'your Libraries'}.`), 0;
  console.log(`${found.total} fit${found.total > found.results.length ? `, the newest ${found.results.length}` : ''}:\n`);
  for (const hit of found.results) console.log(`${hit.card}${flags.all ? `\nspace: ${hit.space}` : ''}\n`);
  return 0;
}

async function get(env, [raw], flags) {
  const ref = refOf(raw);
  const space = await spaceFor(env, flags);
  const found = await api(env, 'GET', `/entries${query({ space: space.id, ref })}`);
  if (flags.json) return console.log(JSON.stringify(found, null, 2)), 0;
  for (const line of entryLines(found.entry, found.statistics)) console.log(line);
  return 0;
}

async function read(env, [raw, what], flags) {
  const ref = refOf(raw);
  if (!what) throw new Error('Read what? A field (lyrics) or a file slot (transcript).');
  const space = await spaceFor(env, flags);
  const got = await api(env, 'GET', `/files${query({ space: space.id, ref, read: what, lines: flags.lines, from: flags.from, to: flags.to, device: placeName(env) })}`);
  if (flags.json) return console.log(JSON.stringify(got, null, 2)), 0;
  if (got.note) console.error(`(${got.note})`);
  console.log(got.text);
  return 0;
}

async function preview(env, [raw, slot], flags) {
  const ref = refOf(raw);
  const space = await spaceFor(env, flags);
  const { entry } = await api(env, 'GET', `/entries${query({ space: space.id, ref })}`);
  const files = Object.entries(entry.slots).filter(([key]) => !slot || key === slot);
  if (flags.json) return console.log(JSON.stringify(Object.fromEntries(files), null, 2)), 0;
  if (!files.length) return console.log(`${entry.title} has no file${slot ? ` in ${slot}` : 's'}.`), 0;
  for (const [key, list] of files) for (const file of list) console.log(`${key}: ${file.name} · ${sizeOf(file.size)} · ${file.type} (${file.contentType}) · sha256 ${file.sha256}${file.madeFrom ? `\n    made from ${file.madeFrom.sha256}${file.madeFrom.tool ? ` with ${file.madeFrom.tool}` : ''}` : ''}${fs.existsSync(cachePath(file.sha256, env)) ? '\n    already on this computer' : ''}`);
  console.log('\nThumbnails, waveforms and short clips are not made yet: a text or JSON file is read with mm library read, anything else is fetched.');
  return 0;
}

async function fetchFiles(env, [raw, ...slots], flags) {
  const ref = refOf(raw);
  const space = await spaceFor(env, flags);
  const to = path.resolve(typeof flags.to === 'string' ? flags.to : '.');
  const got = await api(env, 'GET', `/files${query({ space: space.id, ref, slots: slots.join(','), device: placeName(env) })}`);
  const done = [];
  for (const file of got.files) {
    const cached = cachePath(file.sha256, env);
    const dest = path.join(to, file.name);
    if (fs.existsSync(dest)) {
      if ((await sha256Of(dest)) === file.sha256) {
        done.push(`  = ${dest} (already there)`);
        continue;
      }
      if (!flags.replace) throw new Error(`${dest} is there and differs from the Library's ${file.name}. Nothing was replaced: move it, or add --replace.`);
    }
    let from = 'this computer';
    if (!fs.existsSync(cached)) {
      const { part, sha256 } = await download(file.url, cached);
      if (sha256 !== file.sha256) {
        fs.rmSync(part, { force: true });
        throw new Error(`${file.name} arrived damaged (its SHA-256 differs): try again.`);
      }
      fs.renameSync(part, cached);
      from = 'the cloud';
    }
    place(cached, dest);
    done.push(`  ✔ ${dest} (${file.slot}, ${sizeOf(file.size)}, from ${from})`);
  }
  if (flags.json) return console.log(JSON.stringify({ ref, to, files: got.files.map(f => ({ slot: f.slot, name: f.name, sha256: f.sha256, path: path.join(to, f.name) })) }, null, 2)), 0;
  console.log(`${got.title}:`);
  for (const line of done) console.log(line);
  return 0;
}

async function save(env, [collection, entry], flags) {
  if (!SLUG.test(String(collection ?? ''))) throw new Error('Save to which collection? mm library save <collection> [<entry>] …');
  if (entry && !SLUG.test(entry)) throw new Error(`"${entry}" is not an entry's id: lowercase letters, digits and dashes (mm library search lists them).`);
  const space = await spaceFor(env, flags);
  const fields = { ...(typeof flags.json === 'string' ? JSON.parse(fs.readFileSync(flags.json, 'utf8')) : {}), ...fieldsFrom(listOf(flags.set)) };
  const local = [];
  const findings = [];
  for (const file of filesFrom(listOf(flags.file))) {
    const stat = fs.statSync(file.path, { throwIfNoEntry: false });
    if (!stat?.isFile()) throw new Error(`No file at ${file.path}`);
    const name = path.basename(file.path);
    if (TEXT_EXT.has(name.toLowerCase().split('.').pop()) && stat.size <= SCAN_BYTES) {
      const found = privateDetails(fs.readFileSync(file.path, 'utf8'));
      if (found.length) findings.push(`${name}: ${found.join(', ')}`);
    }
    local.push({ ...file, name, size: stat.size, sha256: await sha256Of(file.path) });
  }
  const made = madeFromOf(flags['made-from']);
  const body = { space: space.id, collection, ...(entry && { slug: entry }), fields, files: local.map(f => ({ slot: f.slot, sha256: f.sha256, name: f.name, size: f.size })), ...(Number.isInteger(Number(flags.rev)) && flags.rev !== undefined && { rev: Number(flags.rev) }), agent: flags.agent === true || env.CLAUDECODE === '1', device: placeName(env) };

  const dry = await api(env, 'POST', '/entries', { ...body, dry: true });
  if (!flags.yes || (findings.length && !flags['private-ok'])) {
    if (flags.json === true) return console.log(JSON.stringify({ ...dry, private: findings }, null, 2)), 0;
    console.log(dry.ask);
    for (const change of dry.changes.filter(c => !dry.created && !c.what.startsWith('file:'))) console.log(`  ${change.what}: ${change.from ?? 'empty'} → ${change.to ?? 'empty'}`);
    for (const warning of dry.warnings) console.log(`  ! ${warning}`);
    for (const finding of findings) console.log(`  ! private details in ${finding}. Everyone on the space can read this file: take them out, or add --private-ok when the person says they may go up.`);
    if (!dry.changes.length) console.log('  Nothing would change.');
    console.log(findings.length && flags.yes ? '\nNothing was saved: see the private details above.' : '\nNothing was saved. Show the person the lines above, and after they agree: add --yes.');
    return findings.length && flags.yes ? 1 : 0;
  }

  if (local.length) {
    const started = await api(env, 'POST', '/files', { action: 'start', space: space.id, files: local.map(f => ({ sha256: f.sha256, size: f.size, name: f.name })) });
    for (const upload of started.uploads) {
      const file = local.find(f => f.sha256 === upload.sha256);
      console.error(`  ↑ ${file.name} (${sizeOf(file.size)})`);
      const res = await fetch(upload.uploadUrl, { method: 'PUT', headers: { ...upload.headers, 'Content-Length': String(file.size) }, body: Readable.toWeb(fs.createReadStream(file.path)), duplex: 'half', signal: AbortSignal.timeout(6 * 60 * 60 * 1000) });
      if (!res.ok) throw new Error(`Storage refused ${file.name} (${res.status}). Nothing was saved to the entry: run it again, files that arrived are not sent twice.`);
    }
    await api(env, 'POST', '/files', { action: 'finish', space: space.id, sha256s: local.map(f => f.sha256), device: placeName(env) });
  }
  const shaOfSlot = slot => local.find(f => f.slot === slot)?.sha256;
  let existing = null;
  if (made.some(m => !shaOfSlot(m.source)) && entry) existing = (await api(env, 'GET', `/entries${query({ space: space.id, ref: `${collection}/${entry}` })}`)).entry;
  const files = local.map(f => {
    const from = made.find(m => m.slot === f.slot);
    const source = from && (shaOfSlot(from.source) ?? existing?.slots?.[from.source]?.[0]?.sha256);
    if (from && !source) throw new Error(`--made-from: there is no file in ${from.source} to say ${f.name} was made from.`);
    return { slot: f.slot, sha256: f.sha256, name: f.name, ...(source && { madeFrom: { sha256: source, ...(from.tool && { tool: from.tool }) } }) };
  });
  const saved = await api(env, 'POST', '/entries', { ...body, files });
  if (flags.json === true) return console.log(JSON.stringify(saved, null, 2)), 0;
  console.log(`✔ ${saved.created ? 'Added' : saved.changed ? 'Changed' : 'Nothing to change in'} ${saved.entry.title} (${saved.ref}) in the ${space.name} space, revision ${saved.entry.rev}.`);
  for (const warning of saved.warnings) console.log(`  ! ${warning}`);
  return 0;
}

async function stats(env, [raw], flags) {
  const ref = refOf(raw);
  if (typeof flags.platform !== 'string') throw new Error('Which platform? --platform=<name>');
  const numbers = Object.fromEntries(Object.entries(fieldsFrom(listOf(flags.set))).map(([key, value]) => [key, Number(value)]));
  if (!Object.keys(numbers).length || Object.values(numbers).some(n => !Number.isFinite(n))) throw new Error('Which numbers? --set streams=1200 --set listeners=300');
  const space = await spaceFor(env, flags);
  await api(env, 'POST', '/stats', { space: space.id, ref, rows: [{ platform: flags.platform, ...(typeof flags.day === 'string' && { day: flags.day }), numbers, source: typeof flags.source === 'string' ? flags.source : 'typed' }] });
  console.log(`✔ ${flags.platform} numbers saved for ${ref}.`);
  return 0;
}

async function trash(env, [raw], flags) {
  const ref = refOf(raw);
  const space = await spaceFor(env, flags);
  if (!flags.yes) return console.log(`Move ${ref} of the ${space.name} space to the trash? Its files stay stored while anything else uses them.\nNothing was moved. After the person agrees: add --yes.`), 0;
  const gone = await api(env, 'DELETE', `/entries${query({ space: space.id, ref })}`);
  console.log(`✔ ${gone.title} is in the trash.`);
  return 0;
}

async function prefs(env, [collection], flags) {
  if (typeof flags.file !== 'string') throw new Error('The preferences as a Markdown file: --file=<prefs.md>');
  const text = fs.readFileSync(path.resolve(flags.file), 'utf8');
  const space = await spaceFor(env, flags);
  if (!flags.yes) return console.log(`Replace the owner's preferences of ${collection} in the ${space.name} space with ${flags.file} (${text.split('\n').length} lines)?\nNothing was changed. After the person agrees: add --yes.`), 0;
  await api(env, 'POST', '', { action: 'prefs', space: space.id, collection, prefs: text });
  console.log(`✔ The preferences of ${collection} are saved. Everyone who fills it reads them: mm library guide ${collection}`);
  return 0;
}

async function usage(env, flags) {
  const got = await api(env, 'GET', `/usage${query({ days: flags.days, all: flags.all ? 1 : undefined })}`);
  if (flags.json || flags.all) return console.log(JSON.stringify(got, null, 2)), 0;
  const t = got.total;
  console.log(`Since ${got.since}: ${t.uploads} uploads (${sizeOf(t.uploadedBytes)}), ${t.fetches} fetches and ${t.reads} reads (${sizeOf(t.fetchedBytes)}), ${t.searches} searches, ${t.saves} saves, ${t.fills} AI fills.`);
  console.log(`Estimated cost to MediaMake: $${got.cost.toFixed(4)} (storage not counted here).`);
  return 0;
}

export async function main(argv = process.argv.slice(2), env = process.env) {
  const { args, flags } = parseArgs(argv);
  const [cmd, ...rest] = args;
  if (cmd === 'help' || flags.help) return console.log(fs.readFileSync(SELF, 'utf8').split('*/')[0].split('\n').slice(2).map(line => line.replace(/^ \* ?/, '')).join('\n')), 0;
  switch (cmd) {
    case undefined:
    case 'overview':
      return overview(env, flags);
    case 'templates':
      return templates(env, flags);
    case 'new':
      return newCollection(env, rest, flags);
    case 'guide':
      return guide(env, rest, flags);
    case 'search':
      return search(env, rest, flags);
    case 'get':
      return get(env, rest, flags);
    case 'read':
      return read(env, rest, flags);
    case 'preview':
      return preview(env, rest, flags);
    case 'fetch':
      return fetchFiles(env, rest, flags);
    case 'save':
      return save(env, rest, flags);
    case 'stats':
      return stats(env, rest, flags);
    case 'trash':
      return trash(env, rest, flags);
    case 'prefs':
      return prefs(env, rest, flags);
    case 'usage':
      return usage(env, flags);
    default:
      if (REF.test(cmd.toLowerCase())) return get(env, [cmd], flags);
      throw new Error(`No "${cmd}". mm library help lists the commands.`);
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === SELF) {
  main().then(
    code => (process.exitCode = code),
    error => {
      console.error(`mm library: ${error instanceof Error ? error.message : error}`);
      process.exitCode = 1;
    },
  );
}
