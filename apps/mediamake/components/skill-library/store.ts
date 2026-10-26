'use client';

import { create } from 'zustand';
import { toast } from 'sonner';
import { getFolderSupport, queryReadWrite, requestReadWrite, type FolderSupport } from '@/lib/revisions/fs';
import { isAbortError } from '@/lib/local-media/file-access';
import * as history from '@/lib/skill-library/history';
import { buildLibrary } from '@/lib/skill-library/model';
import { fileAt, scanSource } from '@/lib/skill-library/scan';
import { writeProductionManifest, writeSkillManifest, writeThumbnail } from '@/lib/skill-library/write';
import type { FileRef, Library, ProductionManifest, SkillManifest, SourceScan, VariantKind } from '@/lib/skill-library/types';
import { PRODUCTION_MANIFEST, PRODUCTION_SCHEMA, SKILL_MANIFEST, SKILL_SCHEMA } from '@/lib/skill-library/types';

type PickerWindow = Window & {
  showDirectoryPicker?: (options?: { id?: string; mode?: 'read' | 'readwrite' }) => Promise<FileSystemDirectoryHandle>;
  showOpenFilePicker?: (options?: {
    multiple?: boolean;
    id?: string;
    types?: { description?: string; accept: Record<string, string[]> }[];
  }) => Promise<FileSystemFileHandle[]>;
};

/** Chrome reopens the last folder used with this id. */
const PICKER_ID = 'mediamake-skill-library';

export type SourceStatus = 'scanning' | 'ready' | 'needs-permission' | 'error';
export interface SourceState extends history.SourceEntry {
  status: SourceStatus;
  scan: SourceScan | null;
  scannedAt?: number;
}

export type View = 'skills' | 'families' | 'productions';
export type Sort = 'name' | 'recent';
export type CardSize = 'sm' | 'md' | 'lg';
export type Selection = { kind: 'skill'; id: string } | { kind: 'production'; id: string } | null;
export interface Filters {
  category: string | null;
  type: 'all' | 'base' | 'variant';
  variantKind: VariantKind | null;
  owner: string | null;
  pinned: boolean;
}
export const NO_FILTERS: Filters = { category: null, type: 'all', variantKind: null, owner: null, pinned: false };

const EMPTY: Library = { skills: {}, productions: {}, families: [], categories: [], owners: [] };

interface State {
  support: FolderSupport | null;
  ready: boolean;
  sources: SourceState[];
  library: Library;
  /** Bumped on every rescan, so cached thumbnails are read again. */
  generation: number;
  view: View;
  query: string;
  filters: Filters;
  sort: Sort;
  cardSize: CardSize;
  /** Show variants inside their base's card (skills view). */
  groupVariants: boolean;
  pins: string[];
  selected: Selection;
  editing: Selection;

  init: () => Promise<void>;
  addSource: () => Promise<void>;
  reconnectSource: (id: string) => Promise<void>;
  removeSource: (id: string) => Promise<void>;
  rescan: (id?: string) => Promise<void>;
  rescanIfStale: () => void;
  setView: (view: View) => void;
  setQuery: (query: string) => void;
  setFilters: (patch: Partial<Filters>) => void;
  setSort: (sort: Sort) => void;
  setCardSize: (size: CardSize) => void;
  setGroupVariants: (on: boolean) => void;
  togglePin: (key: string) => void;
  select: (sel: Selection) => void;
  setEditing: (sel: Selection) => void;
  pickThumbnail: (sel: NonNullable<Selection>) => Promise<void>;
  thumbnailFromImage: (sel: NonNullable<Selection>, ref: FileRef) => Promise<void>;
  saveSkill: (name: string, patch: Partial<SkillManifest>) => Promise<boolean>;
  saveProduction: (slug: string, patch: Partial<ProductionManifest>) => Promise<boolean>;
}

const pinKey = (sel: NonNullable<Selection>) => `${sel.kind}:${sel.id}`;
export { pinKey };

function syncUrl(sel: Selection, view: View) {
  const url = new URL(window.location.href);
  url.searchParams.delete('skill');
  url.searchParams.delete('production');
  if (sel) url.searchParams.set(sel.kind, sel.id);
  if (view === 'skills') url.searchParams.delete('view');
  else url.searchParams.set('view', view);
  window.history.replaceState(null, '', url);
}

export const useSkillLibraryStore = create<State>((set, get) => {
  const rebuild = () => {
    const scans = get()
      .sources.filter(s => s.scan)
      .map(s => ({ sourceId: s.id, scan: s.scan! }));
    set(s => ({ library: buildLibrary(scans), generation: s.generation + 1 }));
  };

  const patchSource = (id: string, patch: Partial<SourceState>) =>
    set(s => ({ sources: s.sources.map(src => (src.id === id ? { ...src, ...patch } : src)) }));

  const scanOne = async (id: string) => {
    const src = get().sources.find(s => s.id === id);
    if (!src) return;
    if ((await queryReadWrite(src.handle)) !== 'granted') {
      patchSource(id, { status: 'needs-permission' });
      return;
    }
    patchSource(id, { status: 'scanning' });
    try {
      const scan = await scanSource(src.handle, id);
      patchSource(id, { status: 'ready', scan, scannedAt: Date.now() });
      if (scan.truncated) toast.message(`Stopped reading ${src.name} after ${scan.visited} folders`, { description: 'Add a smaller folder (e.g. .claude/skills or a productions folder) to see everything in it.' });
    } catch {
      patchSource(id, { status: 'error' });
    }
    rebuild();
  };

  /** The folder to write into, after asking for write access to its source. */
  const writable = async (sel: NonNullable<Selection>) => {
    const { library, sources } = get();
    const item = sel.kind === 'skill' ? library.skills[sel.id] : library.productions[sel.id];
    if (!item) return null;
    const src = sources.find(s => s.id === item.sourceId);
    if (!src || (await requestReadWrite(src.handle)) !== 'granted') {
      toast.error('No permission to write in this folder');
      return null;
    }
    return { item, dir: item.dir };
  };

  const thumbnailFrom = async (sel: NonNullable<Selection>, image: Blob, name: string) => {
    const target = await writable(sel);
    if (!target) return;
    const manifest =
      sel.kind === 'skill'
        ? { file: SKILL_MANIFEST, schema: SKILL_SCHEMA, thumbnail: target.item.manifest?.thumbnail }
        : { file: PRODUCTION_MANIFEST, schema: PRODUCTION_SCHEMA, thumbnail: target.item.manifest?.thumbnail };
    try {
      const file = await writeThumbnail(target.dir, image, name, manifest);
      toast.success(`Thumbnail saved`, { description: `${target.item.path}/${file}` });
      await scanOne(target.item.sourceId);
    } catch (err) {
      toast.error('Could not save the thumbnail', { description: err instanceof Error ? err.message : undefined });
    }
  };

  return {
    support: null,
    ready: false,
    sources: [],
    library: EMPTY,
    generation: 0,
    view: 'skills',
    query: '',
    filters: NO_FILTERS,
    sort: 'name',
    cardSize: 'md',
    groupVariants: true,
    pins: [],
    selected: null,
    editing: null,

    init: async () => {
      if (get().ready) return;
      const support = getFolderSupport();
      const params = new URLSearchParams(window.location.search);
      const view = params.get('view');
      const skill = params.get('skill');
      const production = params.get('production');
      const [pins, cardSize, groupVariants, sort] = await Promise.all([
        history.loadPref<string[]>('pins', []),
        history.loadPref<CardSize>('cardSize', 'md'),
        history.loadPref<boolean>('groupVariants', true),
        history.loadPref<Sort>('sort', 'name'),
      ]);
      set({
        support,
        ready: true,
        pins,
        cardSize,
        groupVariants,
        sort,
        view: view === 'families' || view === 'productions' ? view : 'skills',
        selected: skill ? { kind: 'skill', id: skill } : production ? { kind: 'production', id: production } : null,
      });
      if (!support.supported) return;
      const entries = await history.loadSources().catch(() => []);
      set({ sources: entries.map(e => ({ ...e, status: 'scanning' as const, scan: null })) });
      await Promise.all(entries.map(e => scanOne(e.id)));
    },

    addSource: async () => {
      let handle: FileSystemDirectoryHandle;
      try {
        handle = await (window as PickerWindow).showDirectoryPicker!({ id: PICKER_ID, mode: 'readwrite' });
      } catch (err) {
        if (!isAbortError(err)) toast.error('Could not open that folder', { description: 'Chrome refuses the root of your home folder, Desktop and Downloads: pick a folder inside them.' });
        return;
      }
      const { entry, existed } = await history.addSource(handle);
      if (!existed) set(s => ({ sources: [...s.sources, { ...entry, status: 'scanning', scan: null }] }));
      await scanOne(entry.id);
    },

    reconnectSource: async id => {
      const src = get().sources.find(s => s.id === id);
      if (!src) return;
      if ((await requestReadWrite(src.handle)) !== 'granted') return;
      await scanOne(id);
    },

    removeSource: async id => {
      await history.removeSource(id);
      set(s => ({ sources: s.sources.filter(src => src.id !== id) }));
      rebuild();
    },

    rescan: async id => {
      const ids = id ? [id] : get().sources.filter(s => s.status !== 'needs-permission').map(s => s.id);
      await Promise.all(ids.map(scanOne));
    },

    rescanIfStale: () => {
      const stale = get().sources.filter(s => s.status === 'ready' && Date.now() - (s.scannedAt ?? 0) > 20_000);
      for (const s of stale) void scanOne(s.id);
    },

    setView: view => {
      set({ view });
      syncUrl(get().selected, view);
    },
    setQuery: query => set({ query }),
    setFilters: patch => set(s => ({ filters: { ...s.filters, ...patch } })),
    setSort: sort => {
      set({ sort });
      void history.savePref('sort', sort);
    },
    setCardSize: cardSize => {
      set({ cardSize });
      void history.savePref('cardSize', cardSize);
    },
    setGroupVariants: groupVariants => {
      set({ groupVariants });
      void history.savePref('groupVariants', groupVariants);
    },
    togglePin: key => {
      const pins = get().pins.includes(key) ? get().pins.filter(p => p !== key) : [...get().pins, key];
      set({ pins });
      void history.savePref('pins', pins);
    },
    select: selected => {
      set({ selected });
      syncUrl(selected, get().view);
    },
    setEditing: editing => set({ editing }),

    pickThumbnail: async sel => {
      let handle: FileSystemFileHandle;
      try {
        [handle] = await (window as PickerWindow).showOpenFilePicker!({
          multiple: false,
          id: PICKER_ID,
          types: [{ description: 'Images', accept: { 'image/*': ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.avif'] } }],
        });
      } catch (err) {
        if (!isAbortError(err)) toast.error('Could not open that image');
        return;
      }
      const file = await handle.getFile();
      await thumbnailFrom(sel, file, file.name);
    },

    thumbnailFromImage: async (sel, ref) => {
      const file = await fileAt(ref.dir, ref.file);
      if (!file) {
        toast.error('That image is gone', { description: ref.path });
        return;
      }
      await thumbnailFrom(sel, file, file.name);
    },

    saveSkill: async (name, patch) => {
      const target = await writable({ kind: 'skill', id: name });
      if (!target) return false;
      try {
        await writeSkillManifest(target.dir, patch);
        toast.success('Saved', { description: `${target.item.path}/${SKILL_MANIFEST}` });
        await scanOne(target.item.sourceId);
        return true;
      } catch (err) {
        toast.error('Could not save skill.json', { description: err instanceof Error ? err.message : undefined });
        return false;
      }
    },

    saveProduction: async (slug, patch) => {
      const target = await writable({ kind: 'production', id: slug });
      if (!target) return false;
      try {
        await writeProductionManifest(target.dir, patch);
        toast.success('Saved', { description: `${target.item.path}/${PRODUCTION_MANIFEST}` });
        await scanOne(target.item.sourceId);
        return true;
      } catch (err) {
        toast.error('Could not save mediamake.json', { description: err instanceof Error ? err.message : undefined });
        return false;
      }
    },
  };
});
