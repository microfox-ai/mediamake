import assert from 'node:assert/strict';
import { describe, it } from 'vitest';
import { applyImageLook, readImageLook, splitImageBeatStyle } from './image-style';

describe('applyImageLook', () => {
  it('maps fit, blend, filter preset, and tint onto CSS', () => {
    const css = applyImageLook({
      objectFit: 'contain',
      mixBlendMode: 'multiply',
      opacity: 0.7,
      ['--mm-image-filter']: 'vintage',
      ['--mm-image-tint']: '#ff6600',
    });
    assert.equal(css.objectFit, 'contain');
    assert.equal(css.mixBlendMode, 'multiply');
    assert.equal(css.opacity, 0.7);
    assert.ok(typeof css.filter === 'string' && css.filter.includes('sepia'));
  });
});

describe('splitImageBeatStyle', () => {
  it('puts layout on the block and look on the image', () => {
    const { block, image } = splitImageBeatStyle({
      left: 10,
      width: 400,
      overflow: 'hidden',
      objectFit: 'cover',
      opacity: 0.9,
      ['--mm-fx-blur']: 4,
    });
    assert.equal(block.left, 10);
    assert.equal(block.overflow, 'hidden');
    assert.equal((block as Record<string, unknown>)['--mm-fx-blur'], 4);
    assert.equal(image.objectFit, 'cover');
    assert.equal(image.opacity, 0.9);
  });

  it('keeps block fill, stroke, shadow, and backdrop blur on the block', () => {
    const { block, image } = splitImageBeatStyle({
      backgroundColor: '#112233',
      borderRadius: 12,
      boxShadow: '0 4px 10px rgba(0,0,0,0.15)',
      backdropFilter: 'blur(8px)',
      objectFit: 'cover',
    });
    assert.equal(block.backgroundColor, '#112233');
    assert.equal(block.borderRadius, 12);
    assert.equal(block.boxShadow, '0 4px 10px rgba(0,0,0,0.15)');
    assert.equal(block.backdropFilter, 'blur(8px)');
    assert.equal(image.objectFit, 'cover');
    assert.equal(image.backgroundColor, undefined);
  });
});

describe('readImageLook', () => {
  it('defaults to cover / none / normal / 1', () => {
    const look = readImageLook(undefined);
    assert.equal(look.fit, 'cover');
    assert.equal(look.filter, 'none');
    assert.equal(look.blendMode, 'normal');
    assert.equal(look.opacity, 1);
  });
});
