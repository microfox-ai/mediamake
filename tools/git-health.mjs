#!/usr/bin/env node
/**
 * git-health: is this MediaMake checkout safe to work in? Run at every session start by the
 * SessionStart hook in .claude/settings.json, and by hand: `npm run git-health`.
 *
 * It fetches the default branch (8 s at most, never asking for a password) and reports:
 *   - a merge, rebase, cherry-pick, revert or bisect left half done, and conflicted files
 *   - committed files changed on main, and new files git would commit (framework edits)
 *   - main ahead of GitHub (local commits) or behind it (needs a pull)
 *   - on a branch: commits not pushed, how far behind main it is, and whether it was merged
 *   - a detached HEAD, stashes, and other local branches holding commits that aren't on GitHub
 *   - work left in an old folder after a move (leftovers in tools/guard-rails.json: apps/lyrics_videos)
 * Files git ignores (projects/, out/, brands/ …) are the user's work and never count as dirty.
 *
 *   node tools/git-health.mjs              the report, exit 1 when something needs fixing
 *   node tools/git-health.mjs --json       the same as JSON
 *   node tools/git-health.mjs --hook       SessionStart hook output (always exits 0)
 *   --no-fetch                             use what the last fetch saw (also MEDIAMAKE_GIT_FETCH=0)
 *   --dir=<path>                           check another checkout
 *
 * It only reads: it never changes the checkout. The fixes it prints are for the user to OK.
 */
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { git, loadRules } from './guard-rails.mjs';

const FETCH_TIMEOUT_MS = 8000;
const MAX_LISTED = 8;
const MAX_BRANCHES = 200;

const today = () => new Date().toISOString().slice(0, 10);
const plural = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
const listed = (items, max = MAX_LISTED) =>
  items.slice(0, max).join(', ') +
  (items.length > max ? ` and ${items.length - max} more` : '');

function ago(ms) {
  const s = Math.max(0, Math.round(ms / 1000));
  if (s < 90) return `${s} s ago`;
  if (s < 90 * 60) return `${Math.round(s / 60)} min ago`;
  if (s < 36 * 3600) return `${Math.round(s / 3600)} h ago`;
  return `${Math.round(s / 86400)} days ago`;
}

/** "ahead behind" between two refs, or null when either is missing. */
function counts(top, a, b) {
  const r = git(['rev-list', '--left-right', '--count', `${a}...${b}`], top);
  if (r.code !== 0) return null;
  const [ahead, behind] = r.out.split(/\s+/).map(Number);
  return { ahead, behind };
}

const hasRef = (top, ref) =>
  git(['rev-parse', '--verify', '-q', `${ref}^{commit}`], top).code === 0;

function operationIn(gitDir) {
  const has = f => fs.existsSync(path.join(gitDir, f));
  if (
    has('rebase-merge') ||
    (has('rebase-apply') && !has('rebase-apply/applying'))
  )
    return 'rebase';
  if (has('rebase-apply')) return 'am';
  if (has('MERGE_HEAD')) return 'merge';
  if (has('CHERRY_PICK_HEAD')) return 'cherry-pick';
  if (has('REVERT_HEAD')) return 'revert';
  if (has('BISECT_LOG')) return 'bisect';
  return null;
}

/** Everything the check knows about the checkout at dir, with the issues found (null: not a repo). */
export function inspect(dir, { fetch = true } = {}) {
  const topR = git(['rev-parse', '--show-toplevel'], dir);
  if (topR.code !== 0 || !topR.out) return null;
  const top = topR.out;
  const gitDir = git(['rev-parse', '--absolute-git-dir'], top).out;
  const rules = loadRules(top);
  const head = git(['symbolic-ref', '--short', '-q', 'HEAD'], top);
  const branch = head.code === 0 ? head.out : null;
  const sha = git(['rev-parse', '--short', 'HEAD'], top).out || null;
  const shallow =
    git(['rev-parse', '--is-shallow-repository'], top).out === 'true';
  const hasOrigin = git(['remote', 'get-url', 'origin'], top).code === 0;

  const originHead = git(
    ['symbolic-ref', '--short', '-q', 'refs/remotes/origin/HEAD'],
    top,
  );
  let main =
    originHead.code === 0 ? originHead.out.replace(/^origin\//, '') : null;
  if (!main)
    main =
      ['main', 'master'].find(
        b =>
          hasRef(top, `refs/remotes/origin/${b}`) ||
          hasRef(top, `refs/heads/${b}`),
      ) ?? 'main';
  const protectedBranches = rules?.protectedBranches ?? [main];
  const onMain =
    !!branch && (branch === main || protectedBranches.includes(branch));

  const r = {
    top,
    branch,
    sha,
    main,
    onMain,
    shallow,
    operation: operationIn(gitDir),
    conflicts: [],
    changed: [],
    untracked: [],
    upstream: null,
    upstreamGone: false,
    vsUpstream: null,
    vsMain: null,
    merged: false,
    orphanCommits: 0,
    stashes: [],
    unpushedBranches: [],
    leftovers: [],
    fetch: { tried: false, ok: false, error: null, lastFetch: null },
    issues: [],
  };

  // Fetch the default branch (and the branch's own upstream), so behind counts are current.
  if (branch) {
    const up = git(
      [
        'for-each-ref',
        '--format=%(upstream:short)%09%(upstream:track)',
        `refs/heads/${branch}`,
      ],
      top,
    );
    const [name, track] = up.code === 0 ? up.out.split('\t') : [];
    if (name) r.upstream = name;
    if (track === '[gone]') r.upstreamGone = true;
  }
  const upOnOrigin = r.upstream?.startsWith('origin/')
    ? r.upstream.slice('origin/'.length)
    : null;
  if (fetch && hasOrigin && !shallow) {
    r.fetch.tried = true;
    const refs = [
      main,
      ...(upOnOrigin && upOnOrigin !== main ? [upOnOrigin] : []),
    ];
    let f = git(['fetch', '--quiet', '--no-tags', 'origin', ...refs], top, {
      timeout: FETCH_TIMEOUT_MS,
    });
    if (
      f.code !== 0 &&
      refs.length > 1 &&
      /couldn't find remote ref/i.test(f.err ?? '')
    ) {
      r.upstreamGone = true;
      f = git(['fetch', '--quiet', '--no-tags', 'origin', main], top, {
        timeout: FETCH_TIMEOUT_MS,
      });
    }
    r.fetch.ok = f.code === 0;
    if (!r.fetch.ok)
      r.fetch.error = (f.err || 'timed out').split('\n').pop().slice(0, 160);
  }
  try {
    r.fetch.lastFetch = fs.statSync(path.join(gitDir, 'FETCH_HEAD')).mtimeMs;
  } catch {
    r.fetch.lastFetch = null;
  }
  if (r.upstream && !hasRef(top, r.upstream)) r.upstreamGone = true;

  // The working tree: tracked changes and new files git would commit (ignored files don't count).
  const st = git(['status', '--porcelain=v1', '-z'], top, { raw: true });
  if (st.code === 0 && st.out) {
    const parts = st.out.split('\0').filter(Boolean);
    for (let i = 0; i < parts.length; i++) {
      const xy = parts[i].slice(0, 2);
      const file = parts[i].slice(3);
      if (xy[0] === 'R' || xy[0] === 'C') i++; // the next part is the old name
      if (xy === '??') r.untracked.push(file);
      else if (/U/.test(xy) || xy === 'AA' || xy === 'DD')
        r.conflicts.push(file);
      else r.changed.push(file);
    }
  }

  // Where HEAD stands against its upstream and against GitHub's main.
  const originMain = `refs/remotes/origin/${main}`;
  const haveOriginMain = hasOrigin && hasRef(top, originMain);
  if (!shallow) {
    if (r.upstream && !r.upstreamGone)
      r.vsUpstream = counts(top, 'HEAD', r.upstream);
    if (haveOriginMain) r.vsMain = counts(top, 'HEAD', originMain);
    // Pushed once, and every commit is in main now: its PR was merged.
    if (
      branch &&
      !onMain &&
      r.upstream &&
      r.vsMain &&
      r.vsMain.ahead === 0 &&
      r.vsMain.behind > 0
    )
      r.merged = true;
    if (!branch && !r.operation) {
      const o = git(
        ['rev-list', '--count', 'HEAD', '--not', '--branches', '--remotes'],
        top,
      );
      r.orphanCommits = o.code === 0 ? Number(o.out) : 0;
    }
  }

  // Stashes and other local branches holding commits that aren't on any remote.
  const sl = git(['stash', 'list', '--format=%gd%x09%ct%x09%gs'], top);
  if (sl.code === 0 && sl.out) {
    r.stashes = sl.out.split('\n').map(line => {
      const [ref, ct, msg] = line.split('\t');
      return { ref, at: Number(ct) * 1000, message: msg };
    });
  }
  if (!shallow && hasOrigin) {
    const br = git(
      ['for-each-ref', '--format=%(refname:short)', 'refs/heads'],
      top,
    );
    const names =
      br.code === 0 && br.out
        ? br.out
            .split('\n')
            .filter(b => b !== branch)
            .slice(0, MAX_BRANCHES)
        : [];
    for (const b of names) {
      const n = git(
        ['rev-list', '--count', `refs/heads/${b}`, '--not', '--remotes'],
        top,
      );
      if (n.code === 0 && Number(n.out) > 0)
        r.unpushedBranches.push({ name: b, commits: Number(n.out) });
    }
  }

  // Old folders still holding the user's work after a move (the rename to apps/studio).
  for (const l of rules?.leftovers ?? []) {
    const dirs = (l.dirs ?? ['.']).filter(d => {
      try {
        return fs
          .readdirSync(path.join(top, l.path, d))
          .some(n => !n.startsWith('.'));
      } catch {
        return false;
      }
    });
    if (dirs.length) r.leftovers.push({ ...l, found: dirs });
  }

  r.issues = issuesOf(r);
  return r;
}

/** The report's findings, worst first: { level: stop|warn|info, text, fix }. */
function issuesOf(r) {
  const out = [];
  const add = (level, text, fix = '') => out.push({ level, text, fix });
  const local = `local/${today()}`;

  if (r.operation) {
    const fix =
      r.operation === 'bisect'
        ? '`git bisect reset` ends it.'
        : `Resolve the conflicts and \`git ${r.operation} --continue\`, or back out with \`git ${r.operation} --abort\`.`;
    add(
      'stop',
      `A ${r.operation} is half done${r.conflicts.length ? `, with ${plural(r.conflicts.length, 'conflicted file')} (${listed(r.conflicts)})` : ''}.`,
      fix,
    );
  } else if (r.conflicts.length) {
    add(
      'stop',
      `${plural(r.conflicts.length, 'file has', 'files have')} unresolved conflicts: ${listed(r.conflicts)}.`,
      'Resolve them, then `git add` each one.',
    );
  }

  if (!r.branch && !r.operation) {
    add(
      'warn',
      `HEAD is detached at ${r.sha}${r.orphanCommits ? `, with ${plural(r.orphanCommits, 'commit')} on no branch` : ''}.`,
      r.orphanCommits
        ? `\`git switch -c ${local}\` keeps them on a branch; then \`git switch ${r.main}\`.`
        : `\`git switch ${r.main}\`.`,
    );
  }

  const edits = r.changed.length + r.untracked.length;
  if (edits) {
    const what = [
      r.changed.length
        ? `${plural(r.changed.length, 'committed file')} changed (${listed(r.changed)})`
        : '',
      r.untracked.length
        ? `${plural(r.untracked.length, 'new file')} git would commit (${listed(r.untracked)})`
        : '',
    ]
      .filter(Boolean)
      .join(' and ');
    if (r.onMain) {
      add(
        'warn',
        `On ${r.branch}: ${what}. These are framework edits, and they stop \`git pull\` once GitHub changes the same files.`,
        `Keep them on a branch: \`git switch -c ${local}\`, commit, push and open a PR. Discard them only if the user says so.`,
      );
    } else if (r.branch) {
      add('info', `On ${r.branch}: ${what}, not committed yet.`);
    }
  }

  if (r.onMain && r.vsMain) {
    const { ahead, behind } = r.vsMain;
    if (ahead) {
      add(
        'warn',
        `${r.branch} has ${plural(ahead, 'commit')} that ${ahead === 1 ? "isn't" : "aren't"} on GitHub${behind ? ` and is ${behind} behind it (diverged)` : ''}.`,
        `Move them to a branch so ${r.branch} can follow GitHub: \`git branch ${local}\`, push it and open a PR; then \`git reset --keep origin/${r.main}\` puts ${r.branch} back (with the user's OK).`,
      );
    } else if (behind) {
      add(
        'warn',
        `${r.branch} is ${plural(behind, 'commit')} behind GitHub.`,
        edits
          ? `Once the edits above are committed on their branch: \`git switch ${r.branch} && git pull --ff-only\`.`
          : '`git pull --ff-only`.',
      );
    }
  }

  if (r.branch && !r.onMain) {
    if (r.merged) {
      add(
        'info',
        `${r.branch} is already in ${r.main} (merged)${r.upstreamGone ? ' and its GitHub branch is gone' : ''}.`,
        `\`git switch ${r.main} && git pull --ff-only\`, then \`git branch -d ${r.branch}\`.`,
      );
    } else {
      if (r.upstreamGone)
        add(
          'info',
          `${r.branch}'s GitHub branch (${r.upstream}) is gone: its PR was merged or closed.`,
          `If nothing on it is still needed, \`git switch ${r.main} && git pull --ff-only\`.`,
        );
      const unpushed =
        r.upstream && !r.upstreamGone ? r.vsUpstream?.ahead : r.vsMain?.ahead;
      if (unpushed)
        add(
          'info',
          `${r.branch} has ${plural(unpushed, 'commit')} not pushed.`,
          `\`git push -u origin ${r.branch}\` and open a PR.`,
        );
      if (r.vsMain?.behind)
        add(
          'info',
          `${r.branch} is ${plural(r.vsMain.behind, 'commit')} behind ${r.main}.`,
          `Bring ${r.main} in when it suits: \`git merge origin/${r.main}\`.`,
        );
    }
  }

  if (r.stashes.length) {
    const oldest = Math.min(...r.stashes.map(s => s.at));
    add(
      'info',
      `${plural(r.stashes.length, 'stash', 'stashes')} (the oldest from ${ago(Date.now() - oldest)}) ${r.stashes.length === 1 ? 'holds' : 'hold'} local work.`,
      '`git stash list` and `git stash show -p stash@{N}` show them; drop one only after the user has looked.',
    );
  }

  if (r.unpushedBranches.length) {
    add(
      'info',
      `Local branches with commits that aren't on GitHub: ${listed(r.unpushedBranches.map(b => `${b.name} (${b.commits})`))}.`,
      'Push the ones still needed and open PRs; ask the user about the rest.',
    );
  }

  for (const l of r.leftovers) {
    add(
      'warn',
      `${l.what ?? 'Work'} is still in ${l.path} (${l.found.map(d => `${d}/`).join(', ')}).`,
      l.fix ?? '',
    );
  }

  if (r.fetch.tried && !r.fetch.ok) {
    add(
      'info',
      `Couldn't reach GitHub (${r.fetch.error}); behind counts are ${r.fetch.lastFetch ? `from the last fetch, ${ago(Date.now() - r.fetch.lastFetch)}` : 'unknown'}.`,
    );
  }
  return out;
}

const MARK = { stop: '✗', warn: '!', info: '·' };

/** One line on where the checkout stands, for a healthy report. */
function summary(r) {
  const where = r.branch ? `on ${r.branch}` : `detached at ${r.sha}`;
  const sync = r.vsMain
    ? r.vsMain.ahead || r.vsMain.behind
      ? `${r.vsMain.ahead} ahead, ${r.vsMain.behind} behind origin/${r.main}`
      : `up to date with origin/${r.main}`
    : r.shallow
      ? 'shallow clone'
      : 'no origin to compare';
  return `${where}, ${r.changed.length + r.untracked.length ? 'with uncommitted edits' : 'clean'}, ${sync}`;
}

export function text(r) {
  const lines = [`MediaMake git check: ${r.top} (${summary(r)})`];
  for (const i of r.issues)
    lines.push(
      `  ${MARK[i.level]} ${i.text}${i.fix ? `\n      ${i.fix}` : ''}`,
    );
  if (!r.issues.length) lines.push('  ✓ Nothing to fix.');
  return lines.join('\n');
}

/** The SessionStart hook's JSON: context for Claude, and a one-line notice for the user when it matters. */
export function hookOutput(r) {
  if (!r) return null;
  const serious = r.issues.filter(i => i.level !== 'info');
  if (!r.issues.length) {
    return {
      hookSpecificOutput: {
        hookEventName: 'SessionStart',
        additionalContext: `MediaMake git check: ${summary(r)}.`,
      },
    };
  }
  const context = [
    `MediaMake git check at session start (tools/git-health.mjs), ${summary(r)}:`,
    ...r.issues.map(i => `- ${i.text}${i.fix ? ` Fix: ${i.fix}` : ''}`),
    serious.length
      ? "Before starting the user's task, tell them in a sentence or two what is wrong and the fix you suggest, and fix it only with their OK."
      : 'Mention these only if they bear on the task.',
    'Never run git reset --hard, checkout -- or restore on changed files, stash drop, branch -D or clean on this checkout without asking: it may hold the only copy of their work.',
  ].join('\n');
  const out = {
    hookSpecificOutput: {
      hookEventName: 'SessionStart',
      additionalContext: context,
    },
  };
  if (serious.length)
    out.systemMessage = `Git check: ${serious.map(i => i.text.replace(/ \(.*?\)/g, '')).join(' ')} Run \`npm run git-health\` for the fixes.`;
  return out;
}

async function readStdin() {
  if (process.stdin.isTTY) return {};
  let raw = '';
  for await (const chunk of process.stdin) raw += chunk;
  try {
    return JSON.parse(raw || '{}');
  } catch {
    return {};
  }
}

async function main(argv) {
  const flag = name => argv.includes(`--${name}`);
  const dirArg = argv.find(a => a.startsWith('--dir='))?.slice('--dir='.length);
  const fetch = !flag('no-fetch') && process.env.MEDIAMAKE_GIT_FETCH !== '0';
  if (flag('hook')) {
    const input = await readStdin();
    const dir =
      dirArg || process.env.CLAUDE_PROJECT_DIR || input.cwd || process.cwd();
    try {
      const out = hookOutput(inspect(dir, { fetch }));
      if (out) process.stdout.write(`${JSON.stringify(out)}\n`);
    } catch {
      // A broken check never holds up a session.
    }
    return 0;
  }
  const r = inspect(dirArg || process.cwd(), { fetch });
  if (!r) {
    console.error('Not a git checkout.');
    return 2;
  }
  if (flag('json')) console.log(JSON.stringify(r, null, 2));
  else console.log(text(r));
  return r.issues.some(i => i.level !== 'info') ? 1 : 0;
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(fs.realpathSync(process.argv[1])).href
) {
  main(process.argv.slice(2)).then(
    code => process.exit(code),
    () => process.exit(0),
  );
}
