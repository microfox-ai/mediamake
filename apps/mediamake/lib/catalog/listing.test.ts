import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { headshotOf, isEmptyListing, listingBadges, listingTiles, mediaKindOf, parseTag, parseTags, sizeLabel, withListing } from './listing';

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

describe('withListing', () => {
  it("adds the listing's tags after the item's own, each once", () => {
    const items = [
      { id: 'skill/a', tags: ['make'] },
      { id: 'mcp/b' },
      { id: 'skill/c', tags: ['pack'] },
    ];
    const out = withListing(items, [
      { id: 'skill/a', tags: ['video', 'make'] },
      { id: 'mcp/b', tags: ['browser'] },
      { id: 'skill/c', tags: [] },
    ]);
    assert.deepEqual(out[0].tags, ['make', 'video']);
    assert.deepEqual(out[1].tags, ['browser']);
    assert.equal(out[2].tags, items[2].tags);
  });

  it("shows the listing's description, headshot and icon in place of the item's own", () => {
    const [out, same] = withListing(
      [
        { id: 'mcp/b', summary: 'Its summary', headshot: 'https://cdn.test/old.jpg' },
        { id: 'skill/a', summary: 'Kept' },
      ],
      [{ id: 'mcp/b', tags: [], description: 'For people', headshot: 'https://cdn.test/head.jpg', icon: 'https://cdn.test/icon.png' }],
    );
    assert.deepEqual(out, { id: 'mcp/b', summary: 'For people', headshot: 'https://cdn.test/head.jpg', icon: 'https://cdn.test/icon.png' });
    assert.equal(same.summary, 'Kept');
  });
});

describe('a listing', () => {
  it('is empty only when nothing is set on it', () => {
    assert.equal(isEmptyListing({ tags: [], media: [] }), true);
    assert.equal(isEmptyListing({ tags: [], media: [], description: '' }), true);
    assert.equal(isEmptyListing({ tags: [], media: [], readme: '# T' }), false);
    assert.equal(isEmptyListing({ tags: [], media: [], icon: 'https://cdn.test/i.png' }), false);
  });

  it("takes its headshot from the listing, else from its video's thumbnail", () => {
    assert.equal(headshotOf({ headshot: 'https://cdn.test/h.jpg', video: { thumbnail: 'https://cdn.test/t.jpg' } }), 'https://cdn.test/h.jpg');
    assert.equal(headshotOf({ video: { thumbnail: 'https://cdn.test/t.jpg' } }), 'https://cdn.test/t.jpg');
    assert.equal(headshotOf({}), undefined);
  });

  it('writes sizes the way people read them', () => {
    assert.deepEqual([512, 68 * 1024, 1.44 * 1024 * 1024, 36 * 1024 * 1024].map(sizeLabel), ['512 B', '68 KB', '1.4 MB', '36 MB']);
  });

  it('shows its badges in one order: where it stands, who it opens for, version, size, dependencies', () => {
    assert.deepEqual(
      listingBadges({ beta: true, tier: 'pro', version: 'v1.2.0', size: { bytes: 70 * 1024, files: 3 }, deps: 2 }).map(badge => badge.label),
      ['Beta', 'Pro', 'v1.2.0', '70 KB', '2 dependencies'],
    );
    assert.deepEqual(
      listingBadges({ beta: false, failed: true, tier: 'public', deps: 1 }).map(badge => badge.label),
      ['Failed', 'Ready', 'Public', '1 dependency'],
    );
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
