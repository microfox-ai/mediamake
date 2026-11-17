'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ArrowLeftIcon, LogInIcon, RocketIcon } from 'lucide-react';
import { AppShellSidebar } from '@/components/app-shell/app-shell-sidebar';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import { signedOutLinks, type ItemViewer } from '@/lib/app-shell/item-shell';
import type { MemberTier } from '@/lib/memberships/tiers';

/**
 * The frame around an item's own page (/skills/<name>, /mcps/<slug>,
 * /apps/<slug>): the app's sidebar on the left, so the page reads as part of
 * the app, and a title bar with the way back to the list. Signed in, the
 * sidebar is the app's own; signed out, it holds a short welcome with a
 * Sign in button that comes back to this page. Admins get a Release page
 * button in the title bar.
 *
 * A skill's page is built ahead of time and is the same for everyone, so who
 * is viewing is asked in the browser (/api/me). A page that already knows
 * (an MCP's or an app's) passes `viewer` and nothing is asked.
 */
export function ItemShell({
  viewer: given,
  back,
  releasePath,
  children,
}: {
  /** Who is viewing when the page knows; leave out to ask in the browser. `null` is signed out. */
  viewer?: ItemViewer | null;
  back: { href: string; label: string };
  /** The item's release page, shown to admins as a button. */
  releasePath?: string;
  children: React.ReactNode;
}) {
  const [asked, setAsked] = useState<ItemViewer | null | undefined>(undefined);
  const viewer = given !== undefined ? given : asked;
  const pathname = usePathname() ?? '/';
  const links = signedOutLinks(pathname);

  useEffect(() => {
    if (given !== undefined) return;
    let cancelled = false;
    fetch('/api/me')
      .then(response => (response.ok ? response.json() : null))
      .then((me: { clientId?: string; tier?: MemberTier; isAdmin?: boolean } | null) => {
        if (cancelled) return;
        setAsked(me?.clientId ? { clientId: me.clientId, tier: me.tier ?? 'public', isAdmin: !!me.isAdmin } : null);
      })
      .catch(() => {
        if (!cancelled) setAsked(null);
      });
    return () => {
      cancelled = true;
    };
  }, [given]);

  return (
    <SidebarProvider
      style={
        {
          '--sidebar-width': 'calc(var(--spacing) * 64)',
          '--header-height': 'calc(var(--spacing) * 12)',
        } as React.CSSProperties
      }
    >
      {viewer ? (
        <AppShellSidebar variant="inset" tier={viewer.tier} clientId={viewer.clientId} />
      ) : (
        <GuestSidebar loading={viewer === undefined} links={links} />
      )}
      <SidebarInset>
        <header className="flex h-(--header-height) shrink-0 items-center gap-2 border-b">
          <div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mx-2 data-[orientation=vertical]:h-4" />
            <Link href={back.href} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
              <ArrowLeftIcon className="size-4" /> {back.label}
            </Link>
            <div className="ml-auto flex items-center gap-2">
              {viewer?.isAdmin && releasePath && (
                <Button asChild size="sm" variant="outline" title="Admins only: its tier, listing, video and releases">
                  <Link href={releasePath}>
                    <RocketIcon /> Release page
                  </Link>
                </Button>
              )}
              {/* on a phone the sidebar is closed, so the way in is here too */}
              {viewer === null && (
                <Button asChild size="sm" className="md:hidden">
                  <Link href={links.signIn}>Sign in</Link>
                </Button>
              )}
            </div>
          </div>
        </header>
        {children}
      </SidebarInset>
    </SidebarProvider>
  );
}

/** The sidebar for someone who isn't signed in: a short welcome and the Sign in button. While we ask who is viewing, placeholders. */
function GuestSidebar({ loading, links }: { loading: boolean; links: { signIn: string; signUp: string } }) {
  return (
    <Sidebar collapsible="offcanvas" variant="inset">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild className="data-[slot=sidebar-menu-button]:!p-1.5">
              <Link href="/" title="The MediaMake homepage">
                <img src="/brand/mediamake-mark.svg" alt="" className="size-6" />
                <span className="text-base font-semibold">MediaMake</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        {loading ? (
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                {['w-20', 'w-28', 'w-16', 'w-24'].map(width => (
                  <SidebarMenuItem key={width} className="flex h-8 items-center gap-2 px-2">
                    <Skeleton className="size-4 rounded-md" />
                    <Skeleton className={`h-4 ${width}`} />
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ) : (
          <div className="m-2 flex flex-col gap-3 rounded-xl border bg-background p-4">
            <img src="/brand/mediamake-mark.svg" alt="" className="size-9" />
            <div className="flex flex-col gap-1">
              <p className="text-sm font-semibold">Sign in to MediaMake</p>
              <p className="text-xs leading-relaxed text-muted-foreground">Install skills, keep your own, and see what your membership opens.</p>
            </div>
            <Button asChild size="sm">
              <Link href={links.signIn}>
                <LogInIcon /> Sign in
              </Link>
            </Button>
            <Link href={links.signUp} className="text-center text-xs text-muted-foreground hover:text-foreground hover:underline">
              Create an account
            </Link>
          </div>
        )}
      </SidebarContent>
    </Sidebar>
  );
}
