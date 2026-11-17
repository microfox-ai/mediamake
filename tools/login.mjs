#!/usr/bin/env node
/**
 * login: signs this computer in to MediaMake through the browser. No API key is copied or pasted.
 *
 *   mm login              opens the site's sign-in in your browser; click Allow and you are signed in
 *   mm login --no-open    prints the link instead of opening it (open it in a browser on this computer)
 *   mm login --key        the old way: reads an API key from the terminal (not shown) or from stdin,
 *                         for a computer with no browser (a server, an SSH session)
 *   mm login status       the site, whether this computer is signed in and as whom
 *   mm logout             signs this computer out (the key leaves the Keychain; --revoke also deletes
 *                         the key this computer made from your account)
 *
 * How the browser sign-in works: `mm` listens on a port of this computer (127.0.0.1 only), opens the
 * site's own sign-in for apps (OAuth with PKCE, the same one the Browse Hack extension and the Claude
 * connectors use), and the site sends the browser back to that port once you click Allow. With that,
 * `mm` makes one API key on your account named for this computer ("mm on mac-3f9a"; signing in again
 * reuses it), keeps it where the other tools look, and signs the temporary app session out. The key
 * shows on the site's API Keys page, where you can disable or delete it.
 *
 * Where the key is kept: the macOS Keychain ("MediaMake API key"); on Windows and Linux, `apiKey` in
 * ~/.mediamake/config.json (readable by you only). It is never printed. The site is MEDIAMAKE_API_URL,
 * else `url` in the config, else mediamake.microfox.app: nobody is asked for it (--url=<site> names
 * another and remembers it).
 */
import { spawn, spawnSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { apiKey, configFile, deviceLabel, site } from './usage.mjs';

const SELF = fileURLToPath(import.meta.url);
const KEYCHAIN_SERVICE = 'mediamake-api-key';
const MAC = process.platform === 'darwin';
/** How long the browser has to come back before `mm login` gives up. */
const WAIT_MS = 5 * 60_000;

const readJson = file => {
  try {
    const value = JSON.parse(fs.readFileSync(file, 'utf8'));
    return value && typeof value === 'object' ? value : {};
  } catch {
    return {};
  }
};
const writeConfig = (env, change) => {
  const file = configFile(env);
  const next = change(readJson(file));
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(next, null, 2)}\n`, { mode: 0o600 });
  if (process.platform !== 'win32') fs.chmodSync(file, 0o600);
};

/** Keeps the key: the Keychain on a Mac (on stdin, never a command line), else the config. Returns where. */
export function saveKey(url, key, env = process.env) {
  if (MAC && !env.MEDIAMAKE_KEY_IN_CONFIG) {
    const q = s => `"${s.replace(/(["\\])/g, '\\$1')}"`;
    const r = spawnSync('security', ['-i'], {
      input: `add-generic-password -U -s ${KEYCHAIN_SERVICE} -a ${q(new URL(url).origin)} -l ${q('MediaMake API key')} -w ${q(key)}\n`,
      encoding: 'utf8',
    });
    if (r.status !== 0 || /error/i.test(r.stderr)) throw new Error('The Keychain refused to save the key');
    return 'the Keychain';
  }
  writeConfig(env, config => ({ ...config, apiKey: key }));
  return configFile(env);
}

/** Forgets the key on this computer. Returns whether there was one. */
export function forgetKey(url, env = process.env) {
  let had = false;
  if (MAC) had = spawnSync('security', ['delete-generic-password', '-s', KEYCHAIN_SERVICE, '-a', new URL(url).origin], { stdio: 'ignore' }).status === 0;
  if (typeof readJson(configFile(env)).apiKey === 'string') {
    writeConfig(env, ({ apiKey: _gone, ...rest }) => rest);
    had = true;
  }
  return had;
}

async function call(method, url, { token, json, form } = {}) {
  let res;
  try {
    res = await fetch(url, {
      method,
      headers: {
        Accept: 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...(json !== undefined && { 'Content-Type': 'application/json' }),
        ...(form && { 'Content-Type': 'application/x-www-form-urlencoded' }),
      },
      body: json !== undefined ? JSON.stringify(json) : form ? new URLSearchParams(form).toString() : undefined,
      signal: AbortSignal.timeout(30_000),
    });
  } catch (error) {
    throw new Error(`${new URL(url).origin} didn't answer (${error instanceof Error ? error.message : error})`);
  }
  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : undefined;
  } catch {
    data = undefined;
  }
  if (!res.ok) throw new Error(`${new URL(url).pathname} answered ${res.status}${data?.error_description || data?.error ? `: ${data.error_description ?? data.error}` : ''}`);
  return data;
}

const page = (title, line) =>
  `<!doctype html><meta charset="utf-8"><title>MediaMake</title><body style="font:16px system-ui;max-width:32rem;margin:20vh auto;padding:0 1rem;text-align:center"><h1 style="font-size:1.4rem">${title}</h1><p>${line}</p></body>`;

/** Opens a link in the default browser. Quiet when it can't: the link is printed anyway. */
function openBrowser(link) {
  const [cmd, args] = MAC ? ['open', [link]] : process.platform === 'win32' ? ['cmd', ['/c', 'start', '""', link.replace(/&/g, '^&')]] : ['xdg-open', [link]];
  try {
    spawn(cmd, args, { stdio: 'ignore', detached: true }).on('error', () => {}).unref();
  } catch {}
}

/**
 * The browser round trip: registers this run as an app with the site, sends the person to its sign-in
 * and waits on a local port for the code. `show(link)` gets the link to open. Returns the app's client
 * id and an access token for the account.
 */
export async function browserSignIn(url, { show, waitMs = WAIT_MS, device = 'this computer' } = {}) {
  const verifier = crypto.randomBytes(32).toString('base64url');
  const challenge = crypto.createHash('sha256').update(verifier).digest('base64url');
  const state = crypto.randomBytes(16).toString('base64url');

  let finish;
  const answered = new Promise((resolve, reject) => (finish = { resolve, reject }));
  const server = http.createServer((req, res) => {
    const u = new URL(req.url, 'http://127.0.0.1');
    if (u.pathname !== '/callback') {
      res.writeHead(404).end();
      return;
    }
    const error = u.searchParams.get('error');
    const ok = !error && u.searchParams.get('state') === state && u.searchParams.get('code');
    res.writeHead(ok ? 200 : 400, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(ok ? page('Signed in to MediaMake', 'You can close this tab and go back to your terminal.') : page("Couldn't sign in", 'Go back to your terminal and run mm login again.'));
    if (ok) finish.resolve(u.searchParams.get('code'));
    else finish.reject(new Error(error === 'access_denied' ? 'The sign-in was cancelled in the browser.' : `The sign-in came back wrong (${u.searchParams.get('error_description') ?? error ?? 'the reply was not for this run'}).`));
  });
  await new Promise((resolve, reject) => server.once('error', reject).listen(0, '127.0.0.1', resolve));
  const redirect = `http://127.0.0.1:${server.address().port}/callback`;
  let timer;
  try {
    const client = await call('POST', `${url}/oauth/register`, { json: { client_name: `mm (${device})`, redirect_uris: [redirect], token_endpoint_auth_method: 'none' } });
    const link = new URL(`${url}/oauth/authorize`);
    for (const [k, v] of Object.entries({ response_type: 'code', client_id: client.client_id, redirect_uri: redirect, code_challenge: challenge, code_challenge_method: 'S256', state, scope: 'mediamake' })) link.searchParams.set(k, v);
    show?.(link.href);
    const code = await Promise.race([
      answered,
      new Promise((_, reject) => (timer = setTimeout(() => reject(new Error(`Nobody finished the sign-in in the browser within ${Math.round(waitMs / 60_000)} minutes. Run mm login again.`)), waitMs))),
    ]);
    const tokens = await call('POST', `${url}/oauth/token`, { form: { grant_type: 'authorization_code', code, client_id: client.client_id, redirect_uri: redirect, code_verifier: verifier } });
    if (!tokens?.access_token) throw new Error("The site gave no access token; it may be older than this sign-in.");
    return { clientId: client.client_id, accessToken: tokens.access_token, refreshToken: tokens.refresh_token };
  } finally {
    clearTimeout(timer);
    server.close();
    server.closeAllConnections?.();
  }
}

/** This computer's own key on the account: the one named for it when it works, else a new one. */
export async function deviceKey(url, accessToken, name) {
  const mine = await call('GET', `${url}/api/apikeys`, { token: accessToken });
  const existing = (mine?.keys ?? []).find(key => key?.clientName === name && key.isValid && key.apiKey);
  if (existing) return { key: existing.apiKey, made: false };
  const made = await call('POST', `${url}/api/apikeys`, { token: accessToken, json: { clientName: name } });
  if (!made?.key?.apiKey) throw new Error("The site made no key for this computer.");
  return { key: made.key.apiKey, made: true };
}

/** Ends the temporary app session: only the key stays. Never fails the sign-in. */
async function endSession(url, session) {
  for (const token of [session.refreshToken, session.accessToken]) {
    if (!token) continue;
    await call('POST', `${url}/oauth/revoke`, { form: { token, client_id: session.clientId } }).catch(() => {});
  }
}

const whoIs = async (url, key) => {
  const me = await call('GET', `${url}/api/me`, { token: key });
  const tier = me?.tier ? ` · ${{ public: 'Public', plus: 'Plus', pro: 'Pro', cohort: 'Cohort', admin: 'Admin' }[me.tier] ?? me.tier}` : '';
  return `${me?.name || me?.email || 'your account'}${tier}`;
};

/** A key typed at the terminal without showing it, or piped in. */
async function readSecret(prompt) {
  const stdin = process.stdin;
  if (!stdin.isTTY) {
    let text = '';
    for await (const chunk of stdin) text += chunk;
    return text.trim();
  }
  process.stdout.write(prompt);
  stdin.setRawMode(true);
  stdin.resume();
  stdin.setEncoding('utf8');
  return new Promise((resolve, reject) => {
    let text = '';
    const done = error => {
      stdin.setRawMode(false);
      stdin.pause();
      stdin.off('data', onData);
      process.stdout.write('\n');
      error ? reject(error) : resolve(text.trim());
    };
    const onData = chunk => {
      for (const ch of chunk) {
        if (ch === '\r' || ch === '\n') return done();
        if (ch === '\u0003') return done(new Error('Cancelled'));
        if (ch === '\u007f' || ch === '\b') text = text.slice(0, -1);
        else text += ch;
      }
    };
    stdin.on('data', onData);
  });
}

async function main(args) {
  const env = process.env;
  const flags = new Set(args.filter(a => a.startsWith('--') && !a.includes('=')));
  const urlFlag = args.find(a => a.startsWith('--url='))?.slice('--url='.length).replace(/\/+$/, '');
  const [cmd = 'login'] = args.filter(a => !a.startsWith('--'));
  const url = urlFlag || site(env);
  const remember = () => urlFlag && writeConfig(env, config => ({ ...config, url }));
  const signedIn = () => apiKey(url, env) ?? (typeof readJson(configFile(env)).apiKey === 'string' ? { key: readJson(configFile(env)).apiKey, from: 'config' } : null);

  if (cmd === 'status') {
    const found = signedIn();
    console.log(`MediaMake: ${url}`);
    if (!found) return console.log('Signed in: no. mm login signs in through your browser.'), 0;
    try {
      console.log(`Signed in: ${await whoIs(url, found.key)} (key from ${found.from})`);
    } catch (error) {
      console.log(`Signed in: there is a key (${found.from}), but the site doesn't accept it: ${error.message}. mm login signs in again.`);
      return 1;
    }
    return 0;
  }

  if (cmd === 'logout') {
    const found = signedIn();
    if (flags.has('--revoke') && found && found.from !== 'MEDIAMAKE_API_KEY') {
      await call('DELETE', `${url}/api/apikeys`, { token: found.key, json: { apiKey: found.key } }).then(
        () => console.log('This computer\'s key is deleted from your account.'),
        error => console.log(`The key stays on your account (${error.message}); delete it on ${url}/app/api-keys.`),
      );
    }
    console.log(forgetKey(url, env) ? `Signed out of ${url} on this computer.` : `This computer wasn't signed in to ${url}.`);
    if (env.MEDIAMAKE_API_KEY?.trim()) console.log('MEDIAMAKE_API_KEY is still set in this shell, and the tools use it.');
    return 0;
  }

  if (cmd !== 'login') return console.error(`Unknown command "${cmd}". mm login [--no-open | --key] [--url=<site>] | mm login status | mm logout [--revoke]`), 1;

  if (flags.has('--key')) {
    const key = await readSecret(`API key for ${url} (from ${url}/app/api-keys; it isn't shown): `);
    if (!key) return console.error('No key given.'), 1;
    const who = await whoIs(url, key);
    const where = saveKey(url, key, env);
    remember();
    console.log(`✔ Signed in to ${url} as ${who}. The key is in ${where}.`);
    return 0;
  }

  const device = deviceLabel(env);
  const session = await browserSignIn(url, {
    device,
    show: link => {
      console.log(`Signing in to ${url}.`);
      if (flags.has('--no-open')) console.log(`Open this in a browser on this computer:\n\n  ${link}\n`);
      else {
        openBrowser(link);
        console.log(`Your browser is opening. Sign in there if it asks, then click Allow.\nIf it didn't open, open this:\n\n  ${link}\n`);
      }
      console.log('Waiting for the browser…');
    },
  });
  let who = 'your account';
  let where;
  try {
    const { key, made } = await deviceKey(url, session.accessToken, `mm on ${device}`);
    where = saveKey(url, key, env);
    remember();
    who = await whoIs(url, key).catch(() => who);
    console.log(`✔ Signed in to ${url} as ${who}.`);
    console.log(`  ${made ? 'A key' : 'The key'} named "mm on ${device}" ${made ? 'was made on' : 'is on'} your account for this computer, kept in ${where}. ${url}/app/api-keys lists it.`);
  } finally {
    await endSession(url, session);
  }
  console.log('  mm items shows what your membership opens; mm items install --yes installs it.');
  return 0;
}

if (process.argv[1] && path.resolve(process.argv[1]) === SELF) {
  main(process.argv.slice(2)).then(
    code => process.exit(code ?? 0),
    error => {
      console.error(error instanceof Error ? error.message : error);
      process.exit(1);
    },
  );
}
