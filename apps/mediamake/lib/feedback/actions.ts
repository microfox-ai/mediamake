import { getUserByClientId } from '@/lib/auth/users';
import { itemPagePath } from '@/lib/catalog/paths';
import { getCatalogRecord } from '@/lib/catalog/records';
import { feedbackAnsweredMail, feedbackShippedMail } from '@/lib/mail/templates';
import { deliver, type Mailed } from '@/lib/memberships/admin';
import { autoPrsPerDay, dispatchProblem, dispatchRequest, fixRepoOf, prConfigured, type HookEvent } from './auto-pr';
import { fits, prMaxUsd, TRIAGE_RESERVE_USD, type Budget } from './budget';
import { budgetDB } from './budget-store';
import { earnsAutoPr, isOpen, type Feedback } from './feedback';
import { knownIssuesDB } from './known-issues-store';
import { feedbackDB } from './store';
import { triageConfigured, triageFeedback, TriageRefused } from './triage';

/**
 * What happens to a feedback after it is saved, in one place: Claude reads
 * it, a draft pull request is raised, an admin answers or dismisses it, its
 * fix ships and its writer is told. The admin page (/api/admin/feedback), the
 * intake (/api/feedback) and the workflow's reports (/api/feedback-hook) all
 * call these, so each does the same thing.
 */

const DAY = 24 * 60 * 60 * 1000;
/** A fix run that has not reported for this long is taken to have died: it stops holding budget. */
const RUN_STALE_MS = 3 * 60 * 60 * 1000;

/** This month's spend, with what running fixes hold. */
export async function currentBudget(): Promise<Budget> {
  const running = await feedbackDB.prsRunning(new Date(Date.now() - RUN_STALE_MS).toISOString());
  return budgetDB.state(running);
}

const month = (budget: Budget) => `this month's ceiling of ${budget.ceilingUSD} US dollars for Claude is reached`;

export type Outcome<T = Feedback> = { ok: true; feedback: T; mailed?: Mailed } | { ok: false; why: string };

/**
 * Claude reads one feedback, and a bug or major problem from a Plus member or
 * above gets its draft pull request. When it cannot be read (no key, the
 * ceiling, an error) the feedback says why and stays for an admin.
 */
export async function runTriage(feedbackId: string, { again = false } = {}): Promise<Outcome> {
  const feedback = await feedbackDB.get(feedbackId);
  if (!feedback) return { ok: false, why: 'No such feedback' };
  if (feedback.triage && !again) return { ok: true, feedback };
  const skip = async (why: string): Promise<Outcome> => {
    await feedbackDB.update(feedbackId, { triageSkipped: why });
    return { ok: false, why };
  };
  if (!triageConfigured()) return skip('ANTHROPIC_API_KEY is not set, so Claude cannot read feedback');
  const budget = await currentBudget();
  if (!fits(budget, TRIAGE_RESERVE_USD)) return skip(`Not read: ${month(budget)}`);

  const [record, open] = await Promise.all([
    feedback.itemId ? getCatalogRecord(feedback.itemId).catch(() => null) : null,
    feedbackDB.openAbout(feedback.itemId),
  ]);
  // repeats are checked against originals only, so chains do not form
  const originals = open.filter(other => other.feedbackId !== feedbackId && !other.triage?.duplicateOf);
  try {
    const triage = await triageFeedback(feedback, record ? { title: record.title, summary: record.summary } : null, originals);
    await budgetDB.record('triage', triage.costUSD);
    const read = await feedbackDB.update(feedbackId, { triage }, ['triageSkipped']);
    if (!read) return { ok: false, why: 'No such feedback' };
    if (earnsAutoPr(read)) {
      const raised = await raisePr(feedbackId, 'auto');
      if (raised.ok) return raised;
      console.warn(`[feedback] No automatic pull request for ${feedbackId}: ${raised.why}`);
    }
    return { ok: true, feedback: read };
  } catch (error) {
    if (error instanceof TriageRefused) await budgetDB.record('triage', error.costUSD).catch(() => {});
    else console.error(`[feedback] Could not triage ${feedbackId}:`, error);
    return skip(error instanceof TriageRefused ? 'Claude declined to read this one' : 'Claude could not be reached. Try again');
  }
}

/**
 * Starts the fix workflow for one feedback. `by` is 'auto' from triage, which
 * is limited to a few a day, or the admin who pressed the button.
 */
export async function raisePr(feedbackId: string, by: string): Promise<Outcome> {
  const feedback = await feedbackDB.get(feedbackId);
  if (!feedback) return { ok: false, why: 'No such feedback' };
  if (feedback.pr && (feedback.pr.state === 'requested' || feedback.pr.state === 'open')) {
    return { ok: false, why: feedback.pr.url ? `It already has a pull request: ${feedback.pr.url}` : 'A fix is already being made for it' };
  }
  if (!prConfigured()) return { ok: false, why: 'Automatic pull requests are not set up: FEEDBACK_GITHUB_TOKEN and FEEDBACK_HOOK_SECRET are needed' };
  const record = feedback.itemId ? await getCatalogRecord(feedback.itemId).catch(() => null) : null;
  const target = fixRepoOf(record);
  if ('why' in target) return { ok: false, why: target.why };
  if (by === 'auto') {
    const limit = autoPrsPerDay();
    if ((await feedbackDB.autoPrsSince(new Date(Date.now() - DAY).toISOString())) >= limit) {
      return { ok: false, why: `Triage already raised ${limit} pull requests in the last day. An admin can raise this one with the button` };
    }
  }
  const budget = await currentBudget();
  if (!fits(budget, prMaxUsd())) return { ok: false, why: `No room for a fix run (up to ${prMaxUsd()} US dollars): ${month(budget)}` };

  const { url, init } = dispatchRequest(target.repo, feedback, process.env.FEEDBACK_GITHUB_TOKEN!.trim());
  let status: number;
  try {
    status = (await fetch(url, init)).status;
  } catch (error) {
    console.error(`[feedback] Could not reach GitHub for ${feedbackId}:`, error);
    return { ok: false, why: 'GitHub could not be reached. Try again' };
  }
  if (status !== 204) return { ok: false, why: dispatchProblem(status, target.repo) };
  const updated = await feedbackDB.update(feedbackId, { pr: { repo: target.repo, state: 'requested', by, at: new Date().toISOString() } });
  return updated ? { ok: true, feedback: updated } : { ok: false, why: 'No such feedback' };
}

/** Where a mail about a feedback points: its item's page, or the app. */
const pageOf = (feedback: Feedback, origin: string) => `${origin}${feedback.itemId ? itemPagePath(feedback.itemId) : '/app'}`;

async function titleOf(feedback: Feedback): Promise<string | undefined> {
  if (!feedback.itemId) return undefined;
  return (await getCatalogRecord(feedback.itemId).catch(() => null))?.title ?? feedback.itemId;
}

async function tell(feedback: Feedback, mail: (to: string, item: string | undefined) => Parameters<typeof deliver>[0]): Promise<Mailed> {
  const user = await getUserByClientId(feedback.clientId).catch(() => null);
  if (!user?.email) return { sent: false, why: 'The account has no email yet' };
  return deliver(mail(user.email, await titleOf(feedback)));
}

/** An admin's answer: kept on the feedback, shown to its writer on the item's page, and mailed. */
export async function answerFeedback(feedbackId: string, text: string, by: string, origin: string): Promise<Outcome> {
  const answer = text.trim();
  if (answer.length < 2) return { ok: false, why: 'Write the answer first' };
  if (answer.length > 4000) return { ok: false, why: 'Keep the answer under 4000 characters' };
  const before = await feedbackDB.get(feedbackId);
  if (!before) return { ok: false, why: 'No such feedback' };
  const feedback = await feedbackDB.update(feedbackId, {
    answer: { text: answer, by, at: new Date().toISOString() },
    // an answer does not reopen what was shipped or dismissed
    ...(isOpen(before) && { status: 'answered' }),
  });
  if (!feedback) return { ok: false, why: 'No such feedback' };
  const mailed = await tell(feedback, (to, item) => feedbackAnsweredMail(to, { item, said: feedback.text, answer, url: pageOf(feedback, origin) }));
  return { ok: true, feedback, mailed };
}

export async function dismissFeedback(feedbackId: string, by: string, reason?: string): Promise<Outcome> {
  const feedback = await feedbackDB.update(feedbackId, {
    status: 'dismissed',
    dismissed: { by, at: new Date().toISOString(), ...(reason?.trim() && { reason: reason.trim().slice(0, 300) }) },
  });
  return feedback ? { ok: true, feedback } : { ok: false, why: 'No such feedback' };
}

export async function reopenFeedback(feedbackId: string): Promise<Outcome> {
  const before = await feedbackDB.get(feedbackId);
  if (!before) return { ok: false, why: 'No such feedback' };
  const feedback = await feedbackDB.update(feedbackId, { status: before.answer ? 'answered' : 'new' }, ['dismissed', 'shipped']);
  return feedback ? { ok: true, feedback } : { ok: false, why: 'No such feedback' };
}

/**
 * The fix is out: the feedback and everything that repeats it are marked
 * shipped, each writer is mailed once, and the known issues that came from
 * them are marked fixed. Feedback already shipped or dismissed is left alone.
 */
export async function shipFeedback(feedbackIds: string[], input: { version?: string; note?: string; origin: string }): Promise<{ shipped: Feedback[]; mailed: Mailed[]; issuesFixed: number }> {
  const seen = new Map<string, Feedback>();
  for (const feedbackId of feedbackIds) {
    const feedback = await feedbackDB.get(feedbackId);
    if (!feedback) continue;
    seen.set(feedbackId, feedback);
    for (const repeat of await feedbackDB.duplicatesOf(feedbackId)) seen.set(repeat.feedbackId, repeat);
  }
  const version = input.version?.trim().slice(0, 80) || undefined;
  const note = input.note?.trim().slice(0, 600) || undefined;
  const shipped: Feedback[] = [];
  const mailed: Mailed[] = [];
  for (const before of seen.values()) {
    if (!isOpen(before)) continue;
    const told = await tell(before, (to, item) => feedbackShippedMail(to, { item, said: before.text, version, note, url: pageOf(before, input.origin) }));
    mailed.push(told);
    const feedback = await feedbackDB.update(before.feedbackId, {
      status: 'shipped',
      shipped: { at: new Date().toISOString(), ...(version && { version }), ...(note && { note }), mailed: told.sent },
    });
    if (feedback) shipped.push(feedback);
  }
  const issuesFixed = await knownIssuesDB.fixFor([...seen.keys()], version);
  return { shipped, mailed, issuesFixed };
}

/** What the fix workflow reports: its draft PR (or why there is none) and what the run cost, or that a PR merged. */
export async function applyHookEvent(event: HookEvent, origin: string): Promise<{ ok: boolean; why?: string; shipped?: number }> {
  if (event.event === 'fix') {
    const feedback = await feedbackDB.get(event.feedbackId);
    if (!feedback) return { ok: false, why: 'No such feedback' };
    if (event.costUSD) await budgetDB.record('pr', event.costUSD);
    await feedbackDB.update(event.feedbackId, {
      pr: {
        repo: event.repo,
        state: event.state,
        ...(event.prNumber && { number: event.prNumber }),
        ...(event.prUrl && { url: event.prUrl }),
        ...(event.runUrl && { runUrl: event.runUrl }),
        by: feedback.pr?.by ?? 'auto',
        at: feedback.pr?.at ?? new Date().toISOString(),
        ...(event.note && { note: event.note }),
      },
    });
    return { ok: true };
  }
  // merged: every feedback tied to that pull request ships
  const tied = await feedbackDB.byPr(event.repo, event.prNumber);
  for (const feedback of tied) if (feedback.pr) await feedbackDB.update(feedback.feedbackId, { pr: { ...feedback.pr, state: 'merged' } });
  const { shipped } = await shipFeedback(
    tied.map(feedback => feedback.feedbackId),
    { origin },
  );
  return { ok: true, shipped: shipped.length };
}
