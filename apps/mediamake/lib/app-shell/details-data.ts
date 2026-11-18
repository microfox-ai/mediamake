import { getEntitlements } from '@/lib/access';
import { listCatalog } from '@/lib/catalog';
import { registry } from '@/lib/skills/registry';
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
