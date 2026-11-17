import { Suspense } from 'react';
import { AppPage } from '@/components/app-shell/app-page';
import { AdminSubmissions } from '@/components/submissions/admin-submissions';

export const metadata = { title: 'Submissions · MediaMake' };

/** /app/submissions: what members sent to be listed in the store, for admins (the (admin) layout sends everyone else away). */
export default function SubmissionsPage() {
  return (
    <AppPage title="Submissions">
      <Suspense>
        <AdminSubmissions />
      </Suspense>
    </AppPage>
  );
}
