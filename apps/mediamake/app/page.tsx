import { HomePage } from '@/components/home/home-page';
import { homeTabs, type HomeTab } from '@/components/home/tabs';
import { getViewer } from '@/lib/access';
import { listCatalog } from '@/lib/catalog';

// Cards depend on who is viewing (private items unlock per viewer).
export const dynamic = 'force-dynamic';

export default async function Homepage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab } = await searchParams;
  const initialTab = (homeTabs.find((t) => t.value === tab)?.value ?? 'home') as HomeTab;

  const viewer = await getViewer();
  const cards = await listCatalog(viewer);

  return <HomePage cards={cards} initialTab={initialTab} />;
}
