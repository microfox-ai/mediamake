import type { Metadata } from 'next';
import { CatalogItemPage, viewableItem } from '@/components/catalog/item-page';

/** /mcps/<slug>: one MCP's own page, the link to share (see CatalogItemPage). */

type Props = { params: Promise<{ slug: string }> };

// who is viewing decides what they can see and do (private items, install codes)
export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const found = await viewableItem('mcp', (await params).slug).catch(() => null);
  // a locked item's name stays hidden from link previews too
  if (!found || found.entry.access === 'locked') return { title: 'MCP · MediaMake' };
  const title = `${found.entry.title} · MediaMake MCP`;
  const description = found.entry.summary;
  return { title, description, openGraph: { title, description, type: 'article' }, twitter: { card: 'summary', title, description } };
}

export default async function Page({ params }: Props) {
  return <CatalogItemPage kind="mcp" slug={(await params).slug} />;
}
