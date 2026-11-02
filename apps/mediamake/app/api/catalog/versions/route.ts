import { NextRequest, NextResponse } from 'next/server';
import { accessLevel, getEntitlements, resolveViewer, type Viewer } from '@/lib/access';
import { isInstallCode, readInstallCode } from '@/lib/catalog/install-code';
import { releasesOf } from '@/lib/catalog/releases';
import { catalogItemsDB } from '@/lib/catalog/store';
import { isUpdateToken, readUpdateToken } from '@/lib/catalog/update-token';

/**
 * GET /api/catalog/versions?items=mcp/browse-hack,skill/lyric-video[&notes=10]
 * Authorization: Bearer <update token, install code or API key> (or the session cookie)
 *
 * The live version of each item with its release notes, newest first, so an
 * installed item (or Claude, asked to "update <item>") can tell whether it is
 * behind and what changed. Hands out no package links and logs no downloads,
 * so it is cheap to poll. With an update token, `items` defaults to the items
 * the token covers; items the caller can't open are listed under `missing`.
 */
export async function GET(req: NextRequest) {
  const listed = (req.nextUrl.searchParams.get('items') ?? '')
    .split(',')
    .map(id => id.trim())
    .filter(Boolean);
  const notes = Math.min(50, Math.max(1, Number(req.nextUrl.searchParams.get('notes')) || 10));

  const bearer = req.headers.get('authorization')?.split(' ')[1];
  let viewer: Viewer;
  let allowed: string[] | undefined;
  if (isUpdateToken(bearer)) {
    const token = await readUpdateToken(bearer);
    if (!token) {
      return NextResponse.json(
        { error: 'This update token has lapsed. Copy the install prompt again from MediaMake.' },
        { status: 401 },
      );
    }
    viewer = { clientId: token.clientId };
    allowed = token.items;
  } else if (isInstallCode(bearer)) {
    const code = await readInstallCode(bearer);
    if (!code) return NextResponse.json({ error: 'This install code has expired.' }, { status: 401 });
    viewer = { clientId: code.clientId };
    allowed = [code.itemId];
  } else {
    viewer = await resolveViewer(req);
  }

  const ids = listed.length ? listed : (allowed ?? []);
  if (!ids.length) return NextResponse.json({ error: 'items is required, e.g. ?items=mcp/browse-hack' }, { status: 400 });
  if (ids.length > 50) return NextResponse.json({ error: 'Ask for 50 items at most' }, { status: 400 });

  const entitlements = await getEntitlements(viewer);
  const records = await Promise.all(ids.map(id => (allowed && !allowed.includes(id) ? null : catalogItemsDB.get(id))));
  const items = [];
  const missing: string[] = [];
  for (const [i, record] of records.entries()) {
    // Items the caller can't open answer like missing ones, so their ids can't be probed.
    if (!record || accessLevel(entitlements, record) === 'locked' || !record.versions.length) {
      missing.push(ids[i]);
      continue;
    }
    const releases = releasesOf(record.versions, notes);
    items.push({
      id: record.id,
      title: record.title,
      version: releases[0].version,
      publishedAt: releases[0].publishedAt,
      releases,
    });
  }
  return NextResponse.json({ items, missing });
}
