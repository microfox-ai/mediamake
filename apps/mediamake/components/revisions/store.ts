'use client';

import { create } from 'zustand';
import { toast } from 'sonner';
import { isAbortError, isNotFoundError } from '@/lib/local-media/file-access';
import {
  dedupe,
  parseVideoMap,
  sectionTargets,
  shotAt,
  shotsInRange,
  shotTargets,
  stepTarget,
} from '@/lib/revisions/map';
import {
  frameAt,
  frameBoundary,
  rangeFrames,
  roundMs,
  timeOfCut,
  timeOfFrame,
} from '@/lib/revisions/frames';
import {
  getFolderSupport,
  getSubdir,
  isDirectChild,
  listFileNames,
  listFolder,
  mapCandidates,
  scanSource,
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
  type SourceFolder,
} from '@/lib/revisions/fs';
import {
  addSource,
  forgetRecent,
  loadRecent,
  loadSources,
  rememberVideo,
  removeSource as removeSourceEntry,
  type RecentEntry,
  type SourceEntry,
} from '@/lib/revisions/history';
import {
  commentSortKey,
  createRevision,
  nextCommentId,
  nextRevisionId,
  normalizeRevision,
  revisionIdFromFile,
  revisionToMarkdown,
  snapshotFileName,
  zoomFileName,
} from '@/lib/revisions/revision-file';
import { grabFrame, spotCrop, toJpeg, withMarks } from '@/lib/revisions/marks';
import {
  LIVE_VIDEO,
  liveChangedOnDisk,
  loadLiveProject,
  type LiveProject,
} from '@/lib/revisions/live';
import {
  FolderSource,
  findLyricsRoot,
  pickDirectory,
} from '@/lib/remotion-editor/folder-source';
import {
  loadFolders,
  rememberFolder,
  type FolderEntry,
} from '@/lib/remotion-editor/folder-history';
import type { ProjectEntry } from '@/lib/remotion-editor/types';
import { LiveMedia, type StageMedia } from './live-media';
import type {
  Mark,
  MarkColor,
  MarkTool,
  Revision,
  RevisionComment,
  RevisionVideoInfo,
  Spot,
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

let videoEl: StageMedia | null = null;
let loadToken = 0;
const saveTimers = new Map<string, ReturnType<typeof setTimeout>>();
const saveChains = new Map<string, Promise<void>>();

export function registerVideoElement(el: StageMedia | null) {
  videoEl = el;
}

export function getVideoElement(): StageMedia | null {
  return videoEl;
}

export interface OpenVideo {
  name: string;
  /** none for a project reviewed live */
  handle?: FileSystemFileHandle;
  /** a blob: URL, or a key naming the live project */
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

/** A drawing tool, or the spot pin. */
export type MarkupTool = MarkTool | 'spot';

/** Marks waiting for the next comment, on the frame they were drawn on. */
export interface Sketch {
  frame: number;
  time: number;
  marks: Mark[];
  spot: Spot | null;
  /** The spot was set after the last mark, so undo takes it first. */
  spotLast?: boolean;
}

export const sketchIsEmpty = (sketch: Sketch | null) =>
  !sketch || (sketch.marks.length === 0 && !sketch.spot);

/** The lyrics_videos folder live projects come from (shared with /remotion-editor's list). */
export interface LiveFolder {
  /** what the user picked (the folder itself, the repo, or the folder holding lyrics_videos/) */
  handle: FileSystemDirectoryHandle;
  source: FolderSource;
  projects: ProjectEntry[];
}

export interface SourceState extends SourceEntry {
  status: 'needs-permission' | 'scanning' | 'ready' | 'missing' | 'error';
  folders: SourceFolder[];
}

interface RevisionsState {
  support: FolderSupport | null;
  recent: RecentEntry[];
  sources: SourceState[];
  /** Which source folder the open video came from, for highlighting. */
  openedFrom: { sourceId: string; path: string } | null;
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
  muted: boolean;
  rate: number;
  selection: TimeRange | null;
  shortcutsOpen: boolean;

  revisionIds: string[];
  openRevisionIds: string[];
  activeRevisionId: string | null;
  revisions: Record<string, Revision>;
  diskModified: Record<string, number>;
  dirty: Record<string, boolean>;
  saveState: SaveState;
  highlightCommentId: string | null;
  composerFocusToken: number;

  /** The drawing tool in use; null when clicks on the video play and pause it. */
  tool: MarkupTool | null;
  /** The drawing tool D and the colours bring back. */
  lastTool: MarkTool;
  markColor: MarkColor;
  sketch: Sketch | null;
  /** The magnifier that follows the pointer over the video. */
  loupe: boolean;
  /** The next comment is about the whole video: no time, listed first. */
  general: boolean;

  /** The project playing live (no render), when one is open. */
  live: LiveProject | null;
  liveFolder: LiveFolder | null;
  /** lyrics_videos folders opened before, here or in /remotion-editor */
  liveFolders: FolderEntry[];
  /** a known folder that needs a click before Chrome lets us in */
  livePending: FolderEntry | null;
  /** what opening a live project is doing ("Compiling…") */
  liveProgress: string | null;

  init: () => Promise<void>;
  openFolderPicker: () => Promise<void>;
  openVideoPicker: () => Promise<void>;
  openDropped: (handles: FileSystemHandle[]) => Promise<void>;
  grantPending: () => Promise<void>;
  openWanted: () => Promise<void>;
  openFolder: (
    handle: FileSystemDirectoryHandle,
    preferredVideo?: string,
  ) => Promise<void>;
  resumeRecent: (entry: RecentEntry) => Promise<void>;
  forgetRecent: (id: string) => Promise<void>;
  addSourcePicker: () => Promise<void>;
  connectSource: (id: string) => Promise<void>;
  rescanSource: (id: string) => Promise<void>;
  rescanSources: () => Promise<void>;
  removeSource: (id: string) => Promise<void>;
  openSourceVideo: (
    sourceId: string,
    path: string,
    video: string,
  ) => Promise<void>;
  openVideo: (name: string) => Promise<void>;
  refreshFromDisk: () => Promise<void>;

  setVideoMeta: (meta: {
    duration: number;
    width: number;
    height: number;
  }) => void;
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
  toggleMute: () => void;
  setRate: (rate: number) => void;
  setShortcutsOpen: (open: boolean) => void;

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
  editComment: (
    commentId: string,
    patch: Partial<Pick<RevisionComment, 'text' | 'status'>>,
  ) => void;
  deleteComment: (commentId: string) => void;
  focusComment: (commentId: string) => void;
  requestComposerFocus: () => void;

  setTool: (tool: MarkupTool | null) => void;
  toggleDrawing: () => void;
  setMarkColor: (color: MarkColor) => void;
  addMark: (mark: Mark) => void;
  setSpot: (spot: Spot) => void;
  undoMark: () => void;
  clearSketch: () => void;
  toggleLoupe: () => void;
  setGeneral: (general: boolean) => void;

  /** Opens the folder picker for the lyrics_videos folder (needs a click). */
  pickLiveFolder: () => Promise<void>;
  connectLiveFolder: (handle: FileSystemDirectoryHandle) => Promise<boolean>;
  openLive: (slug: string) => Promise<void>;
  /** Compiles the live project again when its code or edits changed on disk. */
  reloadLive: (force?: boolean) => Promise<void>;
}

export const selectFps = (
  s: Pick<RevisionsState, 'map' | 'fpsOverride' | 'detectedFps'>,
): number => s.map?.fps ?? s.fpsOverride ?? s.detectedFps ?? DEFAULT_FPS;

export const selectDuration = (
  s: Pick<RevisionsState, 'video' | 'map'>,
): number => s.video?.duration || s.map?.duration || 0;

export const selectActiveRevision = (s: RevisionsState): Revision | null =>
  s.activeRevisionId ? (s.revisions[s.activeRevisionId] ?? null) : null;

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

function updateUrl(
  folder: string | null,
  video: string | null,
  live: string | null = null,
) {
  const params = new URLSearchParams(window.location.search);
  if (live) params.set('live', live);
  else params.delete('live');
  if (folder) params.set('folder', folder);
  else params.delete('folder');
  if (video) params.set('video', video);
  else params.delete('video');
  const query = params.toString();
  window.history.replaceState(
    window.history.state,
    '',
    `${window.location.pathname}${query ? `?${query}` : ''}`,
  );
}

/** Resolves once a pending seek has landed, so the element shows the frame currentTime names. */
function seekSettled(el: StageMedia): Promise<void> {
  if (!el.seeking && el.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA)
    return Promise.resolve();
  return new Promise(resolve => {
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

/**
 * The frame on screen as JPEGs: the still (marks drawn in) and, with a spot, its 2× crop. A live
 * project renders `frameNumber` in the browser (a Player shows DOM, not pixels).
 */
async function captureFrame(
  el: StageMedia,
  marks: readonly Mark[] = [],
  spot: Spot | null = null,
  frameNumber?: number,
): Promise<{ still: Blob | null; zoom: Blob | null }> {
  await seekSettled(el);
  const frame =
    el instanceof LiveMedia ? await el.grab(frameNumber) : grabFrame(el);
  if (!frame) return { still: null, zoom: null };
  const [still, zoom] = await Promise.all([
    toJpeg(marks.length || spot ? withMarks(frame, marks, spot) : frame),
    spot ? toJpeg(spotCrop(frame, spot)) : Promise.resolve(null),
  ]);
  return { still, zoom };
}

const byNumber = (a: string, b: string) =>
  a.localeCompare(b, undefined, { numeric: true });

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

  /** Renders a live comment's frame and adds the still (and the spot's crop) to the comment. */
  const attachStill = async (
    el: LiveMedia,
    revisionId: string,
    commentId: string,
    shotId: string | undefined,
    frame: number,
    sketch: Sketch | null,
  ) => {
    const dir = await revisionsDir(true).catch(() => null);
    const url = get().video?.url;
    const has = () =>
      get().video?.url === url &&
      !!get().revisions[revisionId]?.comments.some(c => c.id === commentId);
    try {
      const shots = await captureFrame(el, sketch?.marks, sketch?.spot, frame);
      // the comment was deleted, or another project or video opened, meanwhile
      if (!shots.still || !dir || !has()) return;
      const stills = await getSubdir(dir, revisionId, true);
      if (!stills) return;
      const fileName = snapshotFileName(commentId, shotId, frame);
      await writeFileIn(stills, fileName, shots.still);
      if (shots.zoom)
        await writeFileIn(stills, zoomFileName(fileName), shots.zoom);
      if (!has()) return;
      get().updateRevision(revisionId, r => ({
        ...r,
        comments: r.comments.map(c =>
          c.id === commentId && c.kind === 'point'
            ? {
                ...c,
                snapshot: `${revisionId}/${fileName}`,
                ...(shots.zoom
                  ? { zoom: `${revisionId}/${zoomFileName(fileName)}` }
                  : {}),
              }
            : c,
        ),
      }));
    } catch (err) {
      toast.error(
        `The still of ${commentId} didn't render: ${errorMessage(err)}. The notes give Claude a command to render it.`,
        { duration: 6000 },
      );
    }
  };

  /**
   * The sketch on the frame on screen. Drawing on another frame starts a new
   * one: marks belong to the picture they were drawn over.
   */
  const sketchHere = (): Sketch => {
    const s = get();
    const fps = selectFps(s);
    const time = videoEl?.currentTime ?? s.currentTime;
    const frame = frameAt(time, fps);
    if (s.sketch && s.sketch.frame === frame) return s.sketch;
    const dropped = sketchIsEmpty(s.sketch) ? null : s.sketch;
    if (dropped) {
      toast(
        `Drawing on f${frame} now; the marks on f${dropped.frame} were dropped`,
        {
          duration: 5000,
          action: { label: 'Undo', onClick: () => set({ sketch: dropped }) },
        },
      );
    }
    return { frame, time, marks: [], spot: null };
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
        toast.error(`Could not read ${name}: ${errorMessage(err)}`, {
          duration: 6000,
        });
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

  /** A folder from the ready sources matching a deep link's folder (and video). */
  const findInSources = (folderName: string, videoName?: string) => {
    const matches = get()
      .sources.filter(source => source.status === 'ready')
      .flatMap(source => source.folders.map(folder => ({ source, folder })))
      .filter(({ source, folder }) =>
        folder.path
          ? folder.path === folderName ||
            folder.path.split('/').pop() === folderName
          : source.name === folderName,
      );
    return (
      matches.find(
        ({ folder }) =>
          !videoName || folder.videos.some(v => v.name === videoName),
      ) ?? (videoName ? null : (matches[0] ?? null))
    );
  };

  const openFromSources = async (folderName: string, videoName?: string) => {
    const hit = findInSources(folderName, videoName);
    if (!hit) return false;
    await get().openSourceVideo(
      hit.source.id,
      hit.folder.path,
      videoName ?? hit.folder.videos[0]?.name ?? '',
    );
    return true;
  };

  /**
   * The lyrics_videos folder from last time (here or in /remotion-editor) lists its projects when
   * Chrome kept the grant; `?live=<slug>` opens that project. True when it opened one.
   */
  const initLive = async (): Promise<boolean> => {
    const liveFolders = await loadFolders().catch(() => [] as FolderEntry[]);
    set({ liveFolders });
    const wanted = new URLSearchParams(window.location.search).get('live');
    const last = liveFolders[0];
    if (!last) return false;
    if ((await queryReadWrite(last.handle)) !== 'granted') {
      if (wanted) set({ livePending: last });
      return false;
    }
    if (!(await get().connectLiveFolder(last.handle))) return false;
    if (!wanted || !get().liveFolder?.projects.some(p => p.slug === wanted))
      return false;
    await get().openLive(wanted);
    return true;
  };

  /** History is a convenience: failures never block opening. */
  const remember = async (
    handle: FileSystemDirectoryHandle,
    video?: string,
    sourcePath?: string,
  ) => {
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
    sources: [],
    openedFrom: null,
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
    muted: false,
    rate: 1,
    selection: null,
    shortcutsOpen: false,
    revisionIds: [],
    openRevisionIds: [],
    activeRevisionId: null,
    revisions: {},
    diskModified: {},
    dirty: {},
    saveState: 'idle',
    highlightCommentId: null,
    composerFocusToken: 0,
    tool: null,
    lastTool: 'pen',
    markColor: 'red',
    sketch: null,
    loupe: false,
    general: false,
    live: null,
    liveFolder: null,
    liveFolders: [],
    livePending: null,
    liveProgress: null,

    init: async () => {
      const support = getFolderSupport();
      set({ support });
      if (!support.supported) return;
      if (await initLive()) return;
      const [recent, sources] = await Promise.all([
        loadRecent().catch(() => [] as RecentEntry[]),
        loadSources().catch(() => [] as SourceEntry[]),
      ]);
      set({
        recent,
        sources: sources.map(entry => ({
          ...entry,
          status: 'needs-permission',
          folders: [],
        })),
      });
      // Sources with a kept grant ("Allow on every visit") list their videos right away.
      await Promise.all(
        sources.map(async entry => {
          if ((await queryReadWrite(entry.handle)) === 'granted')
            await get().rescanSource(entry.id);
        }),
      );
      if (get().folder) return;

      const params = new URLSearchParams(window.location.search);
      const folderName = params.get('folder');
      const videoName = params.get('video') ?? undefined;
      if (folderName && (await openFromSources(folderName, videoName))) return;
      const candidate = folderName
        ? (recent.find(
            r =>
              r.folderName === folderName &&
              (!videoName || r.video === videoName),
          ) ?? recent.find(r => r.folderName === folderName))
        : recent[0];
      if (!candidate) {
        if (folderName)
          set({ wanted: { folder: folderName, video: videoName } });
        return;
      }
      const target = videoName ?? candidate.video;
      // "Allow on every visit" keeps the grant, so no click is needed.
      if ((await queryReadWrite(candidate.handle)) === 'granted') {
        await get().openFolder(candidate.handle, target);
      } else {
        set({
          pending: {
            kind: 'folder',
            handle: candidate.handle,
            videoName: target,
          },
        });
      }
    },

    openFolderPicker: async () => {
      try {
        const handle = await pickFolder(get().folder?.handle);
        await get().openFolder(handle);
      } catch (err) {
        if (isAbortError(err)) return;
        toast.error(`Could not open the folder: ${errorMessage(err)}`, {
          duration: 6000,
        });
      }
    },

    openVideoPicker: async () => {
      let file: FileSystemFileHandle;
      try {
        file = await pickVideoFile();
      } catch (err) {
        if (!isAbortError(err))
          toast.error(`Could not open the video: ${errorMessage(err)}`, {
            duration: 6000,
          });
        return;
      }
      // Revisions are written beside the video, which needs the folder.
      // The folder picker opens in the video's folder; the user just confirms.
      set({ pending: { kind: 'file', handle: file } });
      await get().grantPending();
    },

    openDropped: async handles => {
      const dir = handles.find(
        (h): h is FileSystemDirectoryHandle => h.kind === 'directory',
      );
      if (dir) {
        set({ pending: { kind: 'folder', handle: dir } });
        await get().grantPending();
        return;
      }
      const file = handles.find(
        (h): h is FileSystemFileHandle => h.kind === 'file',
      );
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
          toast.error(`Pick the folder that contains ${pending.handle.name}`, {
            duration: 6000,
          });
          return;
        }
        await get().openFolder(dir, pending.handle.name);
      } catch (err) {
        if (isAbortError(err)) return;
        // Without a fresh click the picker refuses; the pending card offers one.
        if (err instanceof DOMException && err.name === 'SecurityError') return;
        toast.error(`Could not open the folder: ${errorMessage(err)}`, {
          duration: 6000,
        });
      }
    },

    openWanted: async () => {
      const wanted = get().wanted;
      try {
        const handle = await pickFolder();
        if (wanted && handle.name !== wanted.folder) {
          toast.warning(
            `Opened "${handle.name}", the link asked for "${wanted.folder}"`,
            { duration: 5000 },
          );
        }
        await get().openFolder(handle, wanted?.video);
      } catch (err) {
        if (!isAbortError(err))
          toast.error(`Could not open the folder: ${errorMessage(err)}`, {
            duration: 6000,
          });
      }
    },

    openFolder: async (handle, preferredVideo) => {
      const permission = await requestReadWrite(handle);
      if (permission !== 'granted') {
        set({ pending: { kind: 'folder', handle, videoName: preferredVideo } });
        if (permission === 'denied') {
          toast.error(
            'Edit access to the folder is needed to save revisions next to the video',
            {
              duration: 6000,
            },
          );
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
      set({
        folder: { handle, name: handle.name },
        listing,
        pending: null,
        wanted: null,
        openedFrom: null,
      });
      const pick =
        listing.videos.find(v => v.name === preferredVideo) ??
        [...listing.videos].sort((a, b) => b.lastModified - a.lastModified)[0];
      if (pick) {
        await get().openVideo(pick.name);
      } else {
        const prev = get().video;
        if (prev) URL.revokeObjectURL(prev.url);
        set({
          live: null,
          video: null,
          sketch: null,
          tool: null,
          map: null,
          mapFile: null,
          revisions: {},
          revisionIds: [],
          openRevisionIds: [],
          activeRevisionId: null,
        });
        updateUrl(handle.name, null);
        void remember(handle);
        toast.info('No videos in this folder', { duration: 3000 });
      }
    },

    resumeRecent: async entry => {
      await get().openFolder(entry.handle, entry.video);
    },

    forgetRecent: async id => {
      await forgetRecent(id).catch(() => undefined);
      set({
        recent: await loadRecent().catch(() =>
          get().recent.filter(r => r.id !== id),
        ),
      });
    },

    addSourcePicker: async () => {
      let handle: FileSystemDirectoryHandle;
      try {
        handle = await pickFolder();
      } catch (err) {
        if (!isAbortError(err))
          toast.error(`Could not add the folder: ${errorMessage(err)}`, {
            duration: 6000,
          });
        return;
      }
      const entry = await addSource(handle);
      set(s => ({
        sources: s.sources.some(x => x.id === entry.id)
          ? s.sources
          : [
              ...s.sources,
              { ...entry, status: 'needs-permission', folders: [] },
            ],
      }));
      await get().rescanSource(entry.id);
      const source = get().sources.find(x => x.id === entry.id);
      if (source?.status === 'ready') {
        const count = source.folders.reduce((n, f) => n + f.videos.length, 0);
        toast.success(
          `${source.name}: ${count} video${count === 1 ? '' : 's'} in ${source.folders.length} folder${source.folders.length === 1 ? '' : 's'}`,
          { duration: 3000 },
        );
      }
    },

    connectSource: async id => {
      const source = get().sources.find(x => x.id === id);
      if (!source) return;
      if ((await requestReadWrite(source.handle)) !== 'granted') {
        toast.error(`Access to "${source.name}" was not allowed`, {
          duration: 4000,
        });
        return;
      }
      await get().rescanSource(id);
      // A deep link that was waiting on this source can open now.
      const wanted = get().wanted;
      if (wanted && !get().folder)
        await openFromSources(wanted.folder, wanted.video);
    },

    rescanSource: async id => {
      const patch = (update: Partial<SourceState>) =>
        set(s => ({
          sources: s.sources.map(x => (x.id === id ? { ...x, ...update } : x)),
        }));
      const source = get().sources.find(x => x.id === id);
      if (!source) return;
      if ((await queryReadWrite(source.handle)) !== 'granted') {
        patch({ status: 'needs-permission' });
        return;
      }
      if (source.status !== 'ready') patch({ status: 'scanning' });
      try {
        patch({ status: 'ready', folders: await scanSource(source.handle) });
      } catch (err) {
        patch({ status: isNotFoundError(err) ? 'missing' : 'error' });
      }
    },

    rescanSources: async () => {
      await Promise.all(
        get()
          .sources.filter(x => x.status === 'ready')
          .map(x => get().rescanSource(x.id)),
      );
    },

    removeSource: async id => {
      await removeSourceEntry(id).catch(() => undefined);
      set(s => ({ sources: s.sources.filter(x => x.id !== id) }));
    },

    openSourceVideo: async (sourceId, path, video) => {
      const folder = get()
        .sources.find(x => x.id === sourceId)
        ?.folders.find(f => f.path === path);
      if (!folder) return;
      await get().openFolder(folder.handle, video);
      if (get().folder?.handle === folder.handle)
        set({ openedFrom: { sourceId, path } });
    },

    openVideo: async name => {
      const { folder, listing } = get();
      const entry = listing?.videos.find(v => v.name === name);
      if (!folder || !listing || !entry) return;
      await get().flushSaves();
      const token = ++loadToken;
      let file: File;
      try {
        file = await entry.handle.getFile();
      } catch (err) {
        toast.error(`Could not read ${name}: ${errorMessage(err)}`, {
          duration: 6000,
        });
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
          if (candidate === 'map.json' && parsed.video && parsed.video !== name)
            continue;
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
        live: null,
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
        sketch: null,
      });
      updateUrl(folder.name, name);
      void remember(folder.handle, name, map?.source?.path);
      await loadRevisions(token);
    },

    refreshFromDisk: async () => {
      const { folder, video } = get();
      if (!folder || !video) return;
      // Claude fixed notes in the code: play the new version
      if (get().live) void get().reloadLive();
      try {
        const listing = await listFolder(folder.handle);
        const entry = listing.videos.find(v => v.name === video.name);
        set({
          listing,
          videoChangedOnDisk:
            !!entry &&
            (entry.lastModified !== video.lastModified ||
              entry.size !== video.size),
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
          set(st => ({
            revisions: { ...st.revisions, [id]: revision },
            diskModified: { ...st.diskModified, [id]: file.lastModified },
            revisionIds: st.revisionIds.includes(id)
              ? st.revisionIds
              : [...st.revisionIds, id].sort(byNumber),
          }));
        } catch {
          // Half-written by someone else; pick it up on the next focus.
        }
      }
    },

    setVideoMeta: ({ duration, width, height }) =>
      set(s =>
        s.video ? { video: { ...s.video, duration, width, height } } : {},
      ),
    setFpsOverride: fps => set({ fpsOverride: fps && fps > 0 ? fps : null }),
    setDetectedFps: fps => set({ detectedFps: fps }),
    setCurrentTime: time => set({ currentTime: time }),
    setPlaying: playing => set({ playing }),

    seek: time => {
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
      if (
        loop &&
        selection &&
        (videoEl.currentTime < selection.from ||
          videoEl.currentTime >= selection.to - 0.01)
      ) {
        get().seek(selection.from);
      }
      void videoEl.play().catch(() => undefined);
    },

    pause: () => videoEl?.pause(),

    stepFrames: frames => {
      const fps = selectFps(get());
      videoEl?.pause();
      const current = videoEl?.currentTime ?? get().currentTime;
      get().seek(timeOfFrame(frameAt(current, fps) + frames, fps));
    },

    jump: (direction, kind) => {
      const s = get();
      const fps = selectFps(s);
      let targets =
        kind === 'section' ? sectionTargets(s.map) : shotTargets(s.map);
      if (targets.length === 0) {
        // No map: walk the active revision's comments instead.
        const revision = selectActiveRevision(s);
        targets = dedupe(
          (revision?.comments ?? [])
            .filter(c => c.kind !== 'general')
            .map(commentSortKey),
        );
      }
      const current = videoEl?.currentTime ?? s.currentTime;
      const playing = videoEl ? !videoEl.paused : false;
      const target = stepTarget(
        targets,
        current,
        direction,
        playing ? 0.4 : 1.5 / fps,
      );
      if (target === null) {
        if (direction === -1) get().seek(0);
        return;
      }
      get().seek(timeOfCut(target, fps));
    },

    toggleLoop: () => set(s => ({ loop: !s.loop })),
    toggleMute: () => set(s => ({ muted: !s.muted })),
    setRate: rate => set({ rate }),
    setShortcutsOpen: open => set({ shortcutsOpen: open }),

    setSelection: range => {
      if (!range) {
        set({ selection: null });
        return;
      }
      const duration = selectDuration(get());
      const fps = selectFps(get());
      // Ends sit on frame boundaries, so a shot's range covers exactly its frames.
      const from = Math.max(
        0,
        frameBoundary(Math.min(range.from, range.to), fps),
      );
      const to = Math.min(
        duration || Infinity,
        frameBoundary(Math.max(range.from, range.to), fps),
      );
      const selection = to - from >= 1 / fps - 1e-6 ? { from, to } : null;
      // a range is a comment on that stretch, not on the whole video
      set({ selection, ...(selection ? { general: false } : {}) });
    },

    setIn: () => {
      const { selection, currentTime } = get();
      const duration = selectDuration(get());
      get().setSelection({
        from: currentTime,
        to: selection && selection.to > currentTime ? selection.to : duration,
      });
    },

    setOut: () => {
      const { selection, currentTime } = get();
      get().setSelection({
        from: selection && selection.from < currentTime ? selection.from : 0,
        to: currentTime,
      });
    },

    newRevision: async () => {
      const info = videoInfo();
      if (!info) return null;
      const id = nextRevisionId(get().revisionIds);
      const live = get().live;
      const revision = createRevision(
        id,
        info,
        get().mapFile,
        live ? { project: live.slug } : undefined,
      );
      set(s => ({
        revisions: { ...s.revisions, [id]: revision },
        revisionIds: [...s.revisionIds, id],
        openRevisionIds: [...s.openRevisionIds, id],
        activeRevisionId: id,
        dirty: { ...s.dirty, [id]: true },
      }));
      await get().saveRevision(id);
      return id;
    },

    openRevision: id =>
      set(s => ({
        openRevisionIds: s.openRevisionIds.includes(id)
          ? s.openRevisionIds
          : [...s.openRevisionIds, id],
        activeRevisionId: id,
      })),

    closeRevision: async id => {
      if (get().dirty[id]) await get().saveRevision(id);
      set(s => {
        const index = s.openRevisionIds.indexOf(id);
        const open = s.openRevisionIds.filter(x => x !== id);
        const active =
          s.activeRevisionId === id
            ? (open[Math.min(index, open.length - 1)] ?? null)
            : s.activeRevisionId;
        return { openRevisionIds: open, activeRevisionId: active };
      });
    },

    setActiveRevision: id => set({ activeRevisionId: id }),

    updateRevision: (id, update) => {
      set(s => {
        const current = s.revisions[id];
        if (!current) return {};
        const next = {
          ...update(current),
          updatedAt: new Date().toISOString(),
        };
        return {
          revisions: { ...s.revisions, [id]: next },
          dirty: { ...s.dirty, [id]: true },
        };
      });
      scheduleSave(id);
    },

    saveRevision: id => {
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
          const lastModified = await writeFileIn(
            dir,
            `${id}.json`,
            `${JSON.stringify(revision, null, 2)}\n`,
          );
          await writeFileIn(
            dir,
            `${id}.md`,
            revisionToMarkdown(revision, {
              revisionsDir: dirName,
              sourcePath: get().map?.source?.path,
            }),
          );
          set(s => ({
            diskModified: { ...s.diskModified, [id]: lastModified },
            dirty:
              s.revisions[id] === revision
                ? { ...s.dirty, [id]: false }
                : s.dirty,
            saveState: 'saved',
          }));
        } catch (err) {
          set({ saveState: 'error' });
          toast.error(`Could not save ${id}: ${errorMessage(err)}`, {
            duration: 6000,
          });
        }
      };
      const chained = (saveChains.get(id) ?? Promise.resolve()).then(run);
      saveChains.set(id, chained);
      return chained;
    },

    flushSaves: async () => {
      const pending = [...saveTimers.keys()];
      await Promise.all([
        ...pending.map(id => get().saveRevision(id)),
        ...saveChains.values(),
      ]);
    },

    addComment: async rawText => {
      const text = rawText.trim();
      const s = get();
      if (!text || !s.video || !s.folder) return false;
      const revisionId = s.activeRevisionId ?? (await get().newRevision());
      if (!revisionId) return false;
      const revision = get().revisions[revisionId];
      if (!revision) return false;

      const fps = selectFps(get());
      const { map, selection } = get();
      // marks make it a comment on the frame they were drawn on
      const sketch = sketchIsEmpty(get().sketch) ? null : get().sketch;
      const id = nextCommentId(revision.comments);
      const createdAt = new Date().toISOString();
      let comment: RevisionComment;

      if (get().general) {
        // marks and a selected range stay for the next comment
        comment = { kind: 'general', id, text, createdAt, status: 'open' };
      } else if (selection && !sketch) {
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
          shots: shotsInRange(map, selection.from, selection.to, fps).map(
            shot => shot.id,
          ),
        };
      } else {
        videoEl?.pause();
        if (
          sketch &&
          videoEl &&
          frameAt(videoEl.currentTime, fps) !== sketch.frame
        )
          get().seek(sketch.time);
        const time = sketch?.time ?? videoEl?.currentTime ?? get().currentTime;
        const frame = sketch?.frame ?? frameAt(time, fps);
        const shot = shotAt(map, time);
        let snapshot: string | undefined;
        let zoom: string | undefined;
        // a live frame renders by its number, which takes a few seconds: the comment goes in now
        // and its still follows, so the next comment can be typed meanwhile
        const later = videoEl instanceof LiveMedia ? videoEl : null;
        try {
          const shots =
            videoEl && !later
              ? await captureFrame(videoEl, sketch?.marks, sketch?.spot, frame)
              : null;
          const dir = shots?.still ? await revisionsDir(true) : null;
          const stills = dir ? await getSubdir(dir, revisionId, true) : null;
          if (shots?.still && stills) {
            const fileName = snapshotFileName(id, shot?.id, frame);
            await writeFileIn(stills, fileName, shots.still);
            snapshot = `${revisionId}/${fileName}`;
            if (shots.zoom) {
              await writeFileIn(stills, zoomFileName(fileName), shots.zoom);
              zoom = `${revisionId}/${zoomFileName(fileName)}`;
            }
          }
        } catch (err) {
          toast.error(`Comment saved without a still: ${errorMessage(err)}`, {
            duration: 6000,
          });
        }
        if (later)
          void attachStill(later, revisionId, id, shot?.id, frame, sketch);
        comment = {
          kind: 'point',
          id,
          text,
          createdAt,
          status: 'open',
          time,
          frame,
          shot: shot
            ? {
                id: shot.id,
                label: shot.label,
                section: shot.section,
                from: shot.from,
                to: shot.to,
              }
            : null,
          snapshot,
          ...(sketch?.marks.length ? { drawing: sketch.marks } : {}),
          ...(sketch?.spot ? { spot: sketch.spot } : {}),
          ...(zoom ? { zoom } : {}),
        };
      }

      const info = videoInfo();
      get().updateRevision(revisionId, r => ({
        ...r,
        // The first comment pins the revision to the render being reviewed.
        video: r.comments.length === 0 && info ? info : r.video,
        map: r.comments.length === 0 ? get().mapFile : r.map,
        comments: [...r.comments, comment],
      }));
      set({
        highlightCommentId: id,
        ...(sketch && comment.kind === 'point'
          ? { sketch: null, tool: null }
          : {}),
      });
      return true;
    },

    editComment: (commentId, patch) => {
      const id = get().activeRevisionId;
      if (!id) return;
      const updatedAt = new Date().toISOString();
      get().updateRevision(id, r => ({
        ...r,
        comments: r.comments.map(c =>
          c.id === commentId
            ? ({ ...c, ...patch, updatedAt } as RevisionComment)
            : c,
        ),
      }));
    },

    deleteComment: commentId => {
      const revisionId = get().activeRevisionId;
      const revision = revisionId ? get().revisions[revisionId] : null;
      const comment = revision?.comments.find(c => c.id === commentId);
      if (!revisionId || !revision || !comment) return;
      const index = revision.comments.indexOf(comment);
      get().updateRevision(revisionId, r => ({
        ...r,
        comments: r.comments.filter(c => c.id !== commentId),
      }));

      let undone = false;
      const removeStill = async () => {
        if (undone || comment.kind !== 'point') return;
        for (const path of [comment.snapshot, comment.zoom]) {
          if (!path) continue;
          const [sub, file] = path.split('/');
          const dir = await revisionsDir(false).catch(() => null);
          const stills =
            dir && sub
              ? await getSubdir(dir, sub, false).catch(() => null)
              : null;
          if (stills && file)
            await removeFileIn(stills, file).catch(() => undefined);
        }
      };
      toast(`Deleted ${comment.id}`, {
        duration: 5000,
        action: {
          label: 'Undo',
          onClick: () => {
            undone = true;
            get().updateRevision(revisionId, r => {
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

    focusComment: commentId => {
      const revision = selectActiveRevision(get());
      const comment = revision?.comments.find(c => c.id === commentId);
      if (!comment) return;
      const fps = selectFps(get());
      videoEl?.pause();
      if (comment.kind === 'general') {
        // nowhere to go: it is about the whole video
      } else if (comment.kind === 'point') {
        get().setSelection(null);
        get().seek(timeOfFrame(comment.frame, fps));
      } else {
        get().setSelection({ from: comment.from, to: comment.to });
        get().seek(comment.from);
      }
      // reviewing a comment, not drawing: its own marks show on its frame
      set({
        highlightCommentId: commentId,
        tool: null,
        ...(comment.kind !== 'general' ? { general: false } : {}),
      });
    },

    requestComposerFocus: () =>
      set(s => ({ composerFocusToken: s.composerFocusToken + 1 })),

    setTool: tool => {
      if (tool) {
        // marks go on a still frame, and make the next comment a frame comment
        videoEl?.pause();
        if (get().selection) get().setSelection(null);
      }
      set({
        tool,
        ...(tool && tool !== 'spot' ? { lastTool: tool } : {}),
        // marks belong to a frame
        ...(tool ? { general: false } : {}),
      });
    },

    toggleDrawing: () => {
      const { tool, lastTool } = get();
      get().setTool(tool && tool !== 'spot' ? null : lastTool);
    },

    setMarkColor: markColor => {
      set({ markColor });
      // picking a colour means drawing: bring the last drawing tool back
      const { tool, lastTool } = get();
      if (!tool || tool === 'spot') get().setTool(lastTool);
    },

    addMark: mark => {
      const sketch = sketchHere();
      set({
        sketch: { ...sketch, marks: [...sketch.marks, mark], spotLast: false },
      });
    },

    setSpot: spot => {
      const sketch = sketchHere();
      set({ sketch: { ...sketch, spot, spotLast: true } });
    },

    undoMark: () => {
      const { sketch } = get();
      if (!sketch) return;
      const next =
        sketch.spot && (sketch.spotLast || !sketch.marks.length)
          ? { ...sketch, spot: null, spotLast: false }
          : { ...sketch, marks: sketch.marks.slice(0, -1) };
      set({ sketch: sketchIsEmpty(next) ? null : next });
    },

    clearSketch: () => set({ sketch: null }),

    toggleLoupe: () => set(s => ({ loupe: !s.loupe })),

    setGeneral: general => set({ general }),

    pickLiveFolder: async () => {
      try {
        await get().connectLiveFolder(await pickDirectory());
      } catch (err) {
        if (!isAbortError(err))
          toast.error(`Could not open the folder: ${errorMessage(err)}`, {
            duration: 6000,
          });
      }
    },

    connectLiveFolder: async handle => {
      const permission = await requestReadWrite(handle);
      if (permission !== 'granted') {
        const known = get().liveFolders.find(f => f.handle === handle);
        set({
          livePending: known ?? {
            id: '',
            name: handle.name,
            handle,
            openedAt: Date.now(),
          },
        });
        if (permission === 'denied')
          toast.error(
            'Edit access is needed: revisions are saved in out/<project>/live.revisions/',
            { duration: 6000 },
          );
        return false;
      }
      const root = await findLyricsRoot(handle).catch(() => null);
      if (!root) {
        toast.error(
          `"${handle.name}" has no projects/ and src/kit/. Pick apps/lyrics_videos (or the repo).`,
          { duration: 8000 },
        );
        return false;
      }
      const prev = get().liveFolder;
      if (prev && prev.handle !== handle && get().live?.source !== prev.source)
        prev.source.dispose();
      const source = new FolderSource(root, handle);
      set({ livePending: null, liveProgress: 'Listing projects…' });
      try {
        const projects = await source.listProjects();
        set({ liveFolder: { handle, source, projects }, liveProgress: null });
      } catch (err) {
        set({ liveProgress: null });
        toast.error(`Could not list the projects: ${errorMessage(err)}`, {
          duration: 6000,
        });
        return false;
      }
      await rememberFolder(handle).catch(() => null);
      set({ liveFolders: await loadFolders().catch(() => get().liveFolders) });
      return true;
    },

    openLive: async slug => {
      const liveFolder = get().liveFolder;
      if (!liveFolder) return;
      await get().flushSaves();
      const token = ++loadToken;
      videoEl?.pause();
      set({ liveProgress: `Opening ${slug}…` });
      let live: LiveProject;
      try {
        live = await loadLiveProject(liveFolder.source, slug, progress => {
          if (token === loadToken) set({ liveProgress: progress });
        });
      } catch (err) {
        if (token === loadToken) set({ liveProgress: null });
        toast.error(`Could not open ${slug} live: ${errorMessage(err)}`, {
          duration: 8000,
        });
        return;
      }
      if (token !== loadToken) return;
      const listing = await listFolder(live.outDir).catch(() => null);
      const prev = get().video;
      if (prev?.url.startsWith('blob:')) URL.revokeObjectURL(prev.url);
      set({
        live,
        liveProgress: null,
        folder: { handle: live.outDir, name: slug },
        listing,
        openedFrom: null,
        pending: null,
        wanted: null,
        video: {
          name: LIVE_VIDEO,
          url: `live:${slug}:${token}`,
          size: 0,
          lastModified: live.codeTime,
          duration: live.durationInFrames / live.fps,
          width: live.width,
          height: live.height,
        },
        videoChangedOnDisk: false,
        map: live.map,
        mapFile: live.mapSource,
        mapError: null,
        fpsOverride: null,
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
        sketch: null,
      });
      updateUrl(null, null, slug);
      await loadRevisions(token);
    },

    reloadLive: async (force = false) => {
      const { live, liveFolder } = get();
      if (!live || !liveFolder) return;
      if (!force && !(await liveChangedOnDisk(live))) return;
      const token = loadToken;
      let next: LiveProject;
      try {
        next = await loadLiveProject(liveFolder.source, live.slug);
      } catch (err) {
        // the version that compiled keeps playing
        toast.error(`${live.slug} didn't compile: ${errorMessage(err)}`, {
          duration: 8000,
        });
        return;
      }
      if (token !== loadToken || get().live?.slug !== live.slug) return;
      const time = get().currentTime;
      set(s => ({
        live: next,
        map: next.map,
        mapFile: next.mapSource,
        video: s.video
          ? {
              ...s.video,
              lastModified: next.codeTime,
              duration: next.durationInFrames / next.fps,
            }
          : s.video,
      }));
      // the Player remounts with the new code: put the playhead back
      requestAnimationFrame(() => get().seek(time));
      toast(`Reloaded ${live.slug}: the code changed`, { duration: 3000 });
    },
  };
});
