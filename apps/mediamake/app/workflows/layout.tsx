import type { Metadata } from 'next';
import { SidebarProvider } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/app-sidebar';
import { MediaProvider } from '@/components/editor/media/media-context';
import { SessionProvider } from '@/components/session-provider';

export const metadata: Metadata = {
  title: 'Workflows - MediaMake',
  description: 'Create and manage AI workflow automations',
};

export default function WorkflowsLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <SessionProvider>
      <MediaProvider>
        <SidebarProvider
          style={
            {
              '--sidebar-width': 'calc(var(--spacing) * 72)',
              '--header-height': 'calc(var(--spacing) * 12)',
            } as React.CSSProperties
          }
        >
          <AppSidebar variant="inset" />
          {children}
        </SidebarProvider>
      </MediaProvider>
    </SessionProvider>
  );
}




