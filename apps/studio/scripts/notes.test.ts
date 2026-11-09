/**
 * mm notes on throwaway folders: where notes go, how they are written and read, what the shared log
 * already has, tidy, and promote end to end (a bare origin, a clone, the branch it pushes).
 *
 *   mm test:notes
 */
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { after, beforeEach, test } from 'node:test';
import { addNote, appendToLog, formatEntry, notesFile, notesOf, parseEntries, planPromote, promote, tidy, workspaceRoot } from './notes.ts';

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'mm-notes-test-'));
after(() => fs.rmSync(tmp, { recursive: true, force: true }));
const HOME = process.env.HOME;
process.env.HOME = path.join(tmp, 'home');
after(() => {
  process.env.HOME = HOME;
});

const git = (cwd: string, ...a: string[]) => {
  const r = spawnSync('git', a, { cwd, encoding: 'utf8' });
  assert.equal(r.status, 0, `git ${a.join(' ')}: ${r.stderr}`);
  return r.stdout.trim();
};

const SKILL = `---
name: demo-skill
description: A demo. New user feedback goes in your notes (mm notes add), never in this file.
---

# demo-skill

Do the thing.

## Lessons log

This log is shared.

- 2026-10-24 — First project: masks change the picture without cuts.
- 2026-10-25 — "too slow" → faster cuts in the chorus.
`;
const VARIANT = `---
name: demo-skill-like-x
description: Variant.
metadata:
  variant-of: demo-skill
---

# demo-skill-like-x

## Feedback log

- 2026-10-26 · kept the base's way.
`;

// a GitHub-like origin and a clone of it, the user's checkout
const origin = path.join(tmp, 'origin.git');
const repo = path.join(tmp, 'repo');
fs.mkdirSync(origin);
git(origin, 'init', '--quiet', '--bare', '--initial-branch=main');
git(tmp, 'clone', '--quiet', origin, repo);
git(repo, 'checkout', '--quiet', '-B', 'main');
git(repo, 'config', 'user.name', 'Test');
git(repo, 'config', 'user.email', 'test@example.com');
for (const [name, text] of [
  ['demo-skill', SKILL],
  ['demo-skill-like-x', VARIANT],
]) {
  fs.mkdirSync(path.join(repo, '.agents', 'skills', name), { recursive: true });
  fs.writeFileSync(path.join(repo, '.agents', 'skills', name, 'SKILL.md'), text);
}
git(repo, 'add', '.');
git(repo, 'commit', '--quiet', '-m', 'skills');
git(repo, 'push', '--quiet', '-u', 'origin', 'main');

const ws = path.join(tmp, 'workspace');
beforeEach(() => {
  process.env.MEDIAMAKE_WORKSPACE = ws;
  fs.rmSync(ws, { recursive: true, force: true });
});

test('the workspace: MEDIAMAKE_WORKSPACE, else the config, else ~/MediaMake', () => {
  assert.equal(workspaceRoot(), ws);
  delete process.env.MEDIAMAKE_WORKSPACE;
  const config = path.join(tmp, 'config.json');
  process.env.MEDIAMAKE_CONFIG = config;
  try {
    assert.equal(workspaceRoot(), path.join(tmp, 'home', 'MediaMake'));
    fs.writeFileSync(config, JSON.stringify({ workspace: '~/Work/MM', library: {} }));
    assert.equal(workspaceRoot(), path.join(tmp, 'home', 'Work', 'MM'));
    fs.writeFileSync(config, '{ not json');
    assert.equal(workspaceRoot(), path.join(tmp, 'home', 'MediaMake'));
  } finally {
    delete process.env.MEDIAMAKE_CONFIG;
    process.env.MEDIAMAKE_WORKSPACE = ws;
  }
  assert.equal(notesFile('demo-skill'), path.join(ws, 'notes', 'demo-skill.md'));
});

test('an entry is dated and wrapped lines are indented, as the logs are written', () => {
  assert.equal(formatEntry('"slower" → hold the shot', '2026-11-09'), '- 2026-11-09 · "slower" → hold the shot');
  assert.equal(formatEntry('- 2026-11-01 · already dated', '2026-11-09'), '- 2026-11-01 · already dated');
  assert.equal(formatEntry('first line\n  second line\n', '2026-11-09'), '- 2026-11-09 · first line\n  second line');
  assert.throws(() => formatEntry('   '), /empty note/);
  const entries = parseEntries('# head\n\ntext\n\n- 2026-10-24 — one\n  wrapped\n- 2026-10-25 · two\n\n- three, no date\n');
  assert.deepEqual(
    entries.map(e => [e.line, e.lines, e.date, e.body]),
    [
      [5, 2, '2026-10-24', 'one\n  wrapped'],
      [7, 1, '2026-10-25', 'two'],
      [9, 1, undefined, 'three, no date'],
    ],
  );
});

test('add writes into the workspace, never the skill, and knows only real skills', () => {
  const before = fs.readFileSync(path.join(repo, '.agents', 'skills', 'demo-skill', 'SKILL.md'), 'utf8');
  const r = addNote('demo-skill', '"too dark" → lift the shadows a stop', { date: '2026-11-09', repo });
  assert.equal(r.file, path.join(ws, 'notes', 'demo-skill.md'));
  addNote('demo-skill', 'a second one', { date: '2026-11-09', repo });
  const text = fs.readFileSync(r.file, 'utf8');
  assert.match(text, /^# demo-skill: your notes\n/);
  assert.ok(text.endsWith('- 2026-11-09 · "too dark" → lift the shadows a stop\n- 2026-11-09 · a second one\n'));
  assert.equal(fs.readFileSync(path.join(repo, '.agents', 'skills', 'demo-skill', 'SKILL.md'), 'utf8'), before);
  assert.throws(() => addNote('no-such-skill', 'x', { repo }), /No skill "no-such-skill"/);
  assert.throws(() => addNote('../etc', 'x', { repo }), /isn't a skill name/);
  assert.deepEqual(addNote('demo-skill', 'see /Users/someone/Desktop/x.mp4', { repo }).leaks, ['has a path on this machine']);
});

test('a note the shared log already has is "shared"; tidy drops only those', () => {
  addNote('demo-skill', '"too slow" → faster cuts in the chorus.', { date: '2026-10-25', repo });
  addNote('demo-skill', 'only here', { date: '2026-11-09', repo });
  assert.deepEqual(
    notesOf('demo-skill', repo).notes.map(n => n.status),
    ['shared', 'new'],
  );
  assert.equal(tidy('demo-skill', { repo }).drop.length, 1);
  assert.equal(notesOf('demo-skill', repo).notes.length, 2, 'a dry run changes nothing');
  tidy('demo-skill', { repo, yes: true });
  assert.deepEqual(
    notesOf('demo-skill', repo).notes.map(n => n.body),
    ['only here'],
  );
});

test("appendToLog adds at the end of the log, in the log's own separator", () => {
  const [note] = parseEntries('- 2026-11-09 · new rule\n  wrapped');
  const out = appendToLog(SKILL, [note]);
  assert.ok(out.endsWith('- 2026-10-25 — "too slow" → faster cuts in the chorus.\n- 2026-11-09 — new rule\n  wrapped\n'));
  const withAfter = appendToLog(`${VARIANT}\n## Later\n\ntext\n`, [note]);
  assert.match(withAfter, /- 2026-10-26 · kept the base's way\.\n- 2026-11-09 · new rule\n {2}wrapped\n\n## Later\n\ntext\n$/);
  assert.throws(() => appendToLog('# no log\n', [note]), /no "## Feedback log"/);
});

test('promote: a dry run plans; --yes pushes a branch with the notes and never touches the checkout', () => {
  addNote('demo-skill', '"brighter" → lift the mids', { date: '2026-11-09', repo });
  addNote('demo-skill-like-x', 'kept the look → keep it', { date: '2026-11-09', repo });
  addNote('demo-skill-like-x', 'from /home/someone/x', { date: '2026-11-09', repo });
  const plan = planPromote(['demo-skill', 'demo-skill-like-x'], repo);
  assert.equal(plan[0].problems.length, 0);
  assert.match(plan[1].problems.join(), /path on this machine/);
  const head = git(repo, 'rev-parse', 'HEAD');
  const r = promote(plan, { repo, pr: false, now: new Date('2026-11-09T10:00:00Z') });
  assert.equal(r.branch, 'notes/demo-skill-20261109-1000');
  assert.ok(r.pushed);
  assert.equal(r.sent, 1);
  // the checkout is as it was: same commit, clean, no worktree or local branch left
  assert.equal(git(repo, 'rev-parse', 'HEAD'), head);
  assert.equal(git(repo, 'status', '--porcelain'), '');
  assert.equal(git(repo, 'worktree', 'list').split('\n').length, 1);
  assert.equal(git(repo, 'branch', '--list', r.branch), '');
  // the branch on the remote has the note at the end of the log
  const pushed = git(origin, 'show', `${r.branch}:.agents/skills/demo-skill/SKILL.md`);
  assert.ok(pushed.endsWith('- 2026-10-25 — "too slow" → faster cuts in the chorus.\n- 2026-11-09 — "brighter" → lift the mids'));
  assert.equal(git(origin, 'log', '-1', '--format=%s', r.branch), 'skill(demo-skill): 1 lesson from notes');
  // sent once: the next plan has nothing new, unless asked again
  assert.deepEqual(
    notesOf('demo-skill', repo).notes.map(n => n.status),
    ['sent'],
  );
  assert.equal(planPromote(['demo-skill'], repo)[0].notes.length, 0);
  assert.equal(planPromote(['demo-skill'], repo, { again: true })[0].notes.length, 1);
  assert.throws(() => promote(planPromote(['demo-skill'], repo), { repo, pr: false }), /Nothing to send/);
});

test('promote --no-push keeps the commit on a local branch, and a local skill is refused', () => {
  addNote('demo-skill', 'kept here', { date: '2026-11-09', repo });
  const r = promote(planPromote(['demo-skill'], repo), { repo, push: false, now: new Date('2026-11-09T11:00:00Z') });
  assert.equal(r.pushed, false);
  assert.notEqual(git(repo, 'branch', '--list', r.branch), '');
  git(repo, 'branch', '-D', r.branch);
  const own = path.join(tmp, 'home', '.claude', 'skills', 'my-own-skill');
  fs.mkdirSync(own, { recursive: true });
  fs.writeFileSync(path.join(own, 'SKILL.md'), '---\nname: my-own-skill\n---\n\n## Feedback log\n');
  addNote('my-own-skill', 'mine', { repo });
  assert.match(planPromote(['my-own-skill'], repo)[0].problems.join(), /your own skill/);
});
