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
/** A stand-in for GitHub and its CLI: bare repos under one folder, with collaborators and invitations. */
const hub = path.join(tmp, 'github');
const bin = path.join(tmp, 'bin');
const FAKE_GH = String.raw`#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const root = process.env.FAKE_GH_ROOT;
const me = process.env.FAKE_GH_LOGIN;
const args = process.argv.slice(2);
const accessFile = repo => path.join(root, repo + '.access.json');
const access = repo => { try { return JSON.parse(fs.readFileSync(accessFile(repo), 'utf8')); } catch { return null; } };
const save = (repo, a) => fs.writeFileSync(accessFile(repo), JSON.stringify(a));
const repos = () => fs.readdirSync(root).flatMap(o => fs.statSync(path.join(root, o)).isDirectory() ? fs.readdirSync(path.join(root, o)).filter(n => n.endsWith('.access.json')).map(n => o + '/' + n.replace('.access.json', '')) : []);
const can = (repo, a = access(repo)) => a && (a.owner === me || a.collaborators.includes(me));
fs.appendFileSync(path.join(root, 'calls.log'), me + ' ' + args.join(' ') + '\n');
if (args[0] === '--version') process.exit(0);
if (args[0] === 'api' && args[1] === 'user') { if (!me) process.exit(1); console.log(me); process.exit(0); }
if (args[0] === 'repo' && args[1] === 'view') { if (!can(args[2])) process.exit(1); console.log(args.includes('isPrivate') ? 'true' : args[2]); process.exit(0); }
if (args[0] === 'repo' && args[1] === 'create') {
  const repo = args[2];
  fs.mkdirSync(path.join(root, path.dirname(repo)), { recursive: true });
  spawnSync('git', ['init', '-q', '--bare', '-b', 'main', path.join(root, repo + '.git')]);
  save(repo, { owner: me, collaborators: [], invitations: [] });
  process.exit(0);
}
if (args[0] === 'repo' && args[1] === 'clone') {
  if (!can(args[2])) { console.error('not found'); process.exit(1); }
  process.exit(spawnSync('git', ['clone', '-q', path.join(root, args[2] + '.git'), args[3]], { stdio: 'inherit' }).status);
}
if (args[0] === 'api') {
  const put = args.includes('PUT'), patch = args.includes('PATCH');
  const route = args.find(a => /^(repos|user)\//.test(a));
  let m;
  if ((m = route.match(/^repos\/(.+)\/collaborators\/([^/]+)$/)) && put) {
    const a = access(m[1]);
    if (!a || a.owner !== me) process.exit(1);
    if (!a.collaborators.includes(m[2]) && !a.invitations.some(i => i.login === m[2])) a.invitations.push({ login: m[2], permission: args.find(x => x.startsWith('permission=')).slice(11) });
    save(m[1], a);
    process.exit(0);
  }
  if ((m = route.match(/^repos\/(.+)\/collaborators$/))) { console.log((access(m[1])?.collaborators ?? []).join('\n')); process.exit(0); }
  if ((m = route.match(/^repos\/(.+)\/invitations$/))) { console.log((access(m[1])?.invitations ?? []).map(i => i.login).join('\n')); process.exit(0); }
  if (route === 'user/repository_invitations') { console.log(repos().filter(r => access(r).invitations.some(i => i.login === me)).map(r => Buffer.from(r).toString('hex') + ' ' + r).join('\n')); process.exit(0); }
  if ((m = route.match(/^user\/repository_invitations\/([0-9a-f]+)$/)) && patch) {
    const repo = Buffer.from(m[1], 'hex').toString();
    const a = access(repo);
    a.invitations = a.invitations.filter(i => i.login !== me);
    a.collaborators.push(me);
    save(repo, a);
    process.exit(0);
  }
}
process.exit(1);
`;
/** The projects the fake site knows, and the repo each one's space was given. */
const PROJECT = 'aaaaaaaaaaaaaaaaaaaaaaaa';
const projectRepos = {};
const people = [
  { key: 'key-ann', name: 'Ann', githubLogin: 'ann', role: 'owner' },
  { key: 'key-bob', name: 'Bob', githubLogin: 'bob', role: 'editor' },
  { key: 'key-cy', name: 'Cy', role: 'viewer' },
];
const spacesFor = auth => {
  const who = people.find(p => `Bearer ${p.key}` === auth);
  if (!who) return { mine: null, projects: [] };
  return {
    mine: null,
    projects: [
      {
        projectId: PROJECT,
        name: 'Anime Music Zone',
        role: who.role,
        people: people.length,
        space: projectRepos[PROJECT] ? { repo: projectRepos[PROJECT], devices: [], items: [] } : null,
        ...(who.role !== 'viewer' && { members: people.map(({ name, githubLogin, role }) => ({ name, ...(githubLogin && { githubLogin }), role, ...(name === who.name && { you: true }) })) }),
      },
    ],
  };
};

/** Every request the fake site got. */
const got = [];
let server;
let url;

before(async () => {
  fs.mkdirSync(remote, { recursive: true });
  fs.mkdirSync(hub, { recursive: true });
  fs.mkdirSync(bin, { recursive: true });
  fs.writeFileSync(path.join(bin, 'gh'), FAKE_GH, { mode: 0o755 });
  assert.equal(spawnSync('git', ['init', '-q', '--bare', '-b', 'main', remote]).status, 0);
  server = http.createServer((req, res) => {
    let body = '';
    req.on('data', chunk => (body += chunk));
    req.on('end', () => {
      const sent = { method: req.method, path: req.url, auth: req.headers.authorization, body: body ? JSON.parse(body) : undefined };
      got.push(sent);
      res.setHeader('Content-Type', 'application/json');
      if (req.method === 'GET') return res.end(JSON.stringify(spacesFor(sent.auth)));
      if (req.method === 'POST') projectRepos[sent.body.project] = sent.body.repo;
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
const computer = (name, login = '') => {
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
      PATH: `${bin}${path.delimiter}${process.env.PATH}`,
      FAKE_GH_ROOT: hub,
      FAKE_GH_LOGIN: login,
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
    projectDir: slug => path.join(workspace, 'spaces', slug),
    write: (rel, text, base = dir) => {
      fs.mkdirSync(path.dirname(path.join(base, rel)), { recursive: true });
      fs.writeFileSync(path.join(base, rel), text);
    },
    read: rel => fs.readFileSync(path.join(dir, rel), 'utf8'),
    claudeSkill: skill => path.join(home, '.claude', 'skills', skill),
  };
};
const skillMd = (name, body = 'Steps.', version = '0.1.0') => `---\nname: ${name}\ndescription: Makes ${name}. Use when asked.\nmetadata:\n  version: ${version}\n---\n\n${body}\n`;
const remoteFiles = () => spawnSync('git', ['ls-tree', '-r', '--name-only', 'main'], { cwd: remote, encoding: 'utf8' }).stdout.trim().split('\n');
const reports = () => got.filter(r => r.method === 'PUT' && r.path === '/api/space');
const lastReport = () => reports().at(-1);
const hubFiles = repo => spawnSync('git', ['ls-tree', '-r', '--name-only', 'main'], { cwd: path.join(hub, `${repo}.git`), encoding: 'utf8' }).stdout.trim().split('\n');

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
  assert.match(push.out, /mm space ensure/);
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
  assert.match(dry.out, /Would push to me\/my-space \(your space\)/);
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
  const [state] = JSON.parse(status.out).spaces;
  assert.equal(state.toPush, 0);
  assert.equal(state.items.find(i => i.name === 'make-my-intro').linked, true);
});

test('pull keeps what changed here on top of what the other computer pushed', async () => {
  pc.write('skills/make-my-intro/notes.md', 'From the pc.\n');
  assert.equal((await pc.space(['push', '--yes'])).status, 0);

  mac.write('skills/make-my-intro/extra.md', 'From the mac, not pushed yet.\n');
  const pulled = await mac.space(['pull']);
  assert.equal(pulled.status, 0, pulled.out);
  assert.match(pulled.out, /Your space: pulled 1 change from GitHub: skills\/make-my-intro/);
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
  const before = reports().length;
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
  assert.equal(reports().length, before);
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

const ann = computer('ann', 'ann');
const bob = computer('bob', 'bob');
const cy = computer('cy', '');
const zone = 'anime-music-zone';

test('the first item makes your own space by itself: a private repo on your GitHub', async () => {
  const made = await ann.space(['new', 'skill', 'make-zone-intro']);
  assert.equal(made.status, 0, made.out);
  assert.match(made.out, /made the private repo ann\/mediamake-space/);
  assert.match(made.out, /your space: only you/);
  ann.write('skills/make-zone-intro/SKILL.md', skillMd('make-zone-intro'));
  assert.ok(fs.existsSync(ann.claudeSkill('make-zone-intro')));
  assert.equal((await ann.space(['sync', '--yes'])).status, 0);
  assert.ok(hubFiles('ann/mediamake-space').includes('skills/make-zone-intro/SKILL.md'));
  // a second computer of the same person finds the repo instead of making another
  const again = await ann.space(['ensure']);
  assert.match(again.out, /your space is ann\/mediamake-space/);
  // and without the GitHub CLI it says what to do instead of failing halfway
  const none = await cy.space(['new', 'skill', 'make-x']);
  assert.equal(none.status, 1);
  assert.match(none.out, /needs gh signed in/);
});

test('share moves an item into the project\'s space: the repo is made, MediaMake is told, members are invited', async () => {
  const dry = await ann.space(['share', 'make-zone-intro', '--project=Anime Music Zone']);
  assert.equal(dry.status, 0, dry.out);
  assert.match(dry.out, /make the private repo mediamake-anime-music-zone/);
  assert.match(dry.out, /Bob \(can push\)/);
  assert.match(dry.out, /Cy can't be invited yet/);
  assert.match(dry.out, /A dry run/);
  assert.ok(!fs.existsSync(path.join(hub, 'ann', 'mediamake-anime-music-zone.git')));

  const done = await ann.space(['share', 'make-zone-intro', '--project=Anime Music Zone', '--yes']);
  assert.equal(done.status, 0, done.out);
  assert.equal(projectRepos[PROJECT], 'ann/mediamake-anime-music-zone');
  assert.match(done.out, /invited to Anime Music Zone's repo on GitHub: Bob/);
  assert.match(done.out, /Cy has no GitHub account linked to MediaMake/);
  assert.ok(hubFiles('ann/mediamake-anime-music-zone').includes('skills/make-zone-intro/SKILL.md'));
  assert.ok(!hubFiles('ann/mediamake-space').includes('skills/make-zone-intro/SKILL.md'));
  // still loaded on her computer, now from the project's space
  assert.equal(fs.realpathSync(ann.claudeSkill('make-zone-intro')), fs.realpathSync(path.join(ann.projectDir(zone), 'skills', 'make-zone-intro')));
  const projectReport = reports().filter(r => r.body.project === PROJECT).at(-1);
  assert.deepEqual([projectReport.body.repo, projectReport.body.items.map(i => i.name)], ['ann/mediamake-anime-music-zone', ['make-zone-intro']]);
  const access = JSON.parse(fs.readFileSync(path.join(hub, 'ann', 'mediamake-anime-music-zone.access.json'), 'utf8'));
  assert.deepEqual(access.invitations, [{ login: 'bob', permission: 'push' }]);
});

test('a member\'s sync accepts the invitation, clones the project\'s space and links its skills', async () => {
  const first = await bob.space(['sync']);
  assert.equal(first.status, 0, first.out);
  assert.match(first.out, /Anime Music Zone's space: ann\/mediamake-anime-music-zone/);
  assert.equal(fs.realpathSync(bob.claudeSkill('make-zone-intro')), fs.realpathSync(path.join(bob.projectDir(zone), 'skills', 'make-zone-intro')));
  assert.ok(!fs.existsSync(bob.dir), 'no space of his own was made for him');

  // what he changes reaches her with one command each
  bob.write('skills/make-zone-intro/notes.md', 'From Bob.\n', bob.projectDir(zone));
  const sent = await bob.space(['sync', '--yes']);
  assert.equal(sent.status, 0, sent.out);
  const got1 = await ann.space(['sync']);
  assert.equal(got1.status, 0, got1.out);
  assert.match(got1.out, /Project Anime Music Zone: pulled 1 change/);
  assert.equal(fs.readFileSync(path.join(ann.projectDir(zone), 'skills', 'make-zone-intro', 'notes.md'), 'utf8'), 'From Bob.\n');

  const status = await bob.space([]);
  assert.match(status.out, /Project Anime Music Zone: ann\/mediamake-anime-music-zone .*shared with everyone on the project/);
});

test('someone not invited yet is told, and nothing else stops', async () => {
  const r = await cy.space(['sync'], { FAKE_GH_LOGIN: 'cy' });
  assert.match(r.out, /Anime Music Zone: Could not clone ann\/mediamake-anime-music-zone/);
  assert.ok(!fs.existsSync(cy.projectDir(zone)));
});
