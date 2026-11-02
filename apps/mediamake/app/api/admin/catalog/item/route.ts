import { NextRequest, NextResponse } from 'next/server';
import { publicReleasesOpen } from '@/lib/access';
import { requireAdmin } from '@/lib/admin-utils';
import { installPromptFor } from '@/lib/catalog/install-prompt';
import { codeUrlOf, getStaticRecords, staticOrigin, withRegistryUses } from '@/lib/catalog/items';
import { planInstall } from '@/lib/catalog/plan';
import { accessGrantsDB, accessGroupsDB, catalogItemsDB } from '@/lib/catalog/store';
import { registry } from '@/lib/skills/registry';
import { NETWORK_GROUP, PRIVATE_GROUP, isInstallable, type CatalogItemRecord, type UseNeed } from '@/lib/catalog/types';

/** Something in the catalog that needs the item installed first, or offers it as a choice. */
type UsedBy = { id: string; title: string; how: 'requires' | 'uses'; need?: UseNeed; for?: string };

/**
 * GET /api/admin/catalog/item?id=mcp/browse-hack
 * One item as its release page shows it (/core/releases/<kind>/<slug>): the
 * record, where it is defined, the grants and groups that reach it, what
 * installing it does (the plan an admin would get, everything shared, no
 * package links), and what needs or uses it. Read-only: unlike
 * GET /api/admin/catalog, it settles no gates.
 */
export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req);
  } catch {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  }
  const id = req.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id is required, e.g. ?id=mcp/browse-hack' }, { status: 400 });

  const [stored, grants, groups] = await Promise.all([catalogItemsDB.list(), accessGrantsDB.list(), accessGroupsDB.list()]);
  // the repo's items, then the database's (a stored record wins), as in listCatalog
  const byId = new Map<string, CatalogItemRecord>();
  for (const record of [...getStaticRecords(), ...stored.map(withRegistryUses)]) byId.set(record.id, record);
  const item = byId.get(id);
  if (!item) return NextResponse.json({ error: `No item ${id}` }, { status: 404 });

  const plan = await planInstall(id, {
    getRecord: async other => byId.get(other) ?? null,
    canOpen: () => true,
    downloadUrl: async () => '',
  });

  const usedBy = [...byId.values()].flatMap((other): UsedBy[] => {
    if (other.id === id) return [];
    if (other.install?.requires?.some(req => req.type === 'item' && req.id === id)) {
      return [{ id: other.id, title: other.title, how: 'requires' }];
    }
    const use = other.install?.uses?.find(u => u.id === id);
    return use ? [{ id: other.id, title: other.title, how: 'uses', need: use.need, for: use.for }] : [];
  });

  const now = new Date().toISOString();
  const kindWildcard = `${item.kind}/*`;
  const members = (groupId: string) => groups.find(group => group.groupId === groupId)?.members.length ?? 0;

  return NextResponse.json({
    item,
    definedIn: stored.some(record => record.id === id) ? 'database' : staticOrigin(id),
    grants: grants.filter(
      grant =>
        (!grant.expiresAt || grant.expiresAt > now) &&
        (grant.itemId === id || (!item.neverPublish && (grant.itemId === '*' || grant.itemId === kindWildcard))),
    ),
    groups: { private: members(PRIVATE_GROUP), community: members(NETWORK_GROUP) },
    publicReleasesOpen: publicReleasesOpen(),
    plan,
    usedBy,
    names: Object.fromEntries([...byId.values()].map(record => [record.id, record.title])),
    installPrompt: isInstallable(item) ? installPromptFor(id) : undefined,
    code: codeUrlOf(item),
    // a skill's card carries the first sentence; its page shows the whole description
    description: item.kind === 'skill' ? registry?.skills.find(skill => skill.name === item.slug)?.description : undefined,
  });
}
