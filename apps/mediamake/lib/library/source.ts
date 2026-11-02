import { getSubdir, readFileIn, requestReadWrite, writeFileIn } from '@/lib/revisions/fs';
import type { RawExport } from './model';
import type { ExportMeta, LibraryRequest, RequestFile } from './types';
import { EXPORT_SCHEMA, MEDIA_KINDS, REQUEST_SCHEMA } from './types';

/**
 * Where the page reads the library from. Both read only <root>/.catalog/export/*.json and
 * <root>/.catalog/thumbs/**: nothing is walked, so a visit costs a dozen small reads.
 *
 * - folder: the _LIBRARY folder the viewer picked (File System Access, read mode).
 * - dev: the local dev server's /api/dev-library, which reads the library named in
 *   ~/.mediamake/config.json (development only; no folder to pick).
 */
export interface LibrarySource {
  kind: 'folder' | 'dev';
  /** The folder's name, for the header. */
  name: string;
  /** export/<file> parsed, or null when it isn't there. Throws on bad JSON. */
  readExport: (file: string) => Promise<unknown | null>;
  /** A URL for a file under .catalog (a `thumbs/…` path), or null when it isn't there. */
  urlFor: (rel: string) => Promise<string | null>;
  /** Frees what urlFor made. */
  dispose: () => void;
}

/** Only thumbs/…: never a path out of it. */
export function safeThumbPath(rel: string): string[] | null {
  const parts = rel.split('/').filter(p => p && p !== '.');
  if (parts[0] !== 'thumbs' || parts.length < 2 || parts.some(p => p === '..' || p.includes('\\') || p.includes('\0'))) return null;
  return parts;
}

async function catalogOf(root: FileSystemDirectoryHandle, create = false) {
  return getSubdir(root, '.catalog', create);
}

export function folderSource(root: FileSystemDirectoryHandle): LibrarySource {
  const urls = new Map<string, Promise<string | null>>();
  return {
    kind: 'folder',
    name: root.name,
    readExport: async file => {
      const catalog = await catalogOf(root);
      const exp = catalog && (await getSubdir(catalog, 'export', false));
      const f = exp && (await readFileIn(exp, file));
      return f ? JSON.parse(await f.text()) : null;
    },
    urlFor: rel => {
      let p = urls.get(rel);
      if (!p) {
        p = (async () => {
          const parts = safeThumbPath(rel);
          if (!parts) return null;
          try {
            let dir = await catalogOf(root);
            const name = parts.pop()!;
            for (const part of parts) dir = dir && (await getSubdir(dir, part, false));
            const file = dir && (await readFileIn(dir, name));
            return file ? URL.createObjectURL(file) : null;
          } catch {
            return null;
          }
        })();
        urls.set(rel, p);
      }
      return p;
    },
    dispose: () => {
      for (const p of urls.values()) void p.then(u => u && URL.revokeObjectURL(u));
      urls.clear();
    },
  };
}

/** `root` overrides the configured library (development only, e.g. a test fixture). */
export function devSource(root?: string | null): LibrarySource {
  const q = root ? `?root=${encodeURIComponent(root)}` : '';
  return {
    kind: 'dev',
    name: root ? (root.split('/').filter(Boolean).pop() ?? root) : 'This Mac’s library',
    readExport: async file => {
      const res = await fetch(`/api/dev-library/export/${encodeURIComponent(file)}${q}`, { cache: 'no-store' });
      if (res.status === 404) return null;
      if (!res.ok) throw new Error(`${file}: ${res.status}`);
      return res.json();
    },
    urlFor: async rel => (safeThumbPath(rel) ? `/api/dev-library/${rel.split('/').map(encodeURIComponent).join('/')}${q}` : null),
    dispose: () => {},
  };
}

/** Whether the dev server has a library to serve (on localhost only). */
export async function devLibraryAvailable(root?: string | null): Promise<boolean> {
  if (!/^(localhost|127\.0\.0\.1|\[::1\])$/.test(window.location.hostname)) return false;
  try {
    const meta = (await devSource(root).readExport('meta.json')) as ExportMeta | null;
    return meta?.schema === EXPORT_SCHEMA;
  } catch {
    return false;
  }
}

/** meta.json, or null when the folder has no export (yet). */
export async function readMeta(source: LibrarySource): Promise<ExportMeta | null> {
  const meta = (await source.readExport('meta.json')) as ExportMeta | null;
  if (!meta) return null;
  if (meta.schema !== EXPORT_SCHEMA) throw new Error(`meta.json is ${meta.schema ?? 'not'} ${EXPORT_SCHEMA}`);
  return meta;
}

/** Every export file; one that is missing is empty, one that is broken is listed in problems. */
export async function loadExport(source: LibrarySource): Promise<RawExport> {
  const problems: string[] = [];
  const meta = await readMeta(source);
  const read = async (file: string) => {
    try {
      return await source.readExport(file);
    } catch (err) {
      problems.push(`${file}: ${err instanceof Error ? err.message : 'unreadable'}`);
      return null;
    }
  };
  const [channels, productions, skills, runs, ...media] = await Promise.all([
    read('channels.json'),
    read('productions.json'),
    read('skills.json'),
    read('runs.json'),
    ...MEDIA_KINDS.map(k => read(`media-${k}.json`)),
  ]);
  return { meta, channels, productions, skills, runs, media: Object.fromEntries(MEDIA_KINDS.map((k, i) => [k, media[i]])), problems };
}

/** 20261102T004354400Z-k3j9x2.json: sorts by time, never clashes. */
export function requestFileName(at: Date): string {
  return `${at.toISOString().replace(/[-:.]/g, '')}-${Math.random().toString(36).slice(2, 8)}.json`;
}

export function requestFile(req: LibraryRequest, at = new Date()): RequestFile {
  return { schema: REQUEST_SCHEMA, ...req, at: at.toISOString(), from: 'library-page' };
}

/**
 * Writes one request into <root>/.catalog/requests/, asking for write access first (the one
 * time the page asks for it). Returns the file's name.
 */
export async function writeRequest(root: FileSystemDirectoryHandle, req: LibraryRequest): Promise<string> {
  if ((await requestReadWrite(root)) !== 'granted') throw new Error('No permission to save in this folder');
  const catalog = await catalogOf(root, true);
  const dir = catalog && (await getSubdir(catalog, 'requests', true));
  if (!dir) throw new Error('Could not open .catalog/requests');
  const at = new Date();
  const name = requestFileName(at);
  await writeFileIn(dir, name, `${JSON.stringify(requestFile(req, at), null, 2)}\n`);
  return name;
}

/** The picked folder is a library: it has .catalog/export/meta.json. */
export async function isLibraryFolder(root: FileSystemDirectoryHandle): Promise<boolean> {
  try {
    return !!(await readMeta(folderSource(root)));
  } catch {
    return false;
  }
}
