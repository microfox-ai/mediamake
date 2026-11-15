import { cache } from 'react';
import { getEntitlements, getViewer, viewerTier } from '@/lib/access';
import type { MemberTier } from '@/lib/memberships/tiers';

export interface AppViewer {
  /** Null when nobody is signed in. */
  clientId: string | null;
  tier: MemberTier;
  isAdmin: boolean;
}

/**
 * Who is using the app, with their membership, for the layouts and pages
 * under app/app. Loaded once per request.
 */
export const getAppViewer = cache(async (): Promise<AppViewer> => {
  const viewer = await getViewer();
  if (!viewer.clientId) return { clientId: null, tier: 'public', isAdmin: false };
  const entitlements = await getEntitlements(viewer);
  return { clientId: viewer.clientId, tier: viewerTier(entitlements), isAdmin: entitlements.isAdmin };
});
