import type { Membership } from './membership';
import { tierRank, type GrantableTier, type MemberTier } from './tiers';

/**
 * Suggested grants. A pull request merged on one of the public repositories
 * by someone whose MediaMake account has that GitHub account linked is a
 * contribution: Manage Memberships lists it as "suggested: grant Plus", and
 * an admin confirms it (a Plus membership for CONTRIBUTION_MONTHS, the pull
 * request as its `ref`) or dismisses it. Nothing is given without the admin.
 *
 * Pure: lib/submissions/github reads the pull requests, ./suggestions-store
 * keeps the dismissals.
 */

/** What a merged pull request earns. A higher tier comes from a store submission or an admin. */
export const SUGGESTED_TIER: GrantableTier = 'plus';
/** How far back merged pull requests are looked at. */
export const SUGGESTION_DAYS = 90;

export interface ContributionPull {
  repo: string;
  number: number;
  url: string;
  title: string;
  /** Its author's GitHub login. */
  login: string;
  mergedAt: string;
}

export interface SuggestionPerson {
  clientId: string;
  name?: string;
  githubLogin?: string;
  tier: MemberTier;
  isAdmin: boolean;
  /** Their records, live or ended. */
  records: Membership[];
}

export interface Suggestion {
  clientId: string;
  name: string;
  githubLogin: string;
  /** The tier they hold now. */
  holds: MemberTier;
  tier: GrantableTier;
  /** True when they hold as much already: confirming it renews the 3 months. */
  renews: boolean;
  /** The merged pull requests no membership counts yet, newest first. */
  pulls: ContributionPull[];
}

/** A pull request as a suggestion names it, e.g. `microfox-ai/mediamake#12`. */
export const pullKey = (pull: Pick<ContributionPull, 'repo' | 'number'>) => `${pull.repo}#${pull.number}`;

const sameLogin = (a?: string, b?: string) => !!a && !!b && a.toLowerCase() === b.toLowerCase();

/**
 * Who to suggest a membership for. Left out: admins, people whose membership
 * has no end date at Plus or above (nothing to give or renew), pull requests
 * a record of theirs already names (`ref`), and the ones an admin dismissed.
 */
export function suggestGrants(input: { pulls: ContributionPull[]; people: SuggestionPerson[]; dismissed: Iterable<string> }, now: number = Date.now()): Suggestion[] {
  const dismissed = new Set(input.dismissed);
  const suggestions: Suggestion[] = [];
  for (const person of input.people) {
    if (!person.githubLogin || person.isAdmin) continue;
    const live = person.records.filter(record => !record.revokedAt && (!record.expiresAt || Date.parse(record.expiresAt) > now));
    if (live.some(record => !record.expiresAt && tierRank(record.tier) >= tierRank(SUGGESTED_TIER))) continue;
    const counted = new Set(person.records.map(record => record.ref).filter(Boolean));
    const pulls = input.pulls
      .filter(pull => sameLogin(pull.login, person.githubLogin) && !counted.has(pull.url) && !dismissed.has(pullKey(pull)))
      .sort((a, b) => b.mergedAt.localeCompare(a.mergedAt));
    if (pulls.length === 0) continue;
    suggestions.push({
      clientId: person.clientId,
      name: person.name || person.githubLogin,
      githubLogin: person.githubLogin,
      holds: person.tier,
      tier: SUGGESTED_TIER,
      renews: tierRank(person.tier) >= tierRank(SUGGESTED_TIER),
      pulls,
    });
  }
  return suggestions.sort((a, b) => b.pulls[0].mergedAt.localeCompare(a.pulls[0].mergedAt));
}
