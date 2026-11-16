// Tests for `mm items` (tools/items.mjs): what the account opens and installing it with the sign-in
// on the computer, against a local server that plays the MediaMake site and a script that plays
// Claude Code's `claude mcp`. Run: node --test tools/
import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { after, before, beforeEach, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { compareVersions, mcpConfig } from './items.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const tmp = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'mm-items-test-')));
const home = path.join(tmp, 'home');
const config = path.join(home, '.mediamake', 'config.json');
const claudeLog = path.join(tmp, 'claude.log');
const claudeState = path.join(tmp, 'claude-servers.json');
const claudeBin = path.join(tmp, 'claude');
const KEY = 'test-key';

/** Every request the fake site got. */
const got = [];
let server;
let url;
/** Packages by file name, and what the site says of them. */
const files = new Map();
let live = { 'mcp/browse-hack': '0.17.0', 'mcp/projectsync': '0.3.0' };

const sh = (cmd, args, cwd) => {
  const r = spawnSync(cmd, args, { cwd, encoding: 'utf8' });
  assert.equal(r.status, 0, `${cmd} ${args.join(' ')}: ${r.stderr}`);
};

/** A released package as `npm run catalog -- release` packs it: the .mcpb, and INSTALL.md when it has one. */
function pack(slug, version, manifest, guide) {
  const dir = path.join(tmp, 'build', `${slug}-${version}`);
  fs.mkdirSync(path.join(dir, 'bundle', 'server'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'bundle', 'manifest.json'), JSON.stringify({ name: slug, version, ...manifest }));
  fs.writeFileSync(path.join(dir, 'bundle', 'server', 'index.js'), `// ${slug} ${version}\n`);
  fs.mkdirSync(path.join(dir, 'package'));
  sh('zip', ['-q', '-r', path.join(dir, 'package', `${slug}.mcpb`), '.'], path.join(dir, 'bundle'));
  if (guide) fs.writeFileSync(path.join(dir, 'package', 'INSTALL.md'), guide);
  const archive = path.join(dir, `${slug}-${version}.tar.gz`);
  sh('tar', ['-czf', archive, '-C', path.join(dir, 'package'), '.']);
  files.set(path.basename(archive), archive);
  return { downloadUrl: `${url}/files/${path.basename(archive)}`, sha256: crypto.createHash('sha256').update(fs.readFileSync(archive)).digest('hex') };
}

const CATALOG = [
  { id: 'mcp/browse-hack', kind: 'mcp', title: 'Browse Hack', tier: 'pro', access: 'granted' },
  { id: 'mcp/projectsync', kind: 'mcp', title: 'ProjectSync', tier: 'pro', access: 'granted' },
  // nothing of these installs by itself: a hosted connector (no package), someone else's, a skill, a failed one
  { id: 'mcp/mm-use', kind: 'mcp', title: 'mm-use', tier: 'public', access: 'open' },
  { id: 'mcp/elevenlabs', kind: 'mcp', title: 'ElevenLabs', tier: 'public', access: 'open', madeBy: { name: 'ElevenLabs' } },
  { id: 'skill/pack-brand-kit', kind: 'skill', title: 'Pack brand kit', tier: 'public', access: 'open' },
  { id: 'mcp/broken', kind: 'mcp', title: 'Broken', tier: 'public', access: 'open', health: 'failed' },
  { id: 'app/vault-app', kind: 'app', title: 'Cohort App', tier: 'cohort', access: 'locked' },
];

let plans;

before(async () => {
  fs.mkdirSync(path.dirname(config), { recursive: true });
  // `claude mcp get|add|remove`, keeping its servers in a file and every call in a log
  fs.writeFileSync(
    claudeBin,
    `#!/usr/bin/env node
const fs = require('fs');
const args = process.argv.slice(2);
fs.appendFileSync(${JSON.stringify(claudeLog)}, JSON.stringify(args) + '\\n');
let servers = {};
try { servers = JSON.parse(fs.readFileSync(${JSON.stringify(claudeState)}, 'utf8')); } catch {}
const save = () => fs.writeFileSync(${JSON.stringify(claudeState)}, JSON.stringify(servers));
if (args[1] === 'get') process.exit(servers[args[2]] ? 0 : 1);
if (args[1] === 'remove') { const had = !!servers[args[2]]; delete servers[args[2]]; save(); process.exit(had ? 0 : 1); }
if (args[1] === 'add') { servers[args[4]] = args.slice(5); save(); process.exit(0); }
process.exit(1);
`,
    { mode: 0o755 },
  );
  server = http.createServer((req, res) => {
    let body = '';
    req.on('data', chunk => (body += chunk));
    req.on('end', () => {
      const u = new URL(req.url, 'http://x');
      const auth = req.headers.authorization;
      got.push({ method: req.method, path: u.pathname, query: Object.fromEntries(u.searchParams), auth, body: body ? JSON.parse(body) : undefined });
      const json = (status, data) => {
        res.writeHead(status, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(data));
      };
      if (u.pathname.startsWith('/files/')) {
        const file = files.get(u.pathname.slice('/files/'.length));
        if (!file) return json(404, { error: 'no such file' });
        res.writeHead(200);
        return res.end(fs.readFileSync(file));
      }
      const signedIn = auth === `Bearer ${KEY}`;
      if (u.pathname === '/api/me') return signedIn ? json(200, { clientId: 'c1', isAdmin: false, tier: 'pro', name: 'Ana', email: 'ana@example.com' }) : json(401, { error: 'Sign in first' });
      if (u.pathname === '/api/catalog') return json(200, { signedIn, items: signedIn ? CATALOG : CATALOG.filter(i => i.access === 'open') });
      if (u.pathname === '/api/catalog/versions') {
        const ids = u.searchParams.get('items').split(',');
        return json(200, { items: ids.filter(id => live[id]).map(id => ({ id, version: live[id] })), missing: ids.filter(id => !live[id]) });
      }
      if (u.pathname === '/api/catalog/install') {
        const plan = signedIn && plans[u.searchParams.get('item')];
        return plan ? json(200, plan) : json(404, { error: 'Not found' });
      }
      if (u.pathname === '/api/catalog/update-token') return signedIn ? json(200, { token: body && JSON.parse(body).token ? JSON.parse(body).token : 'mmu_new', items: JSON.parse(body).items }) : json(401, { error: 'no' });
      json(404, { error: 'no such route' });
    });
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  url = `http://127.0.0.1:${server.address().port}`;

  const extension = path.join(tmp, 'build', 'extension');
  fs.mkdirSync(extension, { recursive: true });
  fs.writeFileSync(path.join(extension, 'manifest.json'), JSON.stringify({ name: 'Browse Hack', version: '2.4.0' }));
  sh('zip', ['-q', '-r', path.join(tmp, 'build', 'browse-hack-chrome.zip'), '.'], extension);
  files.set('browse-hack-chrome.zip', path.join(tmp, 'build', 'browse-hack-chrome.zip'));

  const browseHack = pack(
    'browse-hack',
    '0.17.0',
    {
      server: { mcp_config: { command: 'node', args: ['${__dirname}/server/index.js'], env: { BROWSE_HACK_PORT: '${user_config.port}', BROWSE_HACK_EXTENSION_ID: '${user_config.extension_id}' } } },
      user_config: { port: { default: 17892 }, extension_id: { default: '' } },
    },
    '# Browse Hack: setup\n',
  );
  const projectsync = pack('projectsync', '0.3.0', {
    server: { mcp_config: { command: 'node', args: ['${__dirname}/server/index.js'], env: { MEDIAMAKE_API_URL: '${user_config.api_url}', MEDIAMAKE_API_KEY: '${user_config.api_key}' } } },
    user_config: { api_key: { title: 'MediaMake API key', sensitive: true, required: true }, api_url: { default: 'https://mediamake.microfox.app', required: true } },
  });
  plans = {
    'mcp/browse-hack': {
      ok: true,
      itemId: 'mcp/browse-hack',
      linksExpireAt: '2099-01-01T00:00:00Z',
      choices: [],
      steps: [
        { type: 'github-release', repo: 'microfox-ai/extensions', name: 'Browse Hack Chrome extension', asset: 'browse-hack-chrome.zip', kind: 'chrome-extension', downloadUrl: `${url}/files/browse-hack-chrome.zip`, requiredBy: ['mcp/browse-hack'] },
        { type: 'item', id: 'mcp/browse-hack', kind: 'mcp', slug: 'browse-hack', title: 'Browse Hack', version: '0.17.0', method: 'mcpb', entry: 'browse-hack.mcpb', ...browseHack, requiredBy: [] },
      ],
    },
    'mcp/projectsync': {
      ok: true,
      itemId: 'mcp/projectsync',
      linksExpireAt: '2099-01-01T00:00:00Z',
      choices: [],
      steps: [{ type: 'item', id: 'mcp/projectsync', kind: 'mcp', slug: 'projectsync', title: 'ProjectSync', version: '0.3.0', method: 'mcpb', entry: 'projectsync.mcpb', ...projectsync, requiredBy: [] }],
    },
  };
});
after(() => {
  server.close();
  fs.rmSync(tmp, { recursive: true, force: true });
});
beforeEach(() => {
  got.length = 0;
  fs.rmSync(home, { recursive: true, force: true });
  fs.mkdirSync(path.dirname(config), { recursive: true });
  fs.rmSync(claudeLog, { force: true });
  fs.rmSync(claudeState, { force: true });
  live = { 'mcp/browse-hack': '0.17.0', 'mcp/projectsync': '0.3.0' };
});

const env = (over = {}) => {
  const e = { ...process.env, HOME: home, USERPROFILE: home, MEDIAMAKE_CONFIG: config, MEDIAMAKE_API_URL: url, MEDIAMAKE_API_KEY: KEY, MEDIAMAKE_CLAUDE_BIN: claudeBin, MEDIAMAKE_EXTENSIONS: path.join(home, 'Extensions'), ...over };
  for (const [k, v] of Object.entries(e)) if (v === undefined) delete e[k];
  return e;
};
/** The test's own server answers only while this process isn't blocked, so never spawnSync. */
const items = (args, over) =>
  new Promise(resolve => {
    const child = spawn(process.execPath, [path.join(HERE, 'items.mjs'), ...args], { env: env(over) });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', chunk => (stdout += chunk));
    child.stderr.on('data', chunk => (stderr += chunk));
    child.on('close', status => resolve({ status, stdout, stderr }));
  });
const claudeCalls = () => (fs.existsSync(claudeLog) ? fs.readFileSync(claudeLog, 'utf8').trim().split('\n').map(line => JSON.parse(line)) : []);
const readJson = file => JSON.parse(fs.readFileSync(file, 'utf8'));

test('versions compare by their numbers', () => {
  assert.ok(compareVersions('1.9.2', '1.10.0') < 0);
  assert.ok(compareVersions('v0.17.0', '0.17.0') === 0);
  assert.ok(compareVersions('2.0', '1.99.99') > 0);
});

test("an .mcpb's settings are answered from the computer: its folder, defaults, the site and the signed-in key", () => {
  const manifest = {
    server: { mcp_config: { command: 'node', args: ['${__dirname}/server/index.js'], env: { MEDIAMAKE_API_URL: '${user_config.api_url}', MEDIAMAKE_API_KEY: '${user_config.api_key}', PORT: '${user_config.port}', EMPTY: '${user_config.none}', OTHER: '${user_config.other}' } } },
    user_config: { api_key: { required: true }, api_url: { default: 'https://mediamake.microfox.app' }, port: { default: 17892 }, none: { default: '' }, other: { title: 'Other thing', required: true } },
  };
  const filled = mcpConfig(manifest, '/x/mcp/p', { url: 'https://my.site', key: 'k' });
  assert.deepEqual(filled.args, ['/x/mcp/p/server/index.js']);
  assert.deepEqual(filled.env, { MEDIAMAKE_API_URL: 'https://my.site', MEDIAMAKE_API_KEY: 'k', PORT: '17892' });
  assert.deepEqual(filled.missing, ['Other thing']);
});

test('not signed in: says how to sign in, asks for no site address, and calls nothing', async () => {
  const r = await items(['--json'], { MEDIAMAKE_API_KEY: undefined });
  assert.equal(r.status, 2);
  const out = JSON.parse(r.stdout);
  assert.equal(out.signedIn, false);
  assert.match(out.error, /mm login/);
  assert.equal(got.length, 0);
});

test('a key the site no longer knows is said plainly', async () => {
  const r = await items([], { MEDIAMAKE_API_KEY: 'old-key' });
  assert.equal(r.status, 1);
  assert.match(r.stderr, /doesn't know this sign-in/);
});

test('mm items: the account, its tier and what it opens that installs by itself', async () => {
  const r = await items(['--json']);
  assert.equal(r.status, 0, r.stderr);
  const out = JSON.parse(r.stdout);
  assert.deepEqual(out.account, { name: 'Ana', email: 'ana@example.com', tier: 'pro', isAdmin: false });
  assert.deepEqual(out.items.map(i => [i.id, i.state, i.version]), [['mcp/browse-hack', 'missing', '0.17.0'], ['mcp/projectsync', 'missing', '0.3.0']]);
  assert.deepEqual(out.locked, [{ id: 'app/vault-app', title: 'Cohort App', tier: 'cohort' }]);
  assert.ok(got.every(req => req.auth === `Bearer ${KEY}`));
  assert.ok(!r.stdout.includes(KEY));
  const text = await items([]);
  assert.match(text.stdout, /Signed in: Ana · Pro/);
  assert.match(text.stdout, /2 to install or update: mm items install --yes/);
});

test('mm items install without --yes only lists, and asks the site for no plan', async () => {
  const r = await items(['install']);
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /Would install for Ana · Pro:\n {2}mcp\/browse-hack\n {2}mcp\/projectsync/);
  assert.ok(!got.some(req => req.path === '/api/catalog/install'));
  assert.ok(!fs.existsSync(path.join(home, '.mediamake', 'installed.json')));
});

test('mm items install --yes installs everything the account opens, with no install code', async () => {
  const r = await items(['install', '--yes', '--json']);
  assert.equal(r.status, 0, r.stderr + r.stdout);
  const out = JSON.parse(r.stdout);
  assert.deepEqual(out.failed, []);
  assert.deepEqual(out.installed.map(i => [i.id, i.version]), [['mcp/browse-hack', '0.17.0'], ['mcp/projectsync', '0.3.0']]);

  // the servers are unpacked where install.md puts them, and the bundle is kept for Claude Desktop
  const mcp = path.join(home, '.mediamake', 'mcp');
  assert.equal(readJson(path.join(mcp, 'browse-hack', 'manifest.json')).version, '0.17.0');
  assert.ok(fs.existsSync(path.join(mcp, 'browse-hack', 'server', 'index.js')));
  assert.ok(fs.existsSync(path.join(mcp, 'browse-hack', 'INSTALL.md')));
  assert.ok(fs.existsSync(path.join(mcp, 'projectsync.mcpb')));
  // the extension is unpacked; loading it is the one thing left to the person
  assert.equal(readJson(path.join(home, 'Extensions', 'browse-hack-chrome', 'manifest.json')).version, '2.4.0');
  const person = out.left.filter(entry => entry.needsPerson);
  assert.equal(person.length, 1);
  assert.match(person[0].what, /Load unpacked/);
  assert.ok(out.left.some(entry => /INSTALL\.md/.test(entry.what) && entry.item === 'mcp/browse-hack'));

  // added to Claude Code for every project; ProjectSync gets the site and the signed-in key
  const adds = claudeCalls().filter(args => args[1] === 'add');
  assert.deepEqual(adds[0], ['mcp', 'add', '--scope', 'user', 'browse-hack', '-e', 'BROWSE_HACK_PORT=17892', '--', 'node', path.join(mcp, 'browse-hack', 'server', 'index.js')]);
  assert.deepEqual(adds[1], ['mcp', 'add', '--scope', 'user', 'projectsync', '-e', `MEDIAMAKE_API_URL=${url}`, '-e', `MEDIAMAKE_API_KEY=${KEY}`, '--', 'node', path.join(mcp, 'projectsync', 'server', 'index.js')]);

  // recorded, with the update token, so updates need nothing either
  const installed = readJson(path.join(home, '.mediamake', 'installed.json')).items;
  assert.equal(installed['mcp/browse-hack'].version, '0.17.0');
  assert.equal(installed['mcp/projectsync'].path, '~/.mediamake/mcp/projectsync');
  const token = got.find(req => req.path === '/api/catalog/update-token');
  assert.deepEqual(token.body, { items: ['mcp/browse-hack', 'mcp/projectsync'] });
  assert.deepEqual(readJson(config), { url, updateToken: 'mmu_new' });
  assert.equal(fs.statSync(config).mode & 0o777, 0o600);
  // the key is in no file of ours and no output
  assert.ok(!r.stdout.includes(KEY));
  assert.ok(!fs.readFileSync(path.join(home, '.mediamake', 'installed.json'), 'utf8').includes(KEY));
  assert.ok(!fs.existsSync(path.join(home, '.mediamake', 'installs', 'browse-hack')));

  // a second run has nothing to do
  got.length = 0;
  const again = await items(['install', '--yes']);
  assert.match(again.stdout, /installed and up to date/);
  assert.ok(!got.some(req => req.path === '/api/catalog/install'));
});

test('an update replaces the files and keeps the registration, the config and the token', async () => {
  await items(['install', '--yes']);
  fs.writeFileSync(config, JSON.stringify({ ...readJson(config), library: { root: '/lib' } }));
  const next = pack('projectsync', '0.4.0', {
    server: { mcp_config: { command: 'node', args: ['${__dirname}/server/index.js'], env: { MEDIAMAKE_API_URL: '${user_config.api_url}', MEDIAMAKE_API_KEY: '${user_config.api_key}' } } },
    user_config: { api_key: { required: true }, api_url: { default: 'https://mediamake.microfox.app' } },
  });
  live['mcp/projectsync'] = '0.4.0';
  const original = { ...plans['mcp/projectsync'].steps[0] };
  Object.assign(plans['mcp/projectsync'].steps[0], { version: '0.4.0', ...next });
  fs.rmSync(claudeLog, { force: true });
  got.length = 0;

  const status = JSON.parse((await items(['--json'])).stdout);
  assert.deepEqual(status.items.map(i => [i.id, i.state]), [['mcp/browse-hack', 'installed'], ['mcp/projectsync', 'behind']]);
  const r = await items(['install', '--yes']);
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /ProjectSync updated to 0\.4\.0/);
  assert.equal(readJson(path.join(home, '.mediamake', 'mcp', 'projectsync', 'manifest.json')).version, '0.4.0');
  assert.ok(!claudeCalls().some(args => args[1] === 'add' || args[1] === 'remove'));
  assert.deepEqual(got.filter(req => req.path === '/api/catalog/install').map(req => req.query.item), ['mcp/projectsync']);
  assert.equal(got.find(req => req.path === '/api/catalog/update-token').body.token, 'mmu_new');
  assert.deepEqual(readJson(config).library, { root: '/lib' });
  // back to how the other tests expect it
  Object.assign(plans['mcp/projectsync'].steps[0], original);
});

test("a working server that didn't come from MediaMake is kept, and an extension already there is left alone", async () => {
  fs.writeFileSync(claudeState, JSON.stringify({ 'browse-hack': ['node', '/their/checkout/mcp/dist/index.js'] }));
  fs.mkdirSync(path.join(home, 'Extensions', 'browse-hack-chrome'), { recursive: true });
  fs.writeFileSync(path.join(home, 'Extensions', 'browse-hack-chrome', 'manifest.json'), JSON.stringify({ version: '2.3.0' }));
  const r = await items(['install', 'mcp/browse-hack', '--yes', '--json']);
  assert.equal(r.status, 0, r.stderr);
  const out = JSON.parse(r.stdout);
  assert.deepEqual(out.installed, []);
  assert.ok(out.done.some(line => /didn't come from MediaMake; kept/.test(line)));
  assert.ok(out.done.some(line => /already in .*version 2\.3\.0/.test(line)));
  assert.ok(!claudeCalls().some(args => args[1] === 'add' || args[1] === 'remove'));
  assert.equal(readJson(path.join(home, 'Extensions', 'browse-hack-chrome', 'manifest.json')).version, '2.3.0');
  assert.ok(!fs.existsSync(path.join(home, '.mediamake', 'mcp', 'browse-hack')));
});

test("a package that doesn't match its SHA-256 installs nothing, and an item the account can't open says so", async () => {
  const good = plans['mcp/projectsync'].steps[0].sha256;
  plans['mcp/projectsync'].steps[0].sha256 = 'f'.repeat(64);
  const r = await items(['install', 'mcp/projectsync', 'app/vault-app', '--yes', '--json']);
  plans['mcp/projectsync'].steps[0].sha256 = good;
  assert.equal(r.status, 1);
  const out = JSON.parse(r.stdout);
  assert.match(out.failed.find(f => f.item === 'mcp/projectsync').error, /SHA-256/);
  assert.match(out.failed.find(f => f.item === 'app/vault-app').error, /membership doesn't open it/);
  assert.ok(!fs.existsSync(path.join(home, '.mediamake', 'mcp', 'projectsync')));
  assert.ok(!fs.existsSync(path.join(home, '.mediamake', 'installed.json')));
  assert.equal(claudeCalls().filter(args => args[1] === 'add').length, 0);
});

test('without Claude Code on the computer the server is unpacked and the bundle is handed to Claude Desktop', async () => {
  const r = await items(['install', 'mcp/projectsync', '--yes', '--json'], { MEDIAMAKE_CLAUDE_BIN: '' });
  assert.equal(r.status, 0, r.stderr);
  const out = JSON.parse(r.stdout);
  assert.ok(fs.existsSync(path.join(home, '.mediamake', 'mcp', 'projectsync', 'manifest.json')));
  assert.match(out.left[0].what, /In Claude Desktop, open .*projectsync\.mcpb and click Install/);
  assert.deepEqual(out.installed.map(i => i.id), ['mcp/projectsync']);
});
