// Tests for the usage reports (tools/usage.mjs) and the hook that starts them (tools/skill-runs.mjs),
// against a local server that records what arrives. Run: node --test tools/
import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { after, before, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { localSkills, runReport, skillVersion, usageSetting } from './usage.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const tmp = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'mm-usage-test-')));
const home = path.join(tmp, 'home');
const project = path.join(tmp, 'project');
const config = path.join(home, '.mediamake', 'config.json');

/** Every request the fake site got: method, path, the Authorization header and the JSON body. */
const got = [];
let server;
let url;

before(async () => {
  fs.mkdirSync(path.dirname(config), { recursive: true });
  for (const [name, front] of [
    ['with-version', 'name: with-version\nversion: 1.2.0'],
    ['meta-version', 'name: meta-version\nmetadata:\n  version: "0.3.1"'],
    ['no-version', 'name: no-version'],
  ]) {
    fs.mkdirSync(path.join(project, '.claude', 'skills', name), { recursive: true });
    fs.writeFileSync(path.join(project, '.claude', 'skills', name, 'SKILL.md'), `---\n${front}\n---\nbody\n`);
  }
  fs.mkdirSync(path.join(project, '.claude', 'skills', 'not-a-skill'), { recursive: true });
  server = http.createServer((req, res) => {
    let body = '';
    req.on('data', chunk => (body += chunk));
    req.on('end', () => {
      got.push({ method: req.method, path: req.url, auth: req.headers.authorization, body: body ? JSON.parse(body) : undefined });
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify(req.method === 'DELETE' ? { forgotten: { runs: 3, devices: 1 } } : { saved: 1, device: 'test' }));
    });
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  url = `http://127.0.0.1:${server.address().port}`;
});
after(() => {
  server.close();
  fs.rmSync(tmp, { recursive: true, force: true });
});

const env = (over = {}) => {
  const e = { ...process.env, HOME: home, USERPROFILE: home, MEDIAMAKE_CONFIG: config, MEDIAMAKE_API_URL: url, MEDIAMAKE_API_KEY: 'test-key', CLAUDE_PROJECT_DIR: project, ...over };
  for (const k of ['MEDIAMAKE_WORKSPACE', 'MEDIAMAKE_USAGE']) if (!(k in over)) delete e[k];
  for (const [k, v] of Object.entries(e)) if (v === undefined) delete e[k];
  return e;
};
const usage = (args, over) => spawnSync(process.execPath, [path.join(HERE, 'usage.mjs'), ...args], { env: env(over), encoding: 'utf8' });
/** For the commands that call the site: the test's own server answers only while this process isn't blocked. */
const usageAsync = (args, over) =>
  new Promise(resolve => {
    const child = spawn(process.execPath, [path.join(HERE, 'usage.mjs'), ...args], { env: env(over) });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', chunk => (stdout += chunk));
    child.stderr.on('data', chunk => (stderr += chunk));
    child.on('close', status => resolve({ status, stdout, stderr }));
  });
/** Runs the hook as Claude Code does, with a Skill tool call on stdin. */
const hook = (toolInput, over) =>
  spawnSync(process.execPath, [path.join(HERE, 'skill-runs.mjs')], {
    env: env(over),
    encoding: 'utf8',
    input: JSON.stringify({ tool_name: 'Skill', tool_input: toolInput, cwd: '/Users/me/secret-project', session_id: 'session-1' }),
  });
/** The hook's sender is detached: wait for what it posts, or for long enough to say it posted nothing. */
const waitFor = async (count, ms = 4000) => {
  const until = Date.now() + ms;
  while (got.length < count && Date.now() < until) await new Promise(resolve => setTimeout(resolve, 50));
  return got.length;
};
const reset = () => {
  got.length = 0;
  fs.rmSync(config, { force: true });
  fs.rmSync(path.join(home, '.mediamake', 'usage-state.json'), { force: true });
};

test('a run report is a name and a time, or nothing', () => {
  assert.deepEqual(runReport('/make-lyrics-video', '2026-11-15T10:00:00+05:30'), { runs: [{ skill: 'make-lyrics-video', at: '2026-11-15T04:30:00.000Z' }] });
  assert.equal(runReport('/Users/me/skills/x', '2026-11-15T10:00:00Z'), null);
  assert.equal(runReport('has spaces', '2026-11-15T10:00:00Z'), null);
  assert.equal(runReport('ok', 'not a time'), null);
});

test('usage is on unless the config or the environment says off, and the environment wins', () => {
  assert.deepEqual(usageSetting({}, {}), { on: true, from: 'default' });
  assert.deepEqual(usageSetting({}, { usage: 'off' }), { on: false, from: 'config' });
  assert.deepEqual(usageSetting({}, { usage: false }), { on: false, from: 'config' });
  assert.deepEqual(usageSetting({ MEDIAMAKE_USAGE: 'off' }, { usage: 'on' }), { on: false, from: 'MEDIAMAKE_USAGE' });
  assert.deepEqual(usageSetting({ MEDIAMAKE_USAGE: 'on' }, { usage: 'off' }), { on: true, from: 'MEDIAMAKE_USAGE' });
});

test('local skills are names and versions: the stated version, else a hash of the SKILL.md', () => {
  const skills = localSkills([path.join(project, '.claude', 'skills'), path.join(tmp, 'missing')]);
  assert.deepEqual(skills.map(s => s.name), ['meta-version', 'no-version', 'with-version']);
  assert.equal(skills[0].version, '0.3.1');
  assert.match(skills[1].version, /^sha:[0-9a-f]{12}$/);
  assert.equal(skills[2].version, '1.2.0');
  assert.equal(skillVersion(path.join(project, '.claude', 'skills', 'with-version', 'SKILL.md')), '1.2.0');
  for (const skill of skills) assert.deepEqual(Object.keys(skill), ['name', 'version']);
});

test('the hook posts the name and the time, then the skill list once, and never the rest', async () => {
  reset();
  const r = hook({ skill: 'make-lyrics-video', args: 'projects/secret-song --final' });
  assert.equal(r.status, 0);
  assert.equal(r.stdout + r.stderr, '');
  assert.equal(await waitFor(2), 2);
  const [run, skills] = got;
  assert.deepEqual([run.method, run.path, run.auth], ['POST', '/api/usage/skill-runs', 'Bearer test-key']);
  assert.deepEqual(Object.keys(run.body), ['runs']);
  assert.deepEqual(Object.keys(run.body.runs[0]), ['skill', 'at']);
  assert.equal(run.body.runs[0].skill, 'make-lyrics-video');
  assert.deepEqual([skills.method, skills.path], ['PUT', '/api/usage/local-skills']);
  assert.match(skills.body.device, /^[a-z0-9]+-[0-9a-f]{4}$/);
  assert.deepEqual(skills.body.skills.map(s => s.name), ['meta-version', 'no-version', 'with-version']);
  const sent = JSON.stringify(got);
  for (const secret of ['secret-song', 'secret-project', 'session-1', os.hostname(), home]) assert.ok(!sent.includes(secret), `${secret} was not sent`);

  // the same day: the run only
  got.length = 0;
  hook({ skill: 'pack-brand-kit' });
  assert.equal(await waitFor(1), 1);
  await new Promise(resolve => setTimeout(resolve, 400));
  assert.deepEqual(got.map(g => g.path), ['/api/usage/skill-runs']);
});

test('nothing is posted when usage is off, nobody is signed in, or the name is not a skill name', async () => {
  reset();
  hook({ skill: 'make-lyrics-video' }, { MEDIAMAKE_USAGE: 'off' });
  assert.equal(usage(['off']).status, 0);
  assert.equal(JSON.parse(fs.readFileSync(config, 'utf8')).usage, 'off');
  hook({ skill: 'make-lyrics-video' });
  assert.match(usage(['skills']).stderr, /off/);
  assert.equal(usage(['on']).status, 0);
  hook({ skill: 'make-lyrics-video' }, { MEDIAMAKE_API_KEY: undefined, PATH: '' });
  hook({ skill: '../../etc/passwd' });
  hook({});
  assert.equal(await waitFor(1, 1500), 0);
});

test('mm usage keeps the rest of the config, shows the list without sending, sends it, and forgets', async () => {
  reset();
  fs.writeFileSync(config, JSON.stringify({ workspace: '~/MediaMake', library: { root: '~/lib' } }));
  usage(['off']);
  assert.deepEqual(JSON.parse(fs.readFileSync(config, 'utf8')), { workspace: '~/MediaMake', library: { root: '~/lib' }, usage: 'off' });
  usage(['on']);

  const status = usage([]);
  assert.match(status.stdout, /Usage reports: on/);
  assert.match(status.stdout, /Signed in: +yes \(MEDIAMAKE_API_KEY\)/);
  assert.ok(!status.stdout.includes('test-key'));

  const dry = usage(['skills', '--dry']);
  assert.match(dry.stdout, /with-version {2}1\.2\.0/);
  assert.match(dry.stdout, /Nothing was sent/);
  assert.equal(got.length, 0);

  assert.equal((await usageAsync(['skills'])).status, 0);
  assert.deepEqual([got[0].method, got[0].path, got[0].body.skills.length], ['PUT', '/api/usage/local-skills', 3]);

  const forget = await usageAsync(['forget']);
  assert.match(forget.stdout, /Deleted 3 runs, 1 skill lists and 0 app opens/);
  assert.deepEqual([got[1].method, got[1].path], ['DELETE', '/api/usage/skill-runs']);
  assert.equal(usage(['nonsense']).status, 1);
});
