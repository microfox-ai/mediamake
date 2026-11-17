import { revalidatePath } from 'next/cache';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { publicReleasesOpen } from '@/lib/access';
import { requireAdmin } from '@/lib/admin-utils';
import {
  accessGrantsDB,
  accessGroupsDB,
  accessRequestsDB,
  catalogArchiveDB,
  catalogHealthDB,
  catalogItemsDB,
  catalogReadinessDB,
  catalogVideosDB,
  ensureCatalogIndexes,
} from '@/lib/catalog/store';
import { catalogIndex } from '@/lib/catalog/admin-index';
import { cardRecords, isRepoSkill, skillRecords, staticRecord, thirdPartyRecords, withRegistryUses } from '@/lib/catalog/items';
import { isEmptyPlan, planTierMigration } from '@/lib/catalog/migrate-tiers';
import { usedByOf } from '@/lib/catalog/summary';
import { isMembershipSource } from '@/lib/memberships/membership';
import { changeTier, listKeyHolders, makePermanent, resolveRequest } from '@/lib/memberships/admin';
import { membershipsDB } from '@/lib/memberships/store';
import { publicOrigin } from '@/lib/mcp/oauth';
import { GRANTABLE_TIERS, LEGACY_PERSON_TIER, TIER_LADDER, isGrantableTier, type GrantableTier } from '@/lib/memberships/tiers';
import { createPackageUpload, packageKey } from '@/lib/catalog/storage';
import { parseYouTubeId, summaryFrom, withVideos } from '@/lib/catalog/video';
import { createPresignedUpload } from '@/lib/spaces-upload';
import {
  CATALOG_KINDS,
  CATALOG_STATUSES,
  DEFAULT_GATE_DAYS,
  ALWAYS_PUBLIC_ERROR,
  ITEM_HEALTH,
  ITEM_TIERS,
  USE_NEEDS,
  VIDEO_KINDS,
  VISIBILITIES,
  catalogItemId,
  parseCatalogItemId,
  isValidSlug,
  parseHealth,
  readyProblems,
  withArchive,
  withHealth,
  withReadiness,
  type CatalogKind,
  type CatalogStatus,
  type CatalogVideo,
  type GrantSubject,
  type ItemTier,
  type ReadyProof,
  type UseNeed,
  type Visibility,
} from '@/lib/catalog/types';

/**
 * GET /api/admin/catalog
 * Everything an admin needs to manage releases: items (with versions),
 * the repo's skills from skills.json, the third-party items from
 * lib/catalog/third-party.json and the cards in lib/catalog/items.ts that
 * aren't stored as items (each with its `tier`'s fields, its `readiness`,
 * `archivedAt` when archived, its `video` and its `health`), live grants,
 * groups, pending access requests, the people who hold API keys,
 * every membership record (ended ones too: the audit log), the tier ladder,
 * and whether public releases are open site-wide.
 */
export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req);
  } catch {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  }
  await catalogItemsDB.settleGates().catch(error => console.error('[admin/catalog] Could not settle gates:', error));
  const [items, grants, groups, requests, people, archived, videos, health, readiness, memberships] = await Promise.all([
    catalogItemsDB.list(),
    accessGrantsDB.list(),
    accessGroupsDB.list(),
    accessRequestsDB.list('pending'),
    listKeyHolders(),
    catalogArchiveDB.list(),
    catalogVideosDB.list(),
    catalogHealthDB.list(),
    catalogReadinessDB.list(),
    membershipsDB.list({ includeEnded: true }).catch(error => {
      console.error('[admin/catalog] Could not list memberships:', error);
      return [];
    }),
  ]);
  const marked = <T extends { id: string; kind: CatalogKind }>(records: T[]) =>
    withReadiness(withHealth(withVideos(withArchive(records, archived), videos), health), readiness);
  return NextResponse.json({
    items: marked(items.map(withRegistryUses)),
    skills: marked(skillRecords(items)),
    thirdParty: marked(thirdPartyRecords(items)),
    cards: marked(cardRecords(items)),
    grants,
    groups,
    requests,
    people,
    memberships,
    tiers: TIER_LADDER,
    publicReleasesOpen: publicReleasesOpen(),
    defaultGateDays: DEFAULT_GATE_DAYS,
  });
}

const requirementSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('item'), id: z.string().min(3) }),
  z.object({ type: z.literal('repo'), repo: z.string().regex(/^[\w.-]+\/[\w.-]+$/), why: z.string().optional() }),
  z.object({
    type: z.literal('github-release'),
    repo: z.string().regex(/^[\w.-]+\/[\w.-]+$/),
    asset: z.string().min(1),
    name: z.string().min(1),
    tag: z.string().optional(),
    kind: z.enum(['chrome-extension', 'binary', 'other']).optional(),
    guide: z.string().url().optional(),
  }),
]);

const repoSchema = z.string().regex(/^[\w.-]+\/[\w.-]+$/, 'repo must be owner/name');

/** What an item works with: offered as a choice when it is installed (see ItemUse). */
const useSchema = z.object({
  id: z.string().refine(id => !!parseCatalogItemId(id), 'id must be a catalog id such as mcp/elevenlabs'),
  need: z.enum(USE_NEEDS as [UseNeed, ...UseNeed[]]),
  for: z.string().min(1).max(300),
  without: z.string().min(1).max(300),
});

const mcpSettingSchema = z.object({
  name: z.string().regex(/^[A-Za-z_][\w-]*$/),
  description: z.string().min(1).max(300),
  format: z.string().includes('{value}').optional(),
  getAt: z.string().url().optional(),
  secret: z.boolean().optional(),
  required: z.boolean().optional(),
  default: z.string().optional(),
});

/** Where an item with no package of ours installs from (see InstallSource). */
const sourceSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('github-skill'), repo: repoSchema, path: z.string().min(1), ref: z.string().optional() }),
  z
    .object({
      type: z.literal('mcp-server'),
      name: z.string().regex(/^[A-Za-z0-9][\w-]{0,63}$/, 'name must be letters, digits, dashes and underscores'),
      local: z
        .object({ command: z.string().min(1), args: z.array(z.string()).optional(), env: z.array(mcpSettingSchema).optional() })
        .optional(),
      remote: z
        .object({
          url: z.string().url(),
          headers: z.array(mcpSettingSchema).optional(),
          connectorUrl: z.string().url().optional(),
          directoryUrl: z.string().url().optional(),
        })
        .optional(),
      mcpb: z.object({ repo: repoSchema, asset: z.string().min(1), tag: z.string().optional() }).optional(),
      setup: z.array(z.string().min(1)).optional(),
      guide: z.string().url().optional(),
    })
    .refine(source => source.local || source.remote || source.mcpb, 'an mcp-server source needs local, remote or mcpb'),
]);

const installSchema = z.object({
  method: z.enum(['skill', 'mcpb', 'app', 'manual']).optional(),
  entry: z.string().optional(),
  requires: z.array(requirementSchema).optional(),
  uses: z.array(useSchema).optional(),
  source: sourceSchema.optional(),
  notes: z.string().max(1000).optional(),
});

const itemSchema = z
  .object({
    kind: z.enum(CATALOG_KINDS as [CatalogKind, ...CatalogKind[]]),
    slug: z.string().refine(isValidSlug, 'slug must be lowercase letters, digits and dashes'),
    title: z.string().min(1).max(120),
    summary: z.string().max(500).default(''),
    /** The lowest membership that opens it; `visibility` is the older way to say it (private: cohort, network: pro). */
    tier: z.enum(ITEM_TIERS as [ItemTier, ...ItemTier[]]).optional(),
    visibility: z.enum(VISIBILITIES as [Visibility, ...Visibility[]]).optional(),
    status: z.enum(CATALOG_STATUSES as [CatalogStatus, ...CatalogStatus[]]).optional(),
    listed: z.boolean().optional(),
    href: z.string().optional(),
    cover: z.string().optional(),
    tags: z.array(z.string()).optional(),
    /** Someone else makes it: an open-source or hosted MCP or skill (always public, installed from install.source). */
    madeBy: z
      .object({ name: z.string().min(1).max(120), repo: repoSchema.optional(), license: z.string().max(60).optional(), homepage: z.string().url().optional() })
      .optional(),
    install: installSchema.optional(),
    /** An older way to do what that item does: shown as Old, an alternative only. */
    alternativeTo: z.string().refine(id => !!parseCatalogItemId(id), 'alternativeTo must be a catalog id such as mcp/elevenlabs-connector').optional(),
  })
  .refine(item => !item.madeBy || item.install?.source || item.href, {
    message: 'an item made by others needs install.source (or an href to its page)',
    path: ['install', 'source'],
  });

/**
 * A video on an item (see CatalogVideo): its YouTube link (a course: its
 * lessons instead), its words and, optionally, an uploaded thumbnail.
 */
const videoSchema = z.object({
  url: z.string().trim().max(500).optional(),
  title: z.string().trim().min(1, 'title is required').max(120),
  description: z.string().trim().max(5000).default(''),
  thumbnail: z
    .string()
    .trim()
    .max(1000)
    .refine(value => !value || /^https:\/\/\S+$/.test(value), 'thumbnail must be an https link')
    .optional(),
  lessons: z.array(z.string()).max(100).optional(),
});

/**
 * Checks a video for an item of `kind`: a YouTube link that names one video,
 * or for a course, tutorials in the catalog (each once, in order).
 */
async function checkVideo(
  kind: CatalogKind,
  input: unknown,
): Promise<{ video: Omit<CatalogVideo, 'id' | 'updatedAt' | 'updatedBy'> } | { error: string }> {
  const parsed = videoSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues.map(i => `video.${i.path.join('.')}: ${i.message}`).join('; ') };
  const { url, title, description, lessons } = parsed.data;
  const thumbnail = parsed.data.thumbnail || undefined;
  if (kind === 'course') {
    if (url) return { error: 'A course plays its lessons: give lessons (tutorial ids), not a url' };
    const ids = [...new Set(lessons ?? [])];
    const missing: string[] = [];
    for (const id of ids) {
      if (parseCatalogItemId(id)?.kind !== 'tutorial' || !(staticRecord(id) ?? (await catalogItemsDB.get(id)))) missing.push(id);
    }
    if (missing.length) return { error: `Not tutorials in the catalog: ${missing.join(', ')}` };
    return { video: { title, description, thumbnail, lessons: ids } };
  }
  if (lessons?.length) return { error: 'Only a course has lessons' };
  if (!url) return { error: 'video.url is required: the YouTube link of the video' };
  const youtubeId = parseYouTubeId(url);
  if (!youtubeId) return { error: `Not a link to one YouTube video: ${url}` };
  return { video: { youtubeId, title, description, thumbnail } };
}

const versionSchema = z.string().regex(/^[0-9A-Za-z.+-]{1,40}$/, 'version must look like 1.2.0');

function subjectFrom(body: { clientId?: string; groupId?: string }): GrantSubject | null {
  if (body.clientId?.trim()) return { kind: 'client', id: body.clientId.trim() };
  if (body.groupId?.trim()) return { kind: 'group', id: body.groupId.trim() };
  return null;
}

function daysFromNow(days?: number) {
  return days && days > 0 ? new Date(Date.now() + days * 86_400_000).toISOString() : undefined;
}

/** A person's tier as typed: the ladder's, or the earlier names (community is Pro, private is the cohort). */
function personTier(value: unknown): GrantableTier | 'public' | null {
  if (value === 'public' || isGrantableTier(value)) return value;
  if (value === 'community' || value === 'private') return LEGACY_PERSON_TIER[value];
  return null;
}

/** An https link, or nothing (an empty field is the same as none). */
const httpsLink = z
  .string()
  .trim()
  .max(500)
  .refine(value => !value || /^https:\/\/\S+$/.test(value), 'must be an https link')
  .optional();

/**
 * Productions as typed with a Ready mark: each a title, an https link when it
 * has one, and what the item's gallery shows of it: a picture (`image`) and
 * an uploaded clip (`video`), both from create_proof_upload or pasted links.
 */
const proofSchema = z.array(z.object({ title: z.string().trim().min(1).max(200), url: httpsLink, image: httpsLink, video: httpsLink })).max(20);

/** What a production's upload may be: a picture, or a clip browsers play. */
const PROOF_UPLOAD_TYPES = /^(image\/(png|jpeg|webp|gif|avif)|video\/(mp4|webm))$/;

/** Item ids from `itemIds` or `itemId`, each once. */
function idsFrom(body: { itemIds?: unknown; itemId?: unknown }): string[] | null {
  const ids = [...new Set<unknown>(Array.isArray(body.itemIds) ? body.itemIds : body.itemId ? [body.itemId] : [])];
  return ids.length && ids.length <= 200 && ids.every(id => typeof id === 'string') ? (ids as string[]) : null;
}

/**
 * POST /api/admin/catalog
 *
 * Body variants:
 *  { type: 'upsert_item',     item: { kind, slug, title, summary, tier?, status?, listed?, href?, cover?, tags?, madeBy?, install? } }
 *                             (tier/status left out keep the current value; new items start with the cohort;
 *                             skills in the public repo and items made by others (madeBy, with install.source) are always Public)
 *  { type: 'set_item_tier',   itemId, tier: 'public' | 'plus' | 'pro' | 'cohort' | 'admin' }
 *                             (the lowest membership that opens it; admin is the vault: admins and explicit grants only)
 *  { type: 'set_visibility',  itemId, visibility: 'private' | 'network' | 'public' }  (older: cohort, pro, public)
 *  { type: 'schedule_release', itemId, days? (default 30) | at? (ISO) }
 *                             (a gate: the item keeps its tier now and goes Public by itself at that time)
 *  { type: 'cancel_release',  itemId }                    (drops the gate; the item stays where it is)
 *  { type: 'set_never_publish', itemId, neverPublish: boolean }  (older: into the vault, or out of it to the cohort)
 *  { type: 'set_readiness',   itemIds: string[] (or itemId), readiness: 'ready' | 'beta', proof?: [{ title, url?, image?, video? }], note? }
 *  { type: 'create_proof_upload', itemId, filename, contentType } → { uploadUrl, publicUrl }
 *                             (a signed PUT for a production's picture or clip in the item's gallery,
 *                             public once uploaded; send the same Content-Type and x-amz-acl: public-read)
 *                             (Ready needs proof: at least one finished production made with it; an MCP also
 *                             needs a skill that uses it or a video. Beta drops the mark. Any kind)
 *  { type: 'set_health',      itemIds: string[] (or itemId), health: 'healthy' | 'inactive' | 'archived' | 'failed' | null, note? }
 *                             (any kind; failed needs the reason in note; null clears an admin's mark)
 *  { type: 'set_archived',    itemIds: string[] (or itemId), archived: boolean, note? }
 *                             (archived items keep their access and install by link, but leave the homepage;
 *                             any item, a skill from the repo too)
 *  { type: 'set_video',       itemId, video: { url, title, description?, thumbnail? } | null }
 *                             (any item's video: a skill's intro, a tutorial; a course gives `lessons`,
 *                             tutorial ids in order, instead of a url; null removes it. A tutorial's or
 *                             course's card takes the video's title and description)
 *  { type: 'create_video_item', kind: 'tutorial' | 'course', slug, video, visibility? }
 *                             (a new tutorial or course with its video; it starts in development)
 *  { type: 'create_thumbnail_upload', itemId, filename, contentType } → { uploadUrl, publicUrl }
 *                             (a signed PUT for a thumbnail image, public once uploaded; send
 *                             Content-Type and x-amz-acl: public-read with it)
 *  { type: 'set_tier',        clientId, tier: 'public' | 'plus' | 'pro' | 'cohort', source?, ref?, note?, days?, permanent? }
 *                             (puts a person at one tier: their live memberships end and one new record gives
 *                             the tier, saying how they got it. source defaults to admin; a contribution lasts
 *                             3 months unless permanent)
 *  { type: 'add_membership',  clientId, tier, source, ref?, note?, days?, permanent? }
 *                             (adds a record beside the ones they have: contributing again renews this way)
 *  { type: 'membership_permanent', membershipId }         (no expiry, until an admin removes it)
 *  { type: 'revoke_membership', membershipId, note? }
 *  { type: 'migrate_tiers',   apply?: boolean }           (the move from the earlier tiers to the ladder: a dry
 *                             run that answers with the plan, unless apply is true)
 *  { type: 'remove_item',     itemId }
 *  { type: 'create_upload',   itemId, version }             → { uploadUrl, storageKey }
 *  { type: 'publish_version', itemId, version, storageKey, sha256, bytes, notes }
 *                             (notes: the release notes, required; shown on the item's page and by
 *                             GET /api/catalog/versions)
 *  { type: 'grant',           itemId | '*', clientId | groupId, days?, note? }
 *  { type: 'revoke',          grantId } | { type: 'revoke', itemId | '*', clientId | groupId }
 *  { type: 'group_add',       groupId, clientIds: string[], name? }
 *  { type: 'group_remove',    groupId, clientIds: string[] }
 *  { type: 'resolve_request', requestId, approve: boolean, days? }
 *  { type: 'init_indexes' }
 */
export async function POST(req: NextRequest) {
  let adminId: string;
  try {
    adminId = await requireAdmin(req);
  } catch {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const bad = (error: string) => NextResponse.json({ error }, { status: 400 });

  switch (body.type as string) {
    case 'upsert_item': {
      const parsed = itemSchema.safeParse(body.item);
      if (!parsed.success) return bad(parsed.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join('; '));
      const data = parsed.data;
      const id = catalogItemId(data.kind, data.slug);
      const inRepo = isRepoSkill(id);
      const asked = data.tier ?? (data.visibility === 'public' ? 'public' : data.visibility ? 'gated' : undefined);
      if ((inRepo || data.madeBy) && asked && asked !== 'public') return bad(ALWAYS_PUBLIC_ERROR);
      try {
        const item = await catalogItemsDB.upsert({ ...data, id, ...(inRepo && { inRepo }) }, adminId);
        return NextResponse.json({ item });
      } catch (error) {
        return bad((error as Error).message);
      }
    }

    case 'set_item_tier': {
      if (!ITEM_TIERS.includes(body.tier)) return bad(`tier must be one of ${ITEM_TIERS.join(', ')}`);
      if (typeof body.itemId !== 'string') return bad('itemId is required');
      try {
        const item = await catalogItemsDB.setTier(body.itemId, body.tier, adminId, { alwaysPublic: isRepoSkill(body.itemId) });
        if (!item) return NextResponse.json({ error: 'Not found' }, { status: 404 });
        return NextResponse.json({ item });
      } catch (error) {
        return bad((error as Error).message);
      }
    }

    case 'set_visibility': {
      if (!VISIBILITIES.includes(body.visibility)) return bad(`visibility must be one of ${VISIBILITIES.join(', ')}`);
      if (body.visibility !== 'public' && typeof body.itemId === 'string' && isRepoSkill(body.itemId)) return bad(ALWAYS_PUBLIC_ERROR);
      try {
        const item = await catalogItemsDB.setVisibility(body.itemId, body.visibility, adminId);
        if (!item) return NextResponse.json({ error: 'Not found' }, { status: 404 });
        return NextResponse.json({ item });
      } catch (error) {
        return bad((error as Error).message);
      }
    }

    case 'schedule_release': {
      if (typeof body.itemId === 'string' && isRepoSkill(body.itemId)) return bad(ALWAYS_PUBLIC_ERROR);
      let publicAt: string;
      if (body.at) {
        const at = Date.parse(body.at);
        if (Number.isNaN(at)) return bad('at must be an ISO date');
        if (at <= Date.now()) return bad('at must be in the future; use set_visibility to release now');
        publicAt = new Date(at).toISOString();
      } else {
        const days = body.days === undefined ? DEFAULT_GATE_DAYS : Number(body.days);
        if (!(days > 0 && days <= 365)) return bad('days must be between 1 and 365');
        publicAt = new Date(Date.now() + days * 86_400_000).toISOString();
      }
      try {
        const item = await catalogItemsDB.scheduleRelease(body.itemId, publicAt, adminId);
        if (!item) return NextResponse.json({ error: 'Not found' }, { status: 404 });
        return NextResponse.json({ item });
      } catch (error) {
        return bad((error as Error).message);
      }
    }

    case 'cancel_release': {
      const item = await catalogItemsDB.scheduleRelease(body.itemId, null, adminId);
      if (!item) return NextResponse.json({ error: 'Not found' }, { status: 404 });
      return NextResponse.json({ item });
    }

    case 'set_never_publish': {
      if (body.neverPublish && typeof body.itemId === 'string' && isRepoSkill(body.itemId)) return bad(ALWAYS_PUBLIC_ERROR);
      try {
        const item = await catalogItemsDB.setNeverPublish(body.itemId, Boolean(body.neverPublish), adminId);
        if (!item) return NextResponse.json({ error: 'Not found' }, { status: 404 });
        return NextResponse.json({ item });
      } catch (error) {
        return bad((error as Error).message);
      }
    }

    case 'set_archived': {
      const ids = [...new Set<string>(Array.isArray(body.itemIds) ? body.itemIds : body.itemId ? [body.itemId] : [])];
      if (!ids.length || ids.length > 200 || ids.some(id => typeof id !== 'string')) return bad('itemIds is required: 1 to 200 item ids');
      if (body.note !== undefined && (typeof body.note !== 'string' || body.note.length > 500)) return bad('note must be text of 500 characters or fewer');
      // any item the catalog knows: one the repo defines, or a stored one
      const unknown: string[] = [];
      for (const id of ids) if (!staticRecord(id) && !(await catalogItemsDB.get(id))) unknown.push(id);
      if (unknown.length) return NextResponse.json({ error: `Unknown item${unknown.length === 1 ? '' : 's'}: ${unknown.join(', ')}` }, { status: 404 });
      const archived = body.archived !== false;
      await catalogArchiveDB.set(ids, archived, adminId, body.note?.trim() || undefined);
      refreshSkillPages(ids);
      return NextResponse.json({ archived, itemIds: ids });
    }

    case 'set_health': {
      const ids = idsFrom(body);
      if (!ids) return bad('itemIds is required: 1 to 200 item ids');
      // null clears an admin's mark: the item goes back to the repo's default (healthy when it has none)
      const health = body.health === null ? null : parseHealth(body.health);
      if (body.health !== null && !health) return bad(`health must be one of ${ITEM_HEALTH.join(', ')}, or null to clear it`);
      if (body.note !== undefined && (typeof body.note !== 'string' || body.note.length > 500)) return bad('note must be text of 500 characters or fewer');
      const note = body.note?.trim() || undefined;
      if (health === 'failed' && !note) return bad('A failed item needs its reason: say what is broken in note');
      for (const id of ids) {
        if (!staticRecord(id) && !(await catalogItemsDB.get(id))) return NextResponse.json({ error: `Unknown item: ${id}` }, { status: 404 });
      }
      await catalogHealthDB.set(ids, health, adminId, note);
      revalidatePath('/');
      refreshSkillPages(ids);
      return NextResponse.json({ health, itemIds: ids });
    }

    case 'set_readiness': {
      const ids = idsFrom(body);
      if (!ids) return bad('itemIds is required: 1 to 200 item ids');
      if (body.readiness !== 'ready' && body.readiness !== 'beta') return bad('readiness must be ready or beta');
      if (body.note !== undefined && (typeof body.note !== 'string' || body.note.length > 500)) return bad('note must be text of 500 characters or fewer');
      const { byId } = await catalogIndex();
      const unknown = ids.filter(id => !byId.has(id));
      if (unknown.length) return NextResponse.json({ error: `Unknown item${unknown.length === 1 ? '' : 's'}: ${unknown.join(', ')}` }, { status: 404 });
      if (body.readiness === 'beta') {
        await catalogReadinessDB.setBeta(ids);
      } else {
        const parsed = proofSchema.safeParse(body.proof ?? []);
        if (!parsed.success) return bad(parsed.error.issues.map(i => `proof.${i.path.join('.')}: ${i.message}`).join('; '));
        const proof: ReadyProof[] = parsed.data.map(entry => ({
          title: entry.title,
          ...(entry.url && { url: entry.url }),
          ...(entry.image && { image: entry.image }),
          ...(entry.video && { video: entry.video }),
        }));
        // the rule turned into a check: nothing is Ready without a production made with it
        const problems = ids.flatMap(id => readyProblems(byId.get(id)!, proof, usedByOf(byId.values(), id).length).map(problem => `${id}: ${problem}`));
        if (problems.length) return bad(problems.join('; '));
        await catalogReadinessDB.setReady(ids, proof, adminId, body.note?.trim() || undefined);
      }
      revalidatePath('/');
      refreshSkillPages(ids);
      return NextResponse.json({ readiness: body.readiness, itemIds: ids });
    }

    case 'set_video': {
      const itemId = typeof body.itemId === 'string' ? body.itemId : '';
      const stored = itemId ? await catalogItemsDB.get(itemId) : null;
      const item = stored ?? (itemId ? staticRecord(itemId) : null);
      if (!item) return NextResponse.json({ error: `Unknown item ${itemId || '(itemId is required)'}` }, { status: 404 });
      if (body.video === null) {
        await catalogVideosDB.remove(item.id);
        refreshSkillPages([item.id]);
        return NextResponse.json({ video: null });
      }
      const checked = await checkVideo(item.kind, body.video);
      if ('error' in checked) return bad(checked.error);
      const video = await catalogVideosDB.set({ id: item.id, ...checked.video }, adminId);
      refreshSkillPages([item.id]);
      // a tutorial or course is its video: its card says what the video says
      if (stored && VIDEO_KINDS.includes(item.kind)) {
        await catalogItemsDB.setWords(item.id, { title: video.title, summary: summaryFrom(video.description) });
      }
      return NextResponse.json({ video });
    }

    case 'create_video_item': {
      const kind = body.kind as CatalogKind;
      if (!VIDEO_KINDS.includes(kind)) return bad(`kind must be one of ${VIDEO_KINDS.join(', ')}`);
      if (typeof body.slug !== 'string' || !isValidSlug(body.slug)) return bad('slug must be lowercase letters, digits and dashes');
      if (body.visibility !== undefined && !VISIBILITIES.includes(body.visibility)) return bad(`visibility must be one of ${VISIBILITIES.join(', ')}`);
      if (body.tier !== undefined && !ITEM_TIERS.includes(body.tier)) return bad(`tier must be one of ${ITEM_TIERS.join(', ')}`);
      const id = catalogItemId(kind, body.slug);
      if (await catalogItemsDB.get(id)) return bad(`${id} already exists: edit it on its page`);
      const checked = await checkVideo(kind, body.video);
      if ('error' in checked) return bad(checked.error);
      try {
        const item = await catalogItemsDB.upsert(
          { id, kind, slug: body.slug, title: checked.video.title, summary: summaryFrom(checked.video.description), tier: body.tier, visibility: body.visibility },
          adminId,
        );
        const video = await catalogVideosDB.set({ id, ...checked.video }, adminId);
        return NextResponse.json({ item, video });
      } catch (error) {
        return bad((error as Error).message);
      }
    }

    case 'create_thumbnail_upload': {
      const contentType = typeof body.contentType === 'string' ? body.contentType : '';
      if (!/^image\/(png|jpeg|webp|gif|avif)$/.test(contentType)) return bad('contentType must be a PNG, JPEG, WebP, GIF or AVIF image');
      if (typeof body.itemId !== 'string' || !parseCatalogItemId(body.itemId)) return bad('itemId must be a catalog id such as skill/pack-brand-kit');
      const { uploadUrl, publicUrl } = await createPresignedUpload({
        clientId: adminId,
        filename: typeof body.filename === 'string' && body.filename ? body.filename : 'thumbnail',
        contentType,
        subPath: `catalog-thumbnails/${body.itemId}`,
      });
      return NextResponse.json({ uploadUrl, publicUrl });
    }

    case 'create_proof_upload': {
      const contentType = typeof body.contentType === 'string' ? body.contentType : '';
      if (!PROOF_UPLOAD_TYPES.test(contentType)) return bad('contentType must be a PNG, JPEG, WebP, GIF or AVIF image, or an MP4 or WebM video');
      if (typeof body.itemId !== 'string' || !parseCatalogItemId(body.itemId)) return bad('itemId must be a catalog id such as skill/pack-brand-kit');
      const { uploadUrl, publicUrl } = await createPresignedUpload({
        clientId: adminId,
        filename: typeof body.filename === 'string' && body.filename ? body.filename : 'made-with',
        contentType,
        subPath: `catalog-proof/${body.itemId}`,
      });
      return NextResponse.json({ uploadUrl, publicUrl });
    }

    case 'remove_item': {
      await catalogItemsDB.remove(body.itemId);
      // its video goes with it, unless the repo still defines the item (a skill keeps its intro)
      if (!staticRecord(body.itemId)) await catalogVideosDB.remove(body.itemId);
      return NextResponse.json({ success: true });
    }

    case 'create_upload': {
      const version = versionSchema.safeParse(body.version);
      if (!version.success) return bad(version.error.issues[0].message);
      const item = await catalogItemsDB.get(body.itemId);
      if (!item) return NextResponse.json({ error: 'Register the item first (upsert_item)' }, { status: 404 });
      if (item.madeBy) return bad(`${item.id} is made by ${item.madeBy.name}: it installs from install.source, not a package of ours`);
      if (item.versions.some(v => v.version === version.data)) {
        return bad(`${item.id}@${version.data} is already published; bump the version`);
      }
      const storageKey = packageKey(item.id, version.data);
      return NextResponse.json({ uploadUrl: await createPackageUpload(storageKey), storageKey });
    }

    case 'publish_version': {
      const version = versionSchema.safeParse(body.version);
      if (!version.success) return bad(version.error.issues[0].message);
      if (body.storageKey !== packageKey(body.itemId, version.data)) return bad('storageKey does not match item and version');
      if (!/^[a-f0-9]{64}$/.test(body.sha256 ?? '')) return bad('sha256 must be a hex digest');
      const notes = typeof body.notes === 'string' ? body.notes.trim() : '';
      if (!notes) return bad('notes is required: say what changed in this release');
      if (notes.length > 4000) return bad('notes must be 4000 characters or fewer');
      try {
        const item = await catalogItemsDB.addVersion(body.itemId, {
          version: version.data,
          storageKey: body.storageKey,
          sha256: body.sha256,
          bytes: Number(body.bytes) || 0,
          notes,
          publishedAt: new Date().toISOString(),
          publishedBy: adminId,
        });
        return NextResponse.json({ item });
      } catch (error) {
        return bad((error as Error).message);
      }
    }

    case 'grant': {
      const subject = subjectFrom(body);
      if (!subject) return bad('clientId or groupId is required');
      if (!body.itemId) return bad("itemId is required ('*' for every item)");
      // a stored item, or one the repo defines (a card such as the MediaMake MCP)
      if (body.itemId !== '*' && !staticRecord(body.itemId) && !(await catalogItemsDB.get(body.itemId))) {
        return NextResponse.json({ error: `Unknown item ${body.itemId}` }, { status: 404 });
      }
      const grant = await accessGrantsDB.create({
        itemId: body.itemId,
        subject,
        grantedBy: adminId,
        expiresAt: daysFromNow(body.days),
        note: body.note,
      });
      return NextResponse.json({ grant });
    }

    case 'revoke': {
      if (body.grantId) return NextResponse.json({ revoked: (await accessGrantsDB.revoke(body.grantId, adminId)) ? 1 : 0 });
      const subject = subjectFrom(body);
      if (!subject || !body.itemId) return bad('grantId, or itemId with clientId/groupId, is required');
      return NextResponse.json({ revoked: await accessGrantsDB.revokeFor(body.itemId, subject, adminId) });
    }

    case 'set_tier':
    case 'add_membership': {
      const clientId = (body.clientId as string | undefined)?.trim();
      const tier = personTier(body.tier);
      if (!clientId || !tier) return bad(`clientId and tier (public, ${GRANTABLE_TIERS.join(', ')}) are required`);
      const source = body.source === undefined ? 'admin' : body.source;
      if (!isMembershipSource(source)) return bad('source must be one of signup, admin, contribution, invite, migration, paid');
      if (body.days !== undefined && !(Number(body.days) > 0 && Number(body.days) <= 3650)) return bad('days must be between 1 and 3650');
      for (const field of ['ref', 'note'] as const) {
        if (body[field] !== undefined && (typeof body[field] !== 'string' || body[field].length > 500)) return bad(`${field} must be text of 500 characters or fewer`);
      }
      const record = {
        clientId,
        source,
        ref: body.ref?.trim() || undefined,
        note: body.note?.trim() || undefined,
        grantedBy: adminId,
        days: body.days === undefined ? undefined : Number(body.days),
        permanent: body.permanent === true,
      };
      if (body.type === 'add_membership') {
        if (tier === 'public') return bad('Public is having no membership: use set_tier to take someone back to it');
        return NextResponse.json({ membership: await membershipsDB.grant({ ...record, tier }) });
      }
      // the earlier tiers go with it (both groups, a grant of everything), and the person is mailed unless `notify` is false
      const changed = await changeTier({ ...record, by: adminId, tier, origin: publicOrigin(req), notify: body.notify !== false });
      return NextResponse.json({ success: true, ...changed });
    }

    case 'membership_permanent': {
      const made =
        typeof body.membershipId === 'string'
          ? await makePermanent({ membershipId: body.membershipId, by: adminId, origin: publicOrigin(req), notify: body.notify !== false })
          : null;
      if (!made) return NextResponse.json({ error: 'No live membership with that id' }, { status: 404 });
      return NextResponse.json(made);
    }

    case 'revoke_membership': {
      if (typeof body.membershipId !== 'string') return bad('membershipId is required');
      const revoked = await membershipsDB.revoke(body.membershipId, adminId, typeof body.note === 'string' ? body.note.trim() || undefined : undefined);
      if (!revoked) return NextResponse.json({ error: 'No live membership with that id' }, { status: 404 });
      return NextResponse.json({ revoked: 1 });
    }

    case 'migrate_tiers': {
      const [{ byId, readiness }, stored, groups, grants, memberships] = await Promise.all([
        catalogIndex(),
        catalogItemsDB.list(),
        accessGroupsDB.list(),
        accessGrantsDB.list(),
        membershipsDB.list(),
      ]);
      const now = new Date().toISOString();
      const plan = planTierMigration({
        items: stored.map(withRegistryUses),
        groups,
        grants: grants.filter(grant => !grant.expiresAt || grant.expiresAt > now),
        memberships,
        readiness: [...readiness.values()],
        knownIds: byId.keys(),
      });
      if (body.apply !== true || isEmptyPlan(plan)) return NextResponse.json({ applied: false, plan });

      await membershipsDB.ensureIndexes();
      await ensureCatalogIndexes();
      // memberships first: nobody is without their tier in between
      for (const person of plan.people) {
        await membershipsDB.grant({ clientId: person.clientId, tier: person.tier, source: 'migration', note: `Was: ${person.from}`, grantedBy: adminId });
      }
      for (const group of plan.leaveGroups) await accessGroupsDB.removeMembers(group.groupId, group.clientIds);
      for (const grant of plan.revokeGrants) await accessGrantsDB.revoke(grant.grantId, adminId);
      for (const item of plan.items) await catalogItemsDB.recordTier(item.id, item.tier, 'migration');
      for (const item of plan.ready) await catalogReadinessDB.setReady([item.id], item.proof, adminId, 'Decided on 2026-11-15');
      revalidatePath('/');
      refreshSkillPages(plan.ready.map(item => item.id));
      return NextResponse.json({ applied: true, plan });
    }

    case 'group_add':
    case 'group_remove': {
      const clientIds = (body.clientIds as string[] | undefined)?.map(s => s.trim()).filter(Boolean) ?? [];
      if (!body.groupId?.trim() || !clientIds.length) return bad('groupId and clientIds are required');
      if (body.type === 'group_add') await accessGroupsDB.addMembers(body.groupId.trim(), clientIds, body.name);
      else await accessGroupsDB.removeMembers(body.groupId.trim(), clientIds);
      return NextResponse.json({ success: true });
    }

    case 'resolve_request': {
      // a request for a tier (from Subscription) gives the membership, one for an item a grant of it
      const resolved = await resolveRequest({
        requestId: body.requestId,
        approve: !!body.approve,
        by: adminId,
        days: body.days,
        note: typeof body.note === 'string' ? body.note.trim() || undefined : undefined,
        origin: publicOrigin(req),
        notify: body.notify !== false,
      });
      if (!resolved) return NextResponse.json({ error: 'No pending request with that id' }, { status: 404 });
      return NextResponse.json(resolved);
    }

    case 'init_indexes': {
      await ensureCatalogIndexes();
      await membershipsDB.ensureIndexes();
      return NextResponse.json({ success: true });
    }

    default:
      return bad(`Unknown type ${body.type}`);
  }
}

/** A skill's page is cached for a few minutes: show a new intro video, archive mark, health or readiness at once. */
function refreshSkillPages(ids: string[]) {
  for (const id of ids) if (id.startsWith('skill/')) revalidatePath(`/skills/${id.slice('skill/'.length)}`);
}
