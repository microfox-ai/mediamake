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
  const put = args.includes('PUT'), patch = args.includes('PATCH'), del = args.includes('DELETE');
  const route = args.find(a => /^(repos|user)\//.test(a)).replace(/\?.*$/, '');
  const detailed = args.some(a => a.includes('.permissions'));
  let m;
  if ((m = route.match(/^repos\/(.+)\/collaborators\/([^/]+)$/)) && put) {
    const a = access(m[1]);
    if (!a || a.owner !== me) process.exit(1);
    const permission = args.find(x => x.startsWith('permission=')).slice(11);
    const invitation = a.invitations.find(i => i.login === m[2]);
    if (a.collaborators.includes(m[2])) a.perms = { ...a.perms, [m[2]]: permission };
    else if (invitation) invitation.permission = permission;
    else a.invitations.push({ login: m[2], permission });
    save(m[1], a);
    process.exit(0);
  }
  if ((m = route.match(/^repos\/(.+)\/collaborators\/([^/]+)$/)) && del) {
    const a = access(m[1]);
    if (!a || a.owner !== me) process.exit(1);
    a.collaborators = a.collaborators.filter(l => l !== m[2]);
    save(m[1], a);
    process.exit(0);
  }
  if ((m = route.match(/^repos\/(.+)\/invitations\/([^/]+)$/)) && del) {
    const a = access(m[1]);
    if (!a || a.owner !== me) process.exit(1);
    a.invitations = a.invitations.filter(i => i.login !== m[2]);
    save(m[1], a);
    process.exit(0);
  }
  if ((m = route.match(/^repos\/(.+)\/collaborators$/))) {
    const a = access(m[1]);
    if (detailed && (!a || a.owner !== me)) process.exit(1);
    console.log((a?.collaborators ?? []).map(l => detailed ? l + ' ' + ((a.perms ?? {})[l] === 'push') : l).join('\n'));
    process.exit(0);
  }
  if ((m = route.match(/^repos\/(.+)\/invitations$/))) {
    const a = access(m[1]);
    console.log((a?.invitations ?? []).map(i => detailed ? i.login + ' ' + i.login + ' ' + (i.permission === 'push' ? 'write' : 'read') : i.login).join('\n'));
    process.exit(0);
  }
  if (route === 'user/repository_invitations') { console.log(repos().filter(r => access(r).invitations.some(i => i.login === me)).map(r => Buffer.from(r).toString('hex') + ' ' + r).join('\n')); process.exit(0); }
  if ((m = route.match(/^user\/repository_invitations\/([0-9a-f]+)$/)) && patch) {
    const repo = Buffer.from(m[1], 'hex').toString();
    const a = access(repo);
    a.perms = { ...a.perms, [me]: a.invitations.find(i => i.login === me).permission };
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
  { key: 'key-ann', name: 'Ann', githubLogin: 'ann', role: 'owner', email: 'ann@example.com' },
  { key: 'key-bob', name: 'Bob', githubLogin: 'bob', role: 'editor', email: 'bob@example.com' },
  { key: 'key-cy', name: 'Cy', role: 'viewer', email: 'cy@example.com' },
];
/** Members who are on no project. */
const outsiders = [{ key: 'key-eve', name: 'Eve', githubLogin: 'eve', email: 'eve@example.com' }];
const everyone = () => [...people, ...outsiders];
const whoIs = auth => everyone().find(p => `Bearer ${p.key}` === auth);
/** The linked items the fake site knows: { id, owner, kind, name, repo, projects: [ids], people: [{ email, editor }] }. */
const links = [];
const linkedFor = who =>
  links.flatMap(l => {
    const onProject = l.projects.includes(PROJECT) && people.includes(who);
    const named = l.people.find(p => p.email === who.email);
    const role = l.owner === who.name ? 'owner' : named?.editor ? 'editor' : named || onProject ? 'user' : null;
    if (!role) return [];
    const wanted = new Map();
    if (l.projects.includes(PROJECT)) for (const p of people) wanted.set(p.name, { name: p.name, ...(p.githubLogin && { githubLogin: p.githubLogin }), permission: 'pull' });
    for (const n of l.people) {
      const p = everyone().find(e => e.email === n.email);
      if (p) wanted.set(p.name, { name: p.name, ...(p.githubLogin && { githubLogin: p.githubLogin }), permission: n.editor ? 'push' : 'pull' });
    }
    wanted.delete(l.owner);
    return [
      {
        id: l.id,
        kind: l.kind,
        name: l.name,
        repo: l.repo,
        role,
        owner: l.owner,
        projects: l.projects.includes(PROJECT) && (role === 'owner' || onProject) ? [{ id: PROJECT, name: 'Anime Music Zone' }] : [],
        ...(named && { direct: true }),
        ...(role === 'owner' && { people: l.people.map(n => ({ name: everyone().find(e => e.email === n.email)?.name ?? n.email, email: n.email, editor: !!n.editor })), invites: [], collaborators: [...wanted.values()] }),
        space: null,
      },
    ];
  });
const spacesFor = auth => {
  const who = whoIs(auth);
  if (!who) return { mine: null, projects: [] };
  if (!people.includes(who)) return { mine: null, projects: [], linked: linkedFor(who) };
  return {
    mine: null,
    linked: linkedFor(who),
    projects: [
      {
        projectId: PROJECT,
        name: 'Anime Music Zone',
        role: who.role,
        people: people.length,
        owner: 'Ann',
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
      if (req.url === '/api/space/links') {
        const who = whoIs(sent.auth);
        if (req.method === 'POST') {
          let l = links.find(x => x.owner === who.name && x.kind === sent.body.kind && x.name === sent.body.name);
          if (!l) links.push((l = { id: String(links.length + 1).padStart(24, 'c'), owner: who.name, kind: sent.body.kind, name: sent.body.name, projects: [], people: [] }));
          l.repo = sent.body.repo;
          return res.end(JSON.stringify({ item: l.id, repo: l.repo }));
        }
        const l = links.find(x => x.id === sent.body.item);
        const { action, project, email, editor } = sent.body;
        if (action === 'link' && !l.projects.includes(project)) l.projects.push(project);
        if (action === 'unlink') l.projects = l.projects.filter(id => id !== project);
        if (action === 'add') l.people = [...l.people.filter(p => p.email !== email), { email, editor: !!editor }];
        if (action === 'remove') l.people = l.people.filter(p => p.email !== email);
        const linked = linkedFor(who);
        return res.end(JSON.stringify({ linked, item: linked.find(v => v.id === l.id) ?? null, ...(action === 'add' && { mailed: true }) }));
      }
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
      // a space's files are the media library's to show (mm media sync), which these tests don't run
      MEDIAMAKE_SPACE_FILES: 'off',
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
    linkedDir: slug => path.join(workspace, 'linked', slug),
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
  assert.match(dry.out, /README\.md {2}its list of what's here is brought up to date/);
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
  // the README says what is in the space, its list written by the push
  const readme = spawnSync('git', ['show', 'main:README.md'], { cwd: remote, encoding: 'utf8' }).stdout;
  assert.match(readme, /## What's here[\s\S]*### Skills\n\n- \[`make-my-intro`\]\(skills\/make-my-intro\): Make my intro[\s\S]*### MCPs\n\n- \[`my-tools`\]\(mcps\/my-tools\): My tools\. Small helpers/);
  assert.equal(spawnSync('git', ['status', '--porcelain'], { cwd: mac.dir, encoding: 'utf8' }).stdout, '');
  // what the Code tab shows: the repo's paths, its README and its last commits; never a path on this computer
  const { code, history, ahead } = lastReport().body;
  assert.ok(code.files.includes('skills/make-my-intro/SKILL.md') && code.files.includes('mcps/my-tools/index.mjs'));
  assert.match(code.readme, /What's here/);
  assert.equal(history[0].subject, 'My intro skill');
  assert.match(history[0].sha, /^[0-9a-f]{12}$/);
  assert.equal(ahead, 0);
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

test('join sets one project up from the line on its page, and says who invites when there is no invitation', async () => {
  const dan = computer('dan', 'dan');
  people.push({ key: 'key-dan', name: 'Dan', githubLogin: 'dan', role: 'editor' });
  const early = await dan.space(['join', PROJECT, '--no-media']);
  assert.equal(early.status, 1, early.out);
  assert.match(early.out, /dan on GitHub isn't invited to ann\/mediamake-anime-music-zone yet\. Ann, who made the repo, invites new members/);
  assert.ok(!fs.existsSync(dan.projectDir(zone)));

  // the line the app gives her after adding him invites him, and his line then works
  const sent = await ann.space(['invite', PROJECT]);
  assert.equal(sent.status, 0, sent.out);
  assert.match(sent.out, /invited to Anime Music Zone's repo on GitHub: Dan/);
  assert.match(sent.out, /mm space join aaaaaaaaaaaaaaaaaaaaaaaa/);
  assert.doesNotMatch((await bob.space(['invite', PROJECT])).out, /could not invite/, 'nobody is left to invite, and the repo\'s own account is never invited');
  assert.match((await cy.space(['invite', PROJECT])).out, /You are a viewer/);
  const done = await dan.space(['join', PROJECT, '--no-media']);
  assert.equal(done.status, 0, done.out);
  assert.match(done.out, /Anime Music Zone: you are an editor/);
  assert.equal(fs.realpathSync(dan.claudeSkill('make-zone-intro')), fs.realpathSync(path.join(dan.projectDir(zone), 'skills', 'make-zone-intro')));
  assert.equal((await dan.space(['join', 'Anime Music Zone', '--no-media'])).status, 0, 'running it again only pulls');
  people.pop();
});

test('someone not invited yet is told, and nothing else stops', async () => {
  const r = await cy.space(['sync'], { FAKE_GH_LOGIN: 'cy' });
  assert.match(r.out, /Anime Music Zone: Could not clone ann\/mediamake-anime-music-zone/);
  assert.ok(!fs.existsSync(cy.projectDir(zone)));
});

/* ---------- linked items: one copy in its owner's hands, used by the people of linked projects and named members ---------- */

const thumb = 'make-thumb-style';
const thumbRepo = 'ann/mediamake-skill-make-thumb-style';
const accessOf = repo => JSON.parse(fs.readFileSync(path.join(hub, `${repo}.access.json`), 'utf8'));
const eve = computer('eve', 'eve');

test('link gives an item its own repo, keeps it its owner\'s, and gives it to a project\'s people and a named editor', async () => {
  assert.equal((await ann.space(['new', 'skill', thumb])).status, 0);
  ann.write(`skills/${thumb}/SKILL.md`, skillMd(thumb));
  assert.equal((await ann.space(['sync', '--yes'])).status, 0);

  const nowhere = await ann.space(['link', thumb]);
  assert.equal(nowhere.status, 1);
  assert.match(nowhere.out, /Say who gets skill\/make-thumb-style/);
  assert.match((await cy.space(['link', 'x', '--project=Anime Music Zone'], { FAKE_GH_LOGIN: 'cy' })).out, /You are a viewer on Anime Music Zone/);

  const dry = await ann.space(['link', thumb, '--project=Anime Music Zone', '--editor=eve@example.com']);
  assert.equal(dry.status, 0, dry.out);
  assert.match(dry.out, /It stays yours, one copy with one history, and only you and the editors you name can change it/);
  assert.match(dry.out, /a private repo of its own on your GitHub, mediamake-skill-make-thumb-style/);
  assert.match(dry.out, /link it to Anime Music Zone: the 3 people on it get it/);
  assert.match(dry.out, /share it with eve@example\.com: can use it and change it/);
  assert.match(dry.out, /A dry run/);
  assert.ok(!fs.existsSync(path.join(hub, `${thumbRepo}.git`)));
  assert.equal(links.length, 0);

  const done = await ann.space(['link', thumb, '--project=Anime Music Zone', '--editor=eve@example.com', '--yes']);
  assert.equal(done.status, 0, done.out);
  assert.match(done.out, /made the private repo ann\/mediamake-skill-make-thumb-style/);
  assert.match(done.out, /is linked to Anime Music Zone/);
  assert.match(done.out, /is shared with eve@example\.com \(can change it\): they were told by mail/);
  assert.match(done.out, /invited on GitHub: Bob, Eve/);
  assert.match(done.out, /Cy has no GitHub account linked to MediaMake/);
  // one copy: in its own repo, gone from her space, and still loaded on her computer
  assert.deepEqual(hubFiles(thumbRepo).filter(f => f.startsWith('skills/')), [`skills/${thumb}/SKILL.md`]);
  assert.ok(!hubFiles('ann/mediamake-space').includes(`skills/${thumb}/SKILL.md`));
  assert.ok(!fs.existsSync(path.join(ann.dir, 'skills', thumb)));
  assert.equal(fs.realpathSync(ann.claudeSkill(thumb)), fs.realpathSync(path.join(ann.linkedDir(thumb), 'skills', thumb)));
  // everyone on the project may pull, only the named editor may push
  assert.deepEqual(accessOf(thumbRepo).invitations, [{ login: 'bob', permission: 'pull' }, { login: 'eve', permission: 'push' }]);
  assert.deepEqual([links[0].repo, links[0].projects, links[0].people], [thumbRepo, [PROJECT], [{ email: 'eve@example.com', editor: true }]]);
  const told = reports().filter(r => r.body.item === links[0].id).at(-1);
  assert.deepEqual([told.body.repo, told.body.items.map(i => i.name)], [thumbRepo, [thumb]]);

  const status = await ann.space([]);
  assert.match(status.out, /Your skill make-thumb-style: ann\/mediamake-skill-make-thumb-style .*\(yours, linked to Anime Music Zone and 1 person\)/);
  const where = await ann.space(['link', thumb]);
  assert.match(where.out, /skill\/make-thumb-style: yours, linked to Anime Music Zone and 1 person/);
  assert.match(where.out, /Eve <eve@example\.com>: can change it/);
});

test('a project member gets a linked item with their sync, and can use it but not change it', async () => {
  const got1 = await bob.space(['sync']);
  assert.equal(got1.status, 0, got1.out);
  assert.match(got1.out, /Ann's skill make-thumb-style: ann\/mediamake-skill-make-thumb-style .*\(from Ann, through Anime Music Zone; you can use it, not change it\)/);
  assert.equal(fs.realpathSync(bob.claudeSkill(thumb)), fs.realpathSync(path.join(bob.linkedDir(thumb), 'skills', thumb)));

  bob.write(`skills/${thumb}/SKILL.md`, skillMd(thumb, 'Bob changed it.'), bob.linkedDir(thumb));
  const sent = await bob.space(['sync', '--yes']);
  assert.equal(sent.status, 0, sent.out);
  assert.match(sent.out, /Ann's skill make-thumb-style: changed on this computer \(1 file\), and it stays here\. Only Ann and the editors they name can change it/);
  assert.doesNotMatch(spawnSync('git', ['show', `main:skills/${thumb}/SKILL.md`], { cwd: path.join(hub, `${thumbRepo}.git`), encoding: 'utf8' }).stdout, /Bob changed it/);
});

test('a named editor outside every project gets it, and what they change reaches its owner', async () => {
  const got1 = await eve.space(['sync']);
  assert.equal(got1.status, 0, got1.out);
  assert.match(got1.out, /Ann's skill make-thumb-style: .*\(from Ann, shared with you; you can change it\)/);
  assert.ok(fs.existsSync(eve.claudeSkill(thumb)));
  assert.ok(!fs.existsSync(eve.dir), 'no space of her own was made for her');

  eve.write(`skills/${thumb}/notes.md`, 'From Eve.\n', eve.linkedDir(thumb));
  const sent = await eve.space(['sync', '--yes']);
  assert.equal(sent.status, 0, sent.out);
  assert.match(sent.out, /pushed to ann\/mediamake-skill-make-thumb-style/);
  const back = await ann.space(['sync']);
  assert.equal(back.status, 0, back.out);
  assert.match(back.out, /Your skill make-thumb-style: pulled 1 change/);
  assert.equal(fs.readFileSync(path.join(ann.linkedDir(thumb), 'skills', thumb, 'notes.md'), 'utf8'), 'From Eve.\n');
});

test('join brings a project\'s linked items with its space', async () => {
  const fay = computer('fay', 'fay');
  people.push({ key: 'key-fay', name: 'Fay', githubLogin: 'fay', role: 'viewer', email: 'fay@example.com' });
  // her owner-side sync invites the new member to the project's repo and to the linked item's
  const invited = await ann.space(['sync']);
  assert.match(invited.out, /skill\/make-thumb-style: invited on GitHub: Fay/);
  const done = await fay.space(['join', PROJECT, '--no-media']);
  assert.equal(done.status, 0, done.out);
  assert.match(done.out, /Ann's skill make-thumb-style: ann\/mediamake-skill-make-thumb-style/);
  assert.ok(fs.existsSync(fay.claudeSkill(thumb)));
  assert.ok(fs.existsSync(fay.claudeSkill('make-zone-intro')));
  people.pop();
  // off the project, she is taken off the linked item's repo at the owner's next sync, and loses it at hers
  const removed = await ann.space(['sync']);
  assert.match(removed.out, /skill\/make-thumb-style: taken off its repo on GitHub: fay/);
  people.push({ key: 'key-fay', name: 'Fay', githubLogin: 'fay', role: 'viewer', email: 'fay@example.com' });
  links[0].projects = [];
  const lost = await fay.space(['sync']);
  assert.match(lost.out, /The skill make-thumb-style \(Ann's\) is no longer shared with you: removed from this computer/);
  assert.ok(!fs.existsSync(fay.linkedDir(thumb)));
  assert.ok(!fs.existsSync(fay.claudeSkill(thumb)));
  links[0].projects = [PROJECT];
  people.pop();
});

test('unlink takes it from that project\'s people only, and an editor can be made a user again', async () => {
  const dry = await ann.space(['unlink', thumb, '--project=Anime Music Zone']);
  assert.match(dry.out, /from Anime Music Zone: the people who have it only through that project lose it/);
  assert.match(dry.out, /It stays yours, with its history\. A dry run/);
  assert.deepEqual(links[0].projects, [PROJECT]);

  const done = await ann.space(['unlink', thumb, '--project=Anime Music Zone', '--yes']);
  assert.equal(done.status, 0, done.out);
  assert.match(done.out, /skill\/make-thumb-style is unlinked from Anime Music Zone/);
  assert.match(done.out, /taken off its repo on GitHub: bob/);
  assert.deepEqual(accessOf(thumbRepo).collaborators, ['eve']);

  // Bob changed his copy, so the folder stays; Claude no longer loads it
  const lost = await bob.space(['sync']);
  assert.equal(lost.status, 0, lost.out);
  assert.match(lost.out, /The skill make-thumb-style \(Ann's\) is no longer shared with you: unlinked from Claude\. .* stays, because you changed it here/);
  assert.ok(!fs.existsSync(bob.claudeSkill(thumb)));
  assert.ok(fs.existsSync(bob.linkedDir(thumb)));
  // the named editor still has it, and so does its owner
  assert.equal((await eve.space(['sync'])).status, 0);
  assert.ok(fs.existsSync(eve.claudeSkill(thumb)));
  assert.ok(fs.existsSync(ann.claudeSkill(thumb)));

  const demoted = await ann.space(['link', thumb, '--to=eve@example.com', '--yes']);
  assert.equal(demoted.status, 0, demoted.out);
  assert.equal(accessOf(thumbRepo).perms.eve, 'pull');
  assert.match((await eve.space([])).out, /from Ann, shared with you; you can use it, not change it/);

  const gone = await ann.space(['unlink', thumb, '--from=eve@example.com', '--yes']);
  assert.equal(gone.status, 0, gone.out);
  assert.deepEqual(accessOf(thumbRepo).collaborators, []);
  assert.match((await ann.space(['link', thumb])).out, /yours, linked to nobody yet/);
});
