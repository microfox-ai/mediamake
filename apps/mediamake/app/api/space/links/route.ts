import { NextRequest, NextResponse } from 'next/server';
import { getUserByClientId } from '@/lib/auth/users';
import { CANONICAL_SITE, siteUrl } from '@/lib/catalog/install-prompt';
import { canWrite, getProjectRole } from '@/lib/editor/project-access';
import { sendMail } from '@/lib/mail/send';
import { itemSharedMail } from '@/lib/mail/templates';
import { getDatabase } from '@/lib/mongodb';
import { accountFor, findProject } from '@/lib/projects/access-store';
import { addInvite, addPerson, linkProject, parseLinkAction, parseNewLink, removePerson, unlinkProject, type LinkRecord } from '@/lib/space/links';
import { allSpaces, githubAfterLink, linkDB } from '@/lib/space/links-store';
import { repoName } from '@/lib/space/space';

/**
 * Linked items (lib/space/links): one skill, MCP or app of a member, in a
 * private repo of its own, linked to any number of project spaces and
 * shared with named members. Behind the middleware, so x-client-id is the
 * signed-in account. `GET /api/space` lists them (`linked`).
 *
 * POST   { kind, name, repo }   the caller's item now lives in that repo (`mm space link` made it
 *                               and moved the item there). Answers its id.
 * PATCH  { item, action: 'link' | 'unlink', project }
 *                               link: the item's owner, who is the project's owner or an editor on
 *                               it. Everyone on the project then gets the item. unlink: the item's
 *                               owner or the project's owner; only that project's people lose it.
 *        { item, action: 'add', email | clientId, editor? }
 *                               the owner names a member outside any project, or changes whether a
 *                               named member is an editor (may change the item). An email with no
 *                               account waits as an invite.
 *        { item, action: 'remove', email | clientId }
 *                               the owner takes a named member off; a named member can leave.
 *        Each answers the caller's linked items again, and `github`: how it went on the item's
 *        repo when its owner connected GitHub (invited, removed), else that the owner's next
 *        `mm space sync` does it.
 */
const json = (body: unknown, status = 200) => NextResponse.json(body, { status });
const signIn = () => json({ error: 'Sign in first' }, 401);
const failed = (what: string, error: unknown) => {
  console.error(`[space] Could not ${what}:`, error);
  return json({ error: `Could not ${what}` }, 503);
};

export async function POST(req: NextRequest) {
  const clientId = req.headers.get('x-client-id');
  if (!clientId) return signIn();
  const made = parseNewLink(await req.json().catch(() => null), repoName);
  if ('error' in made) return json(made, 400);
  try {
    const link = await linkDB.ensure(clientId, made.kind, made.name, made.repo);
    return json({ item: link.id, repo: link.repo });
  } catch (error) {
    return failed('keep the linked item', error);
  }
}

/** Tells someone the owner named. A mail that can't be sent never fails the share. */
async function tell(to: string | undefined, link: LinkRecord, editor: boolean, hasAccount: boolean): Promise<boolean> {
  if (!to) return false;
  try {
    const owner = await getUserByClientId(link.owner).catch(() => null);
    const site = siteUrl() ?? CANONICAL_SITE;
    const url = hasAccount ? `${site}/app/mine?tab=shared` : `${site}/signup?redirectTo=${encodeURIComponent('/app/mine')}`;
    return (await sendMail(itemSharedMail(to, { item: link.name, kind: link.kind, by: owner?.name || owner?.email || 'A MediaMake member', editor, url, hasAccount }))).sent;
  } catch (error) {
    console.error('[space] Could not send the share mail:', error);
    return false;
  }
}

export async function PATCH(req: NextRequest) {
  const clientId = req.headers.get('x-client-id');
  if (!clientId) return signIn();
  const act = parseLinkAction(await req.json().catch(() => null));
  if ('error' in act) return json(act, 400);
  try {
    const link = await linkDB.byId(act.item);
    const role = link ? await linkDB.roleOf(link, clientId) : null;
    if (!link || !role) return json({ error: 'No such item, or it is not shared with you' }, 404);
    const isOwner = role === 'owner';
    const db = await getDatabase();
    const now = new Date().toISOString();
    let next = link;
    let mailed: boolean | undefined;

    if (act.action === 'link') {
      if (!isOwner) return json({ error: "Only the item's owner links it to a project" }, 403);
      const project = await findProject(db, act.project);
      if (!project || project.personal) return json({ error: 'No such project' }, 404);
      if (!canWrite(await getProjectRole(db, act.project, clientId))) return json({ error: "Only a project's owner and editors can link an item to it" }, 403);
      next = linkProject(link, act.project, clientId, now);
    } else if (act.action === 'unlink') {
      if (!isOwner && (await getProjectRole(db, act.project, clientId)) !== 'owner') return json({ error: "Only the item's owner or the project's owner unlinks it" }, 403);
      next = unlinkProject(link, act.project, now);
    } else if (act.action === 'add') {
      if (!isOwner) return json({ error: "Only the item's owner decides who has it" }, 403);
      const account = await accountFor(db, act);
      if (account?.clientId === clientId) return json({ error: 'It is yours already' }, 400);
      if (account) {
        next = addPerson(link, account.clientId, act.editor, clientId, now);
        const isNew = !link.people.some(person => person.clientId === account.clientId);
        if (isNew) mailed = await tell(account.email ?? (await getUserByClientId(account.clientId).catch(() => null))?.email, link, act.editor, true);
      } else if (act.email) {
        next = addInvite(link, act.email, act.editor, clientId, now);
        if (!link.invites.some(invite => invite.email === act.email)) mailed = await tell(act.email, link, act.editor, false);
      } else return json({ error: 'No account has that id. Name them by their email instead.' }, 404);
    } else if (act.action === 'remove') {
      const account = act.clientId ? { clientId: act.clientId } : act.email ? await accountFor(db, act) : null;
      const leaving = !isOwner && account?.clientId === clientId;
      if (!isOwner && !leaving) return json({ error: "Only the item's owner decides who has it" }, 403);
      next = removePerson(link, { clientId: account?.clientId, email: act.email }, now);
    }

    if (next !== link) await linkDB.save(next);
    const github = next !== link ? await githubAfterLink(next) : undefined;
    const linked = (await allSpaces(clientId)).linked ?? [];
    return json({ linked, item: linked.find(view => view.id === link.id) ?? null, ...(github && { github }), ...(mailed !== undefined && { mailed }) });
  } catch (error) {
    return failed('change the linked item', error);
  }
}
