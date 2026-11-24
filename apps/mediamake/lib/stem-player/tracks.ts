import { AUDIO_FORMATS, REMASTER_SCHEMA, type RemasterIndex, type RemasterVersionInfo } from './types';

/*
 * A folder's file names turned into the tracks the sidebar lists: one track for each stem (the
 * best format it comes in), a short label (the part of the name that differs from the others) and
 * a key. No file access here: the folder is read in folders.ts.
 */

export interface TrackFile {
  /** The file name without its extension: how the revision files refer to it. */
  id: string;
  /** The file that plays. */
  file: string;
  /** Its format (wav, mp3…). */
  format: string;
  /** The other formats the same stem comes in, not played. */
  also: string[];
  /** The part of the name that differs from the others ("Vocals", "C lift + vocal forward"). */
  label: string;
  /** Key on the keyboard that selects it (1–9 by position, or a version's letter); '' past the ninth. */
  key: string;
  info?: RemasterVersionInfo;
}

/** Keys the screen uses itself (loop, match, note), so a version named L, M or N is selected with its number. */
const RESERVED = new Set(['L', 'M', 'N']);

const byName = (a: string, b: string) => a.localeCompare(b, undefined, { numeric: true });

export function splitName(name: string): { stem: string; format: string } {
  const dot = name.lastIndexOf('.');
  return dot > 0 ? { stem: name.slice(0, dot), format: name.slice(dot + 1).toLowerCase() } : { stem: name, format: '' };
}

export const isAudio = (name: string) => !name.startsWith('.') && AUDIO_FORMATS.includes(splitName(name).format);

/** Folders the tree never shows: hidden ones, review files, the media library and dependencies. */
export const skipFolder = (name: string) =>
  name.startsWith('.') || name === 'node_modules' || name.endsWith('.revisions') || name === '_LIBRARY' || name === '_INBOX' || name === 'Library';

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

/** What each ID adds to the others: the common start dropped, and brackets around all of them ("(Vocals)") too. */
export function labelsOf(ids: string[]): string[] {
  const prefix = commonPrefix(ids);
  const rest = ids.map(id => id.slice(prefix.length).replace(/^[\s\-_]+/, '') || id);
  const wrapped = /^[([]([^()[\]]+)[)\]]$/;
  return ids.length > 1 && rest.every(r => wrapped.test(r)) ? rest.map(r => wrapped.exec(r)![1]) : rest;
}

/** A letter the label starts with ("A lift" → A, "D lift + …" → D), when the screen doesn't use it. */
const letterOf = (label: string): string | null => {
  const m = /^([A-Z])(?:[\s\-_.):]|$)/.exec(label);
  return m && !RESERVED.has(m[1]) ? m[1] : null;
};

/**
 * The tracks of a folder, from its file names. `order` is an index.json's own order of files or
 * IDs (the rest follow by name); `remaster` adds what the remaster scripts know about each.
 */
export function tracksOf(fileNames: string[], opts: { remaster?: RemasterIndex | null; order?: string[] } = {}): TrackFile[] {
  const infos = new Map((opts.remaster?.versions ?? []).map(v => [v.file, v] as const));
  const stems = new Map<string, string[]>();
  for (const name of fileNames.filter(isAudio).sort(byName)) {
    const { stem } = splitName(name);
    stems.set(stem, [...(stems.get(stem) ?? []), name]);
  }
  const rank = (name: string) => AUDIO_FORMATS.indexOf(splitName(name).format);
  const picked = [...stems].map(([id, files]) => {
    // the file the remaster scripts named wins; else the best format
    const file = files.find(f => infos.has(f)) ?? [...files].sort((a, b) => rank(a) - rank(b))[0];
    return { id, file, also: files.filter(f => f !== file).map(f => splitName(f).format) };
  });
  const place = (t: { id: string; file: string }) => {
    const i = (opts.order ?? []).findIndex(o => o === t.id || o === t.file);
    return i < 0 ? Number.MAX_SAFE_INTEGER : i;
  };
  picked.sort((a, b) => place(a) - place(b) || byName(a.id, b.id));
  const labels = labelsOf(picked.map(p => p.id));
  const taken = new Set<string>();
  return picked.map((p, i) => {
    const info = infos.get(p.file);
    const label = info?.label ?? labels[i];
    const wanted = info?.key ?? letterOf(label);
    const key = wanted && !RESERVED.has(wanted) && !taken.has(wanted) ? wanted : i < 9 && !taken.has(String(i + 1)) ? String(i + 1) : '';
    if (key) taken.add(key);
    return { ...p, format: splitName(p.file).format, label, key, ...(info ? { info } : {}) };
  });
}

/**
 * Whether a folder holds the versions of one song (so it gets Match levels, the final pick and
 * notes): it has a remaster.json or an index.json, or it is a remaster ladder's v<N> folder.
 */
export function isVersionsFolder(name: string, parentName: string | undefined, fileNames: string[]): boolean {
  return fileNames.includes('remaster.json') || fileNames.includes('index.json') || (/^v\d+$/i.test(name) && parentName === 'remaster');
}

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

/** The folders a review link names, from its path: no "..", no backslashes. */
export function pathParts(path: string): string[] | null {
  const parts = path.split('/').filter(p => p && p !== '.');
  return parts.some(p => p === '..' || p.includes('\\')) ? null : parts;
}

/**
 * The ways a link's path can sit under a root named `rootName`: the whole path, the rest of it
 * after the root's own name (a root inside the link's path), then its tails, longest first.
 */
export function linkTries(linkPath: string, rootName: string): string[][] {
  const parts = pathParts(linkPath);
  if (!parts?.length) return [];
  const tries: string[][] = [parts];
  parts.forEach((part, i) => {
    if (part === rootName) tries.push(parts.slice(i + 1));
  });
  for (let i = 1; i < parts.length; i++) tries.push(parts.slice(i));
  const seen = new Set<string>();
  return tries.filter(t => {
    const key = t.join('/');
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
