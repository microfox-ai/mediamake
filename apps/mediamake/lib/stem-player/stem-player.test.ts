import assert from 'node:assert/strict';
import { test } from 'node:test';
import { afterSwitch, fitLoop, frameAfter, playFrom, positionAt, snap, wrap } from './clock';
import { findFolder, readFolder, reviewIndex } from './folders';
import { EMPTY, click, move, prune, selectAll, type Selection } from './selection';
import { isVersionsFolder, labelsOf, linkTries, skipFolder, tracksOf } from './tracks';

// ── tracks ────────────────────────────────────────────────────────────────────

const SUNO = ['Vocals', 'Bass', 'Drums', 'Backing Vocals'].flatMap(s => ['wav', 'mp3', 'mid'].map(ext => `sukuna - base - FINAL (${s}).${ext}`));

test('a stem that comes as WAV, MP3 and MIDI is one track, and the WAV plays', () => {
  const tracks = tracksOf(SUNO);
  assert.equal(tracks.length, 4);
  assert.deepEqual(tracks.map(t => t.format), ['wav', 'wav', 'wav', 'wav']);
  assert.deepEqual(tracks[0].also, ['mp3']);
  assert.ok(tracks.every(t => !t.file.endsWith('.mid')));
});

test('labels are what differs, without the brackets every stem shares', () => {
  assert.deepEqual(tracksOf(SUNO).map(t => t.label), ['Backing Vocals', 'Bass', 'Drums', 'Vocals']);
  assert.deepEqual(labelsOf(['song - A lift', 'song - B air']), ['A lift', 'B air']);
  assert.deepEqual(labelsOf(['only one']), ['only one']);
  // brackets stay when only some have them
  assert.deepEqual(labelsOf(['song (Vocals)', 'song mix']), ['(Vocals)', 'mix']);
});

test('the ID is the file name without its extension, as revision files name it', () => {
  assert.equal(tracksOf(SUNO)[1].id, 'sukuna - base - FINAL (Bass)');
});

test('keys: a version letter when the label starts with one, else its number; L, M and N are the screen\'s', () => {
  // by name: 00 original, A lift, C air, M mid (M is the screen's key, so it gets its number)
  assert.deepEqual(tracksOf(['s - 00 original.wav', 's - A lift.wav', 's - M mid.wav', 's - C air.wav']).map(t => t.key), ['1', 'A', 'C', '4']);
  assert.deepEqual(tracksOf(SUNO).map(t => t.key), ['1', '2', '3', '4']);
  assert.equal(tracksOf(Array.from({ length: 11 }, (_, i) => `take ${String(i + 1).padStart(2, '0')}.wav`))[10].key, '');
});

test('remaster.json names the file that plays and gives its label, key and levels', () => {
  const tracks = tracksOf(['x - a.wav', 'x - a.mp3', 'x - b.wav'], { remaster: { versions: [{ file: 'x - a.mp3', label: 'lift', key: 'Q', lufs: -12 }] } });
  assert.equal(tracks[0].file, 'x - a.mp3');
  assert.equal(tracks[0].label, 'lift');
  assert.equal(tracks[0].key, 'Q');
  assert.equal(tracks[0].info?.lufs, -12);
  assert.equal(tracks[1].info, undefined);
});

test('an index.json order comes first, the rest follow by name', () => {
  assert.deepEqual(tracksOf(['a.wav', 'b.wav', 'c.wav'], { order: ['c.wav', 'a'] }).map(t => t.id), ['c', 'a', 'b']);
});

test('versions folders and skipped folders', () => {
  assert.ok(isVersionsFolder('v1', 'remaster', ['a.wav']));
  assert.ok(isVersionsFolder('anything', 'song', ['a.wav', 'remaster.json']));
  assert.ok(!isVersionsFolder('v1', 'song', ['a.wav']));
  assert.ok(!isVersionsFolder('stems', undefined, ['a.wav']));
  assert.ok(['.git', 'x.revisions', '_LIBRARY', '_INBOX', 'node_modules'].every(skipFolder));
  assert.ok(!skipFolder('remaster'));
});

test('a link is tried whole, after the root\'s own name, then by its tails', () => {
  assert.deepEqual(linkTries('AMZ/song/remaster/v1', 'Downloads'), [['AMZ', 'song', 'remaster', 'v1'], ['song', 'remaster', 'v1'], ['remaster', 'v1'], ['v1']]);
  assert.deepEqual(linkTries('AMZ/song/remaster/v1', 'song')[1], ['remaster', 'v1']);
  // the root is the folder itself
  assert.ok(linkTries('AMZ/song/remaster/v1', 'v1').some(t => t.length === 0));
  assert.deepEqual(linkTries('../etc', 'x'), []);
});

// ── selection ─────────────────────────────────────────────────────────────────

const ORDER = ['a', 'b', 'c', 'd', 'e'];
const one = (id: string): Selection => ({ selected: [id], focus: id, anchor: id });

test('a click selects one; ⌘-click adds and removes; the last one stays', () => {
  assert.deepEqual(click(EMPTY, ORDER, 'b'), one('b'));
  const two = click(one('b'), ORDER, 'd', { toggle: true });
  assert.deepEqual(two, { selected: ['b', 'd'], focus: 'd', anchor: 'd' });
  // added out of order: kept in the sidebar's order
  assert.deepEqual(click(two, ORDER, 'a', { toggle: true }).selected, ['a', 'b', 'd']);
  assert.deepEqual(click(two, ORDER, 'd', { toggle: true }), { selected: ['b'], focus: 'b', anchor: 'b' });
  assert.deepEqual(click(one('b'), ORDER, 'b', { toggle: true }), one('b'));
});

test('Shift-click selects the range from where it started, either way', () => {
  assert.deepEqual(click(one('b'), ORDER, 'd', { range: true }), { selected: ['b', 'c', 'd'], focus: 'd', anchor: 'b' });
  assert.deepEqual(click(one('d'), ORDER, 'a', { range: true }).selected, ['a', 'b', 'c', 'd']);
});

test('arrows move one track and stop at the ends', () => {
  assert.deepEqual(move(one('b'), ORDER, 1), one('c'));
  assert.deepEqual(move(one('a'), ORDER, -1), one('a'));
  assert.deepEqual(move(one('e'), ORDER, 1), one('e'));
  assert.deepEqual(move(EMPTY, ORDER, 1), one('a'));
  assert.deepEqual(move(EMPTY, ORDER, -1), one('e'));
  // from a multi-selection: the next one alone
  assert.deepEqual(move({ selected: ['b', 'c'], focus: 'c', anchor: 'b' }, ORDER, 1), one('d'));
});

test('Shift-arrows grow the range, then shrink it back', () => {
  const grown = move(move(one('b'), ORDER, 1, true), ORDER, 1, true);
  assert.deepEqual(grown, { selected: ['b', 'c', 'd'], focus: 'd', anchor: 'b' });
  assert.deepEqual(move(grown, ORDER, -1, true), { selected: ['b', 'c'], focus: 'c', anchor: 'b' });
  // through the start and out the other side
  assert.deepEqual(move(move(move(one('b'), ORDER, 1, true), ORDER, -1, true), ORDER, -1, true).selected, ['a', 'b']);
});

test('a focus the sidebar no longer shows: arrows start from the top or the bottom', () => {
  assert.deepEqual(move(one('zz'), ORDER, 1), one('a'));
  assert.deepEqual(move(one('zz'), ORDER, -1), one('e'));
});

test('select all in a folder, and a closed root drops its tracks', () => {
  assert.deepEqual(selectAll(one('c'), ['b', 'c', 'd']), { selected: ['b', 'c', 'd'], focus: 'c', anchor: 'b' });
  assert.deepEqual(prune({ selected: ['a', 'x'], focus: 'x', anchor: 'x' }, id => id !== 'x'), one('a'));
  assert.deepEqual(prune(one('x'), () => false), EMPTY);
});

// ── the playhead ──────────────────────────────────────────────────────────────

const RATE = 48000;

test('the position follows the audio clock while playing and stands still while paused', () => {
  assert.equal(positionAt({ playing: false, offset: 12, startedAt: 0, loop: null }, 99, 200), 12);
  assert.equal(positionAt({ playing: true, offset: 12, startedAt: 100, loop: null }, 103.5, 200), 15.5);
  // before the tracks start (they start a hair in the future) it has not moved
  assert.equal(positionAt({ playing: true, offset: 12, startedAt: 100, loop: null }, 99.99, 200), 12);
  assert.equal(positionAt({ playing: true, offset: 198, startedAt: 0, loop: null }, 10, 200), 200);
  // nothing loaded yet: no end to stop at
  assert.equal(positionAt({ playing: true, offset: 198, startedAt: 0, loop: null }, 10, 0), 208);
});

test('a loop wraps the position', () => {
  const loop = { start: 10, end: 14 };
  assert.equal(wrap(13, loop), 13);
  assert.equal(wrap(15, loop), 11);
  assert.equal(positionAt({ playing: true, offset: 10, startedAt: 0, loop }, 9, 200), 11);
});

test('a new selection never moves the playhead, except a shorter one, which stops at its own end', () => {
  assert.deepEqual(afterSwitch(83.4, 200.8, null), { at: 83.4, stop: false });
  assert.deepEqual(afterSwitch(195, 192.16, null), { at: 192.16, stop: true });
  assert.deepEqual(afterSwitch(192.16, 192.16, null), { at: 192.16, stop: true });
  // the selected track is still loading: nothing to compare with
  assert.deepEqual(afterSwitch(195, 0, null), { at: 195, stop: false });
});

test('Space at the end starts from the beginning; anywhere else it carries on', () => {
  assert.equal(playFrom(200.8, 200.8, null), 0);
  assert.equal(playFrom(83.4, 200.8, null), 83.4);
  assert.equal(playFrom(0, 0, null), 0);
  assert.equal(playFrom(50, 200, { start: 10, end: 14 }), 10);
  assert.equal(playFrom(12, 200, { start: 10, end: 14 }), 12);
});

test('starts land on whole frames, so tracks started apart read the same sample', () => {
  assert.equal(frameAfter(1, RATE), RATE);
  assert.equal(frameAfter(1.00001, RATE), RATE + 1);
  assert.equal(snap(1.2345678, RATE) * RATE, Math.round(1.2345678 * RATE));
  // a track started at frame f0 from o0 and one started d frames later from where the song is then
  const f0 = frameAfter(3.1234, RATE);
  const o0 = snap(41.98765, RATE);
  const f1 = frameAfter(7.4321, RATE);
  const pos = snap(positionAt({ playing: true, offset: o0, startedAt: f0 / RATE, loop: null }, f1 / RATE, 300), RATE);
  assert.equal(Math.round(pos * RATE), Math.round(o0 * RATE) + (f1 - f0));
});

test('a loop range is kept inside the song and dropped when too short', () => {
  assert.deepEqual(fitLoop({ start: -1, end: 500 }, 200, RATE), { start: 0, end: 200 });
  assert.equal(fitLoop({ start: 5, end: 5.01 }, 200, RATE), null);
  assert.equal(fitLoop(null, 200, RATE), null);
});

// ── folders (read through a stand-in for the browser's folder handles) ─────────

type Tree = { [name: string]: Tree | string };

/** A folder handle over a plain object: a string is a file's text, an object a folder. */
function fakeDir(name: string, tree: Tree): FileSystemDirectoryHandle {
  const handle = {
    kind: 'directory',
    name,
    async *values() {
      for (const [n, v] of Object.entries(tree)) yield typeof v === 'string' ? { kind: 'file', name: n } : fakeDir(n, v);
    },
    async getDirectoryHandle(n: string) {
      const v = tree[n];
      if (v === undefined || typeof v === 'string') throw new DOMException(`${n} not found`, 'NotFoundError');
      return fakeDir(n, v);
    },
    async getFileHandle(n: string) {
      const v = tree[n];
      if (typeof v !== 'string') throw new DOMException(`${n} not found`, 'NotFoundError');
      return { kind: 'file', name: n, getFile: async () => new File([v], n, { lastModified: 1 }) };
    },
  };
  return handle as unknown as FileSystemDirectoryHandle;
}

const DOWNLOADS: Tree = {
  AMZ: {
    song: {
      'song.wav': '',
      'cover.jpg': '',
      remaster: {
        v1: { 'song - 00 original.wav': '', 'song - A lift.wav': '', 'remaster.json': JSON.stringify({ title: 'Song', versions: [{ file: 'song - A lift.wav', lufs: -10.5 }] }) },
        v2: { 'notes.txt': '' },
      },
      'song.transcript.revisions': { 'rev-001.json': '{}' },
      '.hidden': { 'x.wav': '' },
    },
  },
  _LIBRARY: { 'x.wav': '' },
};

test('a folder is read one level deep: its tracks and its folders, without the ones the tree never shows', async () => {
  const song = await readFolder(await (await fakeDir('Downloads', DOWNLOADS).getDirectoryHandle('AMZ')).getDirectoryHandle('song'), 'AMZ');
  assert.deepEqual(song.tracks.map(t => t.id), ['song']);
  assert.deepEqual(song.folders.map(f => f.name), ['remaster']);
  assert.equal(song.versions, false);
  const top = await readFolder(fakeDir('Downloads', DOWNLOADS));
  assert.deepEqual([top.tracks.length, top.folders.map(f => f.name)], [0, ['AMZ']]);
});

test('a remaster ladder is a versions folder and carries what remaster.json knows', async () => {
  const remaster = await (await (await fakeDir('Downloads', DOWNLOADS).getDirectoryHandle('AMZ')).getDirectoryHandle('song')).getDirectoryHandle('remaster');
  const v1 = await readFolder(await remaster.getDirectoryHandle('v1'), 'remaster');
  assert.equal(v1.versions, true);
  assert.equal(v1.remaster?.title, 'Song');
  assert.deepEqual(v1.tracks.map(t => [t.label, t.key, t.info?.lufs]), [['00 original', '1', undefined], ['A lift', 'A', -10.5]]);
  // a folder with no audio is nothing to review
  assert.equal((await readFolder(await remaster.getDirectoryHandle('v2'), 'remaster')).versions, false);
});

test('a link is found under a root: from Downloads, from inside its path, and when the root is the folder itself', async () => {
  const downloads = fakeDir('Downloads', DOWNLOADS);
  assert.deepEqual(await findFolder(downloads, 'AMZ/song/remaster/v1'), ['AMZ', 'song', 'remaster', 'v1']);
  const song = await (await downloads.getDirectoryHandle('AMZ')).getDirectoryHandle('song');
  assert.deepEqual(await findFolder(song, 'AMZ/song/remaster/v1'), ['remaster', 'v1']);
  const v1 = await (await song.getDirectoryHandle('remaster')).getDirectoryHandle('v1');
  assert.deepEqual(await findFolder(v1, 'AMZ/song/remaster/v1'), []);
  // a folder without audio, or one that isn't there, is not a hit
  assert.equal(await findFolder(downloads, 'AMZ/song/remaster/v2'), null);
  assert.equal(await findFolder(downloads, 'AMZ/other/remaster/v9'), null);
});

test('the set a review writes about: the ladder\'s title, path and versions by ID', async () => {
  const v1 = await readFolder(await (await (await (await fakeDir('Downloads', DOWNLOADS).getDirectoryHandle('AMZ')).getDirectoryHandle('song')).getDirectoryHandle('remaster')).getDirectoryHandle('v1'), 'remaster');
  const index = reviewIndex('v1', v1, { ladder: true, path: '/Users/me/Downloads/AMZ/song/remaster/v1' });
  assert.equal(index.kind, 'remaster');
  assert.equal(index.title, 'Song');
  assert.equal(index.workflow, 'make-music-remaster-loudness');
  assert.equal(index.path, '/Users/me/Downloads/AMZ/song/remaster/v1');
  assert.deepEqual(index.styles[0].variants.map(v => v.id), ['song - 00 original', 'song - A lift']);
  // a folder the user only chose to compare was not made by the remaster skill
  assert.equal(reviewIndex('takes', { tracks: v1.tracks, remaster: null, index: null }, { ladder: false }).workflow, undefined);
});
