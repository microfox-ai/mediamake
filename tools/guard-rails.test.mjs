// Tests for the guard rails: the pre-edit guard (tools/guard-rails.mjs) and the session-start
// check (tools/git-health.mjs), on throwaway checkouts. Run: node --test tools/
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { after, describe, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import {
  checkBash,
  checkEdit,
  decide,
  gitCalls,
  matches,
} from './guard-rails.mjs';
import { hookOutput, inspect } from './git-health.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const RULES = fs.readFileSync(path.join(HERE, 'guard-rails.json'));
const roots = [];
after(() => roots.forEach(r => fs.rmSync(r, { recursive: true, force: true })));

const ENV = {
  ...process.env,
  GIT_CONFIG_NOSYSTEM: '1',
  GIT_TERMINAL_PROMPT: '0',
};
delete ENV.GIT_DIR;
delete ENV.GIT_WORK_TREE;
function g(cwd, ...args) {
  const r = spawnSync(
    'git',
    [
      '-c',
      'user.name=Test',
      '-c',
      'user.email=test@example.com',
      '-c',
      'commit.gpgsign=false',
      '-c',
      'init.defaultBranch=main',
      ...args,
    ],
    { cwd, encoding: 'utf8', env: ENV },
  );
  return {
    code: r.status,
    out: (r.stdout ?? '').trim(),
    err: (r.stderr ?? '').trim(),
  };
}
function ok(cwd, ...args) {
  const r = g(cwd, ...args);
  assert.equal(r.code, 0, `git ${args.join(' ')} failed: ${r.err}`);
  return r.out;
}
function write(dir, rel, content) {
  fs.mkdirSync(path.dirname(path.join(dir, rel)), { recursive: true });
  fs.writeFileSync(path.join(dir, rel), content);
}
const commitAll = (dir, msg) => (
  ok(dir, 'add', '-A'),
  ok(dir, 'commit', '-q', '-m', msg)
);

/** An origin, a seed clone that plays "GitHub moved on", and the work checkout under test. */
function setup({ rules = true } = {}) {
  const root = fs.realpathSync(
    fs.mkdtempSync(path.join(os.tmpdir(), 'guard-rails-')),
  );
  roots.push(root);
  const origin = path.join(root, 'origin.git');
  ok(root, 'init', '-q', '--bare', '-b', 'main', origin);
  const seed = path.join(root, 'seed');
  ok(root, 'clone', '-q', origin, seed);
  ok(seed, 'switch', '-q', '-c', 'main');
  if (rules) write(seed, 'tools/guard-rails.json', RULES);
  write(
    seed,
    '.gitignore',
    [
      'apps/studio/projects/*',
      '!apps/studio/projects/sample-pulse/',
      'apps/studio/out/',
      '.claude/*',
      '!.claude/skills/',
      '!.claude/settings.json',
      '/apps/lyrics_videos/',
      '',
    ].join('\n'),
  );
  write(seed, 'apps/studio/src/engine.ts', 'export const x = 1;\n');
  write(seed, 'apps/studio/projects/sample-pulse/brief.md', 'sample\n');
  write(seed, '.agents/skills/make-x/SKILL.md', '# make-x\n');
  fs.mkdirSync(path.join(seed, '.claude/skills'), { recursive: true });
  fs.symlinkSync(
    '../../.agents/skills/make-x',
    path.join(seed, '.claude/skills/make-x'),
  );
  write(seed, 'SKILLS.md', '# Skills\n');
  write(seed, 'package-lock.json', '{}\n');
  commitAll(seed, 'init');
  ok(seed, 'push', '-q', '-u', 'origin', 'main');
  const work = path.join(root, 'work');
  ok(root, 'clone', '-q', origin, work);
  const upstream = (
    msg = 'upstream change',
    file = 'apps/studio/src/engine.ts',
  ) => {
    write(
      seed,
      file,
      `// ${msg}\n${fs.readFileSync(path.join(seed, file), 'utf8')}`,
    );
    commitAll(seed, msg);
    ok(seed, 'push', '-q', 'origin', 'HEAD');
  };
  return { root, origin, seed, work, upstream };
}

const levels = r => r.issues.map(i => i.level);
const find = (r, re) => r.issues.find(i => re.test(i.text));

describe('matches', () => {
  test('folders, exact paths and globs', () => {
    assert.ok(matches('apps/studio/', 'apps/studio/src/a.ts'));
    assert.ok(!matches('apps/studio/', 'apps/studio_old/a.ts'));
    assert.ok(matches('SKILLS.md', 'SKILLS.md'));
    assert.ok(!matches('SKILLS.md', 'docs/SKILLS.md'));
    assert.ok(matches('**/package-lock.json', 'package-lock.json'));
    assert.ok(matches('**/package-lock.json', 'apps/x/package-lock.json'));
    assert.ok(matches('apps/*/README.md', 'apps/mediamake/README.md'));
    assert.ok(!matches('apps/*/README.md', 'apps/mediamake/docs/README.md'));
  });
});

describe('gitCalls', () => {
  test('follows cd and -C, skips env assignments and quotes', () => {
    const calls = gitCalls(
      `cd sub && FOO=1 git -C "a b" -c x=y commit -m 'msg; git clean -fdx' ; git status | cat`,
      '/r',
    );
    assert.deepEqual(
      calls.map(c => [c.dir, c.sub]),
      [
        ['/r/sub/a b', 'commit'],
        ['/r/sub', 'status'],
      ],
    );
  });

  test('a heredoc commit message stays one call', () => {
    const cmd = `git commit -m "$(cat <<'EOF'\nfeat: guard\n\ngit clean -x is stopped; so is || this\nEOF\n)"`;
    assert.deepEqual(
      gitCalls(cmd, '/r').map(c => c.sub),
      ['commit'],
    );
  });
});

describe('the pre-edit guard', () => {
  const t = setup();
  const otherBranch = path.join(t.root, 'feature');
  ok(t.work, 'worktree', 'add', '-q', '-b', 'engine/thing', otherBranch);

  test('stops an edit to a committed engine file on main, with where it belongs', () => {
    const why = checkEdit(path.join(t.work, 'apps/studio/src/engine.ts'));
    assert.match(why, /video engine file \(committed\)/);
    assert.match(why, /git switch -c engine\/<what>/);
    assert.match(why, /git worktree add -b engine\/<what>/);
  });

  test('stops a new file git would commit, by relative path from the cwd', () => {
    const why = checkEdit('apps/studio/src/new.ts', t.work);
    assert.match(why, /a new file git would commit/);
  });

  test('names the area: skills (through the .claude/skills link), generated files, the lockfile', () => {
    assert.match(
      checkEdit(path.join(t.work, '.claude/skills/make-x/SKILL.md')),
      /\.agents\/skills\/make-x\/SKILL\.md is a skill file/,
    );
    assert.match(
      checkEdit(path.join(t.work, 'SKILLS.md')),
      /is a generated file/,
    );
    assert.match(
      checkEdit(path.join(t.work, 'package-lock.json')),
      /is a lockfile/,
    );
    assert.match(
      checkEdit(
        path.join(t.work, 'apps/studio/projects/sample-pulse/brief.md'),
      ),
      /video engine/,
    );
  });

  test("lets the user's ignored work through", () => {
    assert.equal(
      checkEdit(
        path.join(t.work, 'apps/studio/projects/my-song/video/index.tsx'),
      ),
      null,
    );
    assert.equal(
      checkEdit(path.join(t.work, 'apps/studio/out/my-song/v1.mp4')),
      null,
    );
    assert.equal(
      checkEdit(path.join(t.work, '.claude/settings.local.json')),
      null,
    );
  });

  test('lets edits through on another branch, in a worktree, outside the repo and in other repos', () => {
    assert.equal(
      checkEdit(path.join(otherBranch, 'apps/studio/src/engine.ts')),
      null,
    );
    assert.equal(checkEdit(path.join(t.root, 'notes.md')), null);
    const other = setup({ rules: false });
    assert.equal(
      checkEdit(path.join(other.work, 'apps/studio/src/engine.ts')),
      null,
    );
  });

  test('the allow list lets a committed file through', () => {
    const rules = JSON.parse(RULES);
    rules.allow = ['SKILLS.md'];
    fs.writeFileSync(
      path.join(t.work, 'tools/guard-rails.json'),
      JSON.stringify(rules),
    );
    try {
      assert.equal(checkEdit(path.join(t.work, 'SKILLS.md')), null);
    } finally {
      ok(t.work, 'checkout', '--', 'tools/guard-rails.json');
    }
  });

  test('stops git commit on main, wherever the command points', () => {
    assert.match(
      checkBash('git commit -m "x"', t.work),
      /would commit on main/,
    );
    assert.match(
      checkBash(
        `cd ${JSON.stringify(t.work)} && git add -A && git commit -m x`,
        t.root,
      ),
      /would commit on main/,
    );
    assert.match(
      checkBash(`git -C ${t.work} commit --amend --no-edit`, t.root),
      /would commit on main/,
    );
    assert.equal(checkBash('git commit -m x', otherBranch), null);
    assert.equal(checkBash('git commit --dry-run', t.work), null);
    assert.equal(checkBash('git status && git log -1', t.work), null);
    assert.equal(checkBash('echo commit', t.work), null);
  });

  test('stops git clean -x and -X on any branch', () => {
    assert.match(
      checkBash('git clean -fdx', t.work),
      /deletes the files git ignores/,
    );
    assert.match(
      checkBash('git clean -f -X', otherBranch),
      /deletes the files git ignores/,
    );
    assert.equal(checkBash('git clean -ndx', t.work), null);
    assert.equal(checkBash('git clean -fd', t.work), null);
  });

  test('decide reads the hook input and MEDIAMAKE_GUARD=off turns it off', () => {
    const input = {
      tool_name: 'Edit',
      cwd: t.work,
      tool_input: { file_path: 'SKILLS.md' },
    };
    assert.match(decide(input), /generated file/);
    assert.match(
      decide({
        tool_name: 'NotebookEdit',
        cwd: t.work,
        tool_input: { notebook_path: 'SKILLS.md' },
      }),
      /generated/,
    );
    assert.equal(
      decide({
        tool_name: 'Read',
        cwd: t.work,
        tool_input: { file_path: 'SKILLS.md' },
      }),
      null,
    );
    process.env.MEDIAMAKE_GUARD = 'off';
    try {
      assert.equal(decide(input), null);
    } finally {
      delete process.env.MEDIAMAKE_GUARD;
    }
  });

  test('as a hook: prints a deny decision, or nothing, and exits 0', () => {
    const run = input =>
      spawnSync(process.execPath, [path.join(HERE, 'guard-rails.mjs')], {
        input: JSON.stringify(input),
        encoding: 'utf8',
      });
    const denied = run({
      tool_name: 'Write',
      cwd: t.work,
      tool_input: { file_path: 'apps/studio/src/engine.ts' },
    });
    assert.equal(denied.status, 0);
    const out = JSON.parse(denied.stdout);
    assert.equal(out.hookSpecificOutput.hookEventName, 'PreToolUse');
    assert.equal(out.hookSpecificOutput.permissionDecision, 'deny');
    assert.match(
      out.hookSpecificOutput.permissionDecisionReason,
      /video engine/,
    );
    const allowed = run({
      tool_name: 'Write',
      cwd: t.work,
      tool_input: { file_path: 'apps/studio/projects/a/b.ts' },
    });
    assert.equal(allowed.status, 0);
    assert.equal(allowed.stdout, '');
    const broken = spawnSync(
      process.execPath,
      [path.join(HERE, 'guard-rails.mjs')],
      { input: 'not json', encoding: 'utf8' },
    );
    assert.equal(broken.status, 0);
    assert.equal(broken.stdout, '');
  });
});

describe('the session-start check', () => {
  test('a clean, current main has nothing to fix', () => {
    const t = setup();
    const r = inspect(t.work);
    assert.deepEqual(r.issues, []);
    assert.equal(r.branch, 'main');
    assert.deepEqual(r.vsMain, { ahead: 0, behind: 0 });
    const out = hookOutput(r);
    assert.match(
      out.hookSpecificOutput.additionalContext,
      /on main, clean, up to date with origin\/main/,
    );
    assert.equal(out.systemMessage, undefined);
  });

  test('behind GitHub: fetches and says to pull', () => {
    const t = setup();
    t.upstream('one');
    t.upstream('two');
    const r = inspect(t.work);
    assert.deepEqual(r.vsMain, { ahead: 0, behind: 2 });
    assert.match(find(r, /behind GitHub/).fix, /git pull --ff-only/);
    assert.match(
      hookOutput(r).systemMessage,
      /main is 2 commits behind GitHub/,
    );
  });

  test('framework edits on main (changed and new files), but never the ignored work', () => {
    const t = setup();
    write(t.work, 'apps/studio/src/engine.ts', 'export const x = 2;\n');
    write(t.work, 'apps/studio/src/added.ts', 'new\n');
    write(t.work, 'apps/studio/projects/my-song/brief.md', 'mine\n');
    const r = inspect(t.work);
    assert.deepEqual(r.changed, ['apps/studio/src/engine.ts']);
    assert.deepEqual(r.untracked, ['apps/studio/src/added.ts']);
    const issue = find(r, /framework edits/);
    assert.equal(issue.level, 'warn');
    assert.match(issue.fix, /git switch -c local\//);
  });

  test('local commits on main, and diverged once GitHub moves on', () => {
    const t = setup();
    write(t.work, 'apps/studio/src/mine.ts', 'mine\n');
    commitAll(t.work, 'local');
    let r = inspect(t.work);
    assert.match(
      find(r, /isn't on GitHub/).fix,
      /git branch local\/.*git reset --keep origin\/main/,
    );
    t.upstream('theirs');
    r = inspect(t.work);
    assert.match(
      find(r, /aren't on GitHub|isn't on GitHub/).text,
      /1 behind it \(diverged\)/,
    );
  });

  test('a merge left half done, with its conflict', () => {
    const t = setup();
    write(t.work, 'apps/studio/src/engine.ts', 'export const x = "mine";\n');
    commitAll(t.work, 'mine');
    write(t.seed, 'apps/studio/src/engine.ts', 'export const x = "theirs";\n');
    commitAll(t.seed, 'theirs');
    ok(t.seed, 'push', '-q', 'origin', 'main');
    assert.notEqual(g(t.work, 'pull', '--no-rebase', '-q').code, 0);
    const r = inspect(t.work);
    assert.equal(r.operation, 'merge');
    assert.deepEqual(r.conflicts, ['apps/studio/src/engine.ts']);
    assert.equal(levels(r)[0], 'stop');
    assert.match(r.issues[0].fix, /git merge --abort/);
  });

  test('a rebase left half done is not reported as a detached HEAD', () => {
    const t = setup();
    write(t.work, 'apps/studio/src/engine.ts', 'export const x = "mine";\n');
    commitAll(t.work, 'mine');
    write(t.seed, 'apps/studio/src/engine.ts', 'export const x = "theirs";\n');
    commitAll(t.seed, 'theirs');
    ok(t.seed, 'push', '-q', 'origin', 'main');
    ok(t.work, 'fetch', '-q');
    assert.notEqual(g(t.work, 'rebase', 'origin/main').code, 0);
    const r = inspect(t.work);
    assert.equal(r.operation, 'rebase');
    assert.match(r.issues[0].fix, /git rebase --abort/);
    assert.equal(find(r, /detached/), undefined);
  });

  test('a detached HEAD with a commit on no branch', () => {
    const t = setup();
    ok(t.work, 'switch', '-q', '--detach');
    write(t.work, 'apps/studio/src/engine.ts', 'export const x = 3;\n');
    commitAll(t.work, 'lost');
    const r = inspect(t.work);
    assert.match(find(r, /detached/).text, /1 commit on no branch/);
  });

  test('stashes and other branches holding work that is not on GitHub', () => {
    const t = setup();
    ok(t.work, 'switch', '-q', '-c', 'skill/make-x-lessons');
    write(t.work, '.agents/skills/make-x/SKILL.md', '# make-x\nlesson\n');
    commitAll(t.work, 'lesson');
    ok(t.work, 'switch', '-q', 'main');
    write(t.work, 'SKILLS.md', 'edited\n');
    ok(t.work, 'stash', '-q');
    const r = inspect(t.work);
    assert.match(find(r, /stash/).text, /1 stash \(the oldest from/);
    assert.match(find(r, /Local branches/).text, /skill\/make-x-lessons \(1\)/);
    assert.deepEqual(levels(r), ['info', 'info']);
    assert.equal(hookOutput(r).systemMessage, undefined);
  });

  test('a branch: unpushed commits, behind main, then merged and its GitHub branch gone', () => {
    const t = setup();
    ok(t.work, 'switch', '-q', '-c', 'engine/thing');
    write(t.work, 'apps/studio/src/thing.ts', 'thing\n');
    commitAll(t.work, 'thing');
    let r = inspect(t.work);
    assert.match(find(r, /not pushed/).fix, /git push -u origin engine\/thing/);
    ok(t.work, 'push', '-q', '-u', 'origin', 'engine/thing');
    t.upstream('meanwhile', 'SKILLS.md');
    r = inspect(t.work);
    assert.match(
      find(r, /behind main/).text,
      /engine\/thing is 1 commit behind main/,
    );
    assert.equal(find(r, /not pushed/), undefined);
    // GitHub merges the PR and deletes the branch.
    ok(t.seed, 'fetch', '-q', 'origin', 'engine/thing');
    ok(
      t.seed,
      'merge',
      '-q',
      '--no-ff',
      '-m',
      'Merge pull request #1',
      'FETCH_HEAD',
    );
    ok(t.seed, 'push', '-q', 'origin', 'main', ':engine/thing');
    r = inspect(t.work);
    assert.equal(r.upstreamGone, true);
    assert.match(
      find(r, /already in main/).text,
      /merged\) and its GitHub branch is gone/,
    );
  });

  test('work left in the old apps/lyrics_videos folder: says to run mm migrate', () => {
    const t = setup();
    write(t.work, 'apps/lyrics_videos/projects/my-song/brief.md', 'mine\n');
    write(t.work, 'apps/lyrics_videos/out/my-song/v1.mp4', 'video\n');
    const r = inspect(t.work);
    assert.deepEqual(r.untracked, []);
    const issue = find(r, /apps\/lyrics_videos/);
    assert.equal(issue.level, 'warn');
    assert.match(
      issue.text,
      /before the rename to apps\/studio is still in apps\/lyrics_videos \(projects\/, out\/\)/,
    );
    assert.match(issue.fix, /mm migrate --yes/);
    assert.equal(
      checkEdit(
        path.join(t.work, 'apps/lyrics_videos/projects/my-song/brief.md'),
      ),
      null,
    );
  });

  test('GitHub out of reach: says so and keeps going', () => {
    const t = setup();
    ok(t.work, 'remote', 'set-url', 'origin', path.join(t.root, 'nowhere.git'));
    const r = inspect(t.work);
    assert.equal(r.fetch.ok, false);
    assert.match(find(r, /Couldn't reach GitHub/).text, /from the last fetch/);
  });

  test('not a checkout: nothing to say', () => {
    const dir = fs.realpathSync(
      fs.mkdtempSync(path.join(os.tmpdir(), 'guard-rails-plain-')),
    );
    roots.push(dir);
    assert.equal(inspect(dir), null);
    const run = spawnSync(
      process.execPath,
      [path.join(HERE, 'git-health.mjs'), '--hook'],
      {
        input: JSON.stringify({ cwd: dir, source: 'startup' }),
        encoding: 'utf8',
        env: { ...process.env, CLAUDE_PROJECT_DIR: dir },
      },
    );
    assert.equal(run.status, 0);
    assert.equal(run.stdout, '');
  });

  test('as a hook: valid SessionStart JSON and exit 0, even with problems', () => {
    const t = setup();
    t.upstream('one');
    write(t.work, 'SKILLS.md', 'edited\n');
    const run = spawnSync(
      process.execPath,
      [path.join(HERE, 'git-health.mjs'), '--hook'],
      {
        input: JSON.stringify({ cwd: t.work, source: 'startup' }),
        encoding: 'utf8',
        env: { ...process.env, CLAUDE_PROJECT_DIR: t.work },
      },
    );
    assert.equal(run.status, 0);
    const out = JSON.parse(run.stdout);
    assert.equal(out.hookSpecificOutput.hookEventName, 'SessionStart');
    assert.match(
      out.hookSpecificOutput.additionalContext,
      /tell them in a sentence or two/,
    );
    assert.match(out.systemMessage, /framework edits.*behind GitHub/);
    const cli = spawnSync(
      process.execPath,
      [path.join(HERE, 'git-health.mjs'), '--no-fetch', `--dir=${t.work}`],
      { encoding: 'utf8' },
    );
    assert.equal(cli.status, 1);
    assert.match(
      cli.stdout,
      /! On main: 1 committed file changed \(SKILLS\.md\)/,
    );
  });
});
