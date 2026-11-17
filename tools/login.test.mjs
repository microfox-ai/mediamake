// Tests for `mm login` (tools/login.mjs): the browser sign-in against a local server that plays the
// MediaMake site, with the test playing the browser. Run: node --test tools/
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { after, before, beforeEach, test } from 'node:test';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const tmp = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'mm-login-test-')));
const home = path.join(tmp, 'home');
const config = path.join(home, '.mediamake', 'config.json');

/** The fake site's state. */
let site;
let server;
let url;
const got = [];

before(async () => {
  server = http.createServer((req, res) => {
    let body = '';
    req.on('data', chunk => (body += chunk));
    req.on('end', () => {
      const u = new URL(req.url, 'http://x');
      const type = req.headers['content-type'] ?? '';
      const params = type.includes('json') ? JSON.parse(body || '{}') : Object.fromEntries(new URLSearchParams(body));
      const bearer = req.headers.authorization?.split(' ')[1];
      got.push({ method: req.method, path: u.pathname, params, bearer });
      const json = (status, data) => {
        res.writeHead(status, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(data));
      };
      if (u.pathname === '/oauth/register') {
        site.client = { id: 'mcp_test', redirect: params.redirect_uris[0], name: params.client_name };
        return json(201, { client_id: site.client.id });
      }
      if (u.pathname === '/oauth/token') {
        const ok = params.code === site.code && params.client_id === site.client.id && params.redirect_uri === site.client.redirect && crypto.createHash('sha256').update(params.code_verifier ?? '').digest('base64url') === site.challenge;
        return ok ? json(200, { access_token: 'access-1', refresh_token: 'refresh-1' }) : json(400, { error: 'invalid_grant', error_description: 'PKCE or code mismatch' });
      }
      if (u.pathname === '/oauth/revoke') {
        site.revoked.push(params.token);
        return json(200, {});
      }
      // the API takes the app's access token (until revoked) or an API key
      const signedIn = (bearer === 'access-1' && !site.revoked.includes('access-1')) || site.keys.some(key => key.apiKey === bearer && key.isValid);
      if (!signedIn) return json(401, { error: 'Unauthorized' });
      if (u.pathname === '/api/me') return json(200, { clientId: 'c1', name: 'Ana', tier: 'pro' });
      if (u.pathname === '/api/apikeys' && req.method === 'GET') return json(200, { clientId: 'c1', keys: site.keys });
      if (u.pathname === '/api/apikeys' && req.method === 'POST') {
        const key = { id: `key-${site.keys.length + 1}`, apiKey: `key-${site.keys.length + 1}`, clientId: 'c1', clientName: params.clientName, isValid: true };
        site.keys.push(key);
        return json(201, { key });
      }
      if (u.pathname === '/api/apikeys' && req.method === 'DELETE') {
        site.keys = site.keys.filter(key => key.apiKey !== params.apiKey);
        return json(200, { success: true });
      }
      json(404, { error: 'no such route' });
    });
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  url = `http://127.0.0.1:${server.address().port}`;
});
after(() => {
  server.close();
  fs.rmSync(tmp, { recursive: true, force: true });
});
beforeEach(() => {
  got.length = 0;
  site = { keys: [{ id: 'web-key', apiKey: 'web-key', clientId: 'c1', clientName: 'Website', isValid: true }], revoked: [], code: 'code-1' };
  fs.rmSync(home, { recursive: true, force: true });
  fs.mkdirSync(path.dirname(config), { recursive: true });
});

const env = (over = {}) => {
  const e = { ...process.env, HOME: home, USERPROFILE: home, MEDIAMAKE_CONFIG: config, MEDIAMAKE_API_URL: url, MEDIAMAKE_KEY_IN_CONFIG: '1', ...over };
  delete e.MEDIAMAKE_API_KEY;
  for (const [k, v] of Object.entries(e)) if (v === undefined) delete e[k];
  return e;
};

/**
 * Runs `mm login` and plays the browser: when the link is printed, `browser(link)` decides what the
 * site sends back to the local port (the default: the person clicked Allow).
 */
function login(args = ['--no-open'], { browser, over, input } = {}) {
  return new Promise(resolve => {
    const child = spawn(process.execPath, [path.join(HERE, 'login.mjs'), ...args], { env: env(over) });
    let stdout = '';
    let stderr = '';
    let visited = false;
    if (input !== undefined) child.stdin.end(input);
    child.stdout.on('data', async chunk => {
      stdout += chunk;
      const link = stdout.match(/^\s+(http\S+\/oauth\/authorize\S+)$/m)?.[1];
      if (!link || visited) return;
      visited = true;
      const asked = new URL(link).searchParams;
      site.challenge = asked.get('code_challenge');
      const back = new URL(asked.get('redirect_uri'));
      const reply = browser ? browser(asked) : { code: site.code, state: asked.get('state') };
      for (const [k, v] of Object.entries(reply)) back.searchParams.set(k, v);
      await fetch(back).catch(() => {});
    });
    child.stderr.on('data', chunk => (stderr += chunk));
    child.on('close', status => resolve({ status, stdout, stderr }));
  });
}
const readConfig = () => JSON.parse(fs.readFileSync(config, 'utf8'));

test('mm login signs in through the browser: no key is typed, one is made for this computer and kept', async () => {
  const r = await login();
  assert.equal(r.status, 0, r.stderr + r.stdout);
  assert.match(r.stdout, /✔ Signed in to .* as Ana · Pro\./);
  // the app asked for a local redirect with PKCE
  assert.match(site.client.redirect, /^http:\/\/127\.0\.0\.1:\d+\/callback$/);
  assert.ok(site.challenge);
  // a key named for this computer is on the account, and it is the one kept here
  const made = site.keys.find(key => /^mm on /.test(key.clientName));
  assert.ok(made);
  assert.equal(readConfig().apiKey, made.apiKey);
  if (process.platform !== 'win32') assert.equal(fs.statSync(config).mode & 0o777, 0o600);
  // the key is never printed, and the temporary app session is ended
  assert.ok(!r.stdout.includes(made.apiKey) && !r.stderr.includes(made.apiKey));
  assert.deepEqual(site.revoked.sort(), ['access-1', 'refresh-1']);

  // the other tools now see the sign-in
  const status = await login(['status']);
  assert.match(status.stdout, /Signed in: Ana · Pro \(key from config\)/);

  // signing in again reuses this computer's key instead of piling up new ones
  site.revoked = [];
  const again = await login();
  assert.equal(again.status, 0, again.stderr);
  assert.equal(site.keys.filter(key => /^mm on /.test(key.clientName)).length, 1);
});

test('cancelling in the browser, or a reply that is not for this run, signs nothing in', async () => {
  const denied = await login(['--no-open'], { browser: asked => ({ error: 'access_denied', state: asked.get('state') }) });
  assert.equal(denied.status, 1);
  assert.match(denied.stderr, /cancelled in the browser/);
  const forged = await login(['--no-open'], { browser: () => ({ code: site.code, state: 'someone-else' }) });
  assert.equal(forged.status, 1);
  assert.match(forged.stderr, /came back wrong/);
  assert.ok(!fs.existsSync(config));
  assert.equal(site.keys.length, 1);
  assert.ok(!got.some(req => req.path === '/oauth/token'));
});

test('mm login --key takes a key on stdin for a computer with no browser, and checks it first', async () => {
  const bad = await login(['--key'], { input: 'not-a-key\n' });
  assert.equal(bad.status, 1);
  assert.ok(!fs.existsSync(config));
  const ok = await login(['--key'], { input: 'web-key\n' });
  assert.equal(ok.status, 0, ok.stderr);
  assert.equal(readConfig().apiKey, 'web-key');
  assert.ok(!ok.stdout.includes('web-key'));
});

test('mm logout forgets the key here and keeps the rest of the config; --revoke deletes it from the account too', async () => {
  await login();
  fs.writeFileSync(config, JSON.stringify({ ...readConfig(), workspace: '~/MediaMake' }));
  const key = readConfig().apiKey;
  const out = await login(['logout', '--revoke']);
  assert.equal(out.status, 0, out.stderr);
  assert.match(out.stdout, /deleted from your account/);
  assert.match(out.stdout, /Signed out/);
  assert.deepEqual(readConfig(), { workspace: '~/MediaMake' });
  assert.ok(!site.keys.some(k => k.apiKey === key));
  assert.match((await login(['status'])).stdout, /Signed in: no/);
  assert.match((await login(['logout'])).stdout, /wasn't signed in/);
});
