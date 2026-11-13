/**
 * File and process helpers for the library commands: hashing, APFS clones, moves, the render check
 * and a lock so two heavy commands never run at once (the Mac overheats).
 */
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { pipeline } from 'node:stream/promises';
import { fileURLToPath } from 'node:url';

export const size = (b: number) => (b >= 1e9 ? `${(b / 1e9).toFixed(1)} GB` : b >= 1e6 ? `${Math.round(b / 1e6)} MB` : b ? `${Math.round(b / 1e3)} KB` : '-');
export const pad = (s: string, n: number) => (s.length >= n ? s : s + ' '.repeat(n - s.length));
export const lpad = (s: string, n: number) => (s.length >= n ? s : ' '.repeat(n - s.length) + s);
export const now = () => new Date().toISOString();
export const sleep = (ms: number) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);

export const sha256File = async (file: string) => {
  const h = createHash('sha256');
  await pipeline(fs.createReadStream(file, { highWaterMark: 1 << 22 }), async (src: AsyncIterable<Buffer>) => {
    for await (const chunk of src) h.update(chunk);
  });
  return h.digest('hex');
};
export const sha256Text = (s: string) => createHash('sha256').update(s).digest('hex');

/** Lowercase kebab: "Zoro Twixtor Clips (4K)" → "zoro-twixtor-clips-4k". */
export const slug = (s: string, max = 60) =>
  s
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, max)
    .replace(/-+$/g, '');

/** A path that doesn't exist yet: name.ext, name-2.ext, name-3.ext… */
export const freePath = (file: string) => {
  if (!fs.existsSync(file)) return file;
  const ext = path.extname(file);
  const base = file.slice(0, file.length - ext.length);
  for (let n = 2; ; n++) if (!fs.existsSync(`${base}-${n}${ext}`)) return `${base}-${n}${ext}`;
};

/**
 * An APFS clone: same bytes, no extra space until one side changes, and each file stands on its
 * own (deleting either never breaks the other, unlike a link). A plain copy where cloning can't work.
 */
export const clone = (src: string, dest: string) => {
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  try {
    execFileSync('cp', ['-c', '-p', src, dest], { stdio: 'pipe' });
  } catch {
    fs.copyFileSync(src, dest);
  }
};

/** An APFS clone or nothing (false): never a full copy, for copies that are only there to be looked at. */
export const cloneOnly = (src: string, dest: string) => {
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  try {
    execFileSync('cp', ['-c', '-p', src, dest], { stdio: 'pipe' });
    return true;
  } catch {
    fs.rmSync(dest, { force: true });
    return false;
  }
};

/** Clone a folder's contents into dest (merged with what is there). */
export const cloneTree = (src: string, dest: string) => {
  fs.mkdirSync(dest, { recursive: true });
  try {
    execFileSync('cp', ['-c', '-R', '-p', `${src.replace(/\/+$/, '')}/`, dest], { stdio: 'pipe' });
  } catch {
    fs.cpSync(src, dest, { recursive: true });
  }
};

/** Rename (instant on one disk); across disks copy, check the hash, then remove the original. */
export const move = async (src: string, dest: string) => {
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  try {
    fs.renameSync(src, dest);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== 'EXDEV') throw err;
    fs.copyFileSync(src, dest);
    if ((await sha256File(src)) !== (await sha256File(dest))) {
      fs.rmSync(dest, { force: true });
      throw new Error(`copy of ${src} didn't check out; left it where it was`);
    }
    fs.rmSync(src);
  }
};

/** Write through a temp file so a crash never leaves half a JSON file. */
export const writeJson = (file: string, data: unknown) => {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2) + '\n');
  fs.renameSync(tmp, file);
};
export const readJson = <T>(file: string): T | null => {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8')) as T;
  } catch {
    return null;
  }
};

/**
 * Every running process's command line: `ps -axo` on macOS and Linux. Windows has no such ps (Git
 * Bash's doesn't take -x), so there PowerShell gives each process's CommandLine.
 */
export const commandLines = (): string[] =>
  (process.platform === 'win32'
    ? execFileSync(
        'powershell.exe',
        ['-NoProfile', '-NonInteractive', '-Command', 'Get-CimInstance Win32_Process | ForEach-Object { $_.CommandLine }'],
        { maxBuffer: 1 << 26, windowsHide: true },
      )
    : execFileSync('ps', ['-axo', 'command='], { maxBuffer: 1 << 26 })
  )
    .toString()
    .split(/\r?\n/)
    .filter(Boolean);

/** Renders, stills and Studio (the same check cleanup-out uses before touching bundles); paths with / or \. */
export const rendering = () =>
  commandLines().filter(l => /remotion (render|studio|still|bundle)|scripts[\\/](render|stills|wave-lab|thumbs|brand|logos|lyric-shorts|remix|shorts)\.ts|analysis[\\/]pipeline\.py|matte\.py/.test(l));

/** Hold heavy work while something renders: two heavy jobs at once overheat the Mac. */
export const waitForRenders = (log: (s: string) => void) => {
  let told = false;
  while (rendering().length) {
    if (!told) log('… waiting: a render or analysis is running');
    told = true;
    sleep(30_000);
  }
};

/** APFS clone ids (clones.py): files with the same id already share their bytes. Empty when it can't tell (no python3, not macOS). */
export const cloneIds = (files: string[]) => {
  const ids = new Map<string, string>();
  if (process.platform !== 'darwin' || !files.length) return ids;
  try {
    const script = path.join(path.dirname(fileURLToPath(import.meta.url)), 'clones.py');
    const out = execFileSync('python3', ['-I', script], { input: files.join('\n'), maxBuffer: 1 << 28, stdio: ['pipe', 'pipe', 'ignore'] });
    for (const line of out.toString().split('\n')) {
      const tab = line.indexOf('\t');
      if (tab > 0 && line.slice(0, tab) !== '-') ids.set(line.slice(tab + 1), line.slice(0, tab));
    }
  } catch {
    // without it every copy counts as its own bytes, as before
  }
  return ids;
};

/** Is another program holding the file open (a render reading it, a download writing it)? */
export const isOpen = (file: string) => {
  try {
    return execFileSync('lsof', ['-t', '--', file], { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim().length > 0;
  } catch {
    return false; // lsof exits 1 when nobody has it open
  }
};

/** Every file a program holds open right now, from one lsof call (for checking many files at once). */
export const openFiles = () => {
  let out: string;
  try {
    out = execFileSync('lsof', ['-n', '-P', '-F', 'n'], { maxBuffer: 1 << 28, stdio: ['ignore', 'pipe', 'ignore'] }).toString();
  } catch (err) {
    // lsof exits 1 when it can't read some processes; what it printed is still right
    out = (err as { stdout?: Buffer }).stdout?.toString() ?? '';
  }
  return new Set(out.split('\n').filter(l => l.startsWith('n/')).map(l => l.slice(1)));
};

/** One heavy library command at a time. Returns a release function. */
export const lock = (dir: string, name: string) => {
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `${name}.lock`);
  const pid = Number(fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : 0);
  if (pid && pid !== process.pid) {
    try {
      process.kill(pid, 0);
      throw new Error(`another library command is running (pid ${pid}); try again when it ends`);
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== 'ESRCH') throw err;
    }
  }
  fs.writeFileSync(file, String(process.pid));
  const release = () => fs.rmSync(file, { force: true });
  process.once('exit', release);
  return release;
};
