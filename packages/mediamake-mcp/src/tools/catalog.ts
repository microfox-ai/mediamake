import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { MediamakeClient } from '../client.js';
import { json, safe } from '../util.js';

const READ = { readOnlyHint: true, openWorldHint: true } as const;
const WRITE = { readOnlyHint: false, destructiveHint: false, openWorldHint: true } as const;

const ITEM_ID = z
  .string()
  .regex(/^(skill|mcp|app|tutorial)\/[a-z0-9][a-z0-9-]{0,63}$/, 'a catalog id such as skill/pack-brand-kit or mcp/browse-hack')
  .describe('Catalog item id, e.g. "skill/pack-brand-kit" or "mcp/browse-hack"');
const KIND = z.enum(['skill', 'mcp', 'app', 'tutorial']);
const TIER = z.enum(['vault', 'development', 'community', 'public']);

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

export function registerCatalogTools(server: McpServer, client: MediamakeClient) {
  /** The item's release page on the admin dashboard: give it to the user after any change. */
  const page = (id: string) => client.url(`/core/releases/${id}`);

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
        'Admins only. Every MediaMake catalog item (skills, MCPs, apps, tutorials) in a line each: who can open it (tier: vault, development, community or public), where it comes from (our package, a skill in the repo, open source or hosted by its maker, a page of the app), whether it is archived, the MCPs it works with, what uses it, and its release page. Filter by kind, tier, archived or words in the id or title. Start here before archiving, moving or sharing items.',
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
        'Admins only. Everything about one catalog item: what it is, who can open it and the grants that reach it, whether it is archived, where it lives (who makes it, its code, its package and how it installs), what installing it does (the steps, and the MCPs it offers as choices with what each is for and what is lost without it), what needs or uses it, and its versions with release notes. Answers with its release page link: give it to the user.',
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
        "Admins only. Move one of our apps, MCPs or tutorials between release tiers: development (admins and private testers), community (also the community group), public (everyone, once public releases are open site-wide) or vault (admins and explicit grants only, never published). With gateDays or publicAt, community starts a gate: it goes public by itself then. Skills and items made by others are always public, so they can't be moved: archive them instead to take them off the homepage. Confirm with the user before making something public. Answers with the release page link: give it to the user.",
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
    'catalog_invite',
    {
      title: 'Invite people to catalog items (admins)',
      description:
        'Admins only. Make an invite link that opens gated items (our apps and MCPs in development or community) for whoever redeems it while signed in; send it to the people the user names. uses is how many people it works for, grantDays how long their access lasts (leave out for no limit), expiresInDays how long the link itself stays valid.',
      inputSchema: {
        items: z.array(ITEM_ID).min(1).max(20),
        uses: z.number().int().min(1).max(100).default(1),
        grantDays: z.number().int().min(1).max(365).optional(),
        expiresInDays: z.number().int().min(1).max(365).optional(),
        note: z.string().max(200).optional().describe('Who it is for, shown to admins'),
      },
      annotations: WRITE,
    },
    safe(async ({ items, uses, grantDays, expiresInDays, note }) => {
      const { invite } = await client.post<{ invite: { code: string; maxUses: number; expiresAt?: string } }>('/api/admin/catalog', {
        type: 'create_invite',
        itemIds: items,
        maxUses: uses,
        grantDays,
        expiresInDays,
        note,
      });
      return json({
        link: client.url('/access', { code: invite.code }),
        uses: invite.maxUses,
        ...(invite.expiresAt && { expiresAt: invite.expiresAt }),
        items: items.map(id => ({ id, page: page(id) })),
      });
    }),
  );
}
