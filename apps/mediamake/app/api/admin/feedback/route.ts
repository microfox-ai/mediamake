import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-utils';
import { listAccounts } from '@/lib/auth/accounts';
import { catalogIndex } from '@/lib/catalog/admin-index';
import { answerFeedback, currentBudget, dismissFeedback, raisePr, reopenFeedback, runTriage, shipFeedback } from '@/lib/feedback/actions';
import { autoPrsPerDay, parsePrRef, prConfigured, prRepo } from '@/lib/feedback/auto-pr';
import { prMaxUsd } from '@/lib/feedback/budget';
import { groupFeedback } from '@/lib/feedback/feedback';
import { parseKnownIssue } from '@/lib/feedback/known-issues';
import { knownIssuesDB } from '@/lib/feedback/known-issues-store';
import { feedbackDB } from '@/lib/feedback/store';
import { triageConfigured, triageModel } from '@/lib/feedback/triage';
import { mailConfigured } from '@/lib/mail/send';
import { publicOrigin } from '@/lib/mcp/oauth';

/**
 * The admin Feedback page (/app/feedback). Admins only.
 *
 * GET   everything: feedback grouped by item with repeats folded, the known
 *       issues, this month's Claude spend against its ceiling, and what is
 *       set up (the key, the workflow token, mail). `?only=budget` gives the
 *       spend alone (Admin Billing shows it).
 * POST  one action:
 *       { type: 'triage', feedbackId }                 Claude reads it (again)
 *       { type: 'raise_pr', feedbackId }               start the fix workflow: a draft PR
 *       { type: 'link_pr', feedbackId, pr }            tie it to an existing PR (link, owner/name#12 or a number)
 *       { type: 'unlink_pr', feedbackId }
 *       { type: 'answer', feedbackId, text }           answer its writer, by mail too
 *       { type: 'dismiss', feedbackId, reason? }
 *       { type: 'reopen', feedbackId }
 *       { type: 'ship', feedbackId, version?, note? }  the fix is out: mail the writers
 *       { type: 'issue_add', itemId, title, note?, feedbackId? }
 *       { type: 'issue_link', issueId, feedbackId }
 *       { type: 'issue_update', issueId, title, note? }
 *       { type: 'issue_fixed', issueId, fixedIn? } / { type: 'issue_reopen', issueId }
 *       { type: 'issue_remove', issueId }
 */
export const maxDuration = 60;

const ITEM_ID = /^(skill|mcp|app|tutorial|course)\/[a-z0-9][a-z0-9-]{0,63}$/;

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
    console.error(`[admin/feedback] Could not load ${what}:`, error);
    return fallback;
  }
}

export async function GET(req: NextRequest) {
  if (!(await admin(req))) return forbidden();
  // ?only=budget: this month's spend alone, for Admin Billing
  if (req.nextUrl.searchParams.get('only') === 'budget') {
    return NextResponse.json({ budget: await safely('the budget', currentBudget(), null), setup: { model: triageModel(), prMaxUSD: prMaxUsd(), autoPrsPerDay: autoPrsPerDay() } });
  }
  const [feedback, issues, budget, accounts, index] = await Promise.all([
    safely('feedback', feedbackDB.all(), []),
    safely('known issues', knownIssuesDB.all(), []),
    safely('the budget', currentBudget(), null),
    safely('accounts', listAccounts(), []),
    safely('the catalog', catalogIndex(), null),
  ]);
  const writers = new Set(feedback.map(entry => entry.clientId));
  const people = Object.fromEntries(accounts.filter(account => writers.has(account.clientId)).map(account => [account.clientId, account.name || account.email || account.clientId]));
  const ids = new Set([...feedback.flatMap(entry => (entry.itemId ? [entry.itemId] : [])), ...issues.map(issue => issue.itemId)]);
  const titles = Object.fromEntries([...ids].flatMap(id => (index?.byId.get(id) ? [[id, index.byId.get(id)!.title]] : [])));
  return NextResponse.json({
    groups: groupFeedback(feedback),
    issues,
    budget,
    people,
    titles,
    setup: {
      triage: triageConfigured(),
      model: triageModel(),
      prs: prConfigured(),
      prRepo: prRepo(),
      prMaxUSD: prMaxUsd(),
      autoPrsPerDay: autoPrsPerDay(),
      mail: mailConfigured(),
    },
  });
}

export async function POST(req: NextRequest) {
  const by = await admin(req);
  if (!by) return forbidden();
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body || typeof body.type !== 'string') return bad('type is required');
  const origin = publicOrigin(req);
  const feedbackId = typeof body.feedbackId === 'string' ? body.feedbackId : '';
  const issueId = typeof body.issueId === 'string' ? body.issueId : '';
  const text = (value: unknown) => (typeof value === 'string' ? value : undefined);

  try {
    switch (body.type) {
      case 'triage':
      case 'raise_pr':
      case 'answer':
      case 'dismiss':
      case 'reopen': {
        if (!feedbackId) return bad('feedbackId is required');
        const outcome =
          body.type === 'triage'
            ? await runTriage(feedbackId, { again: true })
            : body.type === 'raise_pr'
              ? await raisePr(feedbackId, by)
              : body.type === 'answer'
                ? await answerFeedback(feedbackId, text(body.text) ?? '', by, origin)
                : body.type === 'dismiss'
                  ? await dismissFeedback(feedbackId, by, text(body.reason))
                  : await reopenFeedback(feedbackId);
        return outcome.ok ? NextResponse.json(outcome) : bad(outcome.why, 409);
      }
      case 'link_pr': {
        const pr = parsePrRef(body.pr);
        if (!feedbackId || !pr) return bad('Give the pull request as its link, owner/name#12, or its number');
        const feedback = await feedbackDB.update(feedbackId, { pr: { ...pr, state: 'open', by, at: new Date().toISOString() } });
        return feedback ? NextResponse.json({ ok: true, feedback }) : bad('No such feedback', 404);
      }
      case 'unlink_pr': {
        const feedback = await feedbackDB.update(feedbackId, {}, ['pr']);
        return feedback ? NextResponse.json({ ok: true, feedback }) : bad('No such feedback', 404);
      }
      case 'ship': {
        if (!feedbackId) return bad('feedbackId is required');
        const result = await shipFeedback([feedbackId], { version: text(body.version), note: text(body.note), origin });
        if (result.shipped.length === 0) return bad('Nothing to ship: it is already shipped or dismissed', 409);
        return NextResponse.json({ ok: true, shipped: result.shipped.length, mailed: result.mailed.filter(mail => mail.sent).length, issuesFixed: result.issuesFixed });
      }
      case 'issue_add': {
        const itemId = text(body.itemId) ?? '';
        if (!ITEM_ID.test(itemId)) return bad('A known issue belongs to one item: itemId is required');
        const parsed = parseKnownIssue(body);
        if ('error' in parsed) return bad(parsed.error);
        return NextResponse.json({ ok: true, issue: await knownIssuesDB.add({ itemId, ...parsed, feedbackId: feedbackId || undefined, by }) });
      }
      case 'issue_link': {
        if (!issueId || !feedbackId) return bad('issueId and feedbackId are required');
        const issue = await knownIssuesDB.link(issueId, feedbackId);
        return issue ? NextResponse.json({ ok: true, issue }) : bad('No such known issue', 404);
      }
      case 'issue_update': {
        const parsed = parseKnownIssue(body);
        if ('error' in parsed) return bad(parsed.error);
        const issue = await knownIssuesDB.update(issueId, { title: parsed.title, ...(parsed.note && { note: parsed.note }) }, parsed.note ? [] : ['note']);
        return issue ? NextResponse.json({ ok: true, issue }) : bad('No such known issue', 404);
      }
      case 'issue_fixed': {
        const fixedIn = text(body.fixedIn)?.trim().slice(0, 80);
        const issue = await knownIssuesDB.update(issueId, { status: 'fixed', fixedAt: new Date().toISOString(), ...(fixedIn && { fixedIn }) });
        return issue ? NextResponse.json({ ok: true, issue }) : bad('No such known issue', 404);
      }
      case 'issue_reopen': {
        const issue = await knownIssuesDB.update(issueId, { status: 'open' }, ['fixedAt', 'fixedIn']);
        return issue ? NextResponse.json({ ok: true, issue }) : bad('No such known issue', 404);
      }
      case 'issue_remove':
        return (await knownIssuesDB.remove(issueId)) ? NextResponse.json({ ok: true }) : bad('No such known issue', 404);
      default:
        return bad(`Unknown action: ${body.type}`);
    }
  } catch (error) {
    console.error(`[admin/feedback] ${body.type} failed:`, error);
    return bad('Could not save the change', 503);
  }
}
