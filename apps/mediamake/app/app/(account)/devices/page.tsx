"use client";

import { SiteHeader } from "@/components/site-header";
import { SidebarInset } from "@/components/ui/sidebar";
import { DevicesManager } from "@/components/devices/devices-manager";

export default function DevicesPage() {
    return (
        <SidebarInset>
            <SiteHeader title="Signed-in devices" />
            <DevicesManager />
        </SidebarInset>
    );
}
