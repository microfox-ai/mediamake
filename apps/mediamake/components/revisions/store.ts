'use client';

import { create } from 'zustand';
import { toast } from 'sonner';
import { isAbortError, isNotFoundError } from '@/lib/local-media/file-access';
import { dedupe, parseVideoMap, sectionTargets, shotAt, shotsInRange, shotTargets, stepTarget } from '@/lib/revisions/map';
import { frameAt, frameBoundary, rangeFrames, roundMs, timeOfCut, timeOfFrame } from '@/lib/revisions/frames';
import {
  getFolderSupport,
  getSubdir,
  isDirectChild,
  listFileNames,
  listFolder,
  mapCandidates,
  pickFolder,
  pickVideoFile,
  queryReadWrite,
  readFileIn,
  readJsonIn,
  removeFileIn,
  requestReadWrite,
  revisionsDirName,
  writeFileIn,
  type FolderListing,
  type FolderSupport,
} from '@/lib/revisions/fs';
import { forgetRecent, loadRecent, rememberVideo, type RecentEntry } from '@/lib/revisions/history';
import {
  commentSortKey,
  createRevision,
  nextCommentId,
  nextRevisionId,
  normalizeRevision,
  revisionIdFromFile,
  revisionToMarkdown,
  snapshotFileName,
} from '@/lib/revisions/revision-file';
import type {
  Revision,
  RevisionComment,
  RevisionVideoInfo,
  TimeRange,
  VideoMap,
} from '@/lib/revisions/types';

/*
 * State for the revisions screen. The <video> element lives outside React
 * state (registerVideoElement); everything that moves the playhead goes
 * through seek() so the store and the element never disagree.
 */

const AUTOSAVE_MS = 700;
const DEFAULT_FPS = 30;

let videoEl: HTMLVideoElement | null = null;
let loadToken = 0;
const saveTimers = new Map<string, ReturnType<typeof setTimeout>>();
const saveChains = new Map<string, Promise<void>>();

export function registerVideoElement(el: HTMLVideoElement | null) {
  videoEl = el;
}

export function getVideoElement(): HTMLVideoElement | null {
  return videoEl;
}

export interface OpenVideo {
  name: string;
  handle: FileSystemFileHandle;
  url: string;
  size: number;
  lastModified: number;
  duration: number;
  width?: number;
  height?: number;
}

/** Something the user has to click before the browser lets us in. */
export type PendingAccess =
  | { kind: 'folder'; handle: FileSystemDirectoryHandle; videoName?: string }
  | { kind: 'file'; handle: FileSystemFileHandle };

type SaveState = 'idle' | 'saving' | 'saved' | 'error';

interface RevisionsState {
  support: FolderSupport | null;
  recent: RecentEntry[];
  pending: PendingAccess | null;
  /** A deep link asked for a folder that is not in history yet. */
  wanted: { folder: string; video?: string } | null;

  folder: { handle: FileSystemDirectoryHandle; name: string } | null;
  listing: FolderListing | null;
  video: OpenVideo | null;
  videoChangedOnDisk: boolean;
  map: VideoMap | null;
  mapFile: string | null;
  mapError: string | null;
  fpsOverride: number | null;
  detectedFps: number | null;

  currentTime: number;
  playing: boolean;
  loop: boolean;
  selection: TimeRange | null;

  revisionIds: string[];
  openRevisionIds: string[];
  activeRevisionId: string | null;
  revisions: Record<string, Revision>;
  diskModified: Record<string, number>;
  dirty: Record<string, boolean>;
  saveState: SaveState;
  highlightCommentId: string | null;
  composerFocusToken: number;

  init: () => Promise<void>;
  openFolderPicker: () => Promise<void>;
  openVideoPicker: () => Promise<void>;
  openDropped: (handles: FileSystemHandle[]) => Promise<void>;
  grantPending: () => Promise<void>;
  openWanted: () => Promise<void>;
  openFolder: (handle: FileSystemDirectoryHandle, preferredVideo?: string) => Promise<void>;
  resumeRecent: (entry: RecentEntry) => Promise<void>;
  forgetRecent: (id: string) => Promise<void>;
  openVideo: (name: string) => Promise<void>;
  refreshFromDisk: () => Promise<void>;

  setVideoMeta: (meta: { duration: number; width: number; height: number }) => void;
  setFpsOverride: (fps: number | null) => void;
  setDetectedFps: (fps: number) => void;
  setCurrentTime: (time: number) => void;
  setPlaying: (playing: boolean) => void;
  seek: (time: number) => void;
  togglePlay: () => void;
  pause: () => void;
  stepFrames: (frames: number) => void;
  jump: (direction: 1 | -1, kind: 'shot' | 'section') => void;
  toggleLoop: () => void;

  setSelection: (range: TimeRange | null) => void;
  setIn: () => void;
  setOut: () => void;

  newRevision: () => Promise<string | null>;
  openRevision: (id: string) => void;
  closeRevision: (id: string) => Promise<void>;
  setActiveRevision: (id: string) => void;
  updateRevision: (id: string, update: (r: Revision) => Revision) => void;
  saveRevision: (id: string) => Promise<void>;
  flushSaves: () => Promise<void>;

  addComment: (text: string) => Promise<boolean>;
  editComment: (commentId: string, patch: Partial<Pick<RevisionComment, 'text' | 'status'>>) => void;
  deleteComment: (commentId: string) => void;
  focusComment: (commentId: string) => void;
  requestComposerFocus: () => void;
}

export const selectFps = (s: Pick<RevisionsState, 'map' | 'fpsOverride' | 'detectedFps'>): number =>
  s.map?.fps ?? s.fpsOverride ?? s.detectedFps ?? DEFAULT_FPS;

export const selectDuration = (s: Pick<RevisionsState, 'video' | 'map'>): number =>
  s.video?.duration || s.map?.duration || 0;

export const selectActiveRevision = (s: RevisionsState): Revision | null =>
  s.activeRevisionId ? s.revisions[s.activeRevisionId] ?? null : null;

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

function updateUrl(folder: string | null, video: string | null) {
  const params = new URLSearchParams(window.location.search);
  if (folder) params.set('folder', folder);
  else params.delete('folder');
  if (video) params.set('video', video);
  else params.delete('video');
  const query = params.toString();
  window.history.replaceState(window.history.state, '', `${window.location.pathname}${query ? `?${query}` : ''}`);
}

/** Resolves once a pending seek has landed, so the element shows the frame currentTime names. */
function seekSettled(el: HTMLVideoElement): Promise<void> {
  if (!el.seeking && el.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) return Promise.resolve();
  return new Promise((resolve) => {
    const done = () => {
      clearTimeout(timer);
      el.removeEventListener('seeked', done);
      el.removeEventListener('loadeddata', done);
      resolve();
    };
    const timer = setTimeout(done, 3000);
    el.addEventListener('seeked', done);
    el.addEventListener('loadeddata', done);
  });
}

async function captureFrame(el: HTMLVideoElement): Promise<Blob | null> {
  await seekSettled(el);
  if (!el.videoWidth || !el.videoHeight) return null;
  const canvas = document.createElement('canvas');
  canvas.width = el.videoWidth;
  canvas.height = el.videoHeight;
  canvas.getContext('2d')?.drawImage(el, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.9));
}

const byNumber = (a: string, b: string) => a.localeCompare(b, undefined, { numeric: true });

export const useRevisionsStore = create<RevisionsState>((set, get) => {
  const videoInfo = (): RevisionVideoInfo | null => {
    const s = get();
    if (!s.video) return null;
    return {
      file: s.video.name,
      size: s.video.size,
      lastModified: s.video.lastModified,
      duration: selectDuration(s),
      fps: selectFps(s),
      width: s.video.width,
      height: s.video.height,
    };
  };

  const revisionsDir = async (create: boolean) => {
    const { folder, video } = get();
    if (!folder || !video) return null;
    return getSubdir(folder.handle, revisionsDirName(video.name), create);
  };

  const loadRevisions = async (token: number) => {
    const dir = await revisionsDir(false).catch(() => null);
    if (!dir || token !== loadToken) return;
    const revisions: Record<string, Revision> = {};
    const diskModified: Record<string, number> = {};
    for (const name of await listFileNames(dir)) {
      const id = revisionIdFromFile(name);
      if (!id) continue;
      try {
        const res = await readJsonIn(dir, name);
        if (!res) continue;
        revisions[id] = normalizeRevision(res.data, id);
        diskModified[id] = res.lastModified;
      } catch (err) {
        toast.error(`Could not read ${name}: ${errorMessage(err)}`, { duration: 6000 });
      }
    }
    if (token !== loadToken) return;
    const ids = Object.keys(revisions).sort(byNumber);
    const latest = ids[ids.length - 1] ?? null;
    set({
      revisions,
      diskModified,
      revisionIds: ids,
      openRevisionIds: latest ? [latest] : [],
      activeRevisionId: latest,
    });
  };

  const scheduleSave = (id: string) => {
    clearTimeout(saveTimers.get(id));
    saveTimers.set(
      id,
      setTimeout(() => void get().saveRevision(id), AUTOSAVE_MS),
    );
  };

  /** History is a convenience: failures never block opening. */
  const remember = async (handle: FileSystemDirectoryHandle, video?: string, sourcePath?: string) => {
    try {
      await rememberVideo(handle, video, sourcePath);
      set({ recent: await loadRecent() });
    } catch {
      // ignore
    }
  };

  return {
    support: null,
    recent: [],
    pending: null,
    wanted: null,
    folder: null,
    listing: null,
    video: null,
    videoChangedOnDisk: false,
    map: null,
    mapFile: null,
    mapError: null,
    fpsOverride: null,
    detectedFps: null,
    currentTime: 0,
    playing: false,
    loop: false,
    selection: null,
    revisionIds: [],
    openRevisionIds: [],
    activeRevisionId: null,
    revisions: {},
    diskModified: {},
    dirty: {},
    saveState: 'idle',
    highlightCommentId: null,
    composerFocusToken: 0,

    init: async () => {
      const support = getFolderSupport();
      set({ support });
      if (!support.supported) return;
      const recent = await loadRecent().catch(() => [] as RecentEntry[]);
      set({ recent });
      if (get().folder) return;

      const params = new URLSearchParams(window.location.search);
      const folderName = params.get('folder');
      const videoName = params.get('video') ?? undefined;
      const candidate = folderName
        ? recent.find((r) => r.folderName === folderName && (!videoName || r.video === videoName)) ??
          recent.find((r) => r.folderName === folderName)
        : recent[0];
      if (!candidate) {
        if (folderName) set({ wanted: { folder: folderName, video: videoName } });
        return;
      }
      const target = videoName ?? candidate.video;
      // "Allow on every visit" keeps the grant, so no click is needed.
      if ((await queryReadWrite(candidate.handle)) === 'granted') {
        await get().openFolder(candidate.handle, target);
      } else {
        set({ pending: { kind: 'folder', handle: candidate.handle, videoName: target } });
      }
    },

    openFolderPicker: async () => {
      try {
        const handle = await pickFolder(get().folder?.handle);
        await get().openFolder(handle);
      } catch (err) {
        if (isAbortError(err)) return;
        toast.error(`Could not open the folder: ${errorMessage(err)}`, { duration: 6000 });
      }
    },

    openVideoPicker: async () => {
      let file: FileSystemFileHandle;
      try {
        file = await pickVideoFile();
      } catch (err) {
        if (!isAbortError(err)) toast.error(`Could not open the video: ${errorMessage(err)}`, { duration: 6000 });
        return;
      }
      // Revisions are written beside the video, which needs the folder.
      // The folder picker opens in the video's folder; the user just confirms.
      set({ pending: { kind: 'file', handle: file } });
      await get().grantPending();
    },

    openDropped: async (handles) => {
      const dir = handles.find((h): h is FileSystemDirectoryHandle => h.kind === 'directory');
      if (dir) {
        set({ pending: { kind: 'folder', handle: dir } });
        await get().grantPending();
        return;
      }
      const file = handles.find((h): h is FileSystemFileHandle => h.kind === 'file');
      if (file) set({ pending: { kind: 'file', handle: file } });
    },

    grantPending: async () => {
      const pending = get().pending;
      if (!pending) return;
      if (pending.kind === 'folder') {
        await get().openFolder(pending.handle, pending.videoName);
        return;
      }
      try {
        const dir = await pickFolder(pending.handle);
        if (!(await isDirectChild(dir, pending.handle))) {
          toast.error(`Pick the folder that contains ${pending.handle.name}`, { duration: 6000 });
          return;
        }
        await get().openFolder(dir, pending.handle.name);
      } catch (err) {
        if (isAbortError(err)) return;
        // Without a fresh click the picker refuses; the pending card offers one.
        if (err instanceof DOMException && err.name === 'SecurityError') return;
        toast.error(`Could not open the folder: ${errorMessage(err)}`, { duration: 6000 });
      }
    },

    openWanted: async () => {
      const wanted = get().wanted;
      try {
        const handle = await pickFolder();
        if (wanted && handle.name !== wanted.folder) {
          toast.warning(`Opened "${handle.name}", the link asked for "${wanted.folder}"`, { duration: 5000 });
        }
        await get().openFolder(handle, wanted?.video);
      } catch (err) {
        if (!isAbortError(err)) toast.error(`Could not open the folder: ${errorMessage(err)}`, { duration: 6000 });
      }
    },

    openFolder: async (handle, preferredVideo) => {
      const permission = await requestReadWrite(handle);
      if (permission !== 'granted') {
        set({ pending: { kind: 'folder', handle, videoName: preferredVideo } });
        if (permission === 'denied') {
          toast.error('Edit access to the folder is needed to save revisions next to the video', {
            duration: 6000,
          });
        }
        return;
      }
      let listing: FolderListing;
      try {
        listing = await listFolder(handle);
      } catch (err) {
        toast.error(
          isNotFoundError(err)
            ? `"${handle.name}" was moved or deleted`
            : `Could not read "${handle.name}": ${errorMessage(err)}`,
          { duration: 6000 },
        );
        return;
      }
      await get().flushSaves();
      set({ folder: { handle, name: handle.name }, listing, pending: null, wanted: null });
      const pick =
        listing.videos.find((v) => v.name === preferredVideo) ??
        [...listing.videos].sort((a, b) => b.lastModified - a.lastModified)[0];
      if (pick) {
        await get().openVideo(pick.name);
      } else {
        const prev = get().video;
        if (prev) URL.revokeObjectURL(prev.url);
        set({ video: null, map: null, mapFile: null, revisions: {}, revisionIds: [], openRevisionIds: [], activeRevisionId: null });
        updateUrl(handle.name, null);
        void remember(handle);
        toast.info('No videos in this folder', { duration: 3000 });
      }
    },

    resumeRecent: async (entry) => {
      await get().openFolder(entry.handle, entry.video);
    },

    forgetRecent: async (id) => {
      await forgetRecent(id).catch(() => undefined);
      set({ recent: await loadRecent().catch(() => get().recent.filter((r) => r.id !== id)) });
    },

    openVideo: async (name) => {
      const { folder, listing } = get();
      const entry = listing?.videos.find((v) => v.name === name);
      if (!folder || !listing || !entry) return;
      await get().flushSaves();
      const token = ++loadToken;
      let file: File;
      try {
        file = await entry.handle.getFile();
      } catch (err) {
        toast.error(`Could not read ${name}: ${errorMessage(err)}`, { duration: 6000 });
        return;
      }

      let map: VideoMap | null = null;
      let mapFile: string | null = null;
      let mapError: string | null = null;
      for (const candidate of mapCandidates(name)) {
        if (!listing.jsonFiles.includes(candidate)) continue;
        try {
          const res = await readJsonIn(folder.handle, candidate);
          if (!res) continue;
          const parsed = parseVideoMap(res.data);
          // A shared map.json that names another render is not ours.
          if (candidate === 'map.json' && parsed.video && parsed.video !== name) continue;
          map = parsed;
          mapFile = candidate;
          mapError = null;
          break;
        } catch (err) {
          mapError = `${candidate}: ${errorMessage(err)}`;
        }
      }
      if (token !== loadToken) return;

      const prev = get().video;
      if (prev) URL.revokeObjectURL(prev.url);
      set({
        video: {
          name,
          handle: entry.handle,
          url: URL.createObjectURL(file),
          size: file.size,
          lastModified: file.lastModified,
          duration: map?.duration ?? 0,
          width: map?.width,
          height: map?.height,
        },
        videoChangedOnDisk: false,
        map,
        mapFile,
        mapError,
        detectedFps: null,
        currentTime: 0,
        playing: false,
        selection: null,
        revisions: {},
        revisionIds: [],
        openRevisionIds: [],
        activeRevisionId: null,
        diskModified: {},
        dirty: {},
        saveState: 'idle',
        highlightCommentId: null,
      });
      updateUrl(folder.name, name);
      void remember(folder.handle, name, map?.source?.path);
      await loadRevisions(token);
    },

    refreshFromDisk: async () => {
      const { folder, video } = get();
      if (!folder || !video) return;
      try {
        const listing = await listFolder(folder.handle);
        const entry = listing.videos.find((v) => v.name === video.name);
        set({
          listing,
          videoChangedOnDisk:
            !!entry && (entry.lastModified !== video.lastModified || entry.size !== video.size),
        });
      } catch {
        return;
      }
      const dir = await revisionsDir(false).catch(() => null);
      if (!dir) return;
      for (const name of await listFileNames(dir)) {
        const id = revisionIdFromFile(name);
        if (!id) continue;
        const file = await readFileIn(dir, name).catch(() => null);
        if (!file) continue;
        const s = get();
        // Unchanged, or we have edits about to be written over it.
        if (s.diskModified[id] === file.lastModified || s.dirty[id]) continue;
        try {
          const revision = normalizeRevision(JSON.parse(await file.text()), id);
          set((st) => ({
            revisions: { ...st.revisions, [id]: revision },
            diskModified: { ...st.diskModified, [id]: file.lastModified },
            revisionIds: st.revisionIds.includes(id) ? st.revisionIds : [...st.revisionIds, id].sort(byNumber),
          }));
        } catch {
          // Half-written by someone else; pick it up on the next focus.
        }
      }
    },

    setVideoMeta: ({ duration, width, height }) =>
      set((s) => (s.video ? { video: { ...s.video, duration, width, height } } : {})),
    setFpsOverride: (fps) => set({ fpsOverride: fps && fps > 0 ? fps : null }),
    setDetectedFps: (fps) => set({ detectedFps: fps }),
    setCurrentTime: (time) => set({ currentTime: time }),
    setPlaying: (playing) => set({ playing }),

    seek: (time) => {
      const duration = selectDuration(get());
      const t = Math.max(0, duration ? Math.min(time, duration - 1e-3) : time);
      if (videoEl) videoEl.currentTime = t;
      set({ currentTime: t });
    },

    togglePlay: () => {
      if (!videoEl) return;
      if (!videoEl.paused) {
        videoEl.pause();
        return;
      }
      const { loop, selection } = get();
      if (loop && selection && (videoEl.currentTime < selection.from || videoEl.currentTime >= selection.to - 0.01)) {
        get().seek(selection.from);
      }
      void videoEl.play().catch(() => undefined);
    },

    pause: () => videoEl?.pause(),

    stepFrames: (frames) => {
      const fps = selectFps(get());
      videoEl?.pause();
      const current = videoEl?.currentTime ?? get().currentTime;
      get().seek(timeOfFrame(frameAt(current, fps) + frames, fps));
    },

    jump: (direction, kind) => {
      const s = get();
      const fps = selectFps(s);
      let targets = kind === 'section' ? sectionTargets(s.map) : shotTargets(s.map);
      if (targets.length === 0) {
        // No map: walk the active revision's comments instead.
        const revision = selectActiveRevision(s);
        targets = dedupe((revision?.comments ?? []).map(commentSortKey));
      }
      const current = videoEl?.currentTime ?? s.currentTime;
      const playing = videoEl ? !videoEl.paused : false;
      const target = stepTarget(targets, current, direction, playing ? 0.4 : 1.5 / fps);
      if (target === null) {
        if (direction === -1) get().seek(0);
        return;
      }
      get().seek(timeOfCut(target, fps));
    },

    toggleLoop: () => set((s) => ({ loop: !s.loop })),

    setSelection: (range) => {
      if (!range) {
        set({ selection: null });
        return;
      }
      const duration = selectDuration(get());
      const fps = selectFps(get());
      // Ends sit on frame boundaries, so a shot's range covers exactly its frames.
      const from = Math.max(0, frameBoundary(Math.min(range.from, range.to), fps));
      const to = Math.min(duration || Infinity, frameBoundary(Math.max(range.from, range.to), fps));
      set({ selection: to - from >= 1 / fps - 1e-6 ? { from, to } : null });
    },

    setIn: () => {
      const { selection, currentTime } = get();
      const duration = selectDuration(get());
      get().setSelection({ from: currentTime, to: selection && selection.to > currentTime ? selection.to : duration });
    },

    setOut: () => {
      const { selection, currentTime } = get();
      get().setSelection({ from: selection && selection.from < currentTime ? selection.from : 0, to: currentTime });
    },

    newRevision: async () => {
      const info = videoInfo();
      if (!info) return null;
      const id = nextRevisionId(get().revisionIds);
      const revision = createRevision(id, info, get().mapFile);
      set((s) => ({
        revisions: { ...s.revisions, [id]: revision },
        revisionIds: [...s.revisionIds, id],
        openRevisionIds: [...s.openRevisionIds, id],
        activeRevisionId: id,
        dirty: { ...s.dirty, [id]: true },
      }));
      await get().saveRevision(id);
      return id;
    },

    openRevision: (id) =>
      set((s) => ({
        openRevisionIds: s.openRevisionIds.includes(id) ? s.openRevisionIds : [...s.openRevisionIds, id],
        activeRevisionId: id,
      })),

    closeRevision: async (id) => {
      if (get().dirty[id]) await get().saveRevision(id);
      set((s) => {
        const index = s.openRevisionIds.indexOf(id);
        const open = s.openRevisionIds.filter((x) => x !== id);
        const active =
          s.activeRevisionId === id ? open[Math.min(index, open.length - 1)] ?? null : s.activeRevisionId;
        return { openRevisionIds: open, activeRevisionId: active };
      });
    },

    setActiveRevision: (id) => set({ activeRevisionId: id }),

    updateRevision: (id, update) => {
      set((s) => {
        const current = s.revisions[id];
        if (!current) return {};
        const next = { ...update(current), updatedAt: new Date().toISOString() };
        return { revisions: { ...s.revisions, [id]: next }, dirty: { ...s.dirty, [id]: true } };
      });
      scheduleSave(id);
    },

    saveRevision: (id) => {
      clearTimeout(saveTimers.get(id));
      saveTimers.delete(id);
      // One write at a time per revision, in order.
      const run = async () => {
        const { folder, video } = get();
        const revision = get().revisions[id];
        if (!folder || !video || !revision) return;
        set({ saveState: 'saving' });
        try {
          const dirName = revisionsDirName(video.name);
          const dir = await getSubdir(folder.handle, dirName, true);
          if (!dir) throw new Error(`Could not create ${dirName}`);
          const lastModified = await writeFileIn(dir, `${id}.json`, `${JSON.stringify(revision, null, 2)}\n`);
          await writeFileIn(
            dir,
            `${id}.md`,
            revisionToMarkdown(revision, { revisionsDir: dirName, sourcePath: get().map?.source?.path }),
          );
          set((s) => ({
            diskModified: { ...s.diskModified, [id]: lastModified },
            dirty: s.revisions[id] === revision ? { ...s.dirty, [id]: false } : s.dirty,
            saveState: 'saved',
          }));
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
      const pending = [...saveTimers.keys()];
      await Promise.all([...pending.map((id) => get().saveRevision(id)), ...saveChains.values()]);
    },

    addComment: async (rawText) => {
      const text = rawText.trim();
      const s = get();
      if (!text || !s.video || !s.folder) return false;
      const revisionId = s.activeRevisionId ?? (await get().newRevision());
      if (!revisionId) return false;
      const revision = get().revisions[revisionId];
      if (!revision) return false;

      const fps = selectFps(get());
      const { map, selection } = get();
      const id = nextCommentId(revision.comments);
      const createdAt = new Date().toISOString();
      let comment: RevisionComment;

      if (selection) {
        const { first, last } = rangeFrames(selection, fps);
        comment = {
          kind: 'range',
          id,
          text,
          createdAt,
          status: 'open',
          from: roundMs(selection.from),
          to: roundMs(selection.to),
          fromFrame: first,
          toFrame: last,
          shots: shotsInRange(map, selection.from, selection.to, fps).map((shot) => shot.id),
        };
      } else {
        videoEl?.pause();
        const time = videoEl?.currentTime ?? get().currentTime;
        const frame = frameAt(time, fps);
        const shot = shotAt(map, time);
        let snapshot: string | undefined;
        try {
          const blob = videoEl ? await captureFrame(videoEl) : null;
          const dir = blob ? await revisionsDir(true) : null;
          const stills = dir ? await getSubdir(dir, revisionId, true) : null;
          if (blob && stills) {
            const fileName = snapshotFileName(id, shot?.id, frame);
            await writeFileIn(stills, fileName, blob);
            snapshot = `${revisionId}/${fileName}`;
          }
        } catch (err) {
          toast.error(`Comment saved without a still: ${errorMessage(err)}`, { duration: 6000 });
        }
        comment = {
          kind: 'point',
          id,
          text,
          createdAt,
          status: 'open',
          time,
          frame,
          shot: shot
            ? { id: shot.id, label: shot.label, section: shot.section, from: shot.from, to: shot.to }
            : null,
          snapshot,
        };
      }

      const info = videoInfo();
      get().updateRevision(revisionId, (r) => ({
        ...r,
        // The first comment pins the revision to the render being reviewed.
        video: r.comments.length === 0 && info ? info : r.video,
        map: r.comments.length === 0 ? get().mapFile : r.map,
        comments: [...r.comments, comment],
      }));
      set({ highlightCommentId: id });
      return true;
    },

    editComment: (commentId, patch) => {
      const id = get().activeRevisionId;
      if (!id) return;
      const updatedAt = new Date().toISOString();
      get().updateRevision(id, (r) => ({
        ...r,
        comments: r.comments.map((c) => (c.id === commentId ? ({ ...c, ...patch, updatedAt } as RevisionComment) : c)),
      }));
    },

    deleteComment: (commentId) => {
      const revisionId = get().activeRevisionId;
      const revision = revisionId ? get().revisions[revisionId] : null;
      const comment = revision?.comments.find((c) => c.id === commentId);
      if (!revisionId || !revision || !comment) return;
      const index = revision.comments.indexOf(comment);
      get().updateRevision(revisionId, (r) => ({ ...r, comments: r.comments.filter((c) => c.id !== commentId) }));

      let undone = false;
      const removeStill = async () => {
        if (undone || comment.kind !== 'point' || !comment.snapshot) return;
        const [sub, file] = comment.snapshot.split('/');
        const dir = await revisionsDir(false).catch(() => null);
        const stills = dir && sub ? await getSubdir(dir, sub, false).catch(() => null) : null;
        if (stills && file) await removeFileIn(stills, file).catch(() => undefined);
      };
      toast(`Deleted ${comment.id}`, {
        duration: 5000,
        action: {
          label: 'Undo',
          onClick: () => {
            undone = true;
            get().updateRevision(revisionId, (r) => {
              const comments = [...r.comments];
              comments.splice(Math.min(index, comments.length), 0, comment);
              return { ...r, comments };
            });
          },
        },
        onAutoClose: () => void removeStill(),
        onDismiss: () => void removeStill(),
      });
    },

    focusComment: (commentId) => {
      const revision = selectActiveRevision(get());
      const comment = revision?.comments.find((c) => c.id === commentId);
      if (!comment) return;
      const fps = selectFps(get());
      videoEl?.pause();
      if (comment.kind === 'point') {
        get().setSelection(null);
        get().seek(timeOfFrame(comment.frame, fps));
      } else {
        get().setSelection({ from: comment.from, to: comment.to });
        get().seek(comment.from);
      }
      set({ highlightCommentId: commentId });
    },

    requestComposerFocus: () => set((s) => ({ composerFocusToken: s.composerFocusToken + 1 })),
  };
});
