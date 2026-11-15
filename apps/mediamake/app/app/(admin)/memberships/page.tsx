import Link from 'next/link';
import { ComingSoon } from '@/components/app-shell/app-page';

export const metadata = { title: 'Manage Memberships · MediaMake' };

/** /app/memberships: everyone and their membership. Until it is built, the People tab of Releases does this. */
export default function MembershipsPage() {
  return (
    <ComingSoon
      title="Manage Memberships"
      about="Manage Memberships will list everyone with their membership and how they got it, and let you grant or change one with a reason, send invites, link accounts and decide on contributors who are waiting."
    >
      <p className="text-sm">
        Until then, people and their memberships are on{' '}
        <Link href="/app/releases?tab=people" className="font-medium underline underline-offset-4">
          the People tab of Releases
        </Link>
        .
      </p>
    </ComingSoon>
  );
}
