'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * /dashboard has moved to /projects.
 * This redirect ensures old bookmarks and links still work.
 */
export default function DashboardRedirectPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/projects');
  }, [router]);
  return null;
}
