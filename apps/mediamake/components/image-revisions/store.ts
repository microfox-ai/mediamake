'use client';

import { create } from 'zustand';
import { toast } from 'sonner';
import { isAbortError } from '@/lib/local-media/file-access';
import {
  getFolderSupport,
  getSubdir,
  listFileNames,
  pickFolder,
  queryReadWrite,
  readFileIn,
  readJsonIn,
  removeFileIn,
  requestReadWrite,
  writeFileIn,
} from '@/lib/revisions/fs';
import type { RevisionStatus } from '@/lib/revisions/types';
import {
  addSource,
  forgetRecent,
  loadRecent,
  loadSources,
  rememberJob,
  removeSource,
  type RecentJob,
} from '@/lib/image-revisions/history';
import { readIndex, scanSets, type SourceSet } from '@/lib/image-revisions/sets';
import {
  createRevision,
  nextCommentId,
  nextRevisionId,
  normalizeRevision,
  pinSnapshot,
  revisionIdFromFile,
  revisionsDirName,
  revisionToMarkdown,
  snapshotFileName,
} from '@/lib/image-revisions/revision-file';
import {
  formatOf,
  type ImageAction,
  type ImageComment,
  type ImageSetIndex,
  type ImagePin,
  type ImageRevision,
} from '@/lib/image-revisions/types';

/*
 * State for the image revisions screen: the open image set (a folder such as
 * out/thumbnails/<job>/, out/posters/<job>/ or any folder of images), its images as object URLs, the selection, the
 * zoom view and the revisions saved beside the renders.
 */

export type Support = 'checking' | 'ok' | 'insecure' | 'browser';
export type SaveState = 'idle' | 'saving' | 'saved' | 'error';

export interface SourceState {
  id: string;
  name: string;
  handle: FileSystemDirectoryHandle;
  status: 'ready' | 'needs-permission' | 'scanning' | 'error';
  jobs: SourceSet[];
}

export interface OpenJob {
  name: string;
  handle: FileSystemDirectoryHandle;
  index: ImageSetIndex;
}

export interface Render {
  url: string;
  lastModified: number;
  /** pixel size, read when the set doesn't give one (mixed shapes) */
  size?: [number, number];
}

/** A file inside the set's folder, by its relative path (sub/folder/file.png works too). */
async function fileAt(dir: FileSystemDirectoryHandle, path: string): Promise<File | null> {
  const parts = path.split('/').filter(Boolean);
  let here: FileSystemDirectoryHandle | null = dir;
  for (const part of parts.slice(0, -1)) here = here && (await getSubdir(here, part, false).catch(() => null));
  return here ? readFileIn(here, parts[parts.length - 1]).catch(() => null) : null;
}

interface ImageRevisionsState {
  support: Support;
  sources: SourceState[];
  recent: RecentJob[];
  /** A ?job= deep link waiting for one click to grant access. */
  pendingJob: string | null;
  job: OpenJob | null;
  renders: Record<string, Render>;
  revisions: Record<string, ImageRevision>;
  revisionIds: string[];
  activeRevisionId: string | null;
  dirty: Record<string, boolean>;
  saveState: SaveState;
  selection: string[];
  anchor: string | null;
  zoom: { ids: string[]; index: number } | null;
  /** Tile width in px. */
  tile: number;
  composerFocus: number;
  shortcutsOpen: boolean;

  init: () => Promise<void>;
  pickJob: () => Promise<void>;
  openJob: (handle: FileSystemDirectoryHandle) => Promise<void>;
  openRecent: (entry: RecentJob) => Promise<void>;
  forgetRecent: (id: string) => Promise<void>;
  addSource: () => Promise<void>;
  reconnectSource: (id: string) => Promise<void>;
  removeSource: (id: string) => Promise<void>;
  rescanSources: () => Promise<void>;
  refresh: () => Promise<void>;

  click: (id: string, mods: { shift?: boolean; only?: boolean }) => void;
  selectAll: () => void;
  clearSelection: () => void;
  openZoom: (at?: string) => void;
  closeZoom: () => void;
  zoomStep: (delta: number) => void;
  setTile: (px: number) => void;
  requestComposerFocus: () => void;
  setShortcutsOpen: (open: boolean) => void;

  newRevision: () => Promise<string | null>;
  openRevision: (id: string) => void;
  setStatus: (status: RevisionStatus) => void;
  renameRevision: (title: string) => void;
  toggleAction: (action: ImageAction, ids?: string[]) => Promise<void>;
  addComment: (text: string, opts?: { ids?: string[]; pin?: ImagePin; image?: HTMLImageElement }) => Promise<boolean>;
  updateComment: (id: string, patch: Partial<Pick<ImageComment, 'text' | 'status'>>) => void;
  deleteComment: (id: string) => Promise<void>;
  saveRevision: (id: string) => Promise<void>;
  flushSaves: () => Promise<void>;
}

const AUTOSAVE_MS = 600;
const byNumber = (a: string, b: string) => a.localeCompare(b, undefined, { numeric: true });

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

/** Every variant ID in the order of the sheet (styles, then variants). */
export const allIds = (index: ImageSetIndex | null | undefined): string[] =>
  (index?.styles ?? []).flatMap(s => s.variants.map(v => v.id));

export const selectActiveRevision = (s: ImageRevisionsState) =>
  s.activeRevisionId ? (s.revisions[s.activeRevisionId] ?? null) : null;

function updateUrl(job: string | null) {
  const params = new URLSearchParams(window.location.search);
  if (job) params.set('job', job);
  else params.delete('job');
  const query = params.toString();
  window.history.replaceState(window.history.state, '', `${window.location.pathname}${query ? `?${query}` : ''}`);
}

export const useImageRevisionsStore = create<ImageRevisionsState>((set, get) => {
  const saveTimers = new Map<string, ReturnType<typeof setTimeout>>();
  const saveChains = new Map<string, Promise<void>>();
  const diskModified: Record<string, number> = {};
  let loadToken = 0;

  const revisionsDir = async (create: boolean) => {
    const { job } = get();
    if (!job) return null;
    return getSubdir(job.handle, revisionsDirName(job.name), create);
  };

  const renderTimes = () => Object.fromEntries(Object.entries(get().renders).map(([id, r]) => [id, r.lastModified]));

  /** Object URLs for every render, re-read only when the file changed. */
  const loadRenders = async (job: OpenJob) => {
    const old = get().renders;
    const next: Record<string, Render> = {};
    for (const style of job.index.styles) {
      for (const v of style.variants) {
        const file = await fileAt(job.handle, v.file);
        if (!file) continue;
        const prev = old[v.id];
        if (prev && prev.lastModified === file.lastModified) {
          next[v.id] = prev;
          continue;
        }
        let size: [number, number] | undefined;
        if (!job.index.size) {
          const bitmap = await createImageBitmap(file).catch(() => null);
          if (bitmap) size = [bitmap.width, bitmap.height];
          bitmap?.close();
        }
        next[v.id] = { url: URL.createObjectURL(file), lastModified: file.lastModified, size };
      }
    }
    for (const [id, r] of Object.entries(old)) if (next[id] !== r) URL.revokeObjectURL(r.url);
    return next;
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
        // a revision with unsaved edits keeps the page's version
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
      const next = { ...fn(current), updatedAt: new Date().toISOString(), renders: renderTimes() };
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
      return { ...source, status: 'ready', jobs: await scanSets(source.handle) };
    } catch (err) {
      console.error(err);
      return { ...source, status: 'error', jobs: [] };
    }
  };

  const setSource = (next: SourceState) => set(s => ({ sources: s.sources.map(x => (x.id === next.id ? next : x)) }));

  return {
    support: 'checking',
    sources: [],
    recent: [],
    pendingJob: null,
    job: null,
    renders: {},
    revisions: {},
    revisionIds: [],
    activeRevisionId: null,
    dirty: {},
    saveState: 'idle',
    selection: [],
    anchor: null,
    zoom: null,
    tile: 300,
    composerFocus: 0,
    shortcutsOpen: false,

    init: async () => {
      const support = getFolderSupport();
      if (!support.supported) {
        set({ support: support.reason });
        return;
      }
      const tile = Number(localStorage.getItem('image-revision-tile'));
      set({ support: 'ok', ...(tile ? { tile } : {}) });
      const [recent, stored] = await Promise.all([loadRecent().catch(() => []), loadSources().catch(() => [])]);
      const sources: SourceState[] = [];
      for (const e of stored) {
        const granted = (await queryReadWrite(e.handle)) === 'granted';
        sources.push({ ...e, status: granted ? 'scanning' : 'needs-permission', jobs: [] });
      }
      set({ recent, sources });
      for (const source of sources.filter(x => x.status === 'scanning')) setSource(await scanSource(source));

      const wanted = new URLSearchParams(window.location.search).get('job');
      if (!wanted) return;
      const inSource = get().sources.flatMap(x => x.jobs).find(j => j.name === wanted);
      if (inSource) return get().openJob(inSource.handle);
      const inRecent = recent.find(r => r.name === wanted);
      if (inRecent && (await queryReadWrite(inRecent.handle)) === 'granted') return get().openJob(inRecent.handle);
      set({ pendingJob: wanted });
    },

    pickJob: async () => {
      try {
        const handle = await pickFolder(get().job?.handle);
        if (await readIndex(handle)) return get().openJob(handle);
        // a folder of sets (out/thumbnails, out): keep it as a source
        const jobs = await scanSets(handle);
        if (!jobs.length) {
          // any other folder of images opens as it is
          if (await readIndex(handle, { fromFiles: true })) return get().openJob(handle);
          toast.error(`No images in ${handle.name}: pick a folder of images, or apps/lyrics_videos/out`, { duration: 6000 });
          return;
        }
        const entry = await addSource(handle);
        set(s => ({
          sources: [...s.sources.filter(x => x.id !== entry.id), { ...entry, status: 'ready', jobs }],
        }));
        toast.success(`${handle.name} holds ${jobs.length} image set${jobs.length === 1 ? '' : 's'}: added as a source`);
        if (jobs.length === 1) await get().openJob(jobs[0].handle);
      } catch (err) {
        if (!isAbortError(err)) toast.error(errorMessage(err));
      }
    },

    openJob: async handle => {
      if ((await requestReadWrite(handle)) !== 'granted') {
        toast.error('Access to the folder was not granted');
        return;
      }
      await get().flushSaves();
      const index = await readIndex(handle, { fromFiles: true });
      if (!index) {
        toast.error(`${handle.name} has no images (and no index.json)`);
        return;
      }
      const token = ++loadToken;
      const job: OpenJob = { name: handle.name, handle, index };
      for (const r of Object.values(get().renders)) URL.revokeObjectURL(r.url);
      for (const k of Object.keys(diskModified)) delete diskModified[k];
      set({ job, renders: {}, revisions: {}, revisionIds: [], activeRevisionId: null, dirty: {}, selection: [], anchor: null, zoom: null, pendingJob: null, saveState: 'idle' });
      updateUrl(job.name);
      const renders = await loadRenders(job);
      if (token !== loadToken) return;
      set({ renders });
      await loadRevisions(token, false);
      void rememberJob(handle).then(async () => set({ recent: await loadRecent() }));
    },

    openRecent: async entry => get().openJob(entry.handle),

    forgetRecent: async id => {
      await forgetRecent(id);
      set({ recent: await loadRecent() });
    },

    addSource: async () => {
      try {
        const handle = await pickFolder();
        const entry = await addSource(handle);
        const source = await scanSource({ ...entry, status: 'scanning', jobs: [] });
        set(s => ({ sources: [...s.sources.filter(x => x.id !== entry.id), source] }));
        if (!source.jobs.length) toast.message(`No image sets (folders with an index.json) in ${handle.name} yet`);
      } catch (err) {
        if (!isAbortError(err)) toast.error(errorMessage(err));
      }
    },

    reconnectSource: async id => {
      const source = get().sources.find(x => x.id === id);
      if (!source) return;
      if ((await requestReadWrite(source.handle)) !== 'granted') return;
      setSource({ ...source, status: 'scanning' });
      setSource(await scanSource(source));
      const pending = get().pendingJob;
      const match = pending && get().sources.flatMap(x => x.jobs).find(j => j.name === pending);
      if (match) await get().openJob(match.handle);
    },

    removeSource: async id => {
      await removeSource(id);
      set(s => ({ sources: s.sources.filter(x => x.id !== id) }));
    },

    rescanSources: async () => {
      for (const source of get().sources.filter(x => x.status === 'ready')) setSource(await scanSource(source));
    },

    refresh: async () => {
      const { job } = get();
      if (!job) return;
      const token = loadToken;
      const index = await readIndex(job.handle, { fromFiles: true });
      if (!index || token !== loadToken) return;
      const next = { ...job, index };
      const renders = await loadRenders(next);
      if (token !== loadToken) return;
      set({ job: next, renders });
      await loadRevisions(token, true);
    },

    click: (id, { shift, only }) => {
      const { selection, anchor, job } = get();
      if (only) {
        set({ selection: [id], anchor: id });
        return;
      }
      if (shift && anchor) {
        const ids = allIds(job?.index);
        const [a, b] = [ids.indexOf(anchor), ids.indexOf(id)].sort((x, y) => x - y);
        const range = ids.slice(a, b + 1);
        set({ selection: [...new Set([...selection, ...range])] });
        return;
      }
      set({ selection: selection.includes(id) ? selection.filter(x => x !== id) : [...selection, id], anchor: id });
    },
    selectAll: () => set(s => ({ selection: allIds(s.job?.index) })),
    clearSelection: () => set({ selection: [], anchor: null }),

    openZoom: at => {
      const { selection, job } = get();
      const ids = selection.length > 1 ? allIds(job?.index).filter(id => selection.includes(id)) : allIds(job?.index);
      const start = at ?? selection[selection.length - 1] ?? ids[0];
      if (!start || !ids.length) return;
      set({ zoom: { ids, index: Math.max(0, ids.indexOf(start)) } });
    },
    closeZoom: () => set({ zoom: null }),
    zoomStep: delta =>
      set(s => (s.zoom ? { zoom: { ...s.zoom, index: (s.zoom.index + delta + s.zoom.ids.length) % s.zoom.ids.length } } : {})),
    setTile: px => {
      localStorage.setItem('image-revision-tile', String(px));
      set({ tile: px });
    },
    requestComposerFocus: () => set(s => ({ composerFocus: s.composerFocus + 1 })),
    setShortcutsOpen: open => set({ shortcutsOpen: open }),

    newRevision: async () => {
      const { job, revisionIds } = get();
      if (!job) return null;
      await get().flushSaves();
      const id = nextRevisionId(revisionIds);
      const revision = { ...createRevision(id, job.name), renders: renderTimes() };
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

    renameRevision: title => {
      const id = get().activeRevisionId;
      if (id && title.trim()) update(id, r => ({ ...r, title: title.trim() }));
    },

    toggleAction: async (action, ids) => {
      const target = ids ?? get().selection;
      if (!target.length) {
        toast.message('Select images first');
        return;
      }
      const id = await editable();
      if (!id) return;
      const r = get().revisions[id];
      const on = target.every(t => r[action].includes(t));
      const { poster, maxFinal } = formatOf(get().job?.index);
      if (!on && action === 'final' && new Set([...r.final, ...target]).size > maxFinal) {
        toast.error(poster ? 'A poster has one cover: unmark the other first' : `Pick one final, or up to ${maxFinal} for YouTube's A/B test (Test & Compare)`);
        return;
      }
      // a dropped image can't be a final or kept, and the other way round
      const others: ImageAction[] = action === 'drop' ? ['final', 'keep'] : ['drop'];
      update(id, rev => {
        const next = { ...rev, [action]: on ? rev[action].filter(t => !target.includes(t)) : [...new Set([...rev[action], ...target])] };
        if (!on) for (const o of others) next[o] = next[o].filter(t => !target.includes(t));
        return next;
      });
    },

    addComment: async (rawText, opts = {}) => {
      const text = rawText.trim();
      const images = opts.pin ? [opts.pin.image] : (opts.ids ?? get().selection);
      if (!text) return false;
      if (!images.length) {
        toast.message('Select the images the comment is about');
        return false;
      }
      const revisionId = await editable();
      if (!revisionId) return false;
      const ordered = allIds(get().job?.index).filter(t => images.includes(t));
      const comment: ImageComment = {
        id: nextCommentId(get().revisions[revisionId].comments),
        images: ordered.length ? ordered : images,
        text,
        createdAt: new Date().toISOString(),
        status: 'open',
        ...(opts.pin ? { pin: { ...opts.pin, ...(opts.image ? { size: [opts.image.naturalWidth, opts.image.naturalHeight] as [number, number] } : {}) } } : {}),
      };
      if (opts.pin && opts.image) {
        try {
          const dir = await revisionsDir(true);
          const sub = dir && (await getSubdir(dir, revisionId, true));
          const file = snapshotFileName(revisionId, comment);
          if (sub) {
            await writeFileIn(sub, file.split('/')[1], await pinSnapshot(opts.image, opts.pin));
            comment.snapshot = file;
          }
        } catch (err) {
          toast.error(`Could not save the zoomed crop: ${errorMessage(err)}`);
        }
      }
      update(revisionId, r => ({ ...r, comments: [...r.comments, comment] }));
      return true;
    },

    updateComment: (commentId, patch) => {
      const id = get().activeRevisionId;
      if (!id) return;
      update(id, r => ({
        ...r,
        comments: r.comments.map(c => (c.id === commentId ? { ...c, ...patch, updatedAt: new Date().toISOString() } : c)),
      }));
    },

    deleteComment: async commentId => {
      const id = get().activeRevisionId;
      const comment = id ? get().revisions[id]?.comments.find(c => c.id === commentId) : undefined;
      if (!id || !comment) return;
      update(id, r => ({ ...r, comments: r.comments.filter(c => c.id !== commentId) }));
      if (comment.snapshot) {
        const dir = await revisionsDir(false).catch(() => null);
        const sub = dir && (await getSubdir(dir, id, false).catch(() => null));
        if (sub) await removeFileIn(sub, comment.snapshot.split('/')[1]).catch(() => undefined);
      }
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
          await writeFileIn(dir, `${id}.md`, revisionToMarkdown(revision, job.index, { revisionsDir: dirName }));
          set(s => ({
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
      await Promise.all([...[...saveTimers.keys()].map(id => get().saveRevision(id)), ...saveChains.values()]);
    },
  };
});
