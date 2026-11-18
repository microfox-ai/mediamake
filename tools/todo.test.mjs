// Tests for a project's to-do queue on a computer (tools/todo.mjs), against a local server that stands
// in for MediaMake. Run: node --test tools/
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { after, before, test } from 'node:test';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'mm-todo-'));
const home = path.join(tmp, 'home');
process.env.HOME = home;
process.env.MEDIAMAKE_CONFIG = path.join(home, '.mediamake', 'config.json');
process.env.MEDIAMAKE_STATE = path.join(home, '.mediamake', 'state.json');
const { brief, hookLine, missingHere, postBody, todoLine } = await import('./todo.mjs');

const P1 = 'a'.repeat(24);
const todo = (over = {}) => ({
  id: 'td-abc234',
  project: P1,
  projectName: 'Doomcat',
  title: 'Upload doomcat-0412 to YouTube',
  skill: 'doomcat',
  step: '5. Upload to YouTube',
  release: 'doomcat-0412',
  version: 'v2',
  needs: [{ need: 'mcp:browse-hack' }, { need: 'browser:youtube' }],
  needsYes: false,
  repeat: false,
  state: 'open',
  line: 'Pick up to-do td-abc234 in Doomcat',
  postedBy: 'Ana',
  postedAt: '2026-11-18T10:00:00.000Z',
  mine: false,
  failures: 0,
  places: ['Studio Mac'],
  yours: [],
  ...over,
});

/** A stand-in for /api/space/todos: one to-do, claimed by whoever asks first. */
let server;
let url;
const calls = [];
let held = todo();
before(async () => {
  server = http.createServer((req, res) => {
    let raw = '';
    req.on('data', chunk => (raw += chunk));
    req.on('end', () => {
      const body = raw ? JSON.parse(raw) : undefined;
      calls.push({ method: req.method, url: req.url, body, key: req.headers.authorization });
      const send = (status, data) => {
        res.writeHead(status, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(data));
      };
      if (req.method === 'GET' && req.url === '/api/space/todos') return send(200, { todos: [held, todo({ id: 'td-pick22', title: 'Pick the thumbnail', needs: [], options: ['A', 'B'] })] });
      if (req.method === 'GET') return send(200, { todo: held });
      if (body.action === 'claim') {
        if (held.state === 'claimed') return send(409, { error: 'Someone else has it', todo: { ...held, mine: false, claimedBy: 'Ben', claimedOn: 'Studio Mac' } });
        held = { ...held, state: 'claimed', mine: true, claimedBy: 'You', claimedOn: body.place, claimedAt: '2026-11-18T10:05:00.000Z' };
        return send(200, { todo: held });
      }
      if (body.action === 'release') {
        held = todo();
        return send(200, { todo: held });
      }
      if (body.action === 'done') return send(200, { todo: { ...held, state: 'done', result: body.result } });
      if (body.action === 'post') return send(200, { todo: todo({ id: 'td-new234', title: body.title, needs: body.needs.map(need => ({ need })), places: [] }) });
      send(400, { error: 'unexpected' });
    });
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  url = `http://127.0.0.1:${server.address().port}`;
});
after(() => {
  server.close();
  fs.rmSync(tmp, { recursive: true, force: true });
});

const mm = (args, env = {}) =>
  new Promise(resolve => {
    const child = spawn(process.execPath, [path.join(HERE, 'todo.mjs'), ...args], { env: { PATH: process.env.PATH, HOME: home, MEDIAMAKE_CONFIG: process.env.MEDIAMAKE_CONFIG, MEDIAMAKE_STATE: process.env.MEDIAMAKE_STATE, MEDIAMAKE_API_URL: url, MEDIAMAKE_API_KEY: 'test-key', MEDIAMAKE_USAGE: 'off', ...env } });
    let out = '';
    child.stdout.on('data', chunk => (out += chunk));
    child.stderr.on('data', chunk => (out += chunk));
    child.on('close', code => resolve({ code, out }));
  });
const declare = has => {
  fs.mkdirSync(path.dirname(process.env.MEDIAMAKE_CONFIG), { recursive: true });
  fs.writeFileSync(process.env.MEDIAMAKE_CONFIG, JSON.stringify({ access: { name: 'Studio Mac', has } }));
};

test('a to-do is offered only where everything it needs is', () => {
  assert.deepEqual(missingHere(todo(), ['render', 'mcp:browse-hack']), ['browser:youtube']);
  // a sign-in as a named account also covers the site alone
  assert.deepEqual(missingHere(todo(), ['mcp:browse-hack', 'browser:youtube/doomcat']), []);
  assert.match(todoLine(todo(), ['mcp:browse-hack', 'browser:youtube/doomcat']), /○ td-abc234 {2}Upload doomcat-0412 to YouTube\n.*this computer can do it/);
  assert.match(todoLine(todo(), ['render']), /not this computer \(no mcp:browse-hack, browser:youtube\); Studio Mac can/);
  assert.match(todoLine(todo({ state: 'claimed', claimedBy: 'Ben', claimedOn: 'Studio Mac', claimedAt: '2026-11-18T10:05:00.000Z' }), []), /◐ .*\n.*Ben has it on Studio Mac since/);
  assert.match(todoLine(todo({ state: 'failed', failures: 3, reason: 'signed out' }), []), /✖ .*\n.*failed 3 times: signed out/);
});

test('the session-start line names what this computer can do, and is empty otherwise', () => {
  const list = [todo(), todo({ id: 'td-held22', state: 'claimed' }), todo({ id: 'td-pick22', needs: [], options: ['A', 'B'] }), todo({ id: 'td-voice2', title: 'Voice it', needs: [{ need: 'key:elevenlabs' }] })];
  assert.equal(hookLine(list, ['render']), '');
  assert.equal(
    hookLine(list, ['mcp:browse-hack', 'browser:youtube/doomcat']),
    'MediaMake: a to-do waits that this computer can do: td-abc234 "Upload doomcat-0412 to YouTube" (Doomcat). Tell the user, and pick one up only when they say so: mm todo pick <id>.',
  );
  assert.match(hookLine(list, ['mcp:browse-hack', 'browser:youtube', 'key:elevenlabs']), /^MediaMake: 2 to-dos wait/);
});

test('the brief says what to do, what to check first and how to finish', () => {
  const text = brief(todo({ notes: 'Schedule it for 8:00 PM.', needsYes: true }), 'Studio Mac');
  assert.match(text, /^✔ td-abc234 is yours, on Studio Mac\./);
  assert.match(text, /Skill {5}doomcat, step "5\. Upload to YouTube"/);
  assert.match(text, /Works on {2}release doomcat-0412, version v2: .*get_release with saveTo/);
  assert.match(text, /must not happen twice/);
  assert.match(text, /waits for a person's yes: ask the user, here, before doing it\. When they agree: mm todo yes td-abc234/);
  assert.match(text, /mm todo done td-abc234 --result=/);
  assert.doesNotMatch(brief(todo({ repeat: true }), 'Studio Mac'), /must not happen twice|person's yes/);
});

test('a post from the command line keeps its needs as words, and refuses one that is not', () => {
  assert.deepEqual(postBody(P1, 'Upload it', ['--needs=mcp:browse-hack, browser:youtube/doomcat', '--skill=doomcat', '--step=5. Upload to YouTube', '--release=doomcat-0412', '--version=v2', '--yes']), {
    action: 'post',
    project: P1,
    title: 'Upload it',
    needs: ['mcp:browse-hack', 'browser:youtube/doomcat'],
    skill: 'doomcat',
    step: '5. Upload to YouTube',
    release: 'doomcat-0412',
    version: 'v2',
    yes: true,
  });
  assert.deepEqual(postBody(P1, 'Pick one', ['--needs=nothing', '--options=A | B']).options, ['A', 'B']);
  assert.throws(() => postBody(P1, 'Upload it', ['--needs=youtube login']), /isn't one of/);
});

test('picking up claims it once, refuses where the computer lacks what it needs, and the hook stays quiet without a reason', async () => {
  // this computer has nothing: it is told what is missing, and nothing is claimed
  const refused = await mm(['pick', 'td-abc234']);
  assert.equal(refused.code, 1);
  assert.match(refused.out, /doesn't have what it needs: mcp:browse-hack, browser:youtube\. Studio Mac can do it/);
  assert.ok(!calls.some(call => call.body?.action === 'claim'));
  assert.equal((await mm(['--hook'])).out, '');

  declare(['mcp:browse-hack', 'browser:youtube/doomcat']);
  const hook = await mm(['--hook']);
  assert.match(hook.out, /^MediaMake: a to-do waits that this computer can do: td-abc234/);

  // the skill it names isn't here: it is given back, and says how to get the space
  const noSkill = await mm(['pick', 'td-abc234']);
  assert.equal(noSkill.code, 1);
  assert.match(noSkill.out, /needs the doomcat skill, which isn't on this computer: mm space join a{24}/);
  assert.equal(calls.at(-1).body.action, 'release');
  fs.mkdirSync(path.join(home, '.claude', 'skills', 'doomcat'), { recursive: true });
  fs.writeFileSync(path.join(home, '.claude', 'skills', 'doomcat', 'SKILL.md'), '---\nname: doomcat\n---\n');

  const picked = await mm(['pick', 'td-abc234']);
  assert.equal(picked.code, 0, picked.out);
  assert.match(picked.out, /✔ td-abc234 is yours, on Studio Mac/);
  assert.deepEqual(calls.findLast(call => call.body?.action === 'claim').body, { action: 'claim', id: 'td-abc234', place: 'Studio Mac' });
  assert.ok(calls.every(call => call.key === 'Bearer test-key'));

  // a second pick-up is told who has it
  const second = await mm(['pick', 'td-abc234']);
  assert.equal(second.code, 1);
  assert.match(second.out, /Someone else has it\. Ben has it on Studio Mac since/);

  const done = await mm(['done', 'td-abc234', '--result=https://youtu.be/x']);
  assert.match(done.out, /✔ td-abc234 is done: https:\/\/youtu\.be\/x/);
  // the hook never fails a session: a server that is gone says nothing
  const gone = await mm(['--hook'], { MEDIAMAKE_API_URL: 'http://127.0.0.1:9' });
  assert.deepEqual([gone.code, gone.out], [0, '']);
});
