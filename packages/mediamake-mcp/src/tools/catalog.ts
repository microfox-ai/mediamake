import { readFile } from 'node:fs/promises';
import { basename } from 'node:path';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { MediamakeClient } from '../client.js';
import { itemPagePath, json, mimeFromName, rejectLocalArgs, safe, withoutLocalArgs, type ToolOptions } from '../util.js';

const READ = { readOnlyHint: true, openWorldHint: true } as const;
const WRITE = { readOnlyHint: false, destructiveHint: false, openWorldHint: true } as const;

const ITEM_ID = z
  .string()
  .regex(/^(skill|mcp|app|tutorial|course)\/[a-z0-9][a-z0-9-]{0,63}$/, 'a catalog id such as skill/pack-brand-kit or mcp/browse-hack')
  .describe('Catalog item id, e.g. "skill/pack-brand-kit" or "mcp/browse-hack"');
const KIND = z.enum(['skill', 'mcp', 'app', 'tutorial', 'course']);
/**
 * The membership ladder (the app's lib/memberships/tiers.ts), lowest first:
 * each tier opens everything below it. An item names the lowest tier that
 * opens it; `vault` is the app's `admin` tier (admins only, never published).
 */
const ITEM_TIER = z.enum(['public', 'plus', 'pro', 'cohort', 'vault']);
type ItemTier = z.infer<typeof ITEM_TIER>;
/** The tier the app stores for one typed here, and back. */
const storedTier = (tier: ItemTier) => (tier === 'vault' ? 'admin' : tier);
const shownTier = (tier: string): ItemTier => (tier === 'admin' ? 'vault' : (tier as ItemTier));
/** A person's tier. Public is having no membership; Admin is the account's flag, not given here. */
const PEOPLE_TIER = z.enum(['public', 'plus', 'pro', 'cohort']);
const MEMBER_TIERS = ['cohort', 'pro', 'plus'] as const;
const HEALTH = z.enum(['healthy', 'inactive', 'archived', 'failed']);
/** How a membership was got (MEMBERSHIP_SOURCES in the app's lib/memberships/membership.ts). */
const SOURCE_OF = z.enum(['admin', 'contribution', 'paid']);
/** The groups of the tiers before the ladder, until the migration clears them. */
const EARLIER_GROUPS: Record<string, (typeof MEMBER_TIERS)[number]> = { private: 'cohort', network: 'pro' };

type MembershipRecord = {
  membershipId: string;
  clientId: string;
  tier: (typeof MEMBER_TIERS)[number];
  source: string;
  ref?: string;
  note?: string;
  grantedAt: string;
  expiresAt?: string;
  permanent?: boolean;
  revokedAt?: string;
};

/** What catalog_people and catalog_set_tier read from GET /api/admin/catalog. */
type AdminPeople = {
  people: { clientId: string; name: string; activeKeys: number }[];
  groups: { groupId: string; members: string[] }[];
  memberships?: MembershipRecord[];
  requests: { clientId: string; itemId: string; message?: string }[];
};

/** How long a membership lasts, in words. */
function lasts(membership: Pick<MembershipRecord, 'permanent' | 'expiresAt'>) {
  return membership.permanent ? 'permanent' : membership.expiresAt ? `until ${membership.expiresAt.slice(0, 10)}` : 'until an admin removes it';
}

/** A value an MCP server needs from the person (an env variable, or a header of a hosted one). */
const MCP_SETTING = z.object({
  name: z.string().describe('e.g. ELEVENLABS_API_KEY, or Authorization'),
  description: z.string(),
  format: z.string().optional().describe('How it is written, {value} standing for what they give, e.g. "Bearer {value}"'),
  getAt: z.string().optional().describe('Where they get it, e.g. the API keys page'),
  secret: z.boolean().optional(),
  required: z.boolean().optional(),
  default: z.string().optional(),
});

/** Where an item made by others installs from (InstallSource in the app's lib/catalog/types.ts). */
const SOURCE = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('github-skill'),
    repo: z.string().describe('owner/name'),
    path: z.string().describe('The skill folder in that repo'),
    ref: z.string().optional().describe('Tag or branch'),
  }),
  z.object({
    type: z.literal('mcp-server'),
    name: z.string().describe('The name to add it under: its tools show up as mcp__<name>__<tool>'),
    local: z
      .object({ command: z.string(), args: z.array(z.string()).optional(), env: z.array(MCP_SETTING).optional() })
      .optional()
      .describe('Runs on the person\'s machine, e.g. command "uvx", args ["elevenlabs-mcp"]'),
    remote: z
      .object({
        url: z.string(),
        headers: z.array(MCP_SETTING).optional(),
        connectorUrl: z.string().optional(),
        directoryUrl: z
          .string()
          .optional()
          .describe("Its page in Claude's connector directory (https://claude.ai/directory/<name>), only when it is listed there"),
      })
      .optional()
      .describe('Hosted by its maker (Streamable HTTP)'),
    mcpb: z.object({ repo: z.string(), asset: z.string(), tag: z.string().optional() }).optional().describe('An .mcpb on a GitHub release'),
    setup: z.array(z.string()).optional().describe('Steps after the server is added, in order'),
    guide: z.string().optional().describe("Its maker's setup guide (URL)"),
  }),
]);

/** A video as the app stores it (CatalogVideo in the app's lib/catalog/types.ts). */
type StoredVideo = { youtubeId?: string; title: string; description: string; thumbnail?: string; lessons?: string[] };

/** What a video is made of; catalog_set_video and catalog_add_video_item share it. */
const VIDEO_FIELDS = {
  url: z.string().optional().describe('The YouTube link (watch, youtu.be, shorts or embed); only YouTube videos play. Not for a course'),
  title: z.string().min(1).max(120).optional(),
  description: z
    .string()
    .max(5000)
    .optional()
    .describe("Shown under the video. A tutorial's or course's first paragraph is also its card's summary"),
  thumbnail: z
    .string()
    .nullable()
    .optional()
    .describe("An https image link. Without one it is YouTube's (a course: its first lesson's); null goes back to that"),
  thumbnailFile: z
    .string()
    .optional()
    .describe('A PNG, JPEG, WebP, GIF or AVIF on this computer to upload as the thumbnail (public once uploaded)'),
  lessons: z.array(ITEM_ID).max(100).optional().describe('A course only: its tutorials (tutorial/<slug>), in the order they play'),
};
const LOCAL_ARGS: (keyof typeof VIDEO_FIELDS)[] = ['thumbnailFile'];
const THUMBNAIL_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/avif'];
/** The video the admin API's set_video and create_video_item take. */
type VideoBody = { url?: string; title: string; description?: string; thumbnail?: string; lessons?: string[] };
type ThumbnailFile = { name: string; contentType: string; bytes: Buffer };

const youtubeLink = (id: string) => `https://www.youtube.com/watch?v=${id}`;

/** Reads a thumbnail image from this computer before anything is saved, so a wrong file changes nothing. */
async function readThumbnail(filePath: string): Promise<ThumbnailFile> {
  const contentType = mimeFromName(filePath);
  if (!contentType || !THUMBNAIL_TYPES.includes(contentType)) throw new Error(`${filePath} is not a PNG, JPEG, WebP, GIF or AVIF image`);
  return { name: basename(filePath), contentType, bytes: await readFile(filePath) };
}

/** Uploads a thumbnail for the item (public once uploaded) and answers with its link. */
async function uploadThumbnail(client: MediamakeClient, itemId: string, file: ThumbnailFile) {
  const { uploadUrl, publicUrl } = await client.post<{ uploadUrl: string; publicUrl: string }>('/api/admin/catalog', {
    type: 'create_thumbnail_upload',
    itemId,
    filename: file.name,
    contentType: file.contentType,
  });
  // The URL is signed with ACL public-read, so the header must match.
  const put = await fetch(uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': file.contentType, 'x-amz-acl': 'public-read' },
    body: new Uint8Array(file.bytes),
  });
  if (!put.ok) throw new Error(`Upload of ${file.name} failed (${put.status}): ${(await put.text()).slice(0, 300)}`);
  return publicUrl;
}

/** A video as the tools answer: its YouTube link, and the thumbnail it shows (YouTube's when none was set). */
function shownVideo(video: StoredVideo) {
  const { youtubeId, ...rest } = video;
  return {
    ...rest,
    ...(youtubeId && { youtube: youtubeLink(youtubeId) }),
    thumbnail: video.thumbnail ?? (youtubeId ? `https://img.youtube.com/vi/${youtubeId}/maxresdefault.jpg` : undefined),
  };
}

/** The same as the release dashboard's: "Brand kit in one prompt" → brand-kit-in-one-prompt. */
function slugify(title: string) {
  return title
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64)
    .replace(/-+$/, '');
}

type PlanStep = {
  type: 'repo' | 'github-release' | 'item' | 'source';
  forChoices?: string[];
  [key: string]: any;
};

/** A plan step as one line: what installing the item does, in order. */
function stepLine(step: PlanStep): string {
  const only = step.forChoices ? ` (only if they take ${step.forChoices.join(' or ')})` : '';
  switch (step.type) {
    case 'repo':
      return `Clone ${step.repo}${only}`;
    case 'github-release':
      return `Download ${step.name} from the ${step.repo} releases${only}`;
    case 'item':
      return `${step.kind} ${step.id} v${step.version}, our package${only}`;
    default:
      return `${step.kind} ${step.id} from its source (${step.source?.type})${only}`;
  }
}

export function registerCatalogTools(server: McpServer, client: MediamakeClient, options: ToolOptions = { localFiles: true }) {
  /** The item's release page on the admin dashboard: give it to the user after any change. */
  const page = (id: string) => client.url(`/core/releases/${id}`);
  /** The item's own page for viewers, where its video plays: /skills/<slug>, /mcps/<slug>, /apps/<slug>, /courses/<slug>. */
  const itemPage = (id: string) => {
    const { path, query } = itemPagePath(id);
    return client.url(path, query);
  };
  const plays = itemPage;

  /** Saves an item's whole video (POST set_video) and answers with what was stored. */
  const saveVideo = async (itemId: string, video: VideoBody) =>
    (await client.post<{ video: StoredVideo }>('/api/admin/catalog', { type: 'set_video', itemId, video })).video;

  server.registerTool(
    'catalog_versions',
    {
      title: 'Catalog versions',
      description:
        "Live version numbers and release notes of MediaMake catalog items: skills, MCPs (e.g. mcp/browse-hack), apps. With items: each one's live version and its recent releases with notes, newest first. Without: every item this account can open, with its live version. Compare with what is installed (~/.mediamake/installed.json, or an MCP's own status tool) to tell the user whether something is behind and what changed; updating follows the Update section of https://github.com/microfox-ai/mediamake/blob/main/install.md.",
      inputSchema: {
        items: z
          .array(z.string())
          .max(50)
          .optional()
          .describe('Item ids, e.g. ["mcp/browse-hack", "skill/make-lyrics-video"]'),
        notes: z.number().int().min(1).max(50).default(5).describe('Releases (with notes) per item'),
      },
      annotations: READ,
    },
    safe(async ({ items, notes }) => {
      if (items?.length) {
        return json(await client.get('/api/catalog/versions', { items: items.join(','), notes }));
      }
      const { items: catalog } = await client.get<{ items: any[] }>('/api/catalog');
      return json({
        items: catalog.map(({ id, kind, title, version, status }) => ({ id, kind, title, version: version ?? null, status })),
      });
    }),
  );

  server.registerTool(
    'catalog_items',
    {
      title: 'Catalog items (admins)',
      description:
        'Admins only. Every MediaMake catalog item (skills, MCPs, apps, tutorials, courses) in a line each: the lowest membership that opens it (tier: public, plus, pro, cohort, or vault for admins only; the ladder is strict, so each tier opens everything below it), its readiness (beta, or ready with the productions that prove it), where it comes from (our package, a skill in the repo, open source or hosted by its maker, a page of the app), whether it is archived, its health when it has one (healthy, inactive, archived, failed with the reason), the MCPs it works with, what uses it, and its release page. Filter by kind, tier, readiness, archived, health or words in the id or title. Start here before archiving, moving or sharing items.',
      inputSchema: {
        kind: KIND.optional(),
        tier: ITEM_TIER.optional(),
        readiness: z.enum(['beta', 'ready']).optional(),
        archived: z.boolean().optional().describe('true: only archived items; false: only the ones in use; leave out for both'),
        health: HEALTH.optional().describe('Only items with this health (one that says nothing is healthy)'),
        query: z.string().optional().describe('Words in the id or title'),
      },
      annotations: READ,
    },
    safe(async ({ kind, tier, readiness, archived, health, query }) => {
      const { items } = await client.get<{ items: { page: string; tier: string }[] }>('/api/admin/catalog/items', {
        kind,
        tier: tier && storedTier(tier),
        readiness,
        archived,
        health,
        q: query,
      });
      return json({
        count: items.length,
        items: items.map(item => ({ ...item, tier: shownTier(item.tier), page: client.url(item.page) })),
        dashboard: client.url('/core/releases'),
      });
    }),
  );

  server.registerTool(
    'catalog_item',
    {
      title: 'Catalog item (admins)',
      description:
        'Admins only. Everything about one catalog item: what it is, the lowest membership that opens it, how many people hold each membership and the grants that reach it, whether it is Beta or Ready (with its proof), its health, whether it is archived, where it lives (who makes it, its code, its package and how it installs), what installing it does (the steps, and the MCPs it offers as choices with what each is for and what is lost without it), what needs or uses it, its video (an intro, a tutorial, or the lessons of a course), and its versions with release notes. Answers with its release page link: give it to the user.',
      inputSchema: { item: ITEM_ID },
      annotations: READ,
    },
    safe(async ({ item }) => {
      const { names: _names, plan, ...detail } = await client.get('/api/admin/catalog/item', { id: item });
      return json({
        page: page(item),
        ...detail,
        install: plan.ok ? { steps: (plan.steps as PlanStep[]).map(stepLine), choices: plan.choices } : { error: plan.error },
      });
    }),
  );

  server.registerTool(
    'catalog_archive',
    {
      title: 'Archive catalog items (admins)',
      description:
        "Admins only. Archive items that are unused or no longer important (skills, MCPs, apps, tutorials; a skill from the repo too), or bring them back with archived: false. An archived item keeps its access and still installs by its link, but leaves the homepage and moves to the end of /skills. Check with catalog_items first (its usedBy says what relies on an item). Give the user the release page links it answers with.",
      inputSchema: {
        items: z.array(ITEM_ID).min(1).max(200),
        archived: z.boolean().default(true).describe('false brings them back to the homepage'),
        note: z.string().max(500).optional().describe("Why, shown on each item's release page"),
      },
      annotations: { ...WRITE, idempotentHint: true },
    },
    safe(async ({ items, archived, note }) => {
      await client.post('/api/admin/catalog', { type: 'set_archived', itemIds: items, archived, note });
      return json({ archived, items: items.map(id => ({ id, page: page(id) })) });
    }),
  );

  server.registerTool(
    'catalog_set_health',
    {
      title: "Set items' health (admins)",
      description:
        "Admins only. Say whether items work right now, for any kind (skills, MCPs, apps, tutorials), shown on their cards and item pages: healthy (works), inactive (works, but nobody uses or looks after it now), archived (kept for reference, no longer maintained) or failed (broken: people shouldn't install it until it is fixed). failed needs the reason in note: it is shown with the item. A failed item leaves the public site and Explore's default view, and stays on its own page with the reason. default clears an admin's mark, back to the repo's default (healthy when it has none). catalog_items shows each item's health (and filters by it). Give the user the release page links it answers with.",
      inputSchema: {
        items: z.array(ITEM_ID).min(1).max(200),
        health: z.enum(['healthy', 'inactive', 'archived', 'failed', 'default']),
        note: z.string().max(500).optional().describe("Why, shown with the health on the item's page. Required for failed: say what is broken"),
      },
      annotations: { ...WRITE, idempotentHint: true },
    },
    safe(async ({ items, health, note }) => {
      if (health === 'failed' && !note?.trim()) throw new Error('A failed item needs its reason: say what is broken in note');
      await client.post('/api/admin/catalog', { type: 'set_health', itemIds: items, health: health === 'default' ? null : health, note });
      return json({ health, items: items.map(id => ({ id, page: page(id) })) });
    }),
  );

  server.registerTool(
    'catalog_set_listing',
    {
      title: "Set an item's store listing (admins)",
      description:
        "Admins only. Set a skill's, MCP's or app's store listing, shown on its own page and in its dialog. tags: words people look for it by, added beside the ones it already has, such as a skill's category. media: screenshots, pictures and videos of the item by https link, like an app store listing's (a video is a YouTube link, or an MP4 or WebM). description: what it is, for people, in a line or two, shown instead of its summary. headshot: its 16:9 picture by https link, shown on its cards (without one, its video's thumbnail is used). icon: an MCP's or an app's square icon by https link. readme: its README in Markdown, the left side of its page, for an item without a README.md of its own (a repo skill's README.md is a file in its folder): a video link alone on the first line, then `# Title`, what it does, and `## How to use`; it introduces the item and never explains how it works (that stays in SKILL.md). Each one given replaces what was there: give the whole list or text, an empty list or empty text to clear it; left out, it stays. Only real pictures and videos of the item: never invent a link. Answers with the release page link: give it to the user.",
      inputSchema: {
        item: ITEM_ID,
        tags: z.array(z.string().min(1).max(30)).max(12).optional().describe('The tags an admin adds, e.g. ["anime", "lyric-video"]; stored in lowercase with dashes'),
        media: z
          .array(
            z.object({
              kind: z.enum(['image', 'video']),
              url: z.string().describe('Its https link: a picture, a YouTube video, or an MP4 or WebM clip'),
              title: z.string().max(120).optional().describe('What it shows, in a few words'),
            }),
          )
          .max(12)
          .optional()
          .describe('The screenshots, in the order they show'),
        description: z.string().max(300).optional().describe('What it is, for people, in a line or two; empty clears it'),
        headshot: z.string().max(1000).optional().describe('Its 16:9 picture, by https link; empty clears it'),
        icon: z.string().max(1000).optional().describe("An MCP's or an app's square icon, by https link; empty clears it"),
        readme: z.string().max(32768).optional().describe('Its README in Markdown; empty clears it'),
      },
      annotations: { ...WRITE, idempotentHint: true },
    },
    safe(async ({ item, tags, media, description, headshot, icon, readme }) => {
      const texts = { description, headshot, icon, readme };
      const given = Object.fromEntries(Object.entries(texts).filter(([, value]) => value !== undefined));
      if (!tags && !media && !Object.keys(given).length) throw new Error('Give tags, media, description, headshot, icon or readme');
      const { listing } = await client.post<{ listing: unknown }>('/api/admin/catalog', { type: 'set_listing', itemId: item, ...(tags && { tags }), ...(media && { media }), ...given });
      return json({ item, listing, page: page(item) });
    }),
  );

  server.registerTool(
    'catalog_set_readiness',
    {
      title: 'Mark items Ready or Beta (admins)',
      description:
        "Admins only. Say how proven items are, for any kind, ours or made by others. Everything starts as beta. ready means battle tested, and needs proof on record: at least one finished production made with it (its title, and a link when it has one), because we publish nothing we don't use. The item's page shows them as a Made with this gallery, like a store listing, after its trailer (catalog_set_video): give each production a YouTube link, a picture or a clip when there is one (files are uploaded on its release page, this tool takes links). An MCP also needs to be shown in use: a skill that uses it (catalog_items' usedBy) or a video on it. Only Ready items appear on the public site; Beta items appear in the app's Explore with a Beta badge. Ask the user for the production if they didn't name one: never invent it. beta takes the mark and its proof away. Give the user the release page links it answers with.",
      inputSchema: {
        items: z.array(ITEM_ID).min(1).max(200),
        readiness: z.enum(['ready', 'beta']),
        proof: z
          .array(
            z.object({
              title: z.string().min(1).max(200).describe('What was made with it'),
              url: z.string().optional().describe('Where it can be seen (https). A YouTube link plays in the gallery on the item\'s page'),
              image: z.string().optional().describe('A picture of it (an https link to a screenshot, poster or frame): its tile in the gallery'),
              video: z.string().optional().describe('A clip of it (an https link to an MP4 or WebM), played in the gallery'),
            }),
          )
          .max(20)
          .optional()
          .describe('With ready: the finished productions made with it'),
        note: z.string().max(500).optional(),
      },
      annotations: { ...WRITE, idempotentHint: true },
    },
    safe(async ({ items, readiness, proof, note }) => {
      if (readiness === 'ready' && !proof?.length) throw new Error('Ready needs proof: at least one finished production made with it (title, and url when it has one)');
      if (readiness === 'beta' && proof?.length) throw new Error('beta takes the mark away: give no proof');
      await client.post('/api/admin/catalog', { type: 'set_readiness', itemIds: items, readiness, proof, note });
      return json({ readiness, ...(proof && { proof }), items: items.map(id => ({ id, page: page(id) })) });
    }),
  );

  server.registerTool(
    'catalog_set_stage',
    {
      title: 'Set who can open a catalog item (admins)',
      description:
        "Admins only. Set the lowest membership that opens one of our apps, MCPs, tutorials, courses or packaged skills: public (everyone, once public releases are open site-wide), plus, pro, cohort (the cohort and admins; invisible to everyone below) or vault (admins and explicit grants only, never published). The ladder is strict: Pro opens what Plus opens, the cohort opens what Pro opens. With gateDays or publicAt, a gate starts: the item keeps this tier now and goes public by itself then. A skill in the public repo and an item made by others are always public, so they can't be moved: archive them instead to take them off the homepage. Confirm with the user before making something public. Answers with the release page link: give it to the user.",
      inputSchema: {
        item: ITEM_ID,
        stage: ITEM_TIER.describe('The tier: public, plus, pro, cohort or vault'),
        gateDays: z.number().int().min(1).max(365).optional().describe('With plus, pro or cohort: go public by itself after this many days'),
        publicAt: z.string().optional().describe('With plus, pro or cohort: go public by itself on this date (ISO, in the future)'),
      },
      annotations: WRITE,
    },
    safe(async ({ item, stage, gateDays, publicAt }) => {
      const gated = stage === 'plus' || stage === 'pro' || stage === 'cohort';
      if ((gateDays || publicAt) && !gated) throw new Error('gateDays and publicAt only go with plus, pro or cohort');
      const { item: record, definedIn } = await client.get('/api/admin/catalog/item', { id: item });
      if (record.inRepo || record.madeBy) {
        throw new Error(`${item} is always public (${record.madeBy ? `made by ${record.madeBy.name}` : 'a skill in the public repo'}): archive it instead to take it off the homepage`);
      }
      if (definedIn !== 'database') throw new Error(`${item} is defined in the repo (lib/catalog/${definedIn}): change it there`);
      // a record stored before the ladder has a stage only: development was the cohort, community was Pro
      const current: ItemTier = record.neverPublish
        ? 'vault'
        : record.tier
          ? shownTier(record.tier)
          : ({ private: 'cohort', network: 'pro', public: 'public' } as const)[record.visibility as 'private'];
      if (current === stage && !gateDays && !publicAt) return json({ item, stage, unchanged: true, page: page(item) });

      const act = (body: Record<string, unknown>) => client.post<{ item: { publicAt?: string } }>('/api/admin/catalog', { itemId: item, ...body });
      if (current !== stage) await act({ type: 'set_item_tier', tier: storedTier(stage) });
      const gateEnds = gateDays || publicAt ? (await act({ type: 'schedule_release', days: gateDays, at: publicAt })).item.publicAt : undefined;
      return json({ item, stage, ...(gateEnds && { goesPublicAt: gateEnds }), page: page(item) });
    }),
  );

  server.registerTool(
    'catalog_add_third_party',
    {
      title: 'List an MCP or skill made by others (admins)',
      description:
        "Admins only. List (or update) an MCP or skill someone else makes, open source or hosted by its maker, so MediaMake's skills can point at it and one install prompt adds it. It is always public and has no package of ours: give who makes it (madeBy) and where it installs from (source: an MCP server's local command, hosted URL or .mcpb, or a skill folder on GitHub). Skills name it by its id in their SKILL.md MCP table. To keep it in the repo too, add the same entry to apps/mediamake/lib/catalog/third-party.json. Answers with its release page link.",
      inputSchema: {
        id: ITEM_ID,
        title: z.string().min(1).max(120),
        summary: z.string().max(500).describe('What it does, in a sentence or two'),
        madeBy: z.object({
          name: z.string().describe('Who makes it, e.g. ElevenLabs'),
          repo: z.string().optional().describe('Its code on GitHub, owner/name, when it is open source'),
          license: z.string().optional().describe('SPDX id, e.g. MIT'),
          homepage: z.string().optional(),
        }),
        source: SOURCE,
        notes: z.string().max(1000).optional().describe('Shown before installing: accounts, costs, apps it needs'),
        tags: z.array(z.string()).optional(),
      },
      annotations: { ...WRITE, idempotentHint: true },
    },
    safe(async ({ id, title, summary, madeBy, source, notes, tags }) => {
      const [kind, slug] = id.split('/');
      await client.post('/api/admin/catalog', {
        type: 'upsert_item',
        item: { kind, slug, title, summary, status: 'live', tags, madeBy, install: { source, ...(notes && { notes }) } },
      });
      return json({ id, page: page(id), itemPage: itemPage(id) });
    }),
  );

  server.registerTool(
    'catalog_set_video',
    {
      title: "Set a catalog item's video (admins)",
      description:
        "Admins only. Set, change or remove the video of a catalog item: a skill's intro (or an MCP's or app's), a tutorial's video, or a course's lessons. Only YouTube videos play, with YouTube's player. Fields left out keep what the item has, so a new title alone renames it; an item with no video yet needs its title and url (a course: lessons). An intro plays on the item's page and its thumbnail tops the item's homepage card; a tutorial's or course's card takes the video's title and first paragraph. catalog_item shows the current video, and for a course the tutorials it can play. Answers with the release page and where the video plays: give the user both.",
      inputSchema: withoutLocalArgs(
        { item: ITEM_ID, ...VIDEO_FIELDS, remove: z.boolean().optional().describe('true takes the video off the item') },
        LOCAL_ARGS,
        options,
      ),
      annotations: { ...WRITE, idempotentHint: true },
    },
    safe(async ({ item, remove, url, title, description, thumbnail, thumbnailFile, lessons }) => {
      rejectLocalArgs(options, { thumbnailFile });
      if (remove) {
        if ([url, title, description, thumbnail, thumbnailFile, lessons].some(v => v !== undefined)) throw new Error('remove takes the video off: give no other fields');
        await client.post('/api/admin/catalog', { type: 'set_video', itemId: item, video: null });
        return json({ item, video: null, page: page(item) });
      }
      if (thumbnail !== undefined && thumbnailFile) throw new Error('Give thumbnail or thumbnailFile, not both');
      const file = thumbnailFile ? await readThumbnail(thumbnailFile) : undefined;

      const { video: current } = await client.get<{ video: StoredVideo | null }>('/api/admin/catalog/item', { id: item });
      const newTitle = title ?? current?.title;
      if (!newTitle) throw new Error(`${item} has no video yet: give its title and ${item.startsWith('course/') ? 'lessons' : 'url'}`);
      const video: VideoBody = {
        url: url ?? (current?.youtubeId ? youtubeLink(current.youtubeId) : undefined),
        title: newTitle,
        description: description ?? current?.description,
        thumbnail: thumbnail === undefined ? current?.thumbnail : (thumbnail ?? undefined),
        lessons: lessons ?? current?.lessons,
      };
      // the video is saved (and checked) before the upload, so a refused one uploads nothing
      let saved = await saveVideo(item, video);
      if (file) saved = await saveVideo(item, { ...video, thumbnail: await uploadThumbnail(client, item, file) });
      return json({ item, video: shownVideo(saved), page: page(item), plays: plays(item) });
    }),
  );

  server.registerTool(
    'catalog_add_video_item',
    {
      title: 'Add a tutorial or course (admins)',
      description:
        "Admins only. Add a tutorial (one YouTube video, played on its page) or a course (tutorials played in order on its own page, /courses/<slug>) to the catalog. Its card takes the video's title and the first paragraph of its description. It starts with the cohort (the cohort and admins): move it on with catalog_set_stage once the user says so. Its id is <kind>/<slug>, the slug made from the title unless given. Change it later with catalog_set_video (a course's lessons too). Answers with the release page and where it plays: give the user both.",
      inputSchema: withoutLocalArgs(
        {
          kind: z.enum(['tutorial', 'course']),
          slug: z
            .string()
            .regex(/^[a-z0-9][a-z0-9-]{0,63}$/, 'lowercase letters, digits and dashes')
            .optional()
            .describe('Leave out to make it from the title'),
          ...VIDEO_FIELDS,
          title: z.string().min(1).max(120),
        },
        LOCAL_ARGS,
        options,
      ),
      annotations: WRITE,
    },
    safe(async ({ kind, slug, url, title, description, thumbnail, thumbnailFile, lessons }) => {
      rejectLocalArgs(options, { thumbnailFile });
      if (thumbnail != null && thumbnailFile) throw new Error('Give thumbnail or thumbnailFile, not both');
      const file = thumbnailFile ? await readThumbnail(thumbnailFile) : undefined;
      const itemSlug = slug ?? slugify(title);
      if (!itemSlug) throw new Error(`No id can be made from "${title}": give a slug`);
      const id = `${kind}/${itemSlug}`;

      const video: VideoBody = { url, title, description, thumbnail: thumbnail ?? undefined, lessons: kind === 'course' ? (lessons ?? []) : lessons };
      let { video: saved } = await client.post<{ video: StoredVideo }>('/api/admin/catalog', { type: 'create_video_item', kind, slug: itemSlug, video });
      if (file) {
        try {
          saved = await saveVideo(id, { ...video, thumbnail: await uploadThumbnail(client, id, file) });
        } catch (error) {
          throw new Error(`Added ${id} (${page(id)}), but its thumbnail didn't upload: ${(error as Error).message}. Try again with catalog_set_video.`);
        }
      }
      return json({ item: id, stage: 'cohort', video: shownVideo(saved), page: page(id), plays: plays(id) });
    }),
  );

  /** The admin dashboard's data: everything about people in one call. */
  const people = () => client.get<AdminPeople>('/api/admin/catalog');

  /** Each person's tier: the highest of their live memberships, or their earlier group until the migration clears it. */
  const tiersOf = (data: AdminPeople) => {
    const now = new Date().toISOString();
    const rank = (tier: string) => ['public', 'plus', 'pro', 'cohort'].indexOf(tier);
    const live = (data.memberships ?? []).filter(m => !m.revokedAt && (!m.expiresAt || m.expiresAt > now));
    const held = new Map<string, { tier: (typeof MEMBER_TIERS)[number]; membership?: MembershipRecord }>();
    for (const membership of live) {
      const current = held.get(membership.clientId);
      if (!current || rank(membership.tier) > rank(current.tier)) held.set(membership.clientId, { tier: membership.tier, membership });
    }
    for (const group of data.groups) {
      const tier = EARLIER_GROUPS[group.groupId];
      if (!tier) continue;
      for (const clientId of group.members) {
        const current = held.get(clientId);
        if (!current || rank(tier) > rank(current.tier)) held.set(clientId, { tier });
      }
    }
    return held;
  };

  server.registerTool(
    'catalog_people',
    {
      title: 'Members and their tiers (admins)',
      description:
        "Admins only. Who holds each membership: the cohort (everything but the vault; invisible to everyone below, admin-given only), Pro, Plus (cloud projects and Plus items), and everyone else with an API key (public). The ladder is strict: each tier opens everything below it. Each member comes with how they got it (an admin grant, a contribution with its PR or item, an invite from before they were retired, carried over from the earlier tiers), how long it lasts (a contribution lasts 3 months and renews by contributing again, unless an admin made it permanent) and its membership id. Also the pending access requests. Use it before catalog_set_tier to find people by name.",
      inputSchema: {},
      annotations: READ,
    },
    safe(async () => {
      const data = await people();
      const name = (clientId: string) => data.people.find(p => p.clientId === clientId)?.name ?? clientId;
      const held = tiersOf(data);
      const members = (tier: (typeof MEMBER_TIERS)[number]) =>
        [...held]
          .filter(([, value]) => value.tier === tier)
          .map(([clientId, { membership }]) => ({
            clientId,
            name: name(clientId),
            ...(membership
              ? {
                  how: membership.source + (membership.ref ? ` (${membership.ref})` : ''),
                  lasts: lasts(membership),
                  ...(membership.note && { note: membership.note }),
                  membership: membership.membershipId,
                }
              : { how: 'the earlier tiers, with no membership record yet: `npm run catalog -- migrate-tiers` gives them one' }),
          }));
      return json({
        cohort: members('cohort'),
        pro: members('pro'),
        plus: members('plus'),
        public: data.people.filter(p => !held.has(p.clientId)).map(p => ({ clientId: p.clientId, name: p.name })),
        pendingRequests: data.requests.map(r => ({ who: name(r.clientId), item: r.itemId, ...(r.message && { message: r.message }) })),
        page: client.url('/core/releases', { tab: 'people' }),
      });
    }),
  );

  server.registerTool(
    'catalog_set_tier',
    {
      title: 'Give people a membership (admins)',
      description:
        "Admins only. Put people at a tier: plus, pro, cohort, or public (takes their membership away). Each person holds one tier, so this moves them: their live memberships end (kept as history) and one new record gives the tier, saying how they got it. source says how: admin (the default: you gave it, say why in note), contribution (earned with an accepted item or merged PR: name it in ref; it lasts 3 months and renews by contributing again) or paid. days sets how long it lasts; permanent: true makes it last until an admin removes it. Name people by client id or by the name on their API key (catalog_people lists them). Someone without a MediaMake account yet signs up first (/signup); there are no invite links. To make an existing membership permanent or end it without moving the person, use catalog_membership.",
      inputSchema: {
        people: z.array(z.string().min(1)).min(1).max(50).describe('Client ids or names'),
        tier: PEOPLE_TIER,
        source: SOURCE_OF.optional().describe('How they got it. Default admin'),
        ref: z.string().max(500).optional().describe('What earned it: a PR link or a catalog item id'),
        note: z.string().max(500).optional().describe('Why, kept on the record'),
        days: z.number().int().min(1).max(3650).optional().describe('How long it lasts. Without it a contribution lasts 3 months and the rest until removed'),
        permanent: z.boolean().optional().describe('true: no expiry, until an admin removes it'),
      },
      annotations: { ...WRITE, idempotentHint: true },
    },
    safe(async ({ people: who, tier, source, ref, note, days, permanent }) => {
      const data = await people();
      const resolved: { clientId: string; name: string }[] = [];
      const problems: string[] = [];
      for (const typed of who.map(w => w.trim())) {
        const byId = data.people.find(p => p.clientId === typed);
        const byName = data.people.filter(p => p.name.toLowerCase() === typed.toLowerCase());
        if (byId) resolved.push(byId);
        else if (byName.length === 1) resolved.push(byName[0]);
        else if (byName.length > 1) problems.push(`"${typed}" matches ${byName.map(p => p.clientId).join(', ')}: use the client id`);
        else problems.push(`No one with an API key is called "${typed}": check catalog_people; someone without an account signs up first (/signup)`);
      }
      if (problems.length) throw new Error(problems.join('\n'));
      const given: { clientId: string; name: string; lasts?: string }[] = [];
      for (const person of resolved) {
        const { membership } = await client.post<{ membership: MembershipRecord | null }>('/api/admin/catalog', {
          type: 'set_tier',
          clientId: person.clientId,
          tier,
          source,
          ref,
          note,
          days,
          permanent,
        });
        given.push({ clientId: person.clientId, name: person.name, ...(membership && { lasts: lasts(membership), membership: membership.membershipId }) });
      }
      return json({ tier, people: given, page: client.url('/core/releases', { tab: 'people' }) });
    }),
  );

  server.registerTool(
    'catalog_membership',
    {
      title: 'Make a membership permanent, renew it or end it (admins)',
      description:
        "Admins only. Change one membership without moving the person. make-permanent: it has no expiry any more and lasts until an admin removes it (a contribution otherwise ends after 3 months). renew: add a record beside the ones the person has, for contributing again (give person, tier and ref: the new PR or item); it lasts 3 months from now. end: the membership stops now, and the person falls back to their next live one, or to public. catalog_people shows each member's membership id.",
      inputSchema: {
        action: z.enum(['make-permanent', 'renew', 'end']),
        membership: z.string().optional().describe('The membership id (mem_...), for make-permanent and end'),
        person: z.string().optional().describe('With renew: the client id'),
        tier: PEOPLE_TIER.exclude(['public']).optional().describe('With renew: the tier the contribution earns'),
        ref: z.string().max(500).optional().describe('With renew: the PR link or catalog item id that earned it'),
        note: z.string().max(500).optional(),
      },
      annotations: WRITE,
    },
    safe(async ({ action, membership, person, tier, ref, note }) => {
      const peoplePage = client.url('/core/releases', { tab: 'people' });
      if (action === 'renew') {
        if (!person || !tier || !ref) throw new Error('renew needs person (a client id), tier and ref (the PR or item that earned it)');
        const added = await client.post<{ membership: MembershipRecord }>('/api/admin/catalog', { type: 'add_membership', clientId: person, tier, source: 'contribution', ref, note });
        return json({ action, person, tier, lasts: lasts(added.membership), membership: added.membership.membershipId, page: peoplePage });
      }
      if (!membership) throw new Error(`${action} needs the membership id (catalog_people shows it)`);
      if (action === 'make-permanent') {
        const made = await client.post<{ membership: MembershipRecord }>('/api/admin/catalog', { type: 'membership_permanent', membershipId: membership });
        return json({ action, person: made.membership.clientId, tier: made.membership.tier, lasts: lasts(made.membership), membership, page: peoplePage });
      }
      await client.post('/api/admin/catalog', { type: 'revoke_membership', membershipId: membership, note });
      return json({ action, membership, page: peoplePage });
    }),
  );
}
