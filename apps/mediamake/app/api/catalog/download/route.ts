import { NextRequest, NextResponse } from 'next/server';
import { accessLevel, getEntitlements, resolveViewer } from '@/lib/access';
import { catalogItemsDB } from '@/lib/catalog/store';
import { createDownloadUrl } from '@/lib/catalog/storage';

/**
 * GET /api/catalog/download?item=skill/lyric-video[&version=1.2.0][&redirect=1]
 * A 5-minute signed link to the package, for viewers who may open the item.
 * Every link handed out is logged.
 */
export async function GET(req: NextRequest) {
  const itemId = req.nextUrl.searchParams.get('item');
  const wanted = req.nextUrl.searchParams.get('version');
  if (!itemId) return NextResponse.json({ error: 'item is required' }, { status: 400 });

  const item = await catalogItemsDB.get(itemId);
  if (!item) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const viewer = await resolveViewer(req);
  const access = accessLevel(await getEntitlements(viewer), item);
  // Locked items answer like missing ones, so their ids can't be probed.
  if (access === 'locked') return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const version = wanted
    ? item.versions.find(v => v.version === wanted)
    : item.versions[item.versions.length - 1];
  if (!version) return NextResponse.json({ error: 'No published version' }, { status: 404 });

  const url = await createDownloadUrl(version.storageKey, `${item.slug}-${version.version}.tar.gz`);
  await catalogItemsDB
    .logDownload({ itemId, version: version.version, clientId: viewer.clientId, at: new Date().toISOString() })
    .catch(error => console.error('[catalog] Could not log download:', error));

  if (req.nextUrl.searchParams.get('redirect')) return NextResponse.redirect(url);
  return NextResponse.json({ url, version: version.version, sha256: version.sha256, expiresInSeconds: 300 });
}
