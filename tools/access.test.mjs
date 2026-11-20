// Tests for what a computer says it can do (tools/access.mjs). Run: node --test tools/
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { after, test } from 'node:test';

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'mm-access-'));
const home = path.join(tmp, 'home');
const top = path.join(tmp, 'mediamake');
process.env.HOME = home;
process.env.MEDIAMAKE_CONFIG = path.join(home, '.mediamake', 'config.json');
process.env.MEDIAMAKE_STATE = path.join(home, '.mediamake', 'state.json');
const { capabilities, declared, openProjects, placeReport } = await import('./access.mjs');
after(() => fs.rmSync(tmp, { recursive: true, force: true }));

const write = (file, body) => {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, typeof body === 'string' ? body : JSON.stringify(body));
};
const env = (more = {}) => ({ HOME: home, MEDIAMAKE_CONFIG: process.env.MEDIAMAKE_CONFIG, MEDIAMAKE_STATE: process.env.MEDIAMAKE_STATE, MEDIAMAKE_API_URL: 'http://127.0.0.1:9', ...more });

test('a computer reports what is found on it and what its owner added, by name only', () => {
  assert.deepEqual(capabilities({ env: env(), top, home, cloud: false }), []);
  fs.mkdirSync(path.join(top, 'node_modules', 'remotion'), { recursive: true });
  // a key in an MCP's settings in Claude counts, and its value is never read out
  write(path.join(home, '.claude.json'), { mcpServers: { elevenlabs: { env: { ELEVENLABS_API_KEY: 'sk-secret-value' } }, 'private-thing': { env: { OTHER: 'x' } }, blender: {} } });
  write(process.env.MEDIAMAKE_CONFIG, { access: { name: ' Studio Mac ', has: ['browser:youtube/doomcat', 'app:reaper', 'a mac', 'sk-secret'], limits: { elevenlabs: 'unlimited', fal: '$5 a day', 'Bad Key': 'x' } } });
  assert.deepEqual(declared(env()), { name: 'Studio Mac', has: ['browser:youtube/doomcat', 'app:reaper'], limits: { elevenlabs: 'unlimited', fal: '$5 a day' } });
  const can = capabilities({ env: env({ YOUTUBE_API_KEY: 'yt-secret-value', OPEN_WEATHER_API_KEY: 'ow-secret-value' }), top, home, asked: ['mcp:blender', 'mcp:midjourney', 'key:open-weather', 'key:fal'], cloud: false });
  // only the Claude MCPs the spaces' skills ask about are named: never the rest of the list
  assert.deepEqual(can, ['render', 'key:elevenlabs', 'key:youtube', 'mcp:blender', 'key:open-weather', 'browser:youtube/doomcat', 'app:reaper']);

  const report = placeReport({ env: env(), top, home, asked: [] });
  assert.equal(report.kind, 'device');
  assert.match(report.device, /^[a-z0-9]+-[0-9a-f]{4}$/);
  assert.equal(report.name, 'Studio Mac');
  assert.deepEqual(report.can, ['render', 'key:elevenlabs', 'browser:youtube/doomcat', 'app:reaper']);
  // a limit is kept only beside a key that is here
  assert.deepEqual(report.limits, { elevenlabs: 'unlimited' });
  assert.ok(!JSON.stringify(report).includes('secret'));
});

test('the media library counts as the library keeps it ({ root }) and as a plain path, and only when it is there', () => {
  const at = { env: env(), top: path.join(tmp, 'no-checkout'), home, cloud: false };
  write(process.env.MEDIAMAKE_CONFIG, { library: { root: '~/Downloads/_LIBRARY', inbox: '~/Downloads/_INBOX' } });
  assert.ok(!capabilities(at).includes('media:library'));
  fs.mkdirSync(path.join(home, 'Downloads', '_LIBRARY'), { recursive: true });
  assert.ok(capabilities(at).includes('media:library'));
  // ~\ as an older mm migrate wrote it on Windows
  write(process.env.MEDIAMAKE_CONFIG, { library: { root: '~\\Downloads\\_LIBRARY' } });
  assert.equal(capabilities(at).includes('media:library'), path.sep === '\\');
  write(process.env.MEDIAMAKE_CONFIG, { library: '~/Downloads/_LIBRARY' });
  assert.ok(capabilities(at).includes('media:library'));
  write(process.env.MEDIAMAKE_CONFIG, { library: { inbox: '~/Downloads/_INBOX' } });
  assert.ok(!capabilities(at).includes('media:library'));
});

test('a cloud session reports as its environment, with its limits and never what only a device has', () => {
  const cloud = env({ CLAUDE_CODE_REMOTE: 'true', MEDIAMAKE_PLACE: 'Shorts', ELEVENLABS_API_KEY: 'sk-secret-value', ELEVENLABS_API_KEY_LIMIT: 'unlimited' });
  const report = placeReport({ env: cloud, top, home, asked: ['mcp:blender'] });
  assert.deepEqual(report, { kind: 'cloud', device: 'Shorts', can: ['render', 'key:elevenlabs'], limits: { elevenlabs: 'unlimited' } });
  assert.equal(placeReport({ env: env({ CLAUDE_CODE_REMOTE: 'true' }), top, home, asked: [] }).device, 'cloud');
});

test('the session-start lines name only the projects a computer is open to: closed, busy or unknown, none', async t => {
  const P1 = 'a'.repeat(24);
  const P2 = 'b'.repeat(24);
  write(path.join(path.dirname(process.env.MEDIAMAKE_CONFIG), 'usage-state.json'), { device: 'mac-test' });
  const at = { url: 'http://127.0.0.1:9', key: 'mm_test' };
  const real = globalThis.fetch;
  t.after(() => (globalThis.fetch = real));
  const answer = places => (globalThis.fetch = async () => new Response(JSON.stringify({ places }), { status: 200 }));
  const place = (over = {}) => ({ id: 'device:me/mac-test', kind: 'device', label: 'mac-test', can: [], projects: [], ...over });

  answer([place()]);
  assert.deepEqual([...(await openProjects(at, env()))], []);
  answer([place({ projects: [P1] }), place({ id: 'device:me/mac-other', label: 'mac-other', projects: [P2] })]);
  assert.deepEqual([...(await openProjects(at, env()))], [P1]);
  answer([place({ projects: [P1], busy: true })]);
  assert.deepEqual([...(await openProjects(at, env()))], []);
  // not in the register yet, or the site can't say: closed
  answer([place({ label: 'mac-other', projects: [P1] })]);
  assert.deepEqual([...(await openProjects(at, env()))], []);
  globalThis.fetch = async () => new Response('nope', { status: 500 });
  assert.deepEqual([...(await openProjects(at, env()))], []);
  globalThis.fetch = async () => {
    throw new Error('offline');
  };
  assert.deepEqual([...(await openProjects(at, env()))], []);
  // a cloud environment is never opened or closed
  assert.equal(await openProjects(at, env({ CLAUDE_CODE_REMOTE: 'true' })), null);
});
