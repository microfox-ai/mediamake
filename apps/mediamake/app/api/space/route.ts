import { NextRequest, NextResponse } from 'next/server';
import { canWrite, getProjectRole } from '@/lib/editor/project-access';
import { getDatabase } from '@/lib/mongodb';
import { linkId, linkSpaceId } from '@/lib/space/links';
import { allSpaces, linkDB } from '@/lib/space/links-store';
import { applyReport, deviceLabel, dropDevice, parseSpaceReport, projectId, projectSpaceId, repoName, repoNow, userSpaceId } from '@/lib/space/space';
import { spaceDB } from '@/lib/space/store';

/**
 * Spaces: the private git repos with what members made for themselves
 * (`mm space`), as their computers report them. A member has a space of
 * their own, and every project has one its members share. Behind the
 * middleware, so x-client-id is the signed-in account.
 *
 * GET    the account's own space and the space of every project it is on: each item and where
 *        it stands on each computer. People who may change a project also get its members'
 *        GitHub logins, to invite them to the project's repo. `linked` has the linked items
 *        (lib/space/links) the account owns or may use; they are changed at /api/space/links.
 * PUT    { device, repo, project?, item?, branch, commit, commitAt, pushed, items: [{ kind, name, version, title, summary, changed, media }] }
 *        what one computer's clone holds now. Names, versions, titles and one-line summaries
 *        only: never a file or a token. With `project`, the report is about that project's
 *        space, from anyone on the project; with `item`, about that linked item's repo, from
 *        anyone who has it.
 * POST   { project, repo }   names the repo of a project's space. Its owner and editors only.
 * DELETE ?device=<label>[&project=<id>|&item=<id>]   that computer disconnected; with neither, forget
 *        the account's own space and its computers everywhere (the repos are untouched).
 */
const signIn = () => NextResponse.json({ error: 'Sign in first' }, { status: 401 });
const failed = (what: string, error: unknown) => {
  console.error(`[space] Could not ${what}:`, error);
  return NextResponse.json({ error: `Could not ${what}` }, { status: 503 });
};

export async function GET(req: NextRequest) {
  const clientId = req.headers.get('x-client-id');
  if (!clientId) return signIn();
  try {
    return NextResponse.json(await allSpaces(clientId));
  } catch (error) {
    return failed('read the spaces', error);
  }
}

export async function PUT(req: NextRequest) {
  const clientId = req.headers.get('x-client-id');
  if (!clientId) return signIn();
  const report = parseSpaceReport(await req.json().catch(() => null));
  if ('error' in report) return NextResponse.json({ error: report.error }, { status: 400 });
  try {
    let spaceId = userSpaceId(clientId);
    if (report.project) {
      const role = await getProjectRole(await getDatabase(), report.project, clientId);
      if (!role) return NextResponse.json({ error: 'You are not on that project' }, { status: 403 });
      spaceId = projectSpaceId(report.project);
    }
    if (report.item) {
      const link = await linkDB.byId(report.item);
      if (!link || !(await linkDB.roleOf(link, clientId))) return NextResponse.json({ error: 'That item is not shared with you' }, { status: 403 });
      // only POST /api/space/links names a linked item's repo
      if (repoNow(link, report.repo) !== link.repo) return NextResponse.json({ error: `That item's repo is ${link.repo}` }, { status: 409 });
      report.repo = link.repo;
      // the repo holds that one item: nothing else is taken from a report about it
      report.items = report.items.filter(item => item.kind === link.kind && item.name === link.name);
      spaceId = linkSpaceId(link.id);
    }
    const before = await spaceDB.stateOf(spaceId);
    // a repo renamed on GitHub is the same repo for a computer still on its old name
    report.repo = repoNow(before.space, report.repo);
    if (report.project && before.space?.repo !== report.repo) {
      // only POST names a project's repo, so a member's stray clone can't replace it
      return NextResponse.json({ error: before.space ? `That project's space is ${before.space.repo}` : "That project has no space yet: mm space share makes it" }, { status: 409 });
    }
    const change = applyReport(before, spaceId, clientId, report);
    await spaceDB.save(before, change);
    return NextResponse.json({ space: spaceId, repo: change.space.repo, device: report.device, items: report.items.length });
  } catch (error) {
    return failed('save the report', error);
  }
}

export async function POST(req: NextRequest) {
  const clientId = req.headers.get('x-client-id');
  if (!clientId) return signIn();
  const body = (await req.json().catch(() => null)) as { project?: unknown; repo?: unknown } | null;
  const project = projectId(body?.project);
  const repo = repoName(body?.repo);
  if (!project || !repo) return NextResponse.json({ error: 'Send { project, repo }: a project id and its repo as owner/name' }, { status: 400 });
  try {
    const role = await getProjectRole(await getDatabase(), project, clientId);
    if (!role) return NextResponse.json({ error: 'You are not on that project' }, { status: 403 });
    if (!canWrite(role)) return NextResponse.json({ error: "Only the project's owner and editors can set up its space" }, { status: 403 });
    const space = await spaceDB.setProjectRepo(project, repo);
    return NextResponse.json({ space: space.id, repo: space.repo });
  } catch (error) {
    return failed("set the project's space", error);
  }
}

export async function DELETE(req: NextRequest) {
  const clientId = req.headers.get('x-client-id');
  if (!clientId) return signIn();
  const device = req.nextUrl.searchParams.get('device');
  const project = projectId(req.nextUrl.searchParams.get('project'));
  const item = linkId(req.nextUrl.searchParams.get('item'));
  try {
    if (!device) return NextResponse.json({ forgotten: await spaceDB.forget(clientId) });
    const spaceId = item ? linkSpaceId(item) : project ? projectSpaceId(project) : userSpaceId(clientId);
    const before = await spaceDB.stateOf(spaceId);
    const change = dropDevice(before, spaceId, clientId, deviceLabel(device));
    if (change) await spaceDB.save(before, change);
    return NextResponse.json({ dropped: change ? deviceLabel(device) : null });
  } catch (error) {
    return failed('delete', error);
  }
}
