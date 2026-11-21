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

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const args = process.argv.slice(2);
  const version = args.find(a => !a.startsWith('--')) ?? STUDIO_PYTHON;
  console.log(
    findPython(version, { install: args.includes('--install') }).python,
  );
}
