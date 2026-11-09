/**
 * render-queue: one render at a time on this machine, first come first served, across every session.
 * Two renders at once each took twice as long (remix shorts on 2026-11-03: 3.7 s per video second
 * alongside another render, 1.7 alone), so a second render now waits for the first and both finish
 * sooner than side by side (refactor step B1, from the 0b baseline).
 *
 * A render takes a ticket, a file in ~/.mediamake/render-queue/ named by when it asked, and starts
 * when its ticket is the oldest left. A ticket whose process is gone (crashed, killed) is dropped, so
 * nothing blocks forever. mm render, mm stills and mm lyric-shorts render wait here; --no-queue (or
 * MM_RENDER_QUEUE=off) skips it. `mm render-queue` shows what is running and waiting.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { alive, onExit, readJson, sleep } from './locks.ts';

export const QUEUE_DIR = process.env.MM_RENDER_QUEUE_DIR ?? path.join(os.homedir(), '.mediamake', 'render-queue');
/** A ticket older than this is dropped even if its pid is alive again (pids are reused after a crash). */
const STALE_MS = 6 * 60 * 60 * 1000;

type Ticket = { pid: number; what: string; at: string; cwd: string };
type Entry = Ticket & { file: string; startedAt?: string };

const tickets = (): Entry[] => {
  let names: string[] = [];
  try {
    names = fs.readdirSync(QUEUE_DIR).filter(n => /^\d+-\d+\.json$/.test(n)).sort();
  } catch {
    return [];
  }
  const out: Entry[] = [];
  for (const name of names) {
    const file = path.join(QUEUE_DIR, name);
    const t = readJson<Ticket & { startedAt?: string }>(file);
    const pid = Number(name.split('-')[1].replace('.json', ''));
    const old = t ? Date.now() - Date.parse(t.at) > STALE_MS : false;
    if (!alive(pid) || old) {
      fs.rmSync(file, { force: true });
      continue;
    }
    // a ticket still being written: count it, its details come on the next look
    out.push({ pid, what: t?.what ?? '…', at: t?.at ?? new Date().toISOString(), cwd: t?.cwd ?? '', startedAt: t?.startedAt, file });
  }
  return out;
};

const ago = (iso: string) => {
  const s = Math.max(0, Math.round((Date.now() - Date.parse(iso)) / 1000));
  return s < 90 ? `${s} s` : `${Math.round(s / 60)} min`;
};

export const queueDisabled = (args: string[] = []) => args.includes('--no-queue') || process.env.MM_RENDER_QUEUE === 'off';

/**
 * Waits for this machine's render slot (the oldest live ticket), then returns its release. Every
 * render this process starts until release runs in the same slot. Released on exit too.
 */
export async function renderSlot(what: string, opts: { disabled?: boolean; quiet?: boolean } = {}): Promise<() => void> {
  if (opts.disabled) return () => {};
  fs.mkdirSync(QUEUE_DIR, { recursive: true });
  const file = path.join(QUEUE_DIR, `${String(Date.now()).padStart(15, '0')}-${process.pid}.json`);
  const ticket: Ticket = { pid: process.pid, what, at: new Date().toISOString(), cwd: process.cwd() };
  fs.writeFileSync(file, JSON.stringify(ticket));
  const release = () => {
    fs.rmSync(file, { force: true });
    removeHook();
  };
  const removeHook = onExit(release);
  let shown = '';
  const waitStart = Date.now();
  for (;;) {
    const all = tickets();
    const mine = all.findIndex(t => t.file === file);
    if (mine <= 0) break;
    const head = all[0];
    const line = `Waiting for the render slot: ${head.what} (pid ${head.pid}, running ${ago(head.startedAt ?? head.at)})${mine > 1 ? `, then ${mine - 1} more` : ''}. --no-queue skips the wait.`;
    if (line.replace(/running [^)]*/, '') !== shown && !opts.quiet) {
      console.log(line);
      shown = line.replace(/running [^)]*/, '');
    }
    await sleep(1000);
  }
  if (shown && !opts.quiet) console.log(`Render slot free after ${ago(new Date(waitStart).toISOString())}.`);
  fs.writeFileSync(file, JSON.stringify({ ...ticket, startedAt: new Date().toISOString() }));
  return release;
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  // mm render-queue: what runs and what waits
  const all = tickets();
  if (!all.length) console.log('No render running or waiting.');
  for (const [i, t] of all.entries()) {
    console.log(`${i === 0 ? 'running' : `waiting ${i}`}  ${t.what}  (pid ${t.pid}, ${i === 0 ? `started ${ago(t.startedAt ?? t.at)} ago` : `asked ${ago(t.at)} ago`})`);
  }
}
