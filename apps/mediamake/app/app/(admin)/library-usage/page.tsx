import { LibraryUsagePage } from '@/components/cloud-library/usage-page';

export const metadata = { title: 'Library Usage · MediaMake' };

/** /app/library-usage: who used the Cloud Library and what it costs, for admins (the layout turns everyone else away). */
export default function AppLibraryUsagePage() {
  return <LibraryUsagePage />;
}
