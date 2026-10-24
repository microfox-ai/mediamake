'use client';

import type React from 'react';
import type { PlayerRef } from '@remotion/player';
import { toast } from 'sonner';
import { create } from 'zustand';
import { isAbortError } from '@/lib/local-media/file-access';
import { getFolderSupport, queryReadWrite, requestReadWrite, type FolderSupport } from '@/lib/revisions/fs';
import { changedFiles, compileProject, type CompiledProject } from '@/lib/remotion-editor/compile';
import { serializeEdits } from '@/lib/remotion-editor/edits';
import {
  forgetFolder as forgetStoredFolder,
  loadFolders,
  rememberFolder,
  type FolderEntry,
} from '@/lib/remotion-editor/folder-history';
import { FolderSource, findLyricsRoot, pickDirectory } from '@/lib/remotion-editor/folder-source';
import { repoSource, type ProjectSource } from '@/lib/remotion-editor/source';
import {
  emptyEdits,
  type Edits,
  type LyricManifest,
  type ProjectEntry,
} from '@/lib/remotion-editor/types';

/*
 * State of the /remotion-editor page: where projects come from (the local repo on `next dev`, or
 * a folder the user picks), the open lyric project (compiled in the browser), its edits with
 * undo/redo, and autosave to projects/<slug>/video/edits.json.
 */

/** Only `next dev` serves the repo; a deployed build always works from a picked folder. */
export const REPO_AVAILABLE = process.env.NODE_ENV === 'development';

/** The Player, for imperative control (seek, play) from anywhere on the page. */
export const player: { current: PlayerRef | null } = { current: null };

/** What the stage reads off the selected element's DOM attributes (see the kit's editable()). */
export type SelectedInfo = {
  id: string;
  label: string;
  /** the text it shows on screen */
  text: string;
  /** key of the layer the element sits in */
  layer: string | null;
  /** path of the object it shows inside that layer's props; null when it offers no fields */
  propsPath: string | null;
  fields: string[];
};

export type OnScreen = { id: string; label: string; layer: string | null };

type SaveState = 'idle' | 'saving' | 'saved' | 'error';

type State = {
  source: ProjectSource | null;
  support: FolderSupport | null;
  /** folders opened before (IndexedDB) */
  folders: FolderEntry[];
  /** a folder that needs a click before Chrome gives access again */
  pendingFolder: FolderEntry | null;
  projects: ProjectEntry[];
  projectsLoaded: boolean;
  projectsError: string | null;
  slug: string | null;
  phase: 'idle' | 'compiling' | 'ready' | 'error';
  /** what a long step is doing ("Reading files… 400") */
  progress: string | null;
  /** a compile error; the last good version keeps playing when there is one */
  error: string | null;
  compiled: CompiledProject | null;
  Video: React.ComponentType<Record<string, unknown>> | null;
  layerKeys: string[];
  manifest: LyricManifest | null;
  durationInFrames: number;
  edits: Edits;
  savedText: string;
  editsMtime: number | null;
  saveState: SaveState;
  saveError: string | null;
  past: Edits[];
  future: Edits[];
  selectedId: string | null;
  /** read from the element when it was last on screen, so the inspector keeps working after a seek */
  selected: SelectedInfo | null;
  selectedOnScreen: boolean;
  onScreen: OnScreen[];
  frame: number;
  playing: boolean;
  /** files of the compiled project changed on disk */
  changed: string[];
  dragging: boolean;

  init: () => Promise<void>;
  openRepo: () => Promise<void>;
  /** Opens the folder picker (needs a click). */
  pickFolder: () => Promise<void>;
  openFolder: (handle: FileSystemDirectoryHandle) => Promise<void>;
  forgetFolder: (id: string) => Promise<void>;
  /** Handles from a drop on the page: the first folder is opened. */
  openDropped: (handles: FileSystemHandle[]) => Promise<void>;
  loadProjects: () => Promise<void>;
  openProject: (slug: string) => Promise<void>;
  reload: () => Promise<void>;
  checkDisk: () => Promise<void>;
  /** Starts an undo step for a drag; `change(..., { live: true })` then updates it in place. */
  beginGesture: () => void;
  endGesture: (moved: boolean) => void;
  change: (fn: (e: Edits) => Edits, opts?: { live?: boolean; coalesce?: string }) => void;
  undo: () => void;
  redo: () => void;
  save: () => Promise<void>;
  select: (id: string | null) => void;
  /** null info: the selected element isn't on screen at this frame (the last info is kept) */
  setSelected: (info: SelectedInfo | null) => void;
  setOnScreen: (list: OnScreen[]) => void;
  setFrame: (frame: number) => void;
  setPlaying: (playing: boolean) => void;
};

const LAST_PROJECT = 'remotion-editor:last-project';
const LAST_SOURCE = 'remotion-editor:last-source';
const HISTORY_LIMIT = 200;
let lastCoalesce: { key: string; at: number } | null = null;

const readJson = async <T>(source: ProjectSource, path: string): Promise<T | null> => {
  const text = (await source.readTexts([path]))[path];
  if (text == null) return null;
  return JSON.parse(text) as T;
};

/** Asset paths in the manifest become URLs, for atoms that call staticFile() on their own copy of Remotion. */
const withAssetUrls = (source: ProjectSource, m: LyricManifest): LyricManifest => ({
  ...m,
  audio: { ...m.audio, src: source.assetUrl(m.audio.src) },
  assets: Object.fromEntries(
    Object.entries(m.assets ?? {}).map(([k, v]) => [k, source.assetUrl(v)]),
  ),
});

const message = (e: unknown) => (e instanceof Error ? e.message : String(e));

/** Everything about the open project, cleared when another project or source opens. */
const noProject = {
  slug: null,
  phase: 'idle' as const,
  progress: null,
  error: null,
  compiled: null,
  Video: null,
  layerKeys: [],
  manifest: null,
  durationInFrames: 1,
  edits: emptyEdits(),
  savedText: serializeEdits(emptyEdits()),
  editsMtime: null,
  saveState: 'idle' as const,
  saveError: null,
  past: [],
  future: [],
  selectedId: null,
  selected: null,
  selectedOnScreen: false,
  onScreen: [],
  frame: 0,
  playing: false,
  changed: [],
  dragging: false,
};

export const useEditor = create<State>((set, get) => {
  /** Saves the open project, then lists the new source's projects and opens one. */
  const switchSource = async (next: ProjectSource) => {
    const prev = get().source;
    if (get().slug) await get().save();
    player.current?.pause();
    if (prev !== next) prev?.dispose?.();
    set({ ...noProject, source: next, projects: [], projectsLoaded: false, projectsError: null });
    await get().loadProjects();
  };

  return {
    source: null,
    support: null,
    folders: [],
    pendingFolder: null,
    projects: [],
    projectsLoaded: false,
    projectsError: null,
    ...noProject,

    init: async () => {
      const support = getFolderSupport();
      const folders = support.supported ? await loadFolders().catch(() => []) : [];
      set({ support, folders });
      if (REPO_AVAILABLE) {
        // lets a test open a folder it made itself (the picker is a native dialog) or set state
        (window as unknown as { __remotionEditor?: object }).__remotionEditor = {
          openFolder: (h: FileSystemDirectoryHandle) => get().openFolder(h),
          store: useEditor,
        };
      }
      const wantsFolder = !REPO_AVAILABLE || localStorage.getItem(LAST_SOURCE) === 'folder';
      if (wantsFolder && folders[0]) {
        // a kept grant ("Allow on every visit") reopens without a click
        if ((await queryReadWrite(folders[0].handle)) === 'granted') {
          await get().openFolder(folders[0].handle);
          return;
        }
        set({ pendingFolder: folders[0] });
        return;
      }
      if (REPO_AVAILABLE) await get().openRepo();
    },

    openRepo: async () => {
      localStorage.setItem(LAST_SOURCE, 'repo');
      set({ pendingFolder: null });
      await switchSource(repoSource);
    },

    pickFolder: async () => {
      try {
        await get().openFolder(await pickDirectory());
      } catch (e) {
        if (!isAbortError(e)) {
          toast.error(`Could not open the folder: ${message(e)}`, { duration: 6000 });
        }
      }
    },

    openFolder: async handle => {
      const permission = await requestReadWrite(handle);
      if (permission !== 'granted') {
        const known = await Promise.all(
          get().folders.map(async f => ((await f.handle.isSameEntry(handle).catch(() => false)) ? f : null)),
        );
        set({
          pendingFolder: known.find(Boolean) ?? {
            id: '',
            name: handle.name,
            handle,
            openedAt: Date.now(),
          },
        });
        if (permission === 'denied') {
          toast.error('Edit access to the folder is needed to save edits beside the project', {
            duration: 6000,
          });
        } else if (get().source) {
          // the stage is busy with the open project, so the click Chrome needs goes here
          toast(`Chrome needs one click to open ${handle.name}`, {
            duration: 15000,
            action: { label: 'Allow', onClick: () => void get().openFolder(handle) },
          });
        }
        return;
      }
      const root = await findLyricsRoot(handle).catch(() => null);
      if (!root) {
        toast.error(
          `"${handle.name}" has no projects/ and src/kit/. Pick apps/lyrics_videos (or the repo).`,
          { duration: 8000 },
        );
        return;
      }
      await rememberFolder(handle).catch(() => null);
      set({ pendingFolder: null, folders: await loadFolders().catch(() => get().folders) });
      localStorage.setItem(LAST_SOURCE, 'folder');
      await switchSource(new FolderSource(root, handle));
    },

    forgetFolder: async id => {
      await forgetStoredFolder(id).catch(() => null);
      set(s => ({
        folders: s.folders.filter(f => f.id !== id),
        pendingFolder: s.pendingFolder?.id === id ? null : s.pendingFolder,
      }));
    },

    openDropped: async handles => {
      const dir = handles.find((h): h is FileSystemDirectoryHandle => h.kind === 'directory');
      if (dir) await get().openFolder(dir);
      else if (handles.length) toast.error('Drop the lyrics_videos folder, not a file', { duration: 5000 });
    },

    loadProjects: async () => {
      const { source } = get();
      if (!source) return;
      try {
        const projects = await source.listProjects();
        if (get().source !== source) return;
        set({ projects, projectsLoaded: true, projectsError: null });
        if (!get().slug && projects.length) {
          const wanted =
            new URLSearchParams(window.location.search).get('project') ??
            localStorage.getItem(LAST_PROJECT);
          const slug = projects.find(p => p.slug === wanted)?.slug ?? projects[0].slug;
          await get().openProject(slug);
        }
      } catch (e) {
        if (get().source === source) set({ projectsLoaded: true, projectsError: message(e) });
      }
    },

    openProject: async slug => {
      const { source } = get();
      if (!source) return;
      if (get().saveState !== 'saving' && get().slug && get().slug !== slug) await get().save();
      player.current?.pause();
      set({ ...noProject, slug, phase: 'compiling' });
      localStorage.setItem(LAST_PROJECT, slug);
      const url = new URL(window.location.href);
      url.searchParams.set('project', slug);
      window.history.replaceState(null, '', url);
      const still = () => get().slug === slug && get().source === source;
      try {
        await source.prepare?.(slug, progress => still() && set({ progress }));
        if (still()) set({ progress: 'Compiling…' });
        const compiled = await compileProject(source, slug);
        const manifest = await readJson<LyricManifest>(source, `projects/${slug}/manifest.json`);
        if (!manifest) {
          throw new Error(
            `No manifest. Run: npm run prepare-project -w lyrics_videos -- ${slug}`,
          );
        }
        const editsPath = `projects/${slug}/video/edits.json`;
        const rawEdits = await readJson<unknown>(source, editsPath).catch(() => null);
        const edits = { ...emptyEdits(), ...compiled.kit.parseEdits(rawEdits ?? {}) } as Edits;
        if (!still()) return;
        const { project, kit } = compiled;
        set({
          phase: 'ready',
          progress: null,
          compiled,
          Video: kit.makeProjectVideo(project) as React.ComponentType<Record<string, unknown>>,
          layerKeys: kit.layerKeys(project.layers),
          manifest: withAssetUrls(source, manifest),
          durationInFrames: Math.max(
            1,
            Math.ceil((manifest.audio.duration + (project.tail ?? 0)) * project.fps),
          ),
          edits,
          savedText: serializeEdits(edits),
          editsMtime: compiled.files[editsPath] ?? null,
          saveState: 'idle',
        });
      } catch (e) {
        if (still()) set({ phase: 'error', progress: null, error: message(e) });
      }
    },

    reload: async () => {
      const { source, slug, compiled, frame } = get();
      if (!source || !slug) return;
      if (!compiled) return get().openProject(slug);
      try {
        // a folder's files are snapshots: map them again, new pictures included
        await source.prepare?.(slug);
        const next = await compileProject(source, slug);
        if (get().slug !== slug || get().source !== source) return;
        set({
          compiled: next,
          Video: next.kit.makeProjectVideo(next.project) as React.ComponentType<Record<string, unknown>>,
          layerKeys: next.kit.layerKeys(next.project.layers),
          error: null,
          changed: [],
        });
        // the Player remounts with the new component; put the playhead back
        requestAnimationFrame(() => player.current?.seekTo(frame));
      } catch (e) {
        // keep showing the version that compiled
        set({ error: message(e), changed: [] });
      }
    },

    checkDisk: async () => {
      const { source, compiled, dragging, slug } = get();
      if (!source || !compiled || dragging || !slug) return;
      const files = await source.listFiles(slug).catch(() => null);
      if (!files || get().slug !== slug || get().source !== source) return;
      const now = new Map(files.map(f => [f.path, f.mtime]));
      const editsPath = `projects/${slug}/video/edits.json`;
      const code = changedFiles(compiled, now).filter(f => f !== editsPath);
      if (code.length) {
        set({ changed: code });
        await get().reload();
      }
      // edits.json changed by someone else (Claude baking edits in, another tab): take theirs
      // unless this page has unsaved changes
      const mtime = now.get(editsPath) ?? null;
      const { editsMtime, savedText, edits } = get();
      if (mtime !== null && mtime !== editsMtime && serializeEdits(edits) === savedText) {
        const raw = await readJson<unknown>(source, editsPath).catch(() => null);
        const next = { ...emptyEdits(), ...get().compiled!.kit.parseEdits(raw ?? {}) } as Edits;
        set({ edits: next, savedText: serializeEdits(next), editsMtime: mtime });
      }
    },

    beginGesture: () => {
      const { past, edits } = get();
      set({ past: [...past, edits].slice(-HISTORY_LIMIT), future: [], dragging: true });
      lastCoalesce = null;
    },

    endGesture: moved => {
      const { past } = get();
      // a click without a drag leaves no undo step
      set(moved ? { dragging: false } : { dragging: false, past: past.slice(0, -1) });
    },

    change: (fn, opts = {}) => {
      const { edits, past } = get();
      const next = fn(edits);
      if (next === edits) return;
      if (opts.live) {
        set({ edits: next });
        return;
      }
      const now = Date.now();
      const coalesced =
        !!opts.coalesce &&
        lastCoalesce?.key === opts.coalesce &&
        now - lastCoalesce.at < 1200;
      lastCoalesce = opts.coalesce ? { key: opts.coalesce, at: now } : null;
      set({
        edits: next,
        past: coalesced ? past : [...past, edits].slice(-HISTORY_LIMIT),
        future: [],
      });
    },

    undo: () => {
      const { past, future, edits } = get();
      if (!past.length) return;
      lastCoalesce = null;
      set({ edits: past[past.length - 1], past: past.slice(0, -1), future: [edits, ...future] });
    },

    redo: () => {
      const { past, future, edits } = get();
      if (!future.length) return;
      lastCoalesce = null;
      set({ edits: future[0], past: [...past, edits], future: future.slice(1) });
    },

    save: async () => {
      const { source, slug, edits, savedText, phase } = get();
      if (!source || !slug || phase === 'compiling') return;
      const text = serializeEdits(edits);
      if (text === savedText) return;
      set({ saveState: 'saving', saveError: null });
      try {
        const mtime = await source.writeText(`projects/${slug}/video/edits.json`, text);
        if (get().slug !== slug || get().source !== source) return;
        set({ savedText: text, editsMtime: mtime, saveState: 'saved' });
      } catch (e) {
        set({ saveState: 'error', saveError: message(e) });
      }
    },

    select: id =>
      set(s =>
        s.selectedId === id ? {} : { selectedId: id, selected: null, selectedOnScreen: false },
      ),
    setSelected: info =>
      set(info ? { selected: info, selectedOnScreen: true } : { selectedOnScreen: false }),
    setOnScreen: list => set({ onScreen: list }),
    setFrame: frame => set({ frame }),
    setPlaying: playing => set({ playing }),
  };
});

export const selectDirty = (s: State) => serializeEdits(s.edits) !== s.savedText;
