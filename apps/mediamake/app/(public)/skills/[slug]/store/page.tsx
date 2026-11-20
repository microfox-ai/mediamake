import type { Metadata } from 'next';
import { CatalogItemPage, viewableItem } from '@/components/catalog/item-page';

/**
 * /skills/<name>/store: the page of a skill that lives in the store, not in this repo (released from a
 * member's submission, or by hand). /skills/<name> sends it here: that page is cached for everyone
 * (revalidate), and this one reads who is viewing, which a cached page may not do at request time.
 */

type Props = { params: Promise<{ slug: string }> };

// who is viewing decides what they can see and do (what their membership opens)
export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const found = await viewableItem('skill', (await params).slug).catch(() => null);
  // a locked item's name stays hidden from link previews too
  if (!found || found.entry.access === 'locked') return { title: 'Skill · MediaMake' };
  const title = `${found.entry.title} · MediaMake skill`;
  const description = found.entry.summary;
  return { title, description, openGraph: { title, description, type: 'article' }, twitter: { card: 'summary', title, description } };
}

export default async function Page({ params }: Props) {
  return <CatalogItemPage kind="skill" slug={(await params).slug} />;
}
