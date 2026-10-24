import assert from 'node:assert/strict';
import { describe, it } from 'vitest';
import { DEFAULT_FONT_SIZE, familyToLoad, styleWithDefaults } from './text-font';

describe('familyToLoad', () => {
  it('uses font.family when the style names no family', () => {
    // Caption presets set the font here and leave style.fontFamily empty.
    assert.equal(familyToLoad({ fontSize: 50 }, 'BebasNeue'), 'BebasNeue');
    assert.equal(familyToLoad(undefined, 'Courgette'), 'Courgette');
  });

  it('prefers a single family in style.fontFamily', () => {
    assert.equal(familyToLoad({ fontFamily: '"Roboto"' }, 'BebasNeue'), 'Roboto');
  });

  it('skips a CSS stack and falls back to font.family, then Inter', () => {
    assert.equal(familyToLoad({ fontFamily: 'Arial, sans-serif' }, 'Dhurjati'), 'Dhurjati');
    assert.equal(familyToLoad({}, '  '), 'Inter');
  });
});

describe('styleWithDefaults', () => {
  it('fills a missing family with the loaded one, not Inter', () => {
    const style = styleWithDefaults({ color: 'red' }, 'BebasNeue');
    assert.equal(style.fontFamily, 'BebasNeue');
    assert.equal(style.fontSize, DEFAULT_FONT_SIZE);
    assert.equal(style.color, 'red');
  });

  it('keeps an authored family and size', () => {
    const style = styleWithDefaults({ fontFamily: 'Arial, sans-serif', fontSize: 20 }, 'Inter');
    assert.equal(style.fontFamily, 'Arial, sans-serif');
    assert.equal(style.fontSize, 20);
  });
});
