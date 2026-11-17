'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  BadgeCheckIcon,
  CompassIcon,
  CreditCardIcon,
  FolderIcon,
  HomeIcon,
  KeyIcon,
  LibraryIcon,
  LogOutIcon,
  InboxIcon,
  MessageSquareTextIcon,
  MonitorSmartphoneIcon,
  PlugIcon,
  RocketIcon,
  UsersIcon,
  type LucideIcon,
} from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar';
import { APP_HOME, isActive, navFor, type AppNavIcon } from '@/lib/app-shell/nav';
import { tierLabel, tierOpens, type MemberTier } from '@/lib/memberships/tiers';

const ICONS: Record<AppNavIcon, LucideIcon> = {
  home: HomeIcon,
  explore: CompassIcon,
  mine: LibraryIcon,
  projects: FolderIcon,
  releases: RocketIcon,
  mcp: PlugIcon,
  billing: CreditCardIcon,
  memberships: UsersIcon,
  feedback: MessageSquareTextIcon,
  submissions: InboxIcon,
  keys: KeyIcon,
  devices: MonitorSmartphoneIcon,
  subscription: BadgeCheckIcon,
};

/**
 * The app's sidebar: Home, Features, Admin (admins only) and Account, from
 * lib/app-shell/nav. A page the person's membership doesn't open yet stays
 * listed with the membership it needs beside it.
 */
export function AppShellSidebar({
  tier,
  clientId,
  ...props
}: React.ComponentProps<typeof Sidebar> & { tier: MemberTier; clientId: string }) {
  const pathname = usePathname() ?? APP_HOME;
  const { isMobile, setOpenMobile } = useSidebar();
  const closeOnPhone = () => {
    if (isMobile) setOpenMobile(false);
  };

  const signOut = async () => {
    try {
      await fetch('/api/logout', { method: 'POST' });
    } finally {
      window.location.assign('/');
    }
  };

  return (
    <Sidebar collapsible="offcanvas" {...props}>
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
        {navFor(tier).map((section, index) => (
          <SidebarGroup key={section.label ?? index}>
            {section.label && <SidebarGroupLabel>{section.label}</SidebarGroupLabel>}
            <SidebarGroupContent>
              <SidebarMenu>
                {section.items.map(item => {
                  const Icon = ICONS[item.icon];
                  const locked = !!item.needs && !tierOpens(tier, item.needs);
                  return (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton asChild isActive={isActive(item, pathname)} tooltip={item.title}>
                        <Link href={item.href} onClick={closeOnPhone}>
                          <Icon />
                          <span className="truncate">{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                      {locked && (
                        <SidebarMenuBadge className="text-[10px] font-normal text-muted-foreground">
                          {tierLabel(item.needs!)}
                        </SidebarMenuBadge>
                      )}
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <Link
              href="/app/subscription"
              onClick={closeOnPhone}
              className="flex items-center justify-between gap-2 rounded-md px-2 py-1.5 text-xs hover:bg-sidebar-accent"
              title="Your membership"
            >
              <span className="min-w-0 truncate text-muted-foreground">{clientId}</span>
              <span className="shrink-0 rounded-md border px-1.5 py-0.5 font-medium">{tierLabel(tier)}</span>
            </Link>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={signOut}>
              <LogOutIcon />
              Sign out
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
