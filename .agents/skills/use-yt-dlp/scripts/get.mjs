#!/usr/bin/env node
/**
 * get.mjs: download videos or their sound with yt-dlp into the media library's inbox, a
 * <file>.source.json beside each (mediamake.source/v1), then file them with `mm media ingest`.
 *
 *   node get.mjs <url | ytsearchN:words>… [options] [-- <more yt-dlp options>]
 *
 *   --audio[=m4a|mp3|wav|opus|flac]  just the sound (the source's own format unless one is named)
 *   --height=720                     the most video height: 720 unless the user asked for more (the
 *                                    smaller side, so a vertical Short is 720×1280)
 *   --sections="*1:00-1:30"          only that part of each video
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
import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const WIN = process.platform === 'win32';
const argv = process.argv.slice(2);
const dash = argv.indexOf('--');
const extra = dash >= 0 ? argv.slice(dash + 1) : [];
const args = dash >= 0 ? argv.slice(0, dash) : argv;
const targets = args.filter(a => !a.startsWith('--'));
const flag = name => {
  const hit = args.find(a => a === `--${name}` || a.startsWith(`--${name}=`));
  return hit === undefined ? undefined : hit.includes('=') ? hit.slice(hit.indexOf('=') + 1) : true;
};
const die = (msg, code = 1) => {
  console.error(`✗ ${msg}`);
  process.exit(code);
};
if (!targets.length || flag('help')) {
  console.log(fs.readFileSync(new URL(import.meta.url), 'utf8').match(/\/\*\*\n([\s\S]*?)\*\//)[1].replace(/^ \* ?/gm, ''));
  process.exit(targets.length ? 0 : 2);
}

// ── where things go: ~/.mediamake/config.json (the library's inbox, the workspace)
const home = os.homedir();
const expand = p => (p === '~' ? home : p?.startsWith('~/') || p?.startsWith('~\\') ? path.join(home, p.slice(2)) : p);
let config = {};
try {
  config = JSON.parse(fs.readFileSync(process.env.MEDIAMAKE_CONFIG ?? path.join(home, '.mediamake', 'config.json'), 'utf8'));
} catch {}
const lib = config.library && typeof config.library === 'object' ? config.library : null;
if (!lib && !flag('dry')) die('no media library on this computer: `mm media init` sets one up (`mm media help`).');
const inbox = path.resolve(expand(lib?.inbox ?? '~/Downloads/_INBOX'));
const workspace = path.resolve(expand(typeof config.workspace === 'string' ? config.workspace : '~/MediaMake'));
const extras = path.resolve(expand(typeof flag('extras') === 'string' ? flag('extras') : path.join(workspace, 'out', 'yt-dlp')));

// ── yt-dlp and ffmpeg: on the PATH, or where an installer put yt-dlp before this terminal's PATH caught up
const isFile = f => {
  try {
    return fs.statSync(f).isFile();
  } catch {
    return false;
  }
};
const onPath = n => (process.env.PATH ?? '').split(path.delimiter).map(d => path.join(d, WIN ? `${n}.exe` : n)).find(isFile);
const local = process.env.LOCALAPPDATA ?? path.join(home, 'AppData', 'Local');
const places = WIN
  ? [path.join(local, 'Microsoft', 'WinGet', 'Links', 'yt-dlp.exe'), path.join(home, '.local', 'bin', 'yt-dlp.exe'), path.join(home, 'scoop', 'shims', 'yt-dlp.exe')]
  : ['/opt/homebrew/bin/yt-dlp', '/usr/local/bin/yt-dlp', path.join(home, '.local', 'bin', 'yt-dlp')];
const YTDLP = onPath('yt-dlp') ?? places.find(isFile);
if (!YTDLP) die('yt-dlp is missing: `mm doctor --fix` installs it (or see the use-yt-dlp skill, step 1).');
const env = { ...process.env, PATH: `${path.dirname(YTDLP)}${path.delimiter}${process.env.PATH ?? ''}` };
if (!onPath('ffmpeg')) die(`ffmpeg is missing, and yt-dlp joins video and sound with it: ${process.platform === 'darwin' ? '`brew install ffmpeg`' : WIN ? '`winget install --id Gyan.FFmpeg -e`' : 'install ffmpeg'}.`);

const height = Number(flag('height') ?? 720);
const audio = flag('audio');
const set = typeof flag('set') === 'string' ? flag('set') : undefined;
// Node is MediaMake's, and yt-dlp solves YouTube's JavaScript challenges with it (Deno is its default)
const base = ['--js-runtimes', 'node', '--windows-filenames', '--no-mtime'];
if (typeof flag('cookies-from-browser') === 'string') base.push('--cookies-from-browser', flag('cookies-from-browser'));

const ytdlp = (a, o = {}) => spawnSync(YTDLP, [...base, ...a], { encoding: 'utf8', env, maxBuffer: 1 << 28, ...o });

// ── 1. what each target is: one video, or a list (playlist, channel, search)
const wanted = [];
for (const t of targets) {
  const r = ytdlp(['--flat-playlist', '-J', flag('playlist') ? '--yes-playlist' : '--no-playlist', ...extra, t]);
  if (r.status !== 0) die(`${t}: ${(r.stderr || 'no answer').trim().split(/\r?\n/).pop()}`);
  const info = JSON.parse(r.stdout);
  const list = info._type === 'playlist' ? (info.entries ?? []).filter(Boolean) : [info];
  const query = t.match(/^\w*search\d*:(.+)$/)?.[1];
  if (info._type === 'playlist' && !query && !flag('max') && !flag('all')) {
    console.log(`${t}: ${list.length} videos${info.title ? ` in "${info.title}"` : ''}, the first:`);
    for (const e of list.slice(0, 10)) console.log(`  ${e.id}  ${e.title ?? ''}`);
    die('a list: say how many with --max=N (or --all).', 3);
  }
  const n = flag('all') ? list.length : Number(flag('max') ?? list.length);
  for (const e of list.slice(0, n)) wanted.push({ id: e.id, title: e.title, url: e.webpage_url ?? e.url ?? t, query });
}

// ── 2. what the library already has (its sources: the same site's same id)
// `mm media …` is the studio's scripts/media.ts: run it straight, without a shell, so a title's spaces,
// | or & reach it whole on Windows too (`mm where` names the studio)
const where = spawnSync('mm where', { encoding: 'utf8', shell: true, env });
const STUDIO = where.status === 0 ? where.stdout.trim().split(/\r?\n/).pop() : null;
const MEDIA = STUDIO && path.join(STUDIO, 'scripts', 'media.ts');
const mm = a =>
  MEDIA && isFile(MEDIA)
    ? spawnSync(process.execPath, ['--experimental-strip-types', '--no-warnings=ExperimentalWarning', MEDIA, ...a.slice(1)], { encoding: 'utf8', cwd: STUDIO, env, maxBuffer: 1 << 26 })
    : { status: 1, stdout: '', stderr: "✗ mm isn't on the PATH (`npm run mm -- link` in the MediaMake checkout): the files wait in the inbox for `mm media ingest`." };
const toolOf = key => {
  const k = String(key ?? '').toLowerCase();
  return k.startsWith('youtube') ? 'youtube' : k || 'web';
};
const todo = [];
for (const w of wanted) {
  if (!flag('force') && lib && w.title) {
    const r = mm(['media', 'find', w.title.replace(/["*():^]/g, ' '), '--json', '--all', '--limit=20']);
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
const sections = typeof flag('sections') === 'string' ? flag('sections') : undefined;
const cut = sections ? ' %(section_start)d-%(section_end)ds' : '';
const name = audio ? `%(title).150B${cut}.%(ext)s` : `%(title).150B (%(height)sp%(fps)d)${cut}.%(ext)s`;

if (flag('dry')) {
  const r = ytdlp([...fmt, '--no-playlist', '--print', '%(title)s  →  %(format_id)s %(resolution)s %(ext)s, about %(filesize,filesize_approx)s bytes', ...extra, ...todo.map(w => w.url)], { stdio: ['ignore', 'pipe', 'inherit'] });
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
  ...(flag('thumb') ? ['--write-thumbnail', '--convert-thumbnails', 'jpg', '-o', 'thumbnail:%(id)s.%(ext)s'] : []),
  ...(sub ? ['--write-subs', '--write-auto-subs', '--sub-langs', typeof sub === 'string' ? sub : 'en.*,en', '--convert-subs', 'srt', '-P', `subtitle:${extras}`, '-o', 'subtitle:%(title).100B [%(id)s].%(ext)s'] : []),
  ...(flag('info') ? ['--write-info-json', '-P', `infojson:${extras}`, '-o', 'infojson:%(title).100B [%(id)s].%(ext)s'] : []),
  ...extra,
  ...todo.map(w => w.url),
];

const got = await new Promise(resolve => {
  const child = spawn(YTDLP, [...base, ...dl], { env, stdio: ['ignore', 'pipe', 'inherit'] });
  const out = [];
  let buf = '';
  child.stdout.setEncoding('utf8');
  child.stdout.on('data', s => {
    buf += s;
    const lines = buf.split(/\r?\n/);
    buf = lines.pop();
    for (const l of lines) {
      if (l.startsWith('{')) out.push(JSON.parse(l));
      else if (/^\[download\]\s+100%|ERROR|WARNING|Merging|Extracting/.test(l)) console.error(l);
    }
  });
  child.on('close', code => resolve({ code, out }));
});

// ── 4. each file into _INBOX/<tool>/[<set>]/ with its sidecar; its thumbnail into the references
const filed = [];
const thumbs = [];
const now = new Date().toISOString();
for (const i of got.out) {
  const w = todo.find(x => x.id === i.id) ?? {};
  const tool = toolOf(i.extractor_key) === 'generic' ? (i.webpage_url_domain ?? 'web') : toolOf(i.extractor_key);
  const dir = path.join(inbox, tool, ...(set ? [set] : []));
  fs.mkdirSync(dir, { recursive: true });
  const dest = path.join(dir, path.basename(i.filepath));
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
  };
  fs.writeFileSync(`${dest}.source.json`, JSON.stringify(source, null, 1));
  fs.renameSync(i.filepath, dest);
  filed.push(dest);
  console.log(`✔ ${path.relative(inbox, dest)}`);
  const thumb = path.join(tmpDir, `${i.id}.jpg`);
  if (fs.existsSync(thumb)) {
    const tdir = path.join(inbox, `${tool}-thumbnails`, set ?? 'misc');
    fs.mkdirSync(tdir, { recursive: true });
    const tdest = path.join(tdir, `${i.id}.jpg`);
    fs.writeFileSync(`${tdest}.source.json`, JSON.stringify({ ...source, ref: `${i.id}#thumbnail`, height: undefined, fps: undefined, note: 'the video’s thumbnail' }, null, 1));
    fs.renameSync(thumb, tdest);
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
const hints = ['kind', 'subject', 'channel', 'tags'].filter(k => typeof flag(k) === 'string').map(k => `--${k}=${flag(k)}`);
const ingest = (files, h) => {
  const r = mm(['media', 'ingest', ...files, ...h]);
  process.stdout.write(r.stdout);
  if (r.status !== 0) console.error(r.stderr.trim() || '✗ mm media ingest failed: the files wait in the inbox (mm media ingest).');
  return r.status ?? 1;
};
let code = ingest(filed, hints);
for (const subject of new Set(thumbs.map(t => t.subject)))
  code ||= ingest(thumbs.filter(t => t.subject === subject).map(t => t.file), ['--kind=references', `--subject=${subject}`, '--tags=thumbnail']);
process.exit(code || (got.code ? 1 : 0));
