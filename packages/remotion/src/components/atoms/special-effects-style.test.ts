import assert from 'node:assert/strict';
import { describe, it } from 'vitest';
import { FX, mergeSpecialEffects, specialEffectCss } from './special-effects-style';

describe('specialEffectCss', () => {
  it('builds filter, opacity, blend, and backdrop blur from effect variables', () => {
    const css = specialEffectCss({
      [FX.blur]: 4,
      [FX.brightness]: 120,
      [FX.opacity]: 0.5,
      [FX.blend]: 'multiply',
      [FX.backdropBlur]: 6,
      [FX.shadowX]: 2,
      [FX.shadowY]: 4,
      [FX.shadowBlur]: 8,
      [FX.shadowColor]: '#000000',
      [FX.glowBlur]: 12,
      [FX.glowColor]: '#ffffff',
    });
    assert.match(css.filter ?? '', /blur\(4px\)/);
    assert.match(css.filter ?? '', /brightness\(1\.2\)/);
    assert.match(css.filter ?? '', /drop-shadow\(2px 4px 8px #000000\)/);
    assert.match(css.filter ?? '', /drop-shadow\(0 0 12px #ffffff\)/);
    assert.equal(css.opacity, 0.5);
    assert.equal(css.mixBlendMode, 'multiply');
    assert.equal(css.backdropFilter, 'blur(6px)');
  });

  it('skips identity values', () => {
    const css = specialEffectCss({
      [FX.opacity]: 1,
      [FX.brightness]: 100,
      [FX.blur]: 0,
      [FX.blend]: 'normal',
    });
    assert.equal(css.filter, undefined);
    assert.equal(css.opacity, undefined);
    assert.equal(css.mixBlendMode, undefined);
  });
});

describe('mergeSpecialEffects', () => {
  it('appends to an existing filter and multiplies opacity', () => {
    const next = mergeSpecialEffects({
      color: '#fff',
      filter: 'contrast(1.2)',
      opacity: 0.5,
      [FX.blur]: 2,
      [FX.opacity]: 0.5,
    });
    assert.equal(next.color, '#fff');
    assert.equal(next.filter, 'contrast(1.2) blur(2px)');
    assert.equal(next.opacity, 0.25);
  });
});
