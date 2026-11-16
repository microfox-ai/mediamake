import { NextRequest, NextResponse } from 'next/server';
import { applyReport, deviceLabel, dropDevice, parseSpaceReport, spaceView } from '@/lib/space/space';
import { spaceDB } from '@/lib/space/store';

/**
 * A member's private space: the private git repo with their own skills,
 * MCPs and apps (`mm space`), as their computers report it. Behind the
 * middleware, so x-client-id is the signed-in account, and an account
 * reads, reports and deletes only its own.
 *
 * PUT  { device, repo, branch, commit, commitAt, pushed, items: [{ kind, name, version, title, summary, changed, media }] }
 *        what one computer's clone holds now. It replaces what that computer said before.
 *        Names, versions, titles and one-line summaries only: never a file or a token.
 * GET    the space as Mine shows it: every item, its version and which computers have it.
 * DELETE ?device=<label>   that computer disconnected; without it, forget the whole space
 *        (what MediaMake holds: the repo is the member's and is untouched).
 */
const signIn = () => NextResponse.json({ error: 'Sign in first' }, { status: 401 });

export async function PUT(req: NextRequest) {
  const clientId = req.headers.get('x-client-id');
  if (!clientId) return signIn();
  const report = parseSpaceReport(await req.json().catch(() => null));
  if ('error' in report) return NextResponse.json({ error: report.error }, { status: 400 });
  try {
    const before = await spaceDB.stateOf(clientId);
    const change = applyReport(before, clientId, report);
    await spaceDB.save(clientId, before, change);
    return NextResponse.json({ repo: change.space.repo, device: report.device, items: report.items.length, devices: change.space.devices.length });
  } catch (error) {
    console.error('[space] Could not save a report:', error);
    return NextResponse.json({ error: 'Could not save the space' }, { status: 503 });
  }
}

export async function GET(req: NextRequest) {
  const clientId = req.headers.get('x-client-id');
  if (!clientId) return signIn();
  try {
    return NextResponse.json({ space: spaceView(await spaceDB.stateOf(clientId)) });
  } catch (error) {
    console.error('[space] Could not read the space:', error);
    return NextResponse.json({ error: 'Could not read the space' }, { status: 503 });
  }
}

export async function DELETE(req: NextRequest) {
  const clientId = req.headers.get('x-client-id');
  if (!clientId) return signIn();
  const device = req.nextUrl.searchParams.get('device');
  try {
    if (!device) return NextResponse.json({ forgotten: await spaceDB.forget(clientId) });
    const before = await spaceDB.stateOf(clientId);
    const change = dropDevice(before, clientId, deviceLabel(device));
    if (change) await spaceDB.save(clientId, before, change);
    return NextResponse.json({ dropped: change ? deviceLabel(device) : null });
  } catch (error) {
    console.error('[space] Could not delete:', error);
    return NextResponse.json({ error: 'Could not delete' }, { status: 503 });
  }
}
