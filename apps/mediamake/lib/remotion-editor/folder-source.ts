import { getSubdir, readFileIn, writeFileIn } from '@/lib/revisions/fs';
import type { ProjectSource } from './source';
import type { CodeFile, ProjectEntry } from './types';

/*
 * Lyric projects from a folder the user picks (File System Access API, Chromium only), the way
 * /revisions opens folders. Works on the deployed site: files are read in the browser and nothing
 * is uploaded. The only write is a project's video/edits.json.
 */

type IterableDir = FileSystemDirectoryHandle & {
  values: () => AsyncIterable<FileSystemDirectoryHandle | FileSystemFileHandle>;
};

const CODE = /\.(tsx?|jsx?|mjs|cjs|json)$/;
/** Folders of a project that hold media or notes, never code. */
const NOT_CODE = new Set(['input', 'analysis', 'archive', 'handoff', 'tools', 'out']);
/** Folders no scene reads from: left out of the asset map. */
const NOT_ASSETS = new Set(['analysis', 'archive', 'handoff', 'tools', 'out']);
const EDITS_PATH = /^projects\/[^/]+\/video\/edits\.json$/;

const isHidden = (name: string) => name.startsWith('.') || name === 'node_modules';

async function dirAt(
  root: FileSystemDirectoryHandle,
  parts: string[],
): Promise<FileSystemDirectoryHandle | null> {
  let dir: FileSystemDirectoryHandle | null = root;
  for (const part of parts) {
    if (!dir) return null;
    dir = await getSubdir(dir, part, false);
  }
  return dir;
}

const splitPath = (path: string) => {
  const parts = path.split('/');
  return { dirs: parts.slice(0, -1), name: parts[parts.length - 1] };
};

async function fileAt(root: FileSystemDirectoryHandle, path: string): Promise<File | null> {
  const { dirs, name } = splitPath(path);
  const dir = await dirAt(root, dirs);
  return dir ? readFileIn(dir, name) : null;
}

/** Visits every file under `dir` (paths relative to it), skipping folders named in `skip`. */
async function walk(
  dir: FileSystemDirectoryHandle,
  skip: Set<string>,
  visit: (path: string, handle: FileSystemFileHandle) => Promise<void>,
  prefix = '',
): Promise<void> {
  const tasks: Promise<void>[] = [];
  for await (const entry of (dir as IterableDir).values()) {
    if (isHidden(entry.name)) continue;
    const path = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.kind === 'directory') {
      if (!skip.has(entry.name)) tasks.push(walk(entry, skip, visit, path));
    } else {
      tasks.push(visit(path, entry));
    }
  }
  await Promise.all(tasks);
}

type PickerWindow = Window & {
  showDirectoryPicker?: (options?: {
    id?: string;
    mode?: 'read' | 'readwrite';
  }) => Promise<FileSystemDirectoryHandle>;
};

/** Throws AbortError if the user closes the picker. Chrome reopens the last folder picked with this id. */
export const pickDirectory = () =>
  (window as PickerWindow).showDirectoryPicker!({
    id: 'mediamake-remotion-editor',
    mode: 'readwrite',
  });

/**
 * The lyrics_videos folder inside what the user picked: the folder itself, its lyrics_videos
 * child, or apps/lyrics_videos when they picked the repo. Null when none of those has
 * projects/ and src/kit/.
 */
export async function findLyricsRoot(
  picked: FileSystemDirectoryHandle,
): Promise<FileSystemDirectoryHandle | null> {
  for (const parts of [[], ['lyrics_videos'], ['apps', 'lyrics_videos']]) {
    const dir = await dirAt(picked, parts);
    if (dir && (await dirAt(dir, ['projects'])) && (await fileAt(dir, 'src/kit/index.ts'))) {
      return dir;
    }
  }
  return null;
}

export class FolderSource implements ProjectSource {
  readonly kind = 'folder' as const;
  readonly label: string;
  /** projects/-relative path → blob URL, for the open project */
  private assets = new Map<string, string>();
  private warned = new Set<string>();

  constructor(
    readonly root: FileSystemDirectoryHandle,
    /** what the user picked (root may be inside it) */
    readonly picked: FileSystemDirectoryHandle,
  ) {
    this.label = picked === root ? root.name : `${picked.name} › ${root.name}`;
  }

  async listProjects(): Promise<ProjectEntry[]> {
    const projects = await dirAt(this.root, ['projects']);
    if (!projects) return [];
    const out: ProjectEntry[] = [];
    for await (const entry of (projects as IterableDir).values()) {
      if (entry.kind !== 'directory' || entry.name.startsWith('_') || isHidden(entry.name)) continue;
      const video = await getSubdir(entry, 'video', false);
      const index = video ? await readFileIn(video, 'index.tsx') : null;
      if (!video || !index) continue;
      const manifest = await readFileIn(entry, 'manifest.json')
        .then(async f =>
          f ? (JSON.parse(await f.text()) as { title?: string; artist?: string }) : null,
        )
        .catch(() => null);
      let modified = index.lastModified;
      let hasEdits = false;
      await walk(video, new Set(), async (path, handle) => {
        if (!CODE.test(path)) return;
        modified = Math.max(modified, (await handle.getFile()).lastModified);
        if (path === 'edits.json') hasEdits = true;
      });
      out.push({
        slug: entry.name,
        title: manifest?.title,
        artist: manifest?.artist,
        hasManifest: !!manifest,
        hasEdits,
        modified,
      });
    }
    return out.sort((a, b) => b.modified - a.modified);
  }

  async listFiles(slug: string): Promise<CodeFile[]> {
    const out: CodeFile[] = [];
    const collect = (prefix: string) => async (path: string, handle: FileSystemFileHandle) => {
      if (CODE.test(path)) {
        out.push({ path: `${prefix}/${path}`, mtime: (await handle.getFile()).lastModified });
      }
    };
    const src = await dirAt(this.root, ['src']);
    if (src) await walk(src, new Set(), collect('src'));
    // the waveform catalog (waves, font sets, caption setups): src/mediamake/look.ts imports it
    const catalog = await dirAt(this.root, ['catalog']);
    if (catalog) await walk(catalog, new Set(), collect('catalog'));
    const project = await dirAt(this.root, ['projects', slug]);
    if (project) await walk(project, NOT_CODE, collect(`projects/${slug}`));
    return out.sort((a, b) => a.path.localeCompare(b.path));
  }

  async readTexts(paths: string[]): Promise<Record<string, string | null>> {
    const out: Record<string, string | null> = {};
    await Promise.all(
      paths.map(async path => {
        out[path] = CODE.test(path)
          ? await fileAt(this.root, path)
              .then(f => f?.text() ?? null)
              .catch(() => null)
          : null;
      }),
    );
    return out;
  }

  async writeText(path: string, text: string): Promise<number> {
    if (!EDITS_PATH.test(path)) throw new Error('Only video/edits.json can be written');
    const { dirs, name } = splitPath(path);
    const dir = await dirAt(this.root, dirs);
    if (!dir) throw new Error(`${dirs.join('/')} is missing`);
    return writeFileIn(dir, name, text);
  }

  assetUrl(publicPath: string): string {
    if (/^(https?:|data:|blob:)/.test(publicPath)) return publicPath;
    const key = publicPath.replace(/^\/+/, '');
    const url = this.assets.get(key);
    if (url) return url;
    if (!this.warned.has(key)) {
      this.warned.add(key);
      console.warn(`[remotion-editor] ${key} is not in the opened project's folder`);
    }
    // a request that fails with the missing path in it, as a missing static file would
    return `${window.location.origin}/__missing__/${key.split('/').map(encodeURIComponent).join('/')}`;
  }

  /**
   * staticFile() has to answer synchronously, so every file of the project gets a blob URL up
   * front. Files on disk stay on disk: a blob URL of a picked file reads it only when used.
   * The previous map is released a little later, after the Player has moved to the new one.
   */
  async prepare(slug: string, onProgress?: (message: string) => void): Promise<void> {
    const next = new Map<string, string>();
    const project = await dirAt(this.root, ['projects', slug]);
    if (project) {
      await walk(project, NOT_ASSETS, async (path, handle) => {
        next.set(`${slug}/${path}`, URL.createObjectURL(await handle.getFile()));
        if (next.size % 100 === 0) onProgress?.(`Reading files… ${next.size}`);
      });
    }
    const previous = this.assets;
    this.assets = next;
    this.warned.clear();
    setTimeout(() => previous.forEach(url => URL.revokeObjectURL(url)), 10_000);
  }

  dispose(): void {
    this.assets.forEach(url => URL.revokeObjectURL(url));
    this.assets.clear();
  }
}
