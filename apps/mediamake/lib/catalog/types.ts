/**
 * Catalog of released products (skills, MCPs, apps, tutorials, courses) and
 * the records that decide who may use the gated ones.
 *
 * Only metadata lives here and in MongoDB. The packaged content of a
 * private or network item sits in a private bucket path and is handed out
 * through short-lived signed links, so nothing private is ever committed to
 * this (public) repository.
 */

/** A tutorial is one YouTube video; a course plays tutorials in order (see CatalogVideo). */
export type CatalogKind = 'skill' | 'mcp' | 'app' | 'tutorial' | 'course';

export const CATALOG_KINDS: CatalogKind[] = ['skill', 'mcp', 'app', 'tutorial', 'course'];

/** Kinds that are videos themselves: their card takes the video's title and description. */
export const VIDEO_KINDS: CatalogKind[] = ['tutorial', 'course'];

/**
 * Kinds that are always public. Every skill's files are committed in the
 * repo (.agents/skills, listed in SKILLS.md), so a skill item is never gated:
 * no development, community, vault or release gate, and it opens for everyone
 * even while public releases are locked. Apps, MCPs and tutorials go through
 * the gated releases below.
 */
export const ALWAYS_PUBLIC_KINDS: CatalogKind[] = ['skill'];

/**
 * True when the item is always public: its kind is (see ALWAYS_PUBLIC_KINDS),
 * or someone else makes it (`madeBy`). An open-source or hosted MCP or skill
 * that an admin listed has nothing of ours in it to hold back.
 */
export function isAlwaysPublic(item: { id?: string; kind?: CatalogKind; madeBy?: MadeBy }): boolean {
  if (item.madeBy) return true;
  const kind = item.kind ?? (item.id?.split('/')[0] as CatalogKind | undefined);
  return !!kind && ALWAYS_PUBLIC_KINDS.includes(kind);
}

export const ALWAYS_PUBLIC_ERROR =
  'Skills and items made by others are always public: only our own apps, MCPs and tutorials go through gated releases';

/**
 * Who makes an item we list but don't build: an open-source MCP or skill
 * (with its repo and licence), or a hosted MCP from its maker. Only admins
 * list these (the admin API, or lib/catalog/third-party.json). They have no
 * package of ours: the installer gets them from `install.source`.
 */
export interface MadeBy {
  /** Who makes it, e.g. `ElevenLabs`. */
  name: string;
  /** Its code on GitHub (`owner/name`), when it is open source. */
  repo?: string;
  /** SPDX licence id of an open-source item, e.g. `MIT`. */
  license?: string;
  /** Its maker's page or docs, when that isn't the repo. */
  homepage?: string;
}

/**
 * Release stage of an item, from most to least restricted.
 *  - private: only viewers with an explicit grant.
 *  - network: members of the `network` group (the internal circle) plus grants.
 *  - public:  everyone, signed in or not.
 * Anything other than public goes through the access check in lib/access.
 */
export type CatalogVisibility = 'private' | 'network' | 'public';
export type Visibility = CatalogVisibility;

export const VISIBILITIES: Visibility[] = ['private', 'network', 'public'];

/** The group whose members can use every `network` item (the community tier). */
export const NETWORK_GROUP = 'network';
export const COMMUNITY_GROUP = NETWORK_GROUP;

/**
 * The group of private testers: they can use every item, in development or
 * ready, except the ones marked never-publish. They can't release anything;
 * only admins can.
 */
export const PRIVATE_GROUP = 'private';

/** Days a release spends with the community before it goes public, unless told otherwise. */
export const DEFAULT_GATE_DAYS = 30;

/**
 * Release tiers, as the admin dashboard shows them. Stored as `visibility`
 * plus `neverPublish`:
 *  - vault:       never published. Admins only, plus explicit item grants.
 *  - development: being built (`private`). Private testers and grants.
 *  - community:   production ready, pre-release (`network`). The community group too.
 *  - public:      released. Everyone (once public releases are open).
 * A community item with `publicAt` is gated: it turns public by itself at that time.
 */
export type ReleaseTier = 'vault' | 'development' | 'community' | 'public';
export const RELEASE_TIERS: ReleaseTier[] = ['vault', 'development', 'community', 'public'];

/**
 * Who a viewer is, from most to least access:
 *  - admin:     everything, and the only one who can release.
 *  - private:   in the `private` group (or holds a `*` grant): everything but the vault.
 *  - community: in the `network` group: production-ready items before release.
 *  - public:    everyone else: released items only.
 */
export type ViewerTier = 'admin' | 'private' | 'community' | 'public';

/**
 * What a viewer can do with an item.
 *  - open:    public item.
 *  - granted: gated item the viewer has access to.
 *  - locked:  gated item the viewer can't open; its href is stripped.
 */
export type CatalogAccess = 'open' | 'granted' | 'locked';
export type AccessLevel = CatalogAccess;

export type CatalogStatus = 'live' | 'beta' | 'coming-soon';

/** One uploaded, immutable package of an item. */
export interface CatalogVersion {
  version: string;
  /** Object key in the private catalog bucket. */
  storageKey: string;
  sha256: string;
  bytes: number;
  publishedAt: string;
  publishedBy?: string;
  notes?: string;
}

/** The public-safe card data of an item. */
export interface CatalogItem {
  /** Stable id, `<kind>/<slug>`, e.g. `skill/lyric-video`. Grants reference it. */
  id: string;
  kind: CatalogKind;
  title: string;
  summary: string;
  visibility: CatalogVisibility;
  status: CatalogStatus;
  /**
   * false hides the card from viewers without access instead of showing it
   * locked. Use it for items whose name should not be seen yet.
   */
  listed?: boolean;
  /**
   * A `public` page anyone can already open (no package, nothing to gate),
   * shown to everyone even while releases are locked.
   */
  openToAll?: boolean;
  /**
   * Never published: stays in the vault (admins and explicit grants only)
   * and can't be moved to network or public.
   */
  neverPublish?: boolean;
  /**
   * When a gated release goes public by itself (ISO date). Until then the
   * item is a community item; see effectiveVisibility.
   */
  publicAt?: string;
  /** Set when someone else makes it (see MadeBy). Such an item is always public. */
  madeBy?: MadeBy;
  /**
   * An older way to do what another item does (that item's id): shown as Old,
   * an alternative only, pointing to the one to use first. The ElevenLabs MCP
   * is the hosted ElevenLabs connector's.
   */
  alternativeTo?: string;
  /**
   * When an admin archived it (see ArchiveMark: kept apart from the item, so
   * any item can be archived, a skill from the repo too). An archived item
   * keeps its access and installs by its link, but leaves the homepage.
   */
  archivedAt?: string;
  /** Its video (see CatalogVideo, kept apart like the archive): a skill's intro, a tutorial, a course. */
  video?: ItemVideo;
  /** Where the card links once the viewer has access. Never sent to viewers without access. */
  href?: string;
  cover?: string;
  tags?: string[];
  /** Latest published version. */
  version?: string;
  /** ISO date, used to sort newest first. */
  releasedAt: string;
  updatedAt?: string;
}

/**
 * Something an item needs installed first. Install plans resolve these
 * recursively, dependencies first (see lib/catalog/install).
 */
export type InstallRequirement =
  /** Another catalog item, e.g. `skill/remotion-basics`. */
  | { type: 'item'; id: string }
  /** A GitHub repository to clone, e.g. `microfox-ai/mediamake`. */
  | { type: 'repo'; repo: string; why?: string }
  /** A file attached to a public GitHub release, e.g. a Chrome extension zip. */
  | {
      type: 'github-release';
      repo: string;
      asset: string;
      name: string;
      /** `latest` (default) or a tag such as `v0.1.1`. */
      tag?: string;
      kind?: 'chrome-extension' | 'binary' | 'other';
      /** Human install guide for the release, shown to the person. */
      guide?: string;
    };

/**
 * How an item is installed once its package is downloaded.
 *  - skill:  unpack into the skills folder (`~/.claude/skills/<slug>`).
 *  - mcpb:   open the `.mcpb` bundle (`entry`) in Claude Desktop.
 *  - app:    unpack and follow the package's INSTALL.md.
 *  - manual: only follow the package's INSTALL.md.
 * Any package may carry an INSTALL.md with item-specific steps; the
 * installer always follows it after the method's own step.
 */
export type InstallMethod = 'skill' | 'mcpb' | 'app' | 'manual';

/**
 * How much an item gets out of something it uses:
 *  - required:    its main job needs it (pack-brand-kit can't make sound without ElevenLabs).
 *  - recommended: it works without, noticeably worse or slower.
 *  - optional:    an extra for some requests.
 * The person may still skip any of them: the installer says what they lose.
 */
export type UseNeed = 'required' | 'recommended' | 'optional';

export const USE_NEEDS: UseNeed[] = ['required', 'recommended', 'optional'];

/**
 * Another catalog item (usually an MCP) this item works with. Unlike
 * `requires`, it isn't installed without asking: the install plan offers it
 * as a choice, with what it is for and what the person loses without it.
 * Skills declare theirs in SKILL.md (see tools/skills.mjs, `## First: check the MCPs`).
 */
export interface ItemUse {
  /** Catalog item id, e.g. `mcp/elevenlabs`. */
  id: string;
  need: UseNeed;
  /** What the item uses it for, e.g. "sound effects for intros and end screens". */
  for: string;
  /** What the person loses by not installing it. */
  without: string;
}

/**
 * A value an MCP server needs from the person: an environment variable of a
 * local server, or a header of a hosted one (e.g. an API key).
 */
export interface McpSetting {
  /** Variable or header name, e.g. `ELEVENLABS_API_KEY` or `Authorization`. */
  name: string;
  description: string;
  /** How the value is written, `{value}` standing for what the person gives, e.g. `Bearer {value}`. */
  format?: string;
  /** Where the person gets the value, e.g. their maker's API keys page. */
  getAt?: string;
  /** An API key or token: asked for, never printed back or written anywhere but the server's config. */
  secret?: boolean;
  required?: boolean;
  default?: string;
}

/** Where an item that has no package of ours is installed from. */
export type InstallSource =
  /** A skill folder in a public GitHub repository, e.g. `remotion-dev/skills` at `skills/remotion-render`. */
  | { type: 'github-skill'; repo: string; path: string; ref?: string }
  /**
   * An MCP server someone else publishes. Give at least one way to add it;
   * install.md picks the one that fits the person's Claude.
   */
  | {
      type: 'mcp-server';
      /** The name to add it under: its tools show up as `mcp__<name>__<tool>` in Claude Code. */
      name: string;
      /** Runs on the person's machine, e.g. `uvx` with `["elevenlabs-mcp"]`. */
      local?: { command: string; args?: string[]; env?: McpSetting[] };
      /** Hosted by its maker (Streamable HTTP). */
      remote?: {
        url: string;
        headers?: McpSetting[];
        /** The URL to add as a custom connector in the Claude apps when it differs (signs in instead of a key). */
        connectorUrl?: string;
        /**
         * Its page in Claude's connector directory, e.g. `https://claude.ai/directory/elevenlabs`, where the
         * Claude apps add it in one click. Only for one that is listed there: with none, no link is shown.
         */
        directoryUrl?: string;
      };
      /** An `.mcpb` bundle attached to a GitHub release, for Claude Desktop. */
      mcpb?: { repo: string; asset: string; tag?: string };
      /** Steps after the server is added (an add-on to enable, an app to open), in order. */
      setup?: string[];
      /** Its maker's setup guide, for anything the above doesn't cover. */
      guide?: string;
    };

/** A hosted MCP's page in Claude's connector directory, when it is listed there. */
export function directoryUrlOf(source: InstallSource | undefined): string | undefined {
  return source?.type === 'mcp-server' ? source.remote?.directoryUrl : undefined;
}

export interface InstallSpec {
  method?: InstallMethod;
  /** File inside the package the method acts on, e.g. `browse-hack.mcpb`. */
  entry?: string;
  requires?: InstallRequirement[];
  /** Items it works with, offered to the person as choices (see ItemUse). */
  uses?: ItemUse[];
  /** For an item with no package of ours (see MadeBy): where it is installed from. */
  source?: InstallSource;
  /** Short note shown to the person before installing. */
  notes?: string;
}

/** The stored record: card data plus versions and bookkeeping. */
export interface CatalogItemRecord extends CatalogItem {
  slug: string;
  install?: InstallSpec;
  versions: CatalogVersion[];
  createdAt: string;
  createdBy?: string;
  /** When the current release gate (`publicAt`) was set, for its progress bar. */
  gateStartedAt?: string;
  /** Visibility changes over time, newest last. */
  stageHistory?: { visibility: Visibility; at: string; by?: string }[];
}

/** True when the item has something to install: a published package of ours, or a source. */
export function isInstallable(record: Pick<CatalogItemRecord, 'versions' | 'install'>): boolean {
  return record.versions.length > 0 || !!record.install?.source;
}

/**
 * Where an MCP runs: `web`, hosted by its maker (added as a connector, signs
 * in, nothing on the computer), or `computer`, a server on the person's own
 * computer (a local command, or an .mcpb bundle, ours included). Both when it
 * can be added either way; none for an item that isn't an MCP.
 */
export type McpRuns = 'web' | 'computer';

export function mcpRunsOf(record: Pick<CatalogItemRecord, 'kind' | 'versions' | 'install'>): McpRuns[] {
  if (record.kind !== 'mcp') return [];
  const source = record.install?.source?.type === 'mcp-server' ? record.install.source : undefined;
  const ownBundle = record.versions.length > 0 && (record.install?.method ?? 'mcpb') === 'mcpb';
  return [
    ...(source?.remote ? (['web'] as const) : []),
    ...(source?.local || source?.mcpb || ownBundle ? (['computer'] as const) : []),
  ];
}

/**
 * An archived item, in MongoDB `catalog_archive`: unused or no longer
 * important, so left off the homepage (and shown on the Skills tab only behind its Archived filter). It
 * stays public, or as shared as it was, and installs by its link.
 */
export interface ArchiveMark {
  id: string;
  at: string;
  by?: string;
  note?: string;
}

/** The items with `archivedAt` set on the archived ones. */
export function withArchive<T extends { id: string; archivedAt?: string }>(items: T[], marks: ArchiveMark[]): T[] {
  const at = new Map(marks.map(mark => [mark.id, mark.at]));
  return items.map(item => (at.has(item.id) ? { ...item, archivedAt: at.get(item.id) } : item));
}

/**
 * The video of an item, in MongoDB `catalog_videos`: a skill's intro (or an
 * MCP's or app's), a tutorial, or a course. Kept apart from the items, like
 * the archive, so a skill from the repo can have one too. Every video has its
 * own title, description and thumbnail, set on the item's release page.
 */
export interface CatalogVideo {
  /** The item it belongs to, e.g. `skill/pack-brand-kit` or `tutorial/brand-kit-in-one-prompt`. */
  id: string;
  /** The YouTube video id. A course has none: it plays its lessons. */
  youtubeId?: string;
  title: string;
  description: string;
  /** An uploaded thumbnail; YouTube's own when unset (see videoThumbnail in ./video). */
  thumbnail?: string;
  /** A course's tutorials, in the order it plays them (`tutorial/<slug>` ids). */
  lessons?: string[];
  updatedAt: string;
  updatedBy?: string;
}

/** What a card carries of its video (see withVideos in ./video). */
export interface ItemVideo {
  youtubeId?: string;
  title: string;
  description: string;
  /** The thumbnail to show: the uploaded one, else YouTube's (a course's: its first lesson's). */
  thumbnail?: string;
  /** A course's lessons (tutorial ids), in order. */
  lessons?: string[];
}

export type CatalogEntry = CatalogItem & {
  access: CatalogAccess;
  /**
   * A prompt to paste into Claude that installs the item and everything it
   * needs. Only set on items the viewer can open that can be installed (see
   * isInstallable): every registry skill and third-party item can.
   */
  installPrompt?: string;
  /** What it works with (see ItemUse), on items the viewer can open. */
  uses?: UseShown[];
  /** Where an MCP runs (see mcpRunsOf). */
  runs?: McpRuns[];
};

/** A use as pages show it: the used item's title, page, where it runs and whether it is an old alternative, when known. */
export type UseShown = ItemUse & { title?: string; href?: string; runs?: McpRuns[]; alternativeTo?: string };
export type CatalogItemWithAccess = CatalogEntry;

export const CATALOG_STATUSES: CatalogStatus[] = ['live', 'beta', 'coming-soon'];

/** Who a grant is for. */
export type GrantSubject =
  | { kind: 'client'; id: string }
  | { kind: 'group'; id: string };

/** Permission for a subject to use one item, or every item with `'*'`. */
export interface AccessGrant {
  grantId: string;
  itemId: string | '*';
  subject: GrantSubject;
  grantedBy?: string;
  grantedAt: string;
  expiresAt?: string;
  revokedAt?: string;
  revokedBy?: string;
  note?: string;
  /** Set when the grant came from redeeming an invite. */
  inviteCode?: string;
}

/** A named set of clients, e.g. `network` or `beta-testers`. */
export interface AccessGroup {
  groupId: string;
  name: string;
  members: string[];
  createdAt: string;
  updatedAt: string;
}

/**
 * A shareable code. Redeeming it (signed in) grants the listed items, or
 * adds the redeemer to a group, until `maxUses` is reached or it expires.
 */
export interface AccessInvite {
  code: string;
  itemIds: (string | '*')[];
  /** Redeemers join this group instead of / as well as getting item grants. */
  groupId?: string;
  maxUses: number;
  uses: number;
  redeemedBy: { clientId: string; at: string }[];
  /** How long the resulting grants last, in days. Unset = no expiry. */
  grantDays?: number;
  createdBy?: string;
  createdAt: string;
  expiresAt?: string;
  disabledAt?: string;
  note?: string;
}

export type AccessRequestStatus = 'pending' | 'approved' | 'rejected';

export interface AccessRequest {
  requestId: string;
  itemId: string;
  clientId: string;
  message?: string;
  status: AccessRequestStatus;
  createdAt: string;
  resolvedAt?: string;
  resolvedBy?: string;
}

export interface CatalogDownload {
  itemId: string;
  version: string;
  clientId: string | null;
  at: string;
}

/**
 * Visibility right now: a skill or an item made by others is always public, and a gated item whose
 * `publicAt` has passed is public.
 */
export function effectiveVisibility(
  item: Pick<CatalogItem, 'visibility' | 'neverPublish' | 'publicAt'> & Partial<Pick<CatalogItem, 'id' | 'kind' | 'madeBy'>>,
  now: number = Date.now(),
): Visibility {
  if (isAlwaysPublic(item)) return 'public';
  if (item.neverPublish) return 'private';
  if (item.visibility === 'network' && item.publicAt && Date.parse(item.publicAt) <= now) return 'public';
  return item.visibility;
}

/** The dashboard tier of an item right now. */
export function releaseTier(
  item: Pick<CatalogItem, 'visibility' | 'neverPublish' | 'publicAt'> & Partial<Pick<CatalogItem, 'id' | 'kind' | 'madeBy'>>,
  now: number = Date.now(),
): ReleaseTier {
  if (isAlwaysPublic(item)) return 'public';
  if (item.neverPublish) return 'vault';
  const visibility = effectiveVisibility(item, now);
  return visibility === 'public' ? 'public' : visibility === 'network' ? 'community' : 'development';
}

export function catalogItemId(kind: CatalogKind, slug: string): string {
  return `${kind}/${slug}`;
}

export function slugOf(id: string): string {
  return id.slice(id.indexOf('/') + 1);
}

export function parseCatalogItemId(
  id: string,
): { kind: CatalogKind; slug: string } | null {
  const [kind, ...rest] = id.split('/');
  const slug = rest.join('/');
  if (!CATALOG_KINDS.includes(kind as CatalogKind) || !isValidSlug(slug)) {
    return null;
  }
  return { kind: kind as CatalogKind, slug };
}

export function isValidSlug(slug: string): boolean {
  return /^[a-z0-9][a-z0-9-]{0,63}$/.test(slug);
}
