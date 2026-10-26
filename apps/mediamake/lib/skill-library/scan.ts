import { readFileIn, readJsonIn } from '@/lib/revisions/fs';
import { normalizeIndex } from '@/lib/image-revisions/sets';
import { parseSkillMd } from './frontmatter';
import type { ProductionManifest, ScannedProduction, ScannedSet, ScannedSkill, SkillLocation, SkillManifest, SourceScan } from './types';
import { PRODUCTION_MANIFEST, PRODUCTION_SCHEMA, SKILL_MANIFEST } from './types';

type IterableDirectoryHandle = FileSystemDirectoryHandle & {
  values: () => AsyncIterable<FileSystemDirectoryHandle | FileSystemFileHandle>;
};

const IMAGE = /\.(jpe?g|png|webp|gif|avif)$/i;
const THUMB = /^thumbnail\.(jpe?g|png|webp|gif|avif)$/i;
const COVER = /^(thumbnail|cover|poster)\.(jpe?g|png|webp|gif|avif)$/i;

/**
 * Folders never worth walking into: dependencies, builds, and the code folders
 * of an app (skills and productions don't live there). Hidden folders are skipped
 * too, except `.claude` and `.agents`, where Claude Code keeps skills.
 */
const SKIP = new Set([
  'node_modules', 'dist', 'build', 'coverage', 'out-tsc', 'packages', 'patches', 'tools',
  'components', 'lib', 'hooks', 'app', 'src', 'public', 'styles', 'types', 'docs',
  'worktrees', 'plugins', 'cache', 'footage', 'derived', 'analysis', 'archive', 'clips', 'stills',
]);
const enterable = (name: string) =>
  (!name.startsWith('.') || name === '.claude' || name === '.agents') && !SKIP.has(name) && !name.endsWith('.revisions');

function locationOf(path: string): SkillLocation {
  if (/(^|\/)\.agents\/skills\/[^/]+$/.test(path)) return 'committed';
  if (/(^|\/)\.claude\/skills\/[^/]+$/.test(path)) return 'local';
  return 'folder';
}

async function readJson<T>(dir: FileSystemDirectoryHandle, name: string): Promise<T | null> {
  try {
    const res = await readJsonIn<T>(dir, name);
    return res && typeof res.data === 'object' && res.data ? res.data : null;
  } catch {
    return null; // unreadable or half-written: treat as absent
  }
}

async function subdir(dir: FileSystemDirectoryHandle, name: string): Promise<FileSystemDirectoryHandle | null> {
  try {
    return await dir.getDirectoryHandle(name);
  } catch {
    return null;
  }
}

async function list(dir: FileSystemDirectoryHandle) {
  const files: string[] = [];
  const dirs: FileSystemDirectoryHandle[] = [];
  for await (const entry of (dir as IterableDirectoryHandle).values()) {
    if (entry.kind === 'file') files.push(entry.name);
    else dirs.push(entry as FileSystemDirectoryHandle);
  }
  return { files, dirs };
}

async function readSkill(dir: FileSystemDirectoryHandle, path: string, files: string[], sourceId: string): Promise<ScannedSkill | null> {
  const file = await readFileIn(dir, 'SKILL.md').catch(() => null);
  if (!file) return null;
  const { frontmatter, body } = parseSkillMd(await file.text());
  return {
    folder: dir.name,
    sourceId,
    path,
    dir,
    location: locationOf(path),
    frontmatter,
    body,
    manifest: await readJson<SkillManifest>(dir, SKILL_MANIFEST),
    thumbFile: files.find(f => THUMB.test(f)) ?? null,
    files,
    lastModified: file.lastModified,
  };
}

async function readProduction(dir: FileSystemDirectoryHandle, path: string, files: string[], sourceId: string): Promise<ScannedProduction | null> {
  const manifest = files.includes(PRODUCTION_MANIFEST) ? await readJson<ProductionManifest>(dir, PRODUCTION_MANIFEST) : null;
  const isManifest = manifest && (!manifest.schema || manifest.schema === PRODUCTION_SCHEMA);
  const input = await subdir(dir, 'input');
  const info = input ? await readJson<{ title?: string; artist?: string }>(input, 'project.json') : null;
  if (!isManifest && !info) return null;
  let thumbFile = files.find(f => COVER.test(f)) ?? null;
  if (!thumbFile && input) {
    const { files: inFiles } = await list(input);
    const cover = inFiles.find(f => COVER.test(f));
    if (cover) thumbFile = `input/${cover}`;
  }
  let lastModified = 0;
  if (input) lastModified = (await readFileIn(input, 'project.json').catch(() => null))?.lastModified ?? 0;
  return {
    slug: (isManifest && typeof manifest!.slug === 'string' && manifest!.slug) || dir.name,
    sourceId,
    path,
    dir,
    manifest: isManifest ? manifest : null,
    info: info ? { title: typeof info.title === 'string' ? info.title : undefined, artist: typeof info.artist === 'string' ? info.artist : undefined } : null,
    thumbFile,
    lastModified,
  };
}

async function readSet(dir: FileSystemDirectoryHandle, path: string, sourceId: string): Promise<ScannedSet | null> {
  const raw = await readJson<Record<string, unknown>>(dir, 'index.json');
  const index = raw && normalizeIndex(raw, dir.name);
  if (!index) return null;
  const items = index.styles.flatMap(g => g.variants).filter(v => IMAGE.test(v.file));
  if (!items.length) return null;
  const picked = new Set(index.picked ?? []);
  const images = [...items.filter(v => picked.has(v.id)), ...items.filter(v => !picked.has(v.id))].map(v => v.file);
  return { job: index.job, sourceId, path, dir, title: index.title, kind: index.kind, workflow: index.workflow, source: index.source, images };
}

/**
 * Every skill (a folder with SKILL.md), production (mediamake.json or
 * input/project.json) and image set (index.json) under `root`. Works on a repo
 * root (finds .claude/skills, .agents/skills, apps/x/productions and apps/x/out),
 * ~/.claude/skills, a productions folder, or one skill. Stops at a budget of
 * folders so a huge pick can't hang the page.
 */
export async function scanSource(root: FileSystemDirectoryHandle, sourceId: string, { maxDepth = 5, budget = 4000 } = {}): Promise<SourceScan> {
  const out: SourceScan = { skills: [], productions: [], sets: [], visited: 0, truncated: false };
  const walk = async (dir: FileSystemDirectoryHandle, path: string, depth: number) => {
    if (out.visited >= budget) {
      out.truncated = true;
      return;
    }
    out.visited++;
    let entries: Awaited<ReturnType<typeof list>>;
    try {
      entries = await list(dir);
    } catch {
      return; // vanished or not readable
    }
    const { files, dirs } = entries;
    if (files.includes('SKILL.md')) {
      const skill = await readSkill(dir, path, files, sourceId);
      if (skill) out.skills.push(skill);
      return;
    }
    if (files.includes(PRODUCTION_MANIFEST) || dirs.some(d => d.name === 'input')) {
      const production = await readProduction(dir, path, files, sourceId);
      if (production) {
        out.productions.push(production);
        return;
      }
    }
    if (files.includes('index.json')) {
      const set = await readSet(dir, path, sourceId);
      if (set) {
        out.sets.push(set);
        return;
      }
    }
    if (depth >= maxDepth) return;
    dirs.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
    for (const sub of dirs) if (enterable(sub.name)) await walk(sub, path ? `${path}/${sub.name}` : sub.name, depth + 1);
  };
  await walk(root, '', 0);
  return out;
}

/** Resolves a relative path ("media/thumb.jpg") inside a folder. */
export async function fileAt(dir: FileSystemDirectoryHandle, rel: string): Promise<File | null> {
  const parts = rel.split('/').filter(p => p && p !== '.');
  const name = parts.pop();
  if (!name || parts.includes('..')) return null;
  try {
    let at = dir;
    for (const p of parts) at = await at.getDirectoryHandle(p);
    return await (await at.getFileHandle(name)).getFile();
  } catch {
    return null;
  }
}
