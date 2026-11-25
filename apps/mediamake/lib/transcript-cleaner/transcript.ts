import { getSubdir, readFileIn, REVISIONS_DIR_SUFFIX } from '@/lib/revisions/fs';
import { moveRuns } from './lines';
import { AUDIO_EXTENSIONS, CLEAN_FILE, MARK_LABELS, TRANSCRIPT_SUFFIX, type LineEdit, type LineMove, type Place, type SongEntry, type TLine, type TranscriptFile, type TranscriptRevision, type TWord } from './types';

/** A word this long (seconds) is flagged: the aligner sometimes stretches a word's start or end across a gap or an instrumental. */
export const LONG_WORD = 2.5;
/** A long word's quick trim leaves it this long. */
export const TRIM_TO = 0.8;
/** Words overlapping by less than this (seconds) still share a lane. */
const OVERLAP_EPS = 0.005;
/** In a gap between two lines, the next line shows this long before it's sung. */
export const COMING_UP = 1.5;

/** "3:23.45" */
export function clock(s: number, decimals = 2): string {
  if (!Number.isFinite(s)) return '–';
  const m = Math.floor(s / 60);
  const rest = s - m * 60;
  return `${m}:${rest.toFixed(decimals).padStart(decimals ? decimals + 3 : 2, '0')}`;
}

/** The transcript's words (type "word"), numbered in order. */
export function wordsOf(doc: TranscriptFile): TWord[] {
  const out: TWord[] = [];
  for (const w of doc.words ?? []) {
    if ((w.type ?? 'word') !== 'word') continue;
    out.push({
      i: out.length,
      text: w.text,
      start: Number(w.start),
      end: Number(w.end),
      stanza: w.stanza,
      line: w.line,
      verified: w.verified,
      confidence: w.confidence,
    });
  }
  return out;
}

/**
 * The words as a revision has them: the times as moved (`times`, by index), and its rewrites, line moves and deletions.
 * A word moved to another line keeps the place the transcript has it on as `home`.
 */
export function revisedWords(base: TWord[], times: TWord[], rev: TranscriptRevision | null): TWord[] {
  const rewrites = new Map((rev?.rewrites ?? []).map(r => [r.i, r.to]));
  const moves = new Map((rev?.lineMoves ?? []).map(m => [m.i, m.to]));
  const deleted = new Set((rev?.deleted ?? []).map(d => d.i));
  return base.map(b => {
    const t = times[b.i] ?? b;
    const to = moves.get(b.i);
    return {
      ...b,
      start: t.start,
      end: t.end,
      text: rewrites.get(b.i) ?? b.text,
      ...(to ? { stanza: to.stanza, line: to.line, home: { stanza: b.stanza, line: b.line } } : {}),
      ...(deleted.has(b.i) ? { deleted: true } : {}),
    };
  });
}

const placeKey = (p: Place) => `${p.stanza}.${p.line}`;

/** Words grouped into the transcript's lines (stanza + line), with what the transcript says to check on each. */
export function linesOf(words: TWord[], doc: TranscriptFile): TLine[] {
  const lines: TLine[] = [];
  let key = '';
  for (const w of words) {
    const k = w.stanza !== undefined || w.line !== undefined ? `${w.stanza ?? 0}.${w.line ?? 0}` : `w${Math.floor(w.i / 8)}`;
    if (k !== key || !lines.length) {
      lines.push({ key: `${k}#${lines.length}`, stanza: w.stanza, line: w.line, text: '', words: [], start: w.start, end: w.end });
      key = k;
    }
    const l = lines[lines.length - 1];
    l.words.push(w);
    l.start = Math.min(l.start, w.start);
    l.end = Math.max(l.end, w.end);
  }
  for (const l of lines) {
    l.text = l.words.map(w => w.text).join(' ');
    // a check is about the line the transcript has: it stays with those words when a revision re-lines them
    const homes = new Map<string, number>();
    for (const w of l.words) {
      const h = placeKey(w.home ?? w);
      homes.set(h, Math.min(homes.get(h) ?? Infinity, w.start));
    }
    const c = (doc.check ?? []).find(x => {
      const start = homes.get(placeKey(x));
      return start !== undefined && (x.at === undefined || Math.abs(x.at - start) < 5);
    });
    if (c?.why?.length) l.check = c.why;
  }
  return lines;
}

const lineIndexCache = new WeakMap<TLine[], Map<number, number>>();

/** Which line (its index in `lines`) each word is on. */
function lineIndexes(lines: TLine[]): Map<number, number> {
  let map = lineIndexCache.get(lines);
  if (!map) {
    map = new Map();
    lines.forEach((l, n) => l.words.forEach(w => map!.set(w.i, n)));
    lineIndexCache.set(lines, map);
  }
  return map;
}

export function lineOf(lines: TLine[], word: TWord | null): TLine | null {
  if (!word) return null;
  const n = lineIndexes(lines).get(word.i);
  return n === undefined ? null : lines[n];
}

/**
 * What the stage shows at `t` (audio time plus the lead): singing, the words sounding now (several when voices
 * overlap); pause, between two words of one line; coming, the next line shown just before it's sung; gap, an
 * instrumental or a long break after a line (nothing lit, the line dims); before and after the song's words.
 */
export type MomentMode = 'singing' | 'pause' | 'coming' | 'gap' | 'before' | 'after';

export interface Moment {
  /** The line on stage (an index in `lines`). */
  line: number;
  mode: MomentMode;
  /** Every word sounding at `t`, by index. */
  active: number[];
  /** The word the user means at `t`: the latest one sounding, else the last one sung, else the first. */
  word: TWord | null;
  /** The next word to start after `t`. */
  next: TWord | null;
}

/** Words are scanned in full: times moved on the timeline may overlap or change their order. Deleted words don't sound. */
export function momentAt(words: TWord[], lines: TLine[], t: number): Moment {
  const active: number[] = [];
  let latest: TWord | null = null;
  let prev: TWord | null = null;
  let next: TWord | null = null;
  for (const w of words) {
    if (w.deleted) continue;
    if (w.start <= t) {
      if (t < w.end) {
        active.push(w.i);
        if (!latest || w.start >= latest.start) latest = w;
      }
      if (!prev || w.start >= prev.start) prev = w;
    } else if (!next || w.start < next.start) next = w;
  }
  const at = lineIndexes(lines);
  const lineIx = (w: TWord) => at.get(w.i) ?? 0;
  if (latest) return { line: lineIx(latest), mode: 'singing', active, word: latest, next };
  if (!prev) return { line: next ? lineIx(next) : 0, mode: 'before', active, word: next, next };
  if (!next) return { line: lineIx(prev), mode: 'after', active, word: prev, next };
  const pl = lineIx(prev);
  const nl = lineIx(next);
  if (pl === nl) return { line: pl, mode: 'pause', active, word: prev, next };
  if (next.start - t <= COMING_UP) return { line: nl, mode: 'coming', active, word: prev, next };
  return { line: pl, mode: 'gap', active, word: prev, next };
}

/** The word the user means at `t` (see Moment.word). */
export function wordNear(words: TWord[], lines: TLine[], t: number): TWord | null {
  return momentAt(words, lines, t).word;
}

/** A lane for each word on the timeline: words that overlap stack in lanes, the rest share the first. */
export function lanesOf(words: TWord[]): { lane: Map<number, number>; count: number } {
  const order = [...words].sort((a, b) => a.start - b.start || a.i - b.i);
  const ends: number[] = [];
  const lane = new Map<number, number>();
  for (const w of order) {
    let k = ends.findIndex(e => e <= w.start + OVERLAP_EPS);
    if (k < 0) {
      k = ends.length;
      ends.push(w.end);
    } else ends[k] = w.end;
    lane.set(w.i, k);
  }
  return { lane, count: ends.length };
}

/** Words long enough to be stretched across a gap (see LONG_WORD), in song order. */
export function longWords(words: TWord[]): TWord[] {
  return words.filter(w => !w.deleted && w.end - w.start >= LONG_WORD).sort((a, b) => a.start - b.start);
}

/** Words pushed to the next or previous line on their own (not by a split or a join). */
export const pushedWords = (rev: TranscriptRevision | null) => (rev?.lineMoves ?? []).filter(m => !m.by);

/** How many changes a revision holds: marks, moved, deleted, rewritten and pushed words, and lines split or joined. */
export function changeCount(rev: TranscriptRevision | null): number {
  if (!rev) return 0;
  const relined = (rev.lineMoves ?? []).some(m => m.by);
  const lineEdits = rev.lineEdits?.length || (relined ? 1 : 0);
  return rev.marks.length + rev.timings.length + (rev.deleted?.length ?? 0) + (rev.rewrites?.length ?? 0) + pushedWords(rev).length + lineEdits;
}

const stemOf = (name: string) => name.slice(0, -TRANSCRIPT_SUFFIX.length);

type DirValues = { values(): AsyncIterable<FileSystemHandle> };

/** The transcripts in one folder, each with the audio of the same name, and whether it is marked clean. */
async function songsIn(dir: FileSystemDirectoryHandle, folder: string): Promise<SongEntry[]> {
  const names: string[] = [];
  const dirs = new Set<string>();
  for await (const entry of (dir as unknown as DirValues).values()) {
    if (entry.name.startsWith('.')) continue;
    if (entry.kind === 'file') names.push(entry.name);
    else dirs.add(entry.name);
  }
  names.sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  const out: SongEntry[] = [];
  for (const name of names) {
    if (!name.endsWith(TRANSCRIPT_SUFFIX)) continue;
    const stem = stemOf(name);
    const audio = AUDIO_EXTENSIONS.map(ext => names.find(n => n.toLowerCase() === (stem + ext).toLowerCase())).find(Boolean) ?? null;
    const song: SongEntry = { id: `${folder}/${name}`, title: stem, folder, transcript: name, audio };
    // only a song with a revisions folder can be marked clean: one more look, for those only
    if (dirs.has(revisionsDirOf(song))) song.clean = await isClean(dir, song).catch(() => false);
    out.push(song);
  }
  return out;
}

/** Whether the song's revisions folder holds clean.json. */
export async function isClean(dir: FileSystemDirectoryHandle, song: SongEntry): Promise<boolean> {
  const revDir = await getSubdir(dir, revisionsDirOf(song), false);
  return !!revDir && !!(await readFileIn(revDir, CLEAN_FILE));
}

/**
 * The songs in an opened folder: its own transcripts, or those of the folders inside it (a channel folder:
 * Downloads/GIZ/<song>/<audio>.transcript.json). Folders named `_…` or `.…` or ending in `.revisions` are skipped.
 */
export async function scanSongs(root: FileSystemDirectoryHandle, onProgress?: (done: number, total: number) => void): Promise<SongEntry[]> {
  const own = await songsIn(root, '');
  if (own.length) return own;
  const subdirs: FileSystemDirectoryHandle[] = [];
  for await (const entry of (root as unknown as DirValues).values()) {
    if (entry.kind === 'directory' && !entry.name.startsWith('_') && !entry.name.startsWith('.') && !entry.name.endsWith(REVISIONS_DIR_SUFFIX)) subdirs.push(entry as FileSystemDirectoryHandle);
  }
  subdirs.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
  const out: SongEntry[] = [];
  let done = 0;
  // a few folders at a time: a channel folder holds a hundred songs or more
  const queue = subdirs.slice();
  const found: SongEntry[][] = new Array(subdirs.length);
  await Promise.all(
    Array.from({ length: 6 }, async () => {
      while (queue.length) {
        const dir = queue.shift()!;
        found[subdirs.indexOf(dir)] = await songsIn(dir, dir.name).catch(() => []);
        onProgress?.(++done, subdirs.length);
      }
    }),
  );
  for (const f of found) if (f) out.push(...f);
  return out;
}

export function revisionsDirOf(song: SongEntry): string {
  return `${song.title}.transcript${REVISIONS_DIR_SUFFIX}`;
}

const REV = /^rev-(\d+)\.json$/;
export const revisionFileName = (id: string) => `${id}.json`;
export const revisionIdOf = (n: number) => `rev-${String(n).padStart(3, '0')}`;
export const revisionNumber = (name: string) => Number(REV.exec(name)?.[1] ?? 0);

const placeOf = (p: Place) => `stanza ${p.stanza ?? '–'} line ${p.line ?? '–'}`;
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

/** How line numbers change when a line is split or joined, for Claude (the rule on LineEdit). */
export const LINE_NUMBERING =
  'Line numbers: a split numbers the new line one after the line it leaves and moves every later line of that stanza down one; a join gives the joined line the place of the line above and moves every later line of its stanza up one. Stanza numbers never change. Every word this touches is listed under "Words that belong to another line" with its new place: write those as they are, and move the transcript\'s check entries (by stanza and line) the same way so each stays with its words.';

/** A split or a join in words. */
export function lineEditText(e: LineEdit): string {
  const stanza = e.at.stanza !== undefined ? ` of stanza ${e.at.stanza}` : '';
  const later = (dir: string) => (e.renumbered ? `; the ${plural(e.renumbered, 'later line')}${stanza} moved ${dir} one` : '');
  if (e.kind === 'split') return `Split ${placeOf(e.at)} "${e.line}" before word #${e.i} "${e.text}": "${e.toLine}" became ${placeOf(e.to)}${later('down')}.`;
  return `Joined ${placeOf(e.at)} "${e.line}" (from word #${e.i} "${e.text}") onto the end of ${placeOf(e.to)} "${e.toLine}"${later('up')}.`;
}

const WHY: Record<NonNullable<LineMove['by']> | 'push', string> = { push: 'pushed', split: 'split off', join: 'joined to the line above', renumber: 'renumbered' };

/** What to paste in chat for Claude: every mark, moved, deleted, rewritten and re-lined word, with the exact times. */
export function instructionsOf(rev: TranscriptRevision): string {
  const where = rev.path ? `${rev.path}/${rev.transcript}` : `${rev.folder ? rev.folder + '/' : ''}${rev.transcript}`;
  const lines = [
    `Transcript revision ${rev.id} · ${rev.song}`,
    `Transcript: ${where}`,
    `Words were shown ${rev.lead.toFixed(2)} s ahead of the sound while reviewing (display only; times below are audio times).`,
    `Word numbers (#) count the transcript's words (type "word") from 0, as the file is now: apply every change below by those numbers, and delete words last.`,
    '',
  ];
  const marks = [...rev.marks].sort((a, b) => a.at - b.at);
  if (marks.length) {
    lines.push(`Marks (${marks.length}):`);
    marks.forEach((m, n) => {
      const word = m.word ? ` · word #${m.word.i} "${m.word.text}" (${m.word.start.toFixed(2)}–${m.word.end.toFixed(2)} s)` : '';
      const line = m.line ? ` · line "${m.line.text}"` : '';
      lines.push(`${n + 1}. ${clock(m.at)} · ${MARK_LABELS[m.kind]}${word}${line}${m.note.trim() ? ` · ${m.note.trim()}` : ''}`);
    });
    lines.push('');
  }
  const timings = [...rev.timings].sort((a, b) => a.to.start - b.to.start);
  if (timings.length) {
    lines.push(`Word times changed on the timeline (${timings.length}), to write into the transcript as they are:`);
    for (const t of timings) {
      lines.push(`- word #${t.i} "${t.text}": ${t.from.start.toFixed(3)}–${t.from.end.toFixed(3)} → ${t.to.start.toFixed(3)}–${t.to.end.toFixed(3)} s`);
    }
    lines.push('');
  }
  const rewrites = [...(rev.rewrites ?? [])].sort((a, b) => a.i - b.i);
  if (rewrites.length) {
    lines.push(`Words to rewrite (${rewrites.length}), their times kept (a rewrite of several words splits the word's time between them):`);
    for (const r of rewrites) lines.push(`- word #${r.i} "${r.from}" → "${r.to}"`);
    lines.push('');
  }
  const edits = rev.lineEdits ?? [];
  if (edits.length) {
    lines.push(`Lines split and joined (${edits.length}), in the order done:`);
    edits.forEach((e, n) => lines.push(`${n + 1}. ${lineEditText(e)}`));
    lines.push(LINE_NUMBERING);
    lines.push('');
  }
  const moves = rev.lineMoves ?? [];
  if (moves.length) {
    lines.push(`Words that belong to another line (${moves.length}): set their stanza and line exactly as listed (their order and times stay):`);
    for (const run of moveRuns(moves)) {
      const [m, last] = [run[0], run[run.length - 1]];
      const who = run.length === 1 ? `word #${m.i} "${m.text}"` : `words #${m.i}–#${last.i} "${run.map(x => x.text).join(' ')}"`;
      lines.push(`- ${who}: ${placeOf(m.from)} → ${placeOf(m.to)} (${WHY[m.by ?? 'push']}; the line "${m.toLine}")`);
    }
    lines.push('');
  }
  const deleted = [...(rev.deleted ?? [])].sort((a, b) => a.i - b.i);
  if (deleted.length) {
    lines.push(`Words to delete (${deleted.length}), not sung: remove each word and the spacing entry after it:`);
    for (const d of deleted) lines.push(`- word #${d.i} "${d.text}" (${d.start.toFixed(2)}–${d.end.toFixed(2)} s)`);
    lines.push('');
  }
  if (!changeCount(rev)) lines.push('No changes yet.');
  lines.push(`Saved as ${rev.folder ? rev.folder + '/' : ''}${rev.song}.transcript.revisions/${rev.id}.json`);
  return lines.join('\n');
}

/** The revision as Markdown, saved beside its JSON for reading in Finder. */
export function revisionToMarkdown(rev: TranscriptRevision): string {
  return `# ${rev.song} · ${rev.id} (${rev.status})\n\n\`\`\`\n${instructionsOf(rev)}\n\`\`\`\n`;
}
