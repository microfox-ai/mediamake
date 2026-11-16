// Tests for mm space (tools/space.mjs): two computers, each with its own home and workspace, sharing
// one bare repo, and a local server that records what MediaMake is told. Run: node --test tools/
import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { after, before, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { parseRepo } from './space.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const tmp = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'mm-space-test-')));
const remote = path.join(tmp, 'remote', 'me', 'my-space.git');

/** Every request the fake site got. */
const got = [];
let server;
let url;

before(async () => {
  fs.mkdirSync(remote, { recursive: true });
  assert.equal(spawnSync('git', ['init', '-q', '--bare', '-b', 'main', remote]).status, 0);
  server = http.createServer((req, res) => {
    let body = '';
    req.on('data', chunk => (body += chunk));
    req.on('end', () => {
      got.push({ method: req.method, path: req.url, auth: req.headers.authorization, body: body ? JSON.parse(body) : undefined });
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify(req.method === 'DELETE' ? { forgotten: { items: 2 } } : { ok: true }));
    });
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  url = `http://127.0.0.1:${server.address().port}`;
});
after(() => {
  server.close();
  fs.rmSync(tmp, { recursive: true, force: true });
});

/** A computer: its own home, config and workspace. */
const computer = name => {
  const home = path.join(tmp, name);
  const workspace = path.join(home, 'MediaMake');
  fs.mkdirSync(path.join(home, '.mediamake'), { recursive: true });
  const env = over => {
    const e = {
      ...process.env,
      HOME: home,
      USERPROFILE: home,
      MEDIAMAKE_CONFIG: path.join(home, '.mediamake', 'config.json'),
      MEDIAMAKE_WORKSPACE: workspace,
      MEDIAMAKE_API_URL: url,
      MEDIAMAKE_API_KEY: `key-${name}`,
      GIT_CONFIG_NOSYSTEM: '1',
      GIT_CONFIG_GLOBAL: path.join(home, '.gitconfig'),
      ...over,
    };
    for (const k of ['MEDIAMAKE_USAGE', 'CLAUDE_PROJECT_DIR']) if (!over || !(k in over)) delete e[k];
    return e;
  };
  /** Runs mm space without blocking this process, which is also the fake site. */
  const space = (args, over) =>
    new Promise(resolve => {
      const child = spawn(process.execPath, [path.join(HERE, 'space.mjs'), ...args], { env: env(over) });
      let out = '';
      child.stdout.on('data', d => (out += d));
      child.stderr.on('data', d => (out += d));
      child.on('close', status => resolve({ status, out }));
    });
  const dir = path.join(workspace, 'space');
  return {
    home,
    workspace,
    dir,
    space,
    write: (rel, text) => {
      fs.mkdirSync(path.dirname(path.join(dir, rel)), { recursive: true });
      fs.writeFileSync(path.join(dir, rel), text);
    },
    read: rel => fs.readFileSync(path.join(dir, rel), 'utf8'),
    claudeSkill: skill => path.join(home, '.claude', 'skills', skill),
  };
};
const skillMd = (name, body = 'Steps.', version = '0.1.0') => `---\nname: ${name}\ndescription: Makes ${name}. Use when asked.\nmetadata:\n  version: ${version}\n---\n\n${body}\n`;
const remoteFiles = () => spawnSync('git', ['ls-tree', '-r', '--name-only', 'main'], { cwd: remote, encoding: 'utf8' }).stdout.trim().split('\n');
const lastReport = () => got.filter(r => r.method === 'PUT' && r.path === '/api/space').at(-1);

const mac = computer('mac');
const pc = computer('pc');

test('parseRepo reads the ways a repo is typed', () => {
  assert.deepEqual(parseRepo('me/my-space'), { repo: 'me/my-space', github: true, url: 'https://github.com/me/my-space.git' });
  assert.equal(parseRepo('https://github.com/me/my-space.git').repo, 'me/my-space');
  assert.equal(parseRepo('git@github.com:me/my-space.git').url, 'git@github.com:me/my-space.git');
  assert.equal(parseRepo('me/my-space', { ssh: true }).url, 'git@github.com:me/my-space.git');
  const local = parseRepo(remote);
  assert.deepEqual([local.repo, local.github, local.url], ['me/my-space', false, remote]);
  assert.equal(parseRepo(''), null);
});

test('with no space, status says how to connect and the other commands refuse', async () => {
  const status = await mac.space([]);
  assert.equal(status.status, 0);
  assert.match(status.out, /No space on this computer yet/);
  const push = await mac.space(['push']);
  assert.equal(push.status, 1);
  assert.match(push.out, /mm space connect/);
});

test('connect gives a new repo its layout, pushes it and tells MediaMake', async () => {
  const r = await mac.space(['connect', remote]);
  assert.equal(r.status, 0, r.out);
  assert.deepEqual(remoteFiles().sort(), ['.gitignore', 'README.md', 'apps/.gitkeep', 'mcps/.gitkeep', 'skills/.gitkeep']);
  const config = JSON.parse(fs.readFileSync(path.join(mac.home, '.mediamake', 'config.json'), 'utf8'));
  assert.equal(config.space.repo, 'me/my-space');
  const report = lastReport();
  assert.equal(report.auth, 'Bearer key-mac');
  assert.equal(report.body.repo, 'me/my-space');
  assert.equal(report.body.pushed, true);
  assert.deepEqual(report.body.items, []);
  assert.match(report.body.device, /^[a-z0-9]+-[0-9a-f]{4}$/);
});

test('push is a dry run until --yes, then the other computer gets the skill linked into Claude', async () => {
  const made = await mac.space(['new', 'skill', 'make-my-intro']);
  assert.equal(made.status, 0, made.out);
  mac.write('skills/make-my-intro/SKILL.md', skillMd('make-my-intro'));
  mac.write('mcps/my-tools/item.json', JSON.stringify({ title: 'My tools', summary: 'Small helpers', version: '1.0.0', media: ['intro-sting'] }));
  mac.write('mcps/my-tools/index.mjs', 'export const x = 1;\n');

  const dry = await mac.space(['push']);
  assert.equal(dry.status, 0, dry.out);
  assert.match(dry.out, /Would push to me\/my-space/);
  assert.match(dry.out, /skills\/make-my-intro {2}1 new/);
  assert.match(dry.out, /A dry run/);
  assert.ok(!remoteFiles().includes('skills/make-my-intro/SKILL.md'));

  const sent = await mac.space(['push', '--yes', '-m', 'My intro skill']);
  assert.equal(sent.status, 0, sent.out);
  assert.ok(remoteFiles().includes('skills/make-my-intro/SKILL.md'));
  assert.equal(spawnSync('git', ['log', '-1', '--format=%s', 'main'], { cwd: remote, encoding: 'utf8' }).stdout.trim(), 'My intro skill');
  assert.deepEqual(
    lastReport().body.items.map(i => [i.kind, i.name, i.version, i.title]),
    [
      ['skill', 'make-my-intro', '0.1.0', 'Make my intro'],
      ['mcp', 'my-tools', '1.0.0', 'My tools'],
    ],
  );
  assert.equal(lastReport().body.items[1].media, 1);
  // nothing but names, versions, titles and summaries: no paths, no file contents
  assert.ok(!JSON.stringify(lastReport().body).includes(mac.home));

  const joined = await pc.space(['connect', remote]);
  assert.equal(joined.status, 0, joined.out);
  assert.match(joined.out, /1 skill linked into Claude/);
  assert.equal(fs.realpathSync(pc.claudeSkill('make-my-intro')), fs.realpathSync(path.join(pc.dir, 'skills', 'make-my-intro')));
  assert.ok(fs.lstatSync(path.join(pc.workspace, 'skills', 'make-my-intro')).isSymbolicLink());
  assert.equal(lastReport().auth, 'Bearer key-pc');

  const status = await pc.space(['status', '--json']);
  const state = JSON.parse(status.out);
  assert.equal(state.toPush, 0);
  assert.equal(state.items.find(i => i.name === 'make-my-intro').linked, true);
});

test('pull keeps what changed here on top of what the other computer pushed', async () => {
  pc.write('skills/make-my-intro/notes.md', 'From the pc.\n');
  assert.equal((await pc.space(['push', '--yes'])).status, 0);

  mac.write('skills/make-my-intro/extra.md', 'From the mac, not pushed yet.\n');
  const pulled = await mac.space(['pull']);
  assert.equal(pulled.status, 0, pulled.out);
  assert.match(pulled.out, /pulled 1 change from GitHub: skills\/make-my-intro/);
  assert.equal(mac.read('skills/make-my-intro/notes.md'), 'From the pc.\n');
  assert.equal(mac.read('skills/make-my-intro/extra.md'), 'From the mac, not pushed yet.\n');
  assert.equal(lastReport().body.pushed, false);

  const sent = await mac.space(['push', '--yes']);
  assert.equal(sent.status, 0, sent.out);
  assert.ok(remoteFiles().includes('skills/make-my-intro/extra.md'));
  // what was committed here before the pull went up as one commit on top of the pc's
  assert.equal(spawnSync('git', ['rev-list', '--count', 'main'], { cwd: remote, encoding: 'utf8' }).stdout.trim(), '4');
});

test('two computers changing the same file: the second is told, and nothing of it is lost', async () => {
  assert.equal((await pc.space(['pull'])).status, 0);
  mac.write('skills/make-my-intro/SKILL.md', skillMd('make-my-intro', 'The mac says this.'));
  assert.equal((await mac.space(['push', '--yes'])).status, 0);
  pc.write('skills/make-my-intro/SKILL.md', skillMd('make-my-intro', 'The pc says that.'));
  const refused = await pc.space(['push', '--yes']);
  assert.equal(refused.status, 1);
  assert.match(refused.out, /changed the same file: skills\/make-my-intro\/SKILL\.md/);
  assert.match(pc.read('skills/make-my-intro/SKILL.md'), /The pc says that\./);
  assert.ok(!fs.existsSync(path.join(pc.dir, '.git', 'rebase-merge')));
  // settle it by hand the way the message says, taking the pc's
  const git = (...args) => spawnSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@t.invalid', ...args], { cwd: pc.dir, encoding: 'utf8', env: { ...process.env, GIT_EDITOR: 'true' } });
  git('pull', '--rebase');
  pc.write('skills/make-my-intro/SKILL.md', skillMd('make-my-intro', 'The pc says that.', '0.2.0'));
  git('add', '-A');
  assert.equal(git('rebase', '--continue').status, 0);
  const sent = await pc.space(['push', '--yes']);
  assert.equal(sent.status, 0, sent.out);
  assert.equal(lastReport().body.items.find(i => i.name === 'make-my-intro').version, '0.2.0');
});

test('large media and keys never go up', async () => {
  assert.equal((await mac.space(['pull'])).status, 0);
  fs.writeFileSync(path.join(mac.dir, 'skills', 'make-my-intro', 'sting.wav'), Buffer.alloc(3 * 1024 * 1024));
  const big = await mac.space(['push', '--yes']);
  assert.equal(big.status, 1);
  assert.match(big.out, /sting\.wav is 3\.0 MB of media/);
  assert.match(big.out, /mm media ingest/);
  assert.ok(!remoteFiles().includes('skills/make-my-intro/sting.wav'));
  fs.rmSync(path.join(mac.dir, 'skills', 'make-my-intro', 'sting.wav'));

  mac.write('mcps/my-tools/config.json', `{ "key": "sk-${'a'.repeat(30)}" }\n`);
  const key = await mac.space(['push', '--yes']);
  assert.equal(key.status, 1);
  assert.match(key.out, /config\.json:1 looks like an API key or token/);
  const forced = await mac.space(['push', '--yes', '--force']);
  assert.equal(forced.status, 0, forced.out);
  assert.ok(remoteFiles().includes('mcps/my-tools/config.json'));
});

test('add moves a workspace skill into the space and keeps it loaded', async () => {
  const own = path.join(mac.workspace, 'skills', 'make-lyrics-video-like-mine');
  fs.mkdirSync(own, { recursive: true });
  fs.writeFileSync(path.join(own, 'SKILL.md'), skillMd('make-lyrics-video-like-mine'));
  const dry = await mac.space(['add', 'make-lyrics-video-like-mine']);
  assert.match(dry.out, /A dry run/);
  assert.ok(!fs.lstatSync(own).isSymbolicLink());
  const moved = await mac.space(['add', 'make-lyrics-video-like-mine', '--yes']);
  assert.equal(moved.status, 0, moved.out);
  assert.ok(fs.lstatSync(own).isSymbolicLink());
  assert.ok(fs.existsSync(path.join(mac.dir, 'skills', 'make-lyrics-video-like-mine', 'SKILL.md')));
  assert.equal(fs.realpathSync(mac.claudeSkill('make-lyrics-video-like-mine')), fs.realpathSync(path.join(mac.dir, 'skills', 'make-lyrics-video-like-mine')));
  assert.equal((await mac.space(['push', '--yes'])).status, 0);
});

test('a skill removed on one computer is unlinked on the other at its next pull', async () => {
  assert.equal((await pc.space(['pull'])).status, 0);
  assert.ok(fs.existsSync(pc.claudeSkill('make-lyrics-video-like-mine')));
  fs.rmSync(path.join(mac.dir, 'skills', 'make-lyrics-video-like-mine'), { recursive: true });
  assert.equal((await mac.space(['push', '--yes'])).status, 0);
  assert.equal(fs.lstatSync(mac.claudeSkill('make-lyrics-video-like-mine'), { throwIfNoEntry: false }), undefined);
  const pulled = await pc.space(['pull']);
  assert.match(pulled.out, /make-lyrics-video-like-mine is no longer in the space: unlinked/);
  assert.equal(fs.lstatSync(pc.claudeSkill('make-lyrics-video-like-mine'), { throwIfNoEntry: false }), undefined);
  assert.ok(fs.existsSync(pc.claudeSkill('make-my-intro')));
});

test('a skill folder of your own with the same name is never replaced', async () => {
  const own = path.join(pc.workspace, 'skills', 'make-clash');
  fs.mkdirSync(own, { recursive: true });
  fs.writeFileSync(path.join(own, 'SKILL.md'), skillMd('make-clash', 'Mine.'));
  mac.write('skills/make-clash/SKILL.md', skillMd('make-clash', 'The space.'));
  assert.equal((await mac.space(['push', '--yes'])).status, 0);
  const pulled = await pc.space(['pull']);
  assert.equal(pulled.status, 0, pulled.out);
  assert.match(pulled.out, /make-clash: .* is a folder of its own/);
  assert.match(fs.readFileSync(path.join(own, 'SKILL.md'), 'utf8'), /Mine\./);
});

test('nothing is told to MediaMake when usage reports are off or the computer is signed out', async () => {
  const before = got.length;
  const dry = await mac.space(['report', '--dry']);
  assert.equal(dry.status, 0);
  assert.match(dry.out, /Nothing was sent/);
  const off = await mac.space(['report'], { MEDIAMAKE_USAGE: 'off' });
  assert.equal(off.status, 1);
  assert.match(off.out, /usage reports are off/);
  if (process.platform !== 'darwin') {
    const out = await mac.space(['report'], { MEDIAMAKE_API_KEY: '' });
    assert.match(out.out, /isn't signed in/);
  }
  assert.equal((await mac.space(['pull'], { MEDIAMAKE_USAGE: 'off' })).status, 0);
  assert.equal(got.length, before);
});

test('disconnect unlinks the skills, keeps the folder and drops this computer from Mine', async () => {
  const dry = await pc.space(['disconnect']);
  assert.match(dry.out, /A dry run/);
  assert.ok(fs.existsSync(pc.claudeSkill('make-my-intro')));
  const done = await pc.space(['disconnect', '--yes']);
  assert.equal(done.status, 0, done.out);
  assert.equal(fs.lstatSync(pc.claudeSkill('make-my-intro'), { throwIfNoEntry: false }), undefined);
  assert.ok(fs.existsSync(path.join(pc.dir, 'skills', 'make-my-intro', 'SKILL.md')));
  assert.ok(fs.existsSync(path.join(pc.workspace, 'skills', 'make-clash', 'SKILL.md')));
  const dropped = got.at(-1);
  assert.equal(dropped.method, 'DELETE');
  assert.match(dropped.path, /^\/api\/space\?device=/);
  assert.match((await pc.space([])).out, /No space on this computer yet/);
});
