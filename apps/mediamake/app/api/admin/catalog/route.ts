import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdmin } from '@/lib/admin-utils';
import {
  accessGrantsDB,
  accessGroupsDB,
  accessInvitesDB,
  accessRequestsDB,
  catalogItemsDB,
  ensureCatalogIndexes,
} from '@/lib/catalog/store';
import { createPackageUpload, packageKey } from '@/lib/catalog/storage';
import {
  CATALOG_KINDS,
  CATALOG_STATUSES,
  VISIBILITIES,
  catalogItemId,
  isValidSlug,
  type CatalogKind,
  type CatalogStatus,
  type GrantSubject,
  type Visibility,
} from '@/lib/catalog/types';

/**
 * GET /api/admin/catalog
 * Everything an admin needs to manage releases: items (with versions),
 * live grants, groups, invites and pending access requests.
 */
export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req);
  } catch {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  }
  const [items, grants, groups, invites, requests] = await Promise.all([
    catalogItemsDB.list(),
    accessGrantsDB.list(),
    accessGroupsDB.list(),
    accessInvitesDB.list(),
    accessRequestsDB.list('pending'),
  ]);
  return NextResponse.json({ items, grants, groups, invites, requests });
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

const installSchema = z.object({
  method: z.enum(['skill', 'mcpb', 'app', 'manual']).optional(),
  entry: z.string().optional(),
  requires: z.array(requirementSchema).optional(),
  notes: z.string().max(1000).optional(),
});

const itemSchema = z.object({
  kind: z.enum(CATALOG_KINDS as [CatalogKind, ...CatalogKind[]]),
  slug: z.string().refine(isValidSlug, 'slug must be lowercase letters, digits and dashes'),
  title: z.string().min(1).max(120),
  summary: z.string().max(500).default(''),
  visibility: z.enum(VISIBILITIES as [Visibility, ...Visibility[]]).optional(),
  status: z.enum(CATALOG_STATUSES as [CatalogStatus, ...CatalogStatus[]]).optional(),
  listed: z.boolean().optional(),
  href: z.string().optional(),
  cover: z.string().optional(),
  tags: z.array(z.string()).optional(),
  install: installSchema.optional(),
});

const versionSchema = z.string().regex(/^[0-9A-Za-z.+-]{1,40}$/, 'version must look like 1.2.0');

function subjectFrom(body: { clientId?: string; groupId?: string }): GrantSubject | null {
  if (body.clientId?.trim()) return { kind: 'client', id: body.clientId.trim() };
  if (body.groupId?.trim()) return { kind: 'group', id: body.groupId.trim() };
  return null;
}

function daysFromNow(days?: number) {
  return days && days > 0 ? new Date(Date.now() + days * 86_400_000).toISOString() : undefined;
}

/**
 * POST /api/admin/catalog
 *
 * Body variants:
 *  { type: 'upsert_item',     item: { kind, slug, title, summary, visibility?, status?, listed?, href?, cover?, tags?, install? } }
 *                             (visibility/status left out keep the current value; new items start private, beta)
 *  { type: 'set_visibility',  itemId, visibility: 'private' | 'network' | 'public' }
 *  { type: 'remove_item',     itemId }
 *  { type: 'create_upload',   itemId, version }             → { uploadUrl, storageKey }
 *  { type: 'publish_version', itemId, version, storageKey, sha256, bytes, notes? }
 *  { type: 'grant',           itemId | '*', clientId | groupId, days?, note? }
 *  { type: 'revoke',          grantId } | { type: 'revoke', itemId | '*', clientId | groupId }
 *  { type: 'group_add',       groupId, clientIds: string[], name? }
 *  { type: 'group_remove',    groupId, clientIds: string[] }
 *  { type: 'create_invite',   itemIds?: string[], groupId?, maxUses?, grantDays?, expiresInDays?, note? }
 *  { type: 'disable_invite',  code }
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
      const item = await catalogItemsDB.upsert({ ...data, id: catalogItemId(data.kind, data.slug) }, adminId);
      return NextResponse.json({ item });
    }

    case 'set_visibility': {
      if (!VISIBILITIES.includes(body.visibility)) return bad(`visibility must be one of ${VISIBILITIES.join(', ')}`);
      const item = await catalogItemsDB.setVisibility(body.itemId, body.visibility, adminId);
      if (!item) return NextResponse.json({ error: 'Not found' }, { status: 404 });
      return NextResponse.json({ item });
    }

    case 'remove_item': {
      await catalogItemsDB.remove(body.itemId);
      return NextResponse.json({ success: true });
    }

    case 'create_upload': {
      const version = versionSchema.safeParse(body.version);
      if (!version.success) return bad(version.error.issues[0].message);
      const item = await catalogItemsDB.get(body.itemId);
      if (!item) return NextResponse.json({ error: 'Register the item first (upsert_item)' }, { status: 404 });
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
      try {
        const item = await catalogItemsDB.addVersion(body.itemId, {
          version: version.data,
          storageKey: body.storageKey,
          sha256: body.sha256,
          bytes: Number(body.bytes) || 0,
          notes: body.notes,
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
      if (body.itemId !== '*' && !(await catalogItemsDB.get(body.itemId))) {
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

    case 'group_add':
    case 'group_remove': {
      const clientIds = (body.clientIds as string[] | undefined)?.map(s => s.trim()).filter(Boolean) ?? [];
      if (!body.groupId?.trim() || !clientIds.length) return bad('groupId and clientIds are required');
      if (body.type === 'group_add') await accessGroupsDB.addMembers(body.groupId.trim(), clientIds, body.name);
      else await accessGroupsDB.removeMembers(body.groupId.trim(), clientIds);
      return NextResponse.json({ success: true });
    }

    case 'create_invite': {
      const itemIds = (body.itemIds as string[] | undefined) ?? [];
      if (!itemIds.length && !body.groupId) return bad('itemIds or groupId is required');
      for (const id of itemIds) {
        if (id !== '*' && !(await catalogItemsDB.get(id))) return NextResponse.json({ error: `Unknown item ${id}` }, { status: 404 });
      }
      const invite = await accessInvitesDB.create({
        itemIds,
        groupId: body.groupId,
        maxUses: Math.max(1, Number(body.maxUses) || 1),
        grantDays: body.grantDays,
        expiresAt: daysFromNow(body.expiresInDays),
        createdBy: adminId,
        note: body.note,
      });
      return NextResponse.json({ invite });
    }

    case 'disable_invite': {
      await accessInvitesDB.disable(body.code);
      return NextResponse.json({ success: true });
    }

    case 'resolve_request': {
      const request = await accessRequestsDB.resolve(body.requestId, body.approve ? 'approved' : 'rejected', adminId);
      if (!request) return NextResponse.json({ error: 'No pending request with that id' }, { status: 404 });
      const grant = body.approve
        ? await accessGrantsDB.create({
            itemId: request.itemId,
            subject: { kind: 'client', id: request.clientId },
            grantedBy: adminId,
            expiresAt: daysFromNow(body.days),
            note: `Approved request ${request.requestId}`,
          })
        : undefined;
      return NextResponse.json({ request, grant });
    }

    case 'init_indexes': {
      await ensureCatalogIndexes();
      return NextResponse.json({ success: true });
    }

    default:
      return bad(`Unknown type ${body.type}`);
  }
}
