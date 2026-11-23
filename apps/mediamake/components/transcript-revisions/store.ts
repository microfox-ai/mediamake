'use client';

import { create } from 'zustand';
import { toast } from 'sonner';
import { isAbortError } from '@/lib/local-media/file-access';
import { getFolderSupport, getSubdir, listFileNames, pickFolder, readFileIn, readJsonIn, requestReadWrite, writeFileIn } from '@/lib/revisions/fs';
import { openDevFolder } from '@/lib/remaster-revisions/dev-folder';
import { waveformPeaks } from '@/lib/remaster-revisions/loudness';
import {
  instructionsOf,
  lineOf,
  linesOf,
  revisionFileName,
  revisionIdOf,
  revisionNumber,
  revisionsDirOf,
  revisionToMarkdown,
  scanSongs,
  wordAt,
  wordsOf,
} from '@/lib/transcript-revisions/transcript';
import type { Mark, MarkKind, SongEntry, TLine, TranscriptFile, TranscriptRevision, TWord } from '@/lib/transcript-revisions/types';

/*
 * State for /transcript-revision: the opened folder and the songs in it, the song being reviewed (its words, lines,
 * audio and waveform), playback, the marks and word-time changes of the current revision, and saving that revision
 * beside the transcript. The transcript file itself is never written: Claude applies a revision when the user pastes it.
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
  setEdgeAtPlayhead: (edge: 'start' | 'end') => void;
  resetWord: (i: number) => void;
  resetAll: () => void;
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
    };
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
      set({ loading: `Opening ${entry.title}…`, error: null, song: null, words: [], lines: [], revision: null, selected: null, time: 0, playing: false, viewStart: null, focusMark: null, saveState: 'idle' });
      try {
        const dir = entry.folder ? await getSubdir(root.handle, entry.folder, false) : root.handle;
        if (!dir) throw new Error(`Folder ${entry.folder} not found`);
        const read = await readJsonIn<TranscriptFile>(dir, entry.transcript);
        if (!read) throw new Error(`${entry.transcript} not found`);
        const doc = read.data;
        const words = wordsOf(doc);
        const original: OpenSong['original'] = {};
        for (const w of words) original[w.i] = { start: w.start, end: w.end };
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
            if (r && r.data.status !== 'done') revision = { ...r.data, marks: r.data.marks ?? [], timings: r.data.timings ?? [] };
          }
        }
        // words moved in the open revision show where they were moved to
        if (revision) for (const t of revision.timings) if (words[t.i]) words[t.i] = { ...words[t.i], start: t.to.start, end: t.to.end };
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
          song: { entry, dir, doc, original, url, duration: 0, peaks: null, nextRev },
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
      const l = lineOf(lines, wordAt(words, time + lead));
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
      const { words, selected, time, lead } = get();
      if (!words.length) return;
      const cur = selected ?? wordAt(words, time + lead)?.i ?? 0;
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

    setEdgeAtPlayhead: edge => {
      const { selected, words, time } = get();
      if (selected === null) {
        toast.message('Select a word first (click it), then press S or E at the playhead');
        return;
      }
      const w = words[selected];
      if (!w) return;
      if (edge === 'start') get().setTimes([{ i: w.i, start: Math.min(time, w.end - MIN_WORD), end: w.end }]);
      else get().setTimes([{ i: w.i, start: w.start, end: Math.max(time, w.start + MIN_WORD) }]);
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

    addMark: kind => {
      const { words, lines, time, lead, selected } = get();
      const base = ensureRevision();
      if (!base) return;
      if (audio && !audio.paused) audio.pause();
      // the word the user means: the selected one, else the one on screen now
      const w = selected !== null ? words[selected] : wordAt(words, time + lead);
      const l = lineOf(lines, w);
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
      if (!r || (!r.marks.length && !r.timings.length)) {
        toast.message('Nothing marked or moved yet');
        return;
      }
      await get().flushSave();
      const text = instructionsOf(get().revision ?? r);
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
      if (!revision.marks.length && !revision.timings.length && revision.status === 'open') return;
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
