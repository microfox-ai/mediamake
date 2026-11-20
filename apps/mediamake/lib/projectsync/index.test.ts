import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { INPUT_LIMIT_BYTES, checkListing, cleanPath, fileKinds, mediaKindOf, thumbFile, thumbOf, toResponse, type BundleDoc, type BundleFile } from '.';

const sha = 'a'.repeat(64);

describe('cleanPath', () => {
  it('normalises slashes and refuses paths that climb out', () => {
    assert.equal(cleanPath('./code\\video/edl.ts'), 'code/video/edl.ts');
    assert.equal(cleanPath('../secrets'), null);
    assert.equal(cleanPath('a/../../b'), null);
    assert.equal(cleanPath(''), null);
  });
});

describe('checkListing', () => {
  it('takes code, outputs and inputs for a production', () => {
    const r = checkListing('production', [
      { path: 'code/edl.ts', size: 10, sha256: sha },
      { path: 'output/song.mp4', size: 10, sha256: sha, role: 'output' },
    ]);
    assert.ok(r.ok);
    if (r.ok) assert.deepEqual(r.files.map(f => f.role), ['code', 'output']);
  });

  it('refuses inputs over 200 MB in all, duplicate paths and bad digests', () => {
    const big = checkListing('production', [{ path: 'input/a.mov', size: INPUT_LIMIT_BYTES + 1, sha256: sha, role: 'input' }]);
    assert.ok(!big.ok && /200 MB/.test(big.error));
    const twice = checkListing('release', [{ path: 'a.png', size: 1, sha256: sha }, { path: './a.png', size: 1, sha256: sha }]);
    assert.ok(!twice.ok && /twice/.test(twice.error));
    assert.ok(!checkListing('release', [{ path: 'a.png', size: 1, sha256: 'nope' }]).ok);
  });

  it("files every release file as `file`, whatever role it was sent with", () => {
    const r = checkListing('release', [{ path: 'title.txt', size: 1, sha256: sha, role: 'code' }]);
    assert.ok(r.ok && r.files[0].role === 'file');
  });
});

describe('toResponse', () => {
  it('never hands out storage keys', () => {
    const doc: BundleDoc = {
      projectId: 'p', kind: 'production', slug: 's', title: 'S', latestVersion: 1, createdAt: '', createdBy: 'c', updatedAt: '',
      versions: [{ version: 1, status: 'ready', createdAt: '', createdBy: 'c', files: [{ path: 'code/a.ts', role: 'code', size: 3, sha256: sha, contentType: 'text/plain', key: 'secret/key' }] }],
    };
    const body = toResponse(doc, { full: true });
    assert.equal(body.fileCount, 1);
    assert.ok(!JSON.stringify(body).includes('secret/key'));
  });
});

describe('mediaKindOf', () => {
  it('maps MIME types to the media library kinds', () => {
    assert.equal(mediaKindOf('image/png'), 'image');
    assert.equal(mediaKindOf('audio/wav'), 'audio');
    assert.equal(mediaKindOf('application/pdf'), 'document');
    assert.equal(mediaKindOf('font/ttf'), 'unknown');
  });
});

describe('what a card says about a record', () => {
  const file = (path: string, size: number, key = path, role: BundleFile['role'] = 'file'): BundleFile => ({ path, role, size, sha256: sha, contentType: '', key });
  const doc = (versions: BundleFile[][], thumb?: string): BundleDoc => ({
    projectId: 'p',
    kind: 'release',
    slug: 'kit',
    title: 'Kit',
    versions: versions.map((files, i) => ({ version: i + 1, status: 'ready', files, createdAt: '', createdBy: 'kar' })),
    latestVersion: versions.length,
    createdAt: '',
    createdBy: 'kar',
    updatedAt: '',
    ...(thumb && { thumb: { path: thumb } }),
  });

  it('counts every version it keeps, a file they share once, beside the latest version alone', () => {
    const v1 = [file('master.mp4', 900, 'k1'), file('title.txt', 10, 'k2')];
    const v2 = [file('master.mp4', 950, 'k3'), file('title.txt', 10, 'k2'), file('thumbnail.png', 40, 'k4')];
    const answer = toResponse(doc([v1, v2]));
    assert.deepEqual([answer.bytes, answer.storedBytes, answer.versionCount, answer.fileCount], [1000, 1900, 2, 3]);
    assert.deepEqual(answer.kinds, { video: 1, doc: 1, image: 1 });
  });

  it('sorts files into pictures, videos, audio, things to read and code', () => {
    assert.deepEqual(fileKinds([file('a.png', 1), file('b.wav', 1), file('info.json', 1), file('notes.md', 1), file('font.ttf', 1)]), { image: 1, audio: 1, doc: 2, other: 1 });
    assert.deepEqual(fileKinds([file('code/video/index.tsx', 1, 'a', 'code'), file('input/lyrics.json', 1, 'b', 'input'), file('output/final.mp4', 1, 'c', 'output')]), { code: 2, video: 1 });
  });

  it('picks the picture named for it, else any picture, else a video, else nothing', () => {
    assert.equal(thumbOf([file('art/01.png', 1), file('cover.jpg', 1), file('master.mp4', 1)])?.path, 'cover.jpg');
    assert.equal(thumbOf([file('thumbnails/a.png', 1), file('b.png', 1)])?.path, 'thumbnails/a.png');
    assert.deepEqual([thumbOf([file('logo.svg', 1), file('master.mp4', 1)])?.path, thumbOf([file('master.mp4', 1)])?.kind], ['master.mp4', 'video']);
    assert.equal(thumbOf([file('master.wav', 1), file('lyrics.txt', 1)]), null);
  });

  it('keeps the file marked when it was filed while the latest version has it', () => {
    const files = [file('cover.jpg', 1), file('alt.png', 1)];
    assert.equal(thumbFile(doc([files], 'alt.png'))?.path, 'alt.png');
    assert.equal(thumbFile(doc([files], 'gone.png'))?.path, 'cover.jpg');
    assert.equal(thumbFile(doc([[file('song.wav', 1)]])), null);
  });
});
