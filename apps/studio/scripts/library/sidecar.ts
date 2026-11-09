/**
 * .media.json: what the library knows about the files in one folder (mediamake.library/v1), kept
 * beside them. The folder explains itself, travels with its files to another disk, and the catalog
 * is rebuilt from these files when it's lost (media scan --rebuild).
 *
 * Tools write <file>.source.json next to each download in the inbox (mediamake.source/v1), and a
 * Pinterest bulk session writes _session.json (mediamake.pinterest-session/v1) for its whole folder.
 * A song's lyrics are kept as <file>.lyrics.txt beside it (and in its entry).
 */
import fs from 'node:fs';
import path from 'node:path';
import type { Source } from './classify.ts';
import type { Kind } from './db.ts';
import { readJson, writeJson } from './sys.ts';

export const SIDECAR = '.media.json';
export const SCHEMA = 'mediamake.library/v1';

export type Note = { at: string; text: string; production?: string };
export type Entry = {
  sha256: string;
  kind: Kind;
  subject?: string | null;
  title?: string | null;
  tags?: string[];
  sources?: Source[];
  rating?: string | null;
  rights?: string | null;
  notes?: Note[];
  /** the name it had before the library named it */
  original?: string;
  /** a song's words; <file>.lyrics.txt beside it has the same */
  lyrics?: string;
  addedAt: string;
  confidence?: number;
};
export type FolderMeta = { schema: string; items: Record<string, Entry> };

export const readFolder = (dir: string): FolderMeta => readJson<FolderMeta>(path.join(dir, SIDECAR)) ?? { schema: SCHEMA, items: {} };

export const putEntry = (dir: string, name: string, entry: Partial<Entry>) => {
  const meta = readFolder(dir);
  meta.items[name] = { ...meta.items[name], ...entry } as Entry;
  writeJson(path.join(dir, SIDECAR), { schema: SCHEMA, items: meta.items });
};

export const dropEntry = (dir: string, name: string) => {
  const meta = readFolder(dir);
  if (!(name in meta.items)) return undefined;
  const entry = meta.items[name];
  delete meta.items[name];
  const file = path.join(dir, SIDECAR);
  if (Object.keys(meta.items).length) writeJson(file, meta);
  else fs.rmSync(file, { force: true });
  return entry;
};

export const sourceOf = (file: string) => readJson<Source>(`${file}.source.json`);

/** <file>.lyrics.txt: a song's words, beside it in the inbox (from the tool) and in the library. */
export const lyricsFile = (file: string) => `${file}.lyrics.txt`;
export const readLyrics = (file: string) => {
  try {
    return fs.readFileSync(lyricsFile(file), 'utf8').trim() || undefined;
  } catch {
    return undefined;
  }
};

type PinSession = { pins?: { id: string; file: string; url?: string; pageUrl?: string; query?: string; at?: string }[] };
/** Pinterest bulk folders: file name → where the pin came from. */
export const pinterestSession = (dir: string) => {
  const s = readJson<PinSession>(path.join(dir, '_session.json'));
  const map = new Map<string, Source>();
  for (const p of s?.pins ?? [])
    map.set(path.basename(p.file), { schema: 'mediamake.source/v1', tool: 'pinterest', ref: p.id, url: p.url, pageUrl: p.pageUrl, query: p.query, downloadedAt: p.at });
  return map;
};
