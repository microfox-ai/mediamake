import { NextRequest, NextResponse } from 'next/server';
import { publicReleasesOpen } from '@/lib/access';
import { requireAdmin } from '@/lib/admin-utils';
import { catalogIndex } from '@/lib/catalog/admin-index';
import { CANONICAL_SITE, installPromptFor, siteUrl } from '@/lib/catalog/install-prompt';
import { hasLaunchVideo, launchVideoPromptFor } from '@/lib/catalog/launch-video';
import { codeUrlOf, staticOrigin } from '@/lib/catalog/items';
import { planInstall } from '@/lib/catalog/plan';
import { accessGrantsDB, accessGroupsDB } from '@/lib/catalog/store';
import { usedByOf } from '@/lib/catalog/summary';
import { knownIssuesDB } from '@/lib/feedback/known-issues-store';
import { registry } from '@/lib/skills/registry';
import { NETWORK_GROUP, PRIVATE_GROUP, isInstallable, itemTier, type CatalogItemRecord } from '@/lib/catalog/types';
import { currentMembership } from '@/lib/memberships/membership';
import { membershipsDB } from '@/lib/memberships/store';
import { GRANTABLE_TIERS, LEGACY_PERSON_TIER, higherTier, type GrantableTier, type MemberTier } from '@/lib/memberships/tiers';

/**
 * GET /api/admin/catalog/item?id=mcp/browse-hack
 * One item as its release page shows it (/app/releases/<kind>/<slug>): the
 * record, where it is defined, whether it is archived, its health mark, its Ready mark with
 * its proof, the grants that reach it, how many people hold each membership, what installing it does (the plan an admin would get,
 * everything shared, no package links), what needs or uses it, and its
 * video (with the tutorials a course can play, and the courses a tutorial is in),
 * and for a skill, MCP or app its launch video prompt (see lib/catalog/launch-video).
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

  const [{ byId, storedIds, archive, videos, health, readiness }, grants, groups, memberships] = await Promise.all([
    catalogIndex(),
    accessGrantsDB.list(),
    accessGroupsDB.list(),
    membershipsDB.list().catch(() => []),
  ]);
  const item = byId.get(id);
  if (!item) return NextResponse.json({ error: `No item ${id}` }, { status: 404 });

  const plan = await planInstall(id, {
    getRecord: async other => byId.get(other) ?? null,
    canOpen: () => true,
    downloadUrl: async () => '',
  });

  const now = new Date().toISOString();
  const kindWildcard = `${item.kind}/*`;
  // each person once, at their tier: the highest of their memberships and, until the migration, their earlier group
  const members = Object.fromEntries(GRANTABLE_TIERS.map(tier => [tier, 0])) as Record<GrantableTier, number>;
  const inGroup = (groupId: string) => groups.find(group => group.groupId === groupId)?.members ?? [];
  for (const clientId of new Set([...memberships.map(m => m.clientId), ...inGroup(PRIVATE_GROUP), ...inGroup(NETWORK_GROUP)])) {
    let tier: MemberTier = currentMembership(memberships.filter(m => m.clientId === clientId))?.tier ?? 'public';
    if (inGroup(PRIVATE_GROUP).includes(clientId)) tier = higherTier(tier, LEGACY_PERSON_TIER.private);
    if (inGroup(NETWORK_GROUP).includes(clientId)) tier = higherTier(tier, LEGACY_PERSON_TIER.community);
    if (tier !== 'public' && tier !== 'admin') members[tier] += 1;
  }

  const usedBy = usedByOf(byId.values(), id);
  const description = item.kind === 'skill' ? registry?.skills.find(skill => skill.name === item.slug)?.description : undefined;
  const video = videos.get(id) ?? null;
  // what everyone may read about what is broken; a member's feedback never goes in a prompt
  const knownIssues = hasLaunchVideo(item.kind)
    ? (await knownIssuesDB.forItem(id).catch(() => [])).filter(issue => issue.status === 'open').map(issue => issue.title)
    : [];

  return NextResponse.json({
    item,
    definedIn: storedIds.has(id) ? 'database' : staticOrigin(id),
    archive: archive.get(id) ?? null,
    healthMark: health.get(id) ?? null,
    readinessMark: readiness.get(id) ?? null,
    grants: grants.filter(
      grant =>
        (!grant.expiresAt || grant.expiresAt > now) &&
        (grant.itemId === id || (!item.neverPublish && (grant.itemId === '*' || grant.itemId === kindWildcard))),
    ),
    members,
    publicReleasesOpen: publicReleasesOpen(),
    plan,
    usedBy,
    names: Object.fromEntries([...byId.values()].map(record => [record.id, record.title])),
    installPrompt: isInstallable(item) ? installPromptFor(id) : undefined,
    code: codeUrlOf(item),
    // a skill's card carries the first sentence; its page shows the whole description
    description,
    video,
    openKnownIssues: knownIssues,
    // what an admin pastes into Claude to make its Cook with Claude episode
    ...(hasLaunchVideo(item.kind) && {
      launchVideoPrompt: launchVideoPromptFor({
        id,
        kind: item.kind,
        title: item.title,
        about: description || item.summary,
        version: item.versions.at(-1)?.version ?? item.version,
        tier: itemTier(item),
        readiness: item.readiness ?? 'beta',
        proof: readiness.get(id)?.proof ?? item.readyProof,
        installable: isInstallable(item),
        code: codeUrlOf(item),
        uses: item.install?.uses?.map(use => ({ id: use.id, need: use.need, for: use.for, title: byId.get(use.id)?.title })),
        usedBy: usedBy.map(user => ({ id: user.id, title: user.title })),
        video,
        knownIssues,
        site: siteUrl() ?? CANONICAL_SITE,
        asOf: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }),
      }),
    }),
    // what a course can play, in the catalog's words, and the courses that play a tutorial
    ...(item.kind === 'course' && { tutorials: [...byId.values()].filter(other => other.kind === 'tutorial').map(lessonOf) }),
    ...(item.kind === 'tutorial' && {
      inCourses: [...videos.values()].filter(video => video.lessons?.includes(id)).map(video => ({ id: video.id, title: byId.get(video.id)?.title ?? video.title })),
    }),
  });
}

/** A tutorial as a course's lesson picker shows it. */
function lessonOf(record: CatalogItemRecord) {
  return { id: record.id, title: record.title, tier: itemTier(record), thumbnail: record.video?.thumbnail, archivedAt: record.archivedAt };
}
