/*
 * What the Library page (/library) reads and writes. See components/library/README.md.
 *
 * - The skill registry: skills.json at the repo root (mediamake.skills/v1), written by
 *   `node tools/skills.mjs index`. The page gets it at build time, like /skills.
 * - The media library's export: <root>/.catalog/export/ (mediamake.library-export/v1), written by
 *   the media CLI, plus the thumbnails in <root>/.catalog/thumbs/. Paths to thumbnails are
 *   relative to .catalog/.
 * - Edits: request files in <root>/.catalog/requests/ (mediamake.library-request/v1), which the
 *   media CLI applies. The page writes nothing else.
 */

import type { ItemUse } from '../catalog/types';

export const REGISTRY_SCHEMA = 'mediamake.skills/v1';
export const EXPORT_SCHEMA = 'mediamake.library-export/v1';
export const REQUEST_SCHEMA = 'mediamake.library-request/v1';

/* ---------- skills.json (the registry) ---------- */

export interface SkillCategory {
  id: string;
  prefix?: string;
  suffix?: string;
  about: string;
}

export interface RegistrySkill {
  name: string;
  title: string;
  /** The description's first sentence. */
  summary: string;
  description: string;
  category: string;
  /** committed: in .agents/skills; local: a folder in .claude/skills not moved yet. */
  location: 'committed' | 'local';
  /** Repo path of the skill's folder. */
  path: string;
  variantOf?: string;
  /** What a variant is modelled on: a production slug, a style or a version (v2). */
  variantRef?: string;
  /** `<base>@<commit>`, written by `skills.mjs fork`. */
  forkedFrom?: string;
  dependsOn?: string[];
  /**
   * The MCPs it works with, from the `## First: check the MCPs` table in its SKILL.md: the
   * catalog offers them when the skill is installed, with what each is for and what it costs to skip.
   */
  mcps?: ItemUse[];
  /** `owner/repo` a skill was vendored from (skills-lock.json), e.g. remotion-dev/skills. */
  upstream?: string;
  version?: string;
}

export interface SkillsRegistry {
  schema: string;
  categories: SkillCategory[];
  skills: RegistrySkill[];
}

/* ---------- .catalog/export (the media CLI) ---------- */

export const MEDIA_KINDS = ['footage', 'overlays', 'images', 'art', 'music', 'sfx', 'references', 'fonts', '3d', 'unsorted'] as const;
export type MediaKind = (typeof MEDIA_KINDS)[number];

export interface ExportMeta {
  schema: string;
  generatedAt: string;
  counts: { items: number; productions: number; channels: number; skills: number };
  /** Absolute path of the library, so paths can be copied and shown in Finder (optional). */
  root?: string;
}

export interface Channel {
  id: string;
  name: string;
  /** Its folder in the delivery root (Downloads/AMZ). */
  folder: string;
  /** The MediaMake cloud project its team shares (`media channel link`). */
  projectId?: string;
  logo?: string;
  productions: string[];
}

export type ProductionStatus = 'active' | 'delivered' | 'uploaded';
export const PRODUCTION_STATUSES: ProductionStatus[] = ['active', 'delivered', 'uploaded'];

export interface Delivery {
  what: string;
  path: string;
  at: string;
  status: string;
}

export interface Production {
  slug: string;
  title: string;
  artist?: string;
  channel?: string;
  song?: string;
  status: ProductionStatus;
  skills: string[];
  deliverFolder?: string;
  thumbnail?: string;
  updatedAt: string;
  /** How many library items it uses. */
  uses: number;
  deliveries: Delivery[];
}

/** A skill's best approved output: its picture (in thumbs/) and where it came from. */
export interface BestOutput {
  thumb: string;
  production?: string;
  what?: string;
  path?: string;
  at?: string;
}

/** What a variant changed since its fork, and what its base changed (`skills.mjs diff --all --json`). */
export interface Drift {
  from: string;
  guessed?: boolean;
  own: { files: number; added: number; removed: number };
  upstream: { commits: number; files: number; added: number; removed: number };
}

export interface ExportSkill extends RegistrySkill {
  runs: number;
  lastRun?: string;
  productions: string[];
  /** A thumb path, or the output it came from. */
  bestOutput?: BestOutput | string;
  drift?: Drift;
}

export interface MediaSource {
  tool?: string;
  ref?: string;
  url?: string;
  pageUrl?: string;
  title?: string;
  /** What was asked for; a Suno take's styles. */
  prompt?: string;
  model?: string;
  /** Suno: the styles it was told to leave out. */
  excludeStyles?: string;
  instrumental?: boolean;
  /** Suno: how it came about (cover, extend, remaster, reuse, upload). */
  relation?: string;
}

export interface MediaNote {
  at?: string;
  text: string;
  production?: string;
}

/** remote: a teammate's item (`media sync pull`), with no copy on this Mac yet. */
export type MediaStatus = 'online' | 'cold' | 'missing' | 'remote';

export interface MediaItem {
  /** sha256 of the content. */
  id: string;
  /** Relative to the library root. */
  path: string;
  kind: MediaKind;
  /** franchise/character, a channel/song, an overlay type… */
  subject?: string;
  title: string;
  tags: string[];
  bytes: number;
  width?: number;
  height?: number;
  duration?: number;
  fps?: number;
  hasAudio?: boolean;
  /** 1–5 (a number or its string). */
  rating?: string | number;
  notes?: (MediaNote | string)[];
  source?: MediaSource;
  /** Production slugs. */
  uses: string[];
  thumb?: string;
  /** A short muted loop or audio clip in thumbs/, played on hover or in the panel (optional). */
  preview?: string;
  /** For unsorted items: the kind the CLI thinks it is (optional). */
  guess?: string;
  status: MediaStatus;
  /** Other paths holding the same bytes. */
  dupes?: string[];
  /** A song's words. */
  lyrics?: string;
  /** What it was made from: a cover's original, a song's stems… */
  related?: { relation: string; id: string }[];
  /** A teammate's item: whose channel, and whether its file can be pulled. */
  remote?: { channel: string; file: boolean };
  /** The channels whose team gets its file; uploaded once `media sync push` sent it. */
  shared?: { channel: string; uploaded: boolean }[];
}

export interface Run {
  skill: string;
  session: string;
  at: string;
  production?: string;
  verdict?: string;
}

/* ---------- requests (the page's only writes) ---------- */

export type LibraryRequest =
  | { op: 'tag'; target: string; add?: string[]; remove?: string[] }
  | { op: 'rate'; target: string; rating: number | null }
  /** Inbox triage: what an unsorted item is. */
  | { op: 'sort'; target: string; kind: Exclude<MediaKind, 'unsorted'>; subject?: string; tags?: string[] }
  | { op: 'set-channel'; target: string; channel: string | null }
  /** The production's picture, made from a library item's. */
  | { op: 'set-thumbnail'; target: string; item: string }
  /** Share with team: the user's OK to give the channel's team this file (`media sync push` uploads it). */
  | { op: 'share' | 'unshare'; target: string; channel?: string };

export type RequestFile = LibraryRequest & { schema: typeof REQUEST_SCHEMA; at: string; from: 'library-page' };

/* ---------- the library, as the page shows it ---------- */

export interface Skill extends RegistrySkill {
  runs: number;
  lastRun?: string;
  productions: string[];
  best?: BestOutput;
  drift?: Drift;
  /** Direct variants, by name. */
  variants: string[];
  /** The root of its variant family (itself for a base). */
  family: string;
}

export interface Library {
  meta: ExportMeta | null;
  categories: SkillCategory[];
  channels: Channel[];
  productions: Production[];
  skills: Skill[];
  media: MediaItem[];
  runs: Run[];
  channel: Record<string, Channel>;
  production: Record<string, Production>;
  skill: Record<string, Skill>;
  item: Record<string, MediaItem>;
  /** Production slug → the items it uses. */
  usedIn: Record<string, MediaItem[]>;
  runsOfSkill: Record<string, Run[]>;
  runsOfProduction: Record<string, Run[]>;
  /** Export files that couldn't be read. */
  problems: string[];
}
