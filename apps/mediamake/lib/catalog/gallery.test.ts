import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { galleryTiles, proofTile } from './gallery';

const ID = 'dQw4w9WgXcQ';

describe('galleryTiles', () => {
  it('puts the trailer first, then the productions in order', () => {
    const tiles = galleryTiles({ youtubeId: ID, title: 'Intro', description: 'What it does' }, [{ title: 'A' }, { title: 'B', image: 'https://cdn.test/b.png' }]);
    assert.deepEqual(
      tiles.map(t => [t.key, t.kind, t.title]),
      [
        ['trailer', 'youtube', 'Intro'],
        ['proof-0', 'link', 'A'],
        ['proof-1', 'image', 'B'],
      ],
    );
    assert.equal(tiles[0].trailer, true);
    assert.match(tiles[0].poster!, new RegExp(ID));
  });

  it('has no trailer for an item without a video that plays', () => {
    assert.deepEqual(galleryTiles(null, []), []);
    assert.equal(galleryTiles({ title: 'A course' }, [{ title: 'A' }])[0].key, 'proof-0');
  });
});

describe('proofTile', () => {
  it('plays an uploaded clip before anything else, with its picture as the poster', () => {
    const tile = proofTile({ title: 'A', url: `https://youtu.be/${ID}`, image: 'https://cdn.test/a.png', video: 'https://cdn.test/a.mp4' }, 'k');
    assert.equal(tile.kind, 'video');
    assert.equal(tile.src, 'https://cdn.test/a.mp4');
    assert.equal(tile.poster, 'https://cdn.test/a.png');
  });

  it('embeds a YouTube link, with the uploaded picture over YouTube\'s thumbnail', () => {
    assert.equal(proofTile({ title: 'A', url: `https://youtu.be/${ID}` }, 'k').youtubeId, ID);
    assert.equal(proofTile({ title: 'A', url: `https://youtu.be/${ID}`, image: 'https://cdn.test/a.png' }, 'k').poster, 'https://cdn.test/a.png');
  });

  it('shows a picture with its link, and a link or a title alone as a plain tile', () => {
    assert.deepEqual(proofTile({ title: 'A', url: 'https://open.spotify.com/x', image: 'https://cdn.test/a.png' }, 'k'), {
      key: 'k',
      title: 'A',
      href: 'https://open.spotify.com/x',
      kind: 'image',
      src: 'https://cdn.test/a.png',
      poster: 'https://cdn.test/a.png',
    });
    assert.equal(proofTile({ title: 'A', url: 'https://open.spotify.com/x' }, 'k').kind, 'link');
    assert.equal(proofTile({ title: 'A' }, 'k').href, undefined);
  });
});
