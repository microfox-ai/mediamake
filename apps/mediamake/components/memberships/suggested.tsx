'use client';

import { Check, GitPullRequest, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { pullKey, SUGGESTION_DAYS, type Suggestion } from '@/lib/memberships/suggestions';
import { tierLabel } from '@/lib/memberships/tiers';
import { formatDay, type Mailed, type MembershipsData } from './model';
import { Empty, MemberTierPill, Section } from './parts';

type Run = (label: string, body: Record<string, unknown>) => Promise<{ mailed?: Mailed } | null>;

/**
 * Suggested grants: merged pull requests on the public repositories by people
 * whose account has that GitHub account linked. Confirming one gives Plus for
 * 3 months (or renews it), with the pull request on the record; nothing is
 * given until an admin confirms.
 */
export function Suggested({ data, run }: { data: MembershipsData; run: Run }) {
  return (
    <Section
      title="Suggested grants"
      about={`Pull requests merged in the last ${SUGGESTION_DAYS} days by people with a linked GitHub account, which no membership counts yet. Confirming gives Plus for 3 months; contributing again renews it, and you can make it permanent on People.`}
    >
      {data.suggestionProblems.length > 0 && (
        <p className="border-b px-5 py-2 text-xs text-amber-700 dark:text-amber-300">{data.suggestionProblems.join('. ')}. Set STORE_GITHUB_TOKEN if GitHub's limit for signed-out reads is reached.</p>
      )}
      {data.suggestions.length ? (
        <ul className="divide-y">
          {data.suggestions.map(suggestion => (
            <SuggestionLine key={suggestion.clientId} suggestion={suggestion} run={run} />
          ))}
        </ul>
      ) : (
        <Empty>No merged pull request is waiting. A person needs GitHub linked on their account (they sign in with GitHub, or add it under Account) to be matched.</Empty>
      )}
    </Section>
  );
}

function SuggestionLine({ suggestion, run }: { suggestion: Suggestion; run: Run }) {
  const newest = suggestion.pulls[0];
  const tier = tierLabel(suggestion.tier);
  return (
    <li className="flex flex-col gap-3 px-5 py-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        <p className="flex flex-wrap items-center gap-2 text-sm">
          <span>
            <span className="font-medium">{suggestion.name}</span> ({suggestion.githubLogin} on GitHub)
          </span>
          <MemberTierPill tier={suggestion.holds} />
          <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:text-emerald-300">
            Suggested: {suggestion.renews ? `renew for 3 months` : `grant ${tier}`}
          </span>
        </p>
        <ul className="mt-1.5 flex flex-col gap-1">
          {suggestion.pulls.map(pull => (
            <li key={pullKey(pull)} className="flex items-start gap-1.5 text-xs text-muted-foreground">
              <GitPullRequest className="mt-0.5 size-3.5 shrink-0" />
              <span className="min-w-0">
                <a href={pull.url} target="_blank" rel="noreferrer" className="text-foreground underline-offset-4 hover:underline">
                  {pull.title}
                </a>{' '}
                · {pullKey(pull)} · merged {formatDay(pull.mergedAt)}
              </span>
            </li>
          ))}
        </ul>
      </div>
      <div className="flex shrink-0 gap-1.5">
        <Button size="sm" variant="ghost" onClick={() => run('Suggestion dismissed', { type: 'dismiss_suggestion', pulls: suggestion.pulls.map(pullKey) })}>
          <X className="size-3.5" />
          Dismiss
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() =>
            run(suggestion.renews ? `${suggestion.name}'s membership is renewed` : `${suggestion.name} is now ${tier}`, { type: 'confirm_suggestion', clientId: suggestion.clientId, pull: pullKey(newest) })
          }
        >
          <Check className="size-3.5" />
          {suggestion.renews ? 'Renew' : `Grant ${tier}`}
        </Button>
      </div>
    </li>
  );
}
