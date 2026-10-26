import { NextResponse } from 'next/server';

/**
 * Browser-based MCP clients (the MCP Inspector, web IDEs) call the OAuth and
 * /mcp endpoints cross-origin. They authenticate with Bearer tokens, never
 * cookies, so any origin may call them.
 */
export const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
  'Access-Control-Allow-Headers':
    'Authorization, Content-Type, Accept, Mcp-Session-Id, Mcp-Protocol-Version, Last-Event-ID',
  'Access-Control-Expose-Headers': 'Mcp-Session-Id, Mcp-Protocol-Version, WWW-Authenticate',
  'Access-Control-Max-Age': '86400',
};

export const preflight = () => new NextResponse(null, { status: 204, headers: CORS_HEADERS });

export function corsJson(body: unknown, init: { status?: number; headers?: Record<string, string> } = {}) {
  return NextResponse.json(body, {
    status: init.status ?? 200,
    headers: { ...CORS_HEADERS, 'Cache-Control': 'no-store', ...init.headers },
  });
}

/** Reads an OAuth request body: form-encoded per the spec, JSON accepted too. */
export async function readParams(req: Request): Promise<Record<string, string>> {
  const type = req.headers.get('content-type') ?? '';
  if (type.includes('application/json')) {
    const body = await req.json().catch(() => ({}));
    return Object.fromEntries(
      Object.entries(body ?? {}).filter(([, v]) => typeof v === 'string'),
    ) as Record<string, string>;
  }
  const form = new URLSearchParams(await req.text());
  return Object.fromEntries(form.entries());
}

/** client_id and client_secret from an HTTP Basic header or the body. */
export function clientCredentials(req: Request, params: Record<string, string>) {
  const auth = req.headers.get('authorization');
  if (auth?.toLowerCase().startsWith('basic ')) {
    const decoded = Buffer.from(auth.slice(6).trim(), 'base64').toString('utf8');
    const i = decoded.indexOf(':');
    if (i > 0)
      return {
        clientId: decodeURIComponent(decoded.slice(0, i)),
        clientSecret: decodeURIComponent(decoded.slice(i + 1)),
      };
  }
  return { clientId: params.client_id, clientSecret: params.client_secret };
}
