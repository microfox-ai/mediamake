import { readFile } from 'node:fs/promises';
import { basename } from 'node:path';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { MediamakeClient } from '../client.js';
import { json, mimeFromName, rejectLocalArgs, safe, withoutLocalArgs, type ToolOptions } from '../util.js';

const READ = { readOnlyHint: true, openWorldHint: true } as const;
const WRITE = { readOnlyHint: false, destructiveHint: false, openWorldHint: true } as const;

const ITEM_ID = z
  .string()
  .regex(/^(skill|mcp|app|tutorial|course)\/[a-z0-9][a-z0-9-]{0,63}$/, 'a catalog id such as skill/pack-brand-kit or mcp/browse-hack')
  .describe('Catalog item id, e.g. "skill/pack-brand-kit" or "mcp/browse-hack"');
const KIND = z.enum(['skill', 'mcp', 'app', 'tutorial', 'course']);
const TIER = z.enum(['vault', 'development', 'community', 'public']);
/** A person's tier; the community is stored as the `network` access group. */
const PEOPLE_TIER = z.enum(['private', 'community', 'public']);
const GROUP_OF = { private: 'private', community: 'network' } as const;

/** What catalog_people and catalog_set_tier read from GET /api/admin/catalog. */
type AdminPeople = {
  people: { clientId: string; name: string; activeKeys: number }[];
  groups: { groupId: string; members: string[] }[];
  invites: { code: string; groupId?: string; uses: number; maxUses: number; expiresAt?: string; disabledAt?: string }[];
  requests: { clientId: string; itemId: string; message?: string }[];
};

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
      .object({ url: z.string(), headers: z.array(MCP_SETTING).optional(), connectorUrl: z.string().optional() })
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
  /** Where the item's video plays: a course's own page, else the item's page. */
  const plays = (id: string) => (id.startsWith('course/') ? client.url(`/${id.replace('course/', 'courses/')}`) : client.url('/access', { item: id }));

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
        'Admins only. Every MediaMake catalog item (skills, MCPs, apps, tutorials, courses) in a line each: who can open it (tier: vault, development, community or public), where it comes from (our package, a skill in the repo, open source or hosted by its maker, a page of the app), whether it is archived, the MCPs it works with, what uses it, and its release page. Filter by kind, tier, archived or words in the id or title. Start here before archiving, moving or sharing items.',
      inputSchema: {
        kind: KIND.optional(),
        tier: TIER.optional(),
        archived: z.boolean().optional().describe('true: only archived items; false: only the ones in use; leave out for both'),
        query: z.string().optional().describe('Words in the id or title'),
      },
      annotations: READ,
    },
    safe(async ({ kind, tier, archived, query }) => {
      const { items } = await client.get<{ items: { page: string }[] }>('/api/admin/catalog/items', { kind, tier, archived, q: query });
      return json({
        count: items.length,
        items: items.map(item => ({ ...item, page: client.url(item.page) })),
        dashboard: client.url('/core/releases'),
      });
    }),
  );

  server.registerTool(
    'catalog_item',
    {
      title: 'Catalog item (admins)',
      description:
        'Admins only. Everything about one catalog item: what it is, who can open it and the grants that reach it, whether it is archived, where it lives (who makes it, its code, its package and how it installs), what installing it does (the steps, and the MCPs it offers as choices with what each is for and what is lost without it), what needs or uses it, its video (an intro, a tutorial, or the lessons of a course), and its versions with release notes. Answers with its release page link: give it to the user.',
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
    'catalog_set_stage',
    {
      title: 'Move a catalog item (admins)',
      description:
        "Admins only. Move one of our apps, MCPs, tutorials or courses between release tiers: development (admins and private testers), community (also the community group), public (everyone, once public releases are open site-wide) or vault (admins and explicit grants only, never published). With gateDays or publicAt, community starts a gate: it goes public by itself then. Skills and items made by others are always public, so they can't be moved: archive them instead to take them off the homepage. Confirm with the user before making something public. Answers with the release page link: give it to the user.",
      inputSchema: {
        item: ITEM_ID,
        stage: z.enum(['development', 'community', 'public', 'vault']),
        gateDays: z.number().int().min(1).max(365).optional().describe('With stage community: go public by itself after this many days'),
        publicAt: z.string().optional().describe('With stage community: go public by itself on this date (ISO, in the future)'),
      },
      annotations: WRITE,
    },
    safe(async ({ item, stage, gateDays, publicAt }) => {
      if ((gateDays || publicAt) && stage !== 'community') throw new Error('gateDays and publicAt only go with stage community');
      const { item: record, definedIn } = await client.get('/api/admin/catalog/item', { id: item });
      if (record.kind === 'skill' || record.madeBy) {
        throw new Error(`${item} is always public (${record.madeBy ? `made by ${record.madeBy.name}` : 'a skill'}): archive it instead to take it off the homepage`);
      }
      if (definedIn !== 'database') throw new Error(`${item} is defined in the repo (lib/catalog/${definedIn}): change it there`);
      const current = record.neverPublish ? 'vault' : ({ private: 'development', network: 'community', public: 'public' } as const)[record.visibility as 'private'];
      if (current === stage && !gateDays && !publicAt) return json({ item, stage, unchanged: true, page: page(item) });

      const act = (body: Record<string, unknown>) => client.post<{ item: { publicAt?: string } }>('/api/admin/catalog', { itemId: item, ...body });
      // nothing moves out of the vault but by taking it out first
      if (record.neverPublish && stage !== 'vault') await act({ type: 'set_never_publish', neverPublish: false });
      let gateEnds: string | undefined;
      if (stage === 'vault') await act({ type: 'set_never_publish', neverPublish: true });
      else if (stage === 'community' && (gateDays || publicAt)) gateEnds = (await act({ type: 'schedule_release', days: gateDays, at: publicAt })).item.publicAt;
      else if (stage !== 'development' || !record.neverPublish) {
        await act({ type: 'set_visibility', visibility: { development: 'private', community: 'network', public: 'public' }[stage] });
      }
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
      return json({ id, page: page(id), installPage: client.url('/access', { item: id }) });
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
        "Admins only. Add a tutorial (one YouTube video, played on its page) or a course (tutorials played in order on its own page, /courses/<slug>) to the catalog. Its card takes the video's title and the first paragraph of its description. It starts in development (admins and private testers): move it on with catalog_set_stage once the user says so. Its id is <kind>/<slug>, the slug made from the title unless given. Change it later with catalog_set_video (a course's lessons too). Answers with the release page and where it plays: give the user both.",
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
      return json({ item: id, stage: 'development', video: shownVideo(saved), page: page(id), plays: plays(id) });
    }),
  );

  server.registerTool(
    'catalog_invite',
    {
      title: 'Invite people to catalog items or a tier (admins)',
      description:
        "Admins only. Make an invite link for whoever redeems it while signed in (new people sign up first); send it to the people the user names. With group, it makes them private testers (everything in development, with no per-item grants) or community members: the easy way to add people who have no MediaMake account yet. With items, it opens just those gated items. uses is how many people it works for, grantDays how long item access lasts (leave out for no limit), expiresInDays how long the link itself stays valid.",
      inputSchema: {
        items: z.array(ITEM_ID).min(1).max(20).optional(),
        group: PEOPLE_TIER.exclude(['public']).optional().describe('Make whoever redeems it a private tester or a community member'),
        uses: z.number().int().min(1).max(100).default(1),
        grantDays: z.number().int().min(1).max(365).optional(),
        expiresInDays: z.number().int().min(1).max(365).optional(),
        note: z.string().max(200).optional().describe('Who it is for, shown to admins'),
      },
      annotations: WRITE,
    },
    safe(async ({ items, group, uses, grantDays, expiresInDays, note }) => {
      if (!items?.length && !group) throw new Error('Give items, a group (private or community), or both');
      const { invite } = await client.post<{ invite: { code: string; maxUses: number; expiresAt?: string } }>('/api/admin/catalog', {
        type: 'create_invite',
        itemIds: items ?? [],
        ...(group && { groupId: GROUP_OF[group] }),
        maxUses: uses,
        grantDays,
        expiresInDays,
        note,
      });
      return json({
        link: client.url('/access', { code: invite.code }),
        uses: invite.maxUses,
        ...(invite.expiresAt && { expiresAt: invite.expiresAt }),
        ...(group && { makesThem: group === 'private' ? 'private testers' : 'community members' }),
        ...(items && { items: items.map(id => ({ id, page: page(id) })) }),
        people: client.url('/core/releases', { tab: 'people' }),
      });
    }),
  );

  /** The admin dashboard's data: everything about people in one call. */
  const people = () => client.get<AdminPeople>('/api/admin/catalog');

  server.registerTool(
    'catalog_people',
    {
      title: 'Private testers and community (admins)',
      description:
        "Admins only. Who is in each person tier: private testers (open everything in development, every MCP included, with no per-item grants), the community (community items before they go public), and everyone else with an API key (public). Also the live invite links into a tier and the pending access requests. Use it before catalog_set_tier to find people by name.",
      inputSchema: {},
      annotations: READ,
    },
    safe(async () => {
      const data = await people();
      const name = (clientId: string) => data.people.find(p => p.clientId === clientId)?.name ?? clientId;
      const members = (groupId: string) =>
        (data.groups.find(g => g.groupId === groupId)?.members ?? []).map(clientId => ({ clientId, name: name(clientId) }));
      const tiered = new Set([...members(GROUP_OF.private), ...members(GROUP_OF.community)].map(p => p.clientId));
      const now = new Date().toISOString();
      return json({
        private: members(GROUP_OF.private),
        community: members(GROUP_OF.community),
        public: data.people.filter(p => !tiered.has(p.clientId)).map(p => ({ clientId: p.clientId, name: p.name })),
        tierInvites: data.invites
          .filter(i => i.groupId && !i.disabledAt && i.uses < i.maxUses && (!i.expiresAt || i.expiresAt > now))
          .map(i => ({
            tier: i.groupId === GROUP_OF.private ? 'private' : i.groupId === GROUP_OF.community ? 'community' : i.groupId,
            link: client.url('/access', { code: i.code }),
            used: `${i.uses}/${i.maxUses}`,
            ...(i.expiresAt && { expiresAt: i.expiresAt }),
          })),
        pendingRequests: data.requests.map(r => ({ who: name(r.clientId), item: r.itemId, ...(r.message && { message: r.message }) })),
        page: client.url('/core/releases', { tab: 'people' }),
      });
    }),
  );

  server.registerTool(
    'catalog_set_tier',
    {
      title: 'Make people private testers or community (admins)',
      description:
        "Admins only. Put people in a tier: private (private testers: every MCP, app and tutorial in development opens to them at once, and every one released later, with no per-item grants), community, or public (takes them out of both). Each person is in one tier, so this moves them. Name them by client id or by the name on their API key (catalog_people lists them). Someone without a MediaMake account yet: make an invite link with catalog_invite and group instead.",
      inputSchema: {
        people: z.array(z.string().min(1)).min(1).max(50).describe('Client ids or names'),
        tier: PEOPLE_TIER,
      },
      annotations: { ...WRITE, idempotentHint: true },
    },
    safe(async ({ people: who, tier }) => {
      const data = await people();
      const resolved: { clientId: string; name: string }[] = [];
      const problems: string[] = [];
      for (const typed of who.map(w => w.trim())) {
        const byId = data.people.find(p => p.clientId === typed);
        const byName = data.people.filter(p => p.name.toLowerCase() === typed.toLowerCase());
        if (byId) resolved.push(byId);
        else if (byName.length === 1) resolved.push(byName[0]);
        else if (byName.length > 1) problems.push(`"${typed}" matches ${byName.map(p => p.clientId).join(', ')}: use the client id`);
        else problems.push(`No one with an API key is called "${typed}": check catalog_people, or invite them with catalog_invite and group "${tier === 'public' ? 'community' : tier}"`);
      }
      if (problems.length) throw new Error(problems.join('\n'));
      for (const person of resolved) {
        await client.post('/api/admin/catalog', { type: 'set_tier', clientId: person.clientId, tier });
      }
      return json({
        tier,
        people: resolved.map(p => ({ clientId: p.clientId, name: p.name })),
        page: client.url('/core/releases', { tab: 'people' }),
      });
    }),
  );
}
