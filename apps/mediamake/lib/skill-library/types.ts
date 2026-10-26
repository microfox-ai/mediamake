/*
 * The two files the skill library reads besides SKILL.md. Both are optional:
 * without them the library still lists every skill (from its frontmatter),
 * finds variants by `metadata.variant-of` or their name, and finds productions
 * by `input/project.json`. See components/skill-library/README.md.
 */

export const SKILL_SCHEMA = 'mediamake.skill/v1';
export const PRODUCTION_SCHEMA = 'mediamake.production/v1';

/** skill.json next to SKILL.md. */
export const SKILL_MANIFEST = 'skill.json';
/** mediamake.json at the root of a production folder. */
export const PRODUCTION_MANIFEST = 'mediamake.json';

/**
 * production: modelled on one finished production (`<base>-like-<production>`).
 * style: a look that isn't one production (`<base>-like-<style>`).
 * version: the base frozen before a big change (`<base>-v<N>`).
 */
export type VariantKind = 'production' | 'style' | 'version';
export const VARIANT_KINDS: VariantKind[] = ['production', 'style', 'version'];

/** skill.json · mediamake.skill/v1. Paths are relative to the skill's folder. */
export interface SkillManifest {
  schema?: string;
  title?: string;
  /** One line for the card; defaults to the description's first sentence. */
  summary?: string;
  /** Card image (16:9 looks best). Default: thumbnail.{jpg,png,webp,gif,avif} in the folder. */
  thumbnail?: string;
  /** A short muted loop played when the card is hovered. */
  preview?: string;
  /** More images shown on the skill's page (examples of what it makes). */
  gallery?: string[];
  tags?: string[];
  /** Whose skill or variant this is: a variant made from your production is yours. */
  owner?: string;
  /** Overrides the category taken from the name's verb. */
  category?: string;
  variant?: {
    /** The base skill's name (same as frontmatter `metadata.variant-of`). */
    of?: string;
    kind?: VariantKind;
    /** The production slug, style name or version it is modelled on. */
    ref?: string;
    /** Shown on the card, e.g. "F1 × Hit It". */
    label?: string;
    /** The production it was made from, when that's a production slug the library knows. */
    production?: string;
  };
  /** Slugs of productions made with this skill. */
  productions?: string[];
  [key: string]: unknown;
}

/** mediamake.json · mediamake.production/v1. Paths are relative to the production's folder. */
export interface ProductionManifest {
  schema?: string;
  slug?: string;
  title?: string;
  /** Artist, channel or client. */
  artist?: string;
  /**
   * The mediamake project (channel or brand, with its brand kit) this production belongs to:
   * the cloud project's name or id.
   */
  project?: string;
  summary?: string;
  thumbnail?: string;
  owner?: string;
  tags?: string[];
  /** Skills and variants used in this production, by name. */
  skills?: string[];
  [key: string]: unknown;
}

export interface Frontmatter {
  name?: string;
  description?: string;
  version?: string;
  metadata: Record<string, string>;
}

/** A file somewhere inside a source, read lazily (thumbnails, gallery images). */
export interface FileRef {
  /** Unique within the library: `<source id>:<path in source>`. */
  key: string;
  dir: FileSystemDirectoryHandle;
  /** Relative to `dir`, may contain subfolders. */
  file: string;
  /** Where it is, for display: `<path in source>`. */
  path: string;
}

/** Where a skill folder sits: committed (`.agents/skills`), local only (`.claude/skills`), or any other folder. */
export type SkillLocation = 'committed' | 'local' | 'folder';

export interface ScannedSkill {
  folder: string;
  sourceId: string;
  /** Path inside the source, e.g. ".claude/skills/make-lyrics-video". */
  path: string;
  dir: FileSystemDirectoryHandle;
  location: SkillLocation;
  frontmatter: Frontmatter;
  /** SKILL.md without its frontmatter. */
  body: string;
  manifest: SkillManifest | null;
  /** The thumbnail.* file in the folder, if any. */
  thumbFile: string | null;
  files: string[];
  lastModified: number;
}

export interface ScannedProduction {
  slug: string;
  sourceId: string;
  path: string;
  dir: FileSystemDirectoryHandle;
  manifest: ProductionManifest | null;
  /** input/project.json (lyrics_videos projects): title, artist. */
  info: { title?: string; artist?: string } | null;
  /** thumbnail.* or cover.* in the folder, or a cover in input/. */
  thumbFile: string | null;
  lastModified: number;
}

/** An image set (index.json · mediamake.image-set/v1), e.g. a production's thumbnails. */
export interface ScannedSet {
  job: string;
  sourceId: string;
  path: string;
  dir: FileSystemDirectoryHandle;
  title?: string;
  kind?: string;
  workflow?: string;
  source?: string;
  /** Image files, best first (picked, then the rest). */
  images: string[];
}

export interface SourceScan {
  skills: ScannedSkill[];
  productions: ScannedProduction[];
  sets: ScannedSet[];
  /** Folders looked at; the scan stops at a budget. */
  visited: number;
  truncated: boolean;
}

/* ---------- the library, as the page shows it ---------- */

export interface Skill {
  name: string;
  title: string;
  summary: string;
  description: string;
  category: string;
  tags: string[];
  owner?: string;
  location: SkillLocation;
  /** Every place this skill was found (the first is the one shown). */
  copies: { sourceId: string; path: string; location: SkillLocation }[];
  sourceId: string;
  path: string;
  dir: FileSystemDirectoryHandle;
  manifest: SkillManifest | null;
  version?: string;
  forked?: string;
  lastModified: number;
  /** Set when this is a variant. */
  variant: {
    of: string;
    kind: VariantKind;
    ref: string;
    label: string;
    /** Origin production's slug when known. */
    production?: string;
  } | null;
  /** The base family: the root skill's name (itself for a base). */
  family: string;
  /** Names of direct variants. */
  variants: string[];
  /** Production slugs this skill is used in (manifests, mentions, image sets it made). */
  productions: string[];
  thumbnail: FileRef | null;
  preview: FileRef | null;
  gallery: FileRef[];
}

export interface Production {
  slug: string;
  title: string;
  artist?: string;
  /** The mediamake project (channel or brand) it belongs to. */
  project?: string;
  summary?: string;
  owner?: string;
  tags: string[];
  sourceId: string;
  path: string;
  dir: FileSystemDirectoryHandle;
  manifest: ProductionManifest | null;
  lastModified: number;
  /** Skills used here (bases and variants). */
  skills: string[];
  /** Variants that were made from this production. */
  bornVariants: string[];
  thumbnail: FileRef | null;
  gallery: FileRef[];
}

export interface Family {
  base: string;
  /** False when only variants are installed, not the base itself. */
  baseInstalled: boolean;
  /** Every variant, depth-first (variants of variants included). */
  variants: string[];
  productions: string[];
}

export interface Library {
  skills: Record<string, Skill>;
  productions: Record<string, Production>;
  families: Family[];
  categories: { id: string; count: number }[];
  owners: string[];
}
