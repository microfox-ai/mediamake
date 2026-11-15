"use client";

import { SiteHeader } from "@/components/site-header";
import { SidebarInset } from "@/components/ui/sidebar";
import { ReleasesDashboard } from "@/components/releases/releases-dashboard";

export default function ReleasesPage() {
    return (
        <SidebarInset>
            <SiteHeader title="Releases" />
            <ReleasesDashboard />
        </SidebarInset>
    );
}
