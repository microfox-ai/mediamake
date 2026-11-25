import { cache } from 'react';
import { getEntitlements } from '@/lib/access';
import { listCatalog } from '@/lib/catalog';
import { catalogItemsDB, skillProfilesDB } from '@/lib/catalog/store';
import { registry } from '@/lib/skills/registry';
import { allSpaces } from '@/lib/space/links-store';
import type { MySpaces } from '@/lib/space/store';
import { usageDB } from '@/lib/usage/store';
import { sinceDays } from '@/lib/usage/usage';
import { appItems, isInternalSkill, type AppItem, type MemberActivity } from './member';

/** How far back "what you use most" looks. */
export const MOST_USED_DAYS = 90;

/** A list that comes back empty when its store can't be reached, so a page still shows the rest. */
async function orEmpty<T>(what: string, load: () => Promise<T[]>): Promise<T[]> {
  try {
    return await load();
  } catch (error) {
    console.error(`[app] Could not load ${what}:`, error);
    return [];
  }
}

/**
 * The skills, MCPs and apps the app lists for one member: everything their
 * membership opens, and what a higher one would open, locked (never the
 * cohort's or the vault's). Loaded once per request.
 */
export const getAppItems = cache(async (clientId: string): Promise<AppItem[]> => {
  const viewer = { clientId };
  const entitlements = await getEntitlements(viewer);
  const entries = await listCatalog(viewer, undefined, { entitlements, locked: 'show' });
  return appItems(entries, registry?.skills ?? [], internalCategories(), await getSetTypes());
});

/** The registry's categories whose skills are internal by default. */
const internalCategories = () => (registry?.categories ?? []).filter(category => category.internal).map(category => category.id);

/** The types set on skills' pages, by name: without them, the README's and the registry's decide. */
const getSetTypes = cache(async (): Promise<Map<string, string>> =>
  skillProfilesDB.catalogTypes().catch(error => {
    console.error('[app] Could not read the skill types:', error);
    return new Map<string, string>();
  }),
);

/**
 * The names of every internal skill (other skills run them): the registry's, by the same rule as
 * appItems, and any whose page sets it internal. Home, My Items and the homepage leave them out;
 * Explore lists them behind its Internal filter.
 */
export const getInternalSkillNames = cache(async (): Promise<Set<string>> => {
  const setTypes = await getSetTypes();
  const categories = new Set(internalCategories());
  const names = new Set((registry?.skills ?? []).filter(skill => isInternalSkill(skill, categories, setTypes)).map(skill => skill.name));
  for (const [name, type] of setTypes) if (type === 'internal') names.add(name);
  return names;
});

/** What the member ran, opened and installed, and what their computers reported. */
export const getMemberActivity = cache(async (clientId: string): Promise<MemberActivity> => {
  const since = sinceDays(MOST_USED_DAYS);
  const [usage, opens, installs, devices] = await Promise.all([
    orEmpty('skill runs', () => usageDB.usageOf(clientId, since)),
    orEmpty('app opens', () => usageDB.opensOf(clientId, since)),
    orEmpty('installs', () => catalogItemsDB.installsOf(clientId)),
    orEmpty('local skills', () => usageDB.localSkillsOf(clientId)),
  ]);
  return { usage, opens, installs, devices };
});

/** The member's spaces as their computers reported them (mm space): their own and their projects'. Null when the store can't be reached. */
export const getSpaces = cache(async (clientId: string): Promise<MySpaces | null> => {
  try {
    return await allSpaces(clientId);
  } catch (error) {
    console.error('[app] Could not load the spaces:', error);
    return null;
  }
});

/** The registry's categories in their order, for Explore's chips. */
export function categoryInfo(): { id: string; about: string }[] {
  return (registry?.categories ?? []).map(({ id, about }) => ({ id, about }));
}
