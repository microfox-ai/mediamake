import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { spaceItemReadme, spaceOfKey } from './item-readme';
import { applyReport, MAX_README, parseItemReadme, parseSpaceReport, spaceView, userSpaceId, type SpaceReport, type SpaceState } from './space';

const SHA = (c: string) => c.repeat(64);
const MINE = userSpaceId('me');
const empty: SpaceState = { space: null, items: [] };
const report = (device: string, more: Partial<SpaceReport> = {}): SpaceReport => ({ device, repo: 'me/mediamake-space', pushed: true, items: [], ...more });

describe('an item README in a report', () => {
  it('keeps the text and the pictures beside it, and drops what it may not hold', () => {
    const readme = parseItemReadme({
      text: '# Pack\u0000 DistroKid\n\n![steps](shots/steps.png)',
      pictures: [
        { path: 'shots/steps.png', sha256: SHA('a'), type: 'image/png', bytes: 1000 },
        { path: 'shots/steps.png', sha256: SHA('b'), type: 'image/png', bytes: 1000 },
        { path: '../secret.png', sha256: SHA('c'), type: 'image/png', bytes: 10 },
        { path: '/etc/x.png', sha256: SHA('c'), type: 'image/png', bytes: 10 },
        { path: 'a.svg', sha256: SHA('d'), type: 'image/svg+xml', bytes: 10 },
        { path: 'big.png', sha256: SHA('e'), type: 'image/png', bytes: 3 * 1024 * 1024 },
        { path: 'bad.png', sha256: 'nothex', type: 'image/png', bytes: 10 },
      ],
    });
    assert.equal(readme?.text, '# Pack DistroKid\n\n![steps](shots/steps.png)');
    assert.deepEqual(readme?.pictures, [{ path: 'shots/steps.png', sha256: SHA('a'), type: 'image/png', bytes: 1000 }]);
  });

  it('is nothing without text, and is cut to the size a README may be', () => {
    assert.equal(parseItemReadme({ text: '   ' }), undefined);
    assert.equal(parseItemReadme('# text'), undefined);
    assert.equal(parseItemReadme({ text: 'x'.repeat(MAX_README + 10) })?.text.length, MAX_README);
  });

  it('travels with its item, follows the computer furthest along, and lists show only that it has one', () => {
    const items = [{ kind: 'skill', name: 'pack-distrokid', version: '0.1.0', readme: { text: '# Pack DistroKid', pictures: [{ path: 'headshot.jpg', sha256: SHA('f'), type: 'image/jpeg', bytes: 2000 }] } }];
    const parsed = parseSpaceReport({ device: 'mac-1', repo: 'me/mediamake-space', pushed: true, items });
    assert.ok(!('error' in parsed));
    const first = applyReport(empty, MINE, 'me', parsed as SpaceReport, '2026-11-18T10:00:00Z');
    assert.equal(first.items[0].readme?.text, '# Pack DistroKid');

    // a newer commit without the README takes it away, as it would a summary
    const state = { space: first.space, items: first.items };
    const next = applyReport(state, MINE, 'me', report('mac-1', { commit: 'abcdef1', commitAt: '2026-11-18T11:00:00Z', items: [{ kind: 'skill', name: 'pack-distrokid', version: '0.1.1' }] }), '2026-11-18T11:00:00Z');
    assert.equal(next.items[0].readme, undefined);

    assert.equal(spaceView(state, 'me')?.items[0].readme, true);
    assert.equal(spaceView({ space: next.space, items: next.items }, 'me')?.items[0].readme, undefined);
  });
});

describe("a space item's README", () => {
  it('shows each picture from where it was copied, by its path, and drops relative links', async () => {
    const urlOf = (space: string, picture: { sha256: string }) => `https://cdn.example/space-readmes/${space}/${picture.sha256}.png`;
    const readme = await spaceItemReadme(
      'user:abc',
      {
        text: '# Pack DistroKid\n\nWhat it does.\n\n![steps](./shots/steps.png) ![missing](shots/gone.png) [the skill](SKILL.md) [site](https://example.com)\n\n![out](../other/x.png)',
        pictures: [{ path: 'shots/steps.png', sha256: SHA('a'), type: 'image/png', bytes: 10 }],
      },
      urlOf,
    );
    assert.equal(readme.title, 'Pack DistroKid');
    assert.match(readme.html, new RegExp(`src="https://cdn.example/space-readmes/user:abc/${SHA('a')}.png"`));
    assert.doesNotMatch(readme.html, /gone\.png|other\/x\.png|href="SKILL\.md"/);
    assert.match(readme.html, /href="https:\/\/example\.com"/);
    assert.equal(readme.written, true);
  });

  it('finds the space from the dialog key', () => {
    const details = { kind: 'skill', name: 'pack-distrokid' };
    assert.deepEqual(spaceOfKey('space:user:abc:skill/pack-distrokid', details), { spaceId: 'user:abc', kind: 'skill', name: 'pack-distrokid' });
    assert.deepEqual(spaceOfKey(`space:project:${'a'.repeat(24)}:mcp/mac-recorder`, details), { spaceId: `project:${'a'.repeat(24)}`, kind: 'mcp', name: 'mac-recorder' });
    assert.deepEqual(spaceOfKey(`linked:${'b'.repeat(24)}`, details), { spaceId: `item:${'b'.repeat(24)}`, kind: 'skill', name: 'pack-distrokid' });
    assert.equal(spaceOfKey('catalog:skill/pack-distrokid', details), null);
    assert.equal(spaceOfKey('local:pack-distrokid', details), null);
  });
});
