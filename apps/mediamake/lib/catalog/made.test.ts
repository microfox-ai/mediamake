import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { madeIdOf, madeShown, madeTiles, parseMade, type MadeEntry } from './made';

const entry = (id: string, at: string, by: string, rest: Partial<MadeEntry> = {}): MadeEntry => ({ id, key: 'catalog:skill/pack-brand-kit', title: `Made ${id}`, by, at, ...rest });

describe('what members made with an item', () => {
  it('takes a title, and https links only', () => {
    assert.deepEqual(parseMade({ key: 'catalog:mcp/figcraft', title: '  My thumbnail ', url: 'https://youtu.be/dQw4w9WgXcQ', image: '' }), {
      key: 'catalog:mcp/figcraft',
      title: 'My thumbnail',
      url: 'https://youtu.be/dQw4w9WgXcQ',
    });
    assert.ok('error' in parseMade({ key: 'catalog:mcp/figcraft', title: '' }));
    assert.ok('error' in parseMade({ key: 'catalog:mcp/figcraft', title: 'x', url: 'http://plain.example' }));
    assert.ok('error' in parseMade({ key: 'catalog:mcp/figcraft', title: 'x', image: 'javascript:alert(1)' }));
    assert.ok('error' in parseMade({ key: 'catalog:tutorial/x', title: 'x' }));
    assert.ok(!('error' in parseMade({ key: 'space:proj_1:skill/make-my-intro', title: 'x' })));
  });

  it('shows the newest first, marks the viewer\'s own and never says who added one', () => {
    const shown = madeShown([entry('a', '2026-11-01', 'me'), entry('b', '2026-11-05', 'someone', { url: 'https://youtu.be/dQw4w9WgXcQ' })], 'me');
    assert.deepEqual(shown.map(found => [found.id, !!found.mine]), [['b', false], ['a', true]]);
    assert.ok(shown.every(found => !('by' in found)));
    assert.ok(madeShown([entry('a', '2026-11-01', 'me')]).every(found => !found.mine));
  });

  it('makes gallery tiles: a YouTube link plays, a picture shows, the rest is a titled link', () => {
    const tiles = madeTiles(madeShown([entry('a', '2026-11-03', 'x', { url: 'https://youtu.be/dQw4w9WgXcQ' }), entry('b', '2026-11-02', 'x', { image: 'https://cdn.example/p.png' }), entry('c', '2026-11-01', 'x')]));
    assert.deepEqual(tiles.map(tile => [tile.key, tile.kind]), [['made-a', 'youtube'], ['made-b', 'image'], ['made-c', 'link']]);
    assert.equal(madeIdOf('made-a'), 'a');
    assert.equal(madeIdOf('proof-0'), undefined);
  });
});
