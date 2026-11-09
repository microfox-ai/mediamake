/**
 * locks: small cross-process helpers for the render scripts. A lock or a queue ticket is a file
 * holding the pid that owns it; one whose process is gone is stale and taken over, so a render
 * that crashed or was killed never blocks the next one.
 */
import fs from 'node:fs';
import path from 'node:path';

export const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/** Whether a process with this pid is running (on this machine). */
export function alive(pid: number): boolean {
  if (!Number.isInteger(pid) || pid <= 0) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch (err) {
    // EPERM: it runs, as another user
    return (err as NodeJS.ErrnoException).code === 'EPERM';
  }
}

/** Reads a JSON file another process may be replacing; null when it is missing or half written. */
export function readJson<T>(file: string): T | null {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8')) as T;
  } catch {
    return null;
  }
}

/** Writes JSON so a reader never sees half a file: a temp file beside it, then a rename. */
export function writeJsonAtomic(file: string, value: unknown) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, `${JSON.stringify(value, null, 2)}\n`);
  fs.renameSync(tmp, file);
}

const exitHooks = new Set<() => void>();
let hooked = false;
/** Runs `fn` when the process ends, however it ends (exit, Ctrl-C, kill). Returns a remover. */
export function onExit(fn: () => void): () => void {
  if (!hooked) {
    hooked = true;
    const runAll = () => {
      for (const f of [...exitHooks]) {
        try {
          f();
        } catch {
          // best effort: the process is ending
        }
      }
      exitHooks.clear();
    };
    process.on('exit', runAll);
    for (const signal of ['SIGINT', 'SIGTERM', 'SIGHUP'] as const) {
      process.once(signal, () => {
        runAll();
        process.kill(process.pid, signal);
      });
    }
  }
  exitHooks.add(fn);
  return () => exitHooks.delete(fn);
}

type LockFile = { pid: number; at: string; what?: string };

/**
 * Takes the lock file (created exclusively), waiting while a live process holds it. A lock whose
 * process is gone is taken over. Returns the release function; the lock is also released on exit.
 */
export async function acquireLock(file: string, what: string, opts: { onWait?: (holder: LockFile) => void; pollMs?: number } = {}): Promise<() => void> {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  let told = false;
  for (;;) {
    try {
      const fd = fs.openSync(file, 'wx');
      fs.writeSync(fd, JSON.stringify({ pid: process.pid, at: new Date().toISOString(), what } satisfies LockFile));
      fs.closeSync(fd);
      const release = () => {
        const holder = readJson<LockFile>(file);
        if (holder?.pid === process.pid) fs.rmSync(file, { force: true });
        removeHook();
      };
      const removeHook = onExit(release);
      return release;
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== 'EEXIST') throw err;
    }
    const holder = readJson<LockFile>(file);
    if (!holder || !alive(holder.pid)) {
      // a crashed holder, or one still writing its pid: take over only when the file is a few seconds old
      const age = (() => {
        try {
          return Date.now() - fs.statSync(file).mtimeMs;
        } catch {
          return Infinity;
        }
      })();
      if (holder || age > 5000) {
        fs.rmSync(file, { force: true });
        continue;
      }
    } else if (!told) {
      told = true;
      opts.onWait?.(holder);
    }
    await sleep(opts.pollMs ?? 400);
  }
}
