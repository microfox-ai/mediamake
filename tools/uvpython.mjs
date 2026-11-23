/**
 * The Python a uv tool runs on when its wheels lag behind the newest Python. A plain
 * `uv run --with …` takes the newest interpreter uv has, and onnxruntime (under rembg's cutouts:
 * mm thumbs cutout and swap, mm kinetictype cutout) has no build for the newest one (3.15 in
 * 2026-11), so those runs pin STUDIO_PYTHON, the version the analysis project pins too
 * (apps/studio/analysis/pyproject.toml).
 *
 * findPython() says what to pass to `uv run --python`:
 *   1. the interpreter `uv python find 3.12` names, the usual case;
 *   2. else the newest cpython-3.12.<n> folder in uv's own Python folder (`uv python dir`), by its
 *      path. On some Windows computers uv can't follow its own minor-version link
 *      (cpython-3.12-windows-…, a junction) and calls every "3.12" missing, while the folder's
 *      python.exe runs fine;
 *   3. else, with `install`, after `uv python install 3.12` (uv fetches it once, about 20 MB);
 *   4. else "3.12" itself, so uv says why it can't.
 *
 *   node tools/uvpython.mjs [version] [--install]   prints it (kinetictype's cli.py asks this way)
 *
 * A script with its own packages (`# /// script` metadata, `uv run --script`) that caps Python
 * (`requires-python = ">=3.11,<3.13"`, for torch and the like) hits the same missing link: uv looks
 * for "a 3.12" and fails before the script starts. scriptArgs() gives `uv run` the newest version
 * the cap allows, by path, and runScript() runs one that way, in UTF-8 (Windows writes a pipe in its
 * ANSI code page, which has no ✔):
 *
 *   node tools/uvpython.mjs run <script.py> [args…]  `mm py <script.py> [args…]`; paths are
 *                                                    relative to the folder you are in
 *
 * Plain JavaScript that runs on old Node too (mm doctor imports it).
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/** The Python the studio's uv tools run on: onnxruntime, torch and the analysis project all have builds for it. */
export const STUDIO_PYTHON = '3.12';

/** Node's process.arch as uv names it in its folders (cpython-3.12.16-macos-aarch64-none). */
const UV_ARCH = { x64: 'x86_64', arm64: 'aarch64', ia32: 'x86' };

const uv = args => {
  const r = spawnSync('uv', args, { encoding: 'utf8', timeout: 300000 });
  return { status: r.status, stdout: r.stdout ?? '' };
};

/**
 * The interpreters of `version` in uv's Python folder (cpython-3.12.<n>-…, never the minor-version
 * link or a free-threaded build): this machine's architecture first, then the newest patch.
 */
export const managedPythons = (
  dir,
  version = STUDIO_PYTHON,
  {
    platform = process.platform,
    arch = process.arch,
    exists = fs.existsSync,
    list = d => fs.readdirSync(d),
  } = {},
) => {
  if (!dir) return [];
  const p = platform === 'win32' ? path.win32 : path.posix;
  const re = new RegExp(`^cpython-${version.replace(/\./g, '\\.')}\\.(\\d+)-`);
  let names;
  try {
    names = list(dir);
  } catch {
    return [];
  }
  const mine = `-${UV_ARCH[arch] ?? arch}-`;
  return names
    .map(name => ({ name, patch: Number(re.exec(name)?.[1]) }))
    .filter(x => Number.isInteger(x.patch))
    .sort(
      (a, b) =>
        Number(b.name.includes(mine)) - Number(a.name.includes(mine)) ||
        b.patch - a.patch,
    )
    .map(x =>
      platform === 'win32'
        ? p.join(dir, x.name, 'python.exe')
        : p.join(dir, x.name, 'bin', 'python3'),
    )
    .filter(f => exists(f));
};

/**
 * What to pass to `uv run --python` for `version`, and how it was found:
 * found (uv names it), path (by its folder: uv can't use it by version here), installed, or
 * missing (the version itself, so uv says why).
 */
export const findPython = (
  version = STUDIO_PYTHON,
  { install = false, run = uv, ...o } = {},
) => {
  const find = () => {
    // --system: never an active or nearby virtual environment
    const r = run(['python', 'find', '--system', '--no-project', version]);
    return (r.status === 0 && r.stdout.trim().split(/\r?\n/).pop()) || null;
  };
  const byPath = () => {
    const r = run(['python', 'dir']);
    return r.status === 0
      ? (managedPythons(r.stdout.trim(), version, o)[0] ?? null)
      : null;
  };
  let python = find();
  if (python) return { python, how: 'found' };
  python = byPath();
  if (python) return { python, how: 'path' };
  if (install) {
    // where uv can't follow its link, the install itself ends in that error, after the files are in place
    run(['python', 'install', version]);
    python = find() ?? byPath();
    if (python) return { python, how: 'installed' };
  }
  return { python: version, how: 'missing' };
};

/** `--python <it>` for `uv run`, fetching the version once when uv has none. */
export const pythonArgs = (version = STUDIO_PYTHON) => [
  '--python',
  findPython(version, { install: true }).python,
];

/**
 * The newest Python 3 minor version a script's inline metadata allows (`# /// script`, its
 * requires-python): "<3.13" and "<=3.12" and "==3.12.*" all say 3.12. Null when it sets no upper
 * bound, or has no metadata: uv's newest Python is fine there.
 */
export const cappedPython = text => {
  const block = /^# \/\/\/ script\s*$([\s\S]*?)^# \/\/\/\s*$/m.exec(text)?.[1] ?? '';
  const spec = /^#\s*requires-python\s*=\s*["']([^"']*)["']/m.exec(block)?.[1];
  if (!spec) return null;
  const caps = spec.split(',').flatMap(s => {
    const m = /^\s*(<=|<|==)\s*3\.(\d+)(\.[\d*]+)?\s*$/.exec(s);
    if (!m) return [];
    const minor = Number(m[2]);
    // "<3.13" excludes 3.13 itself; "<3.12.4" still allows 3.12.0–3.12.3
    return [m[1] === '<' && !m[3] ? minor - 1 : minor];
  });
  return caps.length ? `3.${Math.min(...caps)}` : null;
};

/**
 * `uv run` arguments for a script with its own metadata: `--python <path>` when it caps Python (by
 * path, so it works where uv can't follow its minor-version link), then `--script <file>`.
 */
export const scriptArgs = (file, { read = f => fs.readFileSync(f, 'utf8'), ...o } = {}) => {
  let version = null;
  try {
    version = cappedPython(read(file));
  } catch {}
  const pin = version ? ['--python', findPython(version, { install: true, ...o }).python] : [];
  return [...pin, '--script', file];
};

/**
 * Runs a script with its own metadata through uv (scriptArgs), from the folder you are in (npm's
 * INIT_CWD under mm), in UTF-8, and exits with its status.
 */
export const runScript = (file, args = []) => {
  const cwd = process.env.INIT_CWD ?? process.cwd();
  const abs = path.resolve(cwd, file ?? '');
  if (!file || !fs.existsSync(abs)) {
    console.error(
      file
        ? `mm py: no ${file} here (${cwd}); paths are relative to the folder you are in`
        : 'Usage: mm py <script.py> [args…]   (a Python script with its own # /// script metadata)',
    );
    process.exit(1);
  }
  const r = spawnSync('uv', ['run', ...scriptArgs(abs), ...args], {
    cwd,
    stdio: 'inherit',
    env: { ...process.env, PYTHONUTF8: process.env.PYTHONUTF8 ?? '1' },
  });
  if (r.error) throw r.error;
  process.exit(r.status ?? 1);
};

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const args = process.argv.slice(2);
  if (args[0] === 'run') runScript(args[1], args.slice(2));
  else {
    const version = args.find(a => !a.startsWith('--')) ?? STUDIO_PYTHON;
    console.log(
      findPython(version, { install: args.includes('--install') }).python,
    );
  }
}
