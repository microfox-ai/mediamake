#!/usr/bin/env node
/**
 * get.mjs: download videos or their sound with yt-dlp into the media library's inbox, a
 * <file>.source.json beside each (mediamake.source/v1), then file them with `mm media ingest`.
 *
 *   node get.mjs <url | @handle | ytsearchN:words>… [options] [-- <more yt-dlp options>]
 *
 *   --audio[=m4a|mp3|wav|opus|flac]  just the sound (the source's own format unless one is named)
 *   --height=720                     the most video height: 720 unless the user asked for more (the
 *                                    smaller side, so a vertical Short is 720×1280)
 *   --sections="*1:00-1:30"          only that part of each video
 *   --chapters                       keep the video's chapter markers in the file
 *   --split-chapters                 one file a chapter too, as a set: _INBOX/<site>/<title> chapters/
 *   --sponsorblock=remove|mark       cut the sponsor, self-promotion and "subscribe" segments the
 *                                    SponsorBlock community marked, or keep them as chapters
 *   --live                           a live stream from its start, waiting for one not started yet
 *   --playlist                       a watch link's whole playlist (else only its video)
 *   --max=N | --all                  how many of a playlist, channel or search (a list stops without one)
 *   --set=<name>                     a folder under the inbox's tool folder: _INBOX/youtube/<name>/
 *   --thumb                          its thumbnail too, filed as a reference (youtube-thumbnails-<set>)
 *   --subs[=en.*,en]                 subtitles too (.srt), and --info its metadata (.info.json),
 *                                    into --extras (default <workspace>/out/yt-dlp/)
 *   --kind= --subject= --channel= --tags=a,b   passed to mm media ingest
 *   --no-ingest                      leave the files in the inbox
 *   --force                          download what the library already has
 *   --cookies-from-browser=<browser> sign in as the user (only on their word, for their own account)
 *   --dry                            say what would come down (format, size), download nothing
 *
 * Plain Node (22+), no packages: it runs wherever MediaMake does, on macOS and Windows.
 */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { YTDLP, baseArgs, die, env, expand, inbox, library, mmMedia, needFfmpeg, needYtdlp, parse, targetUrl, toolOf, usage, workspace, ytdlp } from './lib.mjs';

const { targets: given, flag, value, extra } = parse();
if (!given.length || flag('help')) {
  console.log(usage(import.meta.url));
  process.exit(given.length ? 0 : 2);
}
const targets = given.map(targetUrl);
if (!library && !flag('dry')) die('no media library on this computer: `mm media init` sets one up (`mm media help`).');
needYtdlp();
needFfmpeg();
const extras = path.resolve(expand(value('extras') ?? path.join(workspace, 'out', 'yt-dlp')));
const height = Number(value('height') ?? 720);
const audio = flag('audio');
const set = value('set');

// ── 1. what each target is: one video, or a list (playlist, channel, search)
const wanted = [];
for (const t of targets) {
  const r = ytdlp(flag, ['--flat-playlist', '-J', flag('playlist') ? '--yes-playlist' : '--no-playlist', ...extra, t]);
  if (r.status !== 0) die(`${t}: ${(r.stderr || 'no answer').trim().split(/\r?\n/).pop()}`);
  const info = JSON.parse(r.stdout);
  const list = info._type === 'playlist' ? (info.entries ?? []).filter(Boolean) : [info];
  const query = t.match(/^\w*search\d*:(.+)$/)?.[1];
  if (info._type === 'playlist' && !query && !flag('max') && !flag('all')) {
    console.log(`${t}: ${list.length} videos${info.title ? ` in "${info.title}"` : ''}, the first:`);
    for (const e of list.slice(0, 10)) console.log(`  ${e.id}  ${e.title ?? ''}`);
    die('a list: say how many with --max=N (or --all).', 3);
  }
  const n = flag('all') ? list.length : Number(value('max') ?? list.length);
  for (const e of list.slice(0, n)) wanted.push({ id: e.id, title: e.title, url: e.webpage_url ?? e.url ?? t, query });
}

// ── 2. what the library already has (its sources: the same site's same id)
const todo = [];
for (const w of wanted) {
  if (!flag('force') && library && w.title) {
    const r = mmMedia(['find', w.title.replace(/["*():^]/g, ' '), '--json', '--all', '--limit=20']);
    let hit;
    try {
      hit = JSON.parse(r.stdout).find(it => (it.sources ?? []).some(s => s.ref === w.id));
    } catch {}
    if (hit) {
      console.log(`✔ already in the library: ${hit.abs ?? hit.path}  (${w.title})`);
      continue;
    }
  }
  todo.push(w);
}
if (!todo.length) process.exit(0);

// ── 3. the download: 720p or less, H.264 and AAC first (what editors and Remotion take), stereo
const sort = `res:${height},vcodec:h264,channels:2,acodec:aac`;
const fmt = audio
  ? ['-f', 'ba/b', '-S', 'channels:2', '-x', ...(typeof audio === 'string' ? ['--audio-format', audio] : [])]
  : ['-S', sort, '--merge-output-format', 'mp4'];
const sections = value('sections');
const cut = sections ? ' %(section_start)d-%(section_end)ds' : '';
const name = audio ? `%(title).150B${cut}.%(ext)s` : `%(title).150B (%(height)sp%(fps)d)${cut}.%(ext)s`;
const sb = value('sponsorblock');
if (sb && !/^(remove|mark)(:[\w,-]+)?$/.test(sb)) die('--sponsorblock=remove or mark (remove:sponsor,intro to name the kinds)');
const [sbHow, sbCats] = sb ? sb.split(':') : [];
const sponsor = sb
  ? sbHow === 'remove'
    ? ['--sponsorblock-remove', sbCats ?? 'sponsor,selfpromo,interaction']
    : ['--sponsorblock-mark', sbCats ?? 'all', '--embed-chapters']
  : [];

if (flag('dry')) {
  const r = ytdlp(flag, [...fmt, '--no-playlist', '--print', '%(title)s  →  %(format_id)s %(resolution)s %(ext)s, about %(filesize,filesize_approx)s bytes%(chapters&, chapters: |)s%(chapters.:.title|)l', ...extra, ...todo.map(w => w.url)], { stdio: ['ignore', 'pipe', 'inherit'] });
  process.stdout.write(r.stdout);
  console.log(`Would go to ${path.join(inbox, '<site>', set ?? '')}${flag('no-ingest') ? '' : ', then mm media ingest'}.`);
  process.exit(r.status ?? 0);
}

// it comes down into a hidden folder the inbox's watcher skips, and moves in with its sidecar
const tmpDir = path.join(inbox, '.yt-dlp');
const sub = flag('subs');
const dl = [
  ...fmt,
  '--no-simulate',
  '--progress',
  '--newline',
  '--no-playlist',
  '-P', tmpDir,
  '-o', name,
  '-O', 'after_move:%(.{id,extractor_key,webpage_url,webpage_url_domain,title,uploader,channel,channel_url,height,fps,duration,license,upload_date,filepath})j',
  ...(sections ? ['--download-sections', sections] : []),
  ...(flag('chapters') ? ['--embed-chapters'] : []),
  ...(flag('split-chapters') ? ['--split-chapters', '-o', 'chapter:%(id)s %(section_number)03d %(section_title).80B.%(ext)s'] : []),
  ...sponsor,
  ...(flag('live') ? ['--live-from-start', '--wait-for-video', '30-600'] : []),
  ...(flag('thumb') ? ['--write-thumbnail', '--convert-thumbnails', 'jpg', '-o', 'thumbnail:%(id)s.%(ext)s'] : []),
  ...(sub ? ['--write-subs', '--write-auto-subs', '--sub-langs', typeof sub === 'string' ? sub : 'en.*,en', '--convert-subs', 'srt', '-P', `subtitle:${extras}`, '-o', 'subtitle:%(title).100B [%(id)s].%(ext)s'] : []),
  ...(flag('info') ? ['--write-info-json', '-P', `infojson:${extras}`, '-o', 'infojson:%(title).100B [%(id)s].%(ext)s'] : []),
  ...extra,
  ...todo.map(w => w.url),
];

const got = await new Promise(resolve => {
  const child = spawn(YTDLP, [...baseArgs(flag), ...dl], { env, stdio: ['ignore', 'pipe', 'inherit'] });
  const out = [];
  let buf = '';
  child.stdout.setEncoding('utf8');
  child.stdout.on('data', s => {
    buf += s;
    const lines = buf.split(/\r?\n/);
    buf = lines.pop();
    for (const l of lines) {
      if (l.startsWith('{')) out.push(JSON.parse(l));
      else if (/^\[download\]\s+100%|ERROR|WARNING|Merging|Extracting|SponsorBlock|SplitChapters|ModifyChapters|Waiting/.test(l)) console.error(l);
    }
  });
  child.on('close', code => resolve({ code, out }));
});

// ── 4. each file into _INBOX/<tool>/[<set>]/ with its sidecar; its thumbnail into the references
const filed = [];
const thumbs = [];
const now = new Date().toISOString();
const move = (from, dest, source) => {
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(`${dest}.source.json`, JSON.stringify(source, null, 1));
  fs.renameSync(from, dest);
};
const safe = s => String(s).replace(/[<>:"/\\|?*\x00-\x1f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 80);
for (const i of got.out) {
  const w = todo.find(x => x.id === i.id) ?? {};
  const tool = toolOf(i.extractor_key, i.webpage_url_domain);
  const dest = path.join(inbox, tool, ...(set ? [set] : []), path.basename(i.filepath));
  const source = {
    schema: 'mediamake.source/v1',
    tool,
    ref: i.id,
    url: i.webpage_url,
    title: i.title,
    author: i.channel ?? i.uploader,
    ...(w.query ? { query: w.query } : {}),
    ...(audio ? {} : { height: i.height, fps: i.fps }),
    downloadedAt: now,
    via: 'yt-dlp',
    duration: i.duration,
    ...(i.license ? { license: i.license } : {}),
    ...(i.upload_date ? { uploadDate: i.upload_date } : {}),
    ...(i.channel_url ? { channelUrl: i.channel_url } : {}),
    ...(sections ? { section: sections } : {}),
    ...(sb ? { sponsorblock: sb } : {}),
  };
  move(i.filepath, dest, source);
  filed.push(dest);
  console.log(`✔ ${path.relative(inbox, dest)}`);
  // its chapters, one file each, kept together as a set
  const chapters = fs.existsSync(tmpDir) ? fs.readdirSync(tmpDir).filter(f => f.startsWith(`${i.id} `)).sort() : [];
  const cdir = path.join(inbox, tool, `${set ?? safe(i.title)} chapters`);
  for (const f of chapters) {
    const m = /^\S+ (\d{3}) (.*)\.(\w+)$/.exec(f);
    const cdest = path.join(cdir, f.slice(i.id.length + 1));
    move(path.join(tmpDir, f), cdest, { ...source, ref: `${i.id}#chapter-${m?.[1] ?? f}`, title: `${i.title}: ${m?.[2] ?? f}`, note: `chapter ${Number(m?.[1] ?? 0)} of the video` });
    filed.push(cdest);
  }
  if (chapters.length) console.log(`✔ ${chapters.length} chapters → ${path.relative(inbox, cdir)}`);
  const thumb = path.join(tmpDir, `${i.id}.jpg`);
  if (fs.existsSync(thumb)) {
    const tdest = path.join(inbox, `${tool}-thumbnails`, set ?? 'misc', `${i.id}.jpg`);
    move(thumb, tdest, { ...source, ref: `${i.id}#thumbnail`, height: undefined, fps: undefined, note: 'the video’s thumbnail' });
    thumbs.push({ file: tdest, subject: `${tool}-thumbnails-${set ?? 'misc'}` });
  }
}
try {
  if (!fs.readdirSync(tmpDir).length) fs.rmdirSync(tmpDir);
} catch {}
if (got.code !== 0) console.error(`✗ yt-dlp stopped (exit ${got.code}); what came down is listed above.`);
if (sub || flag('info')) console.log(`subtitles and metadata: ${extras}`);

// ── 5. file them: the library's rule is inbox first, then ingest
if (flag('no-ingest') || !filed.length) process.exit(got.code ? 1 : 0);
const hints = ['kind', 'subject', 'channel', 'tags'].filter(k => value(k)).map(k => `--${k}=${value(k)}`);
const ingest = (files, h) => {
  const r = mmMedia(['ingest', ...files, ...h]);
  process.stdout.write(r.stdout);
  if (r.status !== 0) console.error(r.stderr.trim() || '✗ mm media ingest failed: the files wait in the inbox (mm media ingest).');
  return r.status ?? 1;
};
let code = ingest(filed, hints);
for (const subject of new Set(thumbs.map(t => t.subject)))
  code ||= ingest(thumbs.filter(t => t.subject === subject).map(t => t.file), ['--kind=references', `--subject=${subject}`, '--tags=thumbnail']);
process.exit(code || (got.code ? 1 : 0));
