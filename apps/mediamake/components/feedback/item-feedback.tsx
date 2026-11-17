import { CircleAlertIcon, CircleCheckIcon } from 'lucide-react';
import { shownIssues, type PublicKnownIssue } from '@/lib/feedback/known-issues';
import { knownIssuesDB } from '@/lib/feedback/known-issues-store';
import { FeedbackForm } from './feedback-form';

const day = (iso: string) => new Date(iso).toLocaleDateString('en', { day: 'numeric', month: 'short', year: 'numeric' });

/**
 * On every item's page: its known issues (the list admins keep, for
 * everyone), then the form that takes feedback and shows the viewer what
 * they sent before and what came of it. Feedback itself is read by admins and
 * its writer only.
 */
export async function ItemFeedback({ itemId, title, version }: { itemId: string; title: string; version?: string }) {
  const issues = shownIssues(await knownIssuesDB.forItem(itemId).catch(() => []));
  return (
    <section id="feedback" className="flex scroll-mt-6 flex-col gap-4 rounded-xl border bg-card p-4">
      <KnownIssues issues={issues} />
      <FeedbackForm itemId={itemId} title={title} version={version} />
    </section>
  );
}

export function KnownIssues({ issues }: { issues: PublicKnownIssue[] }) {
  const open = issues.filter(issue => issue.status === 'open').length;
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline gap-2">
        <h2 className="text-sm font-semibold">Known issues</h2>
        <span className="text-xs text-muted-foreground">{open === 0 ? 'None open' : `${open} open`}</span>
      </div>
      {issues.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nothing is known to be wrong with it. If something is, tell us below.</p>
      ) : (
        <ul className="flex flex-col divide-y">
          {issues.map(issue => (
            <li key={issue.issueId} className="flex gap-2.5 py-2 first:pt-0 last:pb-0">
              {issue.status === 'fixed' ? (
                <CircleCheckIcon className="mt-0.5 size-4 shrink-0 text-emerald-600 dark:text-emerald-400" aria-label="Fixed" />
              ) : (
                <CircleAlertIcon className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400" aria-label="Open" />
              )}
              <div className="min-w-0">
                <p className={issue.status === 'fixed' ? 'text-sm text-muted-foreground line-through' : 'text-sm font-medium'}>{issue.title}</p>
                {issue.note && issue.status === 'open' && <p className="mt-0.5 whitespace-pre-line text-xs text-muted-foreground">{issue.note}</p>}
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {issue.status === 'fixed' && issue.fixedAt
                    ? `Fixed${issue.fixedIn ? ` in v${issue.fixedIn.replace(/^v/, '')}` : ''} on ${day(issue.fixedAt)}`
                    : `Known since ${day(issue.createdAt)}`}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
