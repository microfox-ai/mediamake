import type { CodeFile, ProjectEntry } from './types';

/**
 * Where a lyric project's files come from. Paths are relative to the apps/lyrics_videos folder
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
};
