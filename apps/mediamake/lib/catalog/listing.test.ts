import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { LISTING_PICTURE_TYPE, headshotOf, isEmptyListing, listingBadges, listingTiles, mediaKindOf, parseAuthorListing, parseTag, parseTags, sizeLabel, withAuthorListing, withListing } from './listing';

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
    assert.equal(isEmptyListing({ tags: [], media: [], editorsPick: true }), false);
    assert.equal(isEmptyListing({ tags: [], media: [], editorsPick: false }), true);
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
      listingBadges({ level: 'beta', tier: 'pro', version: 'v1.2.0', size: { bytes: 70 * 1024, files: 3 }, deps: 2 }).map(badge => badge.label),
      ['Beta', 'Pro', 'v1.2.0', '70 KB', '2 dependencies'],
    );
    assert.deepEqual(
      listingBadges({ level: 'ready', failed: true, tier: 'public', deps: 1 }).map(badge => badge.label),
      ['Failed', 'Production', 'Public', '1 dependency'],
    );
    assert.deepEqual(
      listingBadges({ level: 'alpha', advice: 'deprecated', tier: 'plus' }).map(badge => [badge.label, badge.tone]),
      [
        ['Deprecated', 'bad'],
        ['Alpha', 'bad'],
        ['Plus', 'plain'],
      ],
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

describe('parseAuthorListing', () => {
  it('takes a description and https links, trimmed, and an empty one to clear', () => {
    assert.deepEqual(parseAuthorListing({ description: '  What it does.  ', headshot: '  https://cdn.test/h.jpg ', icon: '' }, 'mcp'), {
      change: { description: 'What it does.', headshot: 'https://cdn.test/h.jpg', icon: '' },
    });
    assert.deepEqual(parseAuthorListing({ headshot: 'https://cdn.test/h.jpg' }, 'skill'), { change: { headshot: 'https://cdn.test/h.jpg' } });
    assert.deepEqual(parseAuthorListing({ description: '' }, 'skill'), { change: { description: '' } });
  });

  it("reads only the description and the pictures: the rest of a listing is not an author's", () => {
    assert.deepEqual(parseAuthorListing({ icon: 'https://cdn.test/i.png', readme: '# Mine', editorsPick: true, advice: 'deprecated', tags: ['x'], media: [] }, 'app'), {
      change: { icon: 'https://cdn.test/i.png' },
    });
  });

  it("stops on what is not an https link, on nothing given, on a long description and on a skill's icon", () => {
    assert.ok('error' in parseAuthorListing({ headshot: 'http://cdn.test/h.jpg' }, 'mcp'));
    assert.ok('error' in parseAuthorListing({ headshot: 'https://cdn.test/h one.jpg' }, 'mcp'));
    assert.ok('error' in parseAuthorListing({ headshot: 7 }, 'mcp'));
    assert.ok('error' in parseAuthorListing({ icon: null }, 'mcp'));
    assert.ok('error' in parseAuthorListing({ description: 7 }, 'mcp'));
    assert.ok('error' in parseAuthorListing({ description: 'x'.repeat(301) }, 'mcp'));
    assert.ok(!('error' in parseAuthorListing({ description: 'x'.repeat(300) }, 'mcp')));
    assert.ok('error' in parseAuthorListing({}, 'mcp'));
    assert.ok('error' in parseAuthorListing(null, 'mcp'));
    assert.ok('error' in parseAuthorListing({ readme: 'words' }, 'mcp'));
    assert.ok('error' in parseAuthorListing({ icon: 'https://cdn.test/i.png' }, 'skill'));
    // clearing an icon a skill never had changes nothing, so it is let through
    assert.deepEqual(parseAuthorListing({ icon: '' }, 'skill'), { change: { icon: '' } });
  });
});

describe('withAuthorListing', () => {
  const current = {
    tags: ['anime'],
    media: [{ kind: 'image' as const, url: 'https://cdn.test/s.png' }],
    description: 'What it is',
    headshot: 'https://cdn.test/old.jpg',
    icon: 'https://cdn.test/old.png',
    readme: '# It',
    editorsPick: true,
    advice: 'deprecated' as const,
    adviceNote: 'Use the other',
    insteadOf: 'mcp/other',
  };

  it('changes what is given and keeps the rest of the listing', () => {
    assert.deepEqual(withAuthorListing(current, { headshot: 'https://cdn.test/new.jpg' }), { ...current, headshot: 'https://cdn.test/new.jpg' });
    assert.deepEqual(withAuthorListing(current, { description: 'New words' }), { ...current, description: 'New words' });
    assert.deepEqual(withAuthorListing(current, { headshot: '', description: '', icon: 'https://cdn.test/new.png' }), { ...current, headshot: undefined, description: undefined, icon: 'https://cdn.test/new.png' });
  });

  it('starts a listing for an item that has none', () => {
    const made = withAuthorListing(null, { description: 'What it does' });
    assert.equal(made.description, 'What it does');
    assert.deepEqual([made.tags, made.media], [[], []]);
    assert.equal(isEmptyListing(made), false);
    assert.equal(isEmptyListing(withAuthorListing(null, { headshot: '' })), true);
  });
});

describe('LISTING_PICTURE_TYPE', () => {
  it('takes the pictures browsers show, and nothing that can run', () => {
    for (const type of ['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/avif']) assert.ok(LISTING_PICTURE_TYPE.test(type));
    for (const type of ['image/svg+xml', 'text/html', 'video/mp4', 'image/png; charset=x']) assert.equal(LISTING_PICTURE_TYPE.test(type), false);
  });
});
