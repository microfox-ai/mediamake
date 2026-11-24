import { publicReleasesOpen } from '@/lib/access';
import { catalogIndex } from '@/lib/catalog/admin-index';
import { CANONICAL_SITE, installPromptFor, siteUrl } from '@/lib/catalog/install-prompt';
import { hasLaunchVideo, launchVideoPromptFor } from '@/lib/catalog/launch-video';
import { SKILLS_REPO, codeUrlOf, isRepoSkill, staticOrigin } from '@/lib/catalog/items';
import { planInstall } from '@/lib/catalog/plan';
import { defaultReadme, type ReadmeSource } from '@/lib/catalog/readme';
import { skillReadmeBase, skillReadmeText } from '@/lib/catalog/readme-data';
import { natureOf, readmeProfile, skillDetailsView, suggestedType, typeOf, type SkillDetailsForm } from '@/lib/catalog/skill-profile';
import { accessGrantsDB, accessGroupsDB, skillProfilesDB } from '@/lib/catalog/store';
import { detailsKey } from '@/lib/app-shell/details-key';
import { usedByOf } from '@/lib/catalog/summary';
import { knownIssuesDB } from '@/lib/feedback/known-issues-store';
import { registry, skillNamed } from '@/lib/skills/registry';
import { shownAuthors } from '@/lib/submissions/authors';
import { NETWORK_GROUP, PRIVATE_GROUP, isInstallable, itemTier, savedProofOf, slugOf, type CatalogItemRecord } from '@/lib/catalog/types';
import { currentMembership } from '@/lib/memberships/membership';
import { membershipsDB } from '@/lib/memberships/store';
import { GRANTABLE_TIERS, LEGACY_PERSON_TIER, higherTier, type GrantableTier, type MemberTier } from '@/lib/memberships/tiers';
import type { ItemDetail } from '@/components/releases/model';

/**
 * One item as its release page shows it (/app/releases/<kind>/<slug>): the record, where it is
 * defined, whether it is archived, its health mark, its Ready mark with its proof, the grants that
 * reach it, how many people hold each membership, what installing it does (the plan an admin would
 * get, everything shared, no package links), what needs or uses it, and its video (with the
 * tutorials a course can play, and the courses a tutorial is in), its store listing (an admin's tags
 * and its screenshots), and for a skill, MCP or app its authors and its launch video prompt (see
 * lib/catalog/launch-video). Null when there is no such item. Read-only: it settles no gates.
 *
 * GET /api/admin/catalog/item gives it to admins; My store items' page for an item gives its authors
 * the part that is theirs (`authorView`).
 */
export async function itemDetail(id: string): Promise<ItemDetail | null> {
  const [{ byId, storedIds, archive, videos, health, readiness, listings }, grants, groups, memberships] = await Promise.all([
    catalogIndex(),
    accessGrantsDB.list(),
    accessGroupsDB.list(),
    membershipsDB.list().catch(() => []),
  ]);
  const item = byId.get(id);
  if (!item) return null;

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

  const listing = listings.get(id);
  const repoSkill = item.kind === 'skill' ? skillNamed(item.slug) : null;
  const fileText = repoSkill?.readme && isRepoSkill(id) ? await skillReadmeText(repoSkill) : null;
  // its README as the editor opens it: a repo skill's README.md is edited in the repo; the rest on the listing
  const readme: ReadmeSource | undefined =
    item.kind === 'skill' || item.kind === 'mcp' || item.kind === 'app'
      ? fileText !== null && repoSkill
        ? {
            text: fileText,
            source: 'file',
            editUrl: `https://github.com/${SKILLS_REPO}/edit/main/${repoSkill.path}/README.md`,
            base: skillReadmeBase(repoSkill),
            ...(listing?.readme && { override: true }),
          }
        : {
            text: listing?.readme ?? '',
            source: listing?.readme ? 'listing' : 'default',
            defaultText: defaultReadme({
              kind: item.kind,
              name: item.slug,
              title: item.title,
              summary: listing?.description ?? item.summary,
              youtubeId: video?.youtubeId,
              open: item.kind === 'app' && item.href && !isInstallable(item) ? item.href : undefined,
            }),
          }
      : undefined;
  // a skill's type and superset (lib/catalog/skill-profile), as its page works them out
  let skillDetails: SkillDetailsForm | undefined;
  if (item.kind === 'skill') {
    const key = detailsKey.catalog(id);
    const [profile, named] = await Promise.all([skillProfilesDB.get(key).catch(() => null), skillProfilesDB.subsetsOf(item.slug).catch((): string[] => [])]);
    const hasSubsets = named.length > 0 || !!registry?.skills.some(skill => skill.variantOf === item.slug);
    const view = skillDetailsView({
      key,
      profile,
      stated: { nature: natureOf(repoSkill?.listing?.nature), type: typeOf(repoSkill?.listing?.type), ...readmeProfile(fileText) },
      suggested: suggestedType(repoSkill, hasSubsets),
      variantOf: repoSkill?.variantOf,
    });
    skillDetails = {
      key,
      type: view.type ?? null,
      superset: view.superset ?? null,
      set: !!profile?.type,
      supersets: [...byId.values()].filter(other => other.kind === 'skill' && other.id !== id).map(other => other.slug).sort(),
    };
  }

  // a skill's, MCP's or app's authors (lib/catalog/authors), named as its page names them
  const authors = ['skill', 'mcp', 'app'].includes(item.kind) && !item.madeBy ? await shownAuthors(id).catch(() => []) : undefined;

  return {
    item,
    definedIn: storedIds.has(id) ? 'database' : staticOrigin(id),
    authors,
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
    // the public site, for the item's page link (/skills/<slug>, /mcps/<slug>, /apps/<slug>)
    site: siteUrl() ?? CANONICAL_SITE,
    code: codeUrlOf(item),
    // a skill's card carries the first sentence; its page shows the whole description
    description,
    video,
    // its store listing: the tags an admin added (item.tags has its own too) and its screenshots
    listing: {
      tags: listings.get(id)?.tags ?? [],
      media: listings.get(id)?.media ?? [],
      description: listings.get(id)?.description,
      headshot: listings.get(id)?.headshot,
      icon: listings.get(id)?.icon,
      readme: listings.get(id)?.readme,
      editorsPick: !!listings.get(id)?.editorsPick,
      // an admin's, on the listing, else the one its entry in the repo carries (the index puts either on the item)
      advice: item.advice ?? 'recommended',
      adviceNote: item.adviceNote,
      insteadOf: item.insteadOf,
      adviceFromRepo: !!item.advice && !listings.get(id)?.advice,
      // a repo skill's README.md is a file in its folder: it is edited there, not here
      readmeFile: isRepoSkill(id) && !!skillNamed(slugOf(id))?.readme,
    },
    openKnownIssues: knownIssues,
    // the productions on its mark, kept while it is Alpha or Beta, for going to Production again
    savedProof: savedProofOf(readiness.get(id)),
    // every tag in the catalog, for the tags picker
    tagOptions: [...new Set([...byId.values()].flatMap(record => record.tags ?? []))].sort(),
    ...(readme && { readme }),
    ...(skillDetails && { skillDetails }),
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
  } satisfies ItemDetail;
}

/**
 * What an item's author sees of it on My store items' page for it: the listing, its README, its
 * authors, its versions and what it is. The admin's parts are left out: who has been granted it,
 * how many hold each membership, its launch video prompt, its archive and health marks, its
 * Production proof, the catalog's names and where its packages are kept.
 */
export function authorView(detail: ItemDetail): ItemDetail {
  return {
    ...detail,
    // where each package is kept is the store's
    item: { ...detail.item, versions: detail.item.versions.map(version => ({ ...version, storageKey: '' })) },
    grants: [],
    members: Object.fromEntries(GRANTABLE_TIERS.map(tier => [tier, 0])) as Record<GrantableTier, number>,
    archive: null,
    healthMark: null,
    readinessMark: null,
    savedProof: undefined,
    names: {},
    launchVideoPrompt: undefined,
    openKnownIssues: undefined,
  };
}

/** A tutorial as a course's lesson picker shows it. */
function lessonOf(record: CatalogItemRecord) {
  return { id: record.id, title: record.title, tier: itemTier(record), thumbnail: record.video?.thumbnail, archivedAt: record.archivedAt };
}

