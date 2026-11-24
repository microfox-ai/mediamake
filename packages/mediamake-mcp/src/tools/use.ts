import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { MediamakeClient } from '../client.js';
import { itemPagePath, json, mimeFromName, safe } from '../util.js';

/**
 * mm-use: what every MediaMake member does from Claude. Explore the catalog,
 * get an item's install plan, say which skills ran (a name and a time, never
 * more), say which skills are on the computer (names and versions) and send
 * feedback. The server is hosted and reads no files: what is on the computer
 * comes from Claude, or from the repo's hook and `mm usage`. Feedback is read
 * back too: what the account sent and what came of it, and each item's known
 * issues. A member also sends what they built to the store from here, for an
 * admin to review (submit_item, my_submissions, withdraw_submission), and an
 * item's authors set its headshot and icon (upload_item_picture,
 * set_item_pictures): the server only hands out the link a picture is sent to.
 */

const READ = { readOnlyHint: true, openWorldHint: true } as const;
const WRITE = { readOnlyHint: false, destructiveHint: false, openWorldHint: true } as const;

const INSTALL_GUIDE = 'https://github.com/microfox-ai/mediamake/blob/main/install.md';

const KIND = z.enum(['skill', 'mcp', 'app', 'tutorial', 'course']);
const ITEM_ID = z
  .string()
  .regex(/^(skill|mcp|app|tutorial|course)\/[a-z0-9][a-z0-9-]{0,63}$/, 'a catalog id such as skill/pack-brand-kit or mcp/browse-hack')
  .describe('Catalog item id, e.g. "skill/pack-brand-kit" or "mcp/browse-hack"');
/** An item with a store listing of its own: a skill, an MCP or an app. */
const LISTED_ITEM = z
  .string()
  .regex(/^(skill|mcp|app)\/[a-z0-9][a-z0-9-]{0,63}$/, 'a skill, MCP or app such as mcp/browse-hack')
  .describe('The skill, MCP or app, e.g. "mcp/browse-hack"');
/** The picture types a listing takes (LISTING_PICTURE_TYPE in the app's lib/catalog/listing.ts). */
const PICTURE_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/avif'];
/** A skill's name as Claude Code has it: its folder's name, or plugin:skill. */
const SKILL_NAME = z
  .string()
  .regex(/^[a-z0-9][a-z0-9._:-]{0,99}$/i, 'a skill name such as make-lyrics-video')
  .describe('The skill\'s name, e.g. "make-lyrics-video"');

/** A catalog entry as GET /api/catalog gives it (CatalogEntry in the app's lib/catalog/types.ts). */
type Entry = {
  id: string;
  kind: string;
  title: string;
  summary?: string;
  tier?: string;
  access?: string;
  readiness?: string;
  health?: string;
  healthNote?: string;
  version?: string;
  tags?: string[];
  href?: string;
  installPrompt?: string;
  updatePrompt?: string;
  archivedAt?: string;
  [key: string]: unknown;
};

/** One line of Explore: enough to choose from, nothing that takes a second call to read. */
function line(entry: Entry) {
  return {
    id: entry.id,
    kind: entry.kind,
    title: entry.title,
    summary: entry.summary,
    // the lowest membership that opens it, and whether this account has it
    tier: entry.tier,
    open: entry.access !== 'locked',
    readiness: entry.readiness ?? 'beta',
    ...(entry.health && entry.health !== 'healthy' && { health: entry.health, healthNote: entry.healthNote }),
    ...(entry.version && { version: entry.version }),
    ...(entry.tags?.length && { tags: entry.tags }),
  };
}

export function registerUseTools(server: McpServer, client: MediamakeClient) {
  /** An item's own page on the site (/skills/<slug>, /mcps/<slug>, /apps/<slug>): give it to the user with an answer about the item. */
  const page = (id: string) => {
    const { path, query } = itemPagePath(id);
    return client.url(path, query);
  };

  const catalog = async (kind?: string) => (await client.get<{ signedIn: boolean; items: Entry[] }>('/api/catalog', { kind, locked: 'show' })).items;

  server.registerTool(
    'explore',
    {
      title: 'Explore MediaMake',
      description:
        "MediaMake's skills, MCPs, apps, tutorials and courses: what each does, the lowest membership that opens it (public, plus, pro), whether this account can open it, and whether it is Beta or Ready. Failed and archived items are left out unless asked for. Use get_item for one item's details and install_item to install it.",
      inputSchema: {
        kind: KIND.optional(),
        query: z.string().max(100).optional().describe('Words to find in the id, title, summary or tags'),
        open: z.boolean().optional().describe('true: only what this account can open. false: only what is locked'),
        includeFailed: z.boolean().default(false).describe('Also list failed and archived items, with the reason'),
      },
      annotations: READ,
    },
    safe(async ({ kind, query, open, includeFailed }) => {
      const words = query?.toLowerCase().split(/\s+/).filter(Boolean) ?? [];
      const items = (await catalog(kind))
        .filter(entry => includeFailed || (!entry.archivedAt && entry.health !== 'failed' && entry.health !== 'archived'))
        .filter(entry => open === undefined || (entry.access !== 'locked') === open)
        .filter(entry => {
          const text = `${entry.id} ${entry.title} ${entry.summary ?? ''} ${(entry.tags ?? []).join(' ')}`.toLowerCase();
          return words.every(word => text.includes(word));
        })
        .map(line);
      return json({ count: items.length, items });
    }),
  );

  server.registerTool(
    'get_item',
    {
      title: 'One MediaMake item',
      description:
        'Everything a member sees about one item: what it is, its membership and whether this account can open it, Beta or Ready with its proof, its health, what it works with, its live version with recent release notes, and its page. A locked item says which membership opens it.',
      inputSchema: { item: ITEM_ID, notes: z.number().int().min(0).max(20).default(3).describe('Recent releases to include, with their notes') },
      annotations: READ,
    },
    safe(async ({ item, notes }) => {
      const kind = item.split('/')[0];
      const entry = (await catalog(kind)).find(e => e.id === item);
      if (!entry) throw new Error(`${item} isn't in the catalog, or this account can't see it. explore lists what there is.`);
      const { installPrompt: _installPrompt, updatePrompt: _updatePrompt, access, ...rest } = entry;
      let releases: unknown;
      if (notes > 0 && access !== 'locked') {
        try {
          releases = (await client.get<{ items?: unknown[] }>('/api/catalog/versions', { items: item, notes })).items?.[0];
        } catch {
          // an item with no packaged versions (a skill from the repo) has none to show
        }
      }
      return json({
        ...rest,
        open: access !== 'locked',
        ...(access === 'locked' && { locked: `A ${entry.tier} membership opens it. Memberships come from contributing or from an admin.` }),
        ...(releases !== undefined && { releases }),
        page: page(item),
        ...(access !== 'locked' && { install: 'install_item gives its install plan' }),
      });
    }),
  );

  server.registerTool(
    'item_versions',
    {
      title: 'Live versions',
      description:
        "Live version numbers and release notes of MediaMake items. With items: each one's live version and its recent releases, newest first. Without: every item this account can open, with its live version. Compare with what is installed (~/.mediamake/installed.json, or an MCP's own status tool) to tell the user what is behind; updating follows the Update section of " +
        INSTALL_GUIDE +
        '.',
      inputSchema: {
        items: z.array(ITEM_ID).max(50).optional(),
        notes: z.number().int().min(1).max(50).default(5).describe('Releases (with notes) per item'),
      },
      annotations: READ,
    },
    safe(async ({ items, notes }) => {
      if (items?.length) return json(await client.get('/api/catalog/versions', { items: items.join(','), notes }));
      const all = (await catalog()).filter(entry => entry.access !== 'locked');
      return json({ items: all.map(({ id, kind, title, version, readiness }) => ({ id, kind, title, version: version ?? null, readiness: readiness ?? 'beta' })) });
    }),
  );

  server.registerTool(
    'install_item',
    {
      title: 'Install an item',
      description:
        "The install plan of one item for this account: the ordered steps (the repo to clone, release files, packages with 30-minute download links, the MCPs it works with as choices). This server runs on MediaMake and installs nothing itself: carry the steps out on the user's computer as " +
        INSTALL_GUIDE +
        ' says (from its step 3 on, with this plan), then record the versions in ~/.mediamake/installed.json. Asking for a plan counts as a download of the item.',
      inputSchema: { item: ITEM_ID },
      annotations: WRITE,
    },
    safe(async ({ item }) => {
      const plan = await client.get('/api/catalog/install', { item });
      return json({ item, guide: INSTALL_GUIDE, page: page(item), plan });
    }),
  );

  server.registerTool(
    'report_skill_run',
    {
      title: 'Report a skill run',
      description:
        "Tell MediaMake that a skill ran: its name and the time, nothing else (never its arguments, files or folders). It feeds the \"what you use most\" list on the user's Home. The MediaMake repo's hook already does this on the user's computer; call it only where no hook runs (the Claude apps on the web or a phone). Never call it when the user turned usage reports off.",
      inputSchema: {
        skill: SKILL_NAME,
        at: z.string().datetime({ offset: true }).optional().describe('When it ran (ISO 8601). Default: now'),
      },
      annotations: WRITE,
    },
    safe(async ({ skill, at }) => json(await client.post('/api/usage/skill-runs', { runs: [{ skill, at: at ?? new Date().toISOString() }] }))),
  );

  server.registerTool(
    'my_usage',
    {
      title: 'My skill usage',
      description: 'What MediaMake knows of this account\'s skill use: each skill with how often it ran and when it last did, most used first, and the skills last reported from the user\'s computers with their versions. Only names, counts, times and versions are ever kept.',
      inputSchema: { days: z.number().int().min(1).max(365).default(90).describe('How far back to count runs') },
      annotations: READ,
    },
    safe(async ({ days }) => {
      const [runs, local] = await Promise.all([client.get('/api/usage/skill-runs', { days }), client.get('/api/usage/local-skills')]);
      return json({ ...runs, local });
    }),
  );

  server.registerTool(
    'report_local_skills',
    {
      title: 'Report local skills',
      description:
        "Tell MediaMake which skills are on the user's computer: each skill's name and version, nothing else (no paths, no contents). It fills \"skills on your computer\" under Mine. Read the names from the skill folders (~/.claude/skills, the project's .claude/skills, ~/MediaMake/skills) and each version from its SKILL.md frontmatter (`version`, or `metadata.version`); leave the version out when there is none. The list replaces the last one from the same device. On a computer with the MediaMake repo, `mm usage skills` does this.",
      inputSchema: {
        skills: z
          .array(z.object({ name: SKILL_NAME, version: z.string().max(80).optional().describe('From the SKILL.md frontmatter') }))
          .max(500),
        device: z.string().max(80).optional().describe('A name for this computer, e.g. "MacBook Pro". Default: "claude"'),
      },
      annotations: WRITE,
    },
    safe(async ({ skills, device }) => json(await client.put('/api/usage/local-skills', { device: device ?? 'claude', skills }))),
  );

  server.registerTool(
    'known_issues',
    {
      title: 'Known issues of an item',
      description:
        "What is known to be wrong with one item right now, and what was fixed in the last 30 days: the list MediaMake's admins keep. Read it when an item misbehaves, before sending feedback: a known issue often has a workaround, and one marked fixed means updating the item is the answer.",
      inputSchema: { item: ITEM_ID },
      annotations: READ,
    },
    safe(async ({ item }) => json({ ...(await client.get<{ issues: unknown[] }>('/api/feedback/known-issues', { item })), page: page(item) })),
  );

  server.registerTool(
    'send_feedback',
    {
      title: 'Send feedback',
      description:
        "Send the user's feedback to the MediaMake team: a bug, a problem, an idea or praise, about one item or about MediaMake as a whole. When a run of a MediaMake skill, MCP or app went wrong or the user had to work around it, offer once at the end to send it, with the version they used. Send their own words, and only when they said yes: read the text back to them first. Leave out file paths, keys and anything private. The team reads every one; the user is mailed when a fix ships, and my_feedback shows any answer.",
      inputSchema: {
        text: z.string().min(3).max(4000).describe("The feedback, in the user's words"),
        item: ITEM_ID.optional().describe('The item it is about, when it is about one'),
        version: z.string().max(80).optional().describe('The version of the item they used, when known'),
      },
      annotations: WRITE,
    },
    safe(async ({ text, item, version }) => {
      const saved = await client.post<{ feedbackId: string }>('/api/feedback', { text, itemId: item, version, source: 'mm-use' });
      return json({ ...saved, sent: true, ...(item && { page: page(item) }) });
    }),
  );

  server.registerTool(
    'rate_item',
    {
      title: 'Rate an item',
      description:
        "Rate a MediaMake skill, MCP or app from 1 to 5 stars for the user. Everyone sees an item's average and how many rated it; nobody sees who gave what. One rating per account and item: rating again changes it. Only on the user's word: after a run of a MediaMake item, you may ask once how many stars they give it, and send exactly what they say. When they also say why, send those words with send_feedback. Never rate for them.",
      inputSchema: {
        item: ITEM_ID.describe('The skill, MCP or app, e.g. skill/pack-brand-kit'),
        stars: z.number().int().min(1).max(5).describe('1 (poor) to 5 (great), as the user said'),
        version: z.string().max(80).optional().describe('The version of the item they used, when known'),
      },
      annotations: { ...WRITE, idempotentHint: true },
    },
    safe(async ({ item, stars, version }) => {
      const saved = await client.post<{ rating: unknown; mine: number }>('/api/catalog/ratings', { itemId: item, stars, version, source: 'mm-use' });
      return json({ ...saved, rated: true, page: page(item) });
    }),
  );

  server.registerTool(
    'my_feedback',
    {
      title: 'My feedback',
      description:
        "The feedback this account sent, newest first, with what came of each: received, answered (with the team's answer), a fix being made, fixed (with the version) or closed. Optionally about one item.",
      inputSchema: { item: ITEM_ID.optional().describe('Only feedback about this item') },
      annotations: READ,
    },
    safe(async ({ item }) => json(await client.get('/api/feedback', { item }))),
  );

  server.registerTool(
    'submit_item',
    {
      title: 'Submit to the store',
      description:
        "Send a skill, MCP or app the user built to the MediaMake store, privately, for an admin to review: its files, and the finished production that was made with it. Use it when the user asks to make something they built public, publish it or list it in the store. The rule is \"We publish nothing we don't use.\": ask the user which finished production was made with it (its title, and its link when it is online); never make one up, and a test render or a demo is not one. With none, don't submit. Read every file first and show the user anything private (a key, a token, a path on their computer, an email, a client's name): the server checks again and lists what it stops on under problems, to fix and send again. On a computer with the MediaMake repo, `mm submit <name>` does the same from the files on disk, so prefer it there. Nothing is public until an admin approves; the admin picks the membership that opens it (public, plus, pro or cohort), it enters as Beta, and accepting it earns the user a membership for 3 months. Sending the same item again before a decision replaces what was sent.",
      inputSchema: {
        kind: z.enum(['skill', 'mcp', 'app']),
        name: z
          .string()
          .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'lowercase letters, digits and dashes, such as make-lyrics-video')
          .max(64)
          .describe("The item's name: its folder's name, and a skill's `name` in its SKILL.md"),
        made: z
          .object({
            title: z.string().min(3).max(200).describe('The finished production made with it, as the user named it'),
            url: z.string().url().max(500).optional().describe('Its https link, when it is online'),
          })
          .describe('The proof the rule asks for'),
        files: z
          .array(
            z.object({
              path: z.string().min(1).max(300).describe("Relative to the item's folder, with forward slashes, e.g. SKILL.md or scripts/run.mjs"),
              content: z.string(),
              encoding: z.enum(['utf8', 'base64']).default('utf8').describe('base64 for a file that is not text'),
            }),
          )
          .min(1)
          .max(400)
          .describe("Every file of the item, at most 1 MB each and 3 MB in all. A skill needs its SKILL.md at the top. Leave out .git, node_modules, .env files, builds and media"),
        title: z.string().max(120).optional().describe("Left out: from the item's item.json, else made from its name"),
        summary: z.string().max(500).optional().describe("What it does, in a line. Left out: from item.json, else a skill's description"),
        version: z.string().max(40).optional().describe('Such as 1.0.0. Left out: from item.json or SKILL.md, else 0.1.0'),
        note: z.string().max(1000).optional().describe('What the user wants the reviewers to know'),
      },
      annotations: WRITE,
    },
    safe(async input => json({ ...(await client.post<{ submission: unknown }>('/api/submissions', { ...input, source: 'mm-use' })), sent: true, public: false })),
  );

  server.registerTool(
    'my_submissions',
    {
      title: 'My submissions',
      description:
        'What this account sent to the MediaMake store, newest first, with where each stands: waiting for an admin, changes asked for (with what to change), accepted (with the membership that opens it, the membership it earned and, for a Public skill, its pull request), live, declined or withdrawn.',
      inputSchema: {},
      annotations: READ,
    },
    safe(async () => json(await client.get('/api/submissions'))),
  );

  server.registerTool(
    'withdraw_submission',
    {
      title: 'Withdraw a submission',
      description: 'Take back a submission before an admin decides it, when the user asks. The item stays theirs and works as before. my_submissions gives the id.',
      inputSchema: { submission: z.string().regex(/^sub_[A-Za-z0-9_-]{6,40}$/, 'a submission id such as sub_Ab12Cd34Ef56').describe('The submission id') },
      annotations: WRITE,
    },
    safe(async ({ submission }) => json(await client.request('DELETE', '/api/submissions', { query: { id: submission } }))),
  );

  server.registerTool(
    'upload_item_picture',
    {
      title: "Upload a picture for an item's listing",
      description:
        "A link to upload one picture from the user's computer for the store listing of an item they look after: its headshot (16:9) or, for an MCP or an app, its icon (square). Only the item's authors and MediaMake's admins can; an item made outside MediaMake has no authors here, so only an admin. Give the file's name (its extension says its type), not its folder. Answers with publicUrl, the picture's link once it is uploaded (public to anyone who has it), and curl, the line that uploads it: run it on the user's computer in the file's folder (or put the file's full path after --upload-file; curl.exe in Windows PowerShell), and it must exit 0 and print nothing. Then pass publicUrl to set_item_pictures. The link works for an hour and for that one file: a changed picture needs a new call. Only on the user's word, and only a real picture of the item.",
      inputSchema: {
        item: LISTED_ITEM,
        filename: z
          .string()
          .min(1)
          .max(200)
          .describe('The picture file\'s name, e.g. "headshot.jpg": a PNG, JPEG, WebP, GIF or AVIF'),
      },
      annotations: WRITE,
    },
    safe(async ({ item, filename }) => {
      // only the name: the folder it sits in on the user's computer is theirs
      const name = filename.split(/[\\/]/).pop() ?? '';
      const contentType = mimeFromName(name);
      if (!name || !contentType || !PICTURE_TYPES.includes(contentType)) throw new Error(`${filename} is not a PNG, JPEG, WebP, GIF or AVIF picture`);
      const { uploadUrl, publicUrl } = await client.post<{ uploadUrl: string; publicUrl: string }>('/api/catalog/listing', {
        type: 'create_upload',
        itemId: item,
        filename: name,
        contentType,
      });
      // the link is signed for this type, public-read, so the headers must match it
      const curl = `curl -sSf -X PUT -H "Content-Type: ${contentType}" -H "x-amz-acl: public-read" --upload-file "${name}" "${uploadUrl}"`;
      return json({ item, publicUrl, curl, contentType, expires: 'in an hour', next: 'set_item_pictures puts publicUrl on the listing', page: page(item) });
    }),
  );

  server.registerTool(
    'set_item_pictures',
    {
      title: "Set an item's headshot and icon",
      description:
        "Set the pictures on the store listing of an item the user looks after: headshot, the 16:9 picture its cards and its page show, and icon, an MCP's or an app's square icon, each by its link. An author gives the publicUrl that upload_item_picture gave for a picture uploaded for this item, and no other link; an admin may give any https link. Only the item's authors and MediaMake's admins can. Each one given replaces what was there; an empty one clears it; left out, it stays. It is live at once, with no review: only on the user's word, after they have seen the picture, and only a real picture of the item. The rest of a listing (its description, README, tags and screenshots) is set by MediaMake's admins. Answers with the item's page: give it to the user.",
      inputSchema: {
        item: LISTED_ITEM,
        headshot: z.string().max(1000).optional().describe("Its 16:9 picture: upload_item_picture's publicUrl; empty clears it"),
        icon: z.string().max(1000).optional().describe("An MCP's or an app's square icon: upload_item_picture's publicUrl; empty clears it"),
      },
      annotations: { ...WRITE, idempotentHint: true },
    },
    safe(async ({ item, headshot, icon }) => {
      if (headshot === undefined && icon === undefined) throw new Error('Give headshot or icon');
      const saved = await client.post<{ headshot?: string; icon?: string }>('/api/catalog/listing', {
        type: 'set',
        itemId: item,
        ...(headshot !== undefined && { headshot }),
        ...(icon !== undefined && { icon }),
      });
      return json({ item, headshot: saved.headshot ?? null, icon: saved.icon ?? null, live: true, page: page(item) });
    }),
  );
}
