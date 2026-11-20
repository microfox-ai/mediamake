// Tests for a production's run record on a computer (tools/run.mjs) and for saving and fetching a
// project's productions and releases (tools/bundles.mjs), against a local server that stands in for
// MediaMake and its storage. Run: node --test tools/
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { after, before, test } from 'node:test';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'mm-run-'));
const { fetchBundle, productionFiles, productionPlace, readBundle, releaseFiles, saveBundle } = await import('./bundles.mjs');
const { brief, hookLine, runLine, stepLines, stepsOf } = await import('./run.mjs');

const P1 = 'a'.repeat(24);
const write = (file, text) => {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, text);
};
const read = file => fs.readFileSync(file, 'utf8');

/* ---------- a stand-in for MediaMake: runs, productions, releases and their storage ---------- */

const calls = [];
const stored = new Map(); // sha256 → bytes
const bundles = { production: new Map(), release: new Map() }; // slug → { id, versions: [{ version, ready, files }] }
let run = null;
// the Studio Mac, in the register: the projects its owner opened it to
let macOpenTo = [P1];
let url;
let server;

const stepView = (step, i) => ({ n: i + 1, step: step.step, needs: step.needs.map(need => ({ need, label: need })), needsYes: !!step.yes, repeat: !!step.repeat, state: step.state === 'started' && !run.hold ? 'unsaved' : step.state, ...(step.place && { place: step.place }), ...(step.at && { at: step.at }), ...(step.output && { output: step.output }), ...(step.todo && { todo: step.todo, todoState: 'open' }), ...(step.without && !/^a to-do/.test(step.without) && { without: step.without }), ...(step.lacked && { lacked: step.lacked.map(need => ({ need, label: need })) }) });
function runView() {
  const index = run.steps.findIndex(step => step.state !== 'done');
  const next = run.state === 'open' && index >= 0 ? run.steps[index] : null;
  const state = run.state !== 'open' ? run.state : run.hold ? 'running' : next?.state === 'waiting' ? 'waiting' : 'ready';
  return {
    project: P1,
    projectName: 'Doomcat',
    slug: run.slug,
    title: run.title ?? run.slug,
    skill: run.skill,
    state,
    line: `Continue ${run.slug} in Doomcat`,
    steps: run.steps.map(stepView),
    done: run.steps.filter(step => step.state === 'done').length,
    ...(next && { next: { n: index + 1, step: next.step, needs: next.needs, places: next.needs.length ? ['Studio Mac'] : ['Cloud environment', 'Studio Mac'], yours: [], ...(next.without && !/^a to-do/.test(next.without) && { without: next.without }) } }),
    ...(run.hold && { heldBy: 'You', heldOn: run.hold.place, heldSince: run.hold.at }),
    mine: !!run.hold,
    ...(Object.keys(run.saved).length && { saved: run.saved }),
    startedBy: 'You',
    startedAt: run.startedAt,
    updatedAt: run.startedAt,
  };
}
function runAsk(body) {
  const refuse = error => ({ status: 409, data: { error, ...(run && { run: runView() }) } });
  const now = '2026-11-18T10:00:00.000Z';
  if (body.action === 'start') {
    if (run?.hold && run.hold.place !== body.place) return refuse('It is already running');
    if (run && !run.hold) return refuse(`It was started before and stopped at step 1: continue it instead (mm run resume ${run.slug})`);
    run = { slug: body.slug, skill: body.skill, title: body.title, steps: body.steps.map(step => ({ ...step, state: 'todo' })), state: 'open', hold: { place: body.place, at: now }, saved: {}, startedAt: now };
    return { status: 200, data: { run: runView() } };
  }
  if (!run || run.slug !== body.slug) return { status: 404, data: { error: 'no such run' } };
  if (body.action === 'resume') {
    if (run.hold && run.hold.place !== body.place) return refuse('It is already running');
    run.hold = { place: body.place, at: now };
  } else if (body.action === 'stop') run.hold = null;
  else if (body.action === 'cancel') Object.assign(run, { state: 'cancelled', hold: null });
  else {
    if (body.action !== 'wait' && run.hold?.place !== body.place) return refuse(run.hold ? 'It is already running' : `No place has this run now: continue it first (mm run resume ${run.slug})`);
    const step = run.steps[body.step - 1];
    if (step.state === 'done') return refuse(`Step ${body.step} (${step.step}) is already saved: a saved step is never done again`);
    if (body.action === 'step') Object.assign(step, { state: 'started', place: body.place, at: now, ...(body.lacked && { lacked: body.lacked }) });
    if (body.action === 'save') {
      Object.assign(step, { state: 'done', place: body.place, at: now, ...(body.output && { output: body.output }) });
      Object.assign(run.saved, body.saved);
      if (run.steps.every(s => s.state === 'done')) Object.assign(run, { state: 'done', hold: null });
    }
    if (body.action === 'wait') {
      Object.assign(step, { state: 'waiting', todo: 'td-wait22' });
      run.hold = null;
      return { status: 200, data: { run: runView(), todo: { id: 'td-wait22', places: ['Studio Mac'], line: 'Pick up to-do td-wait22 in Doomcat' } } };
    }
  }
  return { status: 200, data: { run: runView() } };
}

function bundleCall(kind, method, sub, query, body) {
  const map = bundles[kind];
  const answer = (doc, version) => {
    const v = doc.versions.find(x => x.version === (version ?? doc.latest));
    return { id: doc.id, slug: doc.slug, latestVersion: doc.latest, version: v?.version ?? null, files: (v?.files ?? []).map(f => ({ ...f, ...(query.links && { url: `${url}/storage/${f.sha256}` }) })) };
  };
  if (method === 'GET') {
    const doc = map.get(query.slug);
    return doc ? { status: 200, data: answer(doc, query.version ? Number(query.version) : undefined) } : { status: 404, data: { error: 'none' } };
  }
  if (sub === 'finish') {
    const doc = [...map.values()].find(d => d.id === body.id);
    const v = doc.versions.find(x => x.version === body.version);
    const missing = v.files.filter(f => !stored.has(f.sha256)).map(f => ({ path: f.path, reason: 'not uploaded' }));
    if (missing.length) return { status: 409, data: { ready: false, missing } };
    doc.latest = v.version;
    return { status: 200, data: { ready: true } };
  }
  let doc = method === 'POST' ? null : [...map.values()].find(d => d.id === body.id);
  if (method === 'POST') {
    if (map.has(body.slug)) return { status: 409, data: { error: 'exists' } };
    doc = { id: `${kind}-${map.size + 1}`, slug: body.slug, latest: 0, versions: [], platform: body.platform, productionId: body.productionId };
    map.set(body.slug, doc);
  }
  const version = doc.versions.length + 1;
  doc.versions.push({ version, files: body.files, note: body.note });
  const fresh = [...new Map(body.files.filter(f => !stored.has(f.sha256)).map(f => [f.sha256, f])).values()];
  return {
    status: 200,
    data: { id: doc.id, slug: doc.slug, version, uploads: fresh.map(f => ({ path: f.path, uploadUrl: `${url}/storage/${f.sha256}`, headers: { 'Content-Type': 'application/octet-stream' } })), reused: body.files.filter(f => !fresh.includes(f)).map(f => f.path), finish: { projectId: P1, id: doc.id, version } },
  };
}

before(async () => {
  server = http.createServer((req, res) => {
    const chunks = [];
    req.on('data', chunk => chunks.push(chunk));
    req.on('end', () => {
      const raw = Buffer.concat(chunks);
      const at = new URL(req.url, 'http://x');
      const send = (status, data) => {
        res.writeHead(status, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(data));
      };
      if (at.pathname.startsWith('/storage/')) {
        const key = at.pathname.slice('/storage/'.length);
        if (req.method === 'PUT') return stored.set(key, raw), send(200, {});
        return stored.has(key) ? (res.writeHead(200), res.end(stored.get(key))) : send(404, {});
      }
      const body = raw.length ? JSON.parse(raw.toString()) : undefined;
      calls.push({ method: req.method, path: at.pathname, body, key: req.headers.authorization });
      if (at.pathname === '/api/space') return send(200, { projects: [{ projectId: P1, name: 'Doomcat' }] });
      if (at.pathname === '/api/space/places') return send(200, { places: [{ id: 'device:me/mac-studio', kind: 'device', label: 'mac-studio', can: [], projects: macOpenTo }, { id: 'device:me/mac-cloudbox', kind: 'device', label: 'mac-cloudbox', can: [], projects: [P1] }] });
      if (at.pathname === '/api/space/runs') {
        if (req.method === 'GET' && !at.searchParams.has('project')) return send(200, { runs: run && run.state === 'open' ? [runView()] : [] });
        if (req.method === 'GET') return run?.slug === at.searchParams.get('slug') ? send(200, { run: runView() }) : send(404, { error: 'none' });
        const { status, data } = runAsk(body);
        return send(status, data);
      }
      if (at.pathname === '/api/space/todos') {
        const todo = { id: 'td-wait22', project: P1, projectName: 'Doomcat', title: 'Upload to YouTube: Doomcat 0412', skill: 'doomcat', step: 'Upload to YouTube', release: 'doomcat-0412', version: 'v1', run: 'doomcat-0412', needs: [{ need: 'browser:youtube/doomcat' }], needsYes: false, repeat: false, state: body?.action === 'claim' ? 'claimed' : 'open', mine: body?.action === 'claim', places: ['Studio Mac'], yours: [], failures: 0 };
        return send(200, { todo });
      }
      const bundle = at.pathname.match(/^\/api\/project\/(production|release)s(?:\/(finish))?$/);
      if (bundle) {
        const { status, data } = bundleCall(bundle[1], req.method, bundle[2], Object.fromEntries(at.searchParams), body);
        return send(status, data);
      }
      send(404, { error: 'unexpected' });
    });
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  url = `http://127.0.0.1:${server.address().port}`;
});
after(() => {
  server.close();
  fs.rmSync(tmp, { recursive: true, force: true });
});

/* ---------- two places: a cloud session's machine and the Studio Mac ---------- */

const place = (name, has) => {
  const home = path.join(tmp, name);
  const work = path.join(home, 'MediaMake');
  write(path.join(home, '.mediamake', 'config.json'), JSON.stringify({ workspace: work, access: { name, has } }));
  write(path.join(home, '.mediamake', 'usage-state.json'), JSON.stringify({ device: name === 'Studio Mac' ? 'mac-studio' : 'mac-cloudbox' }));
  write(path.join(home, '.claude', 'skills', 'doomcat', 'SKILL.md'), ['---', 'name: doomcat', '---', '', '## Where it runs', '', "| Step | Needs | A person's yes | Safe to repeat | Without it |", '|---|---|---|---|---|', '| 1. Write and render | nothing | no | yes | - |', '| 2. YouTube pack | nothing | no | yes | - |', '| 3. Upload to YouTube | `browser:youtube/doomcat` | no | no | a to-do for a computer signed in to the channel |', ''].join('\n'));
  write(path.join(home, '.claude', 'skills', 'plain', 'SKILL.md'), '---\nname: plain\n---\nNo sheet.\n');
  write(path.join(home, '.claude', 'skills', 'takes', 'SKILL.md'), ['---', 'name: takes', '---', '', '## Where it runs', '', "| Step | Needs | A person's yes | Safe to repeat | Without it |", '|---|---|---|---|---|', "| 1. The crowd's takes | `mcp:browse-hack` | no | yes | the takes from the web only |", '| 2. Upload | `browser:youtube/doomcat` | no | no | a to-do for a computer signed in to the channel |', ''].join('\n'));
  const env = { PATH: process.env.PATH, HOME: home, MEDIAMAKE_CONFIG: path.join(home, '.mediamake', 'config.json'), MEDIAMAKE_STATE: path.join(home, '.mediamake', 'state.json'), MEDIAMAKE_USAGE: 'off', MEDIAMAKE_API_KEY: 'test-key' };
  const mm = (args, more = {}) =>
    new Promise(resolve => {
      const child = spawn(process.execPath, [path.join(HERE, 'run.mjs'), ...args], { env: { ...env, MEDIAMAKE_API_URL: url, ...more } });
      let out = '';
      child.stdout.on('data', chunk => (out += chunk));
      child.stderr.on('data', chunk => (out += chunk));
      child.on('close', code => resolve({ code, out }));
    });
  return { home, work, mm };
};
const cloud = place('Cloud box', []);
const mac = place('Studio Mac', ['browser:youtube/doomcat']);

const view = (over = {}) => ({
  project: P1,
  projectName: 'Doomcat',
  slug: 'doomcat-0412',
  title: 'Doomcat 0412',
  skill: 'doomcat',
  state: 'ready',
  line: 'Continue doomcat-0412 in Doomcat',
  steps: [
    { n: 1, step: 'Write and render', needs: [], needsYes: false, repeat: true, state: 'done', place: 'cloud', at: '2026-11-18T10:00:00.000Z', output: 'production v1' },
    { n: 2, step: 'YouTube pack', needs: [], needsYes: false, repeat: true, state: 'unsaved', place: 'cloud', at: '2026-11-18T10:05:00.000Z' },
    { n: 3, step: 'Upload to YouTube', needs: [{ need: 'browser:youtube/doomcat', label: 'a browser signed in to youtube as doomcat' }], needsYes: true, repeat: false, state: 'todo' },
  ],
  done: 1,
  next: { n: 2, step: 'YouTube pack', needs: [], places: ['Cloud environment', 'Studio Mac'], yours: [] },
  mine: false,
  saved: { production: 1 },
  startedBy: 'Ana',
  startedAt: '2026-11-18T09:59:00.000Z',
  updatedAt: '2026-11-18T10:05:00.000Z',
  ...over,
});

test('a run in a list says how far it is, and the session-start line names only what this place can continue', () => {
  assert.match(runLine(view(), []), /▸ doomcat-0412 {2}Doomcat 0412 {2}\(doomcat, 1 of 3 steps saved\)\n.*ready to continue at step 2 \(YouTube pack\): this place can do it/);
  const atUpload = view({ done: 2, next: { n: 3, step: 'Upload to YouTube', needs: ['browser:youtube/doomcat'], places: ['Studio Mac'], yours: [] } });
  assert.match(runLine(atUpload, []), /not this place \(no browser:youtube\/doomcat\); Studio Mac can/);
  assert.match(runLine(view({ state: 'running', heldBy: 'Ben', heldOn: 'Studio Mac', heldSince: '2026-11-18T10:05:00.000Z' }), []), /◐ .*\n.*Ben has it on Studio Mac since .*, at step 2/);
  const lines = stepLines(view(), []);
  assert.match(lines[0], /✔ 1\. Write and render {4}cloud, .* {3}production v1/);
  assert.match(lines[1], /! 2\. YouTube pack .*started on cloud, .*never saved: it is done again/);
  assert.match(lines[2], /○ 3\. Upload to YouTube {3}not this place \(no browser:youtube\/doomcat\)/);
  assert.equal(hookLine([view({ state: 'running' }), atUpload], []), '');
  assert.equal(hookLine([view(), atUpload], []), 'MediaMake: a run is ready to continue that this place can do: doomcat-0412 (Doomcat), next step 2 "YouTube pack". Tell the user, and continue one only when they say so: mm run resume <slug>.');
  assert.match(hookLine([view(), atUpload], ['browser:youtube/doomcat']), /^MediaMake: 2 runs are ready/);
  // a computer names only the projects it is open to: closed, it says nothing
  assert.equal(hookLine([view(), atUpload], ['browser:youtube/doomcat'], new Set()), '');
  assert.match(hookLine([view(), atUpload], ['browser:youtube/doomcat'], new Set([P1])), /^MediaMake: 2 runs are ready/);
});

test('the brief says what is next, what to check first and how to save', () => {
  const text = brief(view(), [], 'Studio Mac', ['production doomcat-0412 v1 → projects/doomcat-0412 and out/doomcat-0412 (4 files fetched, 0 already here)']);
  assert.match(text, /^✔ doomcat-0412 runs here \(Studio Mac\), with the doomcat skill\./);
  assert.match(text, /Fetched: production doomcat-0412 v1/);
  assert.match(text, /Saved steps are never done again\.\nGo on with step 2 \(YouTube pack\): follow the doomcat skill for that step\./);
  assert.match(text, /mm run step doomcat-0412 2\n.*mm run save doomcat-0412 2 --production/);
  // a step that must not happen twice, started before and never saved, and one that waits for a yes
  const upload = view({ steps: view().steps.map(s => (s.n === 3 ? { ...s, state: 'unsaved' } : { ...s, state: 'done' })), next: { n: 3, step: 'Upload to YouTube', needs: ['browser:youtube/doomcat'], places: ['Studio Mac'], yours: [] } });
  const here = brief(upload, ['browser:youtube/doomcat'], 'Studio Mac');
  assert.match(here, /must not happen twice: check first that it didn't already/);
  assert.match(here, /waits for a person's yes: ask the user, here, before doing it/);
  // a place that can't do the next step is told to post it and end
  const cant = brief(upload, [], 'cloud');
  assert.match(cant, /needs browser:youtube\/doomcat, which this place doesn't have\. Studio Mac can do it\.\nPost it for a place that can, and end there \(a session never waits\): {2}mm run wait doomcat-0412 3/);
  assert.doesNotMatch(cant, /mm run step/);
});

test('a skill with no run sheet runs whole, as one step', () => {
  assert.deepEqual(stepsOf(path.join(cloud.home, '.claude', 'skills', 'plain', 'SKILL.md')), { steps: [{ step: 'The whole skill', needs: [] }], whole: true });
  assert.deepEqual(stepsOf(path.join(cloud.home, '.claude', 'skills', 'doomcat', 'SKILL.md')).steps[2], { step: 'Upload to YouTube', needs: ['browser:youtube/doomcat'], without: 'a to-do for a computer signed in to the channel' });
});

test('a production is saved with only its changed files, and fetched without replacing a file that differs', async () => {
  const at = { url, key: 'test-key' };
  const a = path.join(tmp, 'a');
  write(path.join(a, 'projects', 'demo', 'src', 'index.ts'), 'export const a = 1;\n');
  write(path.join(a, 'projects', 'demo', 'input', 'lyrics.json'), '{}\n');
  write(path.join(a, 'projects', 'demo', '.cache', 'x'), 'hidden\n');
  write(path.join(a, 'projects', 'demo', 'node_modules', 'pkg', 'index.js'), 'skipped\n');
  write(path.join(a, 'out', 'demo', 'final.mp4'), 'video-1');
  const list = () => productionFiles({ code: path.join(a, 'projects', 'demo'), outputs: path.join(a, 'out', 'demo') }).files;
  assert.deepEqual(list().map(f => [f.path, f.role]), [['code/src/index.ts', 'code'], ['output/final.mp4', 'output'], ['input/lyrics.json', 'input']]);
  assert.deepEqual(releaseFiles(path.join(a, 'out', 'demo')).map(f => [f.path, f.role]), [['final.mp4', 'file']]);

  const first = await saveBundle(at, 'production', { projectId: P1, slug: 'demo', files: list() });
  assert.deepEqual([first.version, first.uploaded, first.reused], [1, 3, 0]);
  assert.equal((await saveBundle(at, 'production', { projectId: P1, slug: 'demo', files: list() })).unchanged, true);
  write(path.join(a, 'out', 'demo', 'final.mp4'), 'video-2');
  const second = await saveBundle(at, 'production', { projectId: P1, slug: 'demo', files: list() });
  assert.deepEqual([second.version, second.uploaded, second.reused, second.unchanged], [2, 1, 2, undefined]);
  assert.equal(stored.get(createHash('sha256').update('video-2').digest('hex')).toString(), 'video-2');

  // another computer: everything arrives, laid out as a workspace
  const b = path.join(tmp, 'b');
  const record = await readBundle(at, 'production', { projectId: P1, slug: 'demo', version: 2, links: true });
  assert.deepEqual(await fetchBundle(record, productionPlace(b, 'demo')), { saved: 3, unchanged: 0, differ: [] });
  assert.deepEqual([read(path.join(b, 'projects', 'demo', 'src', 'index.ts')), read(path.join(b, 'projects', 'demo', 'input', 'lyrics.json')), read(path.join(b, 'out', 'demo', 'final.mp4'))], ['export const a = 1;\n', '{}\n', 'video-2']);
  assert.deepEqual(await fetchBundle(record, productionPlace(b, 'demo')), { saved: 0, unchanged: 3, differ: [] });
  // an edit here is never lost: nothing is fetched until asked, and then the file here is kept beside
  fs.rmSync(path.join(b, 'out', 'demo', 'final.mp4'));
  write(path.join(b, 'projects', 'demo', 'src', 'index.ts'), 'export const a = 2; // mine\n');
  const kept = await fetchBundle(record, productionPlace(b, 'demo'));
  assert.deepEqual([kept.saved, kept.differ], [0, [path.join(b, 'projects', 'demo', 'src', 'index.ts')]]);
  assert.ok(!fs.existsSync(path.join(b, 'out', 'demo', 'final.mp4')));
  const taken = await fetchBundle(record, productionPlace(b, 'demo'), { takeSaved: true, backup: abs => path.join(b, 'projects', 'demo', '.before-resume', 't', path.relative(path.join(b, 'projects', 'demo'), abs)) });
  assert.deepEqual([taken.saved, taken.unchanged], [2, 1]);
  assert.deepEqual([read(path.join(b, 'projects', 'demo', 'src', 'index.ts')), read(path.join(b, 'projects', 'demo', '.before-resume', 't', 'src', 'index.ts'))], ['export const a = 1;\n', 'export const a = 2; // mine\n']);
  assert.equal(await readBundle(at, 'production', { projectId: P1, slug: 'nothing' }), null);
});

test('a run starts in the cloud, saves each step, hands the upload over, and continues on the Mac with its files', async () => {
  write(path.join(cloud.work, 'projects', 'doomcat-0412', 'src', 'short.tsx'), 'export const Short = () => null;\n');
  write(path.join(cloud.work, 'out', 'doomcat-0412', 'doomcat-0412.mp4'), 'the short');
  write(path.join(cloud.work, 'out', 'youtube', 'doomcat-0412', 'info.json'), '{"title":"Doomcat"}\n');

  const noSkill = await cloud.mm(['start', 'Doomcat', 'doomcat-0412', '--skill=nope']);
  assert.match(noSkill.out, /The nope skill isn't on this computer/);
  const started = await cloud.mm(['start', 'Doomcat', 'doomcat-0412', '--skill=doomcat', '--title=Doomcat 0412']);
  assert.equal(started.code, 0, started.out);
  assert.match(started.out, /✔ doomcat-0412 runs here \(Cloud box\), with the doomcat skill/);
  assert.match(started.out, /○ 3\. Upload to YouTube {3}not this place \(no browser:youtube\/doomcat\)/);
  assert.doesNotMatch(started.out, /never done again/);
  assert.deepEqual(calls.findLast(call => call.body?.action === 'start').body.steps, [{ step: 'Write and render', needs: [], repeat: true }, { step: 'YouTube pack', needs: [], repeat: true }, { step: 'Upload to YouTube', needs: ['browser:youtube/doomcat'], without: 'a to-do for a computer signed in to the channel' }]);

  // the same production, started on another computer, is told where it runs
  const twice = await mac.mm(['start', 'Doomcat', 'doomcat-0412', '--skill=doomcat']);
  assert.equal(twice.code, 1);
  assert.match(twice.out, /mm run: It is already running\. You have it on Cloud box since/);

  const one = await cloud.mm(['save', 'doomcat-0412', '1', '--production']);
  assert.equal(one.code, 0, one.out);
  assert.match(one.out, /Production doomcat-0412 v1: 2 files, 2 sent\.\n✔ Step 1 \(Write and render\) of doomcat-0412 is saved: production v1\.\n {2}Next: step 2 \(YouTube pack\)\. mm run step doomcat-0412 2/);
  const two = await cloud.mm(['save', 'doomcat-0412', '2', '--release', '--output=pack ready']);
  assert.match(two.out, /Release doomcat-0412 v1: 1 file, 1 sent\.\n✔ Step 2 \(YouTube pack\) of doomcat-0412 is saved: pack ready · release doomcat-0412 v1\./);
  assert.match(two.out, /Next, step 3 \(Upload to YouTube\), needs browser:youtube\/doomcat, which this place doesn't have: mm run wait doomcat-0412 3/);
  assert.deepEqual(calls.findLast(call => call.body?.action === 'save').body.saved, { release: { slug: 'doomcat-0412', version: 1, folder: 'out/youtube/doomcat-0412' } });
  assert.deepEqual([bundles.release.get('doomcat-0412').platform, bundles.release.get('doomcat-0412').productionId], ['youtube', 'production-2']);
  assert.match((await cloud.mm(['save', 'doomcat-0412', '2', '--release=../../etc'])).out, /The release kit's folder is one of the workspace's/);

  // the cloud can't upload: it says so, posts the to-do and lets go
  const cant = await cloud.mm(['step', 'doomcat-0412', '3']);
  assert.equal(cant.code, 1);
  assert.match(cant.out, /doesn't have what step 3 \(Upload to YouTube\) needs: browser:youtube\/doomcat\. Post it for a place that has: mm run wait doomcat-0412 3/);
  const waits = await cloud.mm(['wait', 'doomcat-0412']);
  assert.match(waits.out, /◌ Step 3 \(Upload to YouTube\) of doomcat-0412 waits as to-do td-wait22\.\n {2}Studio Mac can do it\.\n {2}The line for whoever picks it up: Pick up to-do td-wait22 in Doomcat/);
  assert.match(waits.out, /When the to-do is done the run is over\.\n {2}End here: a session never waits for a to-do\./);
  assert.equal((await mac.mm(['--hook'])).out, '');

  // picking the to-do up brings what the run saved, and never over a file here that differs
  write(path.join(mac.work, 'out', 'youtube', 'doomcat-0412', 'info.json'), '{"title":"an older pack"}\n');
  const picked = await new Promise(resolve => {
    const child = spawn(process.execPath, [path.join(HERE, 'todo.mjs'), 'pick', 'td-wait22'], { env: { PATH: process.env.PATH, HOME: mac.home, MEDIAMAKE_CONFIG: path.join(mac.home, '.mediamake', 'config.json'), MEDIAMAKE_STATE: path.join(mac.home, '.mediamake', 'state.json'), MEDIAMAKE_USAGE: 'off', MEDIAMAKE_API_KEY: 'test-key', MEDIAMAKE_API_URL: url } });
    let out = '';
    child.stdout.on('data', chunk => (out += chunk));
    child.stderr.on('data', chunk => (out += chunk));
    child.on('close', code => resolve({ code, out }));
  });
  assert.equal(picked.code, 1);
  assert.match(picked.out, /1 file here differs from what the run saved, so nothing was changed:\n {2}out\/youtube\/doomcat-0412\/info\.json\nTo go on with the saved ones: mm todo pick td-wait22 --take-saved/);
  assert.equal(calls.findLast(call => call.path === '/api/space/todos' && call.body).body.action, 'release');

  // the to-do was given back: the Mac continues the run itself, and gets what the cloud saved
  Object.assign(run.steps[2], { state: 'todo', todo: undefined });
  // closed to the project, the Mac says nothing, though it could go on
  macOpenTo = [];
  assert.equal((await mac.mm(['--hook'])).out, '');
  macOpenTo = [P1];
  assert.match((await mac.mm(['--hook'])).out, /^MediaMake: a run is ready to continue that this place can do: doomcat-0412 \(Doomcat\), next step 3 "Upload to YouTube"/);
  assert.equal((await cloud.mm(['--hook'])).out, '');
  const differs = await mac.mm(['resume', 'doomcat-0412']);
  assert.equal(differs.code, 1);
  assert.match(differs.out, /1 file here differs from what the run saved, so nothing was changed:\n {2}out\/youtube\/doomcat-0412\/info\.json\nTo go on with the saved ones: mm run resume doomcat-0412 --take-saved/);
  assert.equal(run.hold, null); // it let go again
  assert.ok(!fs.existsSync(path.join(mac.work, 'projects', 'doomcat-0412'))); // and fetched nothing
  const resumed = await mac.mm(['resume', 'doomcat-0412', '--take-saved', '--project=Doomcat']);
  assert.equal(resumed.code, 0, resumed.out);
  assert.match(resumed.out, /✔ doomcat-0412 runs here \(Studio Mac\)/);
  assert.match(resumed.out, /Fetched: production doomcat-0412 v1 → projects\/doomcat-0412 and out\/doomcat-0412 \(2 files fetched, 0 already here\)/);
  assert.match(resumed.out, /Fetched: release doomcat-0412 v1 → out\/youtube\/doomcat-0412 \(1 file fetched, 0 already here, 1 of yours kept in \.before-resume\/\)/);
  assert.match(resumed.out, /Go on with step 3 \(Upload to YouTube\)/);
  assert.deepEqual([read(path.join(mac.work, 'projects', 'doomcat-0412', 'src', 'short.tsx')), read(path.join(mac.work, 'out', 'doomcat-0412', 'doomcat-0412.mp4')), read(path.join(mac.work, 'out', 'youtube', 'doomcat-0412', 'info.json'))], ['export const Short = () => null;\n', 'the short', '{"title":"Doomcat"}\n']);
  const backups = fs.readdirSync(path.join(mac.work, 'out', 'youtube', 'doomcat-0412', '.before-resume'));
  assert.equal(read(path.join(mac.work, 'out', 'youtube', 'doomcat-0412', '.before-resume', backups[0], 'info.json')), '{"title":"an older pack"}\n');

  assert.match((await mac.mm(['step', 'doomcat-0412', '3'])).out, /◐ Step 3 \(Upload to YouTube\) of doomcat-0412 started here\./);
  const status = await cloud.mm(['status', 'doomcat-0412']);
  assert.match(status.out, /Doomcat\n {2}◐ doomcat-0412 .*\n.*You have it on Studio Mac since/);
  const done = await mac.mm(['save', 'doomcat-0412', '3', '--output=https://youtu.be/x']);
  assert.match(done.out, /✔ Step 3 \(Upload to YouTube\) of doomcat-0412 is saved: https:\/\/youtu\.be\/x\.\n✔ doomcat-0412 ran to the end\./);
  assert.ok(calls.every(call => call.key === 'Bearer test-key'));
  // the hook never fails a session: a server that is gone says nothing
  const gone = await mac.mm(['--hook'], { MEDIAMAKE_API_URL: 'http://127.0.0.1:9' });
  assert.deepEqual([gone.code, gone.out], [0, '']);
});

test("a step this place lacks something for is done the run sheet's other way, when the sheet says one", async () => {
  // the sheet's "Without it" travels with the steps; "a to-do …" is not another way
  const { steps } = stepsOf(path.join(cloud.home, '.claude', 'skills', 'takes', 'SKILL.md'));
  assert.deepEqual(steps.map(step => step.without), ['the takes from the web only', 'a to-do for a computer signed in to the channel']);

  const takes = { n: 1, step: "The crowd's takes", needs: ['mcp:browse-hack'], places: ['Studio Mac'], yours: [], without: 'the takes from the web only' };
  const ready = view({ skill: 'takes', done: 0, steps: [{ n: 1, step: takes.step, needs: [{ need: 'mcp:browse-hack', label: 'Browse Hack' }], needsYes: false, repeat: true, state: 'todo', without: takes.without }], next: takes });
  assert.match(runLine(ready, []), /this place can do it the run sheet's other way \(no mcp:browse-hack\)/);
  assert.match(stepLines(ready, [])[0], /here the run sheet's other way \(no mcp:browse-hack\)/);
  assert.match(hookLine([ready], []), /^MediaMake: a run is ready to continue that this place can do/);
  const text = brief(ready, [], 'Cloud box');
  assert.match(text, /Go on with step 1 \(The crowd's takes\)/);
  assert.match(text, /This place has no mcp:browse-hack\. The run sheet says what to do without: "the takes from the web only"\. Do that here, so the run stays in one place\./);
  assert.match(text, /When it starts: {11}mm run step doomcat-0412 1 --without/);
  assert.doesNotMatch(brief(ready, ['mcp:browse-hack'], 'Studio Mac'), /--without/);

  run = null;
  const started = await cloud.mm(['start', 'Doomcat', 'takes-01', '--skill=takes']);
  assert.equal(started.code, 0, started.out);
  assert.match(started.out, /mm run step takes-01 1 --without/);
  // it says so before doing it another way, and names both ways
  const plain = await cloud.mm(['step', 'takes-01', '1']);
  assert.equal(plain.code, 1);
  assert.match(plain.out, /doesn't have what step 1 \(The crowd's takes\) needs: mcp:browse-hack\. The run sheet says what to do without: "the takes from the web only"\. To do that here: mm run step takes-01 1 --without\. To post it for a place that has it: mm run wait takes-01 1\./);
  const other = await cloud.mm(['step', 'takes-01', '1', '--without']);
  assert.equal(other.code, 0, other.out);
  assert.match(other.out, /◐ Step 1 \(The crowd's takes\) of takes-01 started here, without mcp:browse-hack: the takes from the web only\./);
  assert.deepEqual(run.steps[0].lacked, ['mcp:browse-hack']);
  const saved = await cloud.mm(['save', 'takes-01', '1', '--output=web takes only']);
  assert.match(saved.out, /Next, step 2 \(Upload\), needs browser:youtube\/doomcat, which this place doesn't have: mm run wait takes-01 2/);
  assert.match((await cloud.mm(['status', 'takes-01'])).out, /✔ 1\. The crowd's takes .*without mcp:browse-hack {3}web takes only/);
  // a step whose sheet says it waits is never done another way
  const upload = await cloud.mm(['step', 'takes-01', '2', '--without']);
  assert.equal(upload.code, 1);
  assert.match(upload.out, /needs: browser:youtube\/doomcat\. Post it for a place that has: mm run wait takes-01 2\./);
  // where a place has what the step needs, --without changes nothing
  run = null;
  const hack = place('Hack Mac', ['mcp:browse-hack']);
  await hack.mm(['start', 'Doomcat', 'takes-02', '--skill=takes']);
  const withIt = await hack.mm(['step', 'takes-02', '1', '--without']);
  assert.match(withIt.out, /◐ Step 1 \(The crowd's takes\) of takes-02 started here\.\n/);
  assert.equal(run.steps[0].lacked, undefined);
});
