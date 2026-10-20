import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  parseCaptionHtmlText,
  resolveCaptionHighlightMeta,
} from './html-text';

const teluguCaption = {
  words: [
    { text: 'సిరిలను' },
    { text: 'ఇచ్చెటి' },
    { text: 'కరుణను' },
    { text: 'పంచెటి' },
    { text: 'అసురుల' },
    { text: 'దుంచెటి' },
    { text: 'అంబికవే.' },
  ],
  metadata: {
    htmlText:
      'సిరిలను ఇచ్చెటి<br/>కరుణను పంచెటి<br/>అసురుల దుంచెటి<br/><b>అంబికవే.</b>',
  },
};

describe('caption htmlText line breaks', () => {
  it('keeps Telugu <br/> lines and the bold word', () => {
    const parsed = parseCaptionHtmlText(
      teluguCaption.metadata.htmlText,
      teluguCaption.words,
    );

    assert.deepEqual(parsed?.splitParts, [
      'సిరిలను ఇచ్చెటి',
      'కరుణను పంచెటి',
      'అసురుల దుంచెటి',
      'అంబికవే.',
    ]);
    assert.deepEqual(parsed?.highlightedWordIndices, [6]);
  });

  it('resolves those parts for the vertical float preset', () => {
    const meta = resolveCaptionHighlightMeta(
      teluguCaption.metadata,
      teluguCaption.words,
    );

    assert.equal(meta.usedHtmlText, true);
    assert.deepEqual(meta.splitParts, [
      'సిరిలను ఇచ్చెటి',
      'కరుణను పంచెటి',
      'అసురుల దుంచెటి',
      'అంబికవే.',
    ]);
    assert.deepEqual(meta.highlightedWordIndices, [6]);
  });

  it('still matches Latin captions the same way', () => {
    const parsed = parseCaptionHtmlText('<b>Hero</b> is the<br/>main character', [
      { text: 'Hero' },
      { text: 'is' },
      { text: 'the' },
      { text: 'main' },
      { text: 'character' },
    ]);

    assert.deepEqual(parsed?.splitParts, ['Hero is the', 'main character']);
    assert.deepEqual(parsed?.highlightedWordIndices, [0]);
  });
});
