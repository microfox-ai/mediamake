import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { readmeAbout, readmeHtml, resolve } from './readme';

const REPO = 'https://github.com/me/mediamake-doomcat';

describe('a space README on its Code tab', () => {
  it('points relative links at GitHub, drops raw HTML and unsafe links', async () => {
    const html = await readmeHtml(
      [
        '# doomcat',
        '',
        'The doomcat space.',
        '',
        '<!-- mm:contents: x -->',
        '- [`engine/`](engine): shared parts',
        '- [CLAUDE](CLAUDE.md) and [up](../../../elsewhere) and [bad](javascript:alert(1))',
        '<!-- /mm:contents -->',
        '',
        '<script>alert(1)</script>',
        '![cat](pics/cat.png)',
      ].join('\n'),
      REPO,
      'main',
    );
    assert.match(html, /href="https:\/\/github\.com\/me\/mediamake-doomcat\/blob\/main\/engine" target="_blank"/);
    assert.match(html, /href="https:\/\/github\.com\/me\/mediamake-doomcat\/blob\/main\/CLAUDE\.md"/);
    assert.match(html, /src="https:\/\/github\.com\/me\/mediamake-doomcat\/raw\/main\/pics\/cat\.png"/);
    assert.ok(!/script|javascript|elsewhere|mm:contents/.test(html), html);
    assert.match(html, /<a>bad<\/a>/);
  });

  it('keeps anchors and outside links, and nothing relative without a repo', () => {
    assert.equal(resolve('#setup', REPO, 'main'), '#setup');
    assert.equal(resolve('https://example.com/a', REPO, 'main'), 'https://example.com/a');
    assert.equal(resolve('//evil.example/x', REPO, 'main'), null);
    assert.equal(resolve('prefs.md', undefined, 'main'), null);
  });

  it('says what the space is from its opening paragraph', () => {
    assert.equal(readmeAbout('# doomcat\n\nThe **doomcat** space: [shorts](x) of a cat.\nTwo lines.\n\n## More\n'), 'The doomcat space: shorts of a cat. Two lines.');
    assert.equal(readmeAbout('# doomcat\n\n<!-- mm:contents -->\n## What\'s here\n'), undefined);
    assert.equal(readmeAbout('# doomcat\n\n- a list\n'), undefined);
  });
});
