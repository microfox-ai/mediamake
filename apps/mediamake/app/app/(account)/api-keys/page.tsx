"use client";

import { SiteHeader } from "@/components/site-header";
import { SidebarInset } from "@/components/ui/sidebar";
import { ApiKeysManager } from "@/components/api-keys/api-keys-manager";
import { ConnectMcpCard } from "@/components/api-keys/connect-mcp-card";
import { SignInMethods } from "@/components/account/sign-in-methods";

export default function ApiKeysPage() {
    return (
        <SidebarInset>
            <SiteHeader title="API Keys" />
            <SignInMethods />
            <ApiKeysManager />
            <ConnectMcpCard />
        </SidebarInset>
    );
}
