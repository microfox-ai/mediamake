import { listFileNames, REVISIONS_DIR_SUFFIX } from '@/lib/revisions/fs';
import { AUDIO_EXTENSIONS, MARK_LABELS, TRANSCRIPT_SUFFIX, type SongEntry, type TLine, type TranscriptFile, type TranscriptRevision, type TWord } from './types';

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
    const c = (doc.check ?? []).find(x => x.stanza === l.stanza && x.line === l.line && (x.at === undefined || Math.abs(x.at - l.start) < 5));
    if (c?.why?.length) l.check = c.why;
  }
  return lines;
}

/** The word sung at `t` (or the last one before it), by index. */
export function wordAt(words: TWord[], t: number): TWord | null {
  let lo = 0;
  let hi = words.length - 1;
  let found: TWord | null = null;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (words[mid].start <= t) {
      found = words[mid];
      lo = mid + 1;
    } else hi = mid - 1;
  }
  return found;
}

export function lineOf(lines: TLine[], word: TWord | null): TLine | null {
  if (!word) return null;
  return lines.find(l => l.words.some(w => w.i === word.i)) ?? null;
}

const stemOf = (name: string) => name.slice(0, -TRANSCRIPT_SUFFIX.length);

type DirValues = { values(): AsyncIterable<FileSystemHandle> };

/** The transcripts in one folder, each with the audio of the same name. */
async function songsIn(dir: FileSystemDirectoryHandle, folder: string): Promise<SongEntry[]> {
  const names = await listFileNames(dir);
  const out: SongEntry[] = [];
  for (const name of names) {
    if (!name.endsWith(TRANSCRIPT_SUFFIX)) continue;
    const stem = stemOf(name);
    const audio = AUDIO_EXTENSIONS.map(ext => names.find(n => n.toLowerCase() === (stem + ext).toLowerCase())).find(Boolean) ?? null;
    out.push({ id: `${folder}/${name}`, title: stem, folder, transcript: name, audio });
  }
  return out;
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

/** What to paste in chat for Claude: every mark and every moved word, with the exact times. */
export function instructionsOf(rev: TranscriptRevision): string {
  const where = rev.path ? `${rev.path}/${rev.transcript}` : `${rev.folder ? rev.folder + '/' : ''}${rev.transcript}`;
  const lines = [`Transcript revision ${rev.id} · ${rev.song}`, `Transcript: ${where}`, `Words were shown ${rev.lead.toFixed(2)} s ahead of the sound while reviewing (display only; times below are audio times).`, ''];
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
  if (!marks.length && !timings.length) lines.push('No marks or timing changes yet.');
  lines.push(`Saved as ${rev.folder ? rev.folder + '/' : ''}${rev.song}.transcript.revisions/${rev.id}.json`);
  return lines.join('\n');
}

/** The revision as Markdown, saved beside its JSON for reading in Finder. */
export function revisionToMarkdown(rev: TranscriptRevision): string {
  return `# ${rev.song} · ${rev.id} (${rev.status})\n\n\`\`\`\n${instructionsOf(rev)}\n\`\`\`\n`;
}
