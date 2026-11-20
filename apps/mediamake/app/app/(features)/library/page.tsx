import { Suspense } from 'react';
import { LibraryPage } from '@/components/cloud-library/library-page';

export const metadata = { title: 'Library · MediaMake' };

/**
 * /app/library: the Cloud Library (lib/cloud-library, docs/library.md). Shown to the membership
 * `cloudLibrary` names (the cohort and admins, for now): ./layout.tsx sends everyone else to Home,
 * and its routes apply the same rule.
 */
export default function AppLibraryPage() {
  return (
    <Suspense>
      <LibraryPage />
    </Suspense>
  );
}
