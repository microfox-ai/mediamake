import { NextRequest } from 'next/server';
import { corsJson, preflight } from '@/lib/mcp/http';
import { protectedResourceMetadata, publicOrigin } from '@/lib/mcp/oauth';

// RFC 9728 metadata for the hosted MCP endpoint. Clients ask for
// /.well-known/oauth-protected-resource/mcp first and fall back to the root.
export function GET(req: NextRequest) {
  return corsJson(protectedResourceMetadata(publicOrigin(req)));
}

export const OPTIONS = preflight;
