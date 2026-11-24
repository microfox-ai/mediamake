import { redirect } from 'next/navigation';
import { exploreHref } from '@/lib/catalog/paths';

/** The MCPs are listed in Explore, in the app; each one has its own page at /mcps/<slug>. */
export default function McpsPage() {
  redirect(exploreHref('mcp'));
}
