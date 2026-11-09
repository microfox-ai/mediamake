// Tests for mm update (tools/update.mjs) and mm doctor's pure parts (tools/doctor.mjs), on throwaway
// checkouts with a bare origin that a second clone pushes to. Run: node --test tools/
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { after, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { lockDrift, nodeOk, report } from './doctor.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const tmp = fs.realpathSync(
  fs.mkdtempSync(path.join(os.tmpdir(), 'mm-update-test-')),
);
after(() => fs.rmSync(tmp, { recursive: true, force: true }));

const ENV = {
  ...process.env,
  HOME: path.join(tmp, 'home'),
  MEDIAMAKE_CONFIG: path.join(tmp, 'no-config.json'),
  MEDIAMAKE_GIT_FETCH: '1',
  GIT_CONFIG_NOSYSTEM: '1',
  GIT_CONFIG_GLOBAL: path.join(tmp, 'gitconfig'),
  GIT_TERMINAL_PROMPT: '0',
};
for (const k of [
  'GIT_DIR',
  'GIT_WORK_TREE',
  'MEDIAMAKE_WORKSPACE',
  'GIT_AUTHOR_NAME',
  'GIT_AUTHOR_EMAIL',
  'GIT_COMMITTER_NAME',
  'GIT_COMMITTER_EMAIL',
])
  delete ENV[k];
fs.mkdirSync(ENV.HOME, { recursive: true });
fs.writeFileSync(
  ENV.GIT_CONFIG_GLOBAL,
  '[init]\n\tdefaultBranch = main\n[commit]\n\tgpgsign = false\n[user]\n\tname = Test\n\temail = test@example.com\n',
);

const git = (cwd, ...a) => {
  const r = spawnSync('git', a, { cwd, encoding: 'utf8', env: ENV });
  assert.equal(r.status, 0, `git ${a.join(' ')}: ${r.stderr}`);
  return r.stdout.trim();
};
const write = (file, text) => {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, text);
};
const update = (dir, ...args) =>
  spawnSync(
    process.execPath,
    [
      path.join(HERE, 'update.mjs'),
      `--dir=${dir}`,
      '--no-ci',
      '--no-doctor',
      ...args,
    ],
    { encoding: 'utf8', env: ENV },
  );

let n = 0;
/** A bare origin with one commit, the user's clone, and a teammate's clone that pushes `ahead` commits after. */
const setup = (ahead = 2) => {
  const root = path.join(tmp, `t${++n}`);
  const origin = path.join(root, 'origin.git');
  git(tmp, 'init', '--quiet', '--bare', origin);
  const seed = path.join(root, 'seed');
  git(tmp, 'clone', '--quiet', origin, seed);
  write(path.join(seed, 'README.md'), 'framework\n');
  write(path.join(seed, '.gitignore'), 'projects/\n');
  git(seed, 'add', '-A');
  git(seed, 'commit', '--quiet', '-m', 'first');
  git(seed, 'push', '--quiet', 'origin', 'main');
  const user = path.join(root, 'user');
  git(tmp, 'clone', '--quiet', origin, user);
  for (let i = 0; i < ahead; i++) {
    write(path.join(seed, `upstream-${i}.txt`), `${i}\n`);
    git(seed, 'add', '-A');
    git(seed, 'commit', '--quiet', '-m', `upstream ${i}`);
  }
  if (ahead) git(seed, 'push', '--quiet', 'origin', 'main');
  return { origin, seed, user };
};

test('a clean main behind GitHub updates without --yes', () => {
  const { user, seed } = setup(2);
  const r = update(user);
  assert.equal(r.status, 0, r.stderr + r.stdout);
  assert.match(r.stdout, /up to GitHub's \(2 new commits\)/);
  assert.equal(git(user, 'rev-parse', 'HEAD'), git(seed, 'rev-parse', 'HEAD'));
});

test('edits on main stop at a dry run without --yes, and nothing changes', () => {
  const { user } = setup(1);
  const head = git(user, 'rev-parse', 'HEAD');
  write(path.join(user, 'README.md'), 'edited on main\n');
  write(path.join(user, 'new-tool.mjs'), 'export {}\n');
  const r = update(user);
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /1 committed file changed \(README\.md\)/);
  assert.match(
    r.stdout,
    /New files on main that git would commit: new-tool\.mjs/,
  );
  assert.match(r.stdout, /mm update --yes will:/);
  assert.match(r.stdout, /Nothing has changed/);
  assert.equal(git(user, 'rev-parse', 'HEAD'), head);
  assert.equal(
    fs.readFileSync(path.join(user, 'README.md'), 'utf8'),
    'edited on main\n',
  );
  assert.equal(git(user, 'branch', '--list', 'local/*'), '');
});

test('--yes saves edits and local commits on local/<date>, leaves ignored files, and updates main', () => {
  const { user, seed } = setup(2);
  write(path.join(user, 'mine.txt'), 'a local commit\n');
  git(user, 'add', 'mine.txt');
  git(user, 'commit', '--quiet', '-m', 'my local commit');
  write(path.join(user, 'README.md'), 'edited on main\n');
  write(path.join(user, 'projects', 'song', 'index.tsx'), 'my project\n');
  const r = update(user, '--yes');
  assert.equal(r.status, 0, r.stderr + r.stdout);
  const saved = r.stdout.match(/saved on (local\/\d{4}-\d{2}-\d{2})/)?.[1];
  assert.ok(saved, r.stdout);
  // main is GitHub's, clean, with the user's project untouched
  assert.equal(git(user, 'rev-parse', 'HEAD'), git(seed, 'rev-parse', 'HEAD'));
  assert.equal(git(user, 'status', '--porcelain'), '');
  assert.equal(
    fs.readFileSync(path.join(user, 'projects', 'song', 'index.tsx'), 'utf8'),
    'my project\n',
  );
  assert.equal(
    fs.readFileSync(path.join(user, 'README.md'), 'utf8'),
    'framework\n',
  );
  // the branch has the local commit and the edits, and not the project
  assert.equal(git(user, 'show', `${saved}:README.md`), 'edited on main');
  assert.equal(git(user, 'show', `${saved}:mine.txt`), 'a local commit');
  assert.match(
    git(user, 'log', '--format=%s', `main..${saved}`),
    /Local edits saved by mm update[\s\S]*my local commit/,
  );
  assert.equal(
    spawnSync('git', ['cat-file', '-e', `${saved}:projects/song/index.tsx`], {
      cwd: user,
      env: ENV,
    }).status === 0,
    false,
  );
  // a second save the same day gets its own branch
  write(path.join(user, 'README.md'), 'edited again\n');
  const again = update(user, '--yes');
  assert.match(again.stdout, new RegExp(`saved on ${saved}-2`));
});

test('--push sends the saved branch to GitHub', () => {
  const { user, origin } = setup(0);
  write(path.join(user, 'README.md'), 'to share\n');
  const r = update(user, '--yes', '--push');
  assert.equal(r.status, 0, r.stderr + r.stdout);
  const saved = r.stdout.match(/saved on (local\/[\d-]+)/)[1];
  assert.equal(
    git(origin, 'rev-parse', `refs/heads/${saved}`),
    git(user, 'rev-parse', saved),
  );
});

test('on another branch, the branch stays and local main follows GitHub', () => {
  const { user, seed } = setup(0);
  git(user, 'switch', '--quiet', '-c', 'feat/thing');
  write(path.join(user, 'thing.txt'), 'work in progress\n');
  write(path.join(seed, 'later.txt'), 'later\n');
  git(seed, 'add', '-A');
  git(seed, 'commit', '--quiet', '-m', 'later');
  git(seed, 'push', '--quiet', 'origin', 'main');
  const head = git(user, 'rev-parse', 'HEAD');
  const r = update(user);
  assert.equal(r.status, 0, r.stderr + r.stdout);
  assert.match(r.stdout, /You're on feat\/thing, left as it is/);
  assert.equal(git(user, 'rev-parse', 'HEAD'), head);
  assert.equal(
    git(user, 'rev-parse', 'refs/heads/main'),
    git(seed, 'rev-parse', 'HEAD'),
  );
  assert.ok(fs.existsSync(path.join(user, 'thing.txt')));
});

test('a half-done merge stops it with the fix', () => {
  const { user, seed } = setup(0);
  write(path.join(seed, 'README.md'), 'theirs\n');
  git(seed, 'commit', '--quiet', '-am', 'theirs');
  git(seed, 'push', '--quiet', 'origin', 'main');
  git(user, 'switch', '--quiet', '-c', 'feat/clash');
  write(path.join(user, 'README.md'), 'mine\n');
  git(user, 'commit', '--quiet', '-am', 'mine');
  git(user, 'fetch', '--quiet', 'origin');
  spawnSync('git', ['merge', 'origin/main'], { cwd: user, env: ENV });
  const r = update(user);
  assert.equal(r.status, 1);
  assert.match(r.stdout, /can't start/);
  assert.match(r.stdout, /merge is half done/);
});

test('doctor: Node versions', () => {
  assert.equal(nodeOk('22.6.0'), true);
  assert.equal(nodeOk('22.5.1'), false);
  assert.equal(nodeOk('20.18.0'), false);
  assert.equal(nodeOk('24.0.0'), true);
});

test('doctor: node_modules against the lockfile', () => {
  const lock = {
    packages: {
      '': { name: 'root' },
      'node_modules/a': { version: '1.0.0' },
      'node_modules/b': { version: '2.0.0' },
      'node_modules/@esbuild/darwin-arm64': {
        version: '0.20.0',
        optional: true,
      },
      'node_modules/studio': { resolved: 'apps/studio', link: true },
      'apps/studio/node_modules/c': { version: '3.0.0' },
    },
  };
  const same = {
    packages: {
      'node_modules/a': { version: '1.0.0' },
      'node_modules/b': { version: '2.0.0' },
      'apps/studio/node_modules/c': { version: '3.0.0' },
    },
  };
  assert.deepEqual(lockDrift(lock, same), []);
  const off = {
    packages: {
      'node_modules/a': { version: '1.0.1' },
      'apps/studio/node_modules/c': { version: '3.0.0' },
    },
  };
  assert.deepEqual(lockDrift(lock, off), ['a', 'b']);
});

test('doctor: the report marks what --fix can do', () => {
  const lines = report(
    [
      { id: 'node', level: 'ok', text: 'Node 22.12.0' },
      {
        id: 'deps',
        level: 'warn',
        text: "node_modules doesn't match",
        fix: '`npm ci`',
        auto: { what: 'npm ci' },
      },
      {
        id: 'uv',
        level: 'fail',
        text: 'uv is missing',
        fix: '`brew install uv`',
      },
    ],
    '/x',
  ).join('\n');
  assert.match(lines, /✔ Node 22\.12\.0/);
  assert.match(lines, /`npm ci` \(mm doctor --fix does it\)/);
  assert.match(lines, /✗ uv is missing\n {6}`brew install uv`\n/);
  assert.match(
    lines,
    /1 to fix, 1 to look at\. mm doctor --fix runs the fixes it can do itself\./,
  );
});

test('a flag it does not know stops it before anything runs', () => {
  const { user } = setup(1);
  const head = git(user, 'rev-parse', 'HEAD');
  const r = update(user, '--yess');
  assert.equal(r.status, 2);
  assert.match(r.stderr, /no option --yess/);
  assert.equal(git(user, 'rev-parse', 'HEAD'), head);
});
