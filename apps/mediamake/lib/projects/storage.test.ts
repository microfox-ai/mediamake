import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { GB, STORAGE_CAP_BYTES, bundleBytes, capsByTier, formatBytes, noRoomFor, parseRaise, storageCap, storageState } from './storage';

describe('cloud storage caps', () => {
  it('gives each membership its cap, rising up the ladder, and admins none', () => {
    assert.equal(storageCap('public'), 0);
    assert.ok(storageCap('plus')! < storageCap('pro')! && storageCap('pro')! < storageCap('cohort')!);
    assert.equal(storageCap('admin'), null);
    assert.deepEqual(capsByTier().map(entry => entry.tier), ['plus', 'pro', 'cohort', 'admin']);
  });

  it('lets an admin raise one person, and never lowers a cap', () => {
    assert.equal(storageCap('plus', { bytes: 50 * GB }), 50 * GB);
    assert.equal(storageCap('pro', { bytes: 10 * GB }), STORAGE_CAP_BYTES.pro);
    assert.equal(storageCap('admin', { bytes: 10 * GB }), null);
  });

  it('says how full it is', () => {
    assert.deepEqual(storageState(1 * GB, 5 * GB), { used: 1 * GB, cap: 5 * GB, left: 4 * GB, percent: 20, near: false, full: false });
    assert.equal(storageState(4.6 * GB, 5 * GB).near, true);
    assert.deepEqual([storageState(6 * GB, 5 * GB).full, storageState(6 * GB, 5 * GB).left, storageState(6 * GB, 5 * GB).percent], [true, 0, 100]);
    assert.deepEqual(storageState(900 * GB, null), { used: 900 * GB, cap: null, left: null, percent: 0, near: false, full: false });
  });

  it('refuses what does not fit, in words, and lets the rest through', () => {
    assert.equal(noRoomFor(1 * GB, 3 * GB, 5 * GB), null);
    assert.equal(noRoomFor(2 * GB, 3 * GB, 5 * GB), null);
    assert.match(noRoomFor(3 * GB, 3 * GB, 5 * GB)!, /needs 3 GB.*2 GB left of 5 GB/);
    assert.equal(noRoomFor(900 * GB, 0, null), null);
    assert.equal(noRoomFor(0, 9 * GB, 5 * GB), null);
    assert.match(noRoomFor(1, 0, 0)!, /0 B left/);
  });

  it('reads a raise as an admin sends it', () => {
    assert.deepEqual(parseRaise({ clientId: ' kar ', gb: 50, note: ' the AMV channel ' }), { clientId: 'kar', bytes: 50 * GB, note: 'the AMV channel' });
    assert.ok('error' in parseRaise({ clientId: 'kar' }));
    assert.ok('error' in parseRaise({ gb: 5 }));
    assert.ok('error' in parseRaise({ clientId: 'kar', gb: -1 }));
    assert.ok('error' in parseRaise({ clientId: 'kar', gb: 1e9 }));
  });

  it('writes sizes the way the upload limits do', () => {
    assert.deepEqual([formatBytes(0), formatBytes(12_400), formatBytes(340_000_000), formatBytes(1.25 * GB), formatBytes(25 * GB)], ['0 B', '12 KB', '340 MB', '1.3 GB', '25 GB']);
  });
});

describe('what a bundle stores', () => {
  it('counts a file that several versions share once', () => {
    const versions = [{ files: [{ key: 'a', size: 100 }, { key: 'b', size: 50 }] }, { files: [{ key: 'a', size: 100 }, { key: 'c', size: 25 }] }];
    assert.equal(bundleBytes({ versions }), 175);
    assert.equal(bundleBytes({}), 0);
  });
});
