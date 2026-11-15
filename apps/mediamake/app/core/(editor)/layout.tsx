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
                    {/* The editor fills what the banner leaves of the screen. */}
                    <div className="flex h-screen flex-col">
                        <CoreDeprecatedBanner />
                        <div className="min-h-0 flex-1">{children}</div>
                    </div>
                </LocalMediaProvider>
            </MediaProvider>
        </SessionProvider>
    );
}
