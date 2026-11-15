/**
 * Catalog of released products (skills, MCPs, apps, tutorials, courses) and
 * the records that decide who may use the gated ones.
 *
 * Only metadata lives here and in MongoDB. The packaged content of a
 * private or network item sits in a private bucket path and is handed out
 * through short-lived signed links, so nothing private is ever committed to
 * this (public) repository.
 */

import { MEMBER_TIERS, isHiddenTier, type GrantableTier, type MemberTier } from '../memberships/tiers';

export type { GrantableTier, MemberTier } from '../memberships/tiers';

/** A tutorial is one YouTube video; a course plays tutorials in order (see CatalogVideo). */
export type CatalogKind = 'skill' | 'mcp' | 'app' | 'tutorial' | 'course';

export const CATALOG_KINDS: CatalogKind[] = ['skill', 'mcp', 'app', 'tutorial', 'course'];

/** Kinds that are videos themselves: their card takes the video's title and description. */
export const VIDEO_KINDS: CatalogKind[] = ['tutorial', 'course'];

/**
 * True when the item is always Public, whatever tier it was given:
 *  - a skill whose files are committed in the public repo (`inRepo`: it is in
 *    the skills.json registry). Anyone can read it on GitHub, so there is
 *    nothing to hold back. A skill for Plus, Pro or the cohort is not in the
 *    repo: it is a package in private storage, released like an MCP.
 *  - an item someone else makes (`madeBy`): an open-source or hosted MCP or
 *    skill that an admin listed has nothing of ours in it.
 * It opens for everyone even while public releases are locked.
 */
export function isAlwaysPublic(item: { madeBy?: MadeBy; inRepo?: boolean }): boolean {
  return !!item.madeBy || !!item.inRepo;
}

export const ALWAYS_PUBLIC_ERROR =
  'Skills in the public repo and items made by others are always Public: only our own packages, apps, MCPs and tutorials take a tier';

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
 * The stored stage of an item from before the membership ladder, kept in step
 * with its tier (see visibilityOfTier) for records and code that still read
 * it. The tier is what decides access: see itemTier.
 *  - private: Cohort and the vault.
 *  - network: Plus and Pro.
 *  - public:  Public.
 */
export type CatalogVisibility = 'private' | 'network' | 'public';
export type Visibility = CatalogVisibility;

export const VISIBILITIES: Visibility[] = ['private', 'network', 'public'];

/** The groups of the tiers before the ladder. The migration turns their members into membership records. */
export const NETWORK_GROUP = 'network';
export const COMMUNITY_GROUP = NETWORK_GROUP;
export const PRIVATE_GROUP = 'private';

/** Days a gated release waits before it goes public by itself, unless told otherwise. */
export const DEFAULT_GATE_DAYS = 30;

/**
 * Access: the lowest membership that opens an item (see lib/memberships/tiers
 * for the ladder: Public, Plus, Pro, Cohort, Admin, each opening everything
 * below it). Stored as `tier`:
 *  - public: everyone (once public releases are open).
 *  - plus, pro: members of that tier and above.
 *  - cohort: the cohort and admins. Invisible to everyone below.
 *  - admin: the vault. Never published: admins only, plus grants that name the item.
 * An item with `publicAt` is gated: it turns Public by itself at that time.
 * Grants to one person for one item, invites and expiry work beside the tier.
 */
export type ItemTier = MemberTier;
export const ITEM_TIERS: ItemTier[] = MEMBER_TIERS;
/** The same tiers under their earlier names: the admin dashboard and tools called them release tiers. */
export type ReleaseTier = ItemTier;
export const RELEASE_TIERS: ReleaseTier[] = ITEM_TIERS;

/** True when an item of this tier stays out of sight of everyone it is locked for (the cohort's, the vault's). */
export function isHiddenFromBelow(tier: ItemTier): boolean {
  return isHiddenTier(tier);
}

/** The tier of an item stored before the ladder, from its stage: development was the cohort, community was Pro. */
export const LEGACY_ITEM_TIER: Record<Visibility, ItemTier> = { private: 'cohort', network: 'pro', public: 'public' };

/** The stage stored beside a tier (see CatalogVisibility). */
export function visibilityOfTier(tier: ItemTier): Visibility {
  return tier === 'public' ? 'public' : tier === 'plus' || tier === 'pro' ? 'network' : 'private';
}

/** Who a viewer is: their place on the membership ladder. */
export type ViewerTier = MemberTier;

/**
 * What a viewer can do with an item.
 *  - open:    public item.
 *  - granted: gated item the viewer has access to.
 *  - locked:  gated item the viewer can't open; its href is stripped.
 */
export type CatalogAccess = 'open' | 'granted' | 'locked';
export type AccessLevel = CatalogAccess;

/**
 * A free label from before readiness (see Readiness, which is the rule now).
 * Only `coming-soon` still says something readiness doesn't.
 */
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
  /** The stage from before the ladder, kept in step with `tier` (see CatalogVisibility). */
  visibility: CatalogVisibility;
  /**
   * The lowest membership that opens it (see ItemTier). A record stored
   * before the ladder has none: its tier comes from `visibility` (see itemTier).
   */
  tier?: ItemTier;
  status: CatalogStatus;
  /** How proven it is (see Readiness): Beta until an admin marks it Ready with its proof (see withReadiness). */
  readiness?: Readiness;
  /** The productions made with it that make it Ready. */
  readyProof?: ReadyProof[];
  /** A skill whose files are committed in the public repo: always Public (see isAlwaysPublic). */
  inRepo?: boolean;
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
   * In the vault (tier `admin`): never published, admins and explicit grants only.
   */
  neverPublish?: boolean;
  /**
   * When a gated release goes public by itself (ISO date). Until then the
   * item is a community item; see effectiveVisibility.
   */
  publicAt?: string;
  /** Set when someone else makes it (see MadeBy). Such an item is always Public. */
  madeBy?: MadeBy;
  /**
   * An older way to do what another item does (that item's id): shown as Old,
   * an alternative only, pointing to the one to use first. (None today: the
   * hosted ElevenLabs connector is the ElevenLabs MCP's alternative on the
   * web, not an older way of it.)
   */
  alternativeTo?: string;
  /** Whether it works right now (see ItemHealth): the repo's default, an admin's mark wins (see withHealth). */
  health?: ItemHealth;
  /** Why, when an admin said so with the mark. A failed item always has one. */
  healthNote?: string;
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
  /** Tier changes over time, newest last (entries from before the ladder have a visibility only). */
  stageHistory?: { visibility: Visibility; tier?: ItemTier; at: string; by?: string }[];
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
 * Health: whether an item works right now, for every kind, shown on its card
 * and page so nobody installs a broken one by surprise:
 *  - healthy:  works (every item is, until someone says otherwise).
 *  - inactive: works, but nobody uses or looks after it right now.
 *  - archived: kept for reference, no longer maintained; another one does its job.
 *  - failed:   broken right now, with the reason: don't install it until it is fixed.
 * Admins set it on the item's release page or with the MediaMake MCP's
 * `catalog_set_health`; it is kept in MongoDB `catalog_health`, apart from the
 * items like the archive, so an item the repo defines can have one too.
 */
export type ItemHealth = 'healthy' | 'inactive' | 'archived' | 'failed';
export const ITEM_HEALTH: ItemHealth[] = ['healthy', 'inactive', 'archived', 'failed'];
/** Health was for MCPs only at first: the earlier names. */
export type McpHealth = ItemHealth;
export const MCP_HEALTH = ITEM_HEALTH;

/** A health as stored or typed, read as one of ITEM_HEALTH: `not-working` was the name of `failed`. */
export function parseHealth(value: unknown): ItemHealth | null {
  if (value === 'not-working') return 'failed';
  return typeof value === 'string' && (ITEM_HEALTH as string[]).includes(value) ? (value as ItemHealth) : null;
}

export interface HealthMark {
  id: string;
  health: ItemHealth;
  /** Why. A failed item always has it. */
  note?: string;
  at: string;
  by?: string;
}

/**
 * Each item with its health: an admin's mark, else the repo's default. An
 * MCP with neither says healthy outright (its card shows it); other kinds
 * are healthy by saying nothing.
 */
export function withHealth<T extends { id: string; kind: CatalogKind; health?: ItemHealth; healthNote?: string }>(
  items: T[],
  marks: HealthMark[],
): T[] {
  const byId = new Map(marks.map(mark => [mark.id, mark]));
  return items.map(item => {
    const mark = byId.get(item.id);
    if (mark) return { ...item, health: parseHealth(mark.health) ?? 'healthy', ...(mark.note ? { healthNote: mark.note } : {}) };
    const health = parseHealth(item.health) ?? (item.kind === 'mcp' ? 'healthy' : undefined);
    return health ? { ...item, health } : item;
  });
}

/** True when an item is broken right now. */
export function isFailed(item: { health?: ItemHealth }): boolean {
  return item.health === 'failed';
}

/**
 * Readiness: how proven an item is, for every kind, ours or made by others.
 *  - beta:  everything starts here.
 *  - ready: battle tested. An admin marks it, with the proof on record: at
 *    least one real production made with it (see ReadyProof). An MCP also
 *    needs to be shown in use: a skill that uses it, or a video on it.
 * Kept in MongoDB `catalog_readiness`, apart from the items like health, so
 * an item the repo defines can be marked too.
 */
export type Readiness = 'beta' | 'ready';
export const READINESS: Readiness[] = ['beta', 'ready'];

/**
 * The rule MediaMake is run by, in the owner's words. Readiness is how it is
 * kept: an item is Ready only with a finished production made with it, shown
 * on its page as "Made with this" (components/catalog/made-with.tsx). Also in
 * the README, CLAUDE.md, the pull request template and publish-skill.
 */
export const RULE = "We publish nothing we don't use.";

/** A finished production made with the item: what makes it Ready. */
export interface ReadyProof {
  /** What was made, e.g. "The Microfox brand kit". */
  title: string;
  /** Where it can be seen, e.g. its YouTube link. */
  url?: string;
}

export interface ReadinessMark {
  id: string;
  readiness: Readiness;
  proof?: ReadyProof[];
  note?: string;
  at: string;
  by?: string;
}

/** Each item with its readiness: Ready with its proof when an admin marked it so, else Beta. */
export function withReadiness<T extends { id: string; readiness?: Readiness; readyProof?: ReadyProof[] }>(items: T[], marks: ReadinessMark[]): T[] {
  const byId = new Map(marks.map(mark => [mark.id, mark]));
  return items.map(item => {
    const mark = byId.get(item.id);
    if (mark?.readiness === 'ready' && mark.proof?.length) return { ...item, readiness: 'ready' as const, readyProof: mark.proof };
    const { readyProof: _proof, ...rest } = item;
    return { ...rest, readiness: 'beta' as const } as T;
  });
}

/** The productions that make an item Ready, from its mark; none while it is Beta. */
export function proofOf(mark: ReadinessMark | null | undefined): ReadyProof[] {
  return mark?.readiness === 'ready' ? (mark.proof ?? []).filter(entry => entry.title.trim()) : [];
}

/**
 * What stops an item from being marked Ready, in words; none when it can be.
 * The rule: we publish nothing we don't use, so Ready needs a real production
 * made with it, and an MCP needs to be shown in use as well.
 */
export function readyProblems(
  item: { kind: CatalogKind; health?: ItemHealth; video?: unknown },
  proof: ReadyProof[] | undefined,
  usedByCount: number,
): string[] {
  const problems: string[] = [];
  if (!proof?.some(entry => entry.title.trim())) problems.push('Ready needs proof: at least one finished production made with it (its title, and a link when it has one)');
  if (item.kind === 'mcp' && usedByCount === 0 && !item.video) {
    problems.push('An MCP is Ready once it is shown in use: a skill that uses it, or a video on it');
  }
  if (isFailed(item)) problems.push('It is marked failed: fix it and set its health first');
  return problems;
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
  /** An installable MCP's update prompt (see updatePromptFor). */
  updatePrompt?: string;
};

/** A use as pages show it: the used item's title, page, where it runs and whether it is an old alternative, when known. */
export type UseShown = ItemUse & { title?: string; href?: string; runs?: McpRuns[]; alternativeTo?: string; health?: ItemHealth };
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
  /** Redeemers get this membership (source `invite`), lasting `grantDays` when set. */
  tier?: GrantableTier;
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

/** The fields an item's tier depends on. */
export type TieredItem = Pick<CatalogItem, 'visibility'> & Partial<Pick<CatalogItem, 'tier' | 'neverPublish' | 'publicAt' | 'madeBy' | 'inRepo'>>;

/**
 * The lowest membership that opens an item right now (see ItemTier): Public
 * for one that is always public or whose gate (`publicAt`) has passed, Admin
 * for the vault, else its stored tier (from its stage, for a record stored
 * before the ladder).
 */
export function itemTier(item: TieredItem, now: number = Date.now()): ItemTier {
  if (isAlwaysPublic(item)) return 'public';
  if (item.neverPublish || item.tier === 'admin') return 'admin';
  if (item.publicAt && Date.parse(item.publicAt) <= now) return 'public';
  return item.tier ?? LEGACY_ITEM_TIER[item.visibility];
}

/** The same, under its earlier name. */
export const releaseTier = itemTier;

/** The stage that goes with an item's tier right now (see CatalogVisibility). */
export function effectiveVisibility(item: TieredItem, now: number = Date.now()): Visibility {
  return visibilityOfTier(itemTier(item, now));
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
