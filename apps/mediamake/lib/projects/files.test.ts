import assert from 'node:assert/strict';
import { test } from 'node:test';
import { filesUnder, shareOf, sizedEntriesOf } from './files';

const files = [
  { path: 'README.md', size: 10 },
  { path: 'renders/master.mp4', size: 900 },
  { path: 'renders/previews/a.mp4', size: 60 },
  { path: 'renders/previews/b.mp4', size: 40 },
  { path: 'video/cut.ts', size: 5 },
  { path: 'cover.png', size: 300 },
];

test('a folder lists its folders first, each with everything under it', () => {
  assert.deepEqual(
    sizedEntriesOf(files, '').map(e => [e.name, e.folder, e.bytes, e.files]),
    [
      ['renders', true, 1000, 3],
      ['video', true, 5, 1],
      ['cover.png', false, 300, 1],
      ['README.md', false, 10, 1],
    ],
  );
  assert.deepEqual(
    sizedEntriesOf(files, 'renders').map(e => [e.name, e.folder, e.bytes]),
    [
      ['previews', true, 100],
      ['master.mp4', false, 900],
    ],
  );
  assert.equal(sizedEntriesOf(files, 'renders')[1].file?.path, 'renders/master.mp4');
  assert.deepEqual(sizedEntriesOf(files, 'render'), []);
  assert.equal(filesUnder(files, 'renders/previews').length, 2);
  assert.equal(filesUnder(files, '').length, 6);
});

test('a bar shows a share of the whole, and never hides something small', () => {
  assert.equal(shareOf(500, 1000), 50);
  assert.equal(shareOf(1, 1_000_000), 2);
  assert.equal(shareOf(0, 1000), 0);
  assert.equal(shareOf(10, 0), 0);
});
