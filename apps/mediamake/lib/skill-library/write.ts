import { readJsonIn, removeFileIn, writeFileIn } from '@/lib/revisions/fs';
import type { ProductionManifest, SkillManifest } from './types';
import { PRODUCTION_MANIFEST, PRODUCTION_SCHEMA, SKILL_MANIFEST, SKILL_SCHEMA } from './types';

type IterableDirectoryHandle = FileSystemDirectoryHandle & {
  values: () => AsyncIterable<FileSystemDirectoryHandle | FileSystemFileHandle>;
};

const THUMB = /^thumbnail\.(jpe?g|png|webp|gif|avif)$/i;

/** Drops empty strings and lists so the file stays readable; keeps every key the page doesn't know. */
function clean<T extends Record<string, unknown>>(obj: T): T {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null || v === '') continue;
    if (Array.isArray(v) && !v.length) continue;
    if (typeof v === 'object' && !Array.isArray(v)) {
      const inner = clean(v as Record<string, unknown>);
      if (Object.keys(inner).length) out[k] = inner;
      continue;
    }
    out[k] = v;
  }
  return out as T;
}

async function merge<T extends Record<string, unknown>>(dir: FileSystemDirectoryHandle, file: string, schema: string, patch: Partial<T>): Promise<T> {
  let current: Record<string, unknown> = {};
  try {
    const res = await readJsonIn<Record<string, unknown>>(dir, file);
    if (res && res.data && typeof res.data === 'object') current = res.data;
  } catch {
    // unreadable: start over rather than lose the edit
  }
  const next = clean({ ...current, ...patch, schema } as Record<string, unknown>);
  // schema first, like every other mediamake file
  const { schema: s, ...rest } = next;
  const ordered = { schema: s, ...rest } as unknown as T;
  await writeFileIn(dir, file, `${JSON.stringify(ordered, null, 2)}\n`);
  return ordered;
}

export const writeSkillManifest = (dir: FileSystemDirectoryHandle, patch: Partial<SkillManifest>) =>
  merge<SkillManifest>(dir, SKILL_MANIFEST, SKILL_SCHEMA, patch);

export const writeProductionManifest = (dir: FileSystemDirectoryHandle, patch: Partial<ProductionManifest>) =>
  merge<ProductionManifest>(dir, PRODUCTION_MANIFEST, PRODUCTION_SCHEMA, patch);

const EXT: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif', 'image/avif': 'avif' };

/**
 * Writes `thumbnail.<ext>` into a skill or production folder (replacing any other
 * thumbnail.*), and points the manifest at it when the manifest names another file.
 */
export async function writeThumbnail(
  dir: FileSystemDirectoryHandle,
  image: Blob,
  name: string,
  manifest: { file: string; schema: string; thumbnail?: string } | null,
): Promise<string> {
  const ext = EXT[image.type] ?? name.split('.').pop()?.toLowerCase() ?? 'jpg';
  const file = `thumbnail.${ext === 'jpeg' ? 'jpg' : ext}`;
  for await (const entry of (dir as IterableDirectoryHandle).values()) {
    if (entry.kind === 'file' && THUMB.test(entry.name) && entry.name !== file) await removeFileIn(dir, entry.name);
  }
  await writeFileIn(dir, file, image);
  if (manifest?.thumbnail && manifest.thumbnail !== file) await merge(dir, manifest.file, manifest.schema, { thumbnail: file });
  return file;
}
