import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { getClientId } from '@/lib/auth-utils';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-client-id',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

type AuthType = 'cookies' | 'apiKey' | 'oauth' | 'custom';

interface PlatformAuth {
  platform: string;
  authType: AuthType;
  credentials: {
    cookies?: Array<{ name: string; value: string; domain?: string; path?: string }>;
    apiKey?: string;
    accessToken?: string;
    refreshToken?: string;
    custom?: Record<string, unknown>;
  };
  expiresAt?: Date;
  updatedAt: Date;
  clientId: string;
}

function decodeJwtExp(token: string): number | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = parts[1];
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const json = Buffer.from(base64, 'base64').toString('utf8');
    const data = JSON.parse(json) as { exp?: number };
    return typeof data.exp === 'number' ? data.exp : null;
  } catch {
    return null;
  }
}

function extractExpiryFromCredentials(authType: AuthType, credentials: PlatformAuth['credentials']): Date | null {
  if (authType === 'cookies' && credentials.cookies) {
    // For Midjourney, check the auth cookie JWT exp
    const authCookie = credentials.cookies.find((c) => c.name === '__Host-Midjourney.AuthUserTokenV3_i');
    if (authCookie?.value) {
      const exp = decodeJwtExp(authCookie.value);
      if (exp != null) return new Date(exp * 1000);
    }
  }
  // For other auth types, expiry might be in custom fields or not applicable
  return null;
}

/** GET /api/midjourney-cookies?platform=<name> – return stored auth for a platform. */
export async function GET(req: NextRequest) {
  try {
    const clientId = getClientId(req);
    if (!clientId) {
      return NextResponse.json({ error: 'Client ID required (x-client-id)' }, { status: 401, headers: CORS_HEADERS });
    }
    const { searchParams } = new URL(req.url);
    const platform = searchParams.get('platform');
    if (!platform) {
      return NextResponse.json({ error: 'platform query parameter required' }, { status: 400, headers: CORS_HEADERS });
    }
    const db = await getDatabase();
    const doc = await db.collection<PlatformAuth>('platformAuth').findOne(
      { clientId, platform },
      { projection: { credentials: 1, expiresAt: 1, updatedAt: 1, authType: 1 } }
    );
    if (!doc) {
      return NextResponse.json({ credentials: null, expiresAt: null, isExpired: null });
    }
    const expiresAt = doc.expiresAt != null ? new Date(doc.expiresAt).toISOString() : null;
    const isExpired = doc.expiresAt != null ? Date.now() >= new Date(doc.expiresAt).getTime() : null;
    return NextResponse.json(
      {
        platform: doc.platform,
        authType: doc.authType,
        credentials: doc.credentials,
        expiresAt,
        isExpired,
        updatedAt: doc.updatedAt != null ? new Date(doc.updatedAt).toISOString() : null,
      },
      { headers: CORS_HEADERS }
    );
  } catch (error) {
    console.error('GET platform-auth:', error);
    return NextResponse.json({ error: 'Failed to get platform auth' }, { status: 500, headers: CORS_HEADERS });
  }
}

/** POST /api/midjourney-cookies – store platform auth. */
export async function POST(req: NextRequest) {
  try {
    const clientId = getClientId(req);
    if (!clientId) {
      return NextResponse.json({ error: 'Client ID required (x-client-id)' }, { status: 401, headers: CORS_HEADERS });
    }
    const body = await req.json();
    const platform = body.platform;
    const authType = body.authType as AuthType;

    if (!platform || typeof platform !== 'string') {
      return NextResponse.json({ error: 'platform (string) required' }, { status: 400, headers: CORS_HEADERS });
    }
    if (!authType || !['cookies', 'apiKey', 'oauth', 'custom'].includes(authType)) {
      return NextResponse.json({ error: 'authType required: one of cookies, apiKey, oauth, custom' }, { status: 400, headers: CORS_HEADERS });
    }

    let credentials: PlatformAuth['credentials'] = {};
    let expiresAt: Date | null = null;

    // Handle different auth types
    if (authType === 'cookies') {
      const cookies = Array.isArray(body.cookies) ? body.cookies : [];
      if (cookies.length === 0) {
        return NextResponse.json({ error: 'cookies array required for cookies auth type' }, { status: 400, headers: CORS_HEADERS });
      }
      const normalized = cookies.map((c: { name?: string; value?: string; domain?: string; path?: string }) => ({
        name: String(c?.name ?? ''),
        value: String(c?.value ?? ''),
        domain: c?.domain != null ? String(c.domain) : undefined,
        path: c?.path != null ? String(c.path) : undefined,
      }));
      credentials.cookies = normalized;
      expiresAt = extractExpiryFromCredentials('cookies', credentials);
    } else if (authType === 'apiKey') {
      if (!body.apiKey) {
        return NextResponse.json({ error: 'apiKey required for apiKey auth type' }, { status: 400, headers: CORS_HEADERS });
      }
      credentials.apiKey = String(body.apiKey);
      // API keys typically don't expire, but check for expiry if provided
      if (body.expiresAt) {
        expiresAt = new Date(body.expiresAt);
      }
    } else if (authType === 'oauth') {
      if (!body.accessToken) {
        return NextResponse.json({ error: 'accessToken required for oauth auth type' }, { status: 400, headers: CORS_HEADERS });
      }
      credentials.accessToken = String(body.accessToken);
      if (body.refreshToken) credentials.refreshToken = String(body.refreshToken);
      if (body.expiresAt) {
        expiresAt = new Date(body.expiresAt);
      } else if (body.expiresIn) {
        // expiresIn is seconds from now
        expiresAt = new Date(Date.now() + Number(body.expiresIn) * 1000);
      }
    } else if (authType === 'custom') {
      if (!body.custom || typeof body.custom !== 'object') {
        return NextResponse.json({ error: 'custom object required for custom auth type' }, { status: 400, headers: CORS_HEADERS });
      }
      credentials.custom = body.custom;
      if (body.expiresAt) expiresAt = new Date(body.expiresAt);
    } else {
      return NextResponse.json({ error: `Unsupported authType: ${authType}` }, { status: 400, headers: CORS_HEADERS });
    }

    const db = await getDatabase();
    const updatedAt = new Date();
    const authDoc: PlatformAuth = {
      platform,
      authType,
      credentials,
      expiresAt: expiresAt ?? undefined,
      updatedAt,
      clientId,
    };

    await db.collection<PlatformAuth>('platformAuth').updateOne(
      { clientId, platform },
      { $set: authDoc },
      { upsert: true }
    );

    return NextResponse.json(
      {
        success: true,
        platform,
        authType,
        expiresAt: expiresAt != null ? expiresAt.toISOString() : null,
        isExpired: expiresAt != null ? Date.now() >= expiresAt.getTime() : null,
      },
      { headers: CORS_HEADERS }
    );
  } catch (error) {
    console.error('POST platform-auth:', error);
    return NextResponse.json({ error: 'Failed to save platform auth' }, { status: 500, headers: CORS_HEADERS });
  }
}
