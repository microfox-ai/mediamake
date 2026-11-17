import { withRedirect } from '@/lib/auth/redirect';
import type { MemberTier } from '@/lib/memberships/tiers';

/** Who is viewing an item's page, as its frame needs it (components/app-shell/item-shell). */
export interface ItemViewer {
  clientId: string;
  tier: MemberTier;
  isAdmin: boolean;
}

/** Where the signed-out sidebar's buttons go: sign in or sign up, then back to the page they were on. */
export function signedOutLinks(pathname: string): { signIn: string; signUp: string } {
  return { signIn: withRedirect('/login', pathname), signUp: withRedirect('/signup', pathname) };
}
