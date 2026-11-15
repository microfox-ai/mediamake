import { NextRequest } from 'next/server';
import { corsJson, preflight } from '@/lib/mcp/http';
import { protectedResourceMetadata, publicOrigin } from '@/lib/mcp/oauth';

// RFC 9728 metadata for the hosted MCP endpoints. Clients ask for
// /.well-known/oauth-protected-resource<the address's path> first (/mcp,
// /mcp/release, /mcp/use) and fall back to the root.
export async function GET(req: NextRequest, { params }: { params: Promise<{ resource?: string[] }> }) {
  const { resource } = await params;
  return corsJson(protectedResourceMetadata(publicOrigin(req), resource?.length ? `/${resource.join('/')}` : '/mcp'));
}

export const OPTIONS = preflight;
