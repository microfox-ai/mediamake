'use client';

import { create } from 'zustand';
import { toast } from 'sonner';
import { isAbortError } from '@/lib/local-media/file-access';
import { getFolderSupport, getSubdir, listFileNames, pickFolder, readFileIn, readJsonIn, removeFileIn, requestReadWrite, writeFileIn } from '@/lib/revisions/fs';
import { openDevFolder } from '@/lib/remaster-revisions/dev-folder';
import { waveformPeaks } from '@/lib/remaster-revisions/loudness';
import {
  changeCount,
  instructionsOf,
  linesOf,
  momentAt,
  revisionFileName,
  revisionIdOf,
  revisionNumber,
  revisionsDirOf,
  revisionToMarkdown,
  scanSongs,
  TRIM_TO,
  wordNear,
  wordsOf,
} from '@/lib/transcript-cleaner/transcript';
import { CLEAN_FILE, type CleanMark, type LineMove, type Mark, type MarkKind, type SongEntry, type TLine, type TranscriptFile, type TranscriptRevision, type TWord } from '@/lib/transcript-cleaner/types';

/*
 * State for /transcript-cleaner: the opened folder and the songs in it (and which are marked clean), the song being
 * cleaned (its words, lines, audio and waveform), playback, the open revision (marks, moved words, and words deleted,
 * rewritten or pushed to another line), and saving that revision beside the transcript. The transcript file itself is
 * never written: Claude applies a revision when the user pastes it.
 */

export type Support = 'checking' | 'ok' | 'insecure' | 'browser';
export type SaveState = 'idle' | 'saving' | 'saved' | 'error';

const PEAKS_PER_SECOND = 100;
/** The shortest a word can be dragged to. */
export const MIN_WORD = 0.04;
export const RATES = [0.5, 0.75, 1];
export const SPANS = [3, 5, 8, 12, 20, 40];
/** Where the playhead sits in the timeline while it follows the song (share of the width). */
export const FOLLOW_AT = 0.3;

interface Root {
  handle: FileSystemDirectoryHandle;
  name: string;
  /** Absolute path when opened by path through the dev server. */
  path?: string;
}

export interface OpenSong {
  entry: SongEntry;
  dir: FileSystemDirectoryHandle;
  doc: TranscriptFile;
  /** The words as the transcript has them (text, line, times), by index. */
  base: TWord[];
  /** The times as the transcript has them, by word index. */
  original: Record<number, { start: number; end: number }>;
  url: string | null;
  duration: number;
  peaks: Float32Array | null;
  /** The number the next new revision gets. */
  nextRev: number;
}

export interface TimeChange {
  i: number;
  start: number;
  end: number;
}

interface State {
  support: Support;
  root: Root | null;
  songs: SongEntry[];
  scanning: { done: number; total: number } | null;
  filter: string;
  song: OpenSong | null;
  loading: string | null;
  error: string | null;
  /** The words with any times changed on the timeline. */
  words: TWord[];
  lines: TLine[];
  time: number;
  playing: boolean;
  rate: number;
  /** Words show this far ahead of the sound (seconds): eyes read first, then hear. Display only. */
  lead: number;
  /** Seconds the timeline shows. */
  span: number;
  /** Where the timeline starts when it doesn't follow the playhead (paused and panned). */
  viewStart: number | null;
  selected: number | null;
  /** The word whose text is being rewritten, and where its text box is. */
  editing: { i: number; where: 'stage' | 'timeline' } | null;
  revision: TranscriptRevision | null;
  focusMark: string | null;
  saveState: SaveState;
  shortcutsOpen: boolean;

  init: () => void;
  openPath: (path: string, song?: string | null) => Promise<void>;
  pickRoot: () => Promise<void>;
  openSong: (entry: SongEntry) => Promise<void>;
  reloadSong: () => Promise<void>;
  stepSong: (d: number) => void;
  setFilter: (f: string) => void;
  togglePlay: () => void;
  playRange: (start: number, end: number) => void;
  replayLine: () => void;
  seek: (t: number) => void;
  nudge: (d: number) => void;
  setRate: (r: number) => void;
  setLead: (l: number) => void;
  setSpan: (s: number) => void;
  zoom: (d: number) => void;
  setViewStart: (s: number | null) => void;
  selectWord: (i: number | null, seek?: boolean) => void;
  stepWord: (d: number) => void;
  setTimes: (changes: TimeChange[]) => void;
  setEdgeAtPlayhead: (edge: 'start' | 'end', i?: number) => void;
  trimWord: (i: number, side: 'start' | 'end') => void;
  resetWord: (i: number) => void;
  resetAll: () => void;
  toggleDelete: (i: number) => void;
  startRewrite: (i: number, where: 'stage' | 'timeline') => void;
  endRewrite: () => void;
  rewriteWord: (i: number, text: string) => void;
  pushLine: (i: number, d: 1 | -1) => void;
  undoRewrite: (i: number) => void;
  undoLineMoves: (is: number[]) => void;
  restoreWord: (i: number) => void;
  toggleClean: () => Promise<void>;
  addMark: (kind: MarkKind) => void;
  updateMark: (id: string, note: string) => void;
  setMarkKind: (id: string, kind: MarkKind) => void;
  removeMark: (id: string) => void;
  setFocusMark: (id: string | null) => void;
  setStatus: (status: TranscriptRevision['status']) => void;
  copyInstructions: () => Promise<void>;
  flushSave: () => Promise<void>;
  setShortcutsOpen: (open: boolean) => void;
}

let audio: HTMLAudioElement | null = null;
let raf = 0;
let saveTimer: ReturnType<typeof setTimeout> | null = null;
/** playRange stops the song here. */
let stopAt: number | null = null;

const now = () => new Date().toISOString();
const uid = () => Math.random().toString(36).slice(2, 9);
const round3 = (n: number) => Math.round(n * 1000) / 1000;

/** The words as the open revision has them: the times as moved, and its rewrites, line moves and deletions. */
function derive(base: TWord[], times: TWord[], rev: TranscriptRevision | null): TWord[] {
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
      ...(to ? { stanza: to.stanza, line: to.line } : {}),
      ...(deleted.has(b.i) ? { deleted: true } : {}),
    };
  });
}

function urlState(path?: string, song?: string) {
  const u = new URL(window.location.href);
  if (path) u.searchParams.set('path', path);
  else u.searchParams.delete('path');
  if (song) u.searchParams.set('song', song);
  else u.searchParams.delete('song');
  window.history.replaceState(null, '', u.toString());
}

/** Where the timeline starts for a playhead at `t`. */
export const followStart = (t: number, span: number) => Math.max(0, t - span * FOLLOW_AT);

export const useTranscriptStore = create<State>((set, get) => {
  const scheduleSave = () => {
    if (saveTimer) clearTimeout(saveTimer);
    set({ saveState: 'idle' });
    saveTimer = setTimeout(() => void get().flushSave(), 700);
  };

  /** The revision with the words moved so far, ready to save. */
  const withTimings = (rev: TranscriptRevision): TranscriptRevision => {
    const { song, words, lead } = get();
    if (!song) return rev;
    const timings = words
      .filter(w => {
        const o = song.original[w.i];
        return o && (Math.abs(o.start - w.start) > 0.0005 || Math.abs(o.end - w.end) > 0.0005);
      })
      .map(w => ({ i: w.i, text: w.text, from: song.original[w.i], to: { start: round3(w.start), end: round3(w.end) } }));
    return { ...rev, timings, lead, updatedAt: now() };
  };

  /** The open revision, or a new one (rev-NNN after the last) the first time something is marked or moved. */
  const ensureRevision = (): TranscriptRevision | null => {
    const { revision, song, root } = get();
    if (revision) return revision;
    if (!song) return null;
    return {
      schema: 'mediamake.transcript-revision/v1',
      id: revisionIdOf(song.nextRev),
      song: song.entry.title,
      folder: song.entry.folder,
      transcript: song.entry.transcript,
      audio: song.entry.audio,
      ...(root?.path ? { path: song.entry.folder ? `${root.path}/${song.entry.folder}` : root.path } : {}),
      status: 'open',
      lead: get().lead,
      createdAt: now(),
      updatedAt: now(),
      marks: [],
      timings: [],
      deleted: [],
      rewrites: [],
      lineMoves: [],
    };
  };

  /** A revision with new word edits: the words on screen follow it, and it saves. */
  const commit = (rev: TranscriptRevision) => {
    const { song } = get();
    if (!song) return;
    const words = derive(song.base, get().words, rev);
    set({ words, lines: linesOf(words, song.doc) });
    set({ revision: withTimings({ ...rev, status: rev.status === 'done' ? 'open' : rev.status }) });
    scheduleSave();
  };

  const tick = () => {
    if (!audio) return;
    const t = audio.currentTime;
    if (stopAt !== null && t >= stopAt) {
      stopAt = null;
      audio.pause();
      return;
    }
    set({ time: t });
    raf = requestAnimationFrame(tick);
  };

  const loadRoot = async (root: Root, song?: string | null) => {
    set({ root, songs: [], scanning: { done: 0, total: 0 }, error: null });
    try {
      const songs = await scanSongs(root.handle, (done, total) => set({ scanning: { done, total } }));
      set({ songs, scanning: null });
      if (!songs.length) set({ error: 'No transcripts here: a song folder holds <audio>.transcript.json beside its audio.' });
      const wanted = song ? songs.find(s => s.folder === song || s.title === song || s.id === song) : null;
      if (wanted) await get().openSong(wanted);
    } catch (err) {
      set({ scanning: null, error: err instanceof Error ? err.message : String(err) });
    }
  };

  return {
    support: 'checking',
    root: null,
    songs: [],
    scanning: null,
    filter: '',
    song: null,
    loading: null,
    error: null,
    words: [],
    lines: [],
    time: 0,
    playing: false,
    rate: 1,
    lead: 0.3,
    span: 8,
    viewStart: null,
    selected: null,
    editing: null,
    revision: null,
    focusMark: null,
    saveState: 'idle',
    shortcutsOpen: false,

    init: () => {
      const s = getFolderSupport();
      set({ support: s.supported ? 'ok' : s.reason });
      const params = new URLSearchParams(window.location.search);
      const path = params.get('path');
      // the screen mounting again (coming back to it) keeps the folder and song it has open
      if (path && get().root?.path !== path) void get().openPath(path, params.get('song'));
    },

    openPath: async (path, song) => {
      set({ error: null, loading: 'Opening the folder…' });
      const opened = await openDevFolder(path);
      set({ loading: null });
      if ('error' in opened) {
        set({
          error:
            opened.error === 'no-dev-server'
              ? 'Opening a folder by its path needs MediaMake running on this computer (npm run dev -w mediamake). Use “Open a folder” instead.'
              : `No folder at ${path}.`,
        });
        return;
      }
      urlState(opened.path, song ?? undefined);
      await loadRoot({ handle: opened.handle, name: opened.path.split('/').pop() ?? opened.path, path: opened.path }, song);
    },

    pickRoot: async () => {
      try {
        const handle = await pickFolder();
        if ((await requestReadWrite(handle)) !== 'granted') {
          toast.error('The folder needs read and write access: revisions are saved beside the transcripts.');
          return;
        }
        urlState();
        await loadRoot({ handle, name: handle.name });
      } catch (err) {
        if (!isAbortError(err)) toast.error(err instanceof Error ? err.message : String(err));
      }
    },

    openSong: async entry => {
      const { root } = get();
      if (!root) return;
      await get().flushSave();
      stopAt = null;
      audio?.pause();
      cancelAnimationFrame(raf);
      const old = get().song;
      if (old?.url) URL.revokeObjectURL(old.url);
      audio = null;
      set({ loading: `Opening ${entry.title}…`, error: null, song: null, words: [], lines: [], revision: null, selected: null, editing: null, time: 0, playing: false, viewStart: null, focusMark: null, saveState: 'idle' });
      try {
        const dir = entry.folder ? await getSubdir(root.handle, entry.folder, false) : root.handle;
        if (!dir) throw new Error(`Folder ${entry.folder} not found`);
        const read = await readJsonIn<TranscriptFile>(dir, entry.transcript);
        if (!read) throw new Error(`${entry.transcript} not found`);
        const doc = read.data;
        const base = wordsOf(doc);
        const original: OpenSong['original'] = {};
        for (const w of base) original[w.i] = { start: w.start, end: w.end };
        // the latest revision that Claude hasn't applied yet carries on; otherwise the next one starts when something is marked
        let revision: TranscriptRevision | null = null;
        let nextRev = 1;
        const revDir = await getSubdir(dir, revisionsDirOf(entry), false);
        if (revDir) {
          const names = (await listFileNames(revDir)).filter(n => revisionNumber(n) > 0).sort((a, b) => revisionNumber(a) - revisionNumber(b));
          const last = names.at(-1);
          if (last) {
            nextRev = revisionNumber(last) + 1;
            const r = await readJsonIn<TranscriptRevision>(revDir, last);
            if (r && r.data.status !== 'done')
              revision = { ...r.data, marks: r.data.marks ?? [], timings: r.data.timings ?? [], deleted: r.data.deleted ?? [], rewrites: r.data.rewrites ?? [], lineMoves: r.data.lineMoves ?? [] };
          }
        }
        // words moved, rewritten, deleted or re-lined in the open revision show as it has them
        const times = base.slice();
        if (revision) for (const t of revision.timings) if (times[t.i]) times[t.i] = { ...times[t.i], start: t.to.start, end: t.to.end };
        const words = derive(base, times, revision);
        const file = entry.audio ? await readFileIn(dir, entry.audio) : null;
        const url = file ? URL.createObjectURL(file) : null;
        if (url) {
          const a = new Audio(url);
          a.preload = 'auto';
          a.playbackRate = get().rate;
          a.addEventListener('play', () => {
            set({ playing: true, viewStart: null });
            cancelAnimationFrame(raf);
            raf = requestAnimationFrame(tick);
          });
          a.addEventListener('pause', () => {
            cancelAnimationFrame(raf);
            set({ playing: false, time: a.currentTime });
          });
          a.addEventListener('ended', () => set({ playing: false }));
          a.addEventListener('loadedmetadata', () => set(s => (s.song && audio === a ? { song: { ...s.song, duration: a.duration } } : {})));
          audio = a;
        }
        set({
          song: { entry, dir, doc, base, original, url, duration: 0, peaks: null, nextRev },
          words,
          lines: linesOf(words, doc),
          revision,
          lead: revision?.lead ?? get().lead,
          loading: null,
        });
        urlState(root.path, entry.folder || entry.title);
        if (!entry.audio) toast.message(`No audio beside ${entry.transcript}: the words show, nothing plays.`);
        // the waveform, decoded in the background
        if (file) {
          void (async () => {
            try {
              const ctx = new AudioContext();
              const buffer = await ctx.decodeAudioData(await file.arrayBuffer());
              void ctx.close();
              const peaks = waveformPeaks(buffer, Math.max(1, Math.round(buffer.duration * PEAKS_PER_SECOND)));
              set(s => (s.song?.entry.id === entry.id ? { song: { ...s.song, peaks, duration: s.song.duration || buffer.duration } } : {}));
            } catch {
              /* no waveform: the words still work */
            }
          })();
        }
      } catch (err) {
        set({ loading: null, error: err instanceof Error ? err.message : String(err) });
      }
    },

    reloadSong: async () => {
      const { song, time } = get();
      if (!song) return;
      await get().openSong(song.entry);
      get().seek(time);
    },

    stepSong: d => {
      const { songs, song, filter } = get();
      const f = filter.trim().toLowerCase();
      const list = f ? songs.filter(s => s.title.toLowerCase().includes(f) || s.folder.toLowerCase().includes(f)) : songs;
      if (!list.length) return;
      const at = song ? list.findIndex(s => s.id === song.entry.id) : -1;
      const next = list[Math.max(0, Math.min(list.length - 1, at + d))];
      if (next && next.id !== song?.entry.id) void get().openSong(next);
    },

    setFilter: filter => set({ filter }),

    togglePlay: () => {
      if (!audio) return;
      stopAt = null;
      if (audio.paused) void audio.play();
      else audio.pause();
    },

    playRange: (start, end) => {
      if (!audio) return;
      audio.currentTime = Math.max(0, start);
      set({ time: audio.currentTime });
      stopAt = end;
      void audio.play();
    },

    replayLine: () => {
      const { words, lines, time, lead } = get();
      const l = lines[momentAt(words, lines, time + lead).line];
      if (!l || !audio) return;
      stopAt = null;
      audio.currentTime = Math.max(0, l.start - 0.4);
      set({ time: audio.currentTime });
      void audio.play();
    },

    seek: t => {
      const { song, span, viewStart, playing } = get();
      const d = song?.duration || audio?.duration || 0;
      const to = Math.max(0, d ? Math.min(d, t) : t);
      if (audio) audio.currentTime = to;
      // a paused, panned timeline keeps its place unless the playhead leaves it
      const keep = !playing && viewStart !== null && to >= viewStart && to <= viewStart + span;
      set({ time: to, viewStart: keep ? viewStart : null });
    },

    nudge: d => get().seek(get().time + d),

    setRate: rate => {
      if (audio) audio.playbackRate = rate;
      set({ rate });
    },

    setLead: lead => {
      set({ lead: round3(Math.max(0, Math.min(1, lead))) });
      const r = get().revision;
      if (r) {
        set({ revision: { ...r, lead: get().lead } });
        scheduleSave();
      }
    },

    setSpan: span => set({ span }),

    zoom: d => {
      const at = SPANS.indexOf(get().span);
      const i = Math.max(0, Math.min(SPANS.length - 1, (at < 0 ? 2 : at) + d));
      set({ span: SPANS[i] });
    },

    setViewStart: viewStart => set({ viewStart: viewStart === null ? null : Math.max(0, viewStart) }),

    selectWord: (i, seek) => {
      set({ selected: i });
      if (seek && i !== null) {
        const w = get().words[i];
        if (w) get().seek(w.start);
      }
    },

    stepWord: d => {
      const { words, lines, selected, time, lead } = get();
      if (!words.length) return;
      const cur = selected ?? wordNear(words, lines, time + lead)?.i ?? 0;
      const next = Math.max(0, Math.min(words.length - 1, cur + d));
      get().selectWord(next, true);
    },

    setTimes: changes => {
      const { song } = get();
      if (!song || !changes.length) return;
      const words = get().words.slice();
      for (const c of changes) if (words[c.i]) words[c.i] = { ...words[c.i], start: round3(c.start), end: round3(c.end) };
      set({ words, lines: linesOf(words, song.doc) });
      const base = ensureRevision();
      if (base) set({ revision: withTimings(base) });
      scheduleSave();
    },

    setEdgeAtPlayhead: (edge, i) => {
      const { selected, words, time } = get();
      const at = i ?? selected;
      if (at === null) {
        toast.message('Select a word first (click it), then press S or E at the playhead');
        return;
      }
      const w = words[at];
      if (!w) return;
      if (edge === 'start') get().setTimes([{ i: w.i, start: Math.min(time, w.end - MIN_WORD), end: w.end }]);
      else get().setTimes([{ i: w.i, start: w.start, end: Math.max(time, w.start + MIN_WORD) }]);
    },

    trimWord: (i, side) => {
      const w = get().words[i];
      if (!w || w.end - w.start <= TRIM_TO) return;
      get().selectWord(i);
      if (side === 'end') get().setTimes([{ i, start: w.start, end: w.start + TRIM_TO }]);
      else get().setTimes([{ i, start: w.end - TRIM_TO, end: w.end }]);
    },

    resetWord: i => {
      const o = get().song?.original[i];
      if (o) get().setTimes([{ i, start: o.start, end: o.end }]);
    },

    resetAll: () => {
      const song = get().song;
      if (!song) return;
      const changes = get()
        .words.filter(w => {
          const o = song.original[w.i];
          return o && (o.start !== w.start || o.end !== w.end);
        })
        .map(w => ({ i: w.i, ...song.original[w.i] }));
      get().setTimes(changes);
    },

    toggleDelete: i => {
      const { song } = get();
      const base = ensureRevision();
      if (!song || !base || !song.base[i]) return;
      const deleted = base.deleted ?? [];
      const o = song.original[i];
      commit({
        ...base,
        deleted: deleted.some(d => d.i === i) ? deleted.filter(d => d.i !== i) : [...deleted, { i, text: song.base[i].text, start: o.start, end: o.end }],
      });
    },

    startRewrite: (i, where) => {
      if (audio && !audio.paused) audio.pause();
      set({ editing: { i, where }, selected: i });
    },

    endRewrite: () => set({ editing: null }),

    rewriteWord: (i, text) => {
      const { song } = get();
      set({ editing: null });
      const to = text.trim().replace(/\s+/g, ' ');
      if (!song?.base[i] || !to || to === get().words[i]?.text) return;
      const base = ensureRevision();
      if (!base) return;
      const rest = (base.rewrites ?? []).filter(r => r.i !== i);
      commit({ ...base, rewrites: to === song.base[i].text ? rest : [...rest, { i, from: song.base[i].text, to }] });
    },

    pushLine: (i, d) => {
      const { song, words, lines } = get();
      const w = words[i];
      if (!song || !w) return;
      const k = lines.findIndex(l => l.words.some(x => x.i === i));
      const target = lines[k + d];
      if (k < 0 || !target) {
        toast.message(d > 0 ? 'There is no line after this one' : 'There is no line before this one');
        return;
      }
      if ((w.stanza === undefined && w.line === undefined) || (target.stanza === undefined && target.line === undefined)) {
        toast.message('This transcript has no stanza and line numbers to move words between');
        return;
      }
      const base = ensureRevision();
      if (!base) return;
      // the word takes the words after it (next line) or before it (previous line) along, so every line stays in one piece
      const moving = lines[k].words.filter(x => (d > 0 ? x.i >= i : x.i <= i));
      const moves = new Map((base.lineMoves ?? []).map(m => [m.i, m]));
      const to = { stanza: target.stanza, line: target.line };
      for (const x of moving) {
        const o = song.base[x.i];
        if (o.stanza === to.stanza && o.line === to.line) moves.delete(x.i);
        else moves.set(x.i, { i: x.i, text: o.text, from: { stanza: o.stanza, line: o.line }, to, toLine: target.text } satisfies LineMove);
      }
      commit({ ...base, lineMoves: [...moves.values()].sort((a, b) => a.i - b.i) });
      get().selectWord(i);
    },

    undoRewrite: i => {
      const base = get().revision;
      if (base) commit({ ...base, rewrites: (base.rewrites ?? []).filter(r => r.i !== i) });
    },

    undoLineMoves: is => {
      const base = get().revision;
      if (base) commit({ ...base, lineMoves: (base.lineMoves ?? []).filter(m => !is.includes(m.i)) });
    },

    restoreWord: i => {
      const base = get().revision;
      if (!base) return;
      commit({ ...base, rewrites: (base.rewrites ?? []).filter(r => r.i !== i), deleted: (base.deleted ?? []).filter(d => d.i !== i) });
      get().resetWord(i);
    },

    toggleClean: async () => {
      const { song, revision } = get();
      if (!song) return;
      const clean = !song.entry.clean;
      try {
        const dir = await getSubdir(song.dir, revisionsDirOf(song.entry), clean);
        if (clean && dir) {
          const mark: CleanMark = { schema: 'mediamake.transcript-clean/v1', song: song.entry.title, transcript: song.entry.transcript, words: song.base.length, markedAt: now() };
          await writeFileIn(dir, CLEAN_FILE, JSON.stringify(mark, null, 2) + '\n');
        } else if (dir) await removeFileIn(dir, CLEAN_FILE);
        const entry = { ...song.entry, clean };
        set(s => ({ song: s.song?.entry.id === entry.id ? { ...s.song, entry } : s.song, songs: s.songs.map(x => (x.id === entry.id ? entry : x)) }));
        const pending = revision && revision.status !== 'done' ? changeCount(revision) : 0;
        if (!clean) toast.message(`${entry.folder || entry.title} is no longer marked clean`);
        else if (pending) toast.message(`Marked clean · ${revision!.id} still has ${pending} change${pending === 1 ? '' : 's'} for Claude to apply`);
        else toast.success(`${entry.folder || entry.title} is marked clean`);
      } catch (err) {
        toast.error(`Could not ${clean ? 'mark' : 'unmark'} it clean: ${err instanceof Error ? err.message : String(err)}`);
      }
    },

    addMark: kind => {
      const { words, lines, time, lead, selected } = get();
      const base = ensureRevision();
      if (!base) return;
      if (audio && !audio.paused) audio.pause();
      // the word the user means: the selected one, else the one on screen now
      const w = selected !== null ? words[selected] : wordNear(words, lines, time + lead);
      const l = w ? lines.find(x => x.words.some(y => y.i === w.i)) : null;
      const mark: Mark = {
        id: uid(),
        kind,
        at: round3(selected !== null && w ? w.start : time),
        ...(w ? { word: { i: w.i, text: w.text, start: w.start, end: w.end } } : {}),
        ...(l ? { line: { stanza: l.stanza, line: l.line, text: l.text } } : {}),
        note: '',
        createdAt: now(),
      };
      set({ revision: withTimings({ ...base, status: 'open', marks: [...base.marks, mark] }), focusMark: mark.id });
      scheduleSave();
    },

    updateMark: (id, note) => {
      const r = get().revision;
      if (!r) return;
      set({ revision: { ...r, marks: r.marks.map(m => (m.id === id ? { ...m, note } : m)), updatedAt: now() } });
      scheduleSave();
    },

    setMarkKind: (id, kind) => {
      const r = get().revision;
      if (!r) return;
      set({ revision: { ...r, marks: r.marks.map(m => (m.id === id ? { ...m, kind } : m)), updatedAt: now() } });
      scheduleSave();
    },

    removeMark: id => {
      const r = get().revision;
      if (!r) return;
      set({ revision: { ...r, marks: r.marks.filter(m => m.id !== id), updatedAt: now() } });
      scheduleSave();
    },

    setFocusMark: focusMark => set({ focusMark }),

    setStatus: status => {
      const r = ensureRevision();
      if (!r) return;
      set({ revision: withTimings({ ...r, status }) });
      scheduleSave();
    },

    copyInstructions: async () => {
      const r = get().revision;
      if (!changeCount(r)) {
        toast.message('Nothing marked or changed yet');
        return;
      }
      await get().flushSave();
      const text = instructionsOf(get().revision ?? r!);
      try {
        await navigator.clipboard.writeText(text);
        toast.success('Copied: paste it in the chat with Claude');
      } catch {
        window.prompt('Copy these instructions:', text);
      }
    },

    flushSave: async () => {
      if (saveTimer) {
        clearTimeout(saveTimer);
        saveTimer = null;
      }
      const { revision, song } = get();
      if (!revision || !song) return;
      if (!changeCount(revision) && revision.status === 'open') return;
      set({ saveState: 'saving' });
      try {
        const dir = await getSubdir(song.dir, revisionsDirOf(song.entry), true);
        if (!dir) throw new Error('Could not create the revisions folder');
        const rev = withTimings(revision);
        await writeFileIn(dir, revisionFileName(rev.id), JSON.stringify(rev, null, 2) + '\n');
        await writeFileIn(dir, `${rev.id}.md`, revisionToMarkdown(rev));
        // a newer edit may have landed while writing: keep it, it saves next
        if (get().revision === revision) set({ revision: rev });
        set({ saveState: 'saved' });
      } catch (err) {
        set({ saveState: 'error' });
        toast.error(`Could not save the revision: ${err instanceof Error ? err.message : String(err)}`);
      }
    },

    setShortcutsOpen: shortcutsOpen => set({ shortcutsOpen }),
  };
});
