/**
 * lib.mjs: what get.mjs, research.mjs and watch.mjs share. Where things go (~/.mediamake/config.json:
 * the media library's inbox, the workspace), yt-dlp and how it is run, mm's media commands, and the
 * arguments. Plain Node (22+), no packages: it runs wherever MediaMake does, on macOS and Windows.
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

export const WIN = process.platform === 'win32';

/** The arguments: targets (no leading --), flag(name) (true, a value or undefined), and what follows a bare --. */
export const parse = (argv = process.argv.slice(2)) => {
  const dash = argv.indexOf('--');
  const args = dash >= 0 ? argv.slice(0, dash) : argv;
  const flag = name => {
    const hit = args.find(a => a === `--${name}` || a.startsWith(`--${name}=`));
    return hit === undefined ? undefined : hit.includes('=') ? hit.slice(hit.indexOf('=') + 1) : true;
  };
  return { targets: args.filter(a => !a.startsWith('--')), flag, value: name => (typeof flag(name) === 'string' ? flag(name) : undefined), extra: dash >= 0 ? argv.slice(dash + 1) : [] };
};

export const die = (msg, code = 1) => {
  console.error(`✗ ${msg}`);
  process.exit(code);
};

/** A script's own comment at its top, for --help. */
export const usage = url =>
  fs.readFileSync(new URL(url), 'utf8').match(/\/\*\*\n([\s\S]*?)\*\//)[1].replace(/^ \* ?/gm, '');

export const isFile = f => {
  try {
    return fs.statSync(f).isFile();
  } catch {
    return false;
  }
};

// ── where things go
export const home = os.homedir();
export const expand = p => (p === '~' ? home : p?.startsWith('~/') || p?.startsWith('~\\') ? path.join(home, p.slice(2)) : p);
let config = {};
try {
  config = JSON.parse(fs.readFileSync(process.env.MEDIAMAKE_CONFIG ?? path.join(home, '.mediamake', 'config.json'), 'utf8'));
} catch {}
/** The media library's settings, or null when this computer has none. */
export const library = config.library && typeof config.library === 'object' ? config.library : null;
export const inbox = path.resolve(expand(library?.inbox ?? '~/Downloads/_INBOX'));
export const workspace = path.resolve(expand(typeof config.workspace === 'string' ? config.workspace : '~/MediaMake'));

// ── yt-dlp: on the PATH, or where an installer put it before this terminal's PATH caught up
export const onPath = n => (process.env.PATH ?? '').split(path.delimiter).map(d => path.join(d, WIN ? `${n}.exe` : n)).find(isFile);
const local = process.env.LOCALAPPDATA ?? path.join(home, 'AppData', 'Local');
const places = WIN
  ? [path.join(local, 'Microsoft', 'WinGet', 'Links', 'yt-dlp.exe'), path.join(home, '.local', 'bin', 'yt-dlp.exe'), path.join(home, 'scoop', 'shims', 'yt-dlp.exe')]
  : ['/opt/homebrew/bin/yt-dlp', '/usr/local/bin/yt-dlp', path.join(home, '.local', 'bin', 'yt-dlp')];
export const YTDLP = onPath('yt-dlp') ?? places.find(isFile);
// UTF-8 out of yt-dlp (it's Python): on Windows a pipe would get the console's codepage and lose "—", "é"
export const env = {
  ...process.env,
  ...(YTDLP ? { PATH: `${path.dirname(YTDLP)}${path.delimiter}${process.env.PATH ?? ''}` } : {}),
  PYTHONUTF8: '1',
  PYTHONIOENCODING: 'utf-8',
};
export const needYtdlp = () => {
  if (!YTDLP) die('yt-dlp is missing: `mm doctor --fix` installs it (or see the use-yt-dlp skill, step 1).');
};
export const needFfmpeg = () => {
  if (!onPath('ffmpeg')) die(`ffmpeg is missing, and yt-dlp joins video and sound with it: ${process.platform === 'darwin' ? '`brew install ffmpeg`' : WIN ? '`winget install --id Gyan.FFmpeg -e`' : 'install ffmpeg'}.`);
};

/**
 * yt-dlp's options for every run: Node (MediaMake's) solves YouTube's JavaScript challenges (Deno is
 * yt-dlp's default), names any OS can hold, files dated now, and the user's sign-in only on their word.
 */
export const baseArgs = flag => [
  '--js-runtimes', 'node',
  '--encoding', 'utf-8',
  '--windows-filenames',
  '--no-mtime',
  ...(typeof flag('cookies-from-browser') === 'string' ? ['--cookies-from-browser', flag('cookies-from-browser')] : []),
];
export const ytdlp = (flag, a, o = {}) => spawnSync(YTDLP, [...baseArgs(flag), ...a], { encoding: 'utf8', env, maxBuffer: 1 << 28, ...o });

/** "@handle", "@handle/shorts", a channel's or a playlist's link, a search: what yt-dlp is given. */
export const targetUrl = t =>
  /^@[\w.-]+(\/(videos|shorts|streams))?$/.test(t)
    ? `https://www.youtube.com/${t.includes('/') ? t : `${t}/videos`}`
    : /^[\w-]{11}$/.test(t)
      ? `https://www.youtube.com/watch?v=${t}`
      : t;

/** A site's name for the library's sources: youtube (as Browse Hack's downloads say), else yt-dlp's extractor. */
export const toolOf = (key, domain) => {
  const k = String(key ?? '').toLowerCase();
  return k.startsWith('youtube') ? 'youtube' : k && k !== 'generic' ? k : domain || 'web';
};

// ── mm media …: the studio's scripts/media.ts, run straight without a shell, so a title's spaces, | or &
// reach it whole on Windows too (`mm where` names the studio)
let studio;
const media = () => {
  if (studio === undefined) {
    const r = spawnSync('mm where', { encoding: 'utf8', shell: true, env });
    studio = r.status === 0 ? r.stdout.trim().split(/\r?\n/).pop() : null;
  }
  const file = studio && path.join(studio, 'scripts', 'media.ts');
  return file && isFile(file) ? file : null;
};
export const mmMedia = a => {
  const file = media();
  return file
    ? spawnSync(process.execPath, ['--experimental-strip-types', '--no-warnings=ExperimentalWarning', file, ...a], { encoding: 'utf8', cwd: studio, env, maxBuffer: 1 << 26 })
    : { status: 1, stdout: '', stderr: "✗ mm isn't on the PATH (`npm run mm -- link` in the MediaMake checkout): the files wait in the inbox for `mm media ingest`." };
};

export const slug = s =>
  String(s ?? '')
    .toLowerCase()
    .replace(/^https?:\/\/(www\.)?/, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'research';
