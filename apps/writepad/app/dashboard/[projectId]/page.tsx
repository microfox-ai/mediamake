'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * /dashboard/[projectId] has moved to /projects/[mongoId].
 * We can't derive the new MongoDB ID from the old slug, so we redirect
 * the user to the projects list where they can pick the project.
 */
export default function DashboardProjectRedirectPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/projects');
  }, [router]);
  return null;
}
