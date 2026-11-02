/**
 * loop-stats: how the review loop is going, read from the files it leaves behind: every
 * <video>.revisions/ folder under out/, the kept v<N>/ versions and the render log
 * (out/<slug>/.renders.jsonl, written by render-project). Take a baseline now and compare after each
 * phase of the video-revision plan: fewer rounds and renders per video, fewer notes per round.
 *
 * Usage: npm run loop-stats -w lyrics_videos -- [slug …] [--since=2026-10-01] [--json]
 *
 * Per video: rounds (revisions with notes from the user), the user's notes (point / range, how many
 * done), machine notes from preflight, kept versions (each one a full render that was replaced) and
 * the days from the first note to the last. Per production: logged renders (master / half-size
 * review / clip or look) and their minutes. Render minutes count from the first logged render (the
 * log is new).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readRenders, type RenderEntry } from './render-log.ts';
import { REVISIONS_SUFFIX, isMachineNote, readRevisions, type Revision } from './revision-files.ts';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'out');
/** folders under out/ that are not productions */
const NOT_PRODUCTIONS = new Set(['brands', 'youtube', 'posters', 'thumbnails', 'waveform-catalog']);

const args = process.argv.slice(2);
const opt = (name: string) => args.find(a => a.startsWith(`--${name}=`))?.slice(name.length + 3);
const only = args.filter(a => !a.startsWith('--'));
const since = opt('since') ? new Date(opt('since')!).getTime() : 0;
if (Number.isNaN(since)) {
  console.error('--since takes a date: --since=2026-10-01');
  process.exit(1);
}

type VideoStats = {
  project: string;
  /** the video, relative to out/ */
  video: string;
  rounds: number;
  revisions: number;
  resolved: number;
  notes: number;
  point: number;
  range: number;
  general: number;
  done: number;
  machine: number;
  versions: number;
  first: string | null;
  last: string | null;
};

type ProjectRenders = { project: string; master: number; review: number; clip: number; minutes: number };

const dirsIn = (dir: string) => {
  try {
    return fs.readdirSync(dir, { withFileTypes: true }).filter(e => e.isDirectory() && !e.name.startsWith('.'));
  } catch {
    return [];
  }
};

/** every (folder, video name) with revisions or kept versions under a production, outside v<N>/ copies */
function videosIn(projectDir: string): { dir: string; name: string }[] {
  const found = new Map<string, { dir: string; name: string }>();
  const add = (dir: string, name: string) => found.set(path.join(dir, name), { dir, name });
  const walk = (dir: string, depth: number) => {
    for (const e of dirsIn(dir)) {
      const full = path.join(dir, e.name);
      if (e.name.endsWith(REVISIONS_SUFFIX)) add(dir, e.name.slice(0, -REVISIONS_SUFFIX.length));
      else if (/^v\d+$/.test(e.name)) {
        // a kept version: its video (or, once archived, the map and notes that stay behind)
        for (const f of fs.readdirSync(full)) {
          const m = /^(.+?)(\.mp4|\.map\.json|\.revisions)$/.exec(f);
          if (m) add(dir, m[1]);
        }
      } else if (depth < 4) walk(full, depth + 1);
    }
  };
  walk(projectDir, 1);
  return [...found.values()];
}

const inRange = (iso: string | undefined) => !since || (iso ? new Date(iso).getTime() >= since : false);

function statsFor(project: string, dir: string, name: string): VideoStats {
  const revisions: Revision[] = readRevisions(path.join(dir, `${name}${REVISIONS_SUFFIX}`)).filter(r => inRange(r.createdAt));
  const userNotes = revisions.flatMap(r => r.comments.filter(c => !isMachineNote(c)));
  const versions = dirsIn(dir).filter(
    e =>
      /^v\d+$/.test(e.name) &&
      [`${name}.mp4`, `${name}.map.json`, `${name}${REVISIONS_SUFFIX}`].some(f => fs.existsSync(path.join(dir, e.name, f))),
  ).length;
  const stamps = userNotes.map(c => c.createdAt).filter(Boolean).sort();
  return {
    project,
    video: path.relative(OUT, path.join(dir, `${name}.mp4`)).split(path.sep).join('/'),
    rounds: revisions.filter(r => r.comments.some(c => !isMachineNote(c))).length,
    revisions: revisions.length,
    resolved: revisions.filter(r => r.status === 'resolved').length,
    notes: userNotes.length,
    point: userNotes.filter(c => c.kind === 'point').length,
    range: userNotes.filter(c => c.kind === 'range').length,
    general: userNotes.filter(c => c.kind === 'general').length,
    done: userNotes.filter(c => c.status === 'done').length,
    machine: revisions.flatMap(r => r.comments.filter(isMachineNote)).length,
    versions,
    first: stamps[0] ?? null,
    last: stamps.at(-1) ?? null,
  };
}

const projects = dirsIn(OUT)
  .map(e => e.name)
  .filter(n => !n.startsWith('_') && !NOT_PRODUCTIONS.has(n) && (!only.length || only.includes(n)));
const rows: VideoStats[] = [];
const renderRows: ProjectRenders[] = [];
const minutes = (entries: RenderEntry[]) => Math.round(entries.reduce((sum, e) => sum + e.seconds, 0) / 6) / 10;
for (const project of projects) {
  const projectDir = path.join(OUT, project);
  for (const { dir, name } of videosIn(projectDir)) {
    const s = statsFor(project, dir, name);
    if (s.revisions || s.versions) rows.push(s);
  }
  const renders = readRenders(path.join(projectDir, '.renders.jsonl')).filter(e => e.ok && inRange(e.at));
  if (renders.length)
    renderRows.push({
      project,
      master: renders.filter(e => !e.frames && !e.look && e.scale >= 1).length,
      review: renders.filter(e => !e.frames && !e.look && e.scale < 1).length,
      clip: renders.filter(e => e.frames || e.look).length,
      minutes: minutes(renders),
    });
}
rows.sort((a, b) => a.video.localeCompare(b.video, undefined, { numeric: true }));

const sum = (key: 'rounds' | 'notes' | 'point' | 'range' | 'general' | 'done' | 'machine' | 'versions' | 'revisions') => rows.reduce((t, r) => t + r[key], 0);
const totals = {
  videos: rows.length,
  reviewed: rows.filter(r => r.rounds).length,
  rounds: sum('rounds'),
  notes: sum('notes'),
  point: sum('point'),
  range: sum('range'),
  general: sum('general'),
  done: sum('done'),
  machine: sum('machine'),
  versions: sum('versions'),
  renderMinutes: Math.round(renderRows.reduce((t, r) => t + r.minutes, 0) * 10) / 10,
  notesPerRound: sum('rounds') ? Math.round((sum('notes') / sum('rounds')) * 10) / 10 : 0,
  roundsPerReviewedVideo: rows.filter(r => r.rounds).length ? Math.round((sum('rounds') / rows.filter(r => r.rounds).length) * 10) / 10 : 0,
  versionsPerVideo: rows.length ? Math.round((sum('versions') / rows.length) * 10) / 10 : 0,
};

if (args.includes('--json')) {
  console.log(JSON.stringify({ since: opt('since') ?? null, at: new Date().toISOString(), totals, videos: rows, renders: renderRows }, null, 2));
  process.exit(0);
}
if (!rows.length && !renderRows.length) {
  console.log(`No revisions, kept versions or logged renders under ${path.relative(process.cwd(), OUT) || OUT}${only.length ? ` for ${only.join(', ')}` : ''}.`);
  process.exit(0);
}

const day = (iso: string | null) => (iso ? iso.slice(0, 10) : '');
const span = (r: VideoStats) => {
  if (!r.first || !r.last) return '';
  const days = Math.round((new Date(r.last).getTime() - new Date(r.first).getTime()) / 86_400_000);
  return `${day(r.first)} → ${day(r.last)} (${days} d)`;
};
const header = ['video', 'rounds', 'notes', 'per round', 'point/range/general', 'done', 'machine', 'versions', 'first → last note'];
const table = rows.map(r => [
  r.video,
  String(r.rounds),
  String(r.notes),
  r.rounds ? (r.notes / r.rounds).toFixed(1) : '',
  `${r.point}/${r.range}/${r.general}`,
  r.notes ? `${Math.round((r.done / r.notes) * 100)}%` : '',
  String(r.machine),
  String(r.versions),
  span(r),
]);
/** a fixed-width table: the first and last columns left-aligned, numbers right-aligned */
const print = (head: string[], body: string[][]) => {
  const widths = head.map((h, i) => Math.max(h.length, ...body.map(row => row[i].length)));
  const line = (cells: string[]) =>
    cells.map((c, i) => (i === 0 || (i === cells.length - 1 && i > 4) ? c.padEnd(widths[i]) : c.padStart(widths[i]))).join('  ').trimEnd();
  console.log(line(head));
  for (const row of body) console.log(line(row));
};
if (rows.length) print(header, table);
if (renderRows.length) {
  console.log('');
  print(
    ['production', 'master', 'review', 'clip/look', 'render min'],
    renderRows.map(r => [r.project, String(r.master), String(r.review), String(r.clip), String(r.minutes)]),
  );
}
const n = (count: number, word: string) => `${count} ${word}${count === 1 ? '' : 's'}`;
console.log(
  `\n${n(totals.videos, 'video')}, ${totals.reviewed} reviewed in the Revisions screen: ${n(totals.rounds, 'round')} ` +
    `(${totals.roundsPerReviewedVideo} per reviewed video), ${n(totals.notes, 'note')} (${totals.notesPerRound} per round, ` +
    `${totals.point} point / ${totals.range} range / ${totals.general} general), ${n(totals.machine, 'machine note')}, ${n(totals.versions, 'kept version')} ` +
    `(${totals.versionsPerVideo} per video)${totals.renderMinutes ? `, ${totals.renderMinutes} render minutes logged` : ''}.` +
    `${since ? ` Since ${opt('since')}.` : ''}`,
);
