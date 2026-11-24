import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { Landing } from '@/components/home/landing/landing';
import { homeShelf } from '@/components/home/landing/shelf';
import { getViewer } from '@/lib/access';
import { configuredProviders } from '@/lib/auth/providers';
import { listCatalog } from '@/lib/catalog';
import { exploreHref } from '@/lib/catalog/paths';

// The shelf depends on who is viewing (private items unlock per viewer), and so does the sign-in.
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'MediaMake · The open-source AI store for solo creators',
  description:
    'A suite of skills, MCPs and apps you drive from Claude Code, Codex or Antigravity. Say what you want made, and review every result before it is final.',
};

/**
 * `/` is the homepage, a scroll story (Landing). The store is Explore, in the app (/app/explore): the
 * homepage's links go there, asking a signed-out visitor to sign in first. An old link to the store's
 * tabs (`/?tab=skills|mcps|apps|tutorials`) lands on Explore too.
 */
export default async function Homepage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const tab = Array.isArray(params.tab) ? params.tab[0] : params.tab;
  if (tab && tab !== 'home') {
    const q = Array.isArray(params.q) ? params.q[0] : params.q;
    redirect(exploreHref(tab, q));
  }

  const viewer = await getViewer();
  const cards = await listCatalog(viewer);
  return <Landing {...homeShelf(cards)} signedIn={!!viewer.clientId} providers={configuredProviders()} />;
}
