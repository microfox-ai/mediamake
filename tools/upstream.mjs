/**
 * upstream: send a change to GitHub as a branch and a pull request without touching this checkout.
 * A branch from <remote>/<base> in a temporary worktree, the change made there, one commit, pushed,
 * and a pull request (gh when it is signed in, else the compare link to open one). Your own branch,
 * your edits and other sessions in this checkout are never touched, so it is safe on main.
 *
 * Used by `mm notes promote` (apps/studio/scripts/notes.ts) and `node tools/skills.mjs publish`.
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const run = (cwd, ...a) => {
  const r = spawnSync('git', a, { cwd, encoding: 'utf8', maxBuffer: 1 << 26 });
  if (r.status !== 0) throw new Error(`git ${a.join(' ')}: ${(r.stderr || r.stdout).trim()}`);
  return r.stdout.trim();
};

/** https://github.com/<owner>/<repo>/compare/<base>...<branch>, when the remote is on GitHub. */
export const compareUrl = (remoteUrl, base, branch) => {
  const m = remoteUrl.match(/github\.com[:/]([^/]+)\/(.+?)(?:\.git)?\/?$/);
  return m ? `https://github.com/${m[1]}/${m[2]}/compare/${base}...${encodeURIComponent(branch).replace(/%2F/g, '/')}?expand=1` : undefined;
};

/** "20261109-1000": minutes, so two sends in one day get their own branches. */
export const stamp = (now = new Date()) => now.toISOString().slice(0, 16).replace(/[-:]/g, '').replace('T', '-');

const ghReady = () => spawnSync('gh', ['auth', 'status'], { encoding: 'utf8' }).status === 0;

/**
 * Make `change(worktree)` on a new branch and open a PR for it. `change` edits files in the worktree
 * and returns the repo-relative paths to commit. With push: false the commit stays on a local branch.
 * Returns { branch, commit, pushed, pr?, compare? }; throws (leaving nothing behind) on failure.
 */
export const openPr = ({ repo, branch, title, body = '', message, change, remote = 'origin', base = 'main', push = true, pr = true }) => {
  run(repo, 'fetch', '--quiet', remote, base);
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'mm-upstream-'));
  const wt = path.join(tmp, 'wt');
  run(repo, 'worktree', 'add', '--quiet', '-b', branch, wt, `${remote}/${base}`);
  let committed = false;
  try {
    const paths = change(wt);
    if (!paths?.length) throw new Error('nothing changed');
    run(wt, 'add', '-A', '--', ...paths);
    run(wt, 'commit', '--quiet', '-m', title, ...(message ? ['-m', message] : []));
    const commit = run(wt, 'rev-parse', 'HEAD');
    committed = true;
    if (!push) return { branch, commit, pushed: false };
    run(wt, 'push', '--quiet', '-u', remote, branch);
    let url;
    if (pr && ghReady()) {
      const r = spawnSync('gh', ['pr', 'create', '--base', base, '--head', branch, '--title', title, '--body', body], { cwd: wt, encoding: 'utf8' });
      if (r.status === 0) url = r.stdout.trim().split('\n').at(-1);
    }
    let compare;
    if (!url) {
      try {
        compare = compareUrl(run(repo, 'remote', 'get-url', remote), base, branch);
      } catch {
        // a remote with no URL: no link
      }
    }
    return { branch, commit, pushed: true, pr: url, compare };
  } finally {
    spawnSync('git', ['worktree', 'remove', '--force', wt], { cwd: repo });
    // a pushed branch lives on the remote and a failed one is dropped; only push: false keeps its
    // commit here, for you to push
    if (push || !committed) spawnSync('git', ['branch', '-D', branch], { cwd: repo });
    fs.rmSync(tmp, { recursive: true, force: true });
  }
};
