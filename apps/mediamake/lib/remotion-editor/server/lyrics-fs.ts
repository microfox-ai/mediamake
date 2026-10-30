import fs from 'node:fs/promises';
import path from 'node:path';

/*
 * File access to apps/lyrics_videos for /remotion-editor, development only (`next dev`). The
 * browser compiles the project itself; these routes only list, read and serve files, and write a
 * project's video/edits.json. Nothing outside the lyrics folder, under node_modules or starting
 * with a dot is reachable.
 */

export const LYRICS_ROOT = path.resolve(
  process.env.LYRICS_VIDEOS_DIR ?? path.join(process.cwd(), '..', 'lyrics_videos'),
);

export const isDevFilesEnabled = () => process.env.NODE_ENV === 'development';

export const notFound = () =>
  Response.json({ message: 'Not found' }, { status: 404 });

/** Absolute path for a path relative to the lyrics folder, or null when it isn't allowed. */
export function resolveLyricsPath(rel: string): string | null {
  if (!rel || rel.includes('\0')) return null;
  const abs = path.resolve(LYRICS_ROOT, rel);
  if (!abs.startsWith(LYRICS_ROOT + path.sep)) return null;
  const parts = path.relative(LYRICS_ROOT, abs).split(path.sep);
  if (parts.some(p => p === 'node_modules' || p.startsWith('.'))) return null;
  return abs;
}

const toRel = (abs: string) =>
  path.relative(LYRICS_ROOT, abs).split(path.sep).join('/');

export const CODE_EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.json'];
const isCode = (name: string) => CODE_EXTENSIONS.includes(path.extname(name));

/** Folders of a project that hold media or notes, never code. */
const SKIP_DIRS = new Set(['input', 'analysis', 'archive', 'handoff', 'tools', 'out']);

export type CodeFile = { path: string; mtime: number };

async function walkCode(dir: string, out: CodeFile[], skip: Set<string>) {
  let entries: import('node:fs').Dirent[];
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }
  await Promise.all(
    entries.map(async e => {
      if (e.name.startsWith('.') || e.name === 'node_modules') return;
      const abs = path.join(dir, e.name);
      if (e.isDirectory()) {
        if (!skip.has(e.name)) await walkCode(abs, out, skip);
      } else if (e.isFile() && isCode(e.name)) {
        const stat = await fs.stat(abs);
        out.push({ path: toRel(abs), mtime: stat.mtimeMs });
      }
    }),
  );
}

/** Code and JSON a project can import: the shared src/ plus the project's own folder. */
export async function listCodeFiles(slug: string): Promise<CodeFile[]> {
  const projectDir = resolveLyricsPath(`projects/${slug}`);
  if (!projectDir) return [];
  const out: CodeFile[] = [];
  await walkCode(path.join(LYRICS_ROOT, 'src'), out, new Set());
  // the waveform catalog (waves, font sets, caption setups): src/mediamake/look.ts imports it
  await walkCode(path.join(LYRICS_ROOT, 'catalog'), out, new Set());
  await walkCode(projectDir, out, SKIP_DIRS);
  return out.sort((a, b) => a.path.localeCompare(b.path));
}

export type ProjectEntry = {
  slug: string;
  title?: string;
  artist?: string;
  hasManifest: boolean;
  hasEdits: boolean;
  /** newest change in video/, ms */
  modified: number;
};

/** Every projects/<slug> with a video/index.tsx, the way Root.tsx finds them ("_" folders skipped). */
export async function listProjects(): Promise<ProjectEntry[]> {
  const dir = path.join(LYRICS_ROOT, 'projects');
  const entries = await fs.readdir(dir, { withFileTypes: true }).catch(() => []);
  const projects = await Promise.all(
    entries
      .filter(e => e.isDirectory() && !e.name.startsWith('_') && !e.name.startsWith('.'))
      .map(async (e): Promise<ProjectEntry | null> => {
        const video = path.join(dir, e.name, 'video');
        const index = await fs.stat(path.join(video, 'index.tsx')).catch(() => null);
        if (!index) return null;
        const manifest = await fs
          .readFile(path.join(dir, e.name, 'manifest.json'), 'utf8')
          .then(t => JSON.parse(t) as { title?: string; artist?: string })
          .catch(() => null);
        const edits = await fs.stat(path.join(video, 'edits.json')).catch(() => null);
        const files: CodeFile[] = [];
        await walkCode(video, files, new Set());
        return {
          slug: e.name,
          title: manifest?.title,
          artist: manifest?.artist,
          hasManifest: !!manifest,
          hasEdits: !!edits,
          modified: Math.max(index.mtimeMs, ...files.map(f => f.mtime)),
        };
      }),
  );
  return projects
    .filter((p): p is ProjectEntry => !!p)
    .sort((a, b) => b.modified - a.modified);
}

const CONTENT_TYPES: Record<string, string> = {
  '.json': 'application/json; charset=utf-8',
  '.ts': 'text/plain; charset=utf-8',
  '.tsx': 'text/plain; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.avif': 'image/avif',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.m4a': 'audio/mp4',
  '.aac': 'audio/aac',
  '.ogg': 'audio/ogg',
  '.flac': 'audio/flac',
  '.mp4': 'video/mp4',
  '.m4v': 'video/mp4',
  '.mov': 'video/quicktime',
  '.webm': 'video/webm',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
};

export const contentTypeFor = (file: string) =>
  CONTENT_TYPES[path.extname(file).toLowerCase()] ?? 'application/octet-stream';

/** Only a project's own edits file may be written. */
export const EDITS_PATH = /^projects\/([^/]+)\/video\/edits\.json$/;
