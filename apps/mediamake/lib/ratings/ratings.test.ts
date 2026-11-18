import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { parseRating, ratingLabel, summaryOf, withRatings } from './ratings';

describe('parseRating', () => {
  it('takes a skill, MCP or app and 1 to 5 whole stars', () => {
    assert.deepEqual(parseRating({ itemId: 'skill/pack-brand-kit', stars: 5, version: ' 1.2.0 ', source: 'mm-use' }), { itemId: 'skill/pack-brand-kit', stars: 5, version: '1.2.0', source: 'mm-use' });
    assert.deepEqual(parseRating({ itemId: 'mcp/browse-hack', stars: 1 }), { itemId: 'mcp/browse-hack', stars: 1, source: 'api' });
  });

  it('refuses anything else', () => {
    for (const body of [null, {}, { itemId: 'tutorial/x', stars: 3 }, { itemId: 'skill/x', stars: 0 }, { itemId: 'skill/x', stars: 6 }, { itemId: 'skill/x', stars: 4.5 }, { itemId: 'skill/x', stars: '5' }]) {
      assert.ok('error' in parseRating(body), JSON.stringify(body));
    }
  });
});

describe('summaryOf', () => {
  it('averages to one decimal; nothing when nobody rated', () => {
    assert.equal(summaryOf([]), null);
    assert.deepEqual(summaryOf([5, 4, 4]), { average: 4.3, count: 3 });
    assert.equal(ratingLabel({ average: 4, count: 12 }), '4.0 (12)');
  });
});

describe('withRatings', () => {
  it('puts each rated item its rating on, and leaves the others as they are', () => {
    const items = [{ id: 'skill/a' }, { id: 'mcp/b' }];
    const out = withRatings(items, new Map([['mcp/b', { average: 4.5, count: 2 }]]));
    assert.equal(out[0], items[0]);
    assert.deepEqual(out[1], { id: 'mcp/b', rating: { average: 4.5, count: 2 } });
  });
});
