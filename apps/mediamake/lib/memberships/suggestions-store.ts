import { getDatabase } from '../mongodb';
import { contributionRepos, github, mergedPulls, storeToken, type MergedPull } from '../submissions/github';
import { SUGGESTION_DAYS } from './suggestions';

/**
 * The two things suggested grants need from outside: the merged pull requests
 * (read from GitHub, kept for ten minutes so the page does not ask on every
 * load) and the ones an admin dismissed (MongoDB `membership_suggestions`).
 */
const COLLECTION = 'membership_suggestions';

interface Dismissal {
  /** `owner/name#12` */
  key: string;
  by?: string;
  at: string;
}

async function collection() {
  return (await getDatabase()).collection<Dismissal>(COLLECTION);
}

export const suggestionsDB = {
  async dismissed(): Promise<string[]> {
    return (await (await collection()).find({}, { projection: { _id: 0, key: 1 } }).toArray()).map(entry => entry.key);
  },

  async dismiss(keys: string[], by?: string): Promise<void> {
    const at = new Date().toISOString();
    const dismissals = await collection();
    for (const key of keys) await dismissals.updateOne({ key }, { $set: { key, by, at } }, { upsert: true });
  },
};

let cached: { at: number; pulls: MergedPull[]; problems: string[] } | null = null;
const TEN_MINUTES = 10 * 60 * 1000;

/**
 * Pull requests merged on the contribution repositories in the last
 * SUGGESTION_DAYS. A repository that cannot be read is named in `problems`
 * and the rest still come back. Public repositories read without a token,
 * within GitHub's hourly limit.
 */
export async function recentMergedPulls({ fresh = false } = {}): Promise<{ pulls: MergedPull[]; problems: string[] }> {
  if (!fresh && cached && Date.now() - cached.at < TEN_MINUTES) return cached;
  const gh = github(storeToken());
  const since = new Date(Date.now() - SUGGESTION_DAYS * 86_400_000).toISOString();
  const pulls: MergedPull[] = [];
  const problems: string[] = [];
  for (const repo of contributionRepos()) {
    try {
      pulls.push(...(await mergedPulls(gh, repo, since)));
    } catch (error) {
      console.error(`[memberships] Could not read merged pull requests of ${repo}:`, error);
      problems.push(`Merged pull requests of ${repo} could not be read`);
    }
  }
  cached = { at: Date.now(), pulls, problems };
  return cached;
}
