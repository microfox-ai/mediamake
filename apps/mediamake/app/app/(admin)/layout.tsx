import { redirect } from 'next/navigation';
import { APP_HOME } from '@/lib/app-shell/nav';
import { getAppViewer } from '@/lib/app-shell/viewer';

/**
 * The Admin section: Releases, MediaMake MCP, Billing and Manage Memberships.
 * Admins only. Anyone else is sent to the app's Home; signed-out visitors
 * never get here (app/app/layout.tsx sends them to sign in first). The APIs
 * behind these pages check for an admin themselves.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const viewer = await getAppViewer();
  if (viewer.clientId && !viewer.isAdmin) redirect(APP_HOME);
  return children;
}
