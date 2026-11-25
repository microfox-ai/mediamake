import { revalidatePath } from 'next/cache';
import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-utils';
import { listAccounts } from '@/lib/auth/accounts';
import { itemPagePath } from '@/lib/catalog/paths';
import { getCatalogRecord } from '@/lib/catalog/records';
import { itemTier } from '@/lib/catalog/types';
import { mailConfigured } from '@/lib/mail/send';
import { publicOrigin } from '@/lib/mcp/oauth';
import { approveSubmission, finishRelease, reviewSubmission } from '@/lib/submissions/actions';
import { publicRepo, storeConfigured, storeRepo } from '@/lib/submissions/github';
import { submissionsDB } from '@/lib/submissions/store';
import { countByStatus, earnedTier, isMembershipChoice, isSubmissionTier, routeOf, SUBMISSION_TIERS } from '@/lib/submissions/submission';

/**
 * The admin Submissions page (/app/submissions). Admins only.
 *
 * GET            every submission, newest first, with its sender's name, the
 *                counts by status and what is set up (the token, the two
 *                repositories, mail). `?only=count` gives how many wait.
 * GET ?id=sub_…  one submission with its files (text as it was sent; a
 *                binary file by name and size only) and the catalog item of
 *                the same name, when there is one.
 * POST           one action:
 *                { type: 'approve', submissionId, tier, membership?, note?, notify? }
 *                    tier is public, plus, pro or cohort; membership is plus, pro, cohort or none
 *                    (left out: what the tier earns, see earnedTier)
 *                { type: 'changes', submissionId, note, notify? }   ask the sender for changes
 *                { type: 'decline', submissionId, note, notify? }
 *                { type: 'release', submissionId }                  try the package again
 *                { type: 'released', submissionId }                 an admin released it by hand
 *                Approving or releasing a skill's package fills its listing from the package's
 *                README.md (lib/submissions/package-listing): the answer's `listing` says what it
 *                took, and `notes` what was left because it was set by hand.
 */
export const maxDuration = 60;

async function admin(req: NextRequest) {
  try {
    return await requireAdmin(req);
  } catch {
    return null;
  }
}

const forbidden = () => NextResponse.json({ error: 'Admin access required' }, { status: 403 });
const bad = (error: string, status = 400) => NextResponse.json({ error }, { status });

async function safely<T>(what: string, load: Promise<T>, fallback: T): Promise<T> {
  try {
    return await load;
  } catch (error) {
    console.error(`[admin/submissions] Could not load ${what}:`, error);
    return fallback;
  }
}

/** What fits in the page: a text file up to this many characters. */
const SHOWN_CHARS = 200_000;

export async function GET(req: NextRequest) {
  if (!(await admin(req))) return forbidden();
  const params = req.nextUrl.searchParams;
  if (params.get('only') === 'count') return NextResponse.json({ pending: await safely('the count', submissionsDB.pendingCount(), 0) });

  const id = params.get('id');
  if (id) {
    const submission = await safely('the submission', submissionsDB.get(id), null);
    if (!submission) return bad('No such submission', 404);
    const [files, existing] = await Promise.all([safely('its files', submissionsDB.filesOf(id), []), getCatalogRecord(submission.itemId).catch(() => null)]);
    return NextResponse.json({
      submission,
      files: files
        .map(file => (file.encoding === 'utf8' ? { path: file.path, text: file.content.slice(0, SHOWN_CHARS), ...(file.content.length > SHOWN_CHARS && { cut: true }) } : { path: file.path, binary: true }))
        .sort((a, b) => a.path.localeCompare(b.path)),
      existing: existing && {
        title: existing.title,
        tier: itemTier(existing),
        version: existing.versions?.at(-1)?.version,
        inRepo: !!existing.inRepo,
        ...(existing.madeBy && { madeBy: existing.madeBy.name }),
      },
    });
  }

  const [submissions, accounts] = await Promise.all([safely('submissions', submissionsDB.all(), []), safely('accounts', listAccounts(), [])]);
  const senders = new Set(submissions.map(submission => submission.clientId));
  const people = Object.fromEntries(
    accounts.filter(account => senders.has(account.clientId)).map(account => [account.clientId, { name: account.name || account.email || account.clientId, ...(account.githubLogin && { github: account.githubLogin }) }]),
  );
  return NextResponse.json({
    submissions,
    counts: countByStatus(submissions),
    people,
    tiers: SUBMISSION_TIERS.map(tier => ({ tier, earns: earnedTier(tier), skill: routeOf('skill', tier), other: routeOf('mcp', tier) })),
    setup: { github: storeConfigured(), storeRepo: storeRepo(), publicRepo: publicRepo(), mail: mailConfigured() },
  });
}

export async function POST(req: NextRequest) {
  const by = await admin(req);
  if (!by) return forbidden();
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body || typeof body.type !== 'string') return bad('type is required');
  const submissionId = typeof body.submissionId === 'string' ? body.submissionId : '';
  if (!submissionId) return bad('submissionId is required');
  const note = typeof body.note === 'string' ? body.note : '';
  const notify = body.notify === false ? false : undefined;
  const origin = publicOrigin(req);

  try {
    let outcome;
    switch (body.type) {
      case 'approve':
        if (!isSubmissionTier(body.tier)) return bad(`tier must be one of ${SUBMISSION_TIERS.join(', ')}`);
        if (body.membership !== undefined && !isMembershipChoice(body.membership)) return bad('membership must be plus, pro, cohort or none');
        outcome = await approveSubmission({ submissionId, tier: body.tier, membership: body.membership as never, note, by, origin, notify });
        break;
      case 'changes':
      case 'decline':
        outcome = await reviewSubmission({ submissionId, outcome: body.type === 'changes' ? 'changes' : 'declined', note, by, origin, notify });
        break;
      case 'release':
      case 'released':
        outcome = await finishRelease({ submissionId, by, done: body.type === 'released' });
        break;
      default:
        return bad(`Unknown action ${body.type}`);
    }
    if (!outcome.ok) return bad(outcome.why, outcome.status ?? 400);
    // a package released just now: its card and its page are built ahead of time
    if (outcome.submission.status === 'live' && outcome.submission.delivery?.kind === 'store') {
      revalidatePath('/');
      revalidatePath(itemPagePath(outcome.submission.itemId));
    }
    return NextResponse.json({ submission: outcome.submission, mailed: outcome.mailed, notes: outcome.notes ?? [], ...(outcome.listing && { listing: outcome.listing }) });
  } catch (error) {
    console.error('[admin/submissions] Could not apply the action:', error);
    return bad('Could not save it', 503);
  }
}
