/**
 * render-log: render-project appends one line per render to out/<slug>/.renders.jsonl (when, which
 * file, at what scale, how long it took), so loop-stats can count render minutes and other scripts
 * can tell a half-size review render from the master. A dot file: the Revisions screen and
 * cleanup-out leave it alone.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'out');

export type RenderEntry = {
  at: string;
  /** the output, relative to apps/lyrics_videos (out/<slug>/<slug>.mp4) */
  video: string;
  /** 1 for the master, below 1 for a review render (--proxy) */
  scale: number;
  /** the --frames range of a clip (null: to the end) */
  frames?: [number, number | null];
  /** the --look of a look preview */
  look?: string;
  seconds: number;
  ok: boolean;
  /** set when the render ran on Remotion Lambda (scripts/lambda.ts); costUsd is Lambda compute only */
  lambda?: { region: string; renderId: string; functionName: string; lambdas: number; costUsd: number; through: 'mediamake' | 'aws'; /** the slowest chunk's seconds per frame (scripts/lambda.ts sizes the next render's chunks from it) */ slowestChunkSecondsPerFrame?: number };
};

/** out/<slug>/.renders.jsonl for any file under out/<slug>/ */
export function renderLogFor(videoPath: string): string | null {
  const rel = path.relative(OUT, path.resolve(videoPath));
  if (rel.startsWith('..') || path.isAbsolute(rel)) return null;
  const project = rel.split(path.sep)[0];
  return project ? path.join(OUT, project, '.renders.jsonl') : null;
}

export function appendRender(videoPath: string, entry: Omit<RenderEntry, 'video'>) {
  const log = renderLogFor(videoPath);
  if (!log) return;
  fs.mkdirSync(path.dirname(log), { recursive: true });
  const line: RenderEntry = { ...entry, video: path.relative(ROOT, path.resolve(videoPath)).split(path.sep).join('/') };
  fs.appendFileSync(log, `${JSON.stringify(line)}\n`);
}

export function readRenders(logFile: string): RenderEntry[] {
  if (!fs.existsSync(logFile)) return [];
  return fs
    .readFileSync(logFile, 'utf8')
    .split('\n')
    .filter(Boolean)
    .flatMap(line => {
      try {
        return [JSON.parse(line) as RenderEntry];
      } catch {
        return [];
      }
    });
}

/** The last finished render of this file, or null when none was logged (renders from before the log). */
export function lastRender(videoPath: string): RenderEntry | null {
  const log = renderLogFor(videoPath);
  if (!log) return null;
  const rel = path.relative(ROOT, path.resolve(videoPath)).split(path.sep).join('/');
  return readRenders(log).filter(e => e.ok && e.video === rel).at(-1) ?? null;
}
