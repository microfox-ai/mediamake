import type { Metadata } from 'next';
import '../globals.css';
import { SidebarProvider } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/app-sidebar';
import { MediaProvider } from '@/components/editor/media/media-context';
import { SessionProvider } from '@/components/session-provider';


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
                {children}
            </MediaProvider>
        </SessionProvider>
    );
}
