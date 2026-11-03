import { listFileNames, readJsonIn } from '@/lib/revisions/fs';
import { fileKind, readIndex } from '@/lib/file-revisions/sets';
import type { ImageSetIndex } from '@/lib/file-revisions/types';
import { REMASTER_SCHEMA, type RemasterIndex, type RemasterVersionInfo } from './types';

/*
 * Reading a ladder folder: its audio files (every WAV, MP3, FLAC… in it, in name order, or the
 * order of an index.json when the folder has one), the remaster.json sidecar, and a short label
 * and a key for each version. Also finding ladders under a source folder (~/Downloads, a channel
 * folder) and resolving a review link's path.
 */

type IterableDirectoryHandle = FileSystemDirectoryHandle & {
  values: () => AsyncIterable<FileSystemDirectoryHandle | FileSystemFileHandle>;
};

export interface LadderVersion {
  /** The file name without its extension: how the revision files refer to it. */
  id: string;
  file: string;
  /** Key on the keyboard that switches to it (1–9 by position, or the version's letter). */
  key: string;
  /** The part of the name that differs from the others ("C lift + vocal forward"). */
  label: string;
  info?: RemasterVersionInfo;
}

export interface Ladder {
  /** The folder's name (v1). */
  name: string;
  title: string;
  /** The set as the revision files describe it (audio variants only). */
  index: ImageSetIndex;
  remaster: RemasterIndex | null;
  versions: LadderVersion[];
}

/** Keys the screen uses itself (loop, match, note), so a version named L, M or N is switched to with its number. */
const RESERVED = new Set(['L', 'M', 'N']);

/** The common start of every ID, cut back to a separator ("fullmetal-gregorian - "). */
export function commonPrefix(ids: string[]): string {
  if (ids.length < 2) return '';
  let prefix = ids[0];
  for (const id of ids.slice(1)) {
    let i = 0;
    while (i < prefix.length && i < id.length && prefix[i] === id[i]) i++;
    prefix = prefix.slice(0, i);
  }
  const cut = Math.max(prefix.lastIndexOf(' - ') + 3, prefix.lastIndexOf(' ') + 1, prefix.lastIndexOf('_') + 1);
  return prefix.slice(0, cut);
}

/** A letter the label starts with ("A lift" → A, "D lift + …" → D), when the screen doesn't use it. */
const letterOf = (label: string): string | null => {
  const m = /^([A-Z])(?:[\s\-_.):]|$)/.exec(label);
  return m && !RESERVED.has(m[1]) ? m[1] : null;
};

export function normalizeRemaster(raw: unknown): RemasterIndex | null {
  const r = (raw ?? {}) as Partial<RemasterIndex>;
  if (!Array.isArray(r.versions)) return null;
  const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : undefined);
  const str = (v: unknown) => (typeof v === 'string' && v.trim() ? v : undefined);
  return {
    schema: REMASTER_SCHEMA,
    title: str(r.title),
    song: str(r.song),
    path: str(r.path),
    songPath: str(r.songPath),
    workflow: str(r.workflow),
    note: str(r.note),
    versions: (r.versions as Partial<RemasterVersionInfo>[])
      .filter(v => typeof v?.file === 'string')
      .map(v => ({
        file: v.file as string,
        key: str(v.key)?.slice(0, 1).toUpperCase(),
        label: str(v.label),
        note: str(v.note),
        lufs: num(v.lufs),
        truePeak: num(v.truePeak),
        lra: num(v.lra),
        plr: num(v.plr),
      })),
  };
}

/** The ladder in a folder, or null when it holds no audio. */
export async function readLadder(dir: FileSystemDirectoryHandle): Promise<Ladder | null> {
  const base = await readIndex(dir, { fromFiles: true });
  if (!base) return null;
  const remaster = await readJsonIn(dir, 'remaster.json')
    .then(res => (res ? normalizeRemaster(res.data) : null))
    .catch(() => null);
  const variants = base.styles.flatMap(s => s.variants).filter(v => fileKind(v.file) === 'audio' && !v.media);
  if (!variants.length) return null;
  const infos = new Map((remaster?.versions ?? []).map(v => [v.file, v] as const));
  const prefix = commonPrefix(variants.map(v => v.id));
  const taken = new Set<string>();
  const versions: LadderVersion[] = variants.map((v, i) => {
    const info = infos.get(v.file);
    const rest = v.id.slice(prefix.length).replace(/^[\s\-_]+/, '');
    const label = info?.label ?? (rest || v.id);
    const wanted = info?.key ?? letterOf(label);
    const key = wanted && !RESERVED.has(wanted) && !taken.has(wanted) ? wanted : i < 9 ? String(i + 1) : '';
    taken.add(key);
    return { id: v.id, file: v.file, key, label, info };
  });
  const title = remaster?.title ?? (base.title !== dir.name ? base.title : undefined) ?? prefix.replace(/[\s\-_]+$/, '') ?? dir.name;
  const index: ImageSetIndex = {
    ...base,
    kind: 'remaster',
    title: title || dir.name,
    workflow: base.workflow ?? remaster?.workflow ?? 'make-loudness-remaster',
    path: base.path ?? remaster?.path,
    // the folder is "v1": the markdown names the full path so Claude finds the right song
    location: base.location ?? remaster?.path,
    pick: base.pick ?? { max: 1, label: 'Final' },
    styles: [{ id: 'ladder', name: 'Versions', variants: versions.map(v => ({ id: v.id, file: v.file, note: v.info?.note ?? v.info?.label })) }],
  };
  return { name: dir.name, title: index.title!, index, remaster, versions };
}

export interface LadderEntry {
  /** Path inside the source, e.g. "AMZ/fma-edwardeleric/remaster/v1". */
  path: string;
  /** The folder's name (v1). */
  name: string;
  /** The song folder's name, when the ladder sits in <song>/remaster/. */
  song?: string;
  title?: string;
  handle: FileSystemDirectoryHandle;
}

const SKIP = (name: string) =>
  name.startsWith('.') || name === 'node_modules' || name.endsWith('.revisions') || name === '_LIBRARY' || name === '_INBOX' || name === 'Library';
const VERSION_DIR = /^v\d+$/i;

async function hasAudio(dir: FileSystemDirectoryHandle): Promise<boolean> {
  return (await listFileNames(dir)).some(n => fileKind(n) === 'audio');
}

/**
 * Every ladder under `root`, a few levels down: the v<N> folders inside a `remaster` folder
 * (Downloads → AMZ → song → remaster → v1), and any folder with a remaster.json.
 */
export async function scanLadders(root: FileSystemDirectoryHandle, maxDepth = 4): Promise<LadderEntry[]> {
  const found: LadderEntry[] = [];
  const walk = async (dir: FileSystemDirectoryHandle, path: string, depth: number, song?: string) => {
    if (dir.name === 'remaster') {
      for await (const entry of (dir as IterableDirectoryHandle).values()) {
        if (entry.kind !== 'directory' || !VERSION_DIR.test(entry.name)) continue;
        const sub = entry as FileSystemDirectoryHandle;
        if (await hasAudio(sub)) found.push({ path: `${path}/${entry.name}`, name: entry.name, song, handle: sub });
      }
      return;
    }
    const names = await listFileNames(dir).catch(() => [] as string[]);
    if (names.includes('remaster.json') && names.some(n => fileKind(n) === 'audio')) {
      found.push({ path, name: dir.name, song, handle: dir });
      return;
    }
    if (depth >= maxDepth) return;
    for await (const entry of (dir as IterableDirectoryHandle).values()) {
      if (entry.kind !== 'directory' || SKIP(entry.name)) continue;
      await walk(entry as FileSystemDirectoryHandle, path ? `${path}/${entry.name}` : entry.name, depth + 1, entry.name === 'remaster' ? dir.name : undefined);
    }
  };
  await walk(root, '', 0);
  return found.sort((a, b) => a.path.localeCompare(b.path, undefined, { numeric: true }));
}

const pathParts = (path: string): string[] | null => {
  const parts = path.split('/').filter(p => p && p !== '.');
  return parts.some(p => p === '..' || p.includes('\\')) ? null : parts;
};

/**
 * The folder a review link names (`?job=AMZ/fma-edwardeleric/remaster/v1`), walked under a
 * source: the whole path, or the rest of it after the source's own name (a source inside the
 * link's path), or just its tail folders.
 */
export async function findLadder(root: FileSystemDirectoryHandle, linkPath: string): Promise<{ path: string; handle: FileSystemDirectoryHandle } | null> {
  const parts = pathParts(linkPath);
  if (!parts?.length) return null;
  const tries: string[][] = [parts];
  parts.forEach((part, i) => {
    if (part === root.name) tries.push(parts.slice(i + 1));
  });
  for (let i = 1; i < parts.length; i++) tries.push(parts.slice(i));
  const seen = new Set<string>();
  for (const attempt of tries) {
    const path = attempt.join('/');
    if (!attempt.length || seen.has(path)) continue;
    seen.add(path);
    try {
      let dir = root;
      for (const part of attempt) dir = await dir.getDirectoryHandle(part);
      if (await hasAudio(dir)) return { path, handle: dir };
    } catch {
      // not under this source this way
    }
  }
  return null;
}

/** A ladder's path in a source, or the folder's name: the deep-link name of what is open. */
export const ladderJobName = (path: string | undefined, name: string) => path || name;
