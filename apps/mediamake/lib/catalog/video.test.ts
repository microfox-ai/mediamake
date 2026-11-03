import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { CatalogVideo, ItemVideo } from './types';
import { itemHue, parseYouTubeId, placeholderBackground, summaryFrom, videoThumbnail, withVideos, youtubeThumbnail } from './video';

const ID = 'dQw4w9WgXcQ';

function video(id: string, fields: Partial<CatalogVideo> = {}): CatalogVideo {
  return { id, title: id, description: '', updatedAt: '2026-11-02T00:00:00.000Z', ...fields };
}

describe('parseYouTubeId', () => {
  it('reads the id from every kind of YouTube link', () => {
    for (const link of [
      `https://www.youtube.com/watch?v=${ID}`,
      `https://youtube.com/watch?v=${ID}&t=42s&list=PL123`,
      `youtube.com/watch?v=${ID}`,
      `https://m.youtube.com/watch?v=${ID}`,
      `https://music.youtube.com/watch?v=${ID}`,
      `https://youtu.be/${ID}`,
      `https://youtu.be/${ID}?si=abc123`,
      `https://www.youtube.com/shorts/${ID}`,
      `https://www.youtube.com/embed/${ID}`,
      `https://www.youtube-nocookie.com/embed/${ID}?rel=0`,
      `https://www.youtube.com/live/${ID}`,
      `  https://youtu.be/${ID}  `,
    ]) {
      assert.equal(parseYouTubeId(link), ID, link);
    }
  });

  it('refuses links that are not one YouTube video', () => {
    for (const link of [
      '',
      ID, // a bare id is too easy to mistake for a word
      'hello-world',
      `https://vimeo.com/${ID}`,
      `https://youtube.com.evil.example/watch?v=${ID}`,
      'https://www.youtube.com/watch?v=short',
      'https://www.youtube.com/playlist?list=PL0123456789',
      'https://www.youtube.com/@cookwithclaude',
      `javascript:alert('${ID}')`,
      `ftp://youtu.be/${ID}`,
    ]) {
      assert.equal(parseYouTubeId(link), null, link);
    }
  });
});

describe('videoThumbnail', () => {
  it("uses an uploaded thumbnail first, else YouTube's maxres one", () => {
    assert.equal(videoThumbnail({ thumbnail: 'https://cdn.example/t.jpg', youtubeId: ID }), 'https://cdn.example/t.jpg');
    assert.equal(videoThumbnail({ youtubeId: ID }), `https://img.youtube.com/vi/${ID}/maxresdefault.jpg`);
    assert.equal(videoThumbnail({}), undefined);
  });

  it("gives a course its first lesson's thumbnail when it has none", () => {
    const videos = new Map([
      ['tutorial/empty', video('tutorial/empty')],
      ['tutorial/b', video('tutorial/b', { youtubeId: ID })],
    ]);
    assert.equal(videoThumbnail({ lessons: ['tutorial/missing', 'tutorial/empty', 'tutorial/b'] }, videos), youtubeThumbnail(ID));
  });
});

describe('withVideos', () => {
  it('marks the items that have a video and leaves the rest alone', () => {
    const items: { id: string; video?: ItemVideo }[] = [{ id: 'skill/pack-brand-kit' }, { id: 'skill/pack-youtube' }, { id: 'course/cwc' }];
    const marked = withVideos(items, [
      video('skill/pack-brand-kit', { youtubeId: ID, title: 'Brand kit in one prompt', description: 'Episode 1' }),
      video('course/cwc', { lessons: ['skill/pack-brand-kit'] }),
    ]);
    assert.deepEqual(marked[0], {
      id: 'skill/pack-brand-kit',
      video: { youtubeId: ID, title: 'Brand kit in one prompt', description: 'Episode 1', thumbnail: youtubeThumbnail(ID) },
    });
    assert.equal(marked[1], items[1]);
    assert.equal(marked[2].video?.thumbnail, youtubeThumbnail(ID));
    assert.deepEqual(marked[2].video?.lessons, ['skill/pack-brand-kit']);
  });
});

describe('summaryFrom', () => {
  it("takes a description's first paragraph, cut to fit a card", () => {
    assert.equal(summaryFrom('Make a brand kit\nfrom a logo.\n\nLinks:\nhttps://x'), 'Make a brand kit from a logo.');
    assert.equal(summaryFrom('a'.repeat(600)).length, 500);
    assert.ok(summaryFrom('a'.repeat(600)).endsWith('…'));
    assert.equal(summaryFrom(''), '');
  });
});

describe('placeholder colours', () => {
  it('gives each item the same colour every time, and different items different ones', () => {
    assert.equal(itemHue('skill/pack-brand-kit'), itemHue('skill/pack-brand-kit'));
    assert.equal(placeholderBackground('skill/pack-youtube'), placeholderBackground('skill/pack-youtube'));
    const hues = new Set(['skill/pack-brand-kit', 'skill/pack-youtube', 'skill/create-thumbnail', 'skill/revise-video', 'skill/make-lyrics-video'].map(itemHue));
    assert.ok(hues.size >= 4, `similar names spread apart: ${[...hues].join(', ')}`);
    for (const hue of hues) assert.ok(hue >= 0 && hue < 360);
  });
});
