import { NextRequest, NextResponse } from 'next/server';
import type { Db } from 'mongodb';
import { getUserByClientId } from '@/lib/auth/users';
import { CANONICAL_SITE, siteUrl } from '@/lib/catalog/install-prompt';
import { sendMail } from '@/lib/mail/send';
import { projectSharedMail } from '@/lib/mail/templates';
import { getDatabase } from '@/lib/mongodb';
import { parseShare, type MemberRole, type ProjectInvite, type ProjectMember } from '@/lib/projects/access';
import { accessView, accountFor, findProject, type ProjectDoc } from '@/lib/projects/access-store';
import { PERSONAL_ONLY_YOURS } from '@/lib/projects/personal';
import { githubAfterAdd, githubAfterChange } from '@/lib/space/github-store';

/**
 * Who can open a project (lib/projects/access). Behind the middleware, so
 * x-client-id is the caller.
 *
 * GET    ?projectId=          everyone on the project sees its owner and members; the owner also sees
 *                             emails, pending invites and who can't open it yet.
 * POST   { projectId, role, email | clientId }   the owner adds someone. An email with no account
 *                             becomes an invite, taken up the first time that address signs in.
 *                             With the owner's GitHub connected (/api/space/github), the member is also
 *                             invited to the project's private repo; `github` in the answer says how it went.
 * PATCH  { projectId, role, email | clientId }   the owner changes a member's or an invite's role.
 * DELETE { projectId, email | clientId }         the owner removes a member or an invite; a member
 *                             can remove themselves (leave).
 */

const json = (body: unknown, status = 200) => NextResponse.json(body, { status });
const unauthorized = () => json({ error: 'Unauthorized' }, 401);
const notFound = () => json({ error: 'Project not found or access denied' }, 404);
const ownerOnly = () => json({ error: "Only the project's owner can change who has access" }, 403);

const col = (db: Db) => db.collection<ProjectDoc>('projects');

/** The project when the caller is on it, and whether they own it. */
async function projectFor(db: Db, projectId: string, clientId: string) {
  const project = await findProject(db, projectId);
  if (!project) return null;
  const isOwner = project.clientId === clientId;
  if (!isOwner && !(project.sharedWith ?? []).some(member => member.clientId === clientId)) return null;
  return { project, isOwner };
}

/** The view after a change, so the page needs no second request. */
async function viewAfter(db: Db, projectId: string, clientId: string, extra: Record<string, unknown> = {}, status = 200) {
  const project = await findProject(db, projectId);
  const view = project ? await accessView(db, project, clientId) : null;
  return json({ ...view, ...extra }, status);
}

/** Tells the person. A mail that can't be sent never fails the share. */
async function tell(to: string | undefined, project: ProjectDoc, by: string, role: MemberRole, hasAccount: boolean): Promise<boolean> {
  if (!to) return false;
  try {
    const inviter = await getUserByClientId(by).catch(() => null);
    const site = siteUrl() ?? CANONICAL_SITE;
    const url = hasAccount ? `${site}/app/spaces/${project._id.toString()}` : `${site}/signup?redirectTo=${encodeURIComponent('/app/spaces')}`;
    const { sent } = await sendMail(projectSharedMail(to, { project: project.displayName, by: inviter?.name || inviter?.email || by, role, url, hasAccount }));
    return sent;
  } catch (error) {
    console.error('[projects] Could not send the share mail:', error);
    return false;
  }
}

export async function GET(req: NextRequest) {
  const clientId = req.headers.get('x-client-id');
  if (!clientId) return unauthorized();
  const projectId = new URL(req.url).searchParams.get('projectId');
  if (!projectId) return json({ error: 'projectId is required' }, 400);

  const db = await getDatabase();
  const project = await findProject(db, projectId);
  const view = project ? await accessView(db, project, clientId) : null;
  return view ? json(view) : notFound();
}

export async function POST(req: NextRequest) {
  const clientId = req.headers.get('x-client-id');
  if (!clientId) return unauthorized();
  const target = parseShare(await req.json().catch(() => ({})));
  if ('error' in target) return json(target, 400);
  const role = target.role!;

  const db = await getDatabase();
  const found = await projectFor(db, target.projectId, clientId);
  if (!found) return notFound();
  if (!found.isOwner) return ownerOnly();
  const { project } = found;
  if (project.personal) return json({ error: PERSONAL_ONLY_YOURS }, 400);

  const account = await accountFor(db, target);
  if (!account) {
    if (!target.email) return json({ error: 'No account has that id. Add them by their email instead.' }, 404);
    if ((project.invites ?? []).some(invite => invite.email === target.email)) return json({ error: 'That address is already invited' }, 409);
    const invite: ProjectInvite = { email: target.email, role, invitedBy: clientId, invitedAt: new Date().toISOString() };
    await col(db).updateOne({ _id: project._id }, { $push: { invites: invite }, $set: { updatedAt: new Date() } });
    const mailed = await tell(target.email, project, clientId, role, false);
    return viewAfter(db, target.projectId, clientId, { invite, mailed }, 201);
  }

  if (account.clientId === clientId) return json({ error: 'You own this project already' }, 400);
  if ((project.sharedWith ?? []).some(member => member.clientId === account.clientId)) return json({ error: `${account.name} is already on this project` }, 409);

  const member: ProjectMember = { clientId: account.clientId, role, addedAt: new Date().toISOString(), addedBy: clientId };
  await col(db).updateOne({ _id: project._id }, { $push: { sharedWith: member }, $set: { updatedAt: new Date() } });
  const email = account.email ?? (await getUserByClientId(account.clientId).catch(() => null))?.email;
  const [mailed, github] = await Promise.all([
    tell(email, project, clientId, role, true),
    // the project's private repo (its space): made when there is none, and the new member invited to it
    githubAfterAdd({ id: project._id.toString(), name: project.displayName }, clientId, { clientId: account.clientId, role }),
  ]);
  return viewAfter(db, target.projectId, clientId, { member, mailed, github }, 201);
}

export async function PATCH(req: NextRequest) {
  const clientId = req.headers.get('x-client-id');
  if (!clientId) return unauthorized();
  const target = parseShare(await req.json().catch(() => ({})));
  if ('error' in target) return json(target, 400);

  const db = await getDatabase();
  const found = await projectFor(db, target.projectId, clientId);
  if (!found) return notFound();
  if (!found.isOwner) return ownerOnly();

  const filter = target.email
    ? { _id: found.project._id, 'invites.email': target.email }
    : { _id: found.project._id, 'sharedWith.clientId': target.clientId };
  const field = target.email ? 'invites.$.role' : 'sharedWith.$.role';
  const result = await col(db).updateOne(filter, { $set: { [field]: target.role, updatedAt: new Date() } });
  if (!result.matchedCount) return json({ error: 'They are not on this project' }, 404);
  if (target.clientId && target.role) await githubAfterChange(target.projectId, clientId, target.clientId, target.role);
  return viewAfter(db, target.projectId, clientId);
}

export async function DELETE(req: NextRequest) {
  const clientId = req.headers.get('x-client-id');
  if (!clientId) return unauthorized();
  const target = parseShare(await req.json().catch(() => ({})), { needsRole: false });
  if ('error' in target) return json(target, 400);

  const db = await getDatabase();
  const found = await projectFor(db, target.projectId, clientId);
  if (!found) return notFound();
  const leaving = !found.isOwner && target.clientId === clientId;
  if (!found.isOwner && !leaving) return ownerOnly();

  await col(db).updateOne(
    { _id: found.project._id },
    target.email
      ? { $pull: { invites: { email: target.email } }, $set: { updatedAt: new Date() } }
      : { $pull: { sharedWith: { clientId: target.clientId } }, $set: { updatedAt: new Date() } },
  );
  // off the project's repo too, with the owner's GitHub connection when there is one
  if (target.clientId && found.project.clientId) await githubAfterChange(target.projectId, found.project.clientId, target.clientId, null);
  if (leaving) return json({ success: true, left: true });
  return viewAfter(db, target.projectId, clientId, { success: true });
}
