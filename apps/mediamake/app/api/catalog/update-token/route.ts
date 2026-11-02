import { NextRequest, NextResponse } from 'next/server';
import { getEntitlements, resolveViewer } from '@/lib/access';
import { isInstallCode, readInstallCode } from '@/lib/catalog/install-code';
import { buildInstallPlan } from '@/lib/catalog/install';
import { issueUpdateToken, UPDATE_TOKEN_SECONDS } from '@/lib/catalog/update-token';

/**
 * POST /api/catalog/update-token { token?, items? }
 * Authorization: Bearer <install code> (or a MediaMake API key / the session cookie, with `items`)
 *
 * Trades the install code an item was installed with for a long-lived update
 * token covering that item and its dependencies (see lib/catalog/update-token).
 * Pass the token already saved on the machine as `token` to add the items to
 * it instead of making another.
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const bearer = req.headers.get('authorization')?.split(' ')[1];

  let clientId: string | null;
  let wanted: string[];
  if (isInstallCode(bearer)) {
    const code = await readInstallCode(bearer);
    if (!code) {
      return NextResponse.json(
        { error: 'This install code has expired. Copy the install prompt again from MediaMake.' },
        { status: 401 },
      );
    }
    clientId = code.clientId;
    wanted = [code.itemId];
  } else {
    clientId = (await resolveViewer(req)).clientId;
    if (!clientId) {
      return NextResponse.json({ error: 'Send the install code (or your API key) as "Authorization: Bearer <code>".' }, { status: 401 });
    }
    wanted = Array.isArray(body.items) ? body.items.filter((id: unknown): id is string => typeof id === 'string' && !!id) : [];
    if (!wanted.length) return NextResponse.json({ error: 'items is required, e.g. ["mcp/browse-hack"]' }, { status: 400 });
  }

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
