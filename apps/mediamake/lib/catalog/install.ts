import { accessLevel, type Entitlements } from '@/lib/access';
import { planInstall, type InstallPlan } from './plan';
import { getCatalogRecord } from './records';
import { createDownloadUrl } from './storage';

export type { ChoiceReason, InstallChoice, InstallPlan, InstallStep } from './plan';

/**
 * Resolves `itemId` and everything it requires into an ordered plan for one
 * person (see planInstall): dependencies before the items that need them,
 * each one once, with 30-minute package links, plus the choices of what
 * those items use (a skill's MCPs). Items come from the catalog database,
 * else from the repo (registry skills, third-party.json).
 */
export async function buildInstallPlan(itemId: string, entitlements: Entitlements): Promise<InstallPlan> {
  return planInstall(itemId, {
    getRecord: getCatalogRecord,
    canOpen: record => accessLevel(entitlements, record) !== 'locked',
    downloadUrl: createDownloadUrl,
  });
}
