'use client';

import { useEffect, useMemo } from 'react';
import { create } from 'zustand';
import { toast } from 'sonner';
import { isAbortError } from '@/lib/local-media/file-access';
import { getFolderSupport, getSubdir, listFileNames, pickFolder, queryReadWrite, readFileIn, readJsonIn, requestReadWrite, writeFileIn } from '@/lib/revisions/fs';
import type { RevisionStatus } from '@/lib/revisions/types';
import { createHistory, type RecentJob } from '@/lib/file-revisions/history';
import { createRevision, nextCommentId, nextRevisionId, normalizeRevision, revisionIdFromFile, revisionsDirName, revisionToMarkdown } from '@/lib/file-revisions/revision-file';
import type { ImageComment, ImageRevision, ImageSetIndex } from '@/lib/file-revisions/types';
import { openDevFolder } from '@/lib/stem-player/dev-folder';
import { findFolder, readFolder, reviewIndex } from '@/lib/stem-player/folders';
import { dbToGain, measureLoudness, waveformPeaks } from '@/lib/stem-player/loudness';
import { StemEngine } from '@/lib/stem-player/player';
import { EMPTY, click, move, prune, selectAll, type Selection } from '@/lib/stem-player/selection';
import type { TrackFile } from '@/lib/stem-player/tracks';
import { MEMORY_BUDGET, QUIET_LUFS, type LoopRange, type MeasuredLevels, type RemasterIndex } from '@/lib/stem-player/types';

/*
 * State for the Stem Player: the folders the user opened (a tree, each folder read when it is
 * expanded), the tracks in them (decoded when first selected, the rest of the folder behind it),
 * the selection (what is heard), the playback mirror, and, for a folder of versions, the revisions
 * saved beside the files (the same files /file-revision writes).
 */

export type Support = 'checking' | 'ok' | 'insecure' | 'browser';
export type SaveState = 'idle' | 'saving' | 'saved' | 'error';
export type VersionAction = 'final' | 'drop';

/** The database's name predates this screen (it was Remaster Revisions'): kept, so the folders given to it are still here. */
const remembered = createHistory('mediamake-remaster-revisions');

export interface Root {
  id: string;
  name: string;
  handle: FileSystemDirectoryHandle;
  /** After a reload the browser may want one click before it reads the folder again. */
  status: 'ready' | 'needs-permission';
  /** Its absolute path, when opened by path through the local app. */
  absPath?: string;
}

export interface Folder {
  key: string;
  root: string;
  /** Its path inside the root ('' for the root itself). */
  path: string;
  name: string;
  parent: string | null;
  handle: FileSystemDirectoryHandle;
  state: 'closed' | 'loading' | 'open' | 'error';
  expanded: boolean;
  folders: string[];
  tracks: string[];
  /** It holds the versions of one song, by its files (a remaster ladder). */
  versions: boolean;
  /** The user turned Compare versions on for it. */
  compare: boolean;
  remaster: RemasterIndex | null;
  index: ImageSetIndex | null;
}

export interface Track extends TrackFile {
  /** Unique among everything open (the ID alone is only unique in its folder). */
  uid: string;
  folder: string;
  status: 'idle' | 'loading' | 'ready' | 'error';
  /** Seconds, once decoded. */
  length?: number;
  lastModified?: number;
  levels?: MeasuredLevels;
}

export type Row = { kind: 'folder'; key: string; depth: number } | { kind: 'track'; uid: string; depth: number };

interface StemState {
  support: Support;
  roots: Root[];
  folders: Record<string, Folder>;
  tracks: Record<string, Track>;
  peaks: Record<string, Float32Array>;
  /** The sidebar, top to bottom, and the tracks in it (what the arrow keys walk). */
  rows: Row[];
  order: string[];
  sel: Selection;
  recent: RecentJob[];
  /** A ?job= link no open folder holds yet: one click to open its folder. */
  pendingJob: string | null;
  // playback, mirrored from the engine for rendering
  playing: boolean;
  /** Playing, but the selected track is still loading. */
  waiting: boolean;
  heard: string[];
  /** Goes up whenever the transport changes (a seek while paused too), so the playhead is redrawn. */
  stamp: number;
  duration: number;
  loop: LoopRange | null;
  looping: boolean;
  volume: number;
  /** Match levels, by folder. */
  matched: Record<string, boolean>;
  // the review of the current project (a folder of versions)
  /** The Notes panel, in a folder of versions (open unless the user closes it). */
  notesOpen: boolean;
  /** A folder that isn't one, whose Notes panel the user opened: it offers Compare versions. */
  offerFor: string | null;
  review: string | null;
  revisions: Record<string, ImageRevision>;
  revisionIds: string[];
  activeRevisionId: string | null;
  dirty: Record<string, boolean>;
  saveState: SaveState;
  composerFocus: number;
  shortcutsOpen: boolean;

  init: () => Promise<void>;
  pickRoot: () => Promise<void>;
  openPath: (absPath: string, track?: string | null) => Promise<void>;
  openRecent: (entry: RecentJob) => Promise<void>;
  forgetRecent: (id: string) => Promise<void>;
  closeRoot: (id: string) => Promise<void>;
  toggleFolder: (key: string) => Promise<void>;
  setCompare: (key: string, on: boolean) => void;

  clickTrack: (uid: string, mods?: { toggle?: boolean; range?: boolean }) => void;
  moveFocus: (delta: 1 | -1, extend?: boolean) => void;
  selectProject: () => void;
  /** The track of the current project with this key (1–9, or a version's letter). */
  selectByKey: (key: string) => boolean;

  togglePlay: () => void;
  pause: () => void;
  seek: (t: number) => void;
  nudge: (dt: number) => void;
  setLoop: (range: LoopRange | null) => void;
  setLooping: (on: boolean) => void;
  /** Moves one edge of the loop to the playhead (a loop from the start when there is none). */
  setLoopEdge: (edge: 'start' | 'end') => void;
  setMatched: (on: boolean) => void;
  setVolume: (v: number) => void;

  setNotesOpen: (open: boolean) => void;
  refresh: () => Promise<void>;
  newRevision: () => Promise<string | null>;
  openRevision: (id: string) => void;
  setStatus: (status: RevisionStatus) => void;
  toggleAction: (action: VersionAction, id: string) => Promise<void>;
  addComment: (text: string, opts?: { ids?: string[]; t?: number }) => Promise<boolean>;
  updateComment: (id: string, patch: Partial<Pick<ImageComment, 'text' | 'status'>>) => void;
  deleteComment: (id: string) => Promise<void>;
  saveRevision: (id: string) => Promise<void>;
  flushSaves: () => Promise<void>;
  requestComposerFocus: () => void;
  setShortcutsOpen: (open: boolean) => void;
}

const AUTOSAVE_MS = 600;
const WAVEFORM_BUCKETS = 2400;
/** Tracks decoded at once: the selected ones first, then the rest of the folder. */
const LOADING_AT_ONCE = 2;
const byNumber = (a: string, b: string) => a.localeCompare(b, undefined, { numeric: true });
const errorMessage = (err: unknown) => (err instanceof Error ? err.message : String(err));
const yieldToPaint = () => new Promise<void>(resolve => setTimeout(resolve, 0));

export const folderKeyOf = (root: string, path: string) => `${root}:${path}`;
/** A track's name among everything open: its folder's key and its ID. */
export const uidOf = (folder: string, id: string) => `${folder}|${id}`;

let engine: StemEngine | null = null;
/** The engine, for reading the playhead every frame (null until something is loaded or played). */
export const getEngine = () => engine;

// ── what the state says ───────────────────────────────────────────────────────

type Tree = Pick<StemState, 'roots' | 'folders' | 'tracks'>;

/** The folder of the focused track: what ⌘A, the number keys, Match levels and the notes act on. */
export const currentKey = (s: Pick<StemState, 'sel' | 'tracks'>): string | null => (s.sel.focus ? (s.tracks[s.sel.focus]?.folder ?? null) : null);
export const selectCurrent = (s: StemState): Folder | null => {
  const key = currentKey(s);
  return key ? (s.folders[key] ?? null) : null;
};

/** A folder of versions of one song: it gets Match levels, the final pick and notes. */
export const isReviewable = (f: Folder | null | undefined): boolean => !!f && (f.versions || f.compare);

/** A track's loudness: the remaster scripts' number, else what the browser measured. */
export const levelOf = (t: Track | undefined): { lufs: number; from: 'sidecar' | 'measured' } | null => {
  if (!t) return null;
  if (typeof t.info?.lufs === 'number') return { lufs: t.info.lufs, from: 'sidecar' };
  return t.levels && Number.isFinite(t.levels.lufs) ? { lufs: t.levels.lufs, from: 'measured' } : null;
};

/** The loudest and quietest tracks of a folder and how far apart they are (near-silent ones left out; null until two are known). */
export function levelSpread(folder: Folder | null | undefined, tracks: Record<string, Track>): { loudest: string; quietest: string; lu: number; ref: number } | null {
  const known = (folder?.tracks ?? []).map(uid => [uid, levelOf(tracks[uid])?.lufs] as const).filter((x): x is readonly [string, number] => typeof x[1] === 'number' && x[1] >= QUIET_LUFS);
  if (known.length < 2) return null;
  const loudest = known.reduce((a, b) => (b[1] > a[1] ? b : a));
  const quietest = known.reduce((a, b) => (b[1] < a[1] ? b : a));
  return { loudest: loudest[0], quietest: quietest[0], lu: loudest[1] - quietest[1], ref: quietest[1] };
}

/** How far a track is turned down while its folder's levels are matched (dB, 0 or less); 0 when it isn't. */
export function trimOf(s: Pick<StemState, 'folders' | 'tracks' | 'matched'>, uid: string): number {
  const t = s.tracks[uid];
  const folder = t && s.folders[t.folder];
  if (!t || !folder || !isReviewable(folder) || !s.matched[folder.key]) return 0;
  const level = levelOf(t)?.lufs;
  const spread = levelSpread(folder, s.tracks);
  return spread && typeof level === 'number' && level >= QUIET_LUFS ? Math.min(0, spread.ref - level) : 0;
}

/** A folder's absolute path, when the screen knows it (opened by path, or written in its remaster.json or index.json). */
export function absPathOf(s: Pick<StemState, 'roots'>, f: Folder): string | null {
  const root = s.roots.find(r => r.id === f.root);
  if (root?.absPath) return f.path ? `${root.absPath}/${f.path}` : root.absPath;
  return f.index?.path ?? f.remaster?.path ?? null;
}

/** How a folder is named in a link and in the message to Claude: its path from its root. */
export function jobNameOf(s: Pick<StemState, 'roots'>, f: Folder): string {
  const root = s.roots.find(r => r.id === f.root);
  return [root?.name, f.path].filter(Boolean).join('/') || f.name;
}

function layout({ roots, folders }: Tree): { rows: Row[]; order: string[] } {
  const rows: Row[] = [];
  const order: string[] = [];
  const walk = (key: string, depth: number) => {
    const f = folders[key];
    if (!f) return;
    rows.push({ kind: 'folder', key, depth });
    if (!f.expanded || f.state !== 'open') return;
    for (const uid of f.tracks) {
      rows.push({ kind: 'track', uid, depth: depth + 1 });
      order.push(uid);
    }
    for (const child of f.folders) walk(child, depth + 1);
  };
  for (const root of roots) walk(folderKeyOf(root.id, ''), 0);
  return { rows, order };
}

const closedFolder = (root: string, path: string, name: string, parent: string | null, handle: FileSystemDirectoryHandle): Folder => ({
  key: folderKeyOf(root, path),
  root,
  path,
  name,
  parent,
  handle,
  state: 'closed',
  expanded: false,
  folders: [],
  tracks: [],
  versions: false,
  compare: false,
  remaster: null,
  index: null,
});

/** Whether the Notes panel shows: in a folder of versions unless closed, elsewhere only when asked for. */
export const notesVisible = (s: StemState): boolean => {
  const folder = selectCurrent(s);
  return isReviewable(folder) ? s.notesOpen : !!folder && s.offerFor === folder.key;
};

export const selectActiveRevision = (s: StemState) => (s.activeRevisionId ? (s.revisions[s.activeRevisionId] ?? null) : null);

/** The set the open review's revision files describe, and the file times they record. */
export function reviewJobOf(s: StemState): { folder: Folder; name: string; index: ImageSetIndex; files: Record<string, number>; ids: string[] } | null {
  const folder = s.review ? s.folders[s.review] : null;
  if (!folder) return null;
  const tracks = folder.tracks.map(uid => s.tracks[uid]).filter(Boolean);
  const files: Record<string, number> = {};
  for (const t of tracks) if (t.lastModified) files[t.id] = t.lastModified;
  return {
    folder,
    name: folder.name,
    index: reviewIndex(folder.name, { tracks, remaster: folder.remaster, index: folder.index }, { ladder: folder.versions, path: absPathOf(s, folder) ?? undefined }),
    files,
    ids: tracks.map(t => t.id),
  };
}

// ── the store ─────────────────────────────────────────────────────────────────

export const useStemStore = create<StemState>((set, get) => {
  const saveTimers = new Map<string, ReturnType<typeof setTimeout>>();
  const saveChains = new Map<string, Promise<void>>();
  const diskModified: Record<string, number> = {};
  let reviewToken = 0;
  // decoding: what is waiting, how much is in memory, and when each track was last selected
  let queue: { uid: string; need: boolean }[] = [];
  let loading = 0;
  const sizes = new Map<string, number>();
  const lastUsed = new Map<string, number>();
  let clock = 0;
  const inMemory = () => [...sizes.values()].reduce((a, b) => a + b, 0);

  const sync = () => {
    if (!engine) return;
    const heard = engine.heard;
    const same = heard.length === get().heard.length && heard.every((id, i) => id === get().heard[i]);
    set(s => ({ playing: engine!.playing, waiting: engine!.waiting, duration: engine!.duration, loop: engine!.loop, looping: engine!.looping, stamp: s.stamp + 1, ...(same ? {} : { heard }) }));
  };

  const ensureEngine = () => {
    if (!engine) {
      engine = new StemEngine();
      engine.onChange = sync;
      engine.setVolume(get().volume);
    }
    return engine;
  };

  const patchFolder = (key: string, patch: Partial<Folder>) => set(s => (s.folders[key] ? { folders: { ...s.folders, [key]: { ...s.folders[key], ...patch } } } : {}));
  const patchTrack = (uid: string, patch: Partial<Track>) => set(s => (s.tracks[uid] ? { tracks: { ...s.tracks, [uid]: { ...s.tracks[uid], ...patch } } } : {}));
  const relayout = () => set(s => layout(s));

  /** The engine hears the selected tracks that are loaded; one heard alone in a matched folder is turned down to its level. */
  const syncHeard = () => {
    if (!engine) return;
    const s = get();
    const heard = s.sel.selected.filter(uid => s.tracks[uid]?.status === 'ready');
    const gains: Record<string, number> = {};
    // with several heard the trims are left out, so the balance between them is never changed
    if (heard.length === 1) gains[heard[0]] = dbToGain(trimOf(s, heard[0]));
    engine.setHeard(heard, gains);
    sync();
  };

  /** Frees the tracks used longest ago that aren't selected, once the decoded audio passes the budget. */
  const evict = () => {
    if (inMemory() <= MEMORY_BUDGET) return;
    const keep = new Set(get().sel.selected);
    const oldest = [...sizes.keys()].filter(uid => !keep.has(uid)).sort((a, b) => (lastUsed.get(a) ?? 0) - (lastUsed.get(b) ?? 0));
    for (const uid of oldest) {
      if (inMemory() <= MEMORY_BUDGET) break;
      engine?.removeBuffer(uid);
      sizes.delete(uid);
      patchTrack(uid, { status: 'idle' });
    }
  };

  const measure = async (uid: string) => {
    const buffer = engine?.buffer(uid);
    const t = get().tracks[uid];
    if (!buffer || !t || t.levels || !isReviewable(get().folders[t.folder])) return;
    await yieldToPaint();
    patchTrack(uid, { levels: measureLoudness(buffer) });
    syncHeard();
  };

  const load = async (uid: string) => {
    const t = get().tracks[uid];
    const folder = t && get().folders[t.folder];
    if (!t || !folder) return;
    patchTrack(uid, { status: 'loading' });
    try {
      const file = await readFileIn(folder.handle, t.file);
      if (!file) throw new Error('the file is gone');
      const buffer = await ensureEngine().decode(await file.arrayBuffer());
      if (!get().tracks[uid]) return; // its root was closed meanwhile
      engine!.setBuffer(uid, buffer);
      sizes.set(uid, buffer.length * buffer.numberOfChannels * 4);
      set(s => ({
        tracks: { ...s.tracks, [uid]: { ...s.tracks[uid], status: 'ready', length: buffer.duration, lastModified: file.lastModified } },
        peaks: { ...s.peaks, [uid]: waveformPeaks(buffer, WAVEFORM_BUCKETS) },
      }));
      syncHeard();
      evict();
      void measure(uid);
    } catch (err) {
      console.error(err);
      patchTrack(uid, { status: 'error' });
      toast.error(`Could not play ${t.file}: ${errorMessage(err)}`, { duration: 8000 });
    }
  };

  const pump = () => {
    while (loading < LOADING_AT_ONCE && queue.length) {
      const next = queue.shift()!;
      const status = get().tracks[next.uid]?.status;
      if (!status || status === 'ready' || status === 'loading') continue;
      // loading ahead stops short of the budget, so it never pushes out what was listened to
      if (!next.need && inMemory() > MEMORY_BUDGET * 0.8) continue;
      loading++;
      void load(next.uid).finally(() => {
        loading--;
        pump();
      });
    }
  };

  /** Decode a track: now when it is selected (`need`), behind those when it is only near the selection. */
  const want = (uid: string, need: boolean) => {
    const status = get().tracks[uid]?.status;
    if (!status || status === 'ready' || status === 'loading' || (status === 'error' && !need)) return;
    queue = queue.filter(q => q.uid !== uid || (q.need && !need));
    if (queue.some(q => q.uid === uid)) return;
    if (need) {
      const firstAhead = queue.findIndex(q => !q.need);
      queue.splice(firstAhead < 0 ? queue.length : firstAhead, 0, { uid, need });
    } else queue.push({ uid, need });
    pump();
  };

  const updateUrl = () => {
    const s = get();
    const folder = selectCurrent(s);
    const params = new URLSearchParams(window.location.search);
    for (const key of ['job', 'path', 'track']) params.delete(key);
    if (folder) {
      const abs = s.roots.find(r => r.id === folder.root)?.absPath;
      if (abs) params.set('path', folder.path ? `${abs}/${folder.path}` : abs);
      else params.set('job', jobNameOf(s, folder));
    }
    const query = params.toString();
    window.history.replaceState(window.history.state, '', `${window.location.pathname}${query ? `?${query}` : ''}`);
  };

  // ── revisions of the current project ────────────────────────────────────────

  const loadRevisions = async (token: number, keepActive: boolean) => {
    const job = reviewJobOf(get());
    if (!job) return;
    const dir = await getSubdir(job.folder.handle, revisionsDirName(job.name), false).catch(() => null);
    if (token !== reviewToken) return;
    const { revisions: current, dirty } = get();
    const revisions: Record<string, ImageRevision> = {};
    if (dir) {
      for (const name of await listFileNames(dir)) {
        const id = revisionIdFromFile(name);
        if (!id) continue;
        if (dirty[id] && current[id]) {
          revisions[id] = current[id];
          continue;
        }
        try {
          const res = await readJsonIn(dir, name);
          if (!res) continue;
          revisions[id] = res.lastModified === diskModified[id] && current[id] ? current[id] : normalizeRevision(res.data, id);
          diskModified[id] = res.lastModified;
        } catch (err) {
          toast.error(`Could not read ${name}: ${errorMessage(err)}`, { duration: 6000 });
        }
      }
    }
    if (token !== reviewToken) return;
    const ids = Object.keys(revisions).sort(byNumber);
    // nothing changed on disk: keep the same objects, so nothing redraws
    if (ids.length === get().revisionIds.length && ids.every(id => revisions[id] === current[id])) return;
    const active = keepActive && get().activeRevisionId && revisions[get().activeRevisionId!] ? get().activeRevisionId : (ids[ids.length - 1] ?? null);
    set({ revisions, revisionIds: ids, activeRevisionId: active });
  };

  /** The review follows the current project: a folder of versions has revisions, any other has none. */
  const switchReview = async () => {
    const folder = selectCurrent(get());
    const next = folder && isReviewable(folder) ? folder.key : null;
    if (next === get().review) return;
    await get().flushSaves();
    const token = ++reviewToken;
    for (const k of Object.keys(diskModified)) delete diskModified[k];
    set({ review: next, revisions: {}, revisionIds: [], activeRevisionId: null, dirty: {}, saveState: 'idle' });
    if (next) await loadRevisions(token, false);
  };

  const scheduleSave = (id: string) => {
    clearTimeout(saveTimers.get(id));
    saveTimers.set(id, setTimeout(() => void get().saveRevision(id), AUTOSAVE_MS));
  };

  const update = (id: string, fn: (r: ImageRevision) => ImageRevision) => {
    const files = reviewJobOf(get())?.files ?? {};
    set(s => {
      const current = s.revisions[id];
      if (!current) return {};
      const next = { ...fn(current), updatedAt: new Date().toISOString(), renders: { ...files } };
      return { revisions: { ...s.revisions, [id]: next }, dirty: { ...s.dirty, [id]: true } };
    });
    scheduleSave(id);
  };

  /** The revision edits go to: the active one, or a new one when there is none or it is resolved. */
  const editable = async (): Promise<string | null> => {
    const active = selectActiveRevision(get());
    if (active && active.status !== 'resolved') return active.id;
    if (active) toast.message(`${active.id} is resolved: starting a new revision`);
    return get().newRevision();
  };

  // ── the tree ────────────────────────────────────────────────────────────────

  /** Reads a folder (once) and unfolds it. False when it could not be read. */
  const expand = async (key: string): Promise<boolean> => {
    const f = get().folders[key];
    const root = f && get().roots.find(r => r.id === f.root);
    if (!f || !root) return false;
    if (root.status === 'needs-permission') {
      if ((await requestReadWrite(root.handle)) !== 'granted') {
        toast.error(`Access to ${root.name} was not granted`);
        return false;
      }
      set(s => ({ roots: s.roots.map(r => (r.id === root.id ? { ...r, status: 'ready' } : r)) }));
    }
    if (f.state === 'open') {
      patchFolder(key, { expanded: true });
      relayout();
      return true;
    }
    patchFolder(key, { state: 'loading' });
    try {
      const listing = await readFolder(f.handle, f.parent ? get().folders[f.parent]?.name : undefined);
      set(s => {
        if (!s.folders[key]) return {};
        const folders = { ...s.folders };
        const tracks = { ...s.tracks };
        const children = listing.folders.map(c => {
          const child = closedFolder(f.root, f.path ? `${f.path}/${c.name}` : c.name, c.name, key, c.handle);
          folders[child.key] ??= child;
          return child.key;
        });
        const uids = listing.tracks.map(t => {
          const uid = uidOf(key, t.id);
          tracks[uid] = { ...(tracks[uid] ?? { status: 'idle' as const }), ...t, uid, folder: key };
          return uid;
        });
        folders[key] = { ...folders[key], state: 'open', expanded: true, folders: children, tracks: uids, versions: listing.versions, remaster: listing.remaster, index: listing.index };
        return { folders, tracks, ...layout({ roots: s.roots, folders, tracks }) };
      });
      return true;
    } catch (err) {
      console.error(err);
      patchFolder(key, { state: 'error' });
      toast.error(`Could not read ${f.name}: ${errorMessage(err)}`);
      return false;
    }
  };

  /** Unfolds the folders from a root down to `parts`, and gives the last one's key. */
  const expandPath = async (rootId: string, parts: string[]): Promise<string | null> => {
    let key = folderKeyOf(rootId, '');
    if (!(await expand(key))) return null;
    let path = '';
    for (const part of parts) {
      path = path ? `${path}/${part}` : part;
      key = folderKeyOf(rootId, path);
      if (!get().folders[key] || !(await expand(key))) return null;
    }
    return key;
  };

  const applySelection = (next: Selection) => {
    const before = currentKey(get());
    if (next === get().sel) return;
    set({ sel: next });
    const s = get();
    for (const uid of next.selected) {
      lastUsed.set(uid, ++clock);
      want(uid, true);
    }
    const focus = next.focus ? s.tracks[next.focus] : undefined;
    if (focus) {
      // the rest of this folder, nearest first, so the next arrow press is instant; what was queued for another folder is dropped
      const siblings = s.folders[focus.folder]?.tracks ?? [];
      const at = siblings.indexOf(focus.uid);
      queue = queue.filter(q => q.need || s.tracks[q.uid]?.folder === focus.folder);
      [...siblings].sort((a, b) => Math.abs(siblings.indexOf(a) - at) - Math.abs(siblings.indexOf(b) - at)).forEach(uid => want(uid, false));
    }
    syncHeard();
    if (currentKey(s) !== before) {
      updateUrl();
      void switchReview();
    }
  };

  /** Selects a folder's first track (or the one a link names). */
  const selectIn = (key: string, trackId?: string | null) => {
    const f = get().folders[key];
    const uid = f && ((trackId && f.tracks.find(u => u === uidOf(key, trackId))) || f.tracks[0]);
    if (uid) applySelection(click(EMPTY, get().order, uid));
  };

  const addRoot = async (handle: FileSystemDirectoryHandle, opts: { absPath?: string; persist: boolean }): Promise<string | null> => {
    for (const r of get().roots) {
      const same = opts.absPath ? r.absPath === opts.absPath : !r.absPath && (await r.handle.isSameEntry(handle).catch(() => false));
      if (same) return (await expand(folderKeyOf(r.id, ''))) ? r.id : null;
    }
    // folders opened by path aren't real browser handles: they can't be kept
    const id = opts.persist ? (await remembered.addSource(handle)).id : `path-${crypto.randomUUID()}`;
    const root: Root = { id, name: handle.name, handle, status: 'ready', absPath: opts.absPath };
    set(s => ({ roots: [...s.roots, root], folders: { ...s.folders, [folderKeyOf(id, '')]: closedFolder(id, '', handle.name, null, handle) } }));
    return (await expand(folderKeyOf(id, ''))) ? id : null;
  };

  /** The folder a link names, under the roots that can be read; true when it was found and selected. */
  const resolveJob = async (job: string, trackId?: string | null): Promise<boolean> => {
    for (const root of get().roots.filter(r => r.status === 'ready')) {
      const parts = await findFolder(root.handle, job).catch(() => null);
      const key = parts && (await expandPath(root.id, parts));
      if (!key) continue;
      set({ pendingJob: null });
      selectIn(key, trackId);
      return true;
    }
    return false;
  };

  return {
    support: 'checking',
    roots: [],
    folders: {},
    tracks: {},
    peaks: {},
    rows: [],
    order: [],
    sel: EMPTY,
    recent: [],
    pendingJob: null,
    playing: false,
    waiting: false,
    heard: [],
    stamp: 0,
    duration: 0,
    loop: null,
    looping: false,
    volume: 1,
    matched: {},
    notesOpen: true,
    offerFor: null,
    review: null,
    revisions: {},
    revisionIds: [],
    activeRevisionId: null,
    dirty: {},
    saveState: 'idle',
    composerFocus: 0,
    shortcutsOpen: false,

    init: async () => {
      const support = getFolderSupport();
      const params = new URLSearchParams(window.location.search);
      const byPath = params.get('path');
      const track = params.get('track');
      if (!support.supported) {
        set({ support: support.reason });
        // a path through the local app needs no folder picker
        if (byPath) await get().openPath(byPath, track);
        return;
      }
      set({ support: 'ok' });
      const [recent, stored] = await Promise.all([remembered.loadRecent().catch(() => []), remembered.loadSources().catch(() => [])]);
      const roots: Root[] = [];
      const folders: Record<string, Folder> = {};
      for (const e of stored) {
        const granted = (await queryReadWrite(e.handle)) === 'granted';
        roots.push({ id: e.id, name: e.name, handle: e.handle, status: granted ? 'ready' : 'needs-permission' });
        folders[folderKeyOf(e.id, '')] = closedFolder(e.id, '', e.name, null, e.handle);
      }
      set(s => ({ recent, roots, folders, ...layout({ roots, folders, tracks: s.tracks }) }));
      if (byPath) return get().openPath(byPath, track);
      const job = params.get('job');
      if (job && !(await resolveJob(job, track))) set({ pendingJob: job });
    },

    pickRoot: async () => {
      try {
        const handle = await pickFolder();
        const id = await addRoot(handle, { persist: true });
        if (!id) return;
        const pending = get().pendingJob;
        if (pending && (await resolveJob(pending))) return;
        if (!get().sel.focus) selectIn(folderKeyOf(id, ''));
      } catch (err) {
        if (!isAbortError(err)) toast.error(errorMessage(err));
      }
    },

    openPath: async (absPath, track) => {
      const res = await openDevFolder(absPath.trim());
      if ('error' in res) {
        if (res.error === 'no-dev-server') toast.error('A path opens only while the app runs on this computer (the local dev server). Here, open the folder instead.', { duration: 8000 });
        else toast.error(`No folder at ${absPath}`);
        return;
      }
      const id = await addRoot(res.handle, { absPath: res.path, persist: false });
      if (id) selectIn(folderKeyOf(id, ''), track);
    },

    openRecent: async entry => {
      if ((await requestReadWrite(entry.handle)) !== 'granted') {
        toast.error('Access to the folder was not granted');
        return;
      }
      const id = await addRoot(entry.handle, { persist: true });
      if (id && !get().sel.focus) selectIn(folderKeyOf(id, ''));
    },

    forgetRecent: async id => {
      await remembered.forgetRecent(id);
      set({ recent: await remembered.loadRecent() });
    },

    closeRoot: async id => {
      const root = get().roots.find(r => r.id === id);
      if (!root) return;
      if (get().review && get().folders[get().review!]?.root === id) await get().flushSaves();
      const gone = new Set(Object.values(get().tracks).filter(t => get().folders[t.folder]?.root === id).map(t => t.uid));
      for (const uid of gone) {
        engine?.removeBuffer(uid);
        sizes.delete(uid);
        lastUsed.delete(uid);
      }
      queue = queue.filter(q => !gone.has(q.uid));
      set(s => {
        const roots = s.roots.filter(r => r.id !== id);
        const folders = Object.fromEntries(Object.entries(s.folders).filter(([, f]) => f.root !== id));
        const tracks = Object.fromEntries(Object.entries(s.tracks).filter(([uid]) => !gone.has(uid)));
        const peaks = Object.fromEntries(Object.entries(s.peaks).filter(([uid]) => !gone.has(uid)));
        return { roots, folders, tracks, peaks, ...layout({ roots, folders, tracks }) };
      });
      if (!root.absPath) await remembered.removeSource(id).catch(() => undefined);
      applySelection(prune(get().sel, uid => !!get().tracks[uid]));
      if (!get().sel.focus) {
        updateUrl();
        void switchReview();
      }
    },

    toggleFolder: async key => {
      const f = get().folders[key];
      if (!f) return;
      if (f.expanded && f.state === 'open') {
        patchFolder(key, { expanded: false });
        relayout();
        return;
      }
      if (!(await expand(key))) return;
      // a link that waited for this root's access can be followed now
      const pending = get().pendingJob;
      if (pending && !f.parent) await resolveJob(pending);
    },

    setCompare: (key, on) => {
      patchFolder(key, { compare: on });
      if (on) {
        set({ notesOpen: true });
        for (const uid of get().folders[key]?.tracks ?? []) void measure(uid);
      }
      syncHeard();
      void switchReview();
    },

    clickTrack: (uid, mods) => applySelection(click(get().sel, get().order, uid, mods)),
    moveFocus: (delta, extend) => applySelection(move(get().sel, get().order, delta, extend)),
    selectProject: () => {
      const folder = selectCurrent(get());
      if (folder) applySelection(selectAll(get().sel, folder.tracks));
    },
    selectByKey: key => {
      const s = get();
      const uid = selectCurrent(s)?.tracks.find(u => s.tracks[u]?.key === key);
      if (uid) applySelection(click(s.sel, s.order, uid));
      return !!uid;
    },

    togglePlay: () => {
      if (!get().sel.selected.length) {
        toast.message('Select a track in the sidebar first');
        return;
      }
      void ensureEngine().toggle();
    },
    pause: () => engine?.pause(),
    seek: t => engine?.seek(t),
    nudge: dt => engine && engine.seek(engine.position() + dt),
    setLoop: range => engine?.setLoop(range),
    setLooping: on => engine?.setLooping(on),
    setLoopEdge: edge => {
      if (!engine) return;
      const at = engine.position();
      const loop = engine.loop ?? { start: 0, end: engine.duration };
      const next = edge === 'start' ? { start: at, end: loop.end > at + 0.05 ? loop.end : engine.duration } : { start: loop.start < at - 0.05 ? loop.start : 0, end: at };
      engine.setLoop(next, true);
    },
    setMatched: on => {
      const folder = selectCurrent(get());
      if (!folder || !isReviewable(folder)) return;
      // every version has to be measured before they can be matched
      if (on) for (const uid of folder.tracks) want(uid, true);
      set(s => ({ matched: { ...s.matched, [folder.key]: on } }));
      syncHeard();
    },
    setVolume: v => {
      set({ volume: v });
      engine?.setVolume(v);
    },

    setNotesOpen: open => {
      const folder = selectCurrent(get());
      if (isReviewable(folder)) set({ notesOpen: open });
      else set({ offerFor: open && folder ? folder.key : null });
    },

    /** Re-reads the current project: Claude replies to revisions, re-renders versions and writes remaster.json while the page is open. */
    refresh: async () => {
      const job = reviewJobOf(get());
      if (!job) return;
      const token = reviewToken;
      const key = job.folder.key;
      const listing = await readFolder(job.folder.handle, job.folder.parent ? get().folders[job.folder.parent]?.name : undefined).catch(() => null);
      if (token !== reviewToken || !get().folders[key]) return;
      const shape = (t: TrackFile) => ({ id: t.id, file: t.file, label: t.label, key: t.key, info: t.info ?? null });
      const now = job.folder.tracks.map(uid => get().tracks[uid]).filter(Boolean);
      const fresh = listing && JSON.stringify([listing.tracks.map(shape), listing.remaster]) !== JSON.stringify([now.map(shape), job.folder.remaster]);
      if (listing && fresh) {
        const kept = new Set(listing.tracks.map(t => uidOf(key, t.id)));
        for (const uid of job.folder.tracks.filter(u => !kept.has(u))) {
          engine?.removeBuffer(uid);
          sizes.delete(uid);
        }
        set(s => {
          const tracks = { ...s.tracks };
          for (const uid of s.folders[key].tracks) if (!kept.has(uid)) delete tracks[uid];
          for (const t of listing.tracks) {
            const uid = uidOf(key, t.id);
            // what remaster.json said before goes: the new listing says what it says now
            const before: Partial<Track> = { ...(tracks[uid] ?? { status: 'idle' as const }) };
            delete before.info;
            tracks[uid] = { ...(before as Pick<Track, 'status'>), ...t, uid, folder: key };
          }
          const folders = { ...s.folders, [key]: { ...s.folders[key], tracks: [...kept], remaster: listing.remaster, index: listing.index, versions: listing.versions } };
          return { tracks, folders, ...layout({ roots: s.roots, folders, tracks }) };
        });
        applySelection(prune(get().sel, uid => !!get().tracks[uid]));
        syncHeard();
      }
      await loadRevisions(token, true);
    },

    newRevision: async () => {
      const job = reviewJobOf(get());
      if (!job) return null;
      await get().flushSaves();
      const id = nextRevisionId(get().revisionIds);
      const revision = { ...createRevision(id, job.name), renders: { ...job.files } };
      set(s => ({
        revisions: { ...s.revisions, [id]: revision },
        revisionIds: [...s.revisionIds, id].sort(byNumber),
        activeRevisionId: id,
        dirty: { ...s.dirty, [id]: true },
      }));
      await get().saveRevision(id);
      return id;
    },

    openRevision: id => set({ activeRevisionId: id }),

    setStatus: status => {
      const id = get().activeRevisionId;
      if (id) update(id, r => ({ ...r, status }));
    },

    toggleAction: async (action, target) => {
      const id = await editable();
      if (!id) return;
      const on = get().revisions[id][action].includes(target);
      update(id, rev => {
        // one final: picking another replaces it; a dropped version can't be the final
        const next = { ...rev, [action]: on ? rev[action].filter(t => t !== target) : action === 'final' ? [target] : [...new Set([...rev.drop, target])] };
        if (!on) {
          if (action === 'drop') next.final = next.final.filter(t => t !== target);
          else next.drop = next.drop.filter(t => t !== target);
        }
        return next;
      });
    },

    addComment: async (rawText, opts = {}) => {
      const text = rawText.trim();
      const job = reviewJobOf(get());
      if (!text || !job) return false;
      const focus = get().sel.focus ? get().tracks[get().sel.focus!] : undefined;
      const ids = opts.ids ?? (focus && focus.folder === job.folder.key ? [focus.id] : []);
      const revisionId = await editable();
      if (!revisionId) return false;
      const images = job.ids.filter(id => ids.includes(id));
      const comment: ImageComment = {
        id: nextCommentId(get().revisions[revisionId].comments),
        images,
        text,
        createdAt: new Date().toISOString(),
        status: 'open',
        ...(typeof opts.t === 'number' && images.length === 1 ? { pin: { image: images[0], x: 0, y: 0, t: Math.round(opts.t * 100) / 100 } } : {}),
      };
      update(revisionId, r => ({ ...r, comments: [...r.comments, comment] }));
      return true;
    },

    updateComment: (commentId, patch) => {
      const id = get().activeRevisionId;
      if (!id) return;
      update(id, r => ({ ...r, comments: r.comments.map(c => (c.id === commentId ? { ...c, ...patch, updatedAt: new Date().toISOString() } : c)) }));
    },

    deleteComment: async commentId => {
      const id = get().activeRevisionId;
      if (!id) return;
      update(id, r => ({ ...r, comments: r.comments.filter(c => c.id !== commentId) }));
    },

    saveRevision: id => {
      clearTimeout(saveTimers.get(id));
      saveTimers.delete(id);
      const run = async () => {
        const job = reviewJobOf(get());
        const revision = get().revisions[id];
        if (!job || !revision) return;
        set({ saveState: 'saving' });
        try {
          const dirName = revisionsDirName(job.name);
          const dir = await getSubdir(job.folder.handle, dirName, true);
          if (!dir) throw new Error(`Could not create ${dirName}`);
          diskModified[id] = await writeFileIn(dir, `${id}.json`, `${JSON.stringify(revision, null, 2)}\n`);
          await writeFileIn(dir, `${id}.md`, revisionToMarkdown(revision, job.index, { revisionsDir: dirName }));
          set(s => ({ dirty: s.revisions[id] === revision ? { ...s.dirty, [id]: false } : s.dirty, saveState: 'saved' }));
        } catch (err) {
          set({ saveState: 'error' });
          toast.error(`Could not save ${id}: ${errorMessage(err)}`, { duration: 6000 });
        }
      };
      const chained = (saveChains.get(id) ?? Promise.resolve()).then(run);
      saveChains.set(id, chained);
      return chained;
    },

    flushSaves: async () => {
      await Promise.all([...[...saveTimers.keys()].map(id => get().saveRevision(id)), ...saveChains.values()]);
    },

    requestComposerFocus: () => set(s => ({ composerFocus: s.composerFocus + 1, notesOpen: true })),
    setShortcutsOpen: open => set({ shortcutsOpen: open }),
  };
});

// In development the engine and the store can be reached from the console (window.__stemPlayer), to measure what plays.
if (process.env.NODE_ENV === 'development' && typeof window !== 'undefined') {
  (window as unknown as { __stemPlayer?: unknown }).__stemPlayer = { engine: getEngine, store: useStemStore };
}

/** The open review's set (see reviewJobOf), rebuilt only when what it is made from changes. */
export function useReviewJob() {
  const review = useStemStore(s => s.review);
  const folders = useStemStore(s => s.folders);
  const tracks = useStemStore(s => s.tracks);
  const roots = useStemStore(s => s.roots);
  // the state is read whole; these are the parts the set is made from
  return useMemo(() => reviewJobOf(useStemStore.getState()), [review, folders, tracks, roots]);
}

/**
 * Calls `draw` with the playhead's position on every frame while playing, and once whenever the
 * transport changes: the playhead and the clock are moved straight in the DOM, with no render.
 */
export function usePlayhead(draw: (pos: number, duration: number) => void) {
  const playing = useStemStore(s => s.playing);
  const stamp = useStemStore(s => s.stamp);
  useEffect(() => {
    let frame = 0;
    const tick = () => {
      draw(engine?.position() ?? 0, engine?.duration ?? 0);
      if (playing) frame = requestAnimationFrame(tick);
    };
    tick();
    // frames stop in a hidden tab; the song doesn't, so keep the readout roughly right there too
    const fallback = playing ? setInterval(tick, 250) : undefined;
    return () => {
      cancelAnimationFrame(frame);
      clearInterval(fallback);
    };
  }, [draw, playing, stamp]);
}
