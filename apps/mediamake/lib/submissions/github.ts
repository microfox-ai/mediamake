/**
 * The GitHub side of the store, as plain REST calls with the fetch passed in
 * (so the tests run without a network): one commit that puts an item's folder
 * in a repository, a pull request, and the merged pull requests that suggest
 * a membership.
 *
 * STORE_GITHUB_TOKEN is a token that may write contents and pull requests on
 * the public repository and on the private store repository
 * (FEEDBACK_GITHUB_TOKEN is used when it is not set, for one token that does
 * both jobs). Never printed, logged or sent anywhere but api.github.com.
 */

export const DEFAULT_STORE_REPO = 'microfox-ai/mediamake-store';
export const DEFAULT_PUBLIC_REPO = 'microfox-ai/mediamake';
export const DEFAULT_CONTRIBUTION_REPOS = ['microfox-ai/mediamake', 'microfox-ai/extensions'];
export const BASE_BRANCH = 'main';

const REPO = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/;
const repoFrom = (value: string | undefined, fallback: string) => (value?.trim() && REPO.test(value.trim()) ? value.trim() : fallback);

/** The private repository gated items and every MCP and app are kept in (STORE_REPO). */
export const storeRepo = () => repoFrom(process.env.STORE_REPO, DEFAULT_STORE_REPO);
/** The public repository a Public skill's pull request is opened on (STORE_PUBLIC_REPO). */
export const publicRepo = () => repoFrom(process.env.STORE_PUBLIC_REPO, DEFAULT_PUBLIC_REPO);
/** The public repositories whose merged pull requests suggest a membership (CONTRIBUTION_REPOS, comma separated). */
export const contributionRepos = (): string[] => {
  const named = (process.env.CONTRIBUTION_REPOS ?? '').split(',').map(repo => repo.trim()).filter(repo => REPO.test(repo));
  return named.length > 0 ? named : DEFAULT_CONTRIBUTION_REPOS;
};

export const storeToken = () => process.env.STORE_GITHUB_TOKEN?.trim() || process.env.FEEDBACK_GITHUB_TOKEN?.trim() || undefined;
export const storeConfigured = () => !!storeToken();

export class GithubError extends Error {
  constructor(
    public status: number,
    public path: string,
    detail?: string,
  ) {
    super(`GitHub answered ${status} for ${path}${detail ? `: ${detail}` : ''}`);
  }
}

export type Fetch = (url: string, init?: RequestInit) => Promise<Response>;
export type Github = <T = Record<string, unknown>>(method: string, path: string, body?: unknown) => Promise<T>;

/** A caller for api.github.com. Without a token it reads public repositories only. */
export function github(token: string | undefined, fetchImpl: Fetch = fetch): Github {
  return async <T>(method: string, path: string, body?: unknown): Promise<T> => {
    const res = await fetchImpl(`https://api.github.com${path}`, {
      method,
      headers: {
        accept: 'application/vnd.github+json',
        'x-github-api-version': '2022-11-28',
        'user-agent': 'mediamake-store',
        ...(token && { authorization: `Bearer ${token}` }),
        ...(body !== undefined && { 'content-type': 'application/json' }),
      },
      ...(body !== undefined && { body: JSON.stringify(body) }),
    });
    const text = await res.text();
    let data: unknown;
    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      data = {};
    }
    if (!res.ok) throw new GithubError(res.status, path, typeof (data as { message?: unknown }).message === 'string' ? (data as { message: string }).message : undefined);
    return data as T;
  };
}

/** What GitHub's refusal means, in words an admin can act on. */
export function githubProblem(error: unknown, repo: string): string {
  if (!(error instanceof GithubError)) return `GitHub could not be reached for ${repo}. Try again`;
  if (error.status === 401) return `GitHub refused the token (401): STORE_GITHUB_TOKEN is wrong or has expired`;
  if (error.status === 403) return `GitHub refused the token for ${repo} (403): it needs to write contents and pull requests there`;
  if (error.status === 404) return `${repo} was not found: it does not exist yet, it has no ${BASE_BRANCH} branch, or the token cannot see it`;
  if (error.status === 409) return `${repo} is empty: give it a first commit (a README) so it has a ${BASE_BRANCH} branch`;
  return `${error.message}`;
}

export interface TreeFile {
  /** Relative to the repository's root. */
  path: string;
  content: string;
  encoding: 'utf8' | 'base64';
  /** 120000 is a symbolic link whose content is its target. */
  mode?: '100644' | '100755' | '120000';
}

interface TreeEntry {
  path: string;
  mode: string;
  type: 'blob';
  sha: string | null;
}

async function inBatches<T, R>(items: T[], size: number, run: (item: T) => Promise<R>): Promise<R[]> {
  const out: R[] = [];
  for (let at = 0; at < items.length; at += size) out.push(...(await Promise.all(items.slice(at, at + size).map(run))));
  return out;
}

/**
 * One commit on top of `base` that makes `folder` hold exactly `files` (a
 * file the folder had and `files` lacks is removed) and adds `extra` files
 * elsewhere. It lands on `branch`: a new branch for a pull request, or `base`
 * itself.
 */
export async function commitFolder(
  gh: Github,
  input: { repo: string; base?: string; branch?: string; folder: string; files: TreeFile[]; extra?: TreeFile[]; message: string },
): Promise<{ sha: string; url: string; removed: number }> {
  const { repo, folder, message } = input;
  const base = input.base ?? BASE_BRANCH;
  const branch = input.branch ?? base;
  const api = `/repos/${repo}`;

  const attempt = async () => {
    const ref = await gh<{ object: { sha: string } }>('GET', `${api}/git/ref/heads/${base}`);
    const parent = ref.object.sha;
    const commit = await gh<{ tree: { sha: string } }>('GET', `${api}/git/commits/${parent}`);

    // what the folder holds now, to remove what the new version dropped
    const prefix = `${folder.replace(/\/+$/, '')}/`;
    const now = await gh<{ tree: { path: string; type: string }[]; truncated?: boolean }>('GET', `${api}/git/trees/${commit.tree.sha}?recursive=1`);
    const keep = new Set(input.files.map(file => file.path));
    const stale = now.truncated ? [] : now.tree.filter(entry => entry.type === 'blob' && entry.path.startsWith(prefix) && !keep.has(entry.path));

    const all = [...input.files, ...(input.extra ?? [])];
    const entries: TreeEntry[] = await inBatches(all, 6, async file => {
      const blob = await gh<{ sha: string }>('POST', `${api}/git/blobs`, { content: file.content, encoding: file.encoding === 'base64' ? 'base64' : 'utf-8' });
      return { path: file.path, mode: file.mode ?? '100644', type: 'blob' as const, sha: blob.sha };
    });
    // a null sha removes the file
    for (const entry of stale) entries.push({ path: entry.path, mode: '100644', type: 'blob', sha: null });

    const tree = await gh<{ sha: string }>('POST', `${api}/git/trees`, { base_tree: commit.tree.sha, tree: entries });
    const made = await gh<{ sha: string }>('POST', `${api}/git/commits`, { message, tree: tree.sha, parents: [parent] });
    if (branch === base) {
      await gh('PATCH', `${api}/git/refs/heads/${base}`, { sha: made.sha });
    } else {
      try {
        await gh('POST', `${api}/git/refs`, { ref: `refs/heads/${branch}`, sha: made.sha });
      } catch (error) {
        // the branch is this submission's own, from an earlier try: move it
        if (!(error instanceof GithubError) || error.status !== 422) throw error;
        await gh('PATCH', `${api}/git/refs/heads/${branch}`, { sha: made.sha, force: true });
      }
    }
    return { sha: made.sha, url: `https://github.com/${repo}/commit/${made.sha}`, removed: stale.length };
  };

  try {
    return await attempt();
  } catch (error) {
    // someone pushed to the base between the read and the write: once more, on the new tip
    if (branch === base && error instanceof GithubError && error.status === 422) return attempt();
    throw error;
  }
}

/** Opens a pull request, or gives the open one the branch already has. */
export async function openPullRequest(
  gh: Github,
  input: { repo: string; head: string; base?: string; title: string; body: string },
): Promise<{ number: number; url: string }> {
  const base = input.base ?? BASE_BRANCH;
  try {
    const pr = await gh<{ number: number; html_url: string }>('POST', `/repos/${input.repo}/pulls`, { title: input.title, head: input.head, base, body: input.body });
    return { number: pr.number, url: pr.html_url };
  } catch (error) {
    if (!(error instanceof GithubError) || error.status !== 422) throw error;
    const owner = input.repo.split('/')[0];
    const open = await gh<{ number: number; html_url: string }[]>('GET', `/repos/${input.repo}/pulls?state=open&head=${encodeURIComponent(`${owner}:${input.head}`)}`);
    if (!open[0]) throw error;
    await gh('PATCH', `/repos/${input.repo}/pulls/${open[0].number}`, { title: input.title, body: input.body });
    return { number: open[0].number, url: open[0].html_url };
  }
}

export interface MergedPull {
  repo: string;
  number: number;
  url: string;
  title: string;
  /** Its author's GitHub login and id. */
  login: string;
  githubId: string;
  mergedAt: string;
}

/** A repository's pull requests merged since a moment, newest first, without the ones bots opened. */
export async function mergedPulls(gh: Github, repo: string, since: string): Promise<MergedPull[]> {
  const pulls = await gh<{ number: number; html_url: string; title: string; merged_at: string | null; user: { login: string; id: number; type?: string } | null }[]>(
    'GET',
    `/repos/${repo}/pulls?state=closed&sort=updated&direction=desc&per_page=100`,
  );
  return pulls
    .filter(pull => pull.merged_at && pull.merged_at >= since && pull.user && pull.user.type !== 'Bot' && !pull.user.login.endsWith('[bot]'))
    .map(pull => ({ repo, number: pull.number, url: pull.html_url, title: pull.title, login: pull.user!.login, githubId: String(pull.user!.id), mergedAt: pull.merged_at! }))
    .sort((a, b) => b.mergedAt.localeCompare(a.mergedAt));
}
