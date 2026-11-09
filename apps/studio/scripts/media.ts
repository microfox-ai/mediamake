/**
 * media: the shared media library. Everything productions use (downloaded, generated or the
 * user's own) is kept once, sorted by kind and subject, searchable, and reused; approved outputs
 * are delivered to the channel folders in Downloads. The skills drive it (scripts/library/README.md);
 * the user can run it too. Anything that moves or replaces files is a dry run until --yes, except
 * filing the inbox.
 *
 * Usage: mm media <command> …
 *   init [--root= --inbox= --deliver-root=]       folders, ~/.mediamake/config.json, the catalog
 *   init --watch | --unwatch                      a launchd agent that files the inbox by itself (ask the user first)
 *   ingest [<file|folder>…] [--kind= --subject= --channel= --tags=a,b] [--dry-run] [--now]
 *       file the inbox (no paths), or the given files (cloned into the library, left where they are)
 *   find <words> [--kind= --subject= --channel= --min-height= --audio|--no-audio --unused --role= --all --limit= --json --sheet[=<jpg>]]
 *       words match titles, names, tags, searches, prompts (a Suno take's styles), lyrics and notes
 *   show <id|path> [--json] [--sheet[=<jpg>]]
 *   use <id|path> <slug> [--as=input/footage/x.mp4] [--with=segregation,faces] [--skill=] [--force]
 *   cache get <id|path> <kind> [--params=] [--into=<folder>]      exits 3 when nothing is cached
 *   cache put <id|path> <kind> <file|folder> [--params= --tool= --target=footage/{name}]
 *   rate <id|path> good|bad|clear [--note= --production=]
 *   tag <id|path> +<tag> -<tag> …
 *   mv <id|path> [--kind= --subject=] [--to=<folder in the library>]
 *   where <old path or name>
 *   scan [--roots=library,downloads,projects,out,brands,overlays] [--rebuild]
 *   dedupe [--list] [--min=<MB>] [--yes]
 *   production new|set <slug> [--channel= --title= --artist= --song= --skill= --deliver-folder= --status=]
 *   production touch <slug> --skill=<name>      the skill's latest run belongs to this production
 *   production list
 *   deliver <slug> --what=video,shorts,youtube,poster,master,release [--from=] [--channel=] [--yes]
 *   deliver <slug> --uploaded                   the user published it
 *   sweep --plan [--limit=N] | --review=<id> | --apply=<id> [--yes] | --undo=<id> [--yes]
 *       sort what lies around in Downloads into the library, after the user's review (cleanup-downloads skill)
 *   backup add <file|folder>… --channel=<id|folder> [--as=renders] [--yes]   stage clones in Downloads/_BACKUP/<CHANNEL>/<as>/
 *   backup drives                                                            external disks, and which hold a backup
 *   backup copy --to=<disk> [--yes]                                          copy what's staged to the disk, each file checked
 *   backup list [words] [--channel= --disk=]                                 what's backed up, and where (no disk needed)
 *   restore <words>… [--from=<disk>] [--to=<folder>] [--channel=] [--yes]   copy files back, checked (restore-backup skill)
 *   status | export | apply-requests
 *
 * A channel's team (its MediaMake cloud project) shares brand kit, skill variants, productions and media:
 *   cloud login [--url=<MediaMake site>] | logout | status   the API key goes in the macOS Keychain
 *       (or set MEDIAMAKE_API_URL and MEDIAMAKE_API_KEY); it is never written to the config or shown
 *   channel list                                  channels, their folders and linked cloud projects
 *   channel link <channel> <projectId> | channel unlink <channel>
 *   channel limit <channel|projectId> <MB> [--yes]  how much the team may share in files (the owner)
 *   sync status|push|pull [--channel= | --project=<id>] [--what=brand,skills,productions,media,music] [--yes]
 *       a dry run until --yes; a pull never overwrites: what differs lands as <file>.theirs
 *   sync pull --ids=<id>,… [--yes]                a teammate's files (remote items in find), filed here
 *   share <id|path>… [--channel= | --project=<id>] [--yes]   let the channel's or project's team have these files (under its limit)
 *   unshare <id|path>… [--channel= | --project=<id>] [--yes] stop sharing them (their details stay)
 *   Any project can hold shared assets (overlays and other files every team uses), not just a channel's:
 *   --project=<id> names it (media channel list shows your projects); teammates get them with
 *   media sync pull --project=<id> --what=media, then --ids=, or ProjectSync's download_shared_assets.
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { connect, deleteKeychainKey, keySource, readSecret, saveKeychainKey } from './library/cloud.ts';
import { channelNamed, cloudUrl, configFile, hasConfig, linkChannel, loadConfig, saveCloudUrl, saveConfig } from './library/config.ts';
import { getItem, KINDS, type Item, type Kind } from './library/db.ts';
import { WHATS, deliver, markUploaded, type What } from './library/deliver.ts';
import { dedupe, printDedupe } from './library/dedupe.ts';
import { applyRequests, moveItem, rate, tag } from './library/edit.ts';
import { exportLibrary } from './library/export.ts';
import { describe, find, printItem, printItems, sheetOf } from './library/find.ts';
import { ingest } from './library/ingest.ts';
import { absOf, openLibrary, resolveItem, userPath, type Lib } from './library/lib.ts';
import { listProductions, saveProduction, touchProduction, type Production } from './library/production.ts';
import { ROOTS, duplicates, rebuild, scan, type Root } from './library/scan.ts';
import { applySweep, planSweep, reviewSweep, undoSweep } from './library/sweep.ts';
import { copyToDisk, drives, listBackup, restore, stage } from './library/backup.ts';
import { approveShare, isProjectId, keyNamed, pickTarget, projectOf, withdrawShare } from './library/share.ts';
import { PARTS, pullFiles, pushShared, syncChannel, withdrawFiles, type ChannelReport, type Part, type Step } from './library/sync.ts';
import { lock, pad, size } from './library/sys.ts';
import { cacheGet, cacheInto, cachePut, use } from './library/use.ts';

const args = process.argv.slice(2);
const flags = args.filter(a => a.startsWith('--'));
const words = args.filter(a => !a.startsWith('--'));
const [cmd, ...rest] = words;
const flag = (k: string) => flags.find(f => f.startsWith(`--${k}=`))?.slice(k.length + 3);
const has = (k: string) => flags.includes(`--${k}`) || flags.some(f => f.startsWith(`--${k}=`));
const list = (k: string) => flag(k)?.split(',').map(s => s.trim()).filter(Boolean);
const cwdPath = userPath;
const json = (v: unknown) => console.log(JSON.stringify(v, null, 2));

const usage = () => {
  const text = fs.readFileSync(new URL(import.meta.url), 'utf8').match(/Usage:[\s\S]*?\*\//)?.[0] ?? '';
  console.log(text.replace(/^ \* ?/gm, '').replace(/\*\/$/, '').trim());
};

const HEAVY = new Set(['scan', 'dedupe', 'ingest']);
// hashing hundreds of GB at full speed heats the Mac: heavy commands run at background priority
if (HEAVY.has(cmd) && process.platform === 'darwin' && !process.env.MEDIA_BACKGROUND) {
  const r = spawnSync('taskpolicy', ['-b', process.execPath, ...process.execArgv, ...process.argv.slice(1)], { stdio: 'inherit', env: { ...process.env, MEDIA_BACKGROUND: '1' } });
  process.exit(r.status ?? 1);
}

const TOOLS = ['youtube', 'instagram', 'pinterest', 'midjourney', 'fal', 'elevenlabs', 'suno', 'mediamake-sync', 'other'];

const README_LIBRARY = `This is the media library: everything productions use (downloads, generated art, songs, sound
effects, fonts), sorted by kind and then by subject: footage/one-piece/zoro/, music/<artist>/<song>/…
Each folder's .media.json says what its files are and where they came from; the catalog is in .catalog/.

Browse it freely. To move or rename something, ask Claude (or run \`media mv\`), so the catalog stays right.
New downloads arrive in ../_INBOX and are filed here. _unsorted/ holds what still needs a tag.
Approved outputs go to the channel folders next to it (AMZ/<song>/, INVERTED-DEVILS/<song>/…).
`;
const README_INBOX = `Everything tools download lands here first (youtube/, pinterest/, midjourney/…) and is then filed into
../_LIBRARY by the media library. Files you put here are filed too.
_duplicates/ holds downloads the library already had: nothing is filed twice.
`;

const AGENT = 'com.themoondevs.media-ingest';
const agentFile = path.join(os.homedir(), 'Library', 'LaunchAgents', `${AGENT}.plist`);

/**
 * A launchd agent that files the inbox by itself: it runs `ingest` (and the Library page's
 * requests) whenever a tool folder in the inbox changes, and every 5 minutes as a fallback, at
 * background priority (launchd's ProcessType Background). `media init --unwatch` removes it.
 */
const watch = (cfg: ReturnType<typeof loadConfig>, on: boolean) => {
  const uid = os.userInfo().uid;
  spawnSync('launchctl', ['bootout', `gui/${uid}`, agentFile], { stdio: 'ignore' });
  if (!on) {
    fs.rmSync(agentFile, { force: true });
    return console.log('Inbox watcher removed.');
  }
  const script = fileURLToPath(import.meta.url);
  const run = (c: string) => `"${process.execPath}" --experimental-strip-types --no-warnings=ExperimentalWarning "${script}" ${c}`;
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
  const paths = [...TOOLS.map(t => path.join(cfg.inbox, t)), path.join(cfg.root, '.catalog', 'requests')];
  for (const p of paths) fs.mkdirSync(p, { recursive: true });
  // launchd opens the log itself, before the job runs, and macOS keeps background jobs out of Downloads
  const log = path.join(os.homedir(), '.mediamake', 'logs', 'media-ingest.log');
  fs.mkdirSync(path.dirname(log), { recursive: true });
  const plist = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
  <key>Label</key><string>${AGENT}</string>
  <key>ProgramArguments</key><array><string>/bin/sh</string><string>-c</string>
    <string>${esc(`${run('ingest --quiet')}; ${run('apply-requests')}`)}</string></array>
  <key>ProcessType</key><string>Background</string>
  <key>LowPriorityIO</key><true/>
  <key>EnvironmentVariables</key><dict><key>MEDIA_BACKGROUND</key><string>1</string><key>PATH</key><string>/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin</string></dict>
  <key>WatchPaths</key><array>${paths.map(p => `<string>${esc(p)}</string>`).join('')}</array>
  <key>StartInterval</key><integer>300</integer>
  <key>ThrottleInterval</key><integer>30</integer>
  <key>StandardOutPath</key><string>${esc(log)}</string>
  <key>StandardErrorPath</key><string>${esc(log)}</string>
</dict></plist>
`;
  fs.mkdirSync(path.dirname(agentFile), { recursive: true });
  fs.writeFileSync(agentFile, plist);
  const r = spawnSync('launchctl', ['bootstrap', `gui/${uid}`, agentFile], { encoding: 'utf8' });
  console.log(r.status === 0 ? `Inbox watcher on (${agentFile}); log: ${log}` : `launchctl refused it: ${r.stderr.trim()}`);
};

const init = () => {
  const cfg = hasConfig() && !flag('root') && !flag('inbox') && !flag('deliver-root') ? loadConfig() : saveConfig({ ...(flag('root') && { root: flag('root') }), ...(flag('inbox') && { inbox: flag('inbox') }), ...(flag('deliver-root') && { deliverRoot: flag('deliver-root') }) });
  if (has('watch') || has('unwatch')) return watch(cfg, has('watch'));
  for (const k of [...KINDS, '_unsorted']) fs.mkdirSync(path.join(cfg.root, k), { recursive: true });
  for (const t of [...TOOLS, '_duplicates']) fs.mkdirSync(path.join(cfg.inbox, t), { recursive: true });
  const write = (file: string, text: string) => fs.existsSync(file) || fs.writeFileSync(file, text);
  write(path.join(cfg.root, 'README.txt'), README_LIBRARY);
  write(path.join(cfg.inbox, 'README.txt'), README_INBOX);
  const lib = openLibrary({ cfg });
  exportLibrary(lib);
  console.log(`Library ${cfg.root}\nInbox   ${cfg.inbox}\nOutputs ${cfg.deliverRoot}/<channel folder>/<slug>/\nConfig  ${configFile()}`);
  const channels = Object.entries(cfg.channels);
  console.log(channels.length ? `Channels: ${channels.map(([id, f]) => `${id} → ${f}`).join(', ')}` : 'No channels yet: add them to the config ("channels": { "<brand id>": "<folder in Downloads>" }).');
};

const status = (lib: Lib) => {
  const count = (sql: string, ...a: unknown[]) => Number(lib.db.prepare(sql).get(...a)?.n ?? 0);
  const byKind = lib.db.prepare("SELECT kind, COUNT(*) AS n, SUM(bytes) AS b FROM items WHERE role = 'library' GROUP BY kind").all() as { kind: string; n: number; b: number }[];
  const total = byKind.reduce((a, r) => ({ n: a.n + r.n, b: a.b + r.b }), { n: 0, b: 0 });
  console.log(`Library ${lib.root}: ${total.n} items, ${size(total.b)}`);
  if (byKind.length) console.log(`  ${byKind.map(r => `${r.kind} ${r.n}`).join(' · ')}`);
  const elsewhere = lib.db.prepare("SELECT role, COUNT(*) AS n, SUM(bytes) AS b FROM items WHERE role != 'library' GROUP BY role").all() as { role: string; n: number; b: number }[];
  if (elsewhere.length) console.log(`Indexed where they are (not moved): ${elsewhere.map(r => `${r.role} ${r.n} (${size(r.b)})`).join(' · ')}`);
  const inbox = fs.existsSync(lib.cfg.inbox) ? TOOLS.flatMap(t => (fs.existsSync(path.join(lib.cfg.inbox, t)) ? fs.readdirSync(path.join(lib.cfg.inbox, t)).filter(f => !f.startsWith('.')) : [])).length : 0;
  console.log(`Inbox: ${inbox} waiting`);
  const d = duplicates(lib);
  if (d.groups) console.log(`Duplicates: ${d.groups} groups, up to ${size(d.extra)} in extra copies (media dedupe shows what really comes back)`);
  console.log(`Unsorted: ${count("SELECT COUNT(*) AS n FROM items WHERE kind = '_unsorted'")} · rated bad: ${count("SELECT COUNT(*) AS n FROM items WHERE rating = 'bad'")} · missing: ${count("SELECT COUNT(*) AS n FROM items WHERE status = 'missing'")}`);
  const prods = listProductions(lib);
  console.log(`Productions: ${prods.length} (${prods.filter(p => p.registered).length} registered) · deliveries: ${count('SELECT COUNT(*) AS n FROM deliveries')}`);
};

/** The site and its key: sign in once, the Keychain keeps the key. */
const cloudCommand = async () => {
  const [op] = rest;
  const url = (flag('url') ?? cloudUrl())?.replace(/\/+$/, '');
  if (!url) throw new Error('Which MediaMake site? media cloud login --url=https://<your MediaMake site>');
  if (op === 'login') {
    const key = await readSecret(`API key for ${url} (from ${url}/core/api-keys; it isn't shown): `);
    if (!key) throw new Error('No key given');
    const projects = await connect({ url, key }).get<unknown[]>('/api/project');
    saveKeychainKey(url, key);
    if (flag('url')) saveCloudUrl(url);
    return console.log(`✔ Signed in to ${url} (${Array.isArray(projects) ? projects.length : 0} projects you can open). The key is in the Keychain as "MediaMake API key".`);
  }
  if (op === 'logout') return console.log(deleteKeychainKey(url) ? `Signed out of ${url}: the key is gone from the Keychain.` : `No key for ${url} in the Keychain.`);
  if (op === 'status') {
    const from = keySource(url);
    console.log(`${url}  key: ${from ?? 'none (media cloud login)'}`);
    if (!from) return;
    const projects = await connect({ url }).get<unknown[]>('/api/project');
    return console.log(`✔ ${Array.isArray(projects) ? projects.length : 0} projects you can open`);
  }
  throw new Error('media cloud login [--url=] | logout | status');
};

const SYMBOL: Record<Step['action'], string> = { push: '↑', pull: '↓', same: '=', conflict: '⚠', skip: '–', pending: '…', done: '✔', failed: '✖' };

/** What a sync would do or did, for one channel: a line per part, then the steps worth naming. */
const printReport = (r: ChannelReport) => {
  const p = r.status.project;
  const c = r.status.counts;
  console.log(`${r.channel} → ${p.name} (${p.role}) · files ${r.status.usedBytes ? size(r.status.usedBytes) : '0 MB'} of ${size(r.status.limitBytes)}`);
  console.log(`  on the cloud: ${c.production} productions, ${c.skill} skill variants, ${c.media} media items (${c.files} with files)`);
  for (const part of PARTS) {
    const steps = r.steps.filter(st => st.part === part);
    if (!steps.length) continue;
    const counts = (Object.keys(SYMBOL) as Step['action'][])
      .map(a => {
        const of = steps.filter(st => st.action === a);
        const bytes = of.reduce((t, st) => t + (st.bytes ?? 0), 0);
        return of.length ? `${SYMBOL[a]} ${of.length}${bytes ? ` (${size(bytes)})` : ''}` : '';
      })
      .filter(Boolean);
    console.log(`  ${pad(part, 12)} ${counts.join(' · ')}`);
    for (const st of steps.filter(st => (!st.bulk || st.action === 'failed' || st.action === 'conflict') && st.action !== 'same'))
      console.log(`    ${SYMBOL[st.action]} ${st.dir === 'pull' ? '↓' : '↑'} ${st.key}${st.bytes ? `  ${size(st.bytes)}` : ''}${st.detail ? `  (${st.detail})` : ''}`);
  }
  for (const note of r.notes) console.log(`  · ${note}`);
};

const main = async () => {
  if (!cmd || cmd === 'help' || has('help')) return usage();
  if (cmd === 'init') return init();
  if (cmd === 'cloud') return cloudCommand();
  if (!hasConfig()) throw new Error(`No library yet: run mm media init (config ${configFile()})`);
  const lib = openLibrary();
  const changed = () => exportLibrary(lib);

  switch (cmd) {
    case 'ingest': {
      const release = lock(lib.catalog, 'heavy');
      const targets = rest.length ? rest.map(cwdPath) : [lib.cfg.inbox];
      const hint = { kind: flag('kind') as Kind | undefined, subject: flag('subject'), channel: flag('channel'), tags: list('tags') };
      const done = await ingest(lib, targets, { hint, dryRun: has('dry-run'), now: has('now') || rest.length > 0 });
      for (const d of done) {
        if (d.action === 'skipped' && (has('quiet') || d.reason === 'still arriving')) continue;
        const what = d.action === 'filed' ? `${has('dry-run') ? 'would file' : 'filed'} → ${d.dest}` : d.action === 'duplicate' ? `already have it: ${d.dest}` : d.action === 'known' ? `known: ${d.dest}` : `skipped (${d.reason})`;
        if (!has('quiet') || d.action !== 'known') console.log(`${path.basename(d.file)}  ${what}${d.c?.kind === '_unsorted' ? '  [unsorted: needs a tag]' : ''}`);
      }
      release();
      if (!has('dry-run')) changed();
      return;
    }
    case 'find': {
      const channel = flag('channel') && channelNamed(lib.cfg, flag('channel'));
      if (flag('channel') && !channel) throw new Error(`Unknown channel "${flag('channel')}". Known: ${Object.keys(lib.cfg.channels).join(', ')}`);
      const items = find(lib, rest.join(' '), {
        kind: flag('kind'),
        subject: flag('subject'),
        channel: channel || undefined,
        minHeight: flag('min-height') ? Number(flag('min-height')) : undefined,
        hasAudio: has('audio') ? true : has('no-audio') ? false : undefined,
        unused: has('unused'),
        role: flag('role'),
        all: has('all'),
        limit: flag('limit') ? Number(flag('limit')) : undefined,
      });
      if (has('json')) return json(items.map(it => describe(lib, it)));
      printItems(lib, items);
      if (has('sheet')) {
        const out = cwdPath(flag('sheet') ?? path.join(lib.catalog, 'sheets', `find-${Date.now()}.jpg`));
        if (sheetOf(lib, items, out)) console.log(`\nsheet: ${out}`);
      }
      return;
    }
    case 'show': {
      const it = resolveItem(lib, rest[0] ?? '');
      if (has('json')) return json(describe(lib, it));
      printItem(lib, it.id);
      if (has('sheet')) {
        const out = cwdPath(flag('sheet') ?? path.join(lib.catalog, 'sheets', `${it.id.slice(0, 12)}.jpg`));
        if (sheetOf(lib, [it], out)) console.log(`sheet: ${out}`);
      }
      return;
    }
    case 'use': {
      const [ref, slug] = rest;
      if (!ref || !slug) throw new Error('media use <id|path> <slug> [--as=…] [--with=…]');
      const r = await use(lib, resolveItem(lib, ref), slug, { as: flag('as'), with: list('with'), skill: flag('skill'), force: has('force') });
      console.log(`${slug}/${r.rel}  (clone)`);
      for (const c of r.cached) console.log(`  cached analysis → ${slug}/${c}`);
      for (const m of r.missing) console.log(`  no cached ${m} yet: make it, then media cache put …`);
      return changed();
    }
    case 'cache': {
      const [op, ref, kind, src] = rest;
      const it = resolveItem(lib, ref ?? '');
      if (!kind) throw new Error('media cache get|put <id|path> <kind> …');
      if (op === 'get') {
        const row = cacheGet(lib, it, kind, flag('params'));
        if (!row) {
          console.log(`no ${kind} cached for ${it.id.slice(0, 12)}`);
          process.exit(3);
        }
        console.log(flag('into') ? cacheInto(lib, row, cwdPath(flag('into')!)) : absOf(lib, row.path));
        return;
      }
      if (op === 'put') {
        if (!src) throw new Error('media cache put <id|path> <kind> <file|folder>');
        console.log(cachePut(lib, it, kind, cwdPath(src), { params: flag('params'), tool: flag('tool'), target: flag('target') }));
        return changed();
      }
      throw new Error('media cache get|put …');
    }
    case 'rate': {
      const [ref, verdict] = rest;
      if (!['good', 'bad', 'clear'].includes(verdict)) throw new Error('media rate <id|path> good|bad|clear [--note=…]');
      rate(lib, resolveItem(lib, ref), verdict === 'clear' ? null : (verdict as 'good' | 'bad'), flag('note'), flag('production'));
      return changed();
    }
    case 'tag': {
      const [ref, ...ops] = rest;
      tag(lib, resolveItem(lib, ref ?? ''), ops.filter(o => !o.startsWith('-')).map(o => o.replace(/^\+/, '')), ops.filter(o => o.startsWith('-')).map(o => o.slice(1)));
      return changed();
    }
    case 'mv': {
      const it = await moveItem(lib, resolveItem(lib, rest[0] ?? ''), { kind: flag('kind') as Kind | undefined, subject: flag('subject'), folder: flag('to') });
      console.log(absOf(lib, it.path));
      return changed();
    }
    case 'where': {
      const q = rest.join(' ');
      const rows = lib.db
        .prepare('SELECT DISTINCT item_id FROM locations WHERE path = ? OR path LIKE ? LIMIT 20')
        .all(cwdPath(q), `%${path.basename(q)}`) as { item_id: string }[];
      if (!rows.length) return console.log('Not in the catalog. Try media find <words>.');
      for (const r of rows) {
        const it = getItem(lib.db, r.item_id)!;
        console.log(`${absOf(lib, it.path)}${it.status !== 'online' ? `  (${it.status})` : ''}`);
      }
      return;
    }
    case 'scan': {
      const release = lock(lib.catalog, 'heavy');
      const roots = (list('roots') as Root[] | undefined) ?? [...ROOTS];
      const reports = has('rebuild') ? await rebuild(lib) : await scan(lib, roots);
      for (const r of reports) console.log(`${r.root}: ${r.files} files (${size(r.bytes)}), ${r.added} new, ${size(r.hashed)} read${r.missing ? `, ${r.missing} gone` : ''}`);
      const d = duplicates(lib);
      console.log(`Duplicates: ${d.groups} groups, up to ${size(d.extra)} in extra copies${d.groups ? ' (media dedupe shows what really comes back)' : ''}`);
      release();
      return changed();
    }
    case 'dedupe': {
      const release = lock(lib.catalog, 'heavy');
      const r = dedupe(lib, { yes: has('yes'), minBytes: flag('min') ? Number(flag('min')) * 1e6 : undefined });
      printDedupe(lib, r, has('list'));
      if (!has('yes')) console.log(`\n${size(r.bytes)} can come back as clones (nothing is deleted). Dry run: add --yes.`);
      else console.log(`\n✔ ${size(r.done)} now shared as clones${r.failed.length ? `; ${r.failed.length} left as they were:\n  ${r.failed.join('\n  ')}` : ''}`);
      release();
      if (has('yes')) changed();
      return;
    }
    case 'production': {
      const [op, slug] = rest;
      if (op === 'list') {
        for (const p of listProductions(lib)) console.log(`${p.slug.padEnd(32)} ${(p.channel ?? '?').padEnd(16)} ${(p.status ?? 'active').padEnd(10)} ${p.registered ? '' : '(not registered)'}`);
        return;
      }
      if (!slug) throw new Error('media production new|set|touch <slug> …');
      if (op === 'touch') touchProduction(lib, slug, flag('skill'));
      else if (op === 'new' || op === 'set') {
        const patch: Partial<Production> = {
          ...(flag('channel') && { channel: flag('channel') }),
          ...(flag('title') && { title: flag('title') }),
          ...(flag('artist') && { artist: flag('artist') }),
          ...(flag('song') && { song: flag('song') }),
          ...(flag('skill') && { skills: [flag('skill')!] }),
          ...(flag('deliver-folder') && { deliverFolder: flag('deliver-folder') }),
          ...(flag('status') && { status: flag('status') as Production['status'] }),
        };
        const p = saveProduction(lib, slug, patch);
        if (flag('skill')) touchProduction(lib, slug, flag('skill'));
        console.log(`${slug}: ${p.channel ?? 'no channel yet'} · ${p.status} · skills ${p.skills?.join(', ') || '-'}`);
      } else throw new Error(`Unknown: production ${op}`);
      return changed();
    }
    case 'deliver': {
      const slug = rest[0];
      if (!slug) throw new Error('media deliver <slug> --what=video,… [--yes]');
      if (has('uploaded')) {
        markUploaded(lib, slug);
        console.log(`${slug}: uploaded`);
        return changed();
      }
      const whats = (list('what') ?? []) as What[];
      const bad = whats.filter(w => !WHATS.includes(w));
      if (!whats.length || bad.length) throw new Error(`--what= one or more of ${WHATS.join(', ')}`);
      const r = await deliver(lib, slug, whats, { from: flag('from') && cwdPath(flag('from')!), channel: flag('channel'), yes: has('yes') });
      for (const s of r.steps) console.log(`${s.action === 'same' ? 'same   ' : s.action === 'replace' ? 'replace' : 'new    '}  ${path.relative(r.root, s.target)}  ← ${s.from}`);
      if (!r.done) return console.log(`\n→ ${r.root}\nDry run: add --yes once the user has approved it.`);
      const first = r.steps.find(s => s.what === 'video')?.target ?? r.steps[0]?.target;
      console.log(`\n✔ delivered to ${r.root}${first ? `\nopen -R "${first}"` : ''}`);
      return changed();
    }
    case 'sweep': {
      if (has('plan')) {
        const r = planSweep(lib, { limit: flag('limit') ? Number(flag('limit')) : undefined });
        const groups = new Map<string, number>();
        for (const m of r.plan.moves) groups.set(m.group, (groups.get(m.group) ?? 0) + 1);
        for (const [g, count] of [...groups].sort((a, b) => b[1] - a[1])) console.log(`${String(count).padStart(5)}  → ${g}`);
        console.log(`\nSweep ${r.plan.id}: ${r.plan.moves.length} loose files. Review: ${r.review} (/file-revision; Drop = leave it where it is)`);
        if (r.inFolders) console.log(`${r.inFolders} files inside folders are left as they are (folders keep their sets and boards).`);
        if (r.unknown) console.log(`${r.unknown} loose files it can't tell (no subject, no known tool) stay where they are (listed in .catalog/sweeps/${r.plan.id}/unknown.json).`);
        return console.log(`Then: media sweep --apply=${r.plan.id} (dry run) and --yes. Nothing has moved.`);
      }
      if (flag('review')) {
        const r = reviewSweep(lib, flag('review')!);
        return console.log(`Review: ${r.review} (/file-revision?job=sweep-${r.plan.id}): ${r.plan.moves.length} files, ${r.playable} videos and songs play in the zoom view.`);
      }
      const id = flag('apply') ?? flag('undo');
      if (!id) throw new Error('media sweep --plan | --review=<id> | --apply=<id> [--yes] | --undo=<id> [--yes]');
      const release = lock(lib.catalog, 'heavy');
      if (flag('apply')) {
        const r = await applySweep(lib, id, { yes: has('yes') });
        for (const c of r.comments) console.log(`comment on ${c.images.join(', ')}: ${c.text}`);
        console.log(has('yes') ? `✔ moved ${r.done} (${r.dropped} left where they are)` : `${r.todo.length} to move, ${r.dropped} dropped. Dry run: add --yes.`);
        if (r.left.length) console.log(`${r.left.length} in use or changed since the scan, not moved (media scan, then plan again):\n  ${r.left.slice(0, 20).join('\n  ')}`);
      } else {
        const r = await undoSweep(lib, id, { yes: has('yes') });
        console.log(has('yes') ? `✔ moved ${r.done} back` : `${r.back.length} would move back. Dry run: add --yes.`);
      }
      release();
      return has('yes') ? changed() : undefined;
    }
    case 'backup': {
      const [op, ...paths] = rest;
      if (op === 'drives') {
        const list = drives();
        if (!list.length) return console.log('No external disk is connected (nothing under /Volumes). Connect one and run this again.');
        for (const d of list) console.log(`${d.name.padEnd(20)} ${size(d.free).padStart(9)} free of ${size(d.total).padStart(9)}  ${d.writable ? 'writable' : 'READ-ONLY'}${d.backup ? '  has a MediaMake Backup' : ''}  (${d.mount})`);
        return;
      }
      if (op === 'add') {
        if (!paths.length || !flag('channel')) throw new Error('media backup add <file|folder>… --channel=<id|folder> [--as=renders] [--yes]');
        const r = await stage(lib, paths.map(userPath), { channel: flag('channel')!, as: flag('as') ?? 'files', yes: has('yes') });
        const fresh = r.plan.filter(p => !p.again);
        console.log(`${fresh.length} to stage in ${path.join(r.root, r.channel)} (${size(fresh.reduce((n, p) => n + p.bytes, 0))}, clones: no extra space)${r.plan.length - fresh.length ? `; ${r.plan.length - fresh.length} already staged` : ''}`);
        return console.log(has('yes') ? `✔ staged ${r.done}` : 'Dry run: add --yes.');
      }
      if (op === 'copy') {
        if (!flag('to')) throw new Error('media backup copy --to=<disk> [--yes] (media backup drives lists them)');
        const r = await copyToDisk(lib, flag('to')!, { yes: has('yes'), log: s => console.log(s) });
        console.log(`${r.todo.length} files (${size(r.bytes)}) → ${r.target}`);
        if (!has('yes')) return console.log('Dry run: add --yes.');
        console.log(`✔ copied and checked ${r.done}${r.bad.length ? `; ${r.bad.length} didn't check out and were removed from the disk:\n  ${r.bad.join('\n  ')}` : ''}`);
        return;
      }
      if (op === 'list') {
        const files = listBackup(lib, paths, { channel: flag('channel'), disk: flag('disk') });
        for (const f of files) console.log(`${f.rel.padEnd(70)} ${size(f.bytes).padStart(9)}  ${[f.here ? 'staged here' : '', ...f.disks.map(d => `on ${d}`)].filter(Boolean).join(', ') || 'nowhere now'}`);
        return console.log(`${files.length} files, ${size(files.reduce((n, f) => n + f.bytes, 0))}`);
      }
      throw new Error('media backup add|drives|copy|list …');
    }
    case 'restore': {
      if (!rest.length) throw new Error('media restore <words>… [--from=<disk>] [--to=<folder>] [--channel=] [--yes]');
      const r = await restore(lib, rest, { from: flag('from'), to: flag('to'), channel: flag('channel'), yes: has('yes') });
      for (const p of r.picks) console.log(`${p.available ? (has('yes') ? '✔' : '→') : '✖'} ${p.entry.rel}  →  ${p.dest}${p.available ? '' : `  (not in ${r.source}${p.entry.disks.length ? `; it's on ${p.entry.disks.join(', ')}: --from=<that disk>` : ''})`}`);
      if (!r.picks.length) return console.log('Nothing in the backup matches (media backup list shows what is there).');
      console.log(has('yes') ? `✔ restored and checked ${r.done}${r.bad.length ? `; ${r.bad.length} didn't match their hash and were removed:\n  ${r.bad.join('\n  ')}` : ''}` : 'Dry run: add --yes.');
      return;
    }
    case 'channel': {
      const [op, name, value] = rest;
      if (op === 'list') {
        let projects: Map<string, { displayName: string; isOwned?: boolean; sharedRole?: string }> | null = null;
        let why = '';
        try {
          const list = await connect().get<{ id: string; displayName: string; isOwned?: boolean; sharedRole?: string }[]>('/api/project');
          projects = new Map(list.map(p => [p.id, p]));
        } catch (err) {
          why = err instanceof Error ? err.message : String(err);
        }
        const roleOf = (p: { isOwned?: boolean; sharedRole?: string }) => (p.isOwned ? 'owner' : (p.sharedRole ?? 'viewer'));
        for (const [id, folder] of Object.entries(lib.cfg.channels)) {
          const pid = lib.cfg.links[id];
          const p = pid ? projects?.get(pid) : undefined;
          console.log(`${pad(id, 18)} ${pad(folder, 18)} ${pid ? `${p ? `${p.displayName} (${roleOf(p)})` : projects ? '(no such project you can open)' : ''}  ${pid}` : '-'}`);
        }
        if (why) return console.log(`\nProject names need MediaMake: ${why}`);
        const linked = new Set(Object.values(lib.cfg.links));
        const free = [...(projects?.values() ?? [])].filter(p => !linked.has((p as { id?: string }).id ?? ''));
        if (free.length) console.log(`\nYour cloud projects not linked to a channel:\n${free.map(p => `  ${pad(p.displayName, 30)} ${(p as { id?: string }).id} (${roleOf(p)})`).join('\n')}`);
        return console.log('\nLink one: media channel link <channel> <projectId>');
      }
      const ch = channelNamed(lib.cfg, name) ?? (op === 'limit' && isProjectId(name) ? name.toLowerCase() : undefined);
      if (!ch) throw new Error(`media channel link <channel> <projectId> | unlink <channel> | limit <channel|projectId> <MB>; channels: ${Object.keys(lib.cfg.channels).join(', ')}`);
      if (op === 'unlink') {
        linkChannel(ch, null);
        return console.log(`${ch} is no longer linked (nothing on the cloud changed).`);
      }
      if (op === 'link') {
        if (!value) throw new Error(`media channel link ${ch} <projectId> (media channel list shows your projects)`);
        const p = await connect().get<{ id: string; displayName: string; isOwned?: boolean; sharedRole?: string }>('/api/project', { id: value });
        linkChannel(ch, value);
        return console.log(`✔ ${ch} → ${p.displayName} (${p.isOwned ? 'owner' : (p.sharedRole ?? 'viewer')}). See what would sync: media sync status --channel=${ch}`);
      }
      if (op === 'limit') {
        const projectId = projectOf(lib, ch);
        if (!projectId) throw new Error(`${ch} isn't linked to a cloud project yet: media channel link ${ch} <projectId> (or name the project: media channel limit <projectId> <MB>)`);
        const mb = Number(value);
        if (!value || !Number.isFinite(mb) || mb < 0) throw new Error(`media channel limit ${ch} <MB> [--yes]`);
        const cloud = connect();
        const st = await cloud.get<{ usedBytes: number; limitBytes: number }>('/api/channel-sync', { projectId });
        console.log(`${ch}: ${size(st.usedBytes)} of ${size(st.limitBytes)} shared in files; the limit would be ${mb} MB`);
        if (!has('yes')) return console.log('Dry run: add --yes.');
        const r = await cloud.put<{ limitBytes: number }>('/api/channel-sync', { projectId, limitMb: mb });
        return console.log(`✔ ${ch}'s team may share ${size(r.limitBytes)} in files`);
      }
      throw new Error(`Unknown: channel ${op}`);
    }
    case 'sync': {
      const [mode] = rest;
      if (!['status', 'push', 'pull'].includes(mode)) throw new Error('media sync status|push|pull [--channel= | --project=<id>] [--what=brand,skills,productions,media,music] [--yes]');
      const cloud = connect();
      if (mode === 'pull' && flag('ids')) {
        const r = await pullFiles(lib, cloud, list('ids') ?? [], has('yes'));
        for (const st of r.steps) console.log(`${SYMBOL[st.action]} ${st.key}${st.bytes ? `  ${size(st.bytes)}` : ''}${st.detail ? `  (${st.detail})` : ''}`);
        for (const f of r.filed) console.log(`  filed ${f}`);
        if (!has('yes') && r.steps.some(st => st.action === 'pull')) console.log('Dry run: add --yes.');
        return has('yes') ? changed() : undefined;
      }
      const what = (list('what') ?? [...PARTS]) as Part[];
      const bad = what.filter(w => !PARTS.includes(w));
      if (bad.length) throw new Error(`--what= one or more of ${PARTS.join(', ')}`);
      const channel = keyNamed(lib, { channel: flag('channel'), project: flag('project') });
      const channels = channel ? [channel] : Object.keys(lib.cfg.links);
      if (!channels.length) throw new Error('No channel is linked to a cloud project yet: media channel list, then media channel link <channel> <projectId>, or name a project: --project=<id>');
      const yes = has('yes') && mode !== 'status';
      for (const ch of channels) printReport(await syncChannel(lib, cloud, ch, mode as 'status' | 'push' | 'pull', { what, yes }));
      if (mode !== 'status' && !yes) console.log('\nDry run: add --yes.');
      if (yes) changed();
      return;
    }
    case 'share':
    case 'unshare': {
      if (!rest.length) throw new Error(`media ${cmd} <id|path>… [--channel= | --project=<id>] [--yes]`);
      const target = { channel: flag('channel'), project: flag('project') };
      const named = keyNamed(lib, target);
      const team = (key: string) => (isProjectId(key) ? `project ${key}'s team` : `the ${key} team`);
      // unshare: the channels and projects it is shared with (or the one named)
      const sharedWith = (it: Item) => (lib.db.prepare('SELECT channel FROM shares WHERE item_id = ?').all(it.id) as { channel: string }[]).map(r => r.channel).filter(c => !named || c === named);
      const byChannel = new Map<string, Item[]>();
      for (const ref of rest) {
        const it = resolveItem(lib, ref);
        const chs = cmd === 'share' ? [pickTarget(lib, it, target)] : sharedWith(it);
        if (!chs.length) console.log(`${it.id.slice(0, 10)} isn't shared with ${named ? team(named) : 'a team'}`);
        for (const ch of chs) byChannel.set(ch, [...(byChannel.get(ch) ?? []), it]);
      }
      const cloud = has('yes') && byChannel.size ? connect() : null;
      for (const [ch, items] of byChannel) {
        const total = items.reduce((t, it) => t + it.bytes, 0);
        console.log(`${cmd === 'share' ? 'Share with' : 'Stop sharing with'} ${team(ch)}: ${items.length} file${items.length === 1 ? '' : 's'}, ${size(total)}`);
        for (const it of items) console.log(`  ${it.id.slice(0, 10)}  ${pad(it.kind, 10)} ${size(it.bytes).padStart(8)}  ${absOf(lib, it.path)}`);
        if (!cloud) continue;
        if (cmd === 'unshare') {
          for (const it of items) withdrawShare(lib, it, ch);
          await withdrawFiles(lib, cloud, ch, items.map(it => it.id));
          console.log(`✔ ${team(ch)} no longer gets them (their details stay)`);
          continue;
        }
        for (const it of items) approveShare(lib, it, ch, 'cli');
        printReport(await pushShared(lib, cloud, ch, items.map(it => it.id), true));
      }
      if (!has('yes')) {
        if (cmd === 'share') console.log(`The project's limit counts every file its team shares (media sync status shows it).`);
        return console.log('Dry run: add --yes once the user has said yes.');
      }
      return changed();
    }
    case 'status':
      return status(lib);
    case 'export': {
      const r = exportLibrary(lib);
      return console.log(`${r.items} items, ${r.productions} productions → ${r.dir}`);
    }
    case 'apply-requests': {
      const r = await applyRequests(lib);
      if (r.applied || r.failed.length) console.log(`${r.applied} applied${r.failed.length ? `; failed:\n  ${r.failed.join('\n  ')}` : ''}`);
      return r.applied ? changed() : undefined;
    }
    default:
      usage();
      process.exit(1);
  }
};

main().catch(err => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
