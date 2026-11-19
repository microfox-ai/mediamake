import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { defaultReadme, itemHref, renderReadme, usePhrase, videoOf } from './readme';

const ID = 'dQw4w9WgXcQ';
const BASE = { links: 'https://github.com/o/r/blob/main/skills/x/', files: 'https://raw.githubusercontent.com/o/r/main/skills/x/' };

describe('renderReadme', () => {
  it('lifts out the video and the title a README opens with, in either order', async () => {
    const first = await renderReadme(`---\ntags: a\n---\nhttps://youtu.be/${ID}\n\n# Pack brand kit\n\nWhat it does.\n`);
    assert.deepEqual(first.video, { youtubeId: ID });
    assert.equal(first.title, 'Pack brand kit');
    assert.equal(first.html, '<p>What it does.</p>');
    assert.equal(first.written, true);
    const second = await renderReadme(`# Pack brand kit\n\nhttps://cdn.test/intro.mp4\n\nWhat it does.\n`);
    assert.deepEqual(second.video, { src: 'https://cdn.test/intro.mp4' });
    assert.equal(second.title, 'Pack brand kit');
  });

  it('plays a later video in place, and leaves a link with words as a link', async () => {
    const { html, video } = await renderReadme(`# T\n\nIntro.\n\nhttps://www.youtube.com/watch?v=${ID}\n\nSee [the video](https://youtu.be/${ID}).\n`);
    assert.equal(video, undefined);
    assert.match(html, /<div class="readme-video"><iframe src="https:\/\/www\.youtube-nocookie\.com\/embed\/dQw4w9WgXcQ/);
    assert.match(html, /<a href="https:\/\/youtu\.be\/dQw4w9WgXcQ"[^>]*>the video<\/a>/);
  });

  it("drops raw HTML and unsafe links, and keeps relative ones inside the item's folder", async () => {
    const { html } = await renderReadme('# T\n\n<script>alert(1)</script>\n\n![a](shots/a.png) [b](docs/b.md) [c](javascript:alert(1)) [d](../../../etc)\n', BASE);
    assert.doesNotMatch(html, /<script/);
    assert.match(html, /src="https:\/\/raw\.githubusercontent\.com\/o\/r\/main\/skills\/x\/shots\/a\.png"/);
    assert.match(html, /href="https:\/\/github\.com\/o\/r\/blob\/main\/skills\/x\/docs\/b\.md"/);
    assert.match(html, /<a>c<\/a>/);
    assert.match(html, /<a>d<\/a>/);
  });

  it('shows a run of pictures as a grid of example outputs, captioned by their alt text', async () => {
    // one per line: a single paragraph
    const lines = await renderReadme('# T\n\n## What it makes\n\n![A thumbnail](https://cdn.test/a.png)\n![](https://cdn.test/b.png)\n[![A poster](https://cdn.test/c.png)](https://cdn.test/c-big.png)\n');
    assert.match(lines.html, /<div class="readme-gallery"><figure><img src="https:\/\/cdn\.test\/a\.png" alt="A thumbnail"[^>]*><figcaption>A thumbnail<\/figcaption><\/figure><figure><img src="https:\/\/cdn\.test\/b\.png"[^>]*><\/figure><figure><a href="https:\/\/cdn\.test\/c-big\.png"[^>]*><img src="https:\/\/cdn\.test\/c\.png"[^>]*><\/a><figcaption>A poster<\/figcaption><\/figure><\/div>/);
    assert.doesNotMatch(lines.html, /<p><img/);
    // a blank line between each: paragraphs of one picture, then the grid ends at the words after it
    const paragraphs = await renderReadme('# T\n\n![One](https://cdn.test/1.png)\n\n![Two](https://cdn.test/2.png)\n\nAfter.\n');
    assert.equal((paragraphs.html.match(/<figure>/g) ?? []).length, 2);
    assert.match(paragraphs.html, /<\/div>\s*<p>After\.<\/p>/);
  });

  it('leaves a lone picture, and pictures among words, as they are', async () => {
    const lone = await renderReadme('# T\n\n![One](https://cdn.test/1.png)\n\nWords.\n');
    assert.doesNotMatch(lone.html, /readme-gallery/);
    assert.match(lone.html, /<p><img src="https:\/\/cdn\.test\/1\.png"/);
    const mixed = await renderReadme('# T\n\nSee ![a](https://cdn.test/a.png) and ![b](https://cdn.test/b.png).\n');
    assert.doesNotMatch(mixed.html, /readme-gallery/);
  });

  it('resolves the pictures of a grid against the folder', async () => {
    const { html } = await renderReadme('![a](shots/a.png)\n![b](shots/b.png)\n', BASE);
    assert.match(html, /readme-gallery/);
    assert.match(html, /src="https:\/\/raw\.githubusercontent\.com\/o\/r\/main\/skills\/x\/shots\/b\.png"/);
  });

  it('drops relative links when it has no folder to point at', async () => {
    const { html } = await renderReadme('![a](a.png)');
    assert.doesNotMatch(html, /src=/);
  });
});

describe('videoOf', () => {
  it('knows a YouTube link and a clip; nothing else', () => {
    assert.deepEqual(videoOf(`https://youtu.be/${ID}`), { youtubeId: ID });
    assert.deepEqual(videoOf('https://cdn.test/a.webm?x=1'), { src: 'https://cdn.test/a.webm?x=1' });
    assert.equal(videoOf('http://cdn.test/a.mp4'), null);
    assert.equal(videoOf('https://cdn.test/a.png'), null);
  });
});

describe('the default README', () => {
  it('follows the format: the video, the title, what it does, how to use it', async () => {
    const markdown = defaultReadme({
      kind: 'skill',
      name: 'pack-brand-kit',
      title: 'Pack brand kit',
      summary: 'Builds a brand kit.',
      description: 'Builds a brand kit. Use when the user says "make a brand kit for this logo", "x".',
      youtubeId: ID,
    });
    const readme = await renderReadme(markdown, undefined, false);
    assert.deepEqual(readme.video, { youtubeId: ID });
    assert.equal(readme.title, 'Pack brand kit');
    assert.equal(readme.written, false);
    assert.match(readme.html, /^<p>Builds a brand kit\.<\/p>\n<h2>How to use<\/h2>/);
    assert.match(readme.html, /Say to Claude: <strong>make a brand kit for this logo<\/strong>/);
  });

  it('says how an app that runs in MediaMake opens, and how a private item gets onto a computer', () => {
    assert.match(defaultReadme({ kind: 'app', name: 'library', title: 'Library', open: '/library' }), /Open it at \[\/library\]\(\/library\)/);
    assert.match(defaultReadme({ kind: 'skill', name: 'mine', title: 'Mine', inStore: false }), /command at the foot/);
    assert.doesNotMatch(defaultReadme({ kind: 'mcp', name: 'm', title: 'M' }), /youtube/);
  });
});

describe('usePhrase', () => {
  it("takes the first thing the description says the user says, else the skill's command", () => {
    assert.equal(usePhrase('analyze-video', 'Does it. Use when the user says "split this video", "x"'), 'split this video');
    assert.equal(usePhrase('analyze-video', 'Use when the user says "/analyze-video <file>"'), '/analyze-video');
    assert.equal(usePhrase('analyze-video', 'No trigger here.'), '/analyze-video');
    assert.equal(usePhrase('make-lyrics-video', 'Use when the user says "make a lyric video from <folder>"'), 'make a lyric video');
  });
});

describe('links to other items', () => {
  it('links a skill, an MCP or an app by its name', async () => {
    const { html } = await renderReadme('Runs [[revise-video]] and [[mcp/browse-hack|Browse Hack]], see [the remix skill](skill:make-video-music-remix) and `app/studio`.');
    assert.match(html, /<a href="\/skills\/revise-video" class="readme-item" data-item="skill\/revise-video">revise-video<\/a>/);
    assert.match(html, /<a href="\/mcps\/browse-hack" class="readme-item" data-item="mcp\/browse-hack">Browse Hack<\/a>/);
    assert.match(html, /<a href="\/skills\/make-video-music-remix" class="readme-item">the remix skill<\/a>/);
    assert.match(html, /<a href="\/apps\/studio"[^>]*><code>app\/studio<\/code><\/a>/);
    // a link to another item stays in the page: it opens no new tab
    assert.doesNotMatch(html, /target=/);
  });

  it('leaves code blocks, other code and other schemes alone', async () => {
    const { html } = await renderReadme('`npm run mm` [x](javascript:alert(1))\n\n```\n[[not-a-link]] mcp/none\n```\n');
    assert.doesNotMatch(html, /readme-item/);
    assert.doesNotMatch(html, /javascript/);
    assert.equal(itemHref('mcp:figcraft'), '/mcps/figcraft');
    assert.equal(itemHref('/skills/pack-brand-kit'), '/skills/pack-brand-kit');
    assert.equal(itemHref('/app/admin'), null);
    assert.equal(itemHref('tutorial:x'), null);
  });
});
