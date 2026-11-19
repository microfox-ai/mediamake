import { Suspense } from 'react';
import Link from 'next/link';
import { AppPage } from '@/components/app-shell/app-page';
import { LibraryPage } from '@/components/cloud-library/library-page';
import { getAppViewer } from '@/lib/app-shell/viewer';
import { FEATURE_TIERS, tierLabel, tierOpens } from '@/lib/memberships/tiers';

export const metadata = { title: 'Library · MediaMake' };

/**
 * /app/library: the Cloud Library (lib/cloud-library, docs/library.md). Open to the membership
 * `cloudLibrary` names, the same rule its routes apply; everyone else is told what it is and how
 * it opens.
 */
export default async function AppLibraryPage() {
  const { tier } = await getAppViewer();
  if (process.env.NODE_ENV === 'development' || tierOpens(tier, FEATURE_TIERS.cloudLibrary))
    return (
      <Suspense>
        <LibraryPage />
      </Suspense>
    );

  const needed = tierLabel(FEATURE_TIERS.cloudLibrary);
  return (
    <AppPage title="Library">
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 px-4 py-10 lg:px-6">
        <p className="w-fit rounded-md border px-2 py-0.5 text-xs font-medium">{needed} members</p>
        <h1 className="text-2xl font-semibold tracking-tight">Library</h1>
        <p className="text-sm text-muted-foreground">
          The Library keeps the files a space reuses, such as a channel’s songs with their masters, words and release details, so they are found from every computer and never made twice.
        </p>
        <p className="text-sm text-muted-foreground">
          It is open to {needed} members for now, and your membership is {tierLabel(tier)}.{' '}
          <Link href="/app/subscription" className="font-medium text-foreground underline underline-offset-4">
            See your membership
          </Link>
          .
        </p>
      </div>
    </AppPage>
  );
}
