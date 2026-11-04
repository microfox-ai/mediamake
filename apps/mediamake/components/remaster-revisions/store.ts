'use client';

import { useMemo } from 'react';
import { create } from 'zustand';
import { toast } from 'sonner';
import { isAbortError } from '@/lib/local-media/file-access';
import { getFolderSupport, getSubdir, listFileNames, pickFolder, queryReadWrite, readFileIn, readJsonIn, requestReadWrite, writeFileIn } from '@/lib/revisions/fs';
import type { RevisionStatus } from '@/lib/revisions/types';
import { createHistory, type RecentJob } from '@/lib/file-revisions/history';
import { createRevision, nextCommentId, nextRevisionId, normalizeRevision, revisionIdFromFile, revisionsDirName, revisionToMarkdown } from '@/lib/file-revisions/revision-file';
import type { ImageComment, ImageRevision } from '@/lib/file-revisions/types';
import { isDevHandle, linkNameOf, openDevFolder } from '@/lib/remaster-revisions/dev-folder';
import { findLadder, ladderJobName, readLadder, scanLadders, type Ladder, type LadderEntry, type LadderVersion } from '@/lib/remaster-revisions/ladder';
import { measureLoudness, waveformPeaks } from '@/lib/remaster-revisions/loudness';
import { LadderPlayer } from '@/lib/remaster-revisions/player';
import { LEVEL_WARN_LU, type LoopRange, type MeasuredLevels } from '@/lib/remaster-revisions/types';

/*
 * State for the remaster revision screen: the open ladder (a folder of versions of one song),
 * every version decoded into one player with a shared playhead, what the browser measured, and
 * the revisions saved beside the files (the same files /file-revision writes).
 */

export type Support = 'checking' | 'ok' | 'insecure' | 'browser';
export type SaveState = 'idle' | 'saving' | 'saved' | 'error';
export type VersionAction = 'final' | 'drop';

const history = createHistory('mediamake-remaster-revisions');

export interface SourceState {
  id: string;
  name: string;
  handle: FileSystemDirectoryHandle;
  status: 'ready' | 'needs-permission' | 'scanning' | 'error';
  ladders: LadderEntry[];
}

export interface OpenLadder {
  /** The folder's name (v1): the revision files are named after it. */
  name: string;
  /** Its path under a source (AMZ/fma-edwardeleric/remaster/v1), when opened from one. */
  path?: string;
  /** Its absolute path, when opened by path through the dev server. */
  absPath?: string;
  handle: FileSystemDirectoryHandle;
  ladder: Ladder;
}

export interface Loading {
  done: number;
  total: number;
  current?: string;
  /** Decoding failed for these (unsupported format, a damaged file). */
  failed: string[];
}

interface RemasterState {
  support: Support;
  sources: SourceState[];
  recent: RecentJob[];
  /** A ?job= deep link waiting for one click to grant access. */
  pendingJob: string | null;
  job: OpenLadder | null;
  loading: Loading | null;
  /** lastModified of each version's file: the revision records them. */
  files: Record<string, number>;
  levels: Record<string, MeasuredLevels>;
  peaks: Record<string, Float32Array>;
  // playback, mirrored from the player for rendering
  ready: boolean;
  playing: boolean;
  active: string | null;
  loop: LoopRange | null;
  looping: boolean;
  duration: number;
  matched: boolean;
  volume: number;
  // revisions
  revisions: Record<string, ImageRevision>;
  revisionIds: string[];
  activeRevisionId: string | null;
  dirty: Record<string, boolean>;
  saveState: SaveState;
  composerFocus: number;
  shortcutsOpen: boolean;

  init: () => Promise<void>;
  pickJob: () => Promise<void>;
  openJob: (handle: FileSystemDirectoryHandle, path?: string, absPath?: string) => Promise<void>;
  /** A folder by its absolute path, through the local dev server (the deployed app can't). */
  openPath: (absPath: string) => Promise<void>;
  openRecent: (entry: RecentJob) => Promise<void>;
  forgetRecent: (id: string) => Promise<void>;
  addSource: () => Promise<void>;
  reconnectSource: (id: string) => Promise<void>;
  removeSource: (id: string) => Promise<void>;
  rescanSources: () => Promise<void>;
  refresh: () => Promise<void>;

  play: () => Promise<void>;
  pause: () => void;
  togglePlay: () => void;
  seek: (t: number) => void;
  nudge: (dt: number) => void;
  setActive: (id: string) => void;
  stepActive: (delta: number) => void;
  setLoop: (range: LoopRange | null) => void;
  setLooping: (on: boolean) => void;
  /** Moves one edge of the loop to the playhead (a loop from the start when there is none). */
  setLoopEdge: (edge: 'start' | 'end') => void;
  setMatched: (on: boolean) => void;
  setVolume: (v: number) => void;

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
const byNumber = (a: string, b: string) => a.localeCompare(b, undefined, { numeric: true });
const errorMessage = (err: unknown) => (err instanceof Error ? err.message : String(err));

let player: LadderPlayer | null = null;
/** The player, for reading the playhead every frame (null until a ladder is open). */
export const getPlayer = () => player;

export const selectActiveRevision = (s: RemasterState) => (s.activeRevisionId ? (s.revisions[s.activeRevisionId] ?? null) : null);

/** The loudness of each version: the sidecar's integrated loudness, else what the browser measured. */
export const levelOf = (s: Pick<RemasterState, 'job' | 'levels'>, id: string): { lufs: number; from: 'sidecar' | 'measured' } | null => {
  const info = s.job?.ladder.versions.find(v => v.id === id)?.info;
  if (typeof info?.lufs === 'number') return { lufs: info.lufs, from: 'sidecar' };
  const m = s.levels[id];
  return m && Number.isFinite(m.lufs) ? { lufs: m.lufs, from: 'measured' } : null;
};

/** The loudest and quietest versions, and how far apart they are (null until two are known). */
export const levelSpread = (s: Pick<RemasterState, 'job' | 'levels'>): { loudest: string; quietest: string; lu: number } | null => {
  const known = (s.job?.ladder.versions ?? []).map(v => [v.id, levelOf(s, v.id)?.lufs] as const).filter((x): x is readonly [string, number] => typeof x[1] === 'number');
  if (known.length < 2) return null;
  const loudest = known.reduce((a, b) => (b[1] > a[1] ? b : a));
  const quietest = known.reduce((a, b) => (b[1] < a[1] ? b : a));
  return { loudest: loudest[0], quietest: quietest[0], lu: loudest[1] - quietest[1] };
};

export const levelsDiffer = (s: Pick<RemasterState, 'job' | 'levels'>) => (levelSpread(s)?.lu ?? 0) > LEVEL_WARN_LU;

const NO_VERSIONS: LadderVersion[] = [];

/** The open ladder's versions (a stable empty list when none is open). */
export const useVersions = () => useRemasterStore(s => s.job?.ladder.versions ?? NO_VERSIONS);

/** Selectors that build new objects must be memoised: the store compares by identity. */
export function useLevelSpread() {
  const job = useRemasterStore(s => s.job);
  const levels = useRemasterStore(s => s.levels);
  return useMemo(() => levelSpread({ job, levels }), [job, levels]);
}

export function useLevelOf(id: string | null) {
  const job = useRemasterStore(s => s.job);
  const levels = useRemasterStore(s => s.levels);
  return useMemo(() => (id ? levelOf({ job, levels }, id) : null), [job, levels, id]);
}

function updateUrl(job: string | null, absPath?: string) {
  const params = new URLSearchParams(window.location.search);
  params.delete('job');
  params.delete('path');
  if (absPath) params.set('path', absPath);
  else if (job) params.set('job', job);
  const query = params.toString();
  window.history.replaceState(window.history.state, '', `${window.location.pathname}${query ? `?${query}` : ''}`);
}

const yieldToPaint = () => new Promise<void>(resolve => setTimeout(resolve, 0));

export const useRemasterStore = create<RemasterState>((set, get) => {
  const saveTimers = new Map<string, ReturnType<typeof setTimeout>>();
  const saveChains = new Map<string, Promise<void>>();
  const diskModified: Record<string, number> = {};
  let loadToken = 0;

  const syncPlayer = () => {
    if (!player) return;
    set({ playing: player.playing, active: player.active, loop: player.loop, looping: player.looping, duration: player.duration, matched: player.matched });
  };

  /** Gains that bring every version down to the quietest one, from the levels known so far. */
  const applyTrims = () => {
    const s = get();
    const spread = levelSpread(s);
    if (!player || !spread) return;
    const ref = levelOf(s, spread.quietest)!.lufs;
    const trims: Record<string, number> = {};
    for (const v of s.job?.ladder.versions ?? []) {
      const level = levelOf(s, v.id);
      trims[v.id] = level ? ref - level.lufs : 0;
    }
    player.setTrims(trims);
  };

  const revisionsDir = async (create: boolean) => {
    const { job } = get();
    if (!job) return null;
    return getSubdir(job.handle, revisionsDirName(job.name), create);
  };

  const loadRevisions = async (token: number, keepActive: boolean) => {
    const dir = await revisionsDir(false).catch(() => null);
    if (token !== loadToken) return;
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
    if (token !== loadToken) return;
    const ids = Object.keys(revisions).sort(byNumber);
    const active = keepActive && get().activeRevisionId && revisions[get().activeRevisionId!] ? get().activeRevisionId : (ids[ids.length - 1] ?? null);
    set({ revisions, revisionIds: ids, activeRevisionId: active });
  };

  const scheduleSave = (id: string) => {
    clearTimeout(saveTimers.get(id));
    saveTimers.set(id, setTimeout(() => void get().saveRevision(id), AUTOSAVE_MS));
  };

  const update = (id: string, fn: (r: ImageRevision) => ImageRevision) => {
    set(s => {
      const current = s.revisions[id];
      if (!current) return {};
      const next = { ...fn(current), updatedAt: new Date().toISOString(), renders: { ...s.files } };
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

  const scanSource = async (source: SourceState): Promise<SourceState> => {
    try {
      return { ...source, status: 'ready', ladders: await scanLadders(source.handle) };
    } catch (err) {
      console.error(err);
      return { ...source, status: 'error', ladders: [] };
    }
  };

  const setSource = (next: SourceState) => set(s => ({ sources: s.sources.map(x => (x.id === next.id ? next : x)) }));

  /** Decodes every version into the player, measuring each as it lands. */
  const loadAudio = async (job: OpenLadder, token: number) => {
    const versions = job.ladder.versions;
    set({ loading: { done: 0, total: versions.length, current: versions[0]?.label, failed: [] } });
    for (const [i, v] of versions.entries()) {
      if (token !== loadToken) return;
      set(s => ({ loading: s.loading && { ...s.loading, current: v.label } }));
      try {
        const file = await readFileIn(job.handle, v.file);
        if (!file) throw new Error('file missing');
        const buffer = await player!.decode(await file.arrayBuffer());
        if (token !== loadToken) return;
        player!.add(v.id, buffer);
        // the first decoded version can play while the others load (they join in sync as they land)
        set(s => ({ ready: true, files: { ...s.files, [v.id]: file.lastModified }, peaks: { ...s.peaks, [v.id]: waveformPeaks(buffer, WAVEFORM_BUCKETS) } }));
        syncPlayer();
        await yieldToPaint();
        if (token !== loadToken) return;
        const levels = measureLoudness(buffer);
        set(s => ({ levels: { ...s.levels, [v.id]: levels } }));
        applyTrims();
      } catch (err) {
        console.error(err);
        set(s => ({ loading: s.loading && { ...s.loading, failed: [...s.loading.failed, v.label] } }));
        toast.error(`Could not decode ${v.file}: ${errorMessage(err)}`, { duration: 8000 });
      }
      set(s => ({ loading: s.loading && { ...s.loading, done: i + 1 } }));
      await yieldToPaint();
    }
    if (token !== loadToken) return;
    set({ ready: player!.ids.length > 0, loading: null });
    syncPlayer();
  };

  return {
    support: 'checking',
    sources: [],
    recent: [],
    pendingJob: null,
    job: null,
    loading: null,
    files: {},
    levels: {},
    peaks: {},
    ready: false,
    playing: false,
    active: null,
    loop: null,
    looping: false,
    duration: 0,
    matched: false,
    volume: 1,
    revisions: {},
    revisionIds: [],
    activeRevisionId: null,
    dirty: {},
    saveState: 'idle',
    composerFocus: 0,
    shortcutsOpen: false,

    init: async () => {
      const support = getFolderSupport();
      if (!support.supported) {
        set({ support: support.reason });
        return;
      }
      set({ support: 'ok' });
      const [recent, stored] = await Promise.all([history.loadRecent().catch(() => []), history.loadSources().catch(() => [])]);
      const sources: SourceState[] = [];
      for (const e of stored) {
        const granted = (await queryReadWrite(e.handle)) === 'granted';
        sources.push({ ...e, status: granted ? 'scanning' : 'needs-permission', ladders: [] });
      }
      set({ recent, sources });
      for (const source of sources.filter(x => x.status === 'scanning')) setSource(await scanSource(source));

      const params = new URLSearchParams(window.location.search);
      const byPath = params.get('path');
      if (byPath) return get().openPath(byPath);
      const wanted = params.get('job');
      if (!wanted) return;
      for (const source of get().sources.filter(x => x.status === 'ready')) {
        const listed = source.ladders.find(l => l.path === wanted || l.path.endsWith(`/${wanted}`));
        if (listed) return get().openJob(listed.handle, listed.path);
        const found = await findLadder(source.handle, wanted).catch(() => null);
        if (found) return get().openJob(found.handle, found.path);
      }
      const inRecent = recent.find(r => r.name === wanted || r.name.endsWith(`/${wanted}`));
      if (inRecent && (await queryReadWrite(inRecent.handle)) === 'granted') return get().openJob(inRecent.handle, inRecent.name);
      set({ pendingJob: wanted });
    },

    pickJob: async () => {
      try {
        const handle = await pickFolder(get().job?.handle);
        if (await readLadder(handle)) return get().openJob(handle);
        // a folder above the ladders (Downloads, a channel, a song): keep it as a source
        const ladders = await scanLadders(handle);
        if (!ladders.length) {
          toast.error(`No songs in ${handle.name}: pick a ladder folder (remaster/v1, with the versions as WAV, MP3 or FLAC) or a folder above it`, { duration: 7000 });
          return;
        }
        const entry = await history.addSource(handle);
        set(s => ({ sources: [...s.sources.filter(x => x.id !== entry.id), { ...entry, status: 'ready', ladders }] }));
        toast.success(`${handle.name} holds ${ladders.length} ladder${ladders.length === 1 ? '' : 's'}: added as a source`);
        if (ladders.length === 1) await get().openJob(ladders[0].handle, ladders[0].path);
      } catch (err) {
        if (!isAbortError(err)) toast.error(errorMessage(err));
      }
    },

    openPath: async absPath => {
      const res = await openDevFolder(absPath.trim());
      if ('error' in res) {
        if (res.error === 'no-dev-server') toast.error('A path opens only while the app runs on this computer (the local dev server). Here, open the folder instead.', { duration: 8000 });
        else toast.error(`No folder at ${absPath}`);
        set({ pendingJob: linkNameOf(absPath) });
        return;
      }
      await get().openJob(res.handle, linkNameOf(res.path), res.path);
    },

    openJob: async (handle, path, absPath) => {
      if ((await requestReadWrite(handle)) !== 'granted') {
        toast.error('Access to the folder was not granted');
        return;
      }
      await get().flushSaves();
      const ladder = await readLadder(handle);
      if (!ladder) {
        toast.error(`${handle.name} holds no audio files`);
        return;
      }
      const token = ++loadToken;
      player?.dispose();
      player = new LadderPlayer();
      player.onChange = syncPlayer;
      player.setVolume(get().volume);
      for (const k of Object.keys(diskModified)) delete diskModified[k];
      const job: OpenLadder = { name: handle.name, path, absPath, handle, ladder };
      set({
        job,
        files: {},
        levels: {},
        peaks: {},
        ready: false,
        playing: false,
        active: null,
        loop: null,
        looping: false,
        duration: 0,
        matched: false,
        revisions: {},
        revisionIds: [],
        activeRevisionId: null,
        dirty: {},
        pendingJob: null,
        saveState: 'idle',
      });
      updateUrl(ladderJobName(path, handle.name), absPath);
      await loadRevisions(token, false);
      // handles from the dev server aren't real ones: IndexedDB can't keep them
      if (!isDevHandle(handle)) void history.rememberJob(handle, ladderJobName(path, handle.name)).then(async () => set({ recent: await history.loadRecent() })).catch(() => undefined);
      await loadAudio(job, token);
    },

    openRecent: async entry => get().openJob(entry.handle, entry.name.includes('/') ? entry.name : undefined),

    forgetRecent: async id => {
      await history.forgetRecent(id);
      set({ recent: await history.loadRecent() });
    },

    addSource: async () => {
      try {
        const handle = await pickFolder();
        const entry = await history.addSource(handle);
        const source = await scanSource({ ...entry, status: 'scanning', ladders: [] });
        set(s => ({ sources: [...s.sources.filter(x => x.id !== entry.id), source] }));
        if (!source.ladders.length) toast.message(`No ladders (remaster/v<N> folders) in ${handle.name} yet`);
      } catch (err) {
        if (!isAbortError(err)) toast.error(errorMessage(err));
      }
    },

    reconnectSource: async id => {
      const source = get().sources.find(x => x.id === id);
      if (!source) return;
      if ((await requestReadWrite(source.handle)) !== 'granted') return;
      setSource({ ...source, status: 'scanning' });
      const scanned = await scanSource(source);
      setSource(scanned);
      const pending = get().pendingJob;
      if (!pending) return;
      const listed = scanned.ladders.find(l => l.path === pending || l.path.endsWith(`/${pending}`));
      const found = listed ?? (await findLadder(scanned.handle, pending).catch(() => null));
      if (found) await get().openJob(found.handle, found.path);
    },

    removeSource: async id => {
      await history.removeSource(id);
      set(s => ({ sources: s.sources.filter(x => x.id !== id) }));
    },

    rescanSources: async () => {
      for (const source of get().sources.filter(x => x.status === 'ready')) setSource(await scanSource(source));
    },

    /** Re-reads the revisions (Claude replies while the page is open) and the sidecar. */
    refresh: async () => {
      const { job } = get();
      if (!job) return;
      const token = loadToken;
      const ladder = await readLadder(job.handle).catch(() => null);
      if (token !== loadToken) return;
      if (ladder && JSON.stringify(ladder.remaster) !== JSON.stringify(job.ladder.remaster)) {
        set({ job: { ...job, ladder: { ...job.ladder, remaster: ladder.remaster, versions: job.ladder.versions.map(v => ({ ...v, info: ladder.versions.find(x => x.id === v.id)?.info })) } } });
        applyTrims();
      }
      await loadRevisions(token, true);
    },

    play: async () => {
      await player?.play();
    },
    pause: () => player?.pause(),
    togglePlay: () => void player?.toggle(),
    seek: t => player?.seek(t),
    nudge: dt => player && player.seek(player.position() + dt),
    setActive: id => player?.setActive(id),
    stepActive: delta => {
      if (!player) return;
      const ids = player.ids;
      const i = ids.indexOf(player.active ?? '');
      player.setActive(ids[(i + delta + ids.length) % ids.length]);
    },
    setLoop: range => player?.setLoop(range),
    setLooping: on => player?.setLooping(on),
    setLoopEdge: edge => {
      if (!player) return;
      const at = player.position();
      const loop = player.loop ?? { start: 0, end: player.duration };
      const next = edge === 'start' ? { start: at, end: loop.end > at + 0.05 ? loop.end : player.duration } : { start: loop.start < at - 0.05 ? loop.start : 0, end: at };
      player.setLoop(next, true);
    },
    setMatched: on => {
      applyTrims();
      player?.setMatched(on);
    },
    setVolume: v => {
      set({ volume: v });
      player?.setVolume(v);
    },

    newRevision: async () => {
      const { job, revisionIds } = get();
      if (!job) return null;
      await get().flushSaves();
      const id = nextRevisionId(revisionIds);
      const revision = { ...createRevision(id, job.name), renders: { ...get().files } };
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
      const r = get().revisions[id];
      const on = r[action].includes(target);
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
      if (!text) return false;
      const ids = opts.ids ?? (get().active ? [get().active!] : []);
      const revisionId = await editable();
      if (!revisionId) return false;
      const order = get().job?.ladder.versions.map(v => v.id) ?? [];
      const images = order.filter(id => ids.includes(id));
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
        const { job } = get();
        const revision = get().revisions[id];
        if (!job || !revision) return;
        set({ saveState: 'saving' });
        try {
          const dirName = revisionsDirName(job.name);
          const dir = await getSubdir(job.handle, dirName, true);
          if (!dir) throw new Error(`Could not create ${dirName}`);
          diskModified[id] = await writeFileIn(dir, `${id}.json`, `${JSON.stringify(revision, null, 2)}\n`);
          await writeFileIn(dir, `${id}.md`, revisionToMarkdown(revision, job.ladder.index, { revisionsDir: dirName }));
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

    requestComposerFocus: () => set(s => ({ composerFocus: s.composerFocus + 1 })),
    setShortcutsOpen: open => set({ shortcutsOpen: open }),
  };
});
