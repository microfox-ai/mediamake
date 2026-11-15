import { AppPage } from '@/components/app-shell/app-page';
import { ManageMemberships } from '@/components/memberships/manage-memberships';

export const metadata = { title: 'Manage Memberships · MediaMake' };

/** /app/memberships: everyone and their membership, for admins (the (admin) layout sends everyone else away). */
export default function MembershipsPage() {
  return (
    <AppPage title="Manage Memberships">
      <ManageMemberships />
    </AppPage>
  );
}
