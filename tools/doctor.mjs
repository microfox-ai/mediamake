#!/usr/bin/env node
/**
 * mm doctor: is this machine ready to make videos with MediaMake? It checks, and with --fix repairs
 * what is safe to repair on its own:
 *   - Node (22.6 or newer: the studio's scripts run TypeScript directly), npm, git and who commits
 *   - uv (mm analyze, mattes, cutouts and the ElevenLabs MCP run on it), ffmpeg (optional)
 *   - node_modules against package-lock.json (fix: npm ci), the built @microfox/remotion (fix: build
 *     it), the studio's generated presets (fix: build them), Remotion's browser (fix: download it)
 *   - mm on your PATH, for this checkout (fix: mm link)
 *   - the checkout's git state (tools/git-health.mjs), your workspace, ~/.mediamake/config.json and the
 *     media library, your own skills (skills.mjs tidy) and the ElevenLabs key mm transcribe uses
 *
 *   mm doctor               the report; exit 1 when something fails
 *   mm doctor --fix         also runs the fixes marked (--fix): installs, builds, downloads, mm link.
 *                           Never git, and never your files: those fixes are printed for you to run.
 *   mm doctor --json        the checks as JSON
 *   --no-fetch              git state from the last fetch (also MEDIAMAKE_GIT_FETCH=0)
 *   --dir=<path>            another checkout
 *
 * Plain JavaScript that runs on old Node too, so it can say that Node is too old.
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const WIN = process.platform === 'win32';
const NPM = WIN ? 'npm.cmd' : 'npm';
const NPX = WIN ? 'npx.cmd' : 'npx';
/** The oldest Node the studio's scripts run on (--experimental-strip-types). */
export const MIN_NODE = [22, 6];
/** Less free space than this on the workspace's disk is a warning: one render's frames and stems. */
const LOW_DISK = 10 * 2 ** 30;

const tilde = p =>
  p && p.startsWith(os.homedir()) ? `~${p.slice(os.homedir().length)}` : p;
const run = (cmd, args, o = {}) =>
  spawnSync(cmd, args, { encoding: 'utf8', shell: WIN, timeout: 20000, ...o });
const version = (cmd, args = ['--version']) => {
  const r = run(cmd, args);
  return r.status === 0 ? (r.stdout || r.stderr).trim().split('\n')[0] : null;
};
const readJson = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const gib = n => `${(n / 2 ** 30).toFixed(n < 10 * 2 ** 30 ? 1 : 0)} GB`;

/** Node "22.6.0" against MIN_NODE. */
export const nodeOk = (v = process.versions.node) => {
  const [maj, min] = v.split('.').map(Number);
  return maj > MIN_NODE[0] || (maj === MIN_NODE[0] && min >= MIN_NODE[1]);
};

/**
 * Packages whose installed version isn't the lockfile's: the lockfile's `packages` against npm's own
 * record of node_modules (node_modules/.package-lock.json). Optional packages for other platforms
 * are never installed, so they don't count when they are missing.
 */
export const lockDrift = (lock, installed) => {
  const have = installed?.packages ?? {};
  const out = [];
  for (const [key, want] of Object.entries(lock?.packages ?? {})) {
    if (!key.includes('node_modules/') || want.link || want.inBundle) continue;
    const got = have[key];
    if (!got) {
      if (!want.optional && !want.devOptional && !want.peer)
        out.push(key.replace(/^.*node_modules\//, ''));
      continue;
    }
    if (got.version !== want.version)
      out.push(key.replace(/^.*node_modules\//, ''));
  }
  return [...new Set(out)];
};

/** The newest file under dir (ms), skipping node_modules and dot folders. */
const newest = dir => {
  let t = 0;
  const walk = d => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      if (e.name === 'node_modules' || e.name.startsWith('.')) continue;
      const p = path.join(d, e.name);
      if (e.isDirectory()) walk(p);
      else t = Math.max(t, fs.statSync(p).mtimeMs);
    }
  };
  if (fs.existsSync(dir)) walk(dir);
  return t;
};

/** Every `mm` on your PATH, first one first (not npm's node_modules/.bin, which only `npm run` adds). */
const mmOnPath = () =>
  (process.env.PATH ?? '')
    .split(path.delimiter)
    .filter(d => d && !/[\\/]node_modules[\\/]\.bin[\\/]?$/.test(d))
    .map(d => path.join(d, WIN ? 'mm.cmd' : 'mm'))
    .filter(f => fs.existsSync(f));

/** Every check: { id, level: ok|info|warn|fail, text, fix?, auto? } (auto: what --fix runs). */
export async function checks({ top, fetch = true } = {}) {
  const out = [];
  const add = (id, level, text, fix = '', auto = null) =>
    out.push({ id, level, text, fix, auto });
  const APP = path.join(top, 'apps', 'studio');

  // ── tools on this machine
  const node = process.versions.node;
  if (nodeOk(node)) add('node', 'ok', `Node ${node}`);
  else
    add(
      'node',
      'fail',
      `Node ${node}: the studio's scripts need ${MIN_NODE.join('.')} or newer (they run TypeScript directly)`,
      'Install Node 22 or newer: nodejs.org, `brew install node`, or `nvm install 22`.',
    );
  const npm = version(NPM);
  if (npm) add('npm', 'ok', `npm ${npm}`);
  else
    add('npm', 'fail', 'npm is missing', 'It comes with Node: reinstall Node.');
  const gitV = version('git');
  if (!gitV)
    add(
      'git',
      'fail',
      'git is missing',
      process.platform === 'darwin'
        ? '`xcode-select --install`, or `brew install git`.'
        : 'Install git.',
    );
  else {
    const who = [
      run('git', ['config', 'user.name'], { cwd: top }).stdout?.trim(),
      run('git', ['config', 'user.email'], { cwd: top }).stdout?.trim(),
    ];
    if (who[0] && who[1])
      add(
        'git',
        'ok',
        `${gitV.replace(/^git version /, 'git ')}, committing as ${who[0]} <${who[1]}>`,
      );
    else
      add(
        'git',
        'warn',
        `${gitV}, but git doesn't know who you are, so mm update, mm notes promote and skill publishing can't commit`,
        '`git config --global user.name "Your Name"` and `git config --global user.email you@example.com`.',
      );
  }
  const uv = version('uv');
  if (uv) add('uv', 'ok', uv);
  else
    add(
      'uv',
      'warn',
      'uv is missing: mm analyze, mattes, cutouts and the ElevenLabs MCP run on it',
      process.platform === 'darwin'
        ? '`brew install uv`'
        : '`curl -LsSf https://astral.sh/uv/install.sh | sh`',
    );
  const ffmpeg = version('ffmpeg', ['-version']);
  if (ffmpeg) add('ffmpeg', 'ok', ffmpeg.replace(/ Copyright.*$/, ''));
  else
    add(
      'ffmpeg',
      'info',
      "ffmpeg isn't on your PATH: the review scripts use the copy that came with npm",
      process.platform === 'darwin'
        ? '`brew install ffmpeg` for your own.'
        : '',
    );

  // ── this checkout's dependencies and built files
  const lockFile = path.join(top, 'package-lock.json');
  const nm = path.join(top, 'node_modules');
  const npmCi = { what: 'npm ci', cmd: NPM, args: ['ci'], cwd: top };
  if (!fs.existsSync(nm))
    add(
      'deps',
      'fail',
      'node_modules is missing: nothing in the studio or the app runs',
      '`npm ci` at the repo root.',
      npmCi,
    );
  else if (fs.existsSync(lockFile)) {
    let drift = null;
    try {
      drift = lockDrift(
        readJson(lockFile),
        readJson(path.join(nm, '.package-lock.json')),
      );
    } catch {}
    if (drift === null)
      add(
        'deps',
        'info',
        "node_modules is there, but npm's record of it is missing, so it can't be compared with the lockfile",
        '`npm ci` installs exactly the lockfile.',
        npmCi,
      );
    else if (drift.length)
      add(
        'deps',
        'warn',
        `node_modules doesn't match package-lock.json: ${drift.length} package${drift.length === 1 ? '' : 's'} (${drift.slice(0, 4).join(', ')}${drift.length > 4 ? ', …' : ''})`,
        '`npm ci` at the repo root (never npm install on main: it rewrites the lockfile).',
        npmCi,
      );
    else add('deps', 'ok', 'node_modules matches package-lock.json');
  }

  const remotion = path.join(top, 'packages', 'remotion');
  if (fs.existsSync(path.join(remotion, 'package.json'))) {
    const main = path.join(
      remotion,
      readJson(path.join(remotion, 'package.json')).main ?? 'dist/index.js',
    );
    const build = {
      what: 'npm run build -w @microfox/remotion',
      cmd: NPM,
      args: ['run', 'build', '-w', '@microfox/remotion'],
      cwd: top,
    };
    if (!fs.existsSync(main))
      add(
        'remotion',
        'fail',
        "@microfox/remotion isn't built: the studio and the app import its dist/",
        '`npm run build -w @microfox/remotion`',
        build,
      );
    else if (newest(path.join(remotion, 'src')) > fs.statSync(main).mtimeMs)
      add(
        'remotion',
        'warn',
        '@microfox/remotion changed since it was last built',
        '`npm run build -w @microfox/remotion`',
        build,
      );
    else add('remotion', 'ok', '@microfox/remotion is built and current');
  }

  if (fs.existsSync(path.join(APP, 'scripts', 'generated.mjs'))) {
    try {
      const gen = await import(
        pathToFileURL(path.join(APP, 'scripts', 'generated.mjs')).href
      );
      const why = gen.presetsStale(APP);
      if (!why)
        add(
          'presets',
          'ok',
          "the studio's mediamake presets are built and current",
        );
      else
        add(
          'presets',
          'warn',
          `the studio's mediamake presets need building (${why})`,
          '`mm sync-presets` (any mm command does it too)',
          {
            what: 'mm sync-presets',
            fn: () => gen.ensurePresets(APP, { quiet: true }),
          },
        );
    } catch (e) {
      add('presets', 'warn', `couldn't check the presets: ${e.message}`);
    }
  }

  const browserDir = path.join(
    APP,
    'node_modules',
    '.remotion',
    'chrome-headless-shell',
  );
  if (process.env.MM_BROWSER) {
    if (fs.existsSync(process.env.MM_BROWSER))
      add(
        'browser',
        'ok',
        `renders use MM_BROWSER (${tilde(process.env.MM_BROWSER)})`,
      );
    else
      add(
        'browser',
        'fail',
        `MM_BROWSER names ${process.env.MM_BROWSER}, which isn't there`,
        'Point MM_BROWSER at a Chrome Headless Shell, or unset it so Remotion uses its own.',
      );
  } else if (fs.existsSync(browserDir) && fs.readdirSync(browserDir).length)
    add('browser', 'ok', "Remotion's browser is downloaded");
  else
    add(
      'browser',
      'info',
      "Remotion's browser isn't downloaded yet: the first render gets it (about 100 MB)",
      '`npx remotion browser ensure` in apps/studio gets it now.',
      {
        what: 'npx remotion browser ensure',
        cmd: NPX,
        args: ['remotion', 'browser', 'ensure'],
        cwd: APP,
      },
    );

  const self = path.join(APP, 'bin', 'mm.mjs');
  if (fs.existsSync(self)) {
    const link = {
      what: 'mm link',
      cmd: process.execPath,
      args: [self, 'link'],
      cwd: top,
    };
    const found = mmOnPath();
    const real = f => {
      try {
        return fs.realpathSync(f);
      } catch {
        return f;
      }
    };
    // mm link's launcher names this checkout's mm.mjs; a symlink to it is fine too
    const here = f =>
      real(f) === real(self) || fs.readFileSync(f, 'utf8').includes(self);
    const ours = found.find(
      f => here(f) || fs.readFileSync(f, 'utf8').includes("MediaMake's mm"),
    );
    if (!found.length)
      add(
        'mm',
        'warn',
        "mm isn't on your PATH: the skills run mm <command>",
        '`npm run mm -- link` at the repo root.',
        link,
      );
    else if (!ours)
      add(
        'mm',
        'info',
        `${found[0]} is another program called mm`,
        "`npm run mm -- link --dir=<a folder early on your PATH>` puts MediaMake's there.",
      );
    else if (!here(ours))
      add(
        'mm',
        'warn',
        `mm runs another checkout (${tilde(ours)} doesn't point here)`,
        '`npm run mm -- link` here, if this is the checkout you use.',
        link,
      );
    else add('mm', 'ok', `mm on your PATH runs this checkout (${tilde(ours)})`);
  }

  // ── the checkout's git state
  try {
    const { inspect } = await import(
      pathToFileURL(path.join(HERE, 'git-health.mjs')).href
    );
    const r = inspect(top, { fetch });
    if (r) {
      const level = { stop: 'fail', warn: 'warn', info: 'info' };
      for (const i of r.issues)
        add('git-state', level[i.level] ?? 'info', i.text, i.fix);
      if (!r.issues.length)
        add(
          'git-state',
          'ok',
          `the checkout is on ${r.branch ?? r.sha}, ${r.onMain ? 'clean and up to date with GitHub' : 'with nothing left unpushed'}`,
        );
    }
  } catch (e) {
    add('git-state', 'warn', `couldn't check git: ${e.message}`);
  }

  // ── your workspace, config and library
  const configFile =
    process.env.MEDIAMAKE_CONFIG ??
    path.join(os.homedir(), '.mediamake', 'config.json');
  let config = null;
  if (fs.existsSync(configFile)) {
    try {
      config = readJson(configFile);
      add('config', 'ok', `${tilde(configFile)} reads`);
    } catch (e) {
      add(
        'config',
        'fail',
        `${tilde(configFile)} isn't valid JSON (${e.message}): nothing can read your workspace, library or keys`,
        'Fix the file by hand (keep every key).',
      );
    }
  }
  try {
    const { workspaceSetting } = await import(
      pathToFileURL(path.join(HERE, 'workspace.mjs')).href
    );
    const set = workspaceSetting();
    if (!set)
      add(
        'workspace',
        'info',
        'no workspace set yet: your projects, renders and brand kits are in apps/studio, inside the checkout',
        '`mm migrate` shows the move to ~/MediaMake (nothing moves until `mm migrate --yes`).',
      );
    else if (!fs.existsSync(set.root))
      add(
        'workspace',
        'fail',
        `your workspace, ${tilde(set.root)}, is missing`,
        `Reconnect its disk, or \`mm migrate --to=<folder>\` to set another.`,
      );
    else {
      try {
        fs.accessSync(set.root, fs.constants.W_OK);
        let free = null;
        try {
          const s = fs.statfsSync(set.root);
          free = s.bavail * s.bsize;
        } catch {}
        if (free !== null && free < LOW_DISK)
          add(
            'workspace',
            'warn',
            `your workspace, ${tilde(set.root)}, has ${gib(free)} free: renders need room`,
            'Clear old renders (`mm cleanup-out`) or move the workspace (`mm migrate --to=<folder>`).',
          );
        else
          add(
            'workspace',
            'ok',
            `your workspace is ${tilde(set.root)}${free !== null ? ` (${gib(free)} free)` : ''}`,
          );
      } catch {
        add(
          'workspace',
          'fail',
          `your workspace, ${tilde(set.root)}, can't be written to`,
          'Check its permissions.',
        );
      }
    }
  } catch (e) {
    add('workspace', 'warn', `couldn't check the workspace: ${e.message}`);
  }
  if (config) {
    const lib =
      typeof config.library === 'string'
        ? config.library.replace(/^~(?=$|\/)/, os.homedir())
        : null;
    if (!lib)
      add(
        'library',
        'info',
        'no media library on this machine yet',
        '`mm media init` sets one up (`mm media help`).',
      );
    else if (!fs.existsSync(lib))
      add(
        'library',
        'warn',
        `the media library, ${tilde(lib)}, is missing`,
        'Reconnect its disk, or fix "library" in the config.',
      );
    else add('library', 'ok', `the media library is ${tilde(lib)}`);
  }

  // ── your skills
  try {
    const { tidySteps } = await import(
      pathToFileURL(path.join(HERE, 'skills.mjs')).href
    );
    const { steps, notes } = tidySteps();
    for (const n of notes) add('skills', 'info', n);
    if (steps.length)
      add(
        'skills',
        'info',
        `${steps.length} thing${steps.length === 1 ? '' : 's'} to tidy in your skills (${steps
          .map(s => s.what.split(':')[0])
          .slice(0, 2)
          .join('; ')}${steps.length > 2 ? '; …' : ''})`,
        '`node tools/skills.mjs tidy` shows them, `--yes` does them.',
      );
    else if (!notes.length)
      add('skills', 'ok', 'your skills are linked and tidy');
  } catch (e) {
    add('skills', 'warn', `couldn't check your skills: ${e.message}`);
  }

  // ── the ElevenLabs key mm transcribe uses (the studio's own finder; needs a Node that runs TypeScript)
  const eleven = path.join(APP, 'scripts', 'elevenlabs.ts');
  if (nodeOk(node) && fs.existsSync(eleven)) {
    const r = run(
      process.execPath,
      [
        '--experimental-strip-types',
        '--no-warnings=ExperimentalWarning',
        '--input-type=module',
        '-e',
        `const m = await import(${JSON.stringify(pathToFileURL(eleven).href)}); const k = m.findElevenLabsKey(); console.log(k ? k.from : '');`,
      ],
      { cwd: APP, shell: false },
    );
    const from = r.status === 0 ? r.stdout.trim() : null;
    if (from)
      add(
        'elevenlabs',
        'ok',
        `mm transcribe has an ElevenLabs key (from ${from})`,
      );
    else if (from === '')
      add(
        'elevenlabs',
        'warn',
        'mm transcribe has no ElevenLabs key: lyric videos need timed words',
        'Add the local ElevenLabs MCP with your key: `claude mcp add --scope user elevenlabs -e ELEVENLABS_API_KEY=<your key> -- uvx elevenlabs-mcp` (keys: https://elevenlabs.io/app/settings/api-keys).',
      );
    else
      add(
        'elevenlabs',
        'info',
        `couldn't look for the ElevenLabs key: ${(r.stderr || '').trim().split('\n').pop()}`,
      );
  }
  return out;
}

const MARK = { ok: '✔', info: '·', warn: '!', fail: '✗' };

/** The report as lines. */
export const report = (list, top) => {
  const lines = [`mm doctor: ${tilde(top)}`, ''];
  for (const c of list) {
    lines.push(`  ${MARK[c.level]} ${c.text}`);
    if (c.level !== 'ok' && c.fix)
      lines.push(`      ${c.fix}${c.auto ? ' (mm doctor --fix does it)' : ''}`);
  }
  const n = l => list.filter(c => c.level === l).length;
  const fails = n('fail');
  const warns = n('warn');
  const autos = list.filter(c => c.level !== 'ok' && c.auto).length;
  lines.push('');
  if (!fails && !warns) lines.push('✔ Ready.');
  else
    lines.push(
      `${[fails && `${fails} to fix`, warns && `${warns} to look at`].filter(Boolean).join(', ')}.${autos ? ' mm doctor --fix runs the fixes it can do itself.' : ''}`,
    );
  return lines;
};

/** Runs the automatic fixes of the checks that need one; returns what ran. */
export const fixAll = (list, { log = console.log } = {}) => {
  const ran = [];
  for (const c of list) {
    if (c.level === 'ok' || !c.auto) continue;
    log(`→ ${c.auto.what}`);
    let ok;
    if (c.auto.fn) {
      try {
        c.auto.fn();
        ok = true;
      } catch (e) {
        log(`  ✗ ${e.message}`);
        ok = false;
      }
    } else {
      const r = spawnSync(c.auto.cmd, c.auto.args, {
        cwd: c.auto.cwd,
        stdio: 'inherit',
        shell: WIN && c.auto.cmd !== process.execPath,
      });
      ok = r.status === 0;
      if (!ok) log(`  ✗ ${c.auto.what} failed`);
    }
    ran.push({ id: c.id, what: c.auto.what, ok });
  }
  return ran;
};

/**
 * The whole doctor: { list, failed }. With fix, fixes first and then checks again; fixOnly limits the
 * fixes to those check ids (mm update rebuilds what a pull made stale, and installs nothing new).
 */
export async function doctor({
  top,
  fetch = true,
  fix = false,
  fixOnly = null,
  json = false,
  log = console.log,
} = {}) {
  let list = await checks({ top, fetch });
  const todo = list.filter(
    c => c.level !== 'ok' && c.auto && (!fixOnly || fixOnly.includes(c.id)),
  );
  if (fix && todo.length) {
    fixAll(todo, { log });
    log('');
    list = await checks({ top, fetch: false });
  }
  if (json)
    log(
      JSON.stringify(
        list.map(({ auto, ...c }) => ({ ...c, auto: auto?.what ?? null })),
        null,
        2,
      ),
    );
  else for (const l of report(list, top)) log(l);
  return { list, failed: list.some(c => c.level === 'fail') };
}

/** The checkout this file is in, or --dir's. */
export const topOf = dir => {
  const r = run('git', ['rev-parse', '--show-toplevel'], {
    cwd: dir,
    shell: false,
  });
  return r.status === 0 ? r.stdout.trim() : path.resolve(HERE, '..');
};

/** The comment at the top of this file, for --help. */
const usage = () =>
  fs
    .readFileSync(fileURLToPath(import.meta.url), 'utf8')
    .match(/\/\*\*\n([\s\S]*?)\*\//)[1]
    .split('\n')
    .map(l => l.replace(/^ \* ?/, ''))
    .join('\n')
    .trim();

/** --help prints the usage; a flag it doesn't know stops it, so a typo never runs the wrong thing. */
const checkArgs = (args, known, name) => {
  if (args.includes('--help') || args.includes('-h')) {
    console.log(usage());
    process.exit(0);
  }
  const bad = args.filter(a => !known.includes(a) && !a.startsWith('--dir='));
  if (bad.length) {
    console.error(`${name}: no option ${bad.join(', ')}. --help lists them.`);
    process.exit(2);
  }
};

if (
  process.argv[1] &&
  fs.realpathSync(path.resolve(process.argv[1])) ===
    fs.realpathSync(fileURLToPath(import.meta.url))
) {
  const args = process.argv.slice(2);
  checkArgs(args, ['--fix', '--json', '--no-fetch'], 'mm doctor');
  const dir = args.find(a => a.startsWith('--dir='))?.slice('--dir='.length);
  const fetch =
    !args.includes('--no-fetch') && process.env.MEDIAMAKE_GIT_FETCH !== '0';
  doctor({
    top: topOf(dir ?? path.resolve(HERE, '..')),
    fetch,
    fix: args.includes('--fix'),
    json: args.includes('--json'),
  })
    .then(r => process.exit(r.failed ? 1 : 0))
    .catch(e => {
      console.error(`✗ mm doctor: ${e.message}`);
      process.exit(1);
    });
}
