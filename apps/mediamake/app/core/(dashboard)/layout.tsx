import type { Metadata } from 'next';
import '../../globals.css';
import { SidebarProvider } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/app-sidebar';
import { MediaProvider } from '@/components/editor/media/media-context';
import { SessionProvider } from '@/components/session-provider';
import { LocalMediaProvider } from '@/components/local-media/local-media-provider';
import { CoreDeprecatedBanner } from '@/components/core/deprecated-banner';


export const metadata: Metadata = {
  title: 'MediaMake',
  description: 'Tools & Utilities to help build video agents ',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <SessionProvider>
      <MediaProvider>
        <LocalMediaProvider>
        <SidebarProvider
          style={
            {
              '--sidebar-width': 'calc(var(--spacing) * 72)',
              '--header-height': 'calc(var(--spacing) * 12)',
            } as React.CSSProperties
          }
        >
          <AppSidebar variant="inset" />
          <div className="flex min-w-0 flex-1 flex-col">
            <CoreDeprecatedBanner />
            {children}
          </div>
        </SidebarProvider>
        </LocalMediaProvider>
      </MediaProvider>
    </SessionProvider>
  );
}
