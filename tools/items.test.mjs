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
import { compareVersions, desktopClaude, localCommand, mcpConfig } from './items.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const tmp = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'mm-items-test-')));
const home = path.join(tmp, 'home');
const config = path.join(home, '.mediamake', 'config.json');
const claudeLog = path.join(tmp, 'claude.log');
const claudeState = path.join(tmp, 'claude-servers.json');
const WIN = process.platform === 'win32';
const claudeScript = path.join(tmp, 'claude');
/** On Windows a .cmd starts the script, as npm's claude.cmd does: items.mjs runs it through the shell. */
const claudeBin = WIN ? path.join(tmp, 'claude.cmd') : claudeScript;
/** Windows' own tar (bsdtar: zip and .tar.gz, C:\ paths); Git Bash's GNU tar reads C: as a host. */
const TAR = WIN ? path.join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'tar.exe') : 'tar';
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
const zipDir = (zip, dir) => (WIN ? sh(TAR, ['--format', 'zip', '-cf', zip, '.'], dir) : sh('zip', ['-q', '-r', zip, '.'], dir));

/** A released package as `npm run catalog -- release` packs it: the .mcpb, and INSTALL.md when it has one. */
function pack(slug, version, manifest, guide) {
  const dir = path.join(tmp, 'build', `${slug}-${version}`);
  fs.mkdirSync(path.join(dir, 'bundle', 'server'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'bundle', 'manifest.json'), JSON.stringify({ name: slug, version, ...manifest }));
  fs.writeFileSync(path.join(dir, 'bundle', 'server', 'index.js'), `// ${slug} ${version}\n`);
  fs.mkdirSync(path.join(dir, 'package'));
  zipDir(path.join(dir, 'package', `${slug}.mcpb`), path.join(dir, 'bundle'));
  if (guide) fs.writeFileSync(path.join(dir, 'package', 'INSTALL.md'), guide);
  const archive = path.join(dir, `${slug}-${version}.tar.gz`);
  sh(TAR, ['-czf', archive, '-C', path.join(dir, 'package'), '.']);
  files.set(path.basename(archive), archive);
  return { downloadUrl: `${url}/files/${path.basename(archive)}`, sha256: crypto.createHash('sha256').update(fs.readFileSync(archive)).digest('hex') };
}

const CATALOG = [
  { id: 'mcp/browse-hack', kind: 'mcp', title: 'Browse Hack', tier: 'pro', access: 'granted' },
  { id: 'mcp/projectsync', kind: 'mcp', title: 'ProjectSync', tier: 'pro', access: 'granted' },
  // MediaMake's hosted connector: no package, added to Claude Code by its address
  { id: 'mcp/mm-use', kind: 'mcp', title: 'mm-use', tier: 'public', access: 'open' },
  // nothing of these installs by itself: someone else's, a skill, a failed one
  { id: 'mcp/elevenlabs', kind: 'mcp', title: 'ElevenLabs', tier: 'public', access: 'open', madeBy: { name: 'ElevenLabs' } },
  { id: 'skill/pack-brand-kit', kind: 'skill', title: 'Pack brand kit', tier: 'public', access: 'open' },
  { id: 'mcp/broken', kind: 'mcp', title: 'Broken', tier: 'public', access: 'open', health: 'failed' },
  { id: 'app/vault-app', kind: 'app', title: 'Cohort App', tier: 'cohort', access: 'locked' },
];

let plans;

before(async () => {
  fs.mkdirSync(path.dirname(config), { recursive: true });
  // `claude mcp get|add|remove`, keeping its servers in a file and every call in a log. Like Claude
  // Code, a session in a folder gets its local server first, then the user's: user servers are kept by
  // name, local ones as "local:<folder>:<name>".
  fs.writeFileSync(
    claudeScript,
    `#!/usr/bin/env node
const fs = require('fs');
const args = process.argv.slice(2);
fs.appendFileSync(${JSON.stringify(claudeLog)}, JSON.stringify(args) + '\\n');
let servers = {};
try { servers = JSON.parse(fs.readFileSync(${JSON.stringify(claudeState)}, 'utf8')); } catch {}
const save = () => fs.writeFileSync(${JSON.stringify(claudeState)}, JSON.stringify(servers));
const cwd = process.cwd();
const keyOf = name => (args.includes('--scope') && args[args.indexOf('--scope') + 1] === 'local' ? 'local:' + cwd + ':' + name : name);
if (args[1] === 'get') {
  const name = args[2];
  const local = servers['local:' + cwd + ':' + name];
  const [scope, it] = local ? ['Local config (private to you in this project)', local] : servers[name] ? ['User config (available in all your projects)', servers[name]] : [];
  if (!it) { console.log('No MCP server named "' + name + '".'); process.exit(1); }
  const url = it.find(a => /^https?:/.test(a));
  console.log(name + ':\\n  Scope: ' + scope + '\\n' + (url ? '  Type: http\\n  URL: ' + url : '  Type: stdio\\n  Command: ' + it.join(' ')));
  process.exit(0);
}
if (args[1] === 'remove') { const key = keyOf(args[2]); const had = !!servers[key]; delete servers[key]; save(); process.exit(had ? 0 : 1); }
if (args[1] === 'add') { const rest = args.slice(2); let i = 0; while (rest[i] && rest[i].startsWith('--')) i += 2; servers[keyOf(rest[i])] = rest.slice(i + 1); save(); process.exit(0); }
process.exit(1);
`,
    { mode: 0o755 },
  );
  if (WIN) fs.writeFileSync(claudeBin, `@"${process.execPath}" "${claudeScript}" %*\r\n`);
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
  zipDir(path.join(tmp, 'build', 'browse-hack-chrome.zip'), extension);
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
    'mcp/mm-use': {
      ok: true,
      itemId: 'mcp/mm-use',
      choices: [],
      steps: [
        {
          type: 'source',
          id: 'mcp/mm-use',
          kind: 'mcp',
          slug: 'mm-use',
          title: 'mm-use',
          source: { type: 'mcp-server', name: 'mm-use', remote: { url: 'https://mediamake.microfox.app/mcp/use' } },
          requiredBy: [],
        },
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
  // MCP servers someone else makes, run on the computer (node stands in for uvx and npx, which a test
  // machine may not have)
  const theirs = (slug, title, local, more = {}) => ({
    ok: true,
    itemId: `mcp/${slug}`,
    choices: [],
    steps: [{ type: 'source', id: `mcp/${slug}`, kind: 'mcp', slug, title, madeBy: { name: 'Someone Else' }, source: { type: 'mcp-server', name: slug, local, guide: `https://example.com/${slug}#readme`, ...more }, requiredBy: [] }],
  });
  plans['mcp/blender'] = theirs('blender', 'Blender', { command: 'node', args: ['blender-server.js'] }, { setup: ['Install its add-on.', 'Turn it on in Blender.'] });
  plans['mcp/gemini'] = theirs('gemini', 'Gemini', {
    command: 'node',
    args: ['gemini-server.js'],
    env: [
      { name: 'GEMINI_API_KEY', secret: true, required: true, getAt: 'https://aistudio.google.com/apikey' },
      { name: 'GEMINI_OUTPUT_DIR', required: false },
    ],
  });
  plans['mcp/nothere'] = theirs('nothere', 'Not Here', { command: 'no-such-tool-mm-test', args: ['mcp'] });
  // a command of its own, downloaded per system into a folder of its installer's, off the PATH
  plans['mcp/figcraft'] = theirs(
    'figcraft',
    'Figcraft',
    { command: 'figcraft-cli-mm-test', args: ['mcp'], install: ['On a Mac: the zip, into ~/.local/bin.', 'On Windows: the .msi.'], find: ['%MM_TEST_APPS%/FigCraft'] },
    { setup: ['Open the app to edit by hand.'] },
  );
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
  const e = { ...process.env, HOME: home, USERPROFILE: home, MEDIAMAKE_CONFIG: config, MEDIAMAKE_API_URL: url, MEDIAMAKE_API_KEY: KEY, MEDIAMAKE_CLAUDE_BIN: claudeBin, MEDIAMAKE_EXTENSIONS: path.join(home, 'Extensions'), GEMINI_API_KEY: undefined, GEMINI_OUTPUT_DIR: undefined, ...over };
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
  // the hosted connector it opens, not in Claude Code yet
  assert.deepEqual(out.connectors.map(c => [c.id, c.name, c.state]), [['mcp/mm-use', 'mm-use', 'missing']]);
  assert.ok(got.every(req => req.auth === `Bearer ${KEY}`));
  assert.ok(!r.stdout.includes(KEY));
  const text = await items([]);
  assert.match(text.stdout, /Signed in: Ana · Pro/);
  assert.match(text.stdout, /MediaMake connectors:\n {2}○ mcp\/mm-use +not in Claude Code/);
  assert.match(text.stdout, /3 to install or update: mm items install --yes/);
});

test('mm items install without --yes only lists, and asks the site for no plan', async () => {
  const r = await items(['install']);
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /Would install for Ana · Pro:\n {2}mcp\/browse-hack\n {2}mcp\/projectsync\n {2}mcp\/mm-use/);
  assert.ok(!got.some(req => req.path === '/api/catalog/install'));
  assert.ok(!fs.existsSync(path.join(home, '.mediamake', 'installed.json')));
});

test('mm items install --yes installs everything the account opens, with nothing pasted', async () => {
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
  assert.equal(person.length, 2);
  assert.match(person[0].what, /Load unpacked/);
  // the hosted connector is added by its address; signing in is the person's one step
  assert.equal(person[1].item, 'mcp/mm-use');
  assert.match(person[1].what, /run \/mcp, pick mm-use, sign in to MediaMake .* click Allow/);
  assert.ok(out.left.some(entry => /INSTALL\.md/.test(entry.what) && entry.item === 'mcp/browse-hack'));

  // added to Claude Code for every project; ProjectSync gets the site and the signed-in key (the
  // manifest's `${__dirname}/server/index.js`, which Node reads on Windows too)
  const adds = claudeCalls().filter(args => args[1] === 'add');
  assert.deepEqual(adds[0], ['mcp', 'add', '--scope', 'user', 'browse-hack', '-e', 'BROWSE_HACK_PORT=17892', '--', 'node', `${path.join(mcp, 'browse-hack')}/server/index.js`]);
  assert.deepEqual(adds[1], ['mcp', 'add', '--scope', 'user', 'projectsync', '-e', `MEDIAMAKE_API_URL=${url}`, '-e', `MEDIAMAKE_API_KEY=${KEY}`, '--', 'node', `${path.join(mcp, 'projectsync')}/server/index.js`]);
  assert.deepEqual(adds[2], ['mcp', 'add', '--transport', 'http', '--scope', 'user', 'mm-use', 'https://mediamake.microfox.app/mcp/use']);
  assert.ok(out.done.includes('mm-use added to Claude Code (https://mediamake.microfox.app/mcp/use)'));
  // a connector has no package: nothing of it is recorded or kept for updates
  assert.ok(!out.installed.some(i => i.id === 'mcp/mm-use'));

  // recorded, with the update token, so updates need nothing either
  const installed = readJson(path.join(home, '.mediamake', 'installed.json')).items;
  assert.equal(installed['mcp/browse-hack'].version, '0.17.0');
  assert.equal(installed['mcp/projectsync'].path, path.join('~', '.mediamake', 'mcp', 'projectsync'));
  const token = got.find(req => req.path === '/api/catalog/update-token');
  assert.deepEqual(token.body, { items: ['mcp/browse-hack', 'mcp/projectsync'] });
  assert.deepEqual(readJson(config), { url, updateToken: 'mmu_new' });
  if (!WIN) assert.equal(fs.statSync(config).mode & 0o777, 0o600); // Windows keeps no such bits
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

test('a hosted connector already in Claude Code is left alone, and without Claude Code its address is handed over', async () => {
  fs.writeFileSync(claudeState, JSON.stringify({ 'mm-use': ['https://mediamake.microfox.app/mcp/use'] }));
  const r = await items(['install', 'mcp/mm-use', '--yes', '--json']);
  assert.equal(r.status, 0, r.stderr);
  const out = JSON.parse(r.stdout);
  assert.ok(out.done.includes('mm-use is already in Claude Code'));
  assert.ok(!claudeCalls().some(args => args[1] === 'add' || args[1] === 'remove'));
  assert.deepEqual(out.left, []);

  const status = JSON.parse((await items(['--json'])).stdout);
  assert.deepEqual(status.connectors.map(c => c.state), ['added']);

  const without = JSON.parse((await items(['install', 'mcp/mm-use', '--yes', '--json'], { MEDIAMAKE_CLAUDE_BIN: '' })).stdout);
  assert.match(without.left[0].what, /In Claude Desktop, add a custom connector with https:\/\/mediamake\.microfox\.app\/mcp\/use/);
});

test('a local server starts by its full path here; on Windows an .exe by its path and an npm shim through cmd /c', () => {
  const finder = paths => cmd => paths[cmd] ?? [];
  // a Mac: the Claude app may start servers without the terminal's PATH, so the full path
  const mac = finder({ uvx: ['/opt/homebrew/bin/uvx'] });
  assert.deepEqual(localCommand('uvx', ['mcp-for-blender'], { platform: 'darwin', find: mac }), { command: '/opt/homebrew/bin/uvx', args: ['mcp-for-blender'] });
  assert.equal(localCommand('figcraft-cli', ['mcp'], { platform: 'darwin', find: mac }), null);
  // Windows: where.exe lists npx (a shell script) before npx.cmd
  const win = finder({ uvx: ['C:\\Users\\a\\.local\\bin\\uvx.exe'], npx: ['C:\\Program Files\\nodejs\\npx', 'C:\\Program Files\\nodejs\\npx.cmd'], sh: ['C:\\Program Files\\Git\\usr\\bin\\sh'] });
  assert.deepEqual(localCommand('uvx', ['mcp-for-blender'], { platform: 'win32', find: win }), { command: 'C:\\Users\\a\\.local\\bin\\uvx.exe', args: ['mcp-for-blender'] });
  assert.deepEqual(localCommand('npx', ['-y', '@rlabs-inc/gemini-mcp'], { platform: 'win32', find: win }), { command: 'cmd', args: ['/c', 'npx', '-y', '@rlabs-inc/gemini-mcp'] });
  assert.equal(localCommand('sh', [], { platform: 'win32', find: win }), null);
  // a command named by its full path is taken as it is, when it is there
  const exists = p => p === '/opt/tools/figcraft-cli';
  assert.deepEqual(localCommand('/opt/tools/figcraft-cli', ['mcp'], { platform: 'darwin', find: mac, exists }), { command: '/opt/tools/figcraft-cli', args: ['mcp'] });
  assert.equal(localCommand('/gone/figcraft-cli', ['mcp'], { platform: 'darwin', find: mac, exists }), null);
  // off the PATH: ~/.local/bin, then the folders its installer uses, with ~ and %VAR% filled in
  const none = finder({});
  const local = path.posix.join(os.homedir(), '.local', 'bin', 'figcraft-cli');
  assert.deepEqual(localCommand('figcraft-cli', ['mcp'], { platform: 'darwin', find: none, exists: p => p === local }), { command: local, args: ['mcp'] });
  const places = ['%LOCALAPPDATA%/Programs/ArtCraft/FigCraft', '%ProgramFiles%/ArtCraft/FigCraft'];
  const installed = 'C:\\Program Files\\ArtCraft\\FigCraft\\figcraft-cli.exe';
  const winEnv = { LOCALAPPDATA: 'C:\\Users\\a\\AppData\\Local', ProgramFiles: 'C:\\Program Files' };
  assert.deepEqual(localCommand('figcraft-cli', ['mcp'], { platform: 'win32', find: none, places, env: winEnv, exists: p => p === installed }), { command: installed, args: ['mcp'] });
  // a folder that names a variable this computer hasn't is skipped, not read as one at the disk's root
  assert.equal(localCommand('figcraft-cli', ['mcp'], { platform: 'darwin', find: none, places, env: {}, exists: p => p.startsWith('/Programs') }), null);
});

/** Where this computer's PATH finds node, as items.mjs looks it up. */
const nodeHere = () => spawnSync(process.platform === 'win32' ? 'where.exe' : 'which', ['node'], { encoding: 'utf8' }).stdout.split(/\r?\n/)[0].trim();
/** The same as a line to run shows it: quoted when it has a space (C:\Program Files\nodejs\node.exe). */
const nodeShown = () => (/\s/.test(nodeHere()) ? `"${nodeHere()}"` : nodeHere());

test("an MCP server someone else makes is added for every project with its command as this computer finds it; its setup is left to do", async () => {
  const r = await items(['install', 'mcp/blender', '--yes', '--json']);
  assert.equal(r.status, 0, r.stderr);
  const out = JSON.parse(r.stdout);
  assert.deepEqual(out.failed, []);
  assert.deepEqual(
    claudeCalls().filter(args => args[1] === 'add'),
    [['mcp', 'add', '--scope', 'user', 'blender', '--', nodeHere(), 'blender-server.js']],
  );
  assert.ok(out.done.some(line => line.startsWith('Blender (made by Someone Else) added to Claude Code as blender (for every project)')), out.done.join('\n'));
  assert.deepEqual(out.left.map(entry => entry.what), ["Blender's setup: Install its add-on.", "Blender's setup: Turn it on in Blender."]);
  assert.equal(out.left[0].guide, 'https://example.com/blender#readme');
  // recorded as installed from its source, with no version, and no update token asked for it
  const record = readJson(path.join(home, '.mediamake', 'installed.json')).items['mcp/blender'];
  assert.equal(record.source, 'mcp-server');
  assert.equal(record.path, 'blender');
  assert.deepEqual(out.installed, [{ id: 'mcp/blender', path: 'blender' }]);
  assert.ok(!got.some(req => req.path === '/api/catalog/update-token'));

  // a server already registered under its name is kept; --force replaces it
  fs.rmSync(claudeLog, { force: true });
  const again = JSON.parse((await items(['install', 'mcp/blender', '--yes', '--json'])).stdout);
  assert.ok(again.done.some(line => /already has a server named blender; kept as it is/.test(line)));
  assert.deepEqual(again.left, []);
  assert.ok(!claudeCalls().some(args => args[1] === 'add' || args[1] === 'remove'));
  await items(['install', 'mcp/blender', '--yes', '--force']);
  assert.deepEqual(claudeCalls().filter(args => args[1] !== 'get').map(args => args[1]), ['remove', 'add']);
});

test("a server's key comes from this computer's environment, else the line that adds it is left to do; a missing command says what to install", async () => {
  // no key here: nothing is added, and the line to add it has a place for the key
  const without = JSON.parse((await items(['install', 'mcp/gemini', '--yes', '--json'])).stdout);
  assert.deepEqual(without.failed, []);
  assert.ok(!claudeCalls().some(args => args[1] === 'add'));
  assert.match(without.left[0].what, /it needs GEMINI_API_KEY \(from https:\/\/aistudio\.google\.com\/apikey\)/);
  assert.ok(without.left[0].what.endsWith(`claude mcp add --scope user gemini -e GEMINI_API_KEY=<your key> -- ${nodeShown()} gemini-server.js`), without.left[0].what);
  assert.ok(!fs.existsSync(path.join(home, '.mediamake', 'installed.json')));

  // the key set in the environment goes into Claude Code's config, and into no output
  const r = await items(['install', 'mcp/gemini', '--yes', '--json'], { GEMINI_API_KEY: 'gk-test-secret' });
  assert.equal(r.status, 0, r.stderr);
  assert.deepEqual(claudeCalls().find(args => args[1] === 'add'), ['mcp', 'add', '--scope', 'user', 'gemini', '-e', 'GEMINI_API_KEY=gk-test-secret', '--', nodeHere(), 'gemini-server.js']);
  assert.ok(JSON.parse(r.stdout).done.some(line => /with GEMINI_API_KEY from this computer's environment/.test(line)));
  assert.ok(!r.stdout.includes('gk-test-secret'));

  // a command this computer doesn't have
  fs.rmSync(claudeLog, { force: true });
  const missing = JSON.parse((await items(['install', 'mcp/nothere', '--yes', '--json'])).stdout);
  assert.match(missing.left[0].what, /no-such-tool-mm-test isn't on this computer\. Install it \(https:\/\/example\.com\/nothere#readme\), then mm items install mcp\/nothere --yes/);
  assert.ok(!claudeCalls().some(args => args[1] === 'add'));
});

test("a command of the item's own: the steps to get it for each system, then it is found in its installer's folder off the PATH", async () => {
  const apps = path.join(tmp, 'apps');
  // not on this computer yet: the item's steps to get it, and nothing added
  const before = JSON.parse((await items(['install', 'mcp/figcraft', '--yes', '--json'], { MM_TEST_APPS: apps })).stdout);
  assert.deepEqual(before.left.map(entry => entry.what), [
    "Add Figcraft to Claude Code: figcraft-cli-mm-test isn't on this computer. Get it as the next steps say, then mm items install mcp/figcraft --yes",
    'Figcraft: On a Mac: the zip, into ~/.local/bin.',
    'Figcraft: On Windows: the .msi.',
  ]);
  assert.ok(!claudeCalls().some(args => args[1] === 'add'));

  // installed into its own folder, which isn't on the PATH: found there and added by its full path
  const file = path.join(apps, 'FigCraft', WIN ? 'figcraft-cli-mm-test.exe' : 'figcraft-cli-mm-test');
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, '');
  try {
    const after = JSON.parse((await items(['install', 'mcp/figcraft', '--yes', '--json'], { MM_TEST_APPS: apps })).stdout);
    assert.deepEqual(claudeCalls().find(args => args[1] === 'add'), ['mcp', 'add', '--scope', 'user', 'figcraft', '--', file, 'mcp']);
    assert.deepEqual(after.left.map(entry => entry.what), ["Figcraft's setup: Open the app to edit by hand."]);
  } finally {
    fs.rmSync(apps, { recursive: true, force: true });
  }
});

test("the Claude desktop app's own Claude Code is found on Windows, the newest version", () => {
  const local = path.join(tmp, 'LocalAppData');
  const base = path.join(local, 'Claude-Data', 'claude_abc123', 'claude-code');
  const exe = (version, build) => {
    fs.mkdirSync(path.join(base, version, build), { recursive: true });
    fs.writeFileSync(path.join(base, version, build, 'claude.exe'), '');
    return path.join(base, version, build, 'claude.exe');
  };
  assert.equal(desktopClaude({ LOCALAPPDATA: local }, 'win32'), null);
  exe('2.1.9', 'aaa');
  const newest = exe('2.1.10', 'bbb');
  // a version still downloading has no claude.exe yet
  fs.mkdirSync(path.join(base, '2.1.11', 'ccc'), { recursive: true });
  assert.equal(desktopClaude({ LOCALAPPDATA: local }, 'win32'), newest);
  // only Windows keeps it there
  assert.equal(desktopClaude({ LOCALAPPDATA: local }, 'darwin'), null);
});
