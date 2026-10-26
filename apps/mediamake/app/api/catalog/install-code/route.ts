import { NextRequest, NextResponse } from 'next/server';
import { accessLevel, getEntitlements, getViewer } from '@/lib/access';
import { createInstallCode } from '@/lib/catalog/install-code';
import { installPromptFor } from '@/lib/catalog/install-prompt';
import { catalogItemsDB } from '@/lib/catalog/store';

/**
 * POST /api/catalog/install-code { item }
 * Session cookie only. Returns the install prompt with a fresh install code
 * in it, so Claude can install the item without asking for an API key.
 */
export async function POST(req: NextRequest) {
  const { item } = await req.json().catch(() => ({}));
  if (typeof item !== 'string' || !item) return NextResponse.json({ error: 'item is required' }, { status: 400 });

  const viewer = await getViewer();
  if (!viewer.clientId) return NextResponse.json({ error: 'Sign in first' }, { status: 401 });

  const record = await catalogItemsDB.get(item);
  if (!record || !record.versions.length || accessLevel(await getEntitlements(viewer), record) === 'locked') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const { code, expiresAt } = await createInstallCode(viewer.clientId, item);
  return NextResponse.json({ prompt: installPromptFor(item, code), expiresAt });
}
