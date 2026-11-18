import { getEntitlements } from '@/lib/access';
import { listCatalog } from '@/lib/catalog';
import { itemReadme } from '@/lib/catalog/readme-data';
import type { ItemReadme } from '@/lib/catalog/readme';
import { catalogListingDB } from '@/lib/catalog/store';
import { registry, skillNamed } from '@/lib/skills/registry';
import { spaceItemReadme, spaceOfKey } from '@/lib/space/item-readme';
import { spaceDB } from '@/lib/space/store';
import { registerDB } from '@/lib/space/register-store';
import { runDB } from '@/lib/space/run-store';
import { submissionsDB } from '@/lib/submissions/store';
import { standing } from '@/lib/submissions/submission';
import { viewerDetails, type ItemDetails } from './details';
import { appItems, lastUsed, mine } from './member';
import { MOST_USED_DAYS, getAppItems, getMemberActivity, getSpaces } from './member-data';

/** A list that comes back empty when its store can't be reached, so the dialog still shows the rest. */
async function orEmpty<T>(what: string, load: () => Promise<T[]>): Promise<T[]> {
  try {
    return await load();
  } catch (error) {
    console.error(`[details] Could not load ${what}:`, error);
    return [];
  }
}

/** What every registry skill needs to run, from its run sheet: `skill/<name>` → its steps' needs, each once. */
function registryNeeds(): Map<string, string[]> {
  return new Map((registry?.skills ?? []).filter(skill => skill.steps?.length).map(skill => [`skill/${skill.name}`, [...new Set(skill.steps!.flatMap(step => step.needs))]]));
}

/**
 * What the item dialog says about one item (./details), for whoever asks.
 * Signed out, only a store item has details, with nothing of a member's.
 * Signed in, they carry what the member installed, their computers and
 * cloud environments (the access register), their spaces and what their
 * projects made. Null when the viewer has no such item.
 */
export async function itemDetailsFor(viewer: { clientId: string | null }, key: string): Promise<ItemDetails | null> {
  const details = await detailsFor(viewer, key);
  return details ? { ...details, readme: await readmeOf(key, details) } : null;
}

/**
 * The README the dialog shows on its left: the item's own (an item in a space: its README.md as its space
 * reported it; a store item: lib/catalog/readme-data), else the default one. The dialog only has details
 * for what the viewer may see: a space item for who can see that space.
 */
async function readmeOf(key: string, details: ItemDetails): Promise<ItemReadme> {
  const inSpace = spaceOfKey(key, details);
  if (inSpace) {
    const own = await spaceDB.itemReadme(inSpace.spaceId, inSpace.kind, inSpace.name).catch(() => null);
    if (own?.text.trim()) return spaceItemReadme(inSpace.spaceId, own);
  }
  const id = key.startsWith('catalog:') ? key.slice('catalog:'.length) : null;
  const skill = id?.startsWith('skill/') ? skillNamed(details.name) : null;
  // a locked item's README stays the default: its listing is for who can open it
  const listing = id && !details.locked ? await catalogListingDB.get(id).catch(() => null) : null;
  return itemReadme({
    facts: {
      kind: details.kind,
      name: details.name,
      title: details.title,
      summary: details.summary,
      description: skill?.description,
      youtubeId: details.video?.youtubeId,
      open: details.open,
      inStore: !!id,
    },
    skill: details.locked ? null : skill,
    listingReadme: listing?.readme,
  });
}

async function detailsFor(viewer: { clientId: string | null }, key: string): Promise<ItemDetails | null> {
  const skills = registry?.skills ?? [];
  const now = Date.now();
  const { clientId } = viewer;

  if (!clientId) {
    if (!key.startsWith('catalog:')) return null;
    const internal = (registry?.categories ?? []).filter(category => category.internal).map(category => category.id);
    const items = appItems(await listCatalog(viewer, undefined, { locked: 'show' }), skills, internal);
    return viewerDetails({ items, needs: registryNeeds(), viewer: { signedIn: false, isAdmin: false }, now })[key] ?? null;
  }

  const [items, activity, spaces, entitlements] = await Promise.all([getAppItems(clientId), getMemberActivity(clientId), getSpaces(clientId), getEntitlements(viewer)]);
  const projects = [...(spaces?.projects ?? []).map(project => project.projectId), ...(spaces?.personalProjectId ? [spaces.personalProjectId] : [])];
  const [places, runs, submissions] = await Promise.all([
    orEmpty('the register', () => registerDB.mine(clientId)),
    orEmpty('runs', () => runDB.madeIn(projects)),
    orEmpty('submissions', () => submissionsDB.listFor(clientId, 50)),
  ]);
  // the newest submission of an item says where it stands
  const sent = new Map<string, string>();
  for (const submission of submissions) if (!sent.has(submission.itemId)) sent.set(submission.itemId, standing(submission));

  return (
    viewerDetails({
      items,
      mine: mine(items, activity, skills),
      spaces,
      used: lastUsed(activity, skills),
      places,
      runs,
      needs: registryNeeds(),
      submissions: sent,
      viewer: { signedIn: true, isAdmin: entitlements.isAdmin },
      now,
      days: MOST_USED_DAYS,
    })[key] ?? null
  );
}
