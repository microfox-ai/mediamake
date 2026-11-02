'use client';

import { create } from 'zustand';
import { toast } from 'sonner';
import { getFolderSupport, type FolderSupport } from '@/lib/revisions/fs';
import { isAbortError, queryReadPermission, requestReadPermission } from '@/lib/local-media/file-access';
import * as history from '@/lib/library/history';
import { NO_FACETS, NO_PRODUCTION_FILTERS, NO_SKILL_FILTERS, type MediaFacets, type MediaMode, type MediaSort, type ProductionFilters, type SkillFilters } from '@/lib/library/filter';
import { buildLibrary, EMPTY_LIBRARY } from '@/lib/library/model';
import { devLibraryAvailable, devSource, folderSource, isLibraryFolder, loadExport, readMeta, writeRequest, type LibrarySource } from '@/lib/library/source';
import type { Library, LibraryRequest, SkillsRegistry } from '@/lib/library/types';

type PickerWindow = Window & {
  showDirectoryPicker?: (options?: { id?: string; mode?: 'read' | 'readwrite' }) => Promise<FileSystemDirectoryHandle>;
};

/** Chrome reopens the last folder used with this id. */
const PICKER_ID = 'mediamake-library';

export type View = 'channels' | 'productions' | 'skills' | 'media';
export const VIEWS: { id: View; label: string; key: string }[] = [
  { id: 'channels', label: 'Channels', key: '1' },
  { id: 'productions', label: 'Productions', key: '2' },
  { id: 'skills', label: 'Skills', key: '3' },
  { id: 'media', label: 'Media', key: '4' },
];
export type Selection = { kind: 'production' | 'skill' | 'item'; id: string } | null;
export type Status = 'idle' | 'loading' | 'ready' | 'needs-permission' | 'no-export' | 'error';
export type CardSize = 'sm' | 'md' | 'lg';

/** An edit written to .catalog/requests that the next export hasn't taken in yet. */
export interface Pending {
  file: string;
  at: string;
  req: LibraryRequest;
}

interface State {
  support: FolderSupport | null;
  ready: boolean;
  registry: SkillsRegistry | null;
  source: LibrarySource | null;
  /** The picked _LIBRARY folder: read from, and written to (requests only) after asking. */
  root: FileSystemDirectoryHandle | null;
  status: Status;
  error: string | null;
  library: Library;
  /** Bumped on every load, so thumbnails are read again. */
  generation: number;
  view: View;
  queries: Record<View, string>;
  selected: Selection;
  productionFilters: ProductionFilters;
  skillFilters: SkillFilters;
  mediaMode: MediaMode;
  facets: MediaFacets;
  mediaSort: MediaSort;
  cardSize: CardSize;
  pending: Pending[];

  init: (registry: SkillsRegistry | null) => Promise<void>;
  pickFolder: () => Promise<void>;
  reconnect: () => Promise<void>;
  forget: () => Promise<void>;
  reload: () => Promise<void>;
  checkForNewExport: () => Promise<void>;
  setView: (view: View) => void;
  setQuery: (query: string) => void;
  select: (sel: Selection) => void;
  showChannel: (channel: string | null) => void;
  setProductionFilters: (patch: Partial<ProductionFilters>) => void;
  setSkillFilters: (patch: Partial<SkillFilters>) => void;
  setMediaMode: (mode: MediaMode) => void;
  setFacets: (patch: Partial<MediaFacets>) => void;
  setMediaSort: (sort: MediaSort) => void;
  setCardSize: (size: CardSize) => void;
  /** Writes an edit as a request file for the media CLI. */
  send: (req: LibraryRequest) => Promise<boolean>;
}

const VIEW_IDS = VIEWS.map(v => v.id);

function syncUrl(s: Pick<State, 'view' | 'selected' | 'mediaMode' | 'productionFilters'>) {
  const url = new URL(window.location.href);
  for (const k of ['view', 'skill', 'production', 'item', 'mode', 'channel']) url.searchParams.delete(k);
  url.searchParams.set('view', s.view);
  if (s.selected) url.searchParams.set(s.selected.kind, s.selected.id);
  if (s.view === 'media' && s.mediaMode !== 'all') url.searchParams.set('mode', s.mediaMode);
  if (s.view === 'productions' && s.productionFilters.channel) url.searchParams.set('channel', s.productionFilters.channel);
  window.history.replaceState(null, '', url);
}

const describe = (req: LibraryRequest): string => {
  switch (req.op) {
    case 'tag':
      return [req.add?.length && `tagged ${req.add.join(', ')}`, req.remove?.length && `untagged ${req.remove.join(', ')}`].filter(Boolean).join(', ');
    case 'rate':
      return req.rating ? `rated ${req.rating}` : 'rating cleared';
    case 'sort':
      return `sorted into ${req.kind}${req.subject ? `/${req.subject}` : ''}`;
    case 'set-channel':
      return req.channel ? `channel set to ${req.channel}` : 'channel cleared';
    case 'set-thumbnail':
      return 'thumbnail set';
  }
};

export const useLibraryStore = create<State>((set, get) => {
  const open = async (source: LibrarySource, { quiet = false } = {}) => {
    const prev = get().source;
    set({ source, status: 'loading', error: null });
    try {
      const raw = await loadExport(source);
      if (prev && prev !== source) prev.dispose();
      if (!raw.meta) {
        set(s => ({ status: 'no-export', library: buildLibrary(s.registry, null), generation: s.generation + 1 }));
        return;
      }
      const library = buildLibrary(get().registry, raw);
      // an export written after an edit has taken it in
      const pending = get().pending.filter(p => p.at > raw.meta!.generatedAt);
      set(s => ({ status: 'ready', library, pending, generation: s.generation + 1 }));
      void history.savePref('pending', pending);
      if (raw.problems.length) toast.error(`Could not read ${raw.problems.length === 1 ? 'one export file' : `${raw.problems.length} export files`}`, { description: raw.problems.join('\n') });
      else if (!quiet && prev === source) toast.success('Library reloaded');
    } catch (err) {
      const denied = err instanceof DOMException && err.name === 'NotAllowedError';
      set({ status: denied ? 'needs-permission' : 'error', error: err instanceof Error ? err.message : String(err) });
    }
  };

  /** The folder to write requests into: the picked one, or (dev server) one picked now. */
  const writableRoot = async (): Promise<FileSystemDirectoryHandle | null> => {
    const { root } = get();
    if (root) return root;
    try {
      const handle = await (window as PickerWindow).showDirectoryPicker!({ id: PICKER_ID, mode: 'readwrite' });
      if (!(await isLibraryFolder(handle))) {
        toast.error(`${handle.name} isn't a library`, { description: 'Pick the _LIBRARY folder: the one with .catalog/export in it.' });
        return null;
      }
      await history.saveRoot(handle);
      set({ root: handle });
      return handle;
    } catch (err) {
      if (!isAbortError(err)) toast.error('Could not open that folder');
      return null;
    }
  };

  return {
    support: null,
    ready: false,
    registry: null,
    source: null,
    root: null,
    status: 'idle',
    error: null,
    library: EMPTY_LIBRARY,
    generation: 0,
    view: 'channels',
    queries: { channels: '', productions: '', skills: '', media: '' },
    selected: null,
    productionFilters: NO_PRODUCTION_FILTERS,
    skillFilters: NO_SKILL_FILTERS,
    mediaMode: 'all',
    facets: NO_FACETS,
    mediaSort: 'recent',
    cardSize: 'md',
    pending: [],

    init: async registry => {
      if (get().ready) return;
      const support = getFolderSupport();
      const params = new URLSearchParams(window.location.search);
      const view = params.get('view') as View | null;
      const mode = params.get('mode');
      const selected: Selection = params.get('item')
        ? { kind: 'item', id: params.get('item')! }
        : params.get('production')
          ? { kind: 'production', id: params.get('production')! }
          : params.get('skill')
            ? { kind: 'skill', id: params.get('skill')! }
            : null;
      const [cardSize, mediaSort, pending] = await Promise.all([
        history.loadPref<CardSize>('cardSize', 'md'),
        history.loadPref<MediaSort>('mediaSort', 'recent'),
        history.loadPref<Pending[]>('pending', []),
      ]);
      set({
        support,
        registry,
        ready: true,
        library: buildLibrary(registry, null),
        cardSize,
        mediaSort,
        pending,
        view: view && VIEW_IDS.includes(view) ? view : selected?.kind === 'skill' ? 'skills' : selected?.kind === 'item' ? 'media' : 'channels',
        selected,
        mediaMode: mode === 'inbox' || mode === 'dupes' ? mode : 'all',
        productionFilters: { ...NO_PRODUCTION_FILTERS, channel: params.get('channel') },
      });

      // a fixture or another library on the dev server: ?dev-root=<absolute path>
      const devRoot = params.get('dev-root');
      if (devRoot && (await devLibraryAvailable(devRoot))) return open(devSource(devRoot), { quiet: true });
      const root = support.supported ? await history.loadRoot() : null;
      if (root) {
        set({ root });
        if ((await queryReadPermission(root)) === 'granted') return open(folderSource(root), { quiet: true });
        set({ status: 'needs-permission' });
        return;
      }
      if (await devLibraryAvailable()) return open(devSource(), { quiet: true });
    },

    pickFolder: async () => {
      let handle: FileSystemDirectoryHandle;
      try {
        handle = await (window as PickerWindow).showDirectoryPicker!({ id: PICKER_ID, mode: 'read' });
      } catch (err) {
        if (!isAbortError(err)) toast.error('Could not open that folder', { description: 'Chrome refuses Downloads itself: pick the _LIBRARY folder inside it.' });
        return;
      }
      if (!(await isLibraryFolder(handle))) {
        toast.error(`No library export in ${handle.name}`, { description: 'Pick the _LIBRARY folder (it has .catalog/export). If it is the right one, run the media CLI’s export first.' });
        return;
      }
      await history.saveRoot(handle);
      set({ root: handle });
      await open(folderSource(handle), { quiet: true });
    },

    reconnect: async () => {
      const { root } = get();
      if (!root) return;
      if ((await requestReadPermission(root)) !== 'granted') return;
      await open(folderSource(root), { quiet: true });
    },

    forget: async () => {
      get().source?.dispose();
      await history.saveRoot(null);
      set(s => ({ root: null, source: null, status: 'idle', library: buildLibrary(s.registry, null), generation: s.generation + 1 }));
    },

    reload: async () => {
      const { source } = get();
      if (source) await open(source);
    },

    checkForNewExport: async () => {
      const { source, status, library } = get();
      if (!source || status !== 'ready') return;
      try {
        const meta = await readMeta(source);
        if (meta && meta.generatedAt !== library.meta?.generatedAt) {
          await open(source, { quiet: true });
          toast.message('The library was exported again', { description: 'Showing the new export.' });
        }
      } catch {
        // permission gone or mid-write: the next focus tries again
      }
    },

    setView: view => {
      set({ view });
      syncUrl(get());
    },
    setQuery: query => set(s => ({ queries: { ...s.queries, [s.view]: query } })),
    select: selected => {
      set({ selected });
      syncUrl(get());
    },
    showChannel: channel => {
      set(s => ({ view: 'productions', productionFilters: { ...s.productionFilters, channel }, selected: null }));
      syncUrl(get());
    },
    setProductionFilters: patch => {
      set(s => ({ productionFilters: { ...s.productionFilters, ...patch } }));
      syncUrl(get());
    },
    setSkillFilters: patch => set(s => ({ skillFilters: { ...s.skillFilters, ...patch } })),
    setMediaMode: mediaMode => {
      set({ mediaMode });
      syncUrl(get());
    },
    setFacets: patch => set(s => ({ facets: { ...s.facets, ...patch } })),
    setMediaSort: mediaSort => {
      set({ mediaSort });
      void history.savePref('mediaSort', mediaSort);
    },
    setCardSize: cardSize => {
      set({ cardSize });
      void history.savePref('cardSize', cardSize);
    },

    send: async req => {
      const root = await writableRoot();
      if (!root) return false;
      try {
        const file = await writeRequest(root, req);
        const pending = [...get().pending, { file, at: new Date().toISOString(), req }];
        set({ pending });
        void history.savePref('pending', pending);
        toast.success(`Saved: ${describe(req)}`, { description: 'The media CLI applies it on its next run.' });
        return true;
      } catch (err) {
        toast.error('Could not save the edit', { description: err instanceof Error ? err.message : undefined });
        return false;
      }
    },
  };
});

/* ---------- what an item or production looks like with the edits still waiting ---------- */

export function pendingTags(pending: Pending[], id: string, tags: string[]): { tags: string[]; added: Set<string>; removed: Set<string> } {
  const added = new Set<string>();
  const removed = new Set<string>();
  for (const { req } of pending) {
    if (req.target !== id) continue;
    if (req.op === 'tag') {
      for (const t of req.add ?? []) {
        removed.delete(t);
        added.add(t);
      }
      for (const t of req.remove ?? []) {
        added.delete(t);
        removed.add(t);
      }
    }
    if (req.op === 'sort') for (const t of req.tags ?? []) added.add(t);
  }
  return { tags: [...tags.filter(t => !removed.has(t)), ...[...added].filter(t => !tags.includes(t))], added, removed };
}

export function pendingRating(pending: Pending[], id: string): number | null | undefined {
  let r: number | null | undefined;
  for (const { req } of pending) if (req.target === id && req.op === 'rate') r = req.rating;
  return r;
}

export function pendingSort(pending: Pending[], id: string) {
  let s: Extract<LibraryRequest, { op: 'sort' }> | undefined;
  for (const { req } of pending) if (req.target === id && req.op === 'sort') s = req;
  return s;
}

export function pendingChannel(pending: Pending[], slug: string): string | null | undefined {
  let c: string | null | undefined;
  for (const { req } of pending) if (req.target === slug && req.op === 'set-channel') c = req.channel;
  return c;
}

export function pendingThumbnail(pending: Pending[], slug: string): string | undefined {
  let item: string | undefined;
  for (const { req } of pending) if (req.target === slug && req.op === 'set-thumbnail') item = req.item;
  return item;
}
