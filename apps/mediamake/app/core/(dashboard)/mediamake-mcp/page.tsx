import { SiteHeader } from '@/components/site-header';
import { SidebarInset } from '@/components/ui/sidebar';
import { McpGuide } from '@/components/mediamake-mcp/mcp-guide';
import { getEntitlements, getViewer, viewerTier } from '@/lib/access';
import { CANONICAL_SITE, installPromptFor, siteUrl } from '@/lib/catalog/install-prompt';
import { getCatalogRecord } from '@/lib/catalog/records';
import { HOSTED_MCP_ITEM, mayUseHostedMcp } from '@/lib/mcp/access';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'MediaMake MCP · MediaMake' };

/**
 * /core/mediamake-mcp: how to connect the hosted MediaMake MCP (/mcp) to
 * Claude, and whether the person looking may. Who may follows the
 * mcp/mediamake catalog item (lib/mcp/access), so this page needs no change
 * when the item moves to community or public.
 */
export default async function MediamakeMcpPage() {
  const viewer = await getViewer();
  const [entitlements, item] = await Promise.all([getEntitlements(viewer), getCatalogRecord(HOSTED_MCP_ITEM)]);
  const tier = viewerTier(entitlements);

  return (
    <SidebarInset>
      <SiteHeader title="MediaMake MCP" />
      <McpGuide
        mcpUrl={`${siteUrl() ?? CANONICAL_SITE}/mcp`}
        installPrompt={installPromptFor(HOSTED_MCP_ITEM)}
        clientId={viewer.clientId}
        tier={tier}
        canConnect={!!viewer.clientId && mayUseHostedMcp(entitlements, item)}
        stage={item?.visibility ?? 'private'}
      />
    </SidebarInset>
  );
}
