/**
 * A production's or a release's files as a folder view (components/projects/bundle-browser.tsx):
 * what is in one folder, folders first, each with the space it uses all the way down. Pure.
 */
export interface SizedFile {
  /** Relative to the bundle, with forward slashes. */
  path: string;
  size: number;
}

export interface SizedEntry<T extends SizedFile = SizedFile> {
  name: string;
  folder: boolean;
  /** A file's size, or everything under a folder. */
  bytes: number;
  /** A folder's file count, all the way down. 1 for a file. */
  files: number;
  /** The file itself, when it is one. */
  file?: T;
}

/** The files under a folder ('' is the top). */
export const filesUnder = <T extends SizedFile>(files: T[], dir: string): T[] => (dir ? files.filter(file => file.path.startsWith(`${dir}/`)) : files);

/** What is in one folder: folders first, then files, the largest first within each. */
export function sizedEntriesOf<T extends SizedFile>(files: T[], dir: string): SizedEntry<T>[] {
  const prefix = dir ? `${dir}/` : '';
  const byName = new Map<string, SizedEntry<T>>();
  for (const file of files) {
    if (!file.path.startsWith(prefix)) continue;
    const [name, ...rest] = file.path.slice(prefix.length).split('/');
    if (!name) continue;
    const entry = byName.get(name) ?? { name, folder: false, bytes: 0, files: 0 };
    entry.bytes += file.size;
    entry.files++;
    if (rest.length) entry.folder = true;
    else entry.file = file;
    byName.set(name, entry);
  }
  return [...byName.values()].sort((a, b) => Number(b.folder) - Number(a.folder) || b.bytes - a.bytes || a.name.localeCompare(b.name, 'en', { sensitivity: 'base' }));
}

/** A share of a whole as a bar's width, never invisible for something that takes space. */
export const shareOf = (bytes: number, whole: number): number => (whole > 0 && bytes > 0 ? Math.max(2, Math.round((bytes / whole) * 100)) : 0);
