// Tests for mm cloud (tools/cloud.mjs) and a skill's own code in a space (space.mjs codeOutside).
// Run: node --test tools/
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';

const tmp = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'mm-cloud-test-')));
const home = path.join(tmp, 'home');
fs.mkdirSync(home, { recursive: true });
// before the modules load: they read the home, the config and the workspace when asked
process.env.HOME = home;
process.env.MEDIAMAKE_CONFIG = path.join(home, '.mediamake', 'config.json');
delete process.env.MEDIAMAKE_WORKSPACE;

const { browserWrapper, clonedSpaces, deliverables, setup } = await import('./cloud.mjs');
const { codeOutside } = await import('./space.mjs');

const sh = (cwd, ...args) => {
  const r = spawnSync('git', args, { cwd, encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr);
  return r.stdout.trim();
};
/** A clone of <repo> at <dir>, with that origin, and the given files. */
const clone = (dir, repo, files) => {
  fs.mkdirSync(dir, { recursive: true });
  sh(dir, 'init', '-q');
  sh(dir, 'remote', 'add', 'origin', `https://github.com/${repo}.git`);
  for (const [rel, body] of Object.entries(files)) {
    fs.mkdirSync(path.dirname(path.join(dir, rel)), { recursive: true });
    fs.writeFileSync(path.join(dir, rel), body);
  }
};

test('setup connects the space repos cloned beside the checkout and links their skills', () => {
  const sessions = path.join(tmp, 'session');
  const top = path.join(sessions, 'mediamake');
  fs.mkdirSync(top, { recursive: true });
  clone(path.join(sessions, 'mediamake-space'), 'me/mediamake-space', { 'skills/doomcat/SKILL.md': '---\nname: doomcat\ndescription: x\n---\n', 'skills/doomcat/engine/Cat.tsx': 'export const Cat = 1;\n' });
  clone(path.join(sessions, 'mediamake-anime'), 'owner/mediamake-anime', { 'skills/amv-like-x/SKILL.md': '---\nname: amv-like-x\ndescription: x\n---\n' });
  clone(path.join(sessions, 'mediamake-skill-grade'), 'owner/mediamake-skill-grade', { 'skills/grade/SKILL.md': '---\nname: grade\ndescription: x\n---\n' });
  clone(path.join(sessions, 'mediamake-store'), 'microfox-ai/mediamake-store', { 'skills/no/SKILL.md': 'x' });
  clone(path.join(sessions, 'extensions'), 'microfox-ai/extensions', { 'README.md': 'x' });

  const ws = path.join(home, 'MediaMake');
  const kinds = clonedSpaces(top, ws).map(s => [s.repo, s.kind, path.relative(ws, s.at)]);
  assert.deepEqual(kinds, [
    ['owner/mediamake-anime', 'project', 'spaces/anime'],
    ['owner/mediamake-skill-grade', 'linked', 'linked/grade'],
    ['me/mediamake-space', 'mine', 'space'],
  ]);

  const env = { ...process.env, CLAUDE_CODE_REMOTE: 'true' };
  const { missing, workspace } = setup({ env, top, install: false });
  assert.equal(workspace, ws);
  assert.ok(!missing.some(m => m.startsWith('your space')), missing.join('\n'));
  const config = JSON.parse(fs.readFileSync(process.env.MEDIAMAKE_CONFIG, 'utf8'));
  assert.equal(config.workspace, '~/MediaMake');
  assert.equal(config.space.repo, 'me/mediamake-space');
  // the skill's own code is reachable where @mediamake/skills/<skill>/… names it
  assert.ok(fs.existsSync(path.join(ws, 'skills', 'doomcat', 'engine', 'Cat.tsx')));
  for (const name of ['doomcat', 'amv-like-x', 'grade']) assert.ok(fs.existsSync(path.join(home, '.claude', 'skills', name, 'SKILL.md')), name);
  assert.ok(!fs.existsSync(path.join(home, '.claude', 'skills', 'no')));
  // again: nothing changes, nothing breaks
  setup({ env, top, install: false });
  assert.equal(fs.realpathSync(path.join(ws, 'space')), path.join(sessions, 'mediamake-space'));
});

test('the browser wrapper drops Remotion proxy flags and goes through the session proxy', () => {
  const bin = path.join(tmp, 'fake-chrome');
  fs.writeFileSync(bin, '#!/bin/sh\nfor a in "$@"; do echo "$a"; done\n', { mode: 0o755 });
  const wrapper = path.join(tmp, 'wrapper.sh');
  fs.writeFileSync(wrapper, browserWrapper(bin), { mode: 0o755 });
  const r = spawnSync(wrapper, ['--headless', '--proxy-server=direct://', '--no-proxy-server', '--proxy-bypass-list=*', 'about:blank'], {
    encoding: 'utf8',
    env: { ...process.env, HTTPS_PROXY: 'http://proxy:8080' },
  });
  assert.equal(r.status, 0, r.stderr);
  assert.deepEqual(r.stdout.trim().split('\n'), ['--headless', 'about:blank', '--proxy-server=http://proxy:8080']);
});

test('deliver takes the renders and the project code, not its analysis or big media', () => {
  const ws = path.join(tmp, 'deliver-ws');
  const files = {
    'out/p/p.mp4': 'v',
    'out/p/preview/p.mp4': 'v',
    'out/p/v2/p.mp4': 'old',
    'projects/p/video/index.tsx': 'x',
    'projects/p/input/brief.md': 'x',
    'projects/p/analysis/stems/vocals.wav': 'x',
    'projects/p/derived/big.mp4': 'x',
  };
  for (const [rel, body] of Object.entries(files)) {
    fs.mkdirSync(path.dirname(path.join(ws, rel)), { recursive: true });
    fs.writeFileSync(path.join(ws, rel), body);
  }
  fs.writeFileSync(path.join(ws, 'projects/p/input/huge.mov'), Buffer.alloc(3 * 1024 * 1024));
  const to = deliverables('p', { workspace: ws }).map(f => f.to).sort();
  assert.deepEqual(to, ['project/input/brief.md', 'project/video/index.tsx', 'renders/p.mp4', 'renders/preview/p.mp4']);
});

test('a skill that names code only on this computer is told to carry it', () => {
  const top = path.join(tmp, 'checkout');
  fs.mkdirSync(path.join(top, 'apps/studio/src/kit'), { recursive: true });
  fs.writeFileSync(path.join(top, 'apps/studio/src/kit/index.ts'), 'x');
  sh(top, 'init', '-q');
  sh(top, 'add', '-A');
  sh(top, '-c', 'user.name=t', '-c', 'user.email=t@t', 'commit', '-q', '-m', 'main');
  fs.mkdirSync(path.join(top, 'apps/studio/src/doomcat'), { recursive: true });
  fs.writeFileSync(path.join(top, 'apps/studio/src/doomcat/Cat.tsx'), 'x');
  const ws = path.join(tmp, 'code-ws');
  fs.mkdirSync(path.join(ws, 'extensions/glow'), { recursive: true });
  fs.writeFileSync(path.join(ws, 'extensions/glow/Glow.tsx'), 'x');
  const skill = path.join(tmp, 'skill');
  fs.mkdirSync(skill, { recursive: true });
  fs.writeFileSync(
    path.join(skill, 'SKILL.md'),
    'Use src/kit/index.ts and apps/studio/src/doomcat/Cat.tsx, the folder src/doomcat/, extensions/glow/Glow.tsx, src/<engine>/x.ts and @mediamake/engine/kit.\n',
  );
  const refs = codeOutside(skill, { top, workspace: ws }).map(c => c.ref);
  assert.deepEqual(refs, ['apps/studio/src/doomcat/Cat.tsx', 'apps/studio/src/doomcat/', 'extensions/glow/Glow.tsx']);
});

test('a space reports its files and README, and its README lists what is at its top', async () => {
  const { contentsBlock, spaceCode, withContents } = await import('./space.mjs');
  const dir = path.join(tmp, 'central');
  clone(dir, 'me/mediamake-space', {
    'skills/a/SKILL.md': '---\nname: a\ndescription: Makes the a videos.\n---\n',
    'README.md': '# my space\n\nWhat this space is for.\n\n## More\n\nMine.\n',
    'CLAUDE.md': '# Rules\n\nEvery production keeps the snake_case names and the dark grade. More after.\n',
    'prefs.md': '- a list first\n',
    'engine/Cat.tsx': 'x',
    'engine/lib/util.ts': 'x',
    'engine/README.md': '# engine\n\nShared Remotion parts.\n',
    '.gitignore': 'secret.txt\n',
    'secret.txt': 'x',
  });
  const code = spaceCode(dir);
  assert.deepEqual(code.files, ['.gitignore', 'CLAUDE.md', 'README.md', 'engine/Cat.tsx', 'engine/README.md', 'engine/lib/util.ts', 'prefs.md', 'skills/a/SKILL.md']);
  assert.match(code.readme, /^# my space/);

  const block = contentsBlock(dir);
  assert.equal(
    block.split('\n').filter(line => line.startsWith('- ')).join('\n'),
    [
      '- [`engine/`](engine): Shared Remotion parts (3 files)',
      '- [`CLAUDE.md`](CLAUDE.md): Every production keeps the snake_case names and the dark grade.',
      '- [`prefs.md`](prefs.md): the taste every production of this space follows',
      '- [`a`](skills/a): A. Makes the a videos.',
    ].join('\n'),
  );
  // put after the opening paragraph, then replaced in place: the rest of the README stays as written
  const once = withContents(code.readme, block);
  assert.match(once, /^# my space\n\nWhat this space is for\.\n\n<!-- mm:contents[\s\S]*<!-- \/mm:contents -->\n\n## More\n\nMine\.\n$/);
  assert.equal(withContents(once, block), once);
  assert.equal(withContents(once, block.replace('Shared', 'Common')).replace('Common', 'Shared'), once);
});
