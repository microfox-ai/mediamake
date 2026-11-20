import { redirect } from 'next/navigation';
import { APP_HOME, LIBRARY_HREF, pageOpens } from '@/lib/app-shell/nav';
import { getAppViewer } from '@/lib/app-shell/viewer';

/**
 * The Library is shown to the cohort and admins only, for now (lib/app-shell/nav): anyone else who
 * is signed in is sent to the app's Home. Its routes check the membership themselves
 * (lib/cloud-library/access).
 */
export default async function LibraryLayout({ children }: { children: React.ReactNode }) {
  const viewer = await getAppViewer();
  if (viewer.clientId && !pageOpens(viewer.tier, LIBRARY_HREF)) redirect(APP_HOME);
  return children;
}
