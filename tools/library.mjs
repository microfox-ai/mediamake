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
 *        [--lacks=stems] [--limit=10] [--all] [--meaning]
 *                                            cards of the entries that fit. --all: every space you can open.
 *                                            --meaning: by what an entry is about ("the sad sea song"), best
 *                                            first, each with the piece of its words that fits.
 *   mm library reindex [<collection>]        rebuild the search index of a collection (or of every collection of
 *                                            the space) from its records. Changes no entry.
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
 *   mm library use <collection>/<entry> [<slot>…] --into=<project or folder> [--replace]
 *                                            the entry's files into a production's input folder (every slot,
 *                                            or the ones named), and a note of what it took in
 *                                            library.json there: each file's SHA-256, for a later render.
 *   mm library made-from <file or SHA-256> [--slot=transcript] [--tool=<name>] [--params="<settings>"]
 *        [--to=<file>] [--replace]
 *                                            what the Library holds that was made from this exact file with
 *                                            these settings (none: the tool's defaults): a transcript of
 *                                            this master. Look before paying for it again. --to takes the
 *                                            newest one. Every space you can open, or --project's.
 *   mm library save <collection> [<entry>] [--set <field>=<value>]… [--json=<fields.json>]
 *        [--file <slot>=<path>]… [--item <slot>=<media library id>]…
 *        [--made-from=<slot>=<source slot>[:<tool>[:<settings>]]]
 *        [--rev=<n>] [--private-ok] [--yes]
 *                                            adds an entry (no <entry>: a new one, named by its title) or
 *                                            changes one. Without --yes nothing is saved: it prints the one
 *                                            sentence to ask the person. Add --yes after they agree.
 *                                            --item takes the file from this computer's media library by
 *                                            its id (or the id's start): the file stays where it is.
 *   mm library stats <collection>/<entry> --platform=<name> [--day=2026-11-19] --set <number>=<value>…
 *                                            a platform's numbers for a day
 *   mm library trash <collection>/<entry> [--yes]
 *   mm library prefs <collection> --file=<prefs.md> [--yes]    the owner's preferences for whoever fills it
 *   mm library headshot <collection> <picture file or https link> [--yes]   the picture on the collection's card
 *   mm library headshot <collection> --clear [--yes]                         takes it off
 *   mm library usage [--days=30] [--all]     what you used and its estimated cost (--all: admins, everyone's)
 *
 * Shared collections. A collection is opened to a project or a person by the owner of its space. They
 * use the collection itself, never a copy, under the id it has in their Library (`songs`, or
 * `songs-<who shares it>` when they have a `songs` of their own): every command above takes that id.
 *
 *   mm library shares <collection>           who it is opened to, and what each fetched in 30 days
 *   mm library share <collection> --with=<project> | --to=<email> [--editor] [--internal] [--yes]
 *                                            the owner's word: invites a project you are on (everyone on
 *                                            it) or one person. --editor lets them add and change too.
 *                                            Entries marked "Internal only" stay out unless --internal.
 *   mm library unshare <collection> --with=<project> | --to=<name as shares lists it> [--yes]
 *                                            takes it back, at once
 *   mm library accept <collection> [--from=<who shares it>] [--yes]
 *                                            says yes to an invitation in --project's Library (or yours)
 *   mm library leave <collection> [--yes]    declines an invitation, or leaves a shared collection
 *   mm library notes <collection>/<entry> [--rating=1-5] [--tags=a,b] [--used-in=a,b] [--yes]
 *                                            your space's own notes on a shared entry. They stay in your
 *                                            space and never touch the entry.
 *
 * This computer's own library (its media library, `mm media`), as cards for the Library's page and for
 * cloud sessions. A card says what a file is: never its bytes, never where it is on the disk.
 *
 *   mm library report                        whether this computer reports, and what a report would send
 *   mm library report on                     its owner's word: turns reporting on and sends the cards
 *   mm library report --yes                  sends the cards again (after the media library changed)
 *   mm library report off                    stops reporting. What was sent stays until forget.
 *   mm library report forget                 takes this computer's cards out of MediaMake
 *   mm library devices [--project=<name or id>]
 *                                            the computers you may look into from that space
 *   mm library devices "<words>" [--on=<computer>] [--kind=music] [--where=device|both] [--limit=20]
 *                                            their files that fit, and whether each is also in the cloud
 *
 * --json prints the server's answer as JSON. A value for --set that starts with [ or { is read as JSON:
 *   --set 'storeLinks=[{"platform":"Spotify","url":"https://…"}]'
 * Never a key or a password in a field or a file: everyone on the space reads them.
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
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
    else if (arg.includes('=') && !['--set', '--file', '--item'].includes(arg)) add(arg.slice(2, arg.indexOf('=')), arg.slice(arg.indexOf('=') + 1));
    else if (['--set', '--file', '--item'].includes(arg)) add(arg.slice(2), argv[++i] ?? '');
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

/** `--made-from=transcript=master:scribe` (or `…:scribe:lang=en letters`) → which slot's file was made from which, with what tool and settings. */
export function madeFromOf(value) {
  return listOf(value).map(spec => {
    const at = spec.indexOf('=');
    const slot = at < 0 ? spec : spec.slice(0, at);
    const [source, tool, ...rest] = (at < 0 ? '' : spec.slice(at + 1)).split(':');
    const params = rest.join(':').trim();
    if (!SLUG.test(slot ?? '') || !SLUG.test(source ?? '')) throw new Error(`--made-from takes <slot>=<source slot>[:<tool>[:<settings>]], not "${spec}"`);
    return { slot, source, ...(tool && { tool }), ...(params && { params }) };
  });
}

/** `--item` pairs as { slot, id }: a slot and the start of a media library id (a SHA-256). */
export function itemsFrom(pairs) {
  return pairs.map(pair => {
    const at = pair.indexOf('=');
    const slot = pair.slice(0, at).trim().toLowerCase();
    const id = pair.slice(at + 1).trim().toLowerCase();
    if (at < 1 || !SLUG.test(slot) || !/^[0-9a-f]{8,64}$/.test(id)) throw new Error(`--item takes <slot>=<media library id, at least its first 8 characters>, not "${pair}"`);
    return { slot, id };
  });
}

/** A media library item as the card a report sends: what it is, its file's name without the folder. Null for what isn't a file's content. */
export function cardOfItem(item, tags = []) {
  if (!/^[0-9a-f]{64}$/.test(String(item.id ?? '')) || !['online', 'cold'].includes(item.status)) return null;
  const positive = value => (typeof value === 'number' && value > 0 ? value : undefined);
  return {
    sha256: item.id,
    name: String(item.path ?? '').split(/[\\/]/).pop() || `${item.id.slice(0, 12)}.${item.ext ?? 'bin'}`,
    ...(item.title && { title: String(item.title) }),
    kind: String(item.kind ?? 'other').replace(/^_/, ''),
    ...(item.subject && { subject: String(item.subject) }),
    bytes: Number(item.bytes) || 0,
    ...(positive(item.duration) && { duration: item.duration }),
    ...(positive(item.width) && { width: item.width }),
    ...(positive(item.height) && { height: item.height }),
    tags: tags.slice(0, 20),
    ...(item.status === 'cold' && { cold: true }),
  };
}

/** What a report would send, in a few lines: how many files, how much, of which kinds. */
export function reportLines(cards) {
  const kinds = {};
  for (const card of cards) kinds[card.kind] = (kinds[card.kind] ?? 0) + 1;
  const bytes = cards.reduce((sum, card) => sum + card.bytes, 0);
  return [
    `${cards.length} file${cards.length === 1 ? '' : 's'}, ${sizeOf(bytes)} on this computer.`,
    ...Object.entries(kinds).sort((a, b) => b[1] - a[1]).map(([kind, n]) => `  ${kind}: ${n}`),
    'A card is a file\'s name, title, kind, subject, tags, size, length and SHA-256. Never the file, never its folder.',
  ];
}

/** Whether this computer reports its cards: its owner's `libraryReport` in the config, off until they say so. */
export const reportSetting = (env = process.env) => readConfig(env).libraryReport === 'on';

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
    const sharing = c.shared ? ` · shared by ${c.shared.by} (${c.shared.role === 'editor' ? 'you can add and change' : 'read and fetch'})` : c.sharedWith ? ` · shared with ${c.sharedWith}` : '';
    lines.push(`  ${c.name} (${c.slug}) · ${c.entries} ${c.entries === 1 ? c.noun : `${c.noun}s`}${sharing}`);
    lines.push(`      fields: ${c.fields.map(f => f.key).join(', ')}`);
    lines.push(`      files:  ${c.slots.map(s => (s.many ? `${s.key} (many)` : s.key)).join(', ')}`);
    for (const [list, values] of Object.entries(c.learned ?? {})) if (values.length) lines.push(`      known ${list}s: ${values.slice(0, 12).join(', ')}${values.length > 12 ? ', …' : ''}`);
  }
  for (const i of view.invitations ?? []) lines.push(`  Invitation: ${i.by} shares ${i.name} (${i.entries} ${i.entries === 1 ? i.noun : `${i.noun}s`}). ${i.says}\n      mm library accept ${i.collection}`);
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
  const found = await api(env, 'GET', `/entries${query({ q: args.join(' '), space: space?.id, collection: flags.collection, where: listOf(flags.where), has: listOf(flags.has), lacks: listOf(flags.lacks), limit: flags.limit, meaning: flags.meaning === true ? 1 : undefined, device: placeName(env) })}`);
  if (flags.json) return console.log(JSON.stringify(found, null, 2)), 0;
  if (!found.results.length) return console.log(`Nothing fits in ${space ? `the ${space.name} Library` : 'your Libraries'}.`), 0;
  console.log(`${found.total} fit${found.total > found.results.length ? `, the newest ${found.results.length}` : ''}:\n`);
  for (const hit of found.results) console.log(`${hit.card}${flags.all ? `\nspace: ${hit.space}` : ''}${foundLine(hit)}\n`);
  return 0;
}

/** Where a search by meaning found it: the piece of the entry's words, with its time in the song when it has one. */
export function foundLine(hit) {
  if (!hit.found) return '';
  const clock = s => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
  const where = hit.found.from !== undefined ? ` at ${clock(hit.found.from)}` : '';
  return `\nfound in ${hit.found.what ?? 'its words'}${where}: "${hit.found.text.replace(/\s+/g, ' ').slice(0, 160)}"`;
}

async function reindex(env, [raw], flags) {
  const space = await spaceFor(env, flags);
  const view = await api(env, 'GET', query({ space: space.id }));
  const own = view.collections.filter(c => !c.shared);
  const wanted = raw ? own.filter(c => c.slug === String(raw).toLowerCase()) : own;
  if (!wanted.length) throw new Error(raw ? `No collection ${raw} of the ${space.name} space (one another space shares is rebuilt by its owner). It has: ${own.map(c => c.slug).join(', ') || 'none'}.` : `The ${space.name} space has no collections yet.`);
  const done = [];
  for (const collection of wanted) {
    let from = 0;
    let records = 0;
    let total = 0;
    for (;;) {
      const page = await api(env, 'POST', '/reindex', { space: space.id, collection: collection.slug, from });
      records += page.records;
      total = page.total;
      if (flags.json !== true) console.error(`  ${collection.slug}: ${page.done} of ${page.total}`);
      if (page.next === undefined) break;
      from = page.next;
    }
    done.push({ collection: collection.slug, entries: total, records });
  }
  if (flags.json === true) return console.log(JSON.stringify({ space: space.name, rebuilt: done }, null, 2)), 0;
  for (const d of done) console.log(`✔ ${d.collection}: ${d.entries} ${d.entries === 1 ? 'entry' : 'entries'} in the search index (${d.records} pieces).`);
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

/** Brings one stored file to `dest`, from this computer's cache when it has it. Says where it came from. */
async function bring(env, file, dest, replace) {
  const cached = cachePath(file.sha256, env);
  if (fs.existsSync(dest)) {
    if ((await sha256Of(dest)) === file.sha256) return 'already there';
    if (!replace) throw new Error(`${dest} is there and differs from the Library's ${file.name}. Nothing was replaced: move it, or add --replace.`);
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
  return from;
}

async function fetchFiles(env, [raw, ...slots], flags) {
  const ref = refOf(raw);
  const space = await spaceFor(env, flags);
  const to = path.resolve(typeof flags.to === 'string' ? flags.to : '.');
  const got = await api(env, 'GET', `/files${query({ space: space.id, ref, slots: slots.join(','), device: placeName(env) })}`);
  const done = [];
  for (const file of got.files) {
    const dest = path.join(to, file.name);
    const from = await bring(env, file, dest, flags.replace);
    done.push(from === 'already there' ? `  = ${dest} (already there)` : `  ✔ ${dest} (${file.slot}, ${sizeOf(file.size)}, from ${from})`);
  }
  if (flags.json) return console.log(JSON.stringify({ ref, to, files: got.files.map(f => ({ slot: f.slot, name: f.name, sha256: f.sha256, path: path.join(to, f.name) })) }, null, 2)), 0;
  console.log(`${got.title}:`);
  for (const line of done) console.log(line);
  return 0;
}

/** Where a production keeps what it was given: `--into` as a folder, else the input folder of that project in the workspace. */
export function inputFolder(into, env = process.env) {
  if (typeof into !== 'string' || !into) throw new Error('Into which production? --into=<project> (its input folder), or --into=<a folder>.');
  if (/[\\/]/.test(into) || into.startsWith('.') || into.startsWith('~')) return path.resolve(into.replace(/^~(?=[\\/]|$)/, os.homedir()));
  const set = env.MEDIAMAKE_WORKSPACE?.trim() || readConfig(env).workspace;
  const root = typeof set === 'string' && set.trim() ? path.resolve(set.trim().replace(/^~(?=[\\/]|$)/, os.homedir())) : path.join(path.dirname(SELF), '..', 'apps', 'studio');
  const project = path.join(root, 'projects', into);
  if (!fs.existsSync(project)) throw new Error(`No project ${into} in ${path.join(root, 'projects')}. Give its folder instead: --into=<folder>.`);
  return path.join(project, 'input');
}

/** The note a production keeps of what it took from the Library: one line per file, the newest take of a slot's file replacing the older. */
export function takenNote(before, taken) {
  const kept = (Array.isArray(before?.files) ? before.files : []).filter(old => !taken.files.some(file => file.name === old.name));
  return { schema: 'mediamake.library-use/v1', files: [...kept, ...taken.files.map(file => ({ ...file, ref: taken.ref, space: taken.space, at: taken.at }))] };
}

async function use(env, [raw, ...slots], flags) {
  const ref = refOf(raw);
  const to = inputFolder(flags.into, env);
  const space = await spaceFor(env, flags);
  const got = await api(env, 'GET', `/files${query({ space: space.id, ref, slots: slots.join(','), device: placeName(env) })}`);
  if (!got.files.length) throw new Error(`${ref} has no file${slots.length ? ` in ${slots.join(', ')}` : ''} (mm library get ${ref}).`);
  const lines = [];
  for (const file of got.files) {
    const dest = path.join(to, file.name);
    const from = await bring(env, file, dest, flags.replace);
    lines.push(from === 'already there' ? `  = ${file.name} (${file.slot}, already there)` : `  ✔ ${file.name} (${file.slot}, ${sizeOf(file.size)}, from ${from})`);
  }
  const noteFile = path.join(to, 'library.json');
  let before = null;
  try {
    before = JSON.parse(fs.readFileSync(noteFile, 'utf8'));
  } catch {}
  const note = takenNote(before, { ref, space: space.name, at: new Date().toISOString(), files: got.files.map(f => ({ slot: f.slot, name: f.name, sha256: f.sha256, size: f.size })) });
  fs.writeFileSync(noteFile, `${JSON.stringify(note, null, 2)}\n`);
  if (flags.json === true) return console.log(JSON.stringify({ ref, to, files: note.files.filter(f => f.ref === ref) }, null, 2)), 0;
  console.log(`${got.title} → ${to}`);
  for (const line of lines) console.log(line);
  console.log(`  noted in ${noteFile}`);
  return 0;
}

async function madeFromFile(env, [what], flags) {
  if (!what) throw new Error('Made from which file? mm library made-from <file or SHA-256> [--slot=transcript]');
  let sha = String(what).toLowerCase();
  if (!/^[0-9a-f]{64}$/.test(sha)) {
    const file = path.resolve(what);
    if (!fs.statSync(file, { throwIfNoEntry: false })?.isFile()) throw new Error(`No file at ${file}`);
    sha = await sha256Of(file);
  }
  const space = typeof flags.project === 'string' ? await spaceFor(env, flags) : null;
  const text = name => (typeof flags[name] === 'string' ? flags[name] : undefined);
  const { results } = await api(env, 'GET', `/files${query({ madeFrom: sha, space: space?.id, slot: text('slot'), tool: text('tool'), params: text('params'), device: placeName(env) })}`);
  const to = text('to') && path.resolve(text('to'));
  let taken = null;
  if (to && results.length) {
    const hit = results[0];
    const got = await api(env, 'GET', `/files${query({ space: hit.spaceId, ref: hit.ref, slots: hit.slot, device: placeName(env) })}`);
    const file = got.files.find(f => f.sha256 === hit.sha256);
    if (!file) throw new Error(`${hit.ref} no longer holds ${hit.name}: look again.`);
    taken = { ...hit, path: to, from: await bring(env, file, to, flags.replace) };
  }
  if (flags.json === true) return console.log(JSON.stringify({ sha256: sha, results, ...(taken && { taken }) }, null, 2)), 0;
  if (!results.length) return console.log(`Nothing in ${space ? `the ${space.name} space` : 'the Library'} was made from this file${text('params') ? ' with these settings' : " with the tool's default settings"} (${sha.slice(0, 12)}).`), 0;
  for (const hit of results) console.log(`${hit.ref} (${hit.space}) · ${hit.slot}: ${hit.name} · ${sizeOf(hit.size)}${hit.tool ? ` · with ${hit.tool}` : ''}${hit.params ? ` (${hit.params})` : ''} · added ${hit.addedAt.slice(0, 10)}`);
  if (taken) console.log(`  ✔ ${taken.path} (${taken.from === 'already there' ? 'already there' : `from ${taken.from}`})`);
  else console.log('\nNothing was fetched. --to=<file> takes the newest one.');
  return 0;
}

async function save(env, [collection, entry], flags) {
  if (!SLUG.test(String(collection ?? ''))) throw new Error('Save to which collection? mm library save <collection> [<entry>] …');
  if (entry && !SLUG.test(entry)) throw new Error(`"${entry}" is not an entry's id: lowercase letters, digits and dashes (mm library search lists them).`);
  const space = await spaceFor(env, flags);
  const fields = { ...(typeof flags.json === 'string' ? JSON.parse(fs.readFileSync(flags.json, 'utf8')) : {}), ...fieldsFrom(listOf(flags.set)) };
  const local = [];
  const findings = [];
  const picked = [];
  for (const item of itemsFrom(listOf(flags.item))) picked.push({ slot: item.slot, ...(await localItem(env, item.id)) });
  for (const file of [...filesFrom(listOf(flags.file)), ...picked]) {
    const stat = fs.statSync(file.path, { throwIfNoEntry: false });
    if (!stat?.isFile()) throw new Error(`No file at ${file.path}`);
    const name = path.basename(file.path);
    if (TEXT_EXT.has(name.toLowerCase().split('.').pop()) && stat.size <= SCAN_BYTES) {
      const found = privateDetails(fs.readFileSync(file.path, 'utf8'));
      if (found.length) findings.push(`${name}: ${found.join(', ')}`);
    }
    local.push({ slot: file.slot, path: file.path, name, size: stat.size, sha256: await sha256Of(file.path) });
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
    const started = await api(env, 'POST', '/files', { action: 'start', space: space.id, collection, files: local.map(f => ({ sha256: f.sha256, size: f.size, name: f.name })) });
    for (const upload of started.uploads) {
      const file = local.find(f => f.sha256 === upload.sha256);
      console.error(`  ↑ ${file.name} (${sizeOf(file.size)})`);
      const res = await fetch(upload.uploadUrl, { method: 'PUT', headers: { ...upload.headers, 'Content-Length': String(file.size) }, body: Readable.toWeb(fs.createReadStream(file.path)), duplex: 'half', signal: AbortSignal.timeout(6 * 60 * 60 * 1000) });
      if (!res.ok) throw new Error(`Storage refused ${file.name} (${res.status}). Nothing was saved to the entry: run it again, files that arrived are not sent twice.`);
    }
    await api(env, 'POST', '/files', { action: 'finish', space: space.id, collection, sha256s: local.map(f => f.sha256), device: placeName(env) });
  }
  const shaOfSlot = slot => local.find(f => f.slot === slot)?.sha256;
  let existing = null;
  if (made.some(m => !shaOfSlot(m.source)) && entry) existing = (await api(env, 'GET', `/entries${query({ space: space.id, ref: `${collection}/${entry}` })}`)).entry;
  const files = local.map(f => {
    const from = made.find(m => m.slot === f.slot);
    const source = from && (shaOfSlot(from.source) ?? existing?.slots?.[from.source]?.[0]?.sha256);
    if (from && !source) throw new Error(`--made-from: there is no file in ${from.source} to say ${f.name} was made from.`);
    return { slot: f.slot, sha256: f.sha256, name: f.name, ...(source && { madeFrom: { sha256: source, ...(from.tool && { tool: from.tool }), ...(from.params && { params: from.params }) } }) };
  });
  const saved = await api(env, 'POST', '/entries', { ...body, files });
  if (flags.json === true) return console.log(JSON.stringify(saved, null, 2)), 0;
  console.log(`✔ ${saved.created ? 'Added' : saved.changed ? 'Changed' : 'Nothing to change in'} ${saved.entry.title} (${saved.ref}) in the ${space.name} space, revision ${saved.entry.rev}.`);
  for (const warning of saved.warnings) console.log(`  ! ${warning}`);
  return 0;
}

/* ---------- this computer's media library ---------- */

function readConfig(env = process.env) {
  try {
    const value = JSON.parse(fs.readFileSync(configFile(env), 'utf8'));
    return value && typeof value === 'object' ? value : {};
  } catch {
    return {};
  }
}
function saveConfig(patch, env = process.env) {
  const file = configFile(env);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify({ ...readConfig(env), ...patch }, null, 2)}\n`);
}

/** The media library's catalog, opened for reading (apps/studio/scripts/library/db.ts made it). */
async function catalog(env) {
  const library = readConfig(env).library;
  const set = typeof library === 'string' ? library : typeof library?.root === 'string' ? library.root : '';
  const root = set.replace(/^~(?=[\\/]|$)/, os.homedir());
  const file = root && path.join(root, '.catalog', 'library.db');
  if (!file || !fs.existsSync(file)) throw new Error('This computer has no media library yet (mm media help). A cloud session has none.');
  let sqlite;
  try {
    sqlite = await import('node:sqlite');
  } catch {
    throw new Error('Reading the media library needs Node 22.13 or newer (mm doctor).');
  }
  return { root, db: new sqlite.DatabaseSync(file, { readOnly: true }) };
}

async function localCards(env) {
  const { db } = await catalog(env);
  try {
    const tags = new Map();
    for (const row of db.prepare('SELECT item_id, tag FROM tags').all()) tags.set(row.item_id, [...(tags.get(row.item_id) ?? []), row.tag]);
    return db.prepare('SELECT id, path, kind, subject, title, ext, bytes, width, height, duration, status FROM items').all().map(item => cardOfItem(item, tags.get(item.id))).filter(Boolean);
  } finally {
    db.close();
  }
}

/** The file a media library id (or its start) names on this computer. */
async function localItem(env, id) {
  const { root, db } = await catalog(env);
  try {
    const rows = db.prepare('SELECT id, path FROM items WHERE id LIKE ? LIMIT 2').all(`${id}%`);
    if (!rows.length) throw new Error(`No file in this computer's media library has an id that starts ${id} (mm media find).`);
    if (rows.length > 1) throw new Error(`More than one file's id starts ${id}: give more of it.`);
    return { id: rows[0].id, path: path.isAbsolute(rows[0].path) ? rows[0].path : path.join(root, rows[0].path) };
  } finally {
    db.close();
  }
}

const PART = 500;
async function sendReport(env, cards) {
  const run = crypto.randomBytes(8).toString('hex');
  const device = deviceLabel(env);
  let last = null;
  for (let at = 0; at < cards.length || at === 0; at += PART) last = await api(env, 'POST', '/devices', { device, run, cards: cards.slice(at, at + PART), done: at + PART >= cards.length });
  return { device, files: last?.files ?? cards.length };
}

async function report(env, [word], flags) {
  if (env.MEDIAMAKE_PLACE) throw new Error('A cloud session has no library of its own: mm library devices shows what the computers hold.');
  const on = reportSetting(env);
  if (word === 'off') {
    saveConfig({ libraryReport: 'off' }, env);
    console.log('✔ Off: this computer no longer reports what it holds. What it sent before stays until mm library report forget.');
    return 0;
  }
  if (word === 'forget') {
    const gone = await api(env, 'DELETE', `/devices${query({ label: deviceLabel(env) })}`);
    saveConfig({ libraryReport: 'off' }, env);
    console.log(`✔ Forgotten: ${gone.forgotten} card(s) of this computer were taken out of MediaMake, and reporting is off. Your files are untouched.`);
    return 0;
  }
  if (word !== undefined && word !== 'on') throw new Error('mm library report [on | off | forget] [--yes]');
  const cards = await localCards(env);
  if (word !== 'on' && !(on && flags.yes)) {
    if (flags.json === true) return console.log(JSON.stringify({ on, device: deviceLabel(env), cards: cards.length, sample: cards.slice(0, 3) }, null, 2)), 0;
    console.log(on ? `Reporting is on for this computer (${deviceLabel(env)}).` : `Reporting is off for this computer (${deviceLabel(env)}): nothing is sent.`);
    console.log('A report would send:');
    for (const line of reportLines(cards)) console.log(`  ${line}`);
    console.log("You see the cards, and so do the people of the projects this computer is open to (mm access).");
    console.log(on ? '\nNothing was sent. To send them now: mm library report --yes.' : "\nNothing was sent. Turning it on is the computer's owner's word: mm library report on.");
    return 0;
  }
  saveConfig({ libraryReport: 'on' }, env);
  const sent = await sendReport(env, cards);
  console.log(`✔ ${sent.files} card(s) sent as ${sent.device}. Reporting is on: run mm library report --yes after the media library changes, mm library report off to stop.`);
  return 0;
}

async function devices(env, [words], flags) {
  const space = await spaceFor(env, flags);
  const { devices: list } = await api(env, 'GET', `/devices${query({ space: space.id })}`);
  const named = typeof flags.on === 'string' ? flags.on.toLowerCase() : '';
  const picked = named ? list.filter(d => d.label.toLowerCase() === named || d.name.toLowerCase() === named) : list;
  if (named && !picked.length) throw new Error(`No computer "${flags.on}" here. There ${list.length === 1 ? 'is' : 'are'}: ${list.map(d => d.name).join(', ') || 'none'}.`);
  const searching = words !== undefined || flags.kind !== undefined || flags.where !== undefined || !!named;
  if (!searching) {
    if (flags.json === true) return console.log(JSON.stringify(list, null, 2)), 0;
    if (!list.length) return console.log(`No computer reports what it holds to the ${space.name} space yet. On a computer, its owner turns it on: mm library report on.`), 0;
    for (const d of list) console.log(`${d.name}${d.mine ? ' (yours)' : ` (${d.owner}'s)`} · ${d.files} files · ${sizeOf(d.bytes)} · ${d.linked} also in the cloud · reported ${d.reportedAt.slice(0, 10)}`);
    console.log('\nmm library devices "<words>" searches them.');
    return 0;
  }
  const found = [];
  for (const d of picked) {
    const got = await api(env, 'GET', `/devices${query({ space: space.id, of: d.id, q: words, kind: flags.kind, where: flags.where, limit: flags.limit ?? 20 })}`);
    found.push({ device: d, total: got.total, results: got.results });
  }
  if (flags.json === true) return console.log(JSON.stringify(found, null, 2)), 0;
  for (const { device: d, total, results } of found) {
    console.log(`${d.name}${d.mine ? ' (yours)' : ` (${d.owner}'s)`}: ${total} file(s) fit${total > results.length ? `, the first ${results.length}` : ''}`);
    for (const file of results) console.log(`  ${file.sha256.slice(0, 12)} · ${file.title ?? file.name} · ${file.kind} · ${sizeOf(file.bytes)} · ${file.cloud ? `also in the cloud: ${file.cloud.ref} (${file.cloud.slot})` : 'on this computer only'}`);
  }
  if (found.some(f => f.results.some(file => !file.cloud))) console.log("\nA file that is only on a computer is added from that computer: mm library save <collection> --item <slot>=<id>. From elsewhere, post a to-do for it (mm todo, needs media:library).");
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

async function headshot(env, [collection, source], flags) {
  if (!SLUG.test(String(collection ?? ''))) throw new Error('Which collection? mm library headshot <collection> <picture file or https link>');
  const space = await spaceFor(env, flags);
  if (flags.clear) {
    if (!flags.yes) return console.log(`Take the picture off the ${collection} collection of the ${space.name} space (cloud)?\nNothing was changed. After the person agrees: add --yes.`), 0;
    await api(env, 'POST', '', { action: 'headshot', space: space.id, collection });
    return console.log(`✔ The ${collection} collection has no picture now.`), 0;
  }
  if (typeof source !== 'string') throw new Error('The picture as a file or an https link: mm library headshot <collection> <picture>');
  if (/^https:\/\//.test(source)) {
    if (!flags.yes) return console.log(`Use ${source} as the picture of the ${collection} collection of the ${space.name} space (cloud)?\nNothing was changed. After the person agrees: add --yes.`), 0;
    await api(env, 'POST', '', { action: 'headshot', space: space.id, collection, url: source });
    return console.log(`✔ The ${collection} collection shows that picture.`), 0;
  }
  const file = path.resolve(source);
  const stat = fs.statSync(file, { throwIfNoEntry: false });
  if (!stat?.isFile()) throw new Error(`No file at ${file}`);
  const name = path.basename(file);
  if (!flags.yes) return console.log(`Upload ${name} (${sizeOf(stat.size)}) as the picture of the ${collection} collection of the ${space.name} space (cloud)?\nNothing was changed. After the person agrees: add --yes.`), 0;
  const sha256 = await sha256Of(file);
  const started = await api(env, 'POST', '/files', { action: 'start', space: space.id, files: [{ sha256, size: stat.size, name }] });
  for (const upload of started.uploads) {
    const res = await fetch(upload.uploadUrl, { method: 'PUT', headers: { ...upload.headers, 'Content-Length': String(stat.size) }, body: Readable.toWeb(fs.createReadStream(file)), duplex: 'half', signal: AbortSignal.timeout(30 * 60 * 1000) });
    if (!res.ok) throw new Error(`Storage refused ${name} (${res.status}). Nothing was changed: run it again.`);
  }
  await api(env, 'POST', '/files', { action: 'finish', space: space.id, sha256s: [sha256], device: placeName(env) });
  await api(env, 'POST', '', { action: 'headshot', space: space.id, collection, sha256 });
  console.log(`✔ The ${collection} collection of the ${space.name} space shows ${name}.`);
  return 0;
}

/* ---------- shared collections ---------- */

const collectionOf = raw => {
  const slug = String(raw ?? '').toLowerCase();
  if (!SLUG.test(slug)) throw new Error('Which collection? mm library lists them.');
  return slug;
};
const NOTHING = what => `Nothing was ${what}. After the person agrees: add --yes.`;

/** How a share reads in a list. */
export const shareLine = s =>
  `  ${s.name} (${s.kind === 'project' ? 'a project' : 'a person'}) · ${s.state === 'accepted' ? (s.role === 'editor' ? 'can add and change' : 'reads and fetches') : 'invited, not accepted yet'}${s.internal ? ' · sees Internal only' : ''}${s.fetches ? ` · fetched ${sizeOf(s.fetchedBytes)} in ${s.fetches} ${s.fetches === 1 ? 'fetch' : 'fetches'} by ${s.people} ${s.people === 1 ? 'person' : 'people'}` : ''}`;

async function shares(env, [raw], flags) {
  const collection = collectionOf(raw);
  const space = await spaceFor(env, flags);
  const got = await api(env, 'GET', `/shares${query({ space: space.id, collection })}`);
  if (flags.json) return console.log(JSON.stringify(got, null, 2)), 0;
  if (!got.shares.length) return console.log(`${collection} of the ${space.name} space is shared with nobody.\n  mm library share ${collection} --with=<project> | --to=<email>`), 0;
  console.log(`${collection} of the ${space.name} space is shared with (fetches since ${got.since}):`);
  for (const share of got.shares) console.log(shareLine(share));
  return 0;
}

async function share(env, [raw], flags) {
  const collection = collectionOf(raw);
  const { spaces } = await api(env, 'GET', '');
  const space = pickSpace(spaces, typeof flags.project === 'string' ? flags.project : undefined);
  const withProject = typeof flags.with === 'string' ? pickSpace(spaces, flags.with) : null;
  const email = typeof flags.to === 'string' ? flags.to.trim() : '';
  if (!withProject === !email) throw new Error('Share it with one project you are on (--with=<project>) or one person (--to=<email>).');
  if (withProject?.personal) throw new Error('A personal space takes a share by its owner\'s email: --to=<email>.');
  const role = flags.editor ? 'editor' : 'viewer';
  const who = withProject ? `everyone on the ${withProject.name} project` : email;
  if (!flags.yes) {
    console.log(`Share the ${collection} collection of the ${space.name} space (cloud) with ${who}? They use the collection itself, live: they ${role === 'editor' ? 'read, fetch, add and change' : 'read and fetch'}${flags.internal ? ', entries marked Internal only too' : ''}. Its files stay in the ${space.name} space's storage.`);
    return console.log(NOTHING('shared')), 0;
  }
  const done = await api(env, 'POST', '/shares', { action: 'share', space: space.id, collection, ...(withProject ? { project: withProject.id } : { email }), role, internal: flags.internal === true });
  console.log(done.invited ? `✔ ${done.shared.name} is invited to ${collection}. It shows in their Library once they accept (mm library accept ${collection}).` : `✔ ${done.shared.name} now ${role === 'editor' ? 'can add and change' : 'reads and fetches'} in ${collection}.`);
  return 0;
}

async function unshare(env, [raw], flags) {
  const collection = collectionOf(raw);
  const space = await spaceFor(env, flags);
  const wanted = String(typeof flags.with === 'string' ? flags.with : typeof flags.to === 'string' ? flags.to : '').trim().toLowerCase();
  if (!wanted) throw new Error('Take it back from whom? --with=<project> or --to=<name> (mm library shares lists them).');
  const { shares: list } = await api(env, 'GET', `/shares${query({ space: space.id, collection })}`);
  const hits = list.filter(s => s.to === wanted || s.name.toLowerCase() === wanted);
  if (hits.length !== 1) throw new Error(`${hits.length ? 'Several shares are' : 'No share is'} called "${wanted}". ${collection} is shared with: ${list.map(s => s.name).join(', ') || 'nobody'}.`);
  if (!flags.yes) return console.log(`Stop sharing the ${collection} collection of the ${space.name} space with ${hits[0].name}? It leaves their Library at once. Files already inside their productions stay.\n${NOTHING('changed')}`), 0;
  await api(env, 'POST', '/shares', { action: 'unshare', space: space.id, collection, to: hits[0].to });
  console.log(`✔ ${hits[0].name} no longer has ${collection}.`);
  return 0;
}

async function accept(env, [raw], flags) {
  const collection = collectionOf(raw);
  const space = await spaceFor(env, flags);
  const view = await api(env, 'GET', query({ space: space.id }));
  const from = typeof flags.from === 'string' ? flags.from.trim().toLowerCase() : '';
  const hits = (view.invitations ?? []).filter(i => i.collection === collection && (!from || i.by.toLowerCase() === from || i.from === from));
  if (hits.length !== 1) throw new Error(hits.length ? `Several people share a ${collection} with the ${space.name} space: name one with --from=<who>. ${hits.map(i => i.by).join(', ')}` : `No invitation to a ${collection} collection in the ${space.name} space. Waiting: ${(view.invitations ?? []).map(i => `${i.collection} from ${i.by}`).join(', ') || 'none'}.`);
  const [invitation] = hits;
  if (!flags.yes) return console.log(`Accept ${invitation.name} (${invitation.entries} ${invitation.noun}s), shared by ${invitation.by}, into the ${space.name} space (cloud)? ${invitation.says}\n${NOTHING('accepted')}`), 0;
  const done = await api(env, 'POST', '/shares', { action: 'accept', space: space.id, from: invitation.from, collection });
  console.log(`✔ ${done.name} is in the ${space.name} space as ${done.as}.\n  mm library search --collection=${done.as}${space.personal ? '' : ` --project="${space.name}"`}`);
  return 0;
}

async function leave(env, [raw], flags) {
  const slug = collectionOf(raw);
  const space = await spaceFor(env, flags);
  const view = await api(env, 'GET', query({ space: space.id }));
  const mine = view.collections.find(c => c.slug === slug && c.shared);
  const invited = (view.invitations ?? []).find(i => i.collection === slug);
  const at = mine ? { from: mine.shared.from, collection: mine.shared.collection, by: mine.shared.by } : invited ? { from: invited.from, collection: invited.collection, by: invited.by } : null;
  if (!at) throw new Error(`The ${space.name} space has no shared collection or invitation called ${slug}.`);
  if (!flags.yes) return console.log(`${mine ? 'Leave' : 'Decline'} the ${slug} collection that ${at.by} shares with the ${space.name} space? ${mine ? 'It leaves this Library, with the notes this space kept on it. Files already inside productions stay.' : ''}\n${NOTHING('changed')}`), 0;
  await api(env, 'POST', '/shares', { action: 'leave', space: space.id, from: at.from, collection: at.collection });
  console.log(`✔ ${slug} is no longer in the ${space.name} space.`);
  return 0;
}

async function notes(env, [raw], flags) {
  const ref = refOf(raw);
  const space = await spaceFor(env, flags);
  const list = value => (typeof value === 'string' ? value.split(',').map(item => item.trim()).filter(Boolean) : undefined);
  const change = { ...(flags.rating !== undefined && { rating: Number(flags.rating) }), ...(list(flags.tags) && { tags: list(flags.tags) }), ...(list(flags['used-in']) && { usedIn: list(flags['used-in']) }) };
  const { notes: now } = await api(env, 'GET', `/shares${query({ space: space.id, notes: ref })}`);
  const line = n => `rating ${n.rating ?? 'none'} · tags: ${n.tags.join(', ') || 'none'} · used in: ${n.usedIn.join(', ') || 'none'}`;
  if (!Object.keys(change).length) return console.log(flags.json ? JSON.stringify(now, null, 2) : `The ${space.name} space's notes on ${ref}: ${line(now)}`), 0;
  const next = { ...now, ...change };
  if (!flags.yes) return console.log(`Save the ${space.name} space's notes on ${ref} (${line(next)})? They stay in this space and never touch the entry.\n${NOTHING('saved')}`), 0;
  const saved = await api(env, 'POST', '/shares', { action: 'notes', space: space.id, ref, ...next });
  console.log(`✔ Notes on ${ref}: ${line(saved.notes)}`);
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
    case 'reindex':
      return reindex(env, rest, flags);
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
    case 'headshot':
      return headshot(env, rest, flags);
    case 'usage':
      return usage(env, flags);
    case 'use':
      return use(env, rest, flags);
    case 'made-from':
      return madeFromFile(env, rest, flags);
    case 'report':
      return report(env, rest, flags);
    case 'devices':
      return devices(env, rest, flags);
    case 'shares':
      return shares(env, rest, flags);
    case 'share':
      return share(env, rest, flags);
    case 'unshare':
      return unshare(env, rest, flags);
    case 'accept':
      return accept(env, rest, flags);
    case 'leave':
      return leave(env, rest, flags);
    case 'notes':
      return notes(env, rest, flags);
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
