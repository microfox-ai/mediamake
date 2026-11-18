// Tests for your own skills in tools/skills.mjs (fork into the workspace, publish as a PR, tidy) on a
// throwaway checkout with a bare origin, a fake HOME and a workspace of its own. Run: node --test tools/
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { after, test } from 'node:test';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const tmp = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'mm-skills-test-')));
after(() => fs.rmSync(tmp, { recursive: true, force: true }));

const home = path.join(tmp, 'home');
const ws = path.join(tmp, 'workspace');
const own = path.join(ws, 'skills');
const users = path.join(home, '.claude', 'skills');
const ENV = {
  ...process.env,
  HOME: home,
  MEDIAMAKE_WORKSPACE: ws,
  GIT_CONFIG_NOSYSTEM: '1',
  GIT_CONFIG_GLOBAL: path.join(tmp, 'gitconfig'),
  GIT_TERMINAL_PROMPT: '0',
  GIT_AUTHOR_NAME: 'Test',
  GIT_AUTHOR_EMAIL: 'test@example.com',
  GIT_COMMITTER_NAME: 'Test',
  GIT_COMMITTER_EMAIL: 'test@example.com',
  // gh signed out, so publish gives the compare link instead of opening a real PR
  GH_CONFIG_DIR: path.join(tmp, 'gh'),
};
for (const k of ['GIT_DIR', 'GIT_WORK_TREE', 'GH_TOKEN', 'GITHUB_TOKEN', 'MEDIAMAKE_CONFIG']) delete ENV[k];
fs.writeFileSync(ENV.GIT_CONFIG_GLOBAL, '[init]\n\tdefaultBranch = main\n[commit]\n\tgpgsign = false\n');

const git = (cwd, ...a) => {
  const r = spawnSync('git', a, { cwd, encoding: 'utf8', env: ENV });
  assert.equal(r.status, 0, `git ${a.join(' ')}: ${r.stderr}`);
  return r.stdout.trim();
};
const write = (file, text) => {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, text);
};

const BASE = `---
name: make-demo
description: Makes a demo video from a song. Use when the user asks for a demo. ${'New user feedback goes in your notes (mm notes add), never in this file.'}
---

# make-demo

Cut on the beat.

## Where it runs

| Step | Needs | A person's yes | Safe to repeat | Without it |
|---|---|---|---|---|
| Cut and render | \`render\` | no | yes | runs anywhere |
| Upload | \`mcp:browse-hack\`, \`browser:youtube\` | no | no | a to-do: upload the release from a device signed in to the channel |

## Feedback log

This log is shared. New lessons go in your notes:

\`\`\`bash
mm notes add make-demo "<what the user said> → <the rule>"
mm notes make-demo
\`\`\`

- 2026-10-24 · first one.
`;

// GitHub, and the user's checkout of it with the real skills.mjs and upstream.mjs
const origin = path.join(tmp, 'origin.git');
const repo = path.join(tmp, 'repo');
fs.mkdirSync(origin);
git(origin, 'init', '--quiet', '--bare');
git(tmp, 'clone', '--quiet', origin, repo);
git(repo, 'checkout', '--quiet', '-B', 'main');
for (const f of ['skills.mjs', 'upstream.mjs', 'places.mjs', 'places.json']) write(path.join(repo, 'tools', f), fs.readFileSync(path.join(HERE, f)));
write(path.join(repo, '.agents', 'skills', 'make-demo', 'SKILL.md'), BASE);
write(path.join(repo, '.agents', 'skills', 'make-demo', 'refs', 'cuts.md'), 'Cuts.\n');
fs.mkdirSync(path.join(repo, '.claude', 'skills'), { recursive: true });
fs.symlinkSync('../../.agents/skills/make-demo', path.join(repo, '.claude', 'skills', 'make-demo'));
// skills.json is built, never committed
write(path.join(repo, '.gitignore'), '/skills.json\n');

const skills = (...a) => {
  const r = spawnSync(process.execPath, [path.join(repo, 'tools', 'skills.mjs'), ...a], { cwd: repo, encoding: 'utf8', env: ENV });
  return { code: r.status, out: `${r.stdout}${r.stderr}` };
};
const ok = (...a) => {
  const r = skills(...a);
  assert.equal(r.code, 0, `skills.mjs ${a.join(' ')}:\n${r.out}`);
  return r.out;
};

ok('index');
git(repo, 'add', '.');
git(repo, 'commit', '--quiet', '-m', 'skills');
git(repo, 'push', '--quiet', '-u', 'origin', 'main');

/** The checkout as git sees it: HEAD, status, worktrees and branches. */
const checkout = () => [git(repo, 'rev-parse', 'HEAD'), git(repo, 'status', '--porcelain'), git(repo, 'worktree', 'list', '--porcelain'), git(repo, 'branch', '--list')].join('\n');

test('fork makes a variant yours, in the workspace and linked, without changing a file git tracks', () => {
  const before = checkout();
  const out = ok('fork', 'make-demo', 'make-demo-like-x');
  assert.match(out, /yours, outside the repo/);
  const dir = path.join(own, 'make-demo-like-x');
  const text = fs.readFileSync(path.join(dir, 'SKILL.md'), 'utf8');
  assert.match(text, /^name: make-demo-like-x$/m);
  assert.match(text, /^ {2}variant-of: make-demo$/m);
  assert.match(text, /^ {2}forked-from: make-demo@[0-9a-f]{12}$/m);
  assert.match(text, /mm notes add make-demo-like-x "/, 'its notes are its own');
  assert.ok(fs.existsSync(path.join(dir, 'refs', 'cuts.md')));
  assert.equal(fs.realpathSync(path.join(users, 'make-demo-like-x')), fs.realpathSync(dir), 'every session loads it');
  assert.equal(checkout(), before, 'SKILLS.md, skills.json and the skills folders are as they were');
  ok('check');
  const listed = JSON.parse(ok('list', '--json')).find(s => s.name === 'make-demo-like-x');
  assert.equal(listed.own, true);
  assert.equal(listed.linked, true);
  assert.equal(listed.variantOf, 'make-demo');
  assert.match(skills('fork', 'make-demo', 'make-demo-like-x').out, /exists already/);
});

test('publish: a dry run changes nothing; --yes pushes a branch with the skill linked, and never touches the checkout', () => {
  const before = checkout();
  assert.match(ok('publish', 'make-demo-like-x'), /can be published[\s\S]*A dry run/);
  assert.equal(checkout(), before);
  // the rule: nothing is published without the production made with it
  assert.match(ok('publish', 'make-demo-like-x'), /We publish nothing we don't use\. --yes needs the finished production/);
  assert.match(skills('publish', 'make-demo-like-x', '--yes').out, /We publish nothing we don't use\. Name the finished production/);
  assert.match(skills('publish', 'make-demo-like-x', '--yes', '--made-url=https://youtu.be/x').out, /--made-url needs --made/);
  assert.match(skills('publish', 'make-demo-like-x', '--yes', '--made=X', '--made-url=soon').out, /--made-url is the production's link/);
  assert.equal(checkout(), before);
  const out = ok('publish', 'make-demo-like-x', '--yes', '--made=The X music video', '--made-url=https://youtu.be/x');
  assert.match(out, /It enters as Beta[\s\S]*--proof "The X music video" --url https:\/\/youtu\.be\/x/);
  const [, branch] = out.match(/on (skill\/make-demo-like-x-\d{8}-\d{4}) /) ?? [];
  assert.ok(branch, out);
  assert.equal(checkout(), before, 'same commit, clean, no worktree or local branch left');
  git(repo, 'fetch', '--quiet', 'origin', branch);
  const at = `origin/${branch}`;
  assert.equal(git(repo, 'show', `${at}:.agents/skills/make-demo-like-x/SKILL.md`), fs.readFileSync(path.join(own, 'make-demo-like-x', 'SKILL.md'), 'utf8').trimEnd());
  assert.equal(git(repo, 'show', `${at}:.agents/skills/make-demo-like-x/refs/cuts.md`), 'Cuts.');
  assert.equal(git(repo, 'ls-tree', at, '.claude/skills/make-demo-like-x').split(/\s/)[0], '120000', 'linked from .claude/skills');
  assert.equal(git(repo, 'ls-tree', '--name-only', at, 'skills.json', 'SKILLS.md'), '', 'the registry is built, not committed');
  assert.equal(git(repo, 'log', '-1', '--format=%s', at), 'skill(make-demo-like-x): a variant of make-demo');
  assert.match(skills('publish', 'make-demo', '--yes').out, /in the repo already/);
});

test('tidy: drops your copy once the repo has it, links what is not loaded, clears dead links and keeps loose folders as yours', () => {
  // the PR merged and the user pulled
  const [branch] = git(repo, 'branch', '-r', '--format=%(refname:short)').split('\n').filter(b => b.startsWith('origin/skill/'));
  git(repo, 'merge', '--quiet', '--ff-only', branch);
  // a skill of yours that isn't linked, a link to one that is gone, and a loose folder in .claude/skills
  write(path.join(own, 'make-mine', 'SKILL.md'), '---\nname: make-mine\ndescription: Mine.\n---\n\n# make-mine\n');
  fs.symlinkSync(path.join(own, 'make-gone'), path.join(users, 'make-gone'));
  write(path.join(repo, '.claude', 'skills', 'make-loose', 'SKILL.md'), '---\nname: make-loose\ndescription: Loose.\n---\n\n# make-loose\n');
  assert.match(ok('list'), /the repo has it now/);
  const plan = ok('tidy');
  assert.match(plan, /drop your copy of make-demo-like-x/);
  assert.match(plan, /link .*make-mine/);
  assert.match(plan, /remove .*make-gone/);
  assert.match(plan, /keep make-loose as yours/);
  assert.ok(fs.existsSync(path.join(own, 'make-demo-like-x')), 'a dry run changes nothing');
  ok('tidy', '--yes');
  assert.ok(!fs.existsSync(path.join(own, 'make-demo-like-x')));
  assert.ok(!fs.lstatSync(path.join(users, 'make-demo-like-x'), { throwIfNoEntry: false }), 'sessions load the repo copy now');
  assert.equal(fs.realpathSync(path.join(users, 'make-mine')), fs.realpathSync(path.join(own, 'make-mine')));
  assert.ok(!fs.lstatSync(path.join(users, 'make-gone'), { throwIfNoEntry: false }));
  assert.ok(!fs.existsSync(path.join(repo, '.claude', 'skills', 'make-loose')));
  assert.equal(fs.realpathSync(path.join(users, 'make-loose')), fs.realpathSync(path.join(own, 'make-loose')));
  assert.equal(git(repo, 'status', '--porcelain'), '');
  assert.match(ok('tidy'), /nothing to tidy/);
});

test('a copy that differs from the repo is kept, and fork --repo still makes one in the checkout', () => {
  write(path.join(own, 'make-demo-like-x', 'SKILL.md'), fs.readFileSync(path.join(repo, '.agents', 'skills', 'make-demo-like-x', 'SKILL.md'), 'utf8') + '\nMine now.\n');
  assert.match(ok('tidy'), /your copy differs/);
  assert.ok(fs.existsSync(path.join(own, 'make-demo-like-x')));
  fs.rmSync(path.join(own, 'make-demo-like-x'), { recursive: true });
  ok('fork', 'make-demo', 'make-demo-like-y', '--repo');
  assert.ok(fs.existsSync(path.join(repo, '.agents', 'skills', 'make-demo-like-y', 'SKILL.md')));
  assert.ok(fs.lstatSync(path.join(repo, '.claude', 'skills', 'make-demo-like-y')).isSymbolicLink());
  assert.ok(JSON.parse(fs.readFileSync(path.join(repo, 'skills.json'), 'utf8')).skills.some(s => s.name === 'make-demo-like-y'), 'the local registry lists it');
  assert.ok(!fs.existsSync(path.join(own, 'make-demo-like-y')));
});

test('publish onto a base that still commits the registry updates it there', () => {
  // an older main, from before skills.json was built: it is committed there
  const old = path.join(tmp, 'old');
  git(repo, 'worktree', 'add', '--quiet', '-b', 'old', old, 'origin/main');
  ok('index');
  fs.copyFileSync(path.join(repo, 'skills.json'), path.join(old, 'skills.json'));
  git(old, 'add', '-f', 'skills.json');
  git(old, 'commit', '--quiet', '-m', 'the registry, committed');
  git(old, 'push', '--quiet', 'origin', 'old');
  git(repo, 'worktree', 'remove', '--force', old);
  git(repo, 'branch', '-D', 'old');
  write(path.join(own, 'make-demo-like-z', 'SKILL.md'), '---\nname: make-demo-like-z\ndescription: Z.\nmetadata:\n  variant-of: make-demo\n---\n\n# make-demo-like-z\n\n## Where it runs\n\n| Step | Needs | A person\'s yes | Safe to repeat | Without it |\n|---|---|---|---|---|\n| Make it | nothing | no | yes | - |\n');
  const out = ok('publish', 'make-demo-like-z', '--yes', '--made=The Z short', '--base=old');
  const [, branch] = out.match(/on (skill\/make-demo-like-z-\S+) /) ?? [];
  git(repo, 'fetch', '--quiet', 'origin', branch);
  assert.ok(JSON.parse(git(repo, 'show', `origin/${branch}:skills.json`)).skills.some(s => s.name === 'make-demo-like-z'));
});

test("a skill's README.md gives its store listing: description, tags, headshot and the video it opens with", async () => {
  const { readmeListing, folderSize } = await import('./skills.mjs');
  const dir = path.join(tmp, 'listing-skill');
  fs.mkdirSync(path.join(dir, 'shots'), { recursive: true });
  assert.equal(readmeListing(dir), null);
  fs.writeFileSync(path.join(dir, 'shots', 'head.jpg'), 'x');
  fs.writeFileSync(
    path.join(dir, 'README.md'),
    '---\ndescription: Makes an intro for your channel.\ntags: Intro, YouTube, lyric video\nheadshot: shots/head.jpg\n---\n\nhttps://youtu.be/dQw4w9WgXcQ\n\n# Make my intro\n\n## How to use\n',
  );
  assert.deepEqual(readmeListing(dir), {
    description: 'Makes an intro for your channel.',
    tags: ['intro', 'youtube', 'lyric-video'],
    headshot: 'shots/head.jpg',
    video: 'https://youtu.be/dQw4w9WgXcQ',
  });
  assert.deepEqual(folderSize(dir), { bytes: fs.statSync(path.join(dir, 'README.md')).size + 1, files: 2 });
  // no headshot named: the video's thumbnail; a file outside the folder is never one
  fs.writeFileSync(path.join(dir, 'README.md'), '---\nheadshot: ../../etc/passwd\n---\n\n# Make my intro\n\nhttps://www.youtube.com/watch?v=dQw4w9WgXcQ\n');
  assert.deepEqual(readmeListing(dir), { headshot: 'https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg', video: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' });
});

test("folderPaths lists a folder's files, and codeUsed the engine and setup a SKILL.md names", async () => {
  const { folderPaths, codeUsed } = await import('./skills.mjs');
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'mm-skill-code-'));
  const write = (file, text = 'x') => (fs.mkdirSync(path.dirname(path.join(root, file)), { recursive: true }), fs.writeFileSync(path.join(root, file), text));
  write('apps/studio/engine.json', JSON.stringify({ names: { amv: 'src/amv', catalog: 'catalog', remix: 'src/remix' } }));
  write('apps/studio/src/amv/index.ts');
  write('apps/studio/src/amv/fx/glitch.tsx');
  write('apps/studio/src/remix/index.ts');
  write('apps/studio/catalog/a.json');
  write('apps/studio/scripts/amv.ts');
  write('skill/SKILL.md', 'Builds with src/amv and `mm amv` (scripts/amv.ts, scripts/gone.ts). The catalog page lists it. See myscripts/amv.ts.');
  write('skill/shots/a.png');
  write('skill/.hidden');
  assert.deepEqual(folderPaths(path.join(root, 'skill')), ['SKILL.md', 'shots/a.png']);
  assert.deepEqual(codeUsed(path.join(root, 'skill'), root), [
    { kind: 'engine', label: 'src/amv', path: 'apps/studio/src/amv', files: ['index.ts', 'fx/glitch.tsx'] },
    { kind: 'setup', label: 'scripts/amv.ts', path: 'apps/studio/scripts/amv.ts' },
  ]);
  fs.rmSync(root, { recursive: true, force: true });
});
