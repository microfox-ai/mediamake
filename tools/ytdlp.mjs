/**
 * yt-dlp on this machine: where it is (on the PATH, or where winget, Homebrew, uv, pipx or scoop put it
 * when this shell's PATH hasn't caught up with the install yet), how old it is, and the one command that
 * installs or updates it here. mm doctor checks it (--fix installs or updates it); mm thumbs inspire,
 * mm yt-grab and the use-yt-dlp skill run it.
 *
 *   macOS     brew install yt-dlp                       (no Homebrew: uv tool install "yt-dlp[default]")
 *   Windows   winget install --id yt-dlp.yt-dlp -e      (--skip-dependencies when ffmpeg is already here:
 *                                                        winget would add its own ffmpeg and Deno)
 *   Linux     uv tool install "yt-dlp[default]"
 *
 * YouTube changes often and an old yt-dlp stops working there, so a copy older than STALE_DAYS is
 * updated the way it was installed (brew upgrade, winget upgrade, uv tool upgrade, pipx, scoop, or
 * the standalone binary's own yt-dlp -U).
 *
 * Plain JavaScript that runs on old Node too (mm doctor imports it).
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

/** A yt-dlp older than this many days is updated: YouTube breaks old versions. */
export const STALE_DAYS = 60;

const pathOf = platform => (platform === 'win32' ? path.win32 : path.posix);

/** The places installers put yt-dlp, for a shell whose PATH doesn't name them yet. */
export const knownPlaces = ({
  platform = process.platform,
  home = os.homedir(),
  env = process.env,
} = {}) => {
  const p = pathOf(platform);
  if (platform === 'win32') {
    const local = env.LOCALAPPDATA || p.join(home, 'AppData', 'Local');
    const pkgs = p.join(local, 'Microsoft', 'WinGet', 'Packages');
    let winget = [];
    try {
      winget = fs
        .readdirSync(pkgs)
        .filter(d => d.startsWith('yt-dlp.yt-dlp_'))
        .map(d => p.join(pkgs, d, 'yt-dlp.exe'));
    } catch {}
    return [
      p.join(local, 'Microsoft', 'WinGet', 'Links', 'yt-dlp.exe'),
      ...winget,
      p.join(home, '.local', 'bin', 'yt-dlp.exe'),
      p.join(env.SCOOP || p.join(home, 'scoop'), 'shims', 'yt-dlp.exe'),
      p.join(env.ProgramData || 'C:\\ProgramData', 'chocolatey', 'bin', 'yt-dlp.exe'),
    ];
  }
  return [
    '/opt/homebrew/bin/yt-dlp',
    '/usr/local/bin/yt-dlp',
    '/home/linuxbrew/.linuxbrew/bin/yt-dlp',
    p.join(home, '.local', 'bin', 'yt-dlp'),
  ];
};

/**
 * yt-dlp's executable: the first on the PATH, else the first where an installer puts it.
 * { bin, onPath } or null. Only an .exe on Windows: Node and Python start one without a shell.
 */
export const findYtdlp = ({
  platform = process.platform,
  home = os.homedir(),
  env = process.env,
  exists = f => fs.existsSync(f),
} = {}) => {
  const p = pathOf(platform);
  const name = platform === 'win32' ? 'yt-dlp.exe' : 'yt-dlp';
  const dirs = (env.PATH ?? env.Path ?? '')
    .split(platform === 'win32' ? ';' : ':')
    .filter(Boolean);
  for (const d of dirs) {
    const f = p.join(d, name);
    if (exists(f)) return { bin: f, onPath: true };
  }
  for (const f of knownPlaces({ platform, home, env }))
    if (exists(f)) return { bin: f, onPath: false };
  return null;
};

/** The environment to run yt-dlp (or a script that runs it) with: its folder put first on the PATH. */
export const envWith = (found, env = process.env, platform = process.platform) => {
  if (!found || found.onPath) return env;
  const key = Object.keys(env).find(k => k.toUpperCase() === 'PATH') ?? 'PATH';
  return {
    ...env,
    [key]: `${pathOf(platform).dirname(found.bin)}${platform === 'win32' ? ';' : ':'}${env[key] ?? ''}`,
  };
};

/** yt-dlp's version ("2026.10.26", a nightly adds ".123456") as days old on `now`; null when it isn't a date. */
export const ageDays = (version, now = Date.now()) => {
  const m = /^(\d{4})\.(\d{1,2})\.(\d{1,2})/.exec(String(version ?? '').trim());
  if (!m) return null;
  return Math.floor((now - Date.UTC(+m[1], +m[2] - 1, +m[3])) / 86400000);
};

/**
 * Who put this copy here, from where it is (and where it really is, through links): brew, winget,
 * uv, pipx, scoop, choco, or standalone (a binary someone downloaded, which updates itself).
 * `uvTool` says whether uv's tools hold yt-dlp, for a copy in ~/.local/bin that links nowhere
 * (uv and pipx both put Windows copies there).
 */
export const managerOf = (bin, { real = bin, uvTool = () => false } = {}) => {
  const both = `${bin}\n${real}`.replace(/\\/g, '/').toLowerCase();
  if (/\/(cellar|homebrew|linuxbrew)\//.test(both)) return 'brew';
  if (/\/microsoft\/winget\//.test(both)) return 'winget';
  if (/\/uv\/(data\/)?tools\//.test(both)) return 'uv';
  if (/\/pipx\//.test(both)) return 'pipx';
  if (/\/scoop\//.test(both)) return 'scoop';
  if (/\/chocolatey\//.test(both)) return 'choco';
  if (/\/\.local\/bin\/yt-dlp(\.exe)?$/.test(both.split('\n')[0]) && uvTool()) return 'uv';
  return 'standalone';
};

/** A command as a plan mm doctor --fix can run: { what, cmd, args }. */
const plan = (cmd, args) => ({ what: [cmd, ...args].join(' '), cmd, args });

/** The command that updates the copy a manager installed; null when it needs a person (choco: an admin shell). */
export const updatePlan = (manager, bin) =>
  ({
    brew: plan('brew', ['upgrade', 'yt-dlp']),
    winget: plan('winget', ['upgrade', '--id', 'yt-dlp.yt-dlp', '-e', '--source', 'winget']),
    uv: plan('uv', ['tool', 'upgrade', 'yt-dlp']),
    pipx: plan('pipx', ['upgrade', 'yt-dlp']),
    scoop: plan('scoop', ['update', 'yt-dlp']),
    choco: null,
    standalone: { what: 'yt-dlp -U', cmd: bin, args: ['-U'] },
  })[manager] ?? null;

/**
 * The command that installs yt-dlp here, from what this machine has (`has(cmd)`): Homebrew on a Mac,
 * winget on Windows, else uv's tools (uv comes with MediaMake). null when none of them is here.
 */
export const installPlan = ({ platform = process.platform, has, ffmpeg = false }) => {
  if (platform === 'darwin' && has('brew')) return plan('brew', ['install', 'yt-dlp']);
  if (platform === 'win32' && has('winget'))
    return plan('winget', [
      'install',
      '--id',
      'yt-dlp.yt-dlp',
      '-e',
      '--source',
      'winget',
      // winget's yt-dlp brings its own ffmpeg and Deno: with ffmpeg here, Node (which MediaMake has)
      // is yt-dlp's JavaScript runtime instead (--js-runtimes node)
      ...(ffmpeg ? ['--skip-dependencies'] : []),
    ]);
  if (has('uv')) return plan('uv', ['tool', 'install', 'yt-dlp[default]']);
  return null;
};

/** What to tell someone to run when nothing here can install it. */
export const installHint = (platform = process.platform) =>
  platform === 'darwin'
    ? '`brew install yt-dlp` (or `uv tool install "yt-dlp[default]"`)'
    : platform === 'win32'
      ? '`winget install --id yt-dlp.yt-dlp -e` (or `uv tool install "yt-dlp[default]"`)'
      : '`uv tool install "yt-dlp[default]"` (or `pipx install yt-dlp`)';

const WIN = process.platform === 'win32';
const quiet = (cmd, args, o = {}) =>
  spawnSync(cmd, args, { encoding: 'utf8', timeout: 20000, shell: WIN && !/[\\/]/.test(cmd), ...o });

/**
 * Everything mm doctor says about yt-dlp on this machine:
 * { found, version, age, manager, update, install } (found null when it isn't here).
 */
export const inspectYtdlp = ({ has, ffmpeg = false } = {}) => {
  const found = findYtdlp();
  const install = installPlan({ has, ffmpeg });
  if (!found) return { found: null, install };
  const r = quiet(found.bin, ['--version'], { shell: false });
  const version = r.status === 0 ? r.stdout.trim().split('\n')[0] : null;
  let real = found.bin;
  try {
    real = fs.realpathSync(found.bin);
  } catch {}
  const manager = managerOf(found.bin, {
    real,
    uvTool: () => {
      const d = quiet('uv', ['tool', 'dir']);
      return d.status === 0 && fs.existsSync(path.join(d.stdout.trim(), 'yt-dlp'));
    },
  });
  return {
    found,
    version,
    age: ageDays(version),
    manager,
    update: updatePlan(manager, found.bin),
    install,
  };
};
