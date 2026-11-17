import { NextRequest, NextResponse } from 'next/server';
import { getEntitlements, resolveViewer } from '@/lib/access';
import { buildInstallPlan } from '@/lib/catalog/install';
import { issueUpdateToken, UPDATE_TOKEN_SECONDS } from '@/lib/catalog/update-token';

/**
 * POST /api/catalog/update-token { items, token? }
 * Authorization: Bearer <MediaMake API key> (or the session cookie)
 *
 * A long-lived update token covering the installed items and their
 * dependencies (see lib/catalog/update-token): `mm items install` asks for it
 * after an install, so installed MCPs can check for updates on their own.
 * Pass the token already saved on the machine as `token` to add the items to
 * it instead of making another.
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));

  const { clientId } = await resolveViewer(req);
  if (!clientId) return NextResponse.json({ error: 'Send your MediaMake API key as "Authorization: Bearer <key>".' }, { status: 401 });
  const wanted: string[] = Array.isArray(body.items) ? body.items.filter((id: unknown): id is string => typeof id === 'string' && !!id) : [];
  if (!wanted.length) return NextResponse.json({ error: 'items is required, e.g. ["mcp/browse-hack"]' }, { status: 400 });

  // The item and every catalog item its install plan brings in.
  const entitlements = await getEntitlements({ clientId });
  const items = new Set<string>();
  for (const id of wanted) {
    const plan = await buildInstallPlan(id, entitlements);
    if (!plan.ok) return NextResponse.json({ error: plan.status === 404 ? `${id}: Not found` : plan.error }, { status: plan.status });
    for (const step of plan.steps) if (step.type === 'item') items.add(step.id);
  }

  const existing = typeof body.token === 'string' ? body.token : undefined;
  const issued = await issueUpdateToken(clientId, [...items], existing);
  return NextResponse.json({ ...issued, lapsesAfterUnusedDays: UPDATE_TOKEN_SECONDS / 86_400 });
}
