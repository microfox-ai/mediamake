'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { fits, type Budget } from '@/lib/feedback/budget';
import { cn } from '@/lib/utils';
import { usd, type FeedbackData } from './model';

/**
 * This month's Claude spend on feedback (reading it, and the fix runs that
 * make draft pull requests) against its ceiling. On /app/feedback and on
 * Admin Billing.
 */
export function BudgetCard({ budget, setup, link }: { budget: Budget | null; setup: Pick<FeedbackData['setup'], 'model' | 'prMaxUSD' | 'autoPrsPerDay'>; link?: boolean }) {
  if (!budget) return <div className="rounded-2xl border bg-card p-4 text-sm text-muted-foreground">This month&apos;s Claude spend could not be read.</div>;
  const used = budget.spentUSD + budget.heldUSD;
  const share = budget.ceilingUSD > 0 ? Math.min(100, (used / budget.ceilingUSD) * 100) : 100;
  const full = !fits(budget, 0.1);
  const monthName = new Date(`${budget.month}-01T00:00:00Z`).toLocaleDateString(undefined, { month: 'long', year: 'numeric', timeZone: 'UTC' });
  return (
    <div className="rounded-2xl border bg-card p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-sm font-semibold">
          Claude for feedback, {monthName}
          {link && (
            <Link href="/app/feedback" className="ml-2 text-xs font-normal text-muted-foreground underline underline-offset-4">
              Feedback
            </Link>
          )}
        </h2>
        <p className="text-sm tabular-nums">
          <span className="text-2xl font-semibold">{usd(budget.spentUSD)}</span>
          <span className="text-muted-foreground"> of {usd(budget.ceilingUSD)}</span>
        </p>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuenow={Math.round(share)} aria-valuemin={0} aria-valuemax={100} aria-label="Share of the monthly ceiling used">
        <div className={cn('h-full rounded-full', full ? 'bg-red-500' : share > 80 ? 'bg-amber-500' : 'bg-primary')} style={{ width: `${share}%` }} />
      </div>
      <p className="mt-3 text-xs text-muted-foreground">
        Reading feedback: {usd(budget.byPurpose.triage.costUSD)} for {budget.byPurpose.triage.calls} ({setup.model}). Fix runs: {usd(budget.byPurpose.pr.costUSD)} for{' '}
        {budget.byPurpose.pr.calls}, up to {usd(setup.prMaxUSD)} each{budget.heldUSD > 0 ? `, ${usd(budget.heldUSD)} held for runs in progress` : ''}. Triage raises at most{' '}
        {setup.autoPrsPerDay} pull requests a day on its own.
      </p>
      {full && <p className="mt-1 text-xs font-medium text-red-600 dark:text-red-400">The ceiling is reached: feedback is still saved, and Claude reads it again next month or when the ceiling is raised.</p>}
    </div>
  );
}

/** The card for Admin Billing: it loads the spend itself, and shows nothing when it cannot. */
export function FeedbackBudget() {
  const [data, setData] = useState<{ budget: Budget | null; setup: Pick<FeedbackData['setup'], 'model' | 'prMaxUSD' | 'autoPrsPerDay'> } | null>(null);
  useEffect(() => {
    fetch('/api/admin/feedback?only=budget')
      .then(res => (res.ok ? res.json() : null))
      .then(setData)
      .catch(() => {});
  }, []);
  return data?.budget ? <BudgetCard budget={data.budget} setup={data.setup} link /> : null;
}
