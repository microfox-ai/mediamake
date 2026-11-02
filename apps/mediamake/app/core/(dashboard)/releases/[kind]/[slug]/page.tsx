import { SiteHeader } from '@/components/site-header';
import { SidebarInset } from '@/components/ui/sidebar';
import { ReleaseItem } from '@/components/releases/release-item';

interface ReleaseItemPageProps {
  params: Promise<{ kind: string; slug: string }>;
}

/**
 * /core/releases/<kind>/<slug>, e.g. /core/releases/mcp/browse-hack: one
 * catalog item and where everything about it lives. `npm run catalog` prints
 * this link after each release step.
 */
export default async function ReleaseItemPage({ params }: ReleaseItemPageProps) {
  const { kind, slug } = await params;
  return (
    <SidebarInset>
      <SiteHeader title="Releases" />
      <ReleaseItem id={`${kind}/${slug}`} />
    </SidebarInset>
  );
}

export async function generateMetadata({ params }: ReleaseItemPageProps) {
  const { kind, slug } = await params;
  return { title: `${kind}/${slug} · Releases · MediaMake` };
}
