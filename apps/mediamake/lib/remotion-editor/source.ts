import type { CodeFile, MediaFile, ProjectEntry } from './types';

/**
 * Where a lyric project's files come from. Paths are relative to the apps/studio folder
 * ("src/kit/index.ts", "projects/<slug>/video/index.tsx").
 *
 * - repo: on `next dev`, the dev-lyrics routes read the folder from disk.
 * - folder (folder-source.ts): a folder the user picks with the File System Access API, as
 *   /revisions does. It also works on the deployed site; nothing is uploaded.
 */
export interface ProjectSource {
  kind: 'repo' | 'folder';
  label: string;
  listProjects(): Promise<ProjectEntry[]>;
  listFiles(slug: string): Promise<CodeFile[]>;
  readTexts(paths: string[]): Promise<Record<string, string | null>>;
  /** Resolves to the file's new modified time. */
  writeText(path: string, text: string): Promise<number>;
  /** A URL for a path relative to projects/, which is what staticFile() receives. */
  assetUrl(publicPath: string): string;
  /** Runs before a project compiles, so assetUrl() can answer for its files. */
  prepare?(slug: string, onProgress?: (message: string) => void): Promise<void>;
  /** Releases what prepare() holds. */
  dispose?(): void;
  /** Images, clips and sounds a project's scenes can load (not analysis/, archive/ …). */
  listMedia?(slug: string): Promise<MediaFile[]>;
  /**
   * Saves a file the user dropped in as projects/<slug>/input/swaps/<name>, never over another, and
   * resolves to its path as staticFile() takes it. assetUrl() answers for it from then on.
   */
  writeSwap?(slug: string, file: File): Promise<string>;
}

/** Where a swapped-in file goes: a new name in projects/<slug>/input/swaps/, dated so it sorts. */
export function swapPathFor(slug: string, fileName: string, now = new Date()): string {
  const dot = fileName.lastIndexOf('.');
  const ext = dot > 0 ? fileName.slice(dot).toLowerCase().replace(/[^.a-z0-9]/g, '') : '';
  const base =
    (dot > 0 ? fileName.slice(0, dot) : fileName)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60) || 'file';
  const stamp = now.toISOString().slice(0, 19).replace(/[-:]/g, '').replace('T', '-');
  return `${slug}/input/swaps/${stamp}-${base}${ext}`;
}

const API = '/api/dev-lyrics';

const encodePath = (p: string) =>
  p
    .replace(/^\/+/, '')
    .split('/')
    .map(encodeURIComponent)
    .join('/');

async function json<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { message?: string } | null;
    throw new Error(body?.message ?? `${res.status} ${res.statusText}`);
  }
  return (await res.json()) as T;
}

export const repoSource: ProjectSource = {
  kind: 'repo',
  label: 'Local repo',
  async listProjects() {
    const res = await fetch(`${API}/projects`, { cache: 'no-store' });
    if (res.status === 404) {
      throw new Error(
        'Local lyric projects load on `next dev` only. On a deployed site this page needs a folder source.',
      );
    }
    return (await json<{ projects: ProjectEntry[] }>(res)).projects;
  },
  async listFiles(slug) {
    const res = await fetch(`${API}/files?slug=${encodeURIComponent(slug)}`, {
      cache: 'no-store',
    });
    return (await json<{ files: CodeFile[] }>(res)).files;
  },
  async readTexts(paths) {
    const res = await fetch(`${API}/read`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paths }),
      cache: 'no-store',
    });
    return (await json<{ files: Record<string, string | null> }>(res)).files;
  },
  async writeText(path, text) {
    const res = await fetch(`${API}/raw/${encodePath(path)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: text,
    });
    return (await json<{ mtime: number }>(res)).mtime;
  },
  assetUrl(publicPath) {
    if (/^(https?:|data:|blob:)/.test(publicPath)) return publicPath;
    return `${window.location.origin}${API}/raw/projects/${encodePath(publicPath)}`;
  },
  async listMedia(slug) {
    const res = await fetch(`${API}/media?slug=${encodeURIComponent(slug)}`, {
      cache: 'no-store',
    });
    return (await json<{ files: MediaFile[] }>(res)).files;
  },
  async writeSwap(slug, file) {
    const path = swapPathFor(slug, file.name);
    const res = await fetch(`${API}/raw/projects/${encodePath(path)}`, {
      method: 'PUT',
      headers: { 'Content-Type': file.type || 'application/octet-stream' },
      body: file,
    });
    await json<{ mtime: number }>(res);
    return path;
  },
};
