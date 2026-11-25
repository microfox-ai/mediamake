// Tests for sub-agents on the API key (tools/agents.mjs), with a stand-in for `claude` that prints the
// stream a headless run prints, and a local server that stands in for MediaMake's /api/me.
// Nothing is spent. Run: node --test tools/agents.test.mjs
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { after, before, test } from 'node:test';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'mm-agents-'));
const { anthropicKey, childEnv, conversation, creditNow, creditStop, envLine, mayGo, replyState, stateOf, turnCost } = await import('./agents.mjs');

/* ---------- a stand-in for claude ---------- */

const FAKE = path.join(tmp, 'claude-fake.mjs');
const CALLS = path.join(tmp, 'calls.jsonl');
fs.writeFileSync(
  FAKE,
  `#!/usr/bin/env node
import fs from 'node:fs';
const argv = process.argv.slice(2);
if (argv[0] === '--version') { console.log('9.9.9 (stand-in)'); process.exit(0); }
const after = name => argv[argv.indexOf(name) + 1];
const prompt = after('-p');
const session = argv.includes('--session-id') ? after('--session-id') : after('--resume');
// like Claude, a resumed conversation counts what its earlier turns cost
let earlier = 0;
try { earlier = fs.readFileSync(${JSON.stringify(CALLS)}, 'utf8').split('\\n').filter(l => l.includes(session)).length; } catch {}
const spent = 0.25 * (earlier + 1);
fs.appendFileSync(${JSON.stringify(CALLS)}, JSON.stringify({ argv, cwd: process.cwd(), key: process.env.ANTHROPIC_API_KEY ?? null, parent: process.env.CLAUDE_CODE_SESSION_ID ?? null, simple: process.env.CLAUDE_CODE_SIMPLE ?? null, run: process.env.MM_AGENT_RUN ?? null }) + '\\n');
const say = ev => console.log(JSON.stringify({ session_id: session, ...ev }));
const sleep = ms => new Promise(r => setTimeout(r, ms));
say({ type: 'system', subtype: 'init', model: 'claude-opus-5-5', claude_code_version: '9.9.9', permissionMode: after('--permission-mode'), apiKeySource: prompt.includes('NOKEY') ? 'none' : 'ANTHROPIC_API_KEY', tools: ['Bash', 'Read'], mcp_servers: [{ name: 'browse-hack', status: 'connected' }, { name: 'figcraft', status: 'failed' }] });
if (prompt.includes('NOKEY')) await sleep(8000);
if (prompt.includes('CRASH')) { console.error('it broke'); process.exit(2); }
say({ type: 'assistant', message: { content: [{ type: 'text', text: 'Looking at the project.' }, { type: 'tool_use', id: 't1', name: 'Bash', input: { command: 'mm render demo --preview' } }] } });
say({ type: 'user', message: { content: [{ type: 'tool_result', tool_use_id: 't1', content: 'rendered out/demo/preview.mp4' }] } });
const slow = prompt.match(/SLOW(\\d+)/);
if (slow) await sleep(Number(slow[1]));
const budget = prompt.includes('BUDGET');
const text = prompt.includes('ASK') ? 'Two looks are ready. Which one?\\nSTATE: needs-you' : 'The preview is in out/demo.\\nSTATE: done';
say({ type: 'assistant', message: { content: [{ type: 'text', text }] } });
say({ type: 'result', subtype: budget ? 'error_max_budget_usd' : 'success', is_error: budget, result: budget ? '' : text, total_cost_usd: spent, num_turns: 3, duration_ms: 1200, usage: { input_tokens: 100, output_tokens: 40, cache_read_input_tokens: 900, cache_creation_input_tokens: 10 }, modelUsage: { 'claude-opus-5-5': { costUSD: spent } }, permission_denials: [] });
`,
);
fs.chmodSync(FAKE, 0o755);

/* ---------- a stand-in for MediaMake ---------- */

let tier = 'cohort';
let asked = 0;
const server = http.createServer((req, res) => {
  if (req.url === '/api/me' && req.headers.authorization === 'Bearer mm-test') {
    asked += 1;
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ name: 'Tester', tier, isAdmin: tier === 'admin' }));
  }
  res.writeHead(401, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'no' }));
});
let url;
before(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  url = `http://127.0.0.1:${server.address().port}`;
});
after(() => {
  server.close();
  fs.rmSync(tmp, { recursive: true, force: true });
});

/** One isolated place: its own records, config and membership answer. */
const place = name => {
  const root = path.join(tmp, name);
  fs.mkdirSync(root, { recursive: true });
  const env = {
    PATH: process.env.PATH,
    HOME: process.env.HOME,
    MM_AGENTS_DIR: path.join(root, 'agents'),
    MEDIAMAKE_CONFIG: path.join(root, 'config', 'config.json'),
    MEDIAMAKE_API_URL: url,
    MEDIAMAKE_API_KEY: 'mm-test',
    ANTHROPIC_API_KEY: 'sk-ant-test',
    MM_AGENTS_CLAUDE: FAKE,
    MM_AGENTS_POLL_MS: '60',
    // what a Claude session leaves in its shell: the sub-agent must not inherit it
    CLAUDE_CODE_SESSION_ID: 'parent-session-1',
    CLAUDE_CODE_SIMPLE: '1',
    CLAUDECODE: '1',
  };
  const mm = (args, more = {}) =>
    new Promise(resolve => {
      const child = spawn(process.execPath, [path.join(HERE, 'agents.mjs'), ...args], { cwd: root, env: { ...env, ...more } });
      let out = '';
      child.stdout.on('data', d => (out += d));
      child.stderr.on('data', d => (out += d));
      child.on('close', code => resolve({ code, out }));
    });
  const runs = () => {
    try {
      return fs.readdirSync(env.MM_AGENTS_DIR).map(id => JSON.parse(fs.readFileSync(path.join(env.MM_AGENTS_DIR, id, 'run.json'), 'utf8')));
    } catch {
      return [];
    }
  };
  const until = async (ok, ms = 8000) => {
    const end = Date.now() + ms;
    while (Date.now() < end) {
      const value = ok();
      if (value) return value;
      await new Promise(r => setTimeout(r, 40));
    }
    throw new Error('timed out waiting');
  };
  return { root, env, mm, runs, until };
};
const callsFor = id => fs.readFileSync(CALLS, 'utf8').trim().split('\n').map(l => JSON.parse(l)).filter(c => c.run === id);
const idIn = out => out.match(/ag-[a-z0-9]{5}/)?.[0];

/* ---------- the small parts ---------- */

test('a key is read from a .env line, whatever its dress', () => {
  assert.equal(envLine('A=1\nANTHROPIC_API_KEY=sk-1\n', 'ANTHROPIC_API_KEY'), 'sk-1');
  assert.equal(envLine('export ANTHROPIC_API_KEY="sk-2"  # mine', 'ANTHROPIC_API_KEY'), 'sk-2');
  assert.equal(envLine("ANTHROPIC_API_KEY='sk-3'", 'ANTHROPIC_API_KEY'), 'sk-3');
  assert.equal(envLine('ANTHROPIC_API_KEY=sk-4 # note', 'ANTHROPIC_API_KEY'), 'sk-4');
  assert.equal(envLine('OTHER_ANTHROPIC_API_KEY=x', 'ANTHROPIC_API_KEY'), '');
});

test('the key comes from the environment, else the checkout .env, else the main checkout of a worktree', () => {
  const main = path.join(tmp, 'checkout');
  const tree = path.join(main, '.claude', 'worktrees', 'one');
  fs.mkdirSync(tree, { recursive: true });
  assert.equal(anthropicKey({}, { top: tree, keyFile: null }), null);
  fs.writeFileSync(path.join(main, '.env'), 'ANTHROPIC_API_KEY=sk-main\n');
  assert.equal(anthropicKey({}, { top: tree, keyFile: null }).key, 'sk-main');
  assert.equal(anthropicKey({}, { top: main, keyFile: null }).key, 'sk-main');
  assert.deepEqual(anthropicKey({ ANTHROPIC_API_KEY: 'sk-env' }, { top: tree, keyFile: null }), { key: 'sk-env', from: 'ANTHROPIC_API_KEY' });
  assert.equal(anthropicKey({ ANTHROPIC_API_KEY: '${ANTHROPIC_API_KEY}' }, { top: tree, keyFile: null }).key, 'sk-main');
});

test("a sub-agent's Claude gets the key and none of the session it was started from", () => {
  const env = childEnv({ PATH: '/bin', CLAUDECODE: '1', CLAUDE_CODE_SESSION_ID: 's', CLAUDE_CODE_SIMPLE: '1', CLAUDE_AGENT_SDK_VERSION: '1', CLAUDE_PID: '9', ANTHROPIC_AUTH_TOKEN: 't', ANTHROPIC_BASE_URL: 'u', CLAUDE_CONFIG_DIR: '/c', ELEVENLABS_API_KEY: 'e' }, 'sk-1', 'ag-abcde');
  assert.deepEqual(env, { PATH: '/bin', CLAUDE_CONFIG_DIR: '/c', ELEVENLABS_API_KEY: 'e', ANTHROPIC_API_KEY: 'sk-1', MM_AGENT_RUN: 'ag-abcde' });
});

test('the reply says how the turn ended', () => {
  assert.equal(replyState('All rendered.\nSTATE: done'), 'done');
  assert.equal(replyState('Which look?\n\nstate: needs-you\n'), 'needs-you');
  assert.equal(replyState('No key for fal.\nSTATE: blocked'), 'blocked');
  assert.equal(replyState('No last line at all'), 'done');
});

test("a turn's cost is Claude's count less the turn before it, since a resumed conversation counts on", () => {
  const result = (total, models) => ({ total_cost_usd: total, modelUsage: Object.fromEntries(Object.entries(models).map(([name, costUSD]) => [name, { costUSD }])) });
  const first = turnCost(result(0.0044547, { haiku: 0.0044547 }), undefined);
  assert.deepEqual(first, { cost: 0.004455, models: { haiku: 0.004455 }, total: 0.0044547, modelTotals: { haiku: 0.0044547 } });
  const second = turnCost(result(0.0074003, { haiku: 0.0064003, opus: 0.001 }), first);
  assert.equal(second.cost, 0.002946);
  assert.deepEqual(second.models, { haiku: 0.001946, opus: 0.001 });
  // a count that starts again from zero is the turn's own
  assert.equal(turnCost(result(0.002, { haiku: 0.002 }), second).cost, 0.002);
  assert.deepEqual(turnCost(null, second), { cost: 0, models: {} });
});

test('the credit: what is left, and when a run may not start on it', () => {
  const now = new Date('2026-11-26T10:00:00Z').getTime();
  const credit = { total: 200, ends: '2026-11-29T00:00:00Z' };
  assert.equal(creditNow(null, 5), null);
  const ok = creditNow(credit, 63.2, now);
  assert.equal(ok.left.toFixed(2), '136.80');
  assert.equal(ok.usable.toFixed(2), '126.80');
  assert.equal(creditStop(ok, false), null);
  assert.match(creditStop(creditNow(credit, 195, now), false), /Only \$5\.00 of the credit is left/);
  assert.match(creditStop(creditNow(credit, 10, new Date('2026-11-30T00:00:00Z').getTime()), false), /The credit ended/);
  assert.equal(creditStop(creditNow(credit, 195, now), true), null);
});

test('the queue: no more than max at once, and the one that waited longest goes first', () => {
  const me = process.pid;
  const run = (id, state, at) => ({ id, state, runner: me, created: at, turns: [{ at }] });
  const a = run('ag-aaaaa', 'running', '2026-11-26T10:00:00Z');
  const b = run('ag-bbbbb', 'queued', '2026-11-26T10:01:00Z');
  const c = run('ag-ccccc', 'queued', '2026-11-26T10:02:00Z');
  assert.equal(mayGo(b, [a, b, c], 1), false);
  assert.equal(mayGo(b, [a, b, c], 2), true);
  assert.equal(mayGo(c, [a, b, c], 2), false);
  // a record whose runner is gone holds no place
  assert.equal(stateOf({ ...a, runner: 999999 }), 'lost');
  assert.equal(mayGo(b, [{ ...a, runner: 999999 }, b], 1), true);
});

/* ---------- whole runs ---------- */

test('start says what would run and starts nothing; --yes runs it, on the key, and keeps the record', async () => {
  const p = place('one');
  const dry = await p.mm(['start', 'Render a preview of demo', '--title=Demo preview']);
  assert.equal(dry.code, 0);
  assert.match(dry.out, /Would start a sub-agent on the API key/);
  assert.match(dry.out, /opus · high effort · auto permissions/);
  assert.match(dry.out, /Ask: Start a sub-agent on opus \(high\) for "Demo preview", spending up to \$15\.00/);
  assert.match(dry.out, /Nothing was started/);
  assert.doesNotMatch(dry.out, /sk-ant-test/);
  assert.equal(p.runs().length, 0);

  const done = await p.mm(['start', 'Render a preview of demo', '--title=Demo preview', '--from=the demo video', '--yes', '--wait']);
  assert.equal(done.code, 0, done.out);
  assert.match(done.out, /✔ ag-[a-z0-9]{5} · "Demo preview" · done · turn 1: \$0\.25/);
  assert.match(done.out, /The preview is in out\/demo\./);
  assert.doesNotMatch(done.out, /STATE:/);
  const [run] = p.runs();
  assert.equal(run.state, 'done');
  assert.equal(run.cost, 0.25);
  assert.deepEqual(run.from, { session: 'parent-session-1', note: 'the demo video' });
  assert.deepEqual(run.loaded.mcp, ['browse-hack', 'figcraft (failed)']);
  assert.equal(run.turns[0].calls, 1);
  assert.deepEqual(run.turns[0].tokens, { in: 100, out: 40, cacheRead: 900, cacheWrite: 10 });
  assert.doesNotMatch(JSON.stringify(run), /sk-ant-test/);
  assert.doesNotMatch(fs.readFileSync(path.join(p.env.MM_AGENTS_DIR, run.id, 'events.jsonl'), 'utf8'), /sk-ant-test/);

  const [call] = callsFor(run.id);
  assert.equal(call.key, 'sk-ant-test');
  assert.equal(call.parent, null);
  assert.equal(call.simple, null);
  assert.equal(fs.realpathSync(call.cwd), fs.realpathSync(p.root));
  const arg = name => call.argv[call.argv.indexOf(name) + 1];
  assert.equal(arg('-p'), 'Render a preview of demo');
  assert.equal(arg('--model'), 'opus');
  assert.equal(arg('--effort'), 'high');
  assert.equal(arg('--permission-mode'), 'auto');
  assert.equal(arg('--max-budget-usd'), '15.0000');
  assert.equal(arg('--session-id'), run.session);
  assert.match(arg('--append-system-prompt'), /STATE: needs-you/);

  // the next turn resumes the same conversation, with what is left of the cap
  const dryNext = await p.mm(['continue', run.id, 'Make it brighter']);
  assert.match(dryNext.out, /Nothing was sent/);
  assert.equal(p.runs()[0].turns.length, 1);
  const next = await p.mm(['continue', run.id, 'Make it brighter', '--yes', '--wait']);
  assert.equal(next.code, 0, next.out);
  const again = p.runs()[0];
  assert.equal(again.turns.length, 2);
  assert.equal(again.cost, 0.5);
  const second = callsFor(run.id)[1];
  assert.equal(second.argv[second.argv.indexOf('--resume') + 1], run.session);
  assert.equal(second.argv[second.argv.indexOf('--max-budget-usd') + 1], '14.7500');
  assert.ok(!second.argv.includes('--session-id'));

  const shown = await p.mm(['show', run.id, '--full']);
  assert.match(shown.out, /you ›  Render a preview of demo/);
  assert.match(shown.out, /▸ Bash: mm render demo --preview/);
  assert.match(shown.out, /↳ rendered out\/demo\/preview\.mp4/);
  assert.match(shown.out, /you ›  Make it brighter/);
  const listed = await p.mm([]);
  assert.match(listed.out, /\$0\.50 spent/);
  assert.match(listed.out, new RegExp(`✔ ${run.id}  done`));
  const used = await p.mm(['usage']);
  assert.match(used.out, /claude-opus-5-5\s+\$0\.50/);
  assert.equal(conversation(path.join(p.env.MM_AGENTS_DIR, run.id, 'events.jsonl')).filter(l => l.startsWith('── turn')).length, 2);
});

test('a turn that asks something needs you; one that reaches its cap says so; one that breaks failed', async () => {
  const p = place('ends');
  const asks = await p.mm(['start', 'ASK which look', '--yes', '--wait']);
  assert.match(asks.out, /needs you/);
  assert.match(asks.out, /Answer it: mm agents continue ag-/);
  const capped = await p.mm(['start', 'BUDGET long job', '--cap=0.2', '--yes', '--wait']);
  assert.match(capped.out, /at its cap/);
  assert.match(capped.out, /reached its cap of \$0\.20/);
  const broke = await p.mm(['start', 'CRASH please', '--yes', '--wait']);
  assert.equal(broke.code, 1);
  assert.match(broke.out, /failed/);
  assert.match(broke.out, /it broke/);
  assert.deepEqual(p.runs().map(r => r.state).sort(), ['capped', 'failed', 'needs-you']);
  // the capped one cannot go on until its cap is raised
  const id = p.runs().find(r => r.state === 'capped').id;
  const stuck = await p.mm(['continue', id, 'carry on', '--yes']);
  assert.equal(stuck.code, 1);
  assert.match(stuck.out, /has spent its cap/);
  const more = await p.mm(['continue', id, 'carry on', '--cap=2', '--yes', '--wait']);
  assert.equal(more.code, 0, more.out);
});

test('a run Claude starts without the key is stopped: it would spend the subscription', async () => {
  const p = place('nokey');
  const r = await p.mm(['start', 'NOKEY run', '--yes', '--wait']);
  assert.equal(r.code, 1);
  assert.match(r.out, /did not take the API key/);
  assert.equal(p.runs()[0].state, 'failed');
});

test('only admins and Cohort members start one; a sub-agent starts none; no key, no run', async () => {
  const p = place('gate');
  tier = 'pro';
  const no = await p.mm(['start', 'anything', '--yes']);
  assert.equal(no.code, 1);
  assert.match(no.out, /Sub-agents are for admins and Cohort members; this account is pro/);
  assert.equal(p.runs().length, 0);
  tier = 'admin';
  const q = place('gate-admin');
  const before = asked;
  assert.equal((await q.mm(['start', 'anything', '--yes', '--wait'])).code, 0);
  assert.equal((await q.mm(['start', 'anything else', '--yes', '--wait'])).code, 0);
  assert.equal(asked - before, 1, 'the membership answer is kept for a day');
  const inside = await q.mm(['start', 'a nested one', '--yes'], { MM_AGENT_RUN: 'ag-abcde' });
  assert.equal(inside.code, 1);
  assert.match(inside.out, /a sub-agent does not start others/);
  const keyless = await q.mm(['start', 'no key here', '--yes'], { ANTHROPIC_API_KEY: '' });
  // the worktree or checkout this test runs in may hold a real .env: only assert when it found none
  if (/No Anthropic API key/.test(keyless.out)) assert.equal(keyless.code, 1);
  tier = 'cohort';
});

test('one at a time when max is 1: the second waits, then runs; stop ends a turn and keeps the conversation', async () => {
  const p = place('queue');
  assert.match((await p.mm(['defaults', '--max=1'])).out, /1 at a time/);
  const a = idIn((await p.mm(['start', 'SLOW900 first', '--yes'])).out);
  await p.until(() => p.runs().find(r => r.id === a)?.state === 'running');
  const second = await p.mm(['start', 'second', '--yes']);
  assert.match(second.out, /waiting its turn/);
  const b = idIn(second.out);
  assert.equal(p.runs().find(r => r.id === b).state, 'queued');
  await p.until(() => p.runs().every(r => r.state === 'done'));
  const [first, next] = [a, b].map(id => p.runs().find(r => r.id === id).turns[0]);
  assert.ok(next.startedAt >= first.endedAt, 'the second started after the first ended');

  const c = idIn((await p.mm(['start', 'SLOW20000 long', '--yes'])).out);
  await p.until(() => p.runs().find(r => r.id === c)?.state === 'running');
  assert.match((await p.mm(['stop', c])).out, /Stopping/);
  await p.until(() => p.runs().find(r => r.id === c)?.state === 'stopped');
  assert.match((await p.mm(['stop', c])).out, /isn't running/);
});

test('no run starts on a credit that ended or is nearly gone, unless --paid says the key may bill', async () => {
  const p = place('credit');
  assert.match((await p.mm(['credit', '--total=200', '--ends=2020-01-01T00:00'])).out, /which ended/);
  const ended = await p.mm(['start', 'late', '--yes']);
  assert.equal(ended.code, 1);
  assert.match(ended.out, /The credit ended/);
  assert.equal((await p.mm(['start', 'late', '--yes', '--paid', '--wait'])).code, 0);
  await p.mm(['credit', '--total=10', '--ends=2099-01-01T00:00']);
  const thin = await p.mm(['start', 'thin', '--yes']);
  assert.equal(thin.code, 1);
  assert.match(thin.out, /of the credit is left/);
  await p.mm(['credit', '--total=20']);
  // $0.25 spent of $20: $9.75 usable, so a $15 cap is lowered to it
  assert.match((await p.mm(['start', 'fits'])).out, /cap {6}\$9\.75 at most for this run \(lowered/);
});
