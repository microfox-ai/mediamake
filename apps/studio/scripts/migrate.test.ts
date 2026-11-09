/**
 * mm migrate on throwaway folders: what moves whole, what merges, what is dropped or left, the
 * venv's scripts and the text files that name the old folder, and the catalog's paths; then the
 * move into the workspace: files git tracks staying, links, which folders move, the workspace's setup.
 *
 *   mm test:migrate
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { after, test } from 'node:test';
import { openDb } from './library/db.ts';
import { applyMigration, catalogPaths, planMigration, workspaceJobs } from './migrate.ts';
import { setupWorkspace } from './workspace-setup.ts';

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'mm-migrate-'));
after(() => fs.rmSync(tmp, { recursive: true, force: true }));
const from = path.join(tmp, 'apps', 'lyrics_videos');
const to = path.join(tmp, 'apps', 'studio');
const put = (root: string, rel: string, text: string) => {
  fs.mkdirSync(path.dirname(path.join(root, rel)), { recursive: true });
  fs.writeFileSync(path.join(root, rel), text);
};

// what git left behind after the pull, and what apps/studio already has
put(from, 'projects/nakama/input/song.mp3', 'song');
put(from, 'projects/nakama/notes.md', `song: ${from}/projects/nakama/input/song.mp3\nnot this one: ${from}_old/x\n`);
put(from, 'projects/sample-pulse/analysis/beats.json', '[]');
put(from, 'out/nakama/nakama.mp4', 'same video');
put(from, 'out/nakama/edits.json', 'old edits');
put(from, 'analysis/__pycache__/common.cpython-312.pyc', 'pyc');
put(from, 'analysis/.venv/bin/demucs', `#!${from}/analysis/.venv/bin/python\nimport demucs\n`);
put(from, 'analysis/.venv/pyvenv.cfg', 'home = /usr/bin\n');
put(from, 'node_modules/tailwindcss/package.json', '{}');
put(from, '.DS_Store', 'finder');
put(to, 'projects/sample-pulse/input/project.json', '{}');
put(to, 'out/nakama/nakama.mp4', 'same video');
put(to, 'out/nakama/edits.json', 'new edits');
put(to, 'analysis/pyproject.toml', '[project]');
put(to, 'node_modules/tailwindcss/package.json', '{}');

test('plan: whole moves, merges, same, rebuildable, conflicts, texts', () => {
  const plan = planMigration(from, to);
  assert.deepEqual(
    plan.moves.map(m => m.rel),
    [path.join('analysis', '.venv'), path.join('projects', 'nakama'), path.join('projects', 'sample-pulse', 'analysis')],
  );
  assert.equal(plan.moves.find(m => m.rel === path.join('projects', 'nakama'))?.files, 2);
  assert.deepEqual(plan.same, [path.join('out', 'nakama', 'nakama.mp4')]);
  assert.deepEqual(plan.conflicts, [path.join('out', 'nakama', 'edits.json')]);
  assert.deepEqual(plan.rebuild.sort(), ['.DS_Store', path.join('analysis', '__pycache__'), 'node_modules'].sort());
  assert.deepEqual(plan.texts, [path.join('projects', 'nakama', 'notes.md')]);
  assert.ok(fs.existsSync(path.join(from, 'projects', 'nakama')), 'a plan changes nothing');
});

test('apply: moves, rewrites, keeps the conflict, prunes the rest', () => {
  const left = applyMigration(planMigration(from, to));
  assert.deepEqual(left, [path.join('out', 'nakama', 'edits.json')]);
  assert.equal(fs.readFileSync(path.join(to, 'projects/nakama/input/song.mp3'), 'utf8'), 'song');
  assert.equal(fs.readFileSync(path.join(to, 'projects/sample-pulse/analysis/beats.json'), 'utf8'), '[]');
  assert.equal(fs.readFileSync(path.join(to, 'out/nakama/edits.json'), 'utf8'), 'new edits');
  assert.equal(fs.readFileSync(path.join(from, 'out/nakama/edits.json'), 'utf8'), 'old edits');
  assert.equal(
    fs.readFileSync(path.join(to, 'projects/nakama/notes.md'), 'utf8'),
    `song: ${to}/projects/nakama/input/song.mp3\nnot this one: ${from}_old/x\n`,
  );
  assert.equal(fs.readFileSync(path.join(to, 'analysis/.venv/bin/demucs'), 'utf8'), `#!${to}/analysis/.venv/bin/python\nimport demucs\n`);
  assert.deepEqual(fs.readdirSync(from), ['out'], 'only the conflict is left');
  assert.ok(!fs.existsSync(path.join(from, 'node_modules')));
});

test('catalog: absolute paths under the old folder point at the new one', () => {
  const db = openDb(path.join(tmp, 'library'));
  const loc = db.prepare("INSERT INTO locations (item_id, path, role, bytes, mtime, ino, seen_at) VALUES (?, ?, 'project', 1, 1, 1, 'now')");
  loc.run('a', path.join(from, 'projects/nakama/footage/a.mp4'));
  loc.run('b', path.join(from, 'projects/nakama/footage/b.mp4'));
  loc.run('b', path.join(to, 'projects/nakama/footage/b.mp4')); // a scan after the pull already found it
  loc.run('c', path.join(`${from}_old`, 'c.mp4'));
  db.prepare("INSERT INTO productions (slug, path, updated_at) VALUES ('nakama', ?, 'now')").run(path.join(from, 'projects', 'nakama'));
  const pairs: [string, string][] = [[from, to]];

  const dry = catalogPaths(db, pairs, false);
  assert.deepEqual(dry, [
    { table: 'locations', column: 'path', rows: 2, clashes: 1 },
    { table: 'productions', column: 'path', rows: 1, clashes: 0 },
  ]);
  assert.equal(Number((db.prepare('SELECT count(*) AS c FROM locations WHERE path LIKE ?').get(`${from}/%`) as { c: number }).c), 2);

  catalogPaths(db, pairs, true);
  const paths = (db.prepare('SELECT item_id, path FROM locations ORDER BY item_id').all() as { item_id: string; path: string }[]).map(r => [r.item_id, r.path]);
  assert.deepEqual(paths, [
    ['a', path.join(to, 'projects/nakama/footage/a.mp4')],
    ['b', path.join(to, 'projects/nakama/footage/b.mp4')],
    ['c', path.join(`${from}_old`, 'c.mp4')],
  ]);
  assert.equal((db.prepare("SELECT path FROM productions WHERE slug = 'nakama'").get() as { path: string }).path, path.join(to, 'projects', 'nakama'));
  assert.deepEqual(catalogPaths(db, pairs, false), [], 'a second run finds nothing');
  db.close();
});

// ── into the workspace
const studio = path.join(tmp, 'checkout', 'apps', 'studio');
const ws = path.join(tmp, 'MediaMake');

test('workspace: files git tracks stay, the folders around them are walked, links follow their targets', () => {
  put(studio, 'projects/demo/video/index.tsx', 'tracked');
  put(studio, 'projects/demo/analysis/beats.json', '[]');
  put(studio, 'projects/nakama/input/song.mp3', 'song');
  put(studio, 'out/nakama/nakama.mp4', 'video');
  put(studio, 'src/kit/index.ts', 'engine');
  fs.symlinkSync('../../src/kit', path.join(studio, 'projects/nakama/kit')); // the engine: stays behind
  fs.symlinkSync('../../out/nakama', path.join(studio, 'projects/nakama/renders')); // moves along
  fs.symlinkSync(path.join(studio, 'out/nakama/nakama.mp4'), path.join(studio, 'projects/nakama/final.mp4'));
  fs.symlinkSync('input/song.mp3', path.join(studio, 'projects/nakama/song.mp3')); // inside what moves
  const pairs: [string, string][] = ['projects', 'out'].map(f => [path.join(studio, f), path.join(ws, f)]);
  const keep = new Set([path.join('demo', 'video', 'index.tsx'), 'MOVED.md']);
  const plan = planMigration(path.join(studio, 'projects'), path.join(ws, 'projects'), pairs, keep);
  assert.deepEqual(plan.moves.map(m => m.rel), [path.join('demo', 'analysis'), 'nakama']);
  assert.deepEqual(plan.kept, [path.join('demo', 'video', 'index.tsx')]);
  assert.deepEqual(plan.links.sort(), [path.join('nakama', 'final.mp4'), path.join('nakama', 'kit')]);

  assert.deepEqual(applyMigration(plan, pairs), []);
  applyMigration(planMigration(path.join(studio, 'out'), path.join(ws, 'out'), pairs), pairs);
  const at = (r: string) => path.join(ws, 'projects', 'nakama', r);
  assert.equal(fs.readlinkSync(at('kit')), path.join(studio, 'src', 'kit'));
  assert.equal(fs.readlinkSync(at('renders')), '../../out/nakama');
  assert.equal(fs.readlinkSync(at('final.mp4')), path.join(ws, 'out', 'nakama', 'nakama.mp4'));
  assert.equal(fs.readlinkSync(at('song.mp3')), 'input/song.mp3');
  assert.equal(fs.readFileSync(at('renders/nakama.mp4'), 'utf8'), 'video');
  assert.equal(fs.readFileSync(path.join(studio, 'projects/demo/video/index.tsx'), 'utf8'), 'tracked');
  assert.equal(fs.readFileSync(path.join(ws, 'projects/demo/analysis/beats.json'), 'utf8'), '[]');
  assert.ok(!fs.existsSync(path.join(studio, 'out')), 'an emptied folder is gone');
});

test('workspace: which folders move where', () => {
  const env = { config: process.env.MEDIAMAKE_CONFIG, ws: process.env.MEDIAMAKE_WORKSPACE, home: process.env.HOME };
  try {
    const home = path.join(tmp, 'home');
    process.env.HOME = home;
    process.env.MEDIAMAKE_CONFIG = path.join(home, '.mediamake', 'config.json');
    delete process.env.MEDIAMAKE_WORKSPACE;
    const s = path.join(tmp, 'jobs', 'studio');
    put(s, 'projects/a/index.tsx', 'a');
    put(s, 'thumbnails/jobs/a/job.json', '{}');
    put(home, 'MediaMake/notes/make-lyrics-video.md', 'a lesson');
    const elsewhere = path.join(tmp, 'jobs', 'MediaMake');
    const names = (target: string) => workspaceJobs(target, s).map(j => `${j.name}:${path.relative(tmp, j.from)}`);
    assert.deepEqual(names(elsewhere), [`projects:${path.join('jobs', 'studio', 'projects')}`, `thumbnailJobs:${path.join('jobs', 'studio', 'thumbnails', 'jobs')}`, `notes:${path.join('home', 'MediaMake', 'notes')}`]);
    // ~/MediaMake itself: its notes are where they belong already
    assert.deepEqual(names(path.join(home, 'MediaMake')), [`projects:${path.join('jobs', 'studio', 'projects')}`, `thumbnailJobs:${path.join('jobs', 'studio', 'thumbnails', 'jobs')}`]);
    // a workspace already set: it moves too, when you name another
    process.env.MEDIAMAKE_WORKSPACE = elsewhere;
    put(elsewhere, 'out/a/a.mp4', 'v');
    assert.ok(names(path.join(tmp, 'jobs', 'Other')).includes(`out:${path.join('jobs', 'MediaMake', 'out')}`));
  } finally {
    for (const [k, v] of [['MEDIAMAKE_CONFIG', env.config], ['MEDIAMAKE_WORKSPACE', env.ws], ['HOME', env.home]] as const) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  }
});

test('workspace setup: a node_modules link and a tsconfig, kept current, your own tsconfig kept', () => {
  const s = path.join(tmp, 'setup', 'repo', 'apps', 'studio');
  const root = path.join(tmp, 'setup', 'ws');
  fs.mkdirSync(path.join(tmp, 'setup', 'repo', 'node_modules'), { recursive: true });
  assert.equal(setupWorkspace(root, s, false).length, 2);
  assert.ok(!fs.existsSync(root), 'a dry run changes nothing');
  assert.equal(setupWorkspace(root, s, true).length, 2);
  assert.equal(fs.readlinkSync(path.join(root, 'node_modules')), path.join(tmp, 'setup', 'repo', 'node_modules'));
  const tsconfig = JSON.parse(fs.readFileSync(path.join(root, 'tsconfig.json'), 'utf8'));
  assert.equal(tsconfig.extends, path.join(s, 'tsconfig.json'));
  assert.deepEqual(tsconfig.compilerOptions.rootDirs, ['.', s]);
  assert.deepEqual(setupWorkspace(root, s, true), [], 'nothing left to do');
  // the checkout moved: both follow
  const moved = path.join(tmp, 'setup', 'repo2', 'apps', 'studio');
  assert.equal(setupWorkspace(root, moved, true).length, 2);
  fs.writeFileSync(path.join(root, 'tsconfig.json'), '{ "mine": true }\n');
  assert.equal(setupWorkspace(root, s, true).length, 1, 'only the link: your own tsconfig stays');
  assert.equal(fs.readFileSync(path.join(root, 'tsconfig.json'), 'utf8'), '{ "mine": true }\n');
});
