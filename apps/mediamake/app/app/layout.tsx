import type { Metadata } from 'next';
import { AppShellSidebar } from '@/components/app-shell/app-shell-sidebar';
import { SignInGate } from '@/components/app-shell/sign-in-gate';
import { SessionProvider } from '@/components/session-provider';
import { SidebarProvider } from '@/components/ui/sidebar';
import { getAppViewer } from '@/lib/app-shell/viewer';

export const metadata: Metadata = { title: 'MediaMake' };

// Who is signed in, and their membership, decide what the sidebar lists.
export const dynamic = 'force-dynamic';

/**
 * /app: the signed-in app. A sidebar in four sections (lib/app-shell/nav)
 * around the pages in this folder: (features), (admin) and (account) are
 * route groups, so the addresses stay short (/app/releases, /app/api-keys).
 * Signed-out visitors go to /login and come back to the page they asked for.
 */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const viewer = await getAppViewer();
  if (!viewer.clientId) return <SignInGate />;

  return (
    <SessionProvider initialSession={{ isAuthenticated: true, clientId: viewer.clientId }}>
      <SidebarProvider
        style={
          {
            '--sidebar-width': 'calc(var(--spacing) * 64)',
            '--header-height': 'calc(var(--spacing) * 12)',
          } as React.CSSProperties
        }
      >
        <AppShellSidebar variant="inset" tier={viewer.tier} clientId={viewer.clientId} />
        {children}
      </SidebarProvider>
    </SessionProvider>
  );
}
