import { NextRequest } from 'next/server';
import { corsJson, preflight } from '@/lib/mcp/http';
import { authorizationServerMetadata, publicOrigin } from '@/lib/mcp/oauth';

// RFC 8414 metadata for the OAuth server behind the hosted MCP endpoint.
export function GET(req: NextRequest) {
  return corsJson(authorizationServerMetadata(publicOrigin(req)));
}

export const OPTIONS = preflight;
