import { NextRequest, NextResponse } from 'next/server';
import { publicReleasesOpen } from '@/lib/access';
import { requireAdmin } from '@/lib/admin-utils';
import { catalogIndex } from '@/lib/catalog/admin-index';
import { installPromptFor } from '@/lib/catalog/install-prompt';
import { codeUrlOf, staticOrigin } from '@/lib/catalog/items';
import { planInstall } from '@/lib/catalog/plan';
import { accessGrantsDB, accessGroupsDB } from '@/lib/catalog/store';
import { usedByOf } from '@/lib/catalog/summary';
import { registry } from '@/lib/skills/registry';
import { NETWORK_GROUP, PRIVATE_GROUP, isInstallable } from '@/lib/catalog/types';

/**
 * GET /api/admin/catalog/item?id=mcp/browse-hack
 * One item as its release page shows it (/core/releases/<kind>/<slug>): the
 * record, where it is defined, whether it is archived, the grants and groups
 * that reach it, what installing it does (the plan an admin would get,
 * everything shared, no package links), and what needs or uses it.
 * Read-only: unlike GET /api/admin/catalog, it settles no gates.
 */
export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req);
  } catch {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  }
  const id = req.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id is required, e.g. ?id=mcp/browse-hack' }, { status: 400 });

  const [{ byId, storedIds, archive }, grants, groups] = await Promise.all([catalogIndex(), accessGrantsDB.list(), accessGroupsDB.list()]);
  const item = byId.get(id);
  if (!item) return NextResponse.json({ error: `No item ${id}` }, { status: 404 });

  const plan = await planInstall(id, {
    getRecord: async other => byId.get(other) ?? null,
    canOpen: () => true,
    downloadUrl: async () => '',
  });

  const now = new Date().toISOString();
  const kindWildcard = `${item.kind}/*`;
  const members = (groupId: string) => groups.find(group => group.groupId === groupId)?.members.length ?? 0;

  return NextResponse.json({
    item,
    definedIn: storedIds.has(id) ? 'database' : staticOrigin(id),
    archive: archive.get(id) ?? null,
    grants: grants.filter(
      grant =>
        (!grant.expiresAt || grant.expiresAt > now) &&
        (grant.itemId === id || (!item.neverPublish && (grant.itemId === '*' || grant.itemId === kindWildcard))),
    ),
    groups: { private: members(PRIVATE_GROUP), community: members(NETWORK_GROUP) },
    publicReleasesOpen: publicReleasesOpen(),
    plan,
    usedBy: usedByOf(byId.values(), id),
    names: Object.fromEntries([...byId.values()].map(record => [record.id, record.title])),
    installPrompt: isInstallable(item) ? installPromptFor(id) : undefined,
    code: codeUrlOf(item),
    // a skill's card carries the first sentence; its page shows the whole description
    description: item.kind === 'skill' ? registry?.skills.find(skill => skill.name === item.slug)?.description : undefined,
  });
}
