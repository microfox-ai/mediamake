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
import { NETWORK_GROUP, PRIVATE_GROUP, isInstallable, releaseTier, type CatalogItemRecord } from '@/lib/catalog/types';

/**
 * GET /api/admin/catalog/item?id=mcp/browse-hack
 * One item as its release page shows it (/core/releases/<kind>/<slug>): the
 * record, where it is defined, whether it is archived, an MCP's health mark, the grants and groups
 * that reach it, what installing it does (the plan an admin would get,
 * everything shared, no package links), what needs or uses it, and its
 * video (with the tutorials a course can play, and the courses a tutorial is in).
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

  const [{ byId, storedIds, archive, videos, health }, grants, groups] = await Promise.all([catalogIndex(), accessGrantsDB.list(), accessGroupsDB.list()]);
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
    healthMark: health.get(id) ?? null,
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
    video: videos.get(id) ?? null,
    // what a course can play, in the catalog's words, and the courses that play a tutorial
    ...(item.kind === 'course' && { tutorials: [...byId.values()].filter(other => other.kind === 'tutorial').map(lessonOf) }),
    ...(item.kind === 'tutorial' && {
      inCourses: [...videos.values()].filter(video => video.lessons?.includes(id)).map(video => ({ id: video.id, title: byId.get(video.id)?.title ?? video.title })),
    }),
  });
}

/** A tutorial as a course's lesson picker shows it. */
function lessonOf(record: CatalogItemRecord) {
  return { id: record.id, title: record.title, tier: releaseTier(record), thumbnail: record.video?.thumbnail, archivedAt: record.archivedAt };
}
