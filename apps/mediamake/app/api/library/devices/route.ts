import { NextRequest, NextResponse } from 'next/server';
import { deviceDB } from '@/lib/cloud-library/device-store';
import { DEVICE_LABEL, parseDeviceAsk, parseDeviceId, parseDeviceReport } from '@/lib/cloud-library/devices';
import { answer, caller, failed, mayUseLibrary, refuse, spaceOf } from '@/lib/cloud-library/http';

/**
 * Device libraries (docs/library.md › Device libraries): what each computer holds, as cards.
 *
 * GET    ?space=<id>                 the computers the caller may look into from this space: their
 *                                    own, and the ones their owner opened to the project.
 *        ?space=<id>&of=<owner>/<label> [&q=&kind=&where=device|both&limit=&skip=]
 *                                    one computer's files, each with where it is.
 * POST   { device, run, cards, done } one part of a computer's own report (`mm library report`).
 * DELETE ?label=<label>              takes the caller's computer's cards out. Its files are untouched.
 */
export async function GET(req: NextRequest) {
  const { clientId } = caller(req);
  if (!clientId) return refuse('Sign in first', 401);
  const params = req.nextUrl.searchParams;
  try {
    const found = await spaceOf(clientId, params.get('space'), 'read');
    if ('response' in found) return found.response;
    if (!params.has('of')) return NextResponse.json({ devices: await deviceDB.list(found.space, clientId) });
    const device = parseDeviceId(params.get('of'));
    if (!device) return refuse('of is a computer as the list names it: <owner>/<label>');
    return answer(await deviceDB.files(found.space, clientId, device, parseDeviceAsk(params)));
  } catch (error) {
    return failed('read the computers', error);
  }
}

export async function POST(req: NextRequest) {
  const { clientId } = caller(req);
  if (!clientId) return refuse('Sign in first', 401);
  try {
    const locked = await mayUseLibrary(clientId);
    if (locked) return locked;
    const report = parseDeviceReport(await req.json().catch(() => null));
    if ('error' in report) return refuse(report.error);
    return answer(await deviceDB.report(clientId, report));
  } catch (error) {
    return failed('save the report', error);
  }
}

export async function DELETE(req: NextRequest) {
  const { clientId } = caller(req);
  if (!clientId) return refuse('Sign in first', 401);
  const label = req.nextUrl.searchParams.get('label') ?? '';
  if (!DEVICE_LABEL.test(label)) return refuse("label is the computer's label (mm access shows it)");
  try {
    return NextResponse.json(await deviceDB.forget(clientId, label));
  } catch (error) {
    return failed('forget the computer', error);
  }
}
