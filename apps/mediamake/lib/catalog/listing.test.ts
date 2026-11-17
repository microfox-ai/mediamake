import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { listingTiles, mediaKindOf, parseTag, parseTags, withListingTags } from './listing';

const ID = 'dQw4w9WgXcQ';

describe('parseTag', () => {
  it('stores a tag in lowercase with dashes', () => {
    assert.equal(parseTag('  Lyric Video '), 'lyric-video');
    assert.equal(parseTag('#Anime_edits!'), 'anime-edits');
  });

  it('leaves out what is not a tag', () => {
    assert.equal(parseTag('   '), null);
    assert.equal(parseTag('!!!'), null);
    assert.equal(parseTag(7), null);
    assert.equal(parseTag('x'.repeat(31)), null);
  });

  it('keeps each tag once, in order', () => {
    assert.deepEqual(parseTags(['Video', 'video', '', 'YouTube']), ['video', 'youtube']);
  });
});

describe('mediaKindOf', () => {
  it('takes a YouTube link or a clip for a video, anything else for a picture', () => {
    assert.equal(mediaKindOf(`https://youtu.be/${ID}`), 'video');
    assert.equal(mediaKindOf('https://cdn.test/demo.mp4?x=1'), 'video');
    assert.equal(mediaKindOf('https://cdn.test/shot.png'), 'image');
    assert.equal(mediaKindOf('https://cdn.test/abc123'), 'image');
  });
});

describe('withListingTags', () => {
  it("adds the listing's tags after the item's own, each once", () => {
    const items = [
      { id: 'skill/a', tags: ['make'] },
      { id: 'mcp/b' },
      { id: 'skill/c', tags: ['pack'] },
    ];
    const out = withListingTags(items, [
      { id: 'skill/a', tags: ['video', 'make'] },
      { id: 'mcp/b', tags: ['browser'] },
      { id: 'skill/c', tags: [] },
    ]);
    assert.deepEqual(out[0].tags, ['make', 'video']);
    assert.deepEqual(out[1].tags, ['browser']);
    assert.equal(out[2], items[2]);
  });
});

describe('listingTiles', () => {
  it('plays a YouTube link, plays a clip and shows a picture', () => {
    const tiles = listingTiles([
      { kind: 'video', url: `https://www.youtube.com/watch?v=${ID}`, title: 'Walkthrough' },
      { kind: 'video', url: 'https://cdn.test/demo.mp4' },
      { kind: 'image', url: 'https://cdn.test/shot.png' },
    ]);
    assert.deepEqual(
      tiles.map(t => [t.key, t.kind, t.title]),
      [
        ['media-0', 'youtube', 'Walkthrough'],
        ['media-1', 'video', 'Video'],
        ['media-2', 'image', 'Screenshot 3'],
      ],
    );
    assert.equal(tiles[0].youtubeId, ID);
    assert.equal(tiles[1].src, 'https://cdn.test/demo.mp4');
    assert.equal(tiles[2].poster, 'https://cdn.test/shot.png');
  });
});
