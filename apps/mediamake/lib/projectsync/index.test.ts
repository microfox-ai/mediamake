import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { INPUT_LIMIT_BYTES, checkListing, cleanPath, mediaKindOf, toResponse, type BundleDoc } from '.';

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
