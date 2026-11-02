import { NextRequest, NextResponse } from 'next/server';
import { accessLevel, getEntitlements, getViewer } from '@/lib/access';
import { createInstallCode } from '@/lib/catalog/install-code';
import { installPromptFor } from '@/lib/catalog/install-prompt';
import { getCatalogRecord } from '@/lib/catalog/records';
import { isInstallable } from '@/lib/catalog/types';

/**
 * POST /api/catalog/install-code { item }
 * Session cookie only. Returns the install prompt with a fresh install code
 * in it, so Claude can install the item without asking for an API key. Open
 * items (a skill) get one too: the code tells the plan who is installing, so
 * the MCPs shared with them come back as choices they can take.
 */
export async function POST(req: NextRequest) {
  const { item } = await req.json().catch(() => ({}));
  if (typeof item !== 'string' || !item) return NextResponse.json({ error: 'item is required' }, { status: 400 });

  const viewer = await getViewer();
  if (!viewer.clientId) return NextResponse.json({ error: 'Sign in first' }, { status: 401 });

  const record = await getCatalogRecord(item);
  if (!record || !isInstallable(record) || accessLevel(await getEntitlements(viewer), record) === 'locked') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const { code, expiresAt } = await createInstallCode(viewer.clientId, item);
  return NextResponse.json({ prompt: installPromptFor(item, code), expiresAt });
}
