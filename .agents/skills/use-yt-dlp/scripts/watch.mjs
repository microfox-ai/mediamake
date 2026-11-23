#!/usr/bin/env node
/**
 * watch.mjs: watch lists of channels. Each run finds the videos a channel put up since the last run
 * (a quick look at its newest, stopping at the first one already seen) and handles only those:
 * their details, scores and transcripts as a research folder (research.mjs), or, for the user's own
 * channels, the videos themselves into the media library (get.mjs). A run on a schedule makes it a
 * feed: new uploads of news sources, of reference channels, a backup of one's own channel.
 *
 *   node watch.mjs add <list> <@handle[/shorts|/streams] | channel or playlist link>… [--download --own]
 *                  [--kind= --subject= --channel= --tags=]   (passed to get.mjs for a --download channel)
 *   node watch.mjs remove <list> <@handle | link>
 *   node watch.mjs show [<list>]
 *   node watch.mjs run <list> [--first=5] [--look=30] [--transcripts[=langs]] [--comments[=N]] [--dry]
 *
 *   --download --own   download this channel's new videos into the media library: only the user's own
 *                      channels, or ones whose videos they may use (say so with --own)
 *   --first=N          a channel's first run takes its N newest as new (default 5); the rest it lists
 *                      count as seen
 *   --look=N           how many of a channel's newest each run looks at (default 30)
 *   --dry              say what is new, handle nothing and remember nothing
 *
 * A list lives in <workspace>/research/watch/<list>/: watch.json (its channels), seen.txt (every video
 * handled, in yt-dlp's archive format, so `yt-dlp --download-archive seen.txt` reads it too) and one
 * folder a run with what was new. Other people's channels: details and transcripts only.
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { die, needYtdlp, parse, targetUrl, usage, workspace, ytdlp } from './lib.mjs';

const { targets, flag, value } = parse();
const [cmd, list, ...items] = targets;
if (flag('help') || !cmd || !['add', 'remove', 'show', 'run'].includes(cmd)) {
  console.log(usage(import.meta.url));
  process.exit(flag('help') ? 0 : 2);
}
const root = path.join(workspace, 'research', 'watch');
const dir = l => path.join(root, l);
const read = l => {
  try {
    return JSON.parse(fs.readFileSync(path.join(dir(l), 'watch.json'), 'utf8'));
  } catch {
    return { channels: [] };
  }
};
const write = (l, w) => {
  fs.mkdirSync(dir(l), { recursive: true });
  fs.writeFileSync(path.join(dir(l), 'watch.json'), JSON.stringify(w, null, 1));
};
const seenFile = l => path.join(dir(l), 'seen.txt');
const seenOf = l => new Set((fs.existsSync(seenFile(l)) ? fs.readFileSync(seenFile(l), 'utf8') : '').split(/\r?\n/).filter(Boolean));
const needList = () => {
  if (!list || !/^[\w.-]+$/.test(list)) die('name the list: letters, numbers, - and _ (watch.mjs add doomcat-sources @handle)');
};

if (cmd === 'show') {
  const lists = list ? [list] : fs.existsSync(root) ? fs.readdirSync(root).filter(l => fs.existsSync(path.join(dir(l), 'watch.json'))) : [];
  if (!lists.length) console.log(`No watch lists yet (${root}). watch.mjs add <list> @handle starts one.`);
  for (const l of lists) {
    const w = read(l);
    console.log(`${l}: ${w.channels.length} channel${w.channels.length === 1 ? '' : 's'}, ${seenOf(l).size} videos seen${w.lastRun ? `, last run ${w.lastRun}` : ''}`);
    for (const c of w.channels) console.log(`  ${c.url}  ${c.download ? 'download (own)' : 'details'}${c.lastNew ? `  last new ${c.lastNew}` : ''}`);
  }
  process.exit(0);
}

needList();
const w = read(list);

if (cmd === 'add') {
  if (!items.length) die('add which channel? watch.mjs add <list> @handle');
  if (flag('download') && !flag('own')) die("--download takes a channel's videos: only the user's own channels, or ones whose videos they may use. Add --own when that is so.");
  for (const it of items) {
    const url = targetUrl(it);
    if (w.channels.some(c => c.url === url)) {
      console.log(`· ${url} is on ${list} already`);
      continue;
    }
    w.channels.push({
      url,
      download: !!flag('download'),
      ...(flag('download') ? { hints: ['kind', 'subject', 'channel', 'tags'].filter(k => value(k)).map(k => `--${k}=${value(k)}`) } : {}),
      added: new Date().toISOString().slice(0, 10),
    });
    console.log(`✔ ${url} → ${list}${flag('download') ? ' (its new videos are downloaded)' : ''}`);
  }
  write(list, w);
  process.exit(0);
}

if (cmd === 'remove') {
  const urls = items.map(targetUrl);
  const before = w.channels.length;
  w.channels = w.channels.filter(c => !urls.includes(c.url) && !items.includes(c.url));
  write(list, w);
  console.log(before === w.channels.length ? `· none of those is on ${list}` : `✔ ${before - w.channels.length} removed from ${list} (what it saw stays in seen.txt)`);
  process.exit(0);
}

// ── run: each channel's newest, up to the first video already seen
needYtdlp();
if (!w.channels.length) die(`${list} has no channels: watch.mjs add ${list} @handle`);
const seen = seenOf(list);
const look = Number(value('look') ?? 30);
const first = Number(value('first') ?? 5);
const stamp = new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-');
const fresh = [];
const markSeen = [];
for (const c of w.channels) {
  const r = ytdlp(flag, ['--flat-playlist', '--no-warnings', '-I', `:${look}`, '--print', '%(ie_key)s\t%(id)s\t%(title)s', c.url], { stdio: ['ignore', 'pipe', 'pipe'] });
  if (r.status !== 0) {
    console.error(`✗ ${c.url}: ${(r.stderr || '').trim().split(/\r?\n/).pop()}`);
    continue;
  }
  const vids = r.stdout
    .split(/\r?\n/)
    .filter(Boolean)
    .map(l => l.split('\t'))
    .map(([ie, id, title]) => ({ key: `${String(ie).toLowerCase()} ${id}`, id, title }));
  const firstRun = !c.checked;
  const news = [];
  for (const v of vids) {
    if (seen.has(v.key)) break;
    news.push(v);
  }
  const take = firstRun ? news.slice(0, first) : news;
  console.log(`${c.url}: ${take.length} new${firstRun ? ` (first run: the newest ${first}; the other ${vids.length - take.length} count as seen)` : ''}`);
  for (const v of take) console.log(`  ${v.id}  ${v.title}`);
  fresh.push(...take.map(v => ({ ...v, channel: c })));
  markSeen.push(...(firstRun ? vids : take).map(v => v.key));
  if (!flag('dry')) {
    c.checked = new Date().toISOString();
    if (take.length) c.lastNew = c.checked.slice(0, 10);
  }
}
if (flag('dry')) process.exit(0);

// details for every new video; the videos themselves only for --download channels
const runDir = path.join(dir(list), stamp);
const here = path.dirname(fileURLToPath(import.meta.url));
const node = (script, a) => spawnSync(process.execPath, [path.join(here, script), ...a], { stdio: 'inherit' });
let failed = false;
if (fresh.length) {
  fs.mkdirSync(runDir, { recursive: true });
  const idsFile = path.join(runDir, 'new.txt');
  fs.writeFileSync(idsFile, `${fresh.map(v => `https://www.youtube.com/watch?v=${v.id}`).join('\n')}\n`);
  const pass = ['transcripts', 'comments', 'cookies-from-browser'].filter(k => flag(k)).map(k => (flag(k) === true ? `--${k}` : `--${k}=${flag(k)}`));
  failed ||= node('research.mjs', [`--ids=${idsFile}`, `--name=${list}-${stamp}`, `--out=${runDir}`, ...pass]).status !== 0;
  for (const c of w.channels.filter(c => c.download)) {
    const mine = fresh.filter(v => v.channel === c).map(v => `https://www.youtube.com/watch?v=${v.id}`);
    if (mine.length) failed ||= node('get.mjs', [...mine, `--set=${list}`, ...(c.hints ?? [])]).status !== 0;
  }
}
// what was handled is remembered (a failed research run is tried again next time)
if (!failed) fs.appendFileSync(seenFile(list), markSeen.map(k => `${k}\n`).join(''));
w.lastRun = new Date().toISOString();
write(list, w);
fs.appendFileSync(path.join(dir(list), 'runs.md'), `- ${w.lastRun.slice(0, 16).replace('T', ' ')}: ${fresh.length} new${fresh.length ? ` → ${stamp}/index.md` : ''}${failed ? ' (something failed: tried again next run)' : ''}\n`);
console.log(fresh.length ? `✔ ${fresh.length} new → ${path.join(runDir, 'index.md')}` : '✔ nothing new');
process.exit(failed ? 1 : 0);
